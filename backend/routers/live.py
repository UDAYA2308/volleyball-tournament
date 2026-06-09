import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.broadcaster import manager
from database.database import get_connection

router = APIRouter(tags=["Live"])


# ── HELPERS ───────────────────────────────────────────────────
def get_match_live_payload(match_id: int) -> dict:
    """Fetch the live match view for a specific match."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM live_match_view WHERE match_id = ?
        """,
            (match_id,),
        )
        row = cursor.fetchone()
        if not row:
            # Match exists but may be completed — fetch basic state
            cursor.execute(
                """
                SELECT
                    m.id            AS match_id,
                    m.status        AS match_status,
                    sc.match_type,
                    ta.id           AS team_a_id,
                    ta.name         AS team_a_name,
                    tb.id           AS team_b_id,
                    tb.name         AS team_b_name,
                    m.winner_team_id,
                    ms.serving_team_id,
                    ms.current_server_id,
                    ms.last_updated
                FROM matches m
                JOIN schedule sc ON sc.id = m.schedule_id
                JOIN teams ta    ON ta.id = m.team_a_id
                JOIN teams tb    ON tb.id = m.team_b_id
                LEFT JOIN match_state ms ON ms.match_id = m.id
                WHERE m.id = ?
            """,
                (match_id,),
            )
            row = cursor.fetchone()
        return dict(row) if row else {}
    finally:
        conn.close()


def get_all_live_payload() -> list:
    """Fetch all currently live matches for the global channel."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM live_match_view")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ── WEBSOCKET: SPECIFIC MATCH ─────────────────────────────────
@router.websocket("/ws/match/{match_id}")
async def websocket_match(websocket: WebSocket, match_id: int):
    await manager.connect_match(match_id, websocket)
    try:
        # Send current state immediately on connect
        payload = get_match_live_payload(match_id)
        await websocket.send_json(
            {
                "event": "connected",
                "match_id": match_id,
                "viewers": manager.match_viewer_count(match_id),
                "data": payload,
            }
        )

        # Keep connection alive — listen for disconnects
        while True:
            # We don't expect data from viewers
            # but we need to listen to detect disconnects
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect_match(match_id, websocket)


# ── WEBSOCKET: GLOBAL SCOREBOARD ──────────────────────────────
@router.websocket("/ws/live")
async def websocket_global(websocket: WebSocket):
    await manager.connect_global(websocket)
    try:
        # Send current state immediately on connect
        payload = get_all_live_payload()
        await websocket.send_json(
            {
                "event": "connected",
                "viewers": manager.global_viewer_count(),
                "data": payload,
            }
        )

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect_global(websocket)


# ── HTTP: VIEWER COUNT ────────────────────────────────────────
@router.get("/live/viewers/{match_id}")
def get_viewer_count(match_id: int):
    return {
        "match_id": match_id,
        "match_viewers": manager.match_viewer_count(match_id),
        "global_viewers": manager.global_viewer_count(),
    }
