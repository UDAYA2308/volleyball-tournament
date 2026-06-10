import os
import sqlite3
DB_PATH = os.path.join(os.path.dirname(__file__), "tournament.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def verify_data():
    conn = get_connection()
    cursor = conn.cursor()

    print("\n" + "=" * 50)
    print("1. TEAMS")
    print("=" * 50)
    cursor.execute("SELECT * FROM teams")
    teams = cursor.fetchall()
    for t in teams:
        print(dict(t))

    print("\n" + "=" * 50)
    print("2. PLAYERS PER TEAM")
    print("=" * 50)
    cursor.execute("""
        SELECT 
            t.name as team_name,
            COUNT(p.id) as player_count
        FROM teams t
        LEFT JOIN players p ON p.team_id = t.id
        GROUP BY t.id, t.name
    """)
    counts = cursor.fetchall()
    for c in counts:
        print(dict(c))

    print("\n" + "=" * 50)
    print("3. ALL PLAYERS WITH TEAM ASSIGNMENT")
    print("=" * 50)
    cursor.execute("""
        SELECT 
            p.id,
            p.name,
            p.gender,
            p.position,
            p.experience,
            p.captain_willing,
            t.name as team_name
        FROM players p
        JOIN teams t ON t.id = p.team_id
        ORDER BY t.name, p.name
    """)
    players = cursor.fetchall()
    for p in players:
        print(dict(p))

    print("\n" + "=" * 50)
    print("4. SCHEDULE (ALL 10 LEAGUE FIXTURES)")
    print("=" * 50)
    cursor.execute("""
        SELECT 
            s.id,
            s.round_number,
            s.match_type,
            s.status,
            ta.name as team_a,
            tb.name as team_b,
            s.scheduled_time
        FROM schedule s
        JOIN teams ta ON ta.id = s.team_a_id
        JOIN teams tb ON tb.id = s.team_b_id
        ORDER BY s.round_number
    """)
    fixtures = cursor.fetchall()
    for f in fixtures:
        print(dict(f))

    print("\n" + "=" * 50)
    print("5. DUPLICATE FIXTURE CHECK")
    print("=" * 50)
    cursor.execute("""
        SELECT 
            team_a_id, 
            team_b_id, 
            match_type,
            COUNT(*) as count
        FROM schedule
        GROUP BY team_a_id, team_b_id, match_type
        HAVING count > 1
    """)
    dupes = cursor.fetchall()
    if dupes:
        print("WARNING: Duplicate fixtures found!")
        for d in dupes:
            print(dict(d))
    else:
        print("No duplicates found. ✓")

    print("\n" + "=" * 50)
    print("6. PLAYERS WITHOUT A TEAM")
    print("=" * 50)
    cursor.execute("""
        SELECT id, name FROM players WHERE team_id IS NULL
    """)
    unassigned = cursor.fetchall()
    if unassigned:
        print("WARNING: Unassigned players found!")
        for u in unassigned:
            print(dict(u))
    else:
        print("All players assigned to a team. ✓")

    print("\n" + "=" * 50)
    print("7. TOURNAMENT CONFIG")
    print("=" * 50)
    cursor.execute("SELECT * FROM tournament_config")
    config = cursor.fetchall()
    for c in config:
        print(dict(c))

    print("\n" + "=" * 50)
    print("8. LEADERBOARD")
    print("=" * 50)
    cursor.execute("""
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY points DESC,
                         points_rate DESC,
                         sets_won DESC,
                         total_point_diff DESC
            ) AS rank,
            team_name, matches_played, matches_won,
            matches_lost, points, points_rate, sets_won, total_point_diff
        FROM leaderboard
    """)
    for r in cursor.fetchall():
        print(
            f"  #{r['rank']} {r['team_name']:<12} "
            f"P={r['matches_played']} "
            f"W={r['matches_won']} "
            f"L={r['matches_lost']} "
            f"Pts={r['points']} "
            f"PR={round(r['points_rate'], 2):<6} "
            f"Sets={r['sets_won']} "
            f"Diff={r['total_point_diff']}"
        )

    conn.close()

if __name__ == "__main__":
    verify_data()