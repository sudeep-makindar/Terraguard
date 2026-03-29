import asyncio
import logging
import httpx
import uuid
import datetime
import traceback
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal
from detection import calculate_confidence
from models import Alert, SensorReading
from schemas import SensorPayload
from websocket import manager

logger = logging.getLogger(__name__)

# User's hardware addresses (Friend's laptop hosting ESP data)
POLL_URLS = [
    "http://172.16.41.167:6767/latest"
]

# Standard browser headers to avoid being blocked by friend's laptop
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

import json
import urllib.request
import urllib.error

def fetch_sensor_data_sync(url: str):
    """Synchronous fetch to avoid asyncio/httpx issues on Windows."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=5.0) as response:
        return json.loads(response.read().decode("utf-8"))

async def poll_sensor_node(url: str):
    """
    Background worker that pulls the latest reading from the hardware node.
    Comes with high-visibility logging for debugging network hops.
    """
    print(f"DEBUG: Initializing poller for {url}")
    
    while True:
        try:
            # 1. Heartbeat
            print(f"[POLLER] Fetching {url}...")
            
            try:
                # Use standard urllib in a thread to totally bypass any httpx/asyncio proxy bugs
                data = await asyncio.to_thread(fetch_sensor_data_sync, url)
            except urllib.error.URLError as url_err:
                print(f"[POLLER] Connection Error: {url_err}")
                await asyncio.sleep(5.0)
                continue
            except json.JSONDecodeError as json_err:
                print(f"[POLLER] JSON error: {json_err}")
                await asyncio.sleep(2.0)
                continue
            
            # Handle friend's laptop returning an empty dict before ESP connects
            if not data or not isinstance(data, dict) or 'device' not in data:
               print(f"[POLLER] Waiting for first ESP data (Target: {url} is currently empty).")
               await asyncio.sleep(5.0)
               continue
               
            print(f"[POLLER] SUCCESS! Data received from {url}")

            # 3. Analyze and Broadcast
            try:
                # Ensure we have a timestamp for the DB
                if 'device' in data and 'timestamp' not in data['device']:
                   data['device']['timestamp'] = datetime.datetime.now().isoformat()
                
                # Fix Arduino int vs float issues in validation
                payload = SensorPayload.model_validate(data)
                await process_high_speed_reading(payload)
                print(f"[POLLER] Broadcasted reading for {payload.device.id} to dashboard.")
                
            except Exception as ve:
                print(f"[POLLER] Schema Validation Error: {ve}")
                print(f"[POLLER] RAW HARDWARE PAYLOAD: {data}")

            # Poll interval
            await asyncio.sleep(0.5)
            
        except Exception as e:
            print(f"[POLLER] Global Exception: {str(e)}")
            await asyncio.sleep(5.0)

async def process_high_speed_reading(payload: SensorPayload):
    """
    Shares logic with the POST endpoint but for polled data.
    """
    # 1. Run detection model
    result = calculate_confidence(payload)

    async with AsyncSessionLocal() as db:
        # 2. Broadcast INSTANTLY to WebSocket before blocking DB commit
        ws_event: dict = {
            "type": "sensor_update",
            "data": payload.model_dump(mode="json"),
            "detection": {
                "confidence": result["confidence"],
                "risk_level": result["risk_level"],
                "reasons": result["reasons"],
                "alert": result["alert"],
            },
        }
        await manager.broadcast(ws_event)

        # 3. Persist sensor reading
        reading = SensorReading(
            id=uuid.uuid4(),
            device_id=payload.device.id,
            raw_payload=payload.model_dump(mode="json"),
            confidence=result["confidence"],
            risk_level=result["risk_level"],
            alert_triggered=result["alert"],
        )
        db.add(reading)
        await db.flush()  # get reading.id before creating alert if triggered
        
        # 3. Persist alert if triggered
        if result["alert"]:
            alert_row = Alert(
                id=uuid.uuid4(),
                sensor_reading_id=reading.id,
                device_id=payload.device.id,
                confidence=result["confidence"],
                risk_level=result["risk_level"],
                reasons=result["reasons"],
                lat=payload.gps.lat,
                lng=payload.gps.lng,
                status="NEW",
            )
            db.add(alert_row)
            
            # Broadcast alert to WebSocket if newly triggered
            await manager.broadcast({
                "type": "alert_triggered",
                "data": {
                    "id": str(alert_row.id),
                    "device_id": alert_row.device_id,
                    "triggered_at": datetime.datetime.now().isoformat(),
                    "confidence": alert_row.confidence,
                    "risk_level": alert_row.risk_level,
                    "reasons": alert_row.reasons,
                    "lat": alert_row.lat,
                    "lng": alert_row.lng,
                    "status": "NEW"
                }
            })

        await db.commit()

    # 4. Broadcast sensor_update to all WS clients for live dashboard stats
    ws_event: dict = {
        "type": "sensor_update",
        "data": payload.model_dump(mode="json"),
        "detection": {
            "confidence": result["confidence"],
            "risk_level": result["risk_level"],
            "reasons": result["reasons"],
            "alert": result["alert"],
        },
    }
    await manager.broadcast(ws_event)

async def run_poller():
    print("!!! SENSOR POLLER ENGINE ACTIVATED !!!")
    tasks = [poll_sensor_node(url) for url in POLL_URLS]
    await asyncio.gather(*tasks)
