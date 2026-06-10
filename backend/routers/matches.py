import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.broadcaster import manager
from backend.routers.live import get_all_live_payload, get_match_live_payload
from database.database import get_connection

router = APIRouter(prefix="/matches", tags=["Matches"])


# ── BROADCAST ─────────────────────────────────────────────────
def broadcast_update(match_id: int):
    """Thread-safe broadcast from synchronous route handlers."""
    try:
        from backend.main import app
        loop = app.state.loop
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_all(
                match_id,
                {"event": "update", "data": get_match_live_payload(match_id)},
                {"event": "update", "data": get_all_live_payload()},
            ),
            loop,
        )
    except Exception as e:
        print(f"[WS] Broadcast error: {e}")


# ── REQUEST MODELS ────────────────────────────────────────────
class SelectServerRequest(BaseModel):
    player_id: int


class PointRequest(BaseModel):
    team_id: int


# ── HELPERS ───────────────────────────────────────────────────
def get_set_target(set_number: int) -> int:
    return 15 if set_number == 3 else 21


def check_set_winner(team_a_score: int, team_b_score: int, set_number: int):
    target = get_set_target(set_number)
    a_wins = team_a_score >= target and (team_a_score - team_b_score) >= 2
    b_wins = team_b_score >= target and (team_b_score - team_a_score) >= 2
    if a_wins:
        return "a"
    if b_wins:
        return "b"
    return None


# ── GET MATCH STATE ───────────────────────────────────────────
@router.get("/{match_id}")
def get_match(match_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                m.id,
                m.status,
                m.winner_team_id,
                sc.match_type,
                sc.round_number,
                ta.id   AS team_a_id,
                ta.name AS team_a_name,
                tb.id   AS team_b_id,
                tb.name AS team_b_name
            FROM matches m
            JOIN schedule sc ON sc.id = m.schedule_id
            JOIN teams ta    ON ta.id = m.team_a_id
            JOIN teams tb    ON tb.id = m.team_b_id
            WHERE m.id = ?
        """, (match_id,))
        match = cursor.fetchone()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        match = dict(match)

        cursor.execute("""
            SELECT
                ms.current_set_id,
                ms.current_server_id,
                ms.serving_team_id,
                ms.status,
                p.name  AS server_name,
                st.name AS serving_team_name
            FROM match_state ms
            LEFT JOIN players p  ON p.id  = ms.current_server_id
            LEFT JOIN teams   st ON st.id = ms.serving_team_id
            WHERE ms.match_id = ?
        """, (match_id,))
        state = cursor.fetchone()

        cursor.execute("""
            SELECT
                s.id,
                s.set_number,
                s.status,
                s.winner_team_id,
                s.first_server_team_id,
                COALESCE(ss.team_a_score, 0) AS team_a_score,
                COALESCE(ss.team_b_score, 0) AS team_b_score
            FROM sets s
            LEFT JOIN set_scores ss ON ss.set_id = s.id
            WHERE s.match_id = ?
            ORDER BY s.set_number
        """, (match_id,))
        sets = [dict(s) for s in cursor.fetchall()]

        cursor.execute("""
            SELECT id, name, position, team_id
            FROM players
            WHERE team_id IN (?, ?)
            ORDER BY team_id, name
        """, (match["team_a_id"], match["team_b_id"]))
        players = [dict(p) for p in cursor.fetchall()]

        return {
            **match,
            "state": dict(state) if state else None,
            "sets": sets,
            "rosters": players,
        }
    finally:
        conn.close()


# ── START MATCH ───────────────────────────────────────────────
@router.post("/start/{schedule_id}")
def start_match(schedule_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM schedule WHERE id = ?", (schedule_id,))
        schedule = cursor.fetchone()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule entry not found")
        if schedule["status"] != "upcoming":
            raise HTTPException(
                status_code=400,
                detail=f"Match cannot be started. Current status: {schedule['status']}",
            )
        if not schedule["team_a_id"] or not schedule["team_b_id"]:
            raise HTTPException(
                status_code=400,
                detail="Both teams must be assigned before starting a match",
            )

        cursor.execute("SELECT * FROM matches WHERE schedule_id = ?", (schedule_id,))
        existing_match = cursor.fetchone()

        if existing_match:
            if existing_match["status"] != "pending":
                raise HTTPException(
                    status_code=400,
                    detail=f"Match cannot be started. Current status: {existing_match['status']}",
                )
            cursor.execute(
                "UPDATE matches SET status = 'live' WHERE id = ?",
                (existing_match["id"],),
            )
            match_id = existing_match["id"]
        else:
            cursor.execute("""
                INSERT INTO matches (schedule_id, team_a_id, team_b_id, status)
                VALUES (?, ?, ?, 'live')
            """, (schedule_id, schedule["team_a_id"], schedule["team_b_id"]))
            match_id = cursor.lastrowid

        # Set 1 — no first_server_team_id yet, admin picks freely
        cursor.execute("""
            INSERT INTO sets (match_id, set_number, status)
            VALUES (?, 1, 'active')
        """, (match_id,))
        set_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO match_state
                (match_id, current_set_id, current_server_id, serving_team_id, status)
            VALUES (?, ?, NULL, NULL, 'active')
        """, (match_id, set_id))

        cursor.execute(
            "UPDATE schedule SET status = 'live' WHERE id = ?", (schedule_id,)
        )

        conn.commit()
        broadcast_update(match_id)

        return {
            "message": "Match started successfully",
            "match_id": match_id,
            "set_id": set_id,
            "next_action": "select_server",
        }
    finally:
        conn.close()


