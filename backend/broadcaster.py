import asyncio
import json
from typing import Dict, Set

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # match_id → set of connected websockets
        self.match_connections: Dict[int, Set[WebSocket]] = {}
        # global scoreboard connections
        self.global_connections: Set[WebSocket] = set()

    # ── CONNECT ───────────────────────────────────────────────
    async def connect_match(self, match_id: int, websocket: WebSocket):
        await websocket.accept()
        if match_id not in self.match_connections:
            self.match_connections[match_id] = set()
        self.match_connections[match_id].add(websocket)
        print(
            f"[WS] Client connected to match {match_id}. "
            f"Total: {len(self.match_connections[match_id])}"
        )

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.add(websocket)
        print(
            f"[WS] Client connected to global. "
            f"Total: {len(self.global_connections)}"
        )

    # ── DISCONNECT ────────────────────────────────────────────
    def disconnect_match(self, match_id: int, websocket: WebSocket):
        if match_id in self.match_connections:
            self.match_connections[match_id].discard(websocket)
            if not self.match_connections[match_id]:
                del self.match_connections[match_id]
        print(f"[WS] Client disconnected from match {match_id}")

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections.discard(websocket)
        print(f"[WS] Client disconnected from global")

    # ── BROADCAST ─────────────────────────────────────────────
    async def broadcast_match(self, match_id: int, data: dict):
        """Send update to all clients watching a specific match."""
        print(
            f"[WS] Broadcasting to match {match_id}, {len(self.match_connections.get(match_id, set()))} clients"
        )  # ← add

        if match_id not in self.match_connections:
            return

        payload = json.dumps(data)
        dead = set()

        for websocket in self.match_connections[match_id].copy():
            try:
                await websocket.send_text(payload)
            except Exception:
                dead.add(websocket)

        # Clean up dead connections
        for ws in dead:
            self.match_connections[match_id].discard(ws)

    async def broadcast_global(self, data: dict):
        """Send update to all clients on the global scoreboard."""
        if not self.global_connections:
            return

        payload = json.dumps(data)
        dead = set()

        for websocket in self.global_connections.copy():
            try:
                await websocket.send_text(payload)
            except Exception:
                dead.add(websocket)

        for ws in dead:
            self.global_connections.discard(ws)

    async def broadcast_all(self, match_id: int, match_data: dict, global_data: dict):
        """Broadcast to both match-specific and global channels simultaneously."""
        await asyncio.gather(
            self.broadcast_match(match_id, match_data),
            self.broadcast_global(global_data),
        )

    # ── CONNECTION COUNTS ─────────────────────────────────────
    def match_viewer_count(self, match_id: int) -> int:
        return len(self.match_connections.get(match_id, set()))

    def global_viewer_count(self) -> int:
        return len(self.global_connections)


# ── SINGLETON ─────────────────────────────────────────────────
# One instance shared across the entire app
manager = ConnectionManager()
