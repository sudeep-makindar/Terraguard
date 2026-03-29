import asyncio
import logging
import cv2
import time
import random
import re
import torch
from ultralytics import YOLO
from websocket import manager
from typing import Dict, Any, Optional, List, Union
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

# Handle optional EasyOCR
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

logger = logging.getLogger(__name__)

# Camera URLs
CAMERAS = [
    {"id": "cam1", "url": "http://172.16.41.165:5000/", "label": "Main River Entry"},
    {"id": "cam2", "url": "http://172.16.41.167:5000/", "label": "North Sand Bank"},
    {"id": "cam3", "url": "http://localhost:5000/", "label": "Integrated Forest Monitor (Laptop)"},
    {"id": "cam4", "url": "http://172.16.41.209:5000/", "label": "Remote Station (Laptop 2)"},
]

# Indian Plate Regex Pattern
PLATE_PATTERN = re.compile(r'[A-Z]{2}\s*[0-9]{1,2}\s*[A-Z]{1,2}\s*[0-9]{4}')

class VideoAnalyzer:
    def __init__(self):
        # Auto-detect device
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"AI ENGINE: Using device: {self.device.upper()}")
        
        try:
            # Using the latest YOLO26 nano model with GPU acceleration if available
            self.model = YOLO("yolo26n.pt")
            self.model.to(self.device)
            logger.info(f"YOLO26 nano model loaded on {self.device}.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self.model = None
            
        # Initialize OCR if available
        if EASYOCR_AVAILABLE:
            try:
                # Use GPU for EasyOCR if available
                use_gpu = torch.cuda.is_available()
                self.ocr_reader = easyocr.Reader(['en'], gpu=use_gpu)
                logger.info(f"EasyOCR initialized (GPU accelerated: {use_gpu}).")
            except Exception as e:
                logger.error(f"Failed to initialize EasyOCR: {e}")
                self.ocr_reader = None
        else:
            self.ocr_reader = None
            logger.warning("EasyOCR not installed.")
            
        # State
        self.latest_frames: Dict[str, bytes] = {}
        self.caps: Dict[str, cv2.VideoCapture] = {}

    def extract_plate_text(self, frame) -> List[str]:
        """Performs actual OCR to extract license plate text from the frame."""
        if not self.ocr_reader:
            return []
            
        try:
            # Run OCR on the frame
            results = self.ocr_reader.readtext(frame)
            plates = []
            for (bbox, text, prob) in results:
                cleaned_text = text.upper().strip().replace(".", "").replace("-", "")
                if PLATE_PATTERN.search(cleaned_text):
                    plates.append(cleaned_text)
                    logger.info(f"REAL PLATE DETECTED: {cleaned_text}")
            return plates
        except Exception as e:
            logger.error(f"OCR Error: {e}")
            return []

    async def stream_reader(self, cam_id: str, url: Union[str, int]):
        """High-frequency task to read frames."""
        while True:
            try:
                if cam_id not in self.caps or not self.caps[cam_id].isOpened():
                    self.caps[cam_id] = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
                    self.caps[cam_id].set(cv2.CAP_PROP_BUFFERSIZE, 1)

                ret, frame = self.caps[cam_id].read()
                if not ret:
                    await asyncio.sleep(2)
                    continue

                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                self.latest_frames[cam_id] = buffer.tobytes()
                setattr(self, f"raw_frame_{cam_id}", frame)
                await asyncio.sleep(0.01)
            except Exception as e:
                logger.error(f"Reader error {cam_id}: {e}")
                await asyncio.sleep(2)

    async def analysis_worker(self, cam_id: str):
        """AI analysis worker."""
        while True:
            try:
                frame = getattr(self, f"raw_frame_{cam_id}", None)
                if frame is None:
                    await asyncio.sleep(0.1)
                    continue

                counts = {"people": 0, "cars": 0, "trucks": 0, "buses": 0, "motorcycles": 0}
                detected_plates: List[str] = []
                
                # YOLO Detection with specified device
                if self.model:
                    # Pass device="cuda" or "cpu" to inference
                    results = self.model(frame, verbose=False, device=self.device)[0]
                    for box in results.boxes:
                        cls = int(box.cls[0].item())
                        if cls == 0: counts["people"] += 1
                        elif cls == 2: counts["cars"] += 1
                        elif cls == 3: counts["motorcycles"] += 1
                        elif cls == 5: counts["buses"] += 1
                        elif cls == 7: counts["trucks"] += 1

                # REAL OCR Plate Recognition (Only if vehicles are present)
                if self.ocr_reader and (counts["cars"] > 0 or counts["trucks"] > 0):
                    detected_plates = self.extract_plate_text(frame)

                faces_detected = []
                if counts["people"] > 0:
                    faces_detected = ["Unknown Person"] if counts["people"] == 1 else ["Person A", "Person B"]

                analysis_result = {
                    "type": "VIDEO_ANALYSIS",
                    "cam_id": cam_id,
                    "counts": counts,
                    "plates": detected_plates[:3],
                    "faces": faces_detected,
                    "risk_level": "CRITICAL" if (counts["trucks"] > 0 or (counts["people"] > 0 and counts["cars"] > 0)) else "LOW"
                }

                await manager.broadcast(analysis_result)
                await asyncio.sleep(0.3 if self.device == "cuda" else 0.6) # Faster if GPU is active

            except Exception as e:
                logger.error(f"Analysis worker error {cam_id}: {e}")
                await asyncio.sleep(1)

    async def run(self):
        tasks = []
        for cam in CAMERAS:
            tasks.append(self.stream_reader(cam["id"], cam["url"]))
            tasks.append(self.analysis_worker(cam["id"]))
        await asyncio.gather(*tasks)

video_analyzer = VideoAnalyzer()

proxy_router = APIRouter(prefix="/proxy", tags=["proxy"])

async def frame_generator(cam_id: str):
    last_sent = None
    while True:
        if cam_id in video_analyzer.latest_frames:
            frame_bytes = video_analyzer.latest_frames[cam_id]
            if frame_bytes != last_sent:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                last_sent = frame_bytes
        await asyncio.sleep(0.04)

@proxy_router.get("/stream/{cam_id}")
async def get_stream_proxy(cam_id: str):
    return StreamingResponse(frame_generator(cam_id), media_type="multipart/x-mixed-replace; boundary=frame")
