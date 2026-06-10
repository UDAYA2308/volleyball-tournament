import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))
from fastapi import APIRouter, HTTPException
from database.database import get_connection
router = APIRouter(prefix="/teams", tags=["Teams"])

# ── GET ALL TEAMS ─────────────────────────────────────────────
@router.get("/")
def get_teams():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                t.id,
                t.name,
                COUNT(p.id) as player_count
            FROM teams t
            LEFT JOIN players p ON p.team_id = t.id
            GROUP BY t.id, t.name
            ORDER BY t.name
        """)
        teams = cursor.fetchall()
        return [dict(t) for t in teams]
    finally:
        conn.close()

# ── GET SINGLE TEAM WITH FULL ROSTER ─────────────────────────
@router.get("/{team_id}")
def get_team(team_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
        team = cursor.fetchone()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        cursor.execute(
            """
            SELECT 
                id,
                name,
                gender,
                position,
                experience,
                captain_willing,
                whatsapp
            FROM players
            WHERE team_id = ?
            ORDER BY name
        """,
            (team_id,),
        )
        players = cursor.fetchall()
        return {**dict(team), "players": [dict(p) for p in players]}
    finally:
        conn.close()

# ── GET LEADERBOARD ───────────────────────────────────────────
@router.get("/standings/leaderboard")
def get_leaderboard():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                ROW_NUMBER() OVER (
                    ORDER BY points DESC,
                             points_rate DESC,
                             sets_won DESC,
                             total_point_diff DESC
                )                           AS rank,
                team_id,
                team_name,
                matches_played,
                matches_won,
                matches_lost,
                points,
                ROUND(points_rate, 2)       AS points_rate,
                sets_won,
                total_point_diff
            FROM leaderboard
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# ── GET PLAYER STATS ──────────────────────────────────────────
@router.get("/stats/players")
def get_player_stats():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT *
            FROM player_stats
            ORDER BY serve_conversion_rate DESC
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# ── GET SINGLE PLAYER STATS ───────────────────────────────────
@router.get("/stats/players/{player_id}")
def get_player_stat(player_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM player_stats WHERE player_id = ?
        """,
            (player_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Player not found")
        return dict(row)
    finally:
        conn.close()