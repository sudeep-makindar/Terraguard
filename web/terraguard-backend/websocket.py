"""
TerraGuard — WebSocket Connection Manager
Broadcasts JSON events to all connected clients.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "WS client connected. Total connections: %d",
            len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "WS client disconnected. Total connections: %d",
            len(self.active_connections),
        )

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send a JSON message to every connected WebSocket client."""
        if not self.active_connections:
            return
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


# Singleton shared across the application
manager = ConnectionManager()