# ── SELECT SERVER ─────────────────────────────────────────────
@router.post("/{match_id}/select-server")
def select_server(match_id: int, body: SelectServerRequest):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        match = cursor.fetchone()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match["status"] != "live":
            raise HTTPException(status_code=400, detail="Match is not live")

        cursor.execute("""
            SELECT p.*, t.name as team_name
            FROM players p
            JOIN teams t ON t.id = p.team_id
            WHERE p.id = ? AND p.team_id IN (?, ?)
        """, (body.player_id, match["team_a_id"], match["team_b_id"]))
        player = cursor.fetchone()
        if not player:
            raise HTTPException(
                status_code=400,
                detail="Player not found or does not belong to either team in this match",
            )

        cursor.execute("SELECT * FROM match_state WHERE match_id = ?", (match_id,))
        state = cursor.fetchone()
        if not state:
            raise HTTPException(status_code=400, detail="Match state not found")

        if state["serving_team_id"] and player["team_id"] != state["serving_team_id"]:
            raise HTTPException(
                status_code=400,
                detail="Server must be from the designated serving team",
            )

        cursor.execute("""
            UPDATE match_state
            SET current_server_id = ?,
                serving_team_id   = ?,
                last_updated      = CURRENT_TIMESTAMP
            WHERE match_id = ?
        """, (body.player_id, player["team_id"], match_id))

        # Record first server team on this set if not already set
        cursor.execute("""
            UPDATE sets
            SET first_server_team_id = ?
            WHERE id = ? AND first_server_team_id IS NULL
        """, (player["team_id"], state["current_set_id"]))

        conn.commit()
        broadcast_update(match_id)

        return {
            "message": "Server selected",
            "server_id": body.player_id,
            "server_name": player["name"],
            "serving_team_id": player["team_id"],
            "serving_team_name": player["team_name"],
        }
    finally:
        conn.close()


