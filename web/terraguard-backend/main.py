"""
TerraGuard — FastAPI application entry point.

Startup: creates all DB tables (idempotent).
Includes: CORS for all origins, all routers, WebSocket /ws endpoint.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from routers import alerts, buzzer, fir, nodes, sensor
from websocket import manager
from video_analysis import video_analyzer, proxy_router
from sensor_poller import run_poller
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Run on startup and shutdown."""
    logger.info("TerraGuard backend starting — creating database tables…")
    await create_tables()
    logger.info("Database tables ready.")
    
    # Start video analysis as a separate background task
    bg_task = asyncio.create_task(video_analyzer.run())
    logger.info("Video analysis engine started.")
    
    # Start sensor poller to fetch data from hardware nodes
    sensor_task = asyncio.create_task(run_poller())
    logger.info("Sensor poller task started.")
    
    yield
    
    # Clean up background tasks on exit
    bg_task.cancel()
    sensor_task.cancel()
    logger.info("TerraGuard backend shutting down.")


app = FastAPI(
    title="TerraGuard API",
    description=(
        "Real-time illegal sand mining detection backend. "
        "Receives ESP32 sensor data, runs confidence scoring, "
        "persists to NeonDB, and broadcasts via WebSocket."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(sensor.router)
app.include_router(alerts.router)
app.include_router(fir.router)
app.include_router(nodes.router)
app.include_router(buzzer.router)
app.include_router(proxy_router)


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Persistent WebSocket connection for the React dashboard.
    """
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
        manager.disconnect(websocket)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "service": "terraguard-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
