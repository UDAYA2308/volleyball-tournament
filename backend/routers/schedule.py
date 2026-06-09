import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from fastapi import APIRouter, HTTPException

from database.database import get_connection

router = APIRouter(prefix="/schedule", tags=["Schedule"])


# ── GET FULL SCHEDULE ─────────────────────────────────────────
@router.get("/")
def get_schedule():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                s.id,
                s.round_number,
                s.match_type,
                s.status,
                s.scheduled_time,
                ta.id   as team_a_id,
                ta.name as team_a_name,
                tb.id   as team_b_id,
                tb.name as team_b_name,
                m.id    as match_id,
                m.status as match_status,
                m.winner_team_id
            FROM schedule s
            LEFT JOIN teams ta ON ta.id = s.team_a_id
            LEFT JOIN teams tb ON tb.id = s.team_b_id
            LEFT JOIN matches m ON m.schedule_id = s.id
            ORDER BY s.round_number, s.id
        """)
        rows = [dict(r) for r in cursor.fetchall()]

        # Attach sets data to each match
        for row in rows:
            if row["match_id"]:
                cursor.execute(
                    """
                    SELECT
                        s.set_number,
                        s.status,
                        s.winner_team_id,
                        COALESCE(ss.team_a_score, 0) as team_a_score,
                        COALESCE(ss.team_b_score, 0) as team_b_score
                    FROM sets s
                    LEFT JOIN set_scores ss ON ss.set_id = s.id
                    WHERE s.match_id = ?
                    ORDER BY s.set_number
                """,
                    (row["match_id"],),
                )
                row["sets"] = [dict(s) for s in cursor.fetchall()]

                # Compute sets won
                row["team_a_sets_won"] = sum(
                    1 for s in row["sets"] if s["winner_team_id"] == row["team_a_id"]
                )
                row["team_b_sets_won"] = sum(
                    1 for s in row["sets"] if s["winner_team_id"] == row["team_b_id"]
                )
            else:
                row["sets"] = []
                row["team_a_sets_won"] = 0
                row["team_b_sets_won"] = 0

        return rows
    finally:
        conn.close()


# ── GET SCHEDULE BY TYPE ──────────────────────────────────────
@router.get("/type/{match_type}")
def get_schedule_by_type(match_type: str):
    valid_types = ["league", "qualifier_1", "eliminator", "qualifier_2", "final"]
    if match_type not in valid_types:
        raise HTTPException(
            status_code=400, detail=f"Invalid match type. Must be one of {valid_types}"
        )

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                s.id,
                s.round_number,
                s.match_type,
                s.status,
                s.scheduled_time,
                ta.id   as team_a_id,
                ta.name as team_a_name,
                tb.id   as team_b_id,
                tb.name as team_b_name,
                m.id    as match_id,
                m.status as match_status
            FROM schedule s
            LEFT JOIN teams ta ON ta.id = s.team_a_id
            LEFT JOIN teams tb ON tb.id = s.team_b_id
            LEFT JOIN matches m ON m.schedule_id = s.id
            WHERE s.match_type = ?
            ORDER BY s.round_number, s.id
        """,
            (match_type,),
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ── GET LIVE MATCHES ──────────────────────────────────────────
@router.get("/live")
def get_live_matches():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM live_match_view
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ── GET SINGLE SCHEDULE ENTRY ─────────────────────────────────
@router.get("/{schedule_id}")
def get_schedule_entry(schedule_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                s.id,
                s.round_number,
                s.match_type,
                s.status,
                s.scheduled_time,
                ta.id   as team_a_id,
                ta.name as team_a_name,
                tb.id   as team_b_id,
                tb.name as team_b_name,
                m.id    as match_id,
                m.status as match_status,
                m.winner_team_id
            FROM schedule s
            LEFT JOIN teams ta ON ta.id = s.team_a_id
            LEFT JOIN teams tb ON tb.id = s.team_b_id
            LEFT JOIN matches m ON m.schedule_id = s.id
            WHERE s.id = ?
        """,
            (schedule_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Schedule entry not found")
        return dict(row)
    finally:
        conn.close()