# ── RECORD POINT ──────────────────────────────────────────────
@router.post("/{match_id}/point")
def record_point(match_id: int, body: PointRequest):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        match = cursor.fetchone()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match["status"] != "live":
            raise HTTPException(status_code=400, detail="Match is not live")
        if body.team_id not in (match["team_a_id"], match["team_b_id"]):
            raise HTTPException(
                status_code=400,
                detail="Scoring team does not belong to this match"
            )

        cursor.execute("SELECT * FROM match_state WHERE match_id = ?", (match_id,))
        state = cursor.fetchone()
        if not state:
            raise HTTPException(status_code=400, detail="Match state not found")
        if not state["current_server_id"]:
            raise HTTPException(
                status_code=400,
                detail="No server selected. Select a server before recording a point",
            )

        cursor.execute("SELECT * FROM sets WHERE id = ?", (state["current_set_id"],))
        current_set = cursor.fetchone()
        if not current_set:
            raise HTTPException(status_code=400, detail="Current set not found")

        cursor.execute("""
            SELECT COALESCE(MAX(rally_sequence), 0) + 1 AS next_seq
            FROM rallies WHERE set_id = ?
        """, (current_set["id"],))
        next_seq = cursor.fetchone()["next_seq"]

        is_team_a = body.team_id == match["team_a_id"]
        new_a = current_set["team_a_score"] + (1 if is_team_a else 0)
        new_b = current_set["team_b_score"] + (0 if is_team_a else 1)

        set_winner_side = check_set_winner(new_a, new_b, current_set["set_number"])
        set_winner_id = (
            match["team_a_id"] if set_winner_side == "a"
            else match["team_b_id"] if set_winner_side == "b"
            else None
        )

        match_winner_id = None
        if set_winner_id:
            cursor.execute("""
                SELECT COUNT(*) as sets_won FROM sets
                WHERE match_id = ? AND winner_team_id = ? AND status = 'completed'
            """, (match_id, set_winner_id))
            sets_already_won = cursor.fetchone()["sets_won"]
            if sets_already_won + 1 >= 2:
                match_winner_id = set_winner_id

        cursor.execute("""
            INSERT INTO rallies (
                set_id, match_id, set_number, rally_sequence,
                serving_team_id, server_player_id, point_won_by_team_id,
                resulted_in_set_completion, resulted_in_match_completion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_set["id"], match_id, current_set["set_number"], next_seq,
            state["serving_team_id"], state["current_server_id"], body.team_id,
            1 if set_winner_id else 0,
            1 if match_winner_id else 0,
        ))

        cursor.execute("""
            UPDATE sets SET team_a_score = ?, team_b_score = ? WHERE id = ?
        """, (new_a, new_b, current_set["id"]))

        # ── SET COMPLETION ────────────────────────────────────
        if set_winner_id:
            cursor.execute("""
                UPDATE sets SET status = 'completed', winner_team_id = ? WHERE id = ?
            """, (set_winner_id, current_set["id"]))

            # ── MATCH COMPLETION ──────────────────────────────
            if match_winner_id:
                cursor.execute("""
                    UPDATE matches
                    SET status = 'completed', winner_team_id = ?
                    WHERE id = ?
                """, (match_winner_id, match_id))
                cursor.execute("""
                    UPDATE schedule SET status = 'completed' WHERE id = ?
                """, (match["schedule_id"],))
                cursor.execute("""
                    UPDATE match_state
                    SET status = 'completed', last_updated = CURRENT_TIMESTAMP
                    WHERE match_id = ?
                """, (match_id,))
                conn.commit()
                broadcast_update(match_id)
                return {
                    "message": "Match completed",
                    "match_winner_id": match_winner_id,
                    "set_complete": True,
                    "match_complete": True,
                    "score": f"{new_a}-{new_b}",
                }

            # ── START NEXT SET ────────────────────────────────
            # Volleyball rule: the team that did NOT serve first
            # in the previous set serves first in the next set
            prev_first_server_team = current_set["first_server_team_id"]

            if prev_first_server_team == match["team_a_id"]:
                next_first_serve_team = match["team_b_id"]
            elif prev_first_server_team == match["team_b_id"]:
                next_first_serve_team = match["team_a_id"]
            else:
                # Fallback: no first server recorded, admin picks freely
                next_first_serve_team = None

            next_set_number = current_set["set_number"] + 1

            cursor.execute("""
                INSERT INTO sets (match_id, set_number, status, first_server_team_id)
                VALUES (?, ?, 'active', ?)
            """, (match_id, next_set_number, next_first_serve_team))
            new_set_id = cursor.lastrowid

            # Pre-assign serving team so UI greys out wrong team
            # Admin still must select the player
            cursor.execute("""
                UPDATE match_state
                SET current_set_id    = ?,
                    serving_team_id   = ?,
                    current_server_id = NULL,
                    last_updated      = CURRENT_TIMESTAMP
                WHERE match_id = ?
            """, (new_set_id, next_first_serve_team, match_id))

            conn.commit()
            broadcast_update(match_id)

            return {
                "message": f"Set {current_set['set_number']} complete. Set {next_set_number} started.",
                "set_winner_id": set_winner_id,
                "set_complete": True,
                "match_complete": False,
                "next_set_number": next_set_number,
                "next_serving_team_id": next_first_serve_team,
                "next_action": "select_server",
                "score": f"{new_a}-{new_b}",
            }

        # ── SIDE-OUT CHECK ────────────────────────────────────
        is_side_out = body.team_id != state["serving_team_id"]
        if is_side_out:
            cursor.execute("""
                UPDATE match_state
                SET current_server_id = NULL,
                    serving_team_id   = ?,
                    last_updated      = CURRENT_TIMESTAMP
                WHERE match_id = ?
            """, (body.team_id, match_id))
        else:
            cursor.execute("""
                UPDATE match_state
                SET last_updated = CURRENT_TIMESTAMP
                WHERE match_id = ?
            """, (match_id,))

        conn.commit()
        broadcast_update(match_id)

        return {
            "message": "Point recorded",
            "set_complete": False,
            "match_complete": False,
            "side_out": is_side_out,
            "next_action": "select_server" if is_side_out else "record_point",
            "score": f"{new_a}-{new_b}",
        }
    finally:
        conn.close()


# ── UNDO LAST RALLY ───────────────────────────────────────────
@router.post("/{match_id}/undo")
def undo_last_rally(match_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        match = cursor.fetchone()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match["status"] not in ("live", "completed"):
            raise HTTPException(status_code=400, detail="Nothing to undo")

        cursor.execute("SELECT * FROM match_state WHERE match_id = ?", (match_id,))
        state = cursor.fetchone()
        if not state:
            raise HTTPException(status_code=400, detail="Match state not found")

        cursor.execute("""
            SELECT r.*, s.set_number, s.team_a_score, s.team_b_score,
                   s.first_server_team_id
            FROM rallies r
            JOIN sets s ON s.id = r.set_id
            WHERE r.match_id = ?
            ORDER BY r.set_number DESC, r.rally_sequence DESC
            LIMIT 1
        """, (match_id,))
        last_rally = cursor.fetchone()
        if not last_rally:
            raise HTTPException(status_code=400, detail="No rallies to undo")
        last_rally = dict(last_rally)

        # ── CASE 3: Rally completed the match ─────────────────
        if last_rally["resulted_in_match_completion"]:
            cursor.execute("""
                UPDATE matches
                SET status = 'live', winner_team_id = NULL
                WHERE id = ?
            """, (match_id,))
            cursor.execute("""
                UPDATE schedule SET status = 'live' WHERE id = ?
            """, (match["schedule_id"],))
            cursor.execute("""
                UPDATE sets
                SET status         = 'active',
                    winner_team_id = NULL,
                    team_a_score   = team_a_score - ?,
                    team_b_score   = team_b_score - ?
                WHERE id = ?
            """, (
                1 if last_rally["point_won_by_team_id"] == match["team_a_id"] else 0,
                1 if last_rally["point_won_by_team_id"] == match["team_b_id"] else 0,
                last_rally["set_id"],
            ))
            cursor.execute("DELETE FROM rallies WHERE id = ?", (last_rally["id"],))
            cursor.execute("""
                UPDATE match_state
                SET current_set_id    = ?,
                    current_server_id = ?,
                    serving_team_id   = ?,
                    status            = 'active',
                    last_updated      = CURRENT_TIMESTAMP
                WHERE match_id = ?
            """, (
                last_rally["set_id"],
                last_rally["server_player_id"],
                last_rally["serving_team_id"],
                match_id,
            ))
            conn.commit()
            broadcast_update(match_id)
            return {"message": "Undo successful. Match reopened.", "case": 3}

        # ── CASE 2: Rally completed a set ─────────────────────
        if last_rally["resulted_in_set_completion"]:
            cursor.execute("""
                SELECT * FROM sets WHERE match_id = ? AND set_number = ?
            """, (match_id, last_rally["set_number"] + 1))
            next_set = cursor.fetchone()

            if next_set:
                cursor.execute("""
                    SELECT COUNT(*) as cnt FROM rallies WHERE set_id = ?
                """, (next_set["id"],))
                rally_count = cursor.fetchone()["cnt"]
                if rally_count == 0:
                    cursor.execute("""
                        UPDATE match_state
                        SET current_set_id = ?, last_updated = CURRENT_TIMESTAMP
                        WHERE match_id = ?
                    """, (last_rally["set_id"], match_id))
                    cursor.execute(
                        "DELETE FROM sets WHERE id = ?", (next_set["id"],)
                    )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot undo: rallies already recorded in the next set",
                    )

            cursor.execute("""
                UPDATE sets
                SET status         = 'active',
                    winner_team_id = NULL,
                    team_a_score   = team_a_score - ?,
                    team_b_score   = team_b_score - ?
                WHERE id = ?
            """, (
                1 if last_rally["point_won_by_team_id"] == match["team_a_id"] else 0,
                1 if last_rally["point_won_by_team_id"] == match["team_b_id"] else 0,
                last_rally["set_id"],
            ))
            cursor.execute("DELETE FROM rallies WHERE id = ?", (last_rally["id"],))

            # Restore match_state — serving team from the deleted rally
            cursor.execute("""
                UPDATE match_state
                SET current_set_id    = ?,
                    current_server_id = ?,
                    serving_team_id   = ?,
                    last_updated      = CURRENT_TIMESTAMP
                WHERE match_id = ?
            """, (
                last_rally["set_id"],
                last_rally["server_player_id"],
                last_rally["serving_team_id"],
                match_id,
            ))
            conn.commit()
            broadcast_update(match_id)
            return {"message": "Undo successful. Set reopened.", "case": 2}

        # ── CASE 1: Normal rally ───────────────────────────────
        cursor.execute("""
            UPDATE sets
            SET team_a_score = team_a_score - ?,
                team_b_score = team_b_score - ?
            WHERE id = ?
        """, (
            1 if last_rally["point_won_by_team_id"] == match["team_a_id"] else 0,
            1 if last_rally["point_won_by_team_id"] == match["team_b_id"] else 0,
            last_rally["set_id"],
        ))
        cursor.execute("DELETE FROM rallies WHERE id = ?", (last_rally["id"],))
        cursor.execute("""
            UPDATE match_state
            SET current_server_id = ?,
                serving_team_id   = ?,
                last_updated      = CURRENT_TIMESTAMP
            WHERE match_id = ?
        """, (
            last_rally["server_player_id"],
            last_rally["serving_team_id"],
            match_id,
        ))
        conn.commit()
        broadcast_update(match_id)
        return {"message": "Undo successful.", "case": 1}
    finally:
        conn.close()


# ── MATCH HISTORY ─────────────────────────────────────────────
@router.get("/{match_id}/history")
def get_match_history(match_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Match not found")

        cursor.execute("""
            SELECT
                r.set_number,
                r.rally_sequence,
                p.name          AS server_name,
                ts.name         AS serving_team,
                tw.name         AS point_won_by,
                r.resulted_in_set_completion,
                r.resulted_in_match_completion,
                r.created_at
            FROM rallies r
            JOIN players p  ON p.id  = r.server_player_id
            JOIN teams ts   ON ts.id = r.serving_team_id
            JOIN teams tw   ON tw.id = r.point_won_by_team_id
            WHERE r.match_id = ?
            ORDER BY r.set_number, r.rally_sequence
        """, (match_id,))
        rallies = [dict(r) for r in cursor.fetchall()]

        sets = {}
        for rally in rallies:
            sn = rally["set_number"]
            if sn not in sets:
                sets[sn] = []
            sets[sn].append(rally)

        return {
            "match_id": match_id,
            "total_rallies": len(rallies),
            "sets": [
                {"set_number": k, "rallies": v}
                for k, v in sorted(sets.items())
            ],
        }
    finally:
        conn.close()


# ── ABANDON MATCH ─────────────────────────────────────────────
@router.post("/{match_id}/abandon")
def abandon_match(match_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        match = cursor.fetchone()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match["status"] != "live":
            raise HTTPException(
                status_code=400, detail="Only live matches can be abandoned"
            )

        cursor.execute(
            "UPDATE matches SET status = 'abandoned' WHERE id = ?", (match_id,)
        )
        cursor.execute(
            "UPDATE schedule SET status = 'upcoming' WHERE id = ?",
            (match["schedule_id"],),
        )
        cursor.execute("""
            UPDATE match_state
            SET status = 'completed', last_updated = CURRENT_TIMESTAMP
            WHERE match_id = ?
        """, (match_id,))

        conn.commit()
        broadcast_update(match_id)
        return {"message": "Match abandoned. Schedule entry reset to upcoming."}
    finally:
        conn.close()
