import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

import asyncio

from fastapi import APIRouter, HTTPException

from backend.broadcaster import manager
from backend.routers.live import get_all_live_payload
from database.database import get_connection

router = APIRouter(prefix="/playoffs", tags=["Playoffs"])


# ── BROADCAST HELPER ──────────────────────────────────────────
def broadcast_global():
    try:
        from backend.main import app

        loop = app.state.loop
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_global(
                {"event": "update", "data": get_all_live_payload()}
            ),
            loop,
        )
    except Exception as e:
        print(f"[WS] Broadcast error: {e}")


# ── HELPERS ───────────────────────────────────────────────────
def get_tournament_stage(cursor):
    cursor.execute("SELECT * FROM tournament_config WHERE id = 1")
    return cursor.fetchone()


def get_leaderboard_top4(cursor):
    cursor.execute("""
        SELECT team_id, team_name, total_points, sets_won, total_point_diff
        FROM leaderboard
        LIMIT 4
    """)
    return cursor.fetchall()


def count_league_matches(cursor):
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM matches m
        JOIN schedule s ON s.id = m.schedule_id
        WHERE s.match_type = 'league'
    """)
    return cursor.fetchone()


# ── GET PLAYOFF BRACKET ───────────────────────────────────────
@router.get("/bracket")
def get_bracket():
    conn = get_connection()
    try:
        cursor = conn.cursor()

        config = get_tournament_stage(cursor)

        # Get all playoff schedule entries
        cursor.execute("""
            SELECT
                s.id            AS schedule_id,
                s.match_type,
                s.status        AS schedule_status,
                ta.id           AS team_a_id,
                ta.name         AS team_a_name,
                tb.id           AS team_b_id,
                tb.name         AS team_b_name,
                m.id            AS match_id,
                m.status        AS match_status,
                m.winner_team_id,
                tw.name         AS winner_name
            FROM schedule s
            LEFT JOIN teams ta ON ta.id = s.team_a_id
            LEFT JOIN teams tb ON tb.id = s.team_b_id
            LEFT JOIN matches m ON m.schedule_id = s.id
            LEFT JOIN teams tw ON tw.id = m.winner_team_id
            WHERE s.match_type != 'league'
            ORDER BY
                CASE s.match_type
                    WHEN 'qualifier_1' THEN 1
                    WHEN 'eliminator'  THEN 2
                    WHEN 'qualifier_2' THEN 3
                    WHEN 'final'       THEN 4
                END
        """)
        bracket = [dict(r) for r in cursor.fetchall()]

        # Attach set scores to each bracket match
        for entry in bracket:
            if entry["match_id"]:
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
                    (entry["match_id"],),
                )
                entry["sets"] = [dict(s) for s in cursor.fetchall()]
                entry["team_a_sets_won"] = sum(
                    1
                    for s in entry["sets"]
                    if s["winner_team_id"] == entry["team_a_id"]
                )
                entry["team_b_sets_won"] = sum(
                    1
                    for s in entry["sets"]
                    if s["winner_team_id"] == entry["team_b_id"]
                )
            else:
                entry["sets"] = []
                entry["team_a_sets_won"] = 0
                entry["team_b_sets_won"] = 0

        return {
            "stage": config["stage"],
            "league_locked_at": config["league_locked_at"],
            "bracket": bracket,
        }
    finally:
        conn.close()


# ── GENERATE PLAYOFFS ─────────────────────────────────────────
@router.post("/generate")
def generate_playoffs():
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Check tournament stage
        config = get_tournament_stage(cursor)
        if config["stage"] != "league":
            raise HTTPException(
                status_code=400,
                detail=f"Playoffs already generated. Stage: {config['stage']}",
            )

        # Check all league matches are completed
        counts = count_league_matches(cursor)
        if counts["total"] != counts["completed"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot generate playoffs. "
                f"{counts['completed']}/{counts['total']} league matches completed.",
            )

        # Get top 4 from leaderboard
        top4 = get_leaderboard_top4(cursor)
        if len(top4) < 4:
            raise HTTPException(
                status_code=400,
                detail="Not enough teams in leaderboard to generate playoffs",
            )

        rank1 = top4[0]["team_id"]
        rank2 = top4[1]["team_id"]
        rank3 = top4[2]["team_id"]
        rank4 = top4[3]["team_id"]

        # Create Qualifier 1: Rank 1 vs Rank 2
        cursor.execute(
            """
            INSERT INTO schedule (team_a_id, team_b_id, match_type, status)
            VALUES (?, ?, 'qualifier_1', 'upcoming')
        """,
            (rank1, rank2),
        )
        q1_schedule_id = cursor.lastrowid

        # Create Eliminator: Rank 3 vs Rank 4
        cursor.execute(
            """
            INSERT INTO schedule (team_a_id, team_b_id, match_type, status)
            VALUES (?, ?, 'eliminator', 'upcoming')
        """,
            (rank3, rank4),
        )
        elim_schedule_id = cursor.lastrowid

        # Create Qualifier 2 placeholder: teams TBD
        cursor.execute("""
            INSERT INTO schedule (team_a_id, team_b_id, match_type, status)
            VALUES (NULL, NULL, 'qualifier_2', 'upcoming')
        """)

        # Create Final placeholder: teams TBD
        cursor.execute("""
            INSERT INTO schedule (team_a_id, team_b_id, match_type, status)
            VALUES (NULL, NULL, 'final', 'upcoming')
        """)

        # Create match rows for Q1 and Eliminator immediately
        cursor.execute(
            """
            INSERT INTO matches (schedule_id, team_a_id, team_b_id, status)
            VALUES (?, ?, ?, 'pending')
        """,
            (q1_schedule_id, rank1, rank2),
        )

        cursor.execute(
            """
            INSERT INTO matches (schedule_id, team_a_id, team_b_id, status)
            VALUES (?, ?, ?, 'pending')
        """,
            (elim_schedule_id, rank3, rank4),
        )

        # Lock the league stage
        cursor.execute("""
            UPDATE tournament_config
            SET stage            = 'playoffs',
                league_locked_at = CURRENT_TIMESTAMP
            WHERE id = 1
        """)

        conn.commit()
        broadcast_global()

        return {
            "message": "Playoffs generated successfully",
            "qualifier_1": {
                "team_a": top4[0]["team_name"],
                "team_b": top4[1]["team_name"],
            },
            "eliminator": {
                "team_a": top4[2]["team_name"],
                "team_b": top4[3]["team_name"],
            },
            "qualifier_2": "TBD",
            "final": "TBD",
        }
    finally:
        conn.close()


# ── ADVANCE BRACKET (called after playoff match completes) ────
@router.post("/advance/{match_id}")
def advance_bracket(match_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Get the completed match
        cursor.execute(
            """
            SELECT m.*, s.match_type, s.id as schedule_id
            FROM matches m
            JOIN schedule s ON s.id = m.schedule_id
            WHERE m.id = ?
        """,
            (match_id,),
        )
        match = cursor.fetchone()

        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match["status"] != "completed":
            raise HTTPException(status_code=400, detail="Match is not completed yet")

        match_type = match["match_type"]
        winner_id = match["winner_team_id"]
        loser_id = (
            match["team_b_id"]
            if winner_id == match["team_a_id"]
            else match["team_a_id"]
        )

        if match_type == "qualifier_1":
            # Winner → Final team_a
            # Loser  → Qualifier 2 team_a
            cursor.execute(
                """
                UPDATE schedule SET team_a_id = ?
                WHERE match_type = 'final'
            """,
                (winner_id,),
            )

            cursor.execute(
                """
                UPDATE schedule SET team_a_id = ?
                WHERE match_type = 'qualifier_2'
            """,
                (loser_id,),
            )

            # Check if Qualifier 2 has both teams
            _maybe_create_match(cursor, "qualifier_2")

        elif match_type == "eliminator":
            # Winner → Qualifier 2 team_b
            # Loser  → eliminated (no action needed)
            cursor.execute(
                """
                UPDATE schedule SET team_b_id = ?
                WHERE match_type = 'qualifier_2'
            """,
                (winner_id,),
            )

            # Check if Qualifier 2 has both teams
            _maybe_create_match(cursor, "qualifier_2")

        elif match_type == "qualifier_2":
            # Winner → Final team_b
            cursor.execute(
                """
                UPDATE schedule SET team_b_id = ?
                WHERE match_type = 'final'
            """,
                (winner_id,),
            )

            # Check if Final has both teams
            _maybe_create_match(cursor, "final")

        elif match_type == "final":
            # Tournament complete
            cursor.execute("""
                UPDATE tournament_config SET stage = 'completed' WHERE id = 1
            """)

        conn.commit()
        broadcast_global()

        return {
            "message": f"{match_type} advanced successfully",
            "winner_id": winner_id,
            "loser_id": loser_id,
            "match_type": match_type,
        }
    finally:
        conn.close()


def _maybe_create_match(cursor, match_type: str):
    """Create a match row once both teams are assigned to a playoff fixture."""
    cursor.execute(
        """
        SELECT * FROM schedule
        WHERE match_type = ?
    """,
        (match_type,),
    )
    schedule = cursor.fetchone()

    if not schedule:
        return
    if not schedule["team_a_id"] or not schedule["team_b_id"]:
        return

    # Check if match already exists
    cursor.execute(
        """
        SELECT id FROM matches WHERE schedule_id = ?
    """,
        (schedule["id"],),
    )
    if cursor.fetchone():
        return

    # Create the match
    cursor.execute(
        """
        INSERT INTO matches (schedule_id, team_a_id, team_b_id, status)
        VALUES (?, ?, ?, 'pending')
    """,
        (schedule["id"], schedule["team_a_id"], schedule["team_b_id"]),
    )


# ── GET TOURNAMENT STATUS ─────────────────────────────────────
@router.get("/status")
def get_tournament_status():
    conn = get_connection()
    try:
        cursor = conn.cursor()

        config = get_tournament_stage(cursor)
        counts = count_league_matches(cursor)

        return {
            "stage": config["stage"],
            "league_locked_at": config["league_locked_at"],
            "league_matches_done": counts["completed"],
            "league_matches_total": counts["total"],
            "ready_for_playoffs": (
                counts["completed"] == counts["total"] and config["stage"] == "league"
            ),
        }
    finally:
        conn.close()
