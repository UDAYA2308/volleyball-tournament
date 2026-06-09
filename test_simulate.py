import sqlite3
import requests
import random
import time
import os

BASE_URL = "http://localhost:8003"
DB_PATH  = os.path.join(os.path.dirname(__file__), "database", "tournament.db")

session = requests.Session()

# ── HELPERS ───────────────────────────────────────────────────
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def post(url, body=None):
    r = session.post(f"{BASE_URL}{url}", json=body)
    if r.status_code not in (200, 201):
        print(f"  ❌ POST {url} → {r.status_code}: {r.json()}")
    return r

def get(url):
    r = session.get(f"{BASE_URL}{url}")
    return r

def get_match_state(match_id):
    r = get(f"/matches/{match_id}")
    if r.status_code != 200:
        return None
    return r.json()

def get_players_for_match(match_id):
    conn = db()
    match = conn.execute(
        "SELECT team_a_id, team_b_id FROM matches WHERE id = ?",
        (match_id,)
    ).fetchone()
    if not match:
        conn.close()
        return [], [], None, None
    team_a_players = conn.execute(
        "SELECT id FROM players WHERE team_id = ?",
        (match["team_a_id"],)
    ).fetchall()
    team_b_players = conn.execute(
        "SELECT id FROM players WHERE team_id = ?",
        (match["team_b_id"],)
    ).fetchall()
    conn.close()
    return (
        [p["id"] for p in team_a_players],
        [p["id"] for p in team_b_players],
        match["team_a_id"],
        match["team_b_id"]
    )

def reset_match(match_id, schedule_id):
    conn = db()
    conn.execute("DELETE FROM rallies     WHERE match_id = ?", (match_id,))
    conn.execute("DELETE FROM sets        WHERE match_id = ?", (match_id,))
    conn.execute("DELETE FROM match_state WHERE match_id = ?", (match_id,))
    conn.execute(
        "UPDATE matches  SET status='pending', winner_team_id=NULL WHERE id=?",
        (match_id,)
    )
    conn.execute(
        "UPDATE schedule SET status='upcoming' WHERE id=?",
        (schedule_id,)
    )
    conn.commit()
    conn.close()

# ── PLAY ONE SET ──────────────────────────────────────────────
def play_set(match_id, team_a_id, team_b_id,
             team_a_players, team_b_players,
             target_a, target_b):
    """
    Play a set until target_a and target_b scores are reached.
    Always reads current state from API before each rally.
    """
    score_a = 0
    score_b = 0

    while score_a < target_a or score_b < target_b:

        # Always read current state from API
        state = get_match_state(match_id)
        if not state:
            print("  ❌ Could not get match state")
            return False

        match_state  = state.get("state", {})
        if not match_state:
            print("  ❌ No match state found")
            return False

        serving_team = match_state.get("serving_team_id")
        has_server   = match_state.get("current_server_id")

        # Select server if needed
        if not has_server:
            if serving_team == team_a_id:
                server = random.choice(team_a_players)
            elif serving_team == team_b_id:
                server = random.choice(team_b_players)
            else:
                # First serve — pick randomly
                if random.random() > 0.5:
                    server = random.choice(team_a_players)
                else:
                    server = random.choice(team_b_players)

            r = post(
                f"/matches/{match_id}/select-server",
                {"player_id": server}
            )
            if r.status_code != 200:
                print(f"  ❌ select-server failed: {r.json()}")
                return False

            # Re-read after server selection
            state        = get_match_state(match_id)
            match_state  = state.get("state", {})
            serving_team = match_state.get("serving_team_id")

        # Decide who scores this rally
        need_a = target_a - score_a
        need_b = target_b - score_b

        if need_a == 0:
            scorer = team_b_id
        elif need_b == 0:
            scorer = team_a_id
        else:
            total  = need_a + need_b
            prob_a = need_a / total
            scorer = team_a_id if random.random() < prob_a else team_b_id

        # Record point
        r = post(
            f"/matches/{match_id}/point",
            {"team_id": scorer}
        )
        if r.status_code != 200:
            print(f"  ❌ point failed: {r.json()}")
            return False

        data = r.json()

        if scorer == team_a_id:
            score_a += 1
        else:
            score_b += 1

        if data.get("set_complete") or data.get("match_complete"):
            score = data.get("score", "?")
            print(f"    Set done: {score}")
            break

    return True


# ── SIMULATE ONE MATCH ────────────────────────────────────────
def simulate_match(schedule_id, match_id, result="2-0"):
    """
    Simulate a full match.
    result options:
        "2-0"  → team_a wins 2-0
        "0-2"  → team_b wins 2-0
        "2-1"  → team_a wins 2-1
        "1-2"  → team_b wins 2-1
    """
    print(f"\n  Match {match_id} (schedule {schedule_id}) → {result}")

    reset_match(match_id, schedule_id)

    team_a_players, team_b_players, team_a_id, team_b_id = \
        get_players_for_match(match_id)

    if not team_a_players or not team_b_players:
        print(f"  ❌ Could not get players for match {match_id}")
        return False

    # Start match
    r = post(f"/matches/start/{schedule_id}")
    if r.status_code != 200:
        print(f"  ❌ Could not start match: {r.json()}")
        return False

    if result == "2-0":
        s1_b = random.randint(8, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, 21, s1_b):
            return False
        s2_b = random.randint(8, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, 21, s2_b):
            return False

    elif result == "0-2":
        s1_a = random.randint(8, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, s1_a, 21):
            return False
        s2_a = random.randint(8, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, s2_a, 21):
            return False

    elif result == "2-1":
        s1_b = random.randint(10, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, 21, s1_b):
            return False
        s2_a = random.randint(10, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, s2_a, 21):
            return False
        s3_b = random.randint(6, 12)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, 15, s3_b):
            return False

    elif result == "1-2":
        s1_a = random.randint(10, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, s1_a, 21):
            return False
        s2_b = random.randint(10, 18)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, 21, s2_b):
            return False
        s3_a = random.randint(6, 12)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, s3_a, 15):
            return False

    print(f"  ✅ Match {match_id} complete")
    return True


# ── VERIFY RESULTS ────────────────────────────────────────────
def verify_results():
    conn = db()
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)

    print("\n--- MATCHES ---")
    for r in conn.execute("""
        SELECT m.id, m.status,
               ta.name as team_a, tb.name as team_b,
               tw.name as winner
        FROM matches m
        JOIN teams ta ON ta.id = m.team_a_id
        JOIN teams tb ON tb.id = m.team_b_id
        LEFT JOIN teams tw ON tw.id = m.winner_team_id
        WHERE m.id <= 10
        ORDER BY m.id
    """):
        status = "✅" if r["status"] == "completed" else "❌"
        print(f"  {status} Match {r['id']}: {r['team_a']} vs {r['team_b']}"
              f" → Winner: {r['winner'] or 'none'}")

    print("\n--- LEADERBOARD ---")
    for r in conn.execute("""
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY total_points DESC,
                         sets_won DESC,
                         total_point_diff DESC
            ) AS rank,
            team_name, matches_played, matches_won,
            matches_lost, total_points, sets_won, total_point_diff
        FROM leaderboard
    """):
        print(f"  #{r['rank']} {r['team_name']:<12} "
              f"P={r['matches_played']} "
              f"W={r['matches_won']} "
              f"L={r['matches_lost']} "
              f"Pts={round(r['total_points'], 2):<6} "
              f"Sets={r['sets_won']} "
              f"Diff={r['total_point_diff']}")

    print("\n--- PLAYER STATS (top 5 by serves) ---")
    for r in conn.execute("""
        SELECT player_name, team_name, total_serves,
               serve_points_won, serve_conversion_rate
        FROM player_stats
        WHERE total_serves > 0
        ORDER BY total_serves DESC
        LIMIT 5
    """):
        print(f"  {r['player_name']:<25} ({r['team_name']:<10}) "
              f"serves={r['total_serves']:>3} "
              f"won={r['serve_points_won']:>3} "
              f"rate={r['serve_conversion_rate']}%")

    conn.close()


# ════════════════════════════════════════════════════════════
# MATCH PLAN
# Designed standings:
#   Rank 1: Team 1 (wins most)
#   Rank 2: Team 3
#   Rank 3: Team 2
#   Rank 4: Team 4
#   Rank 5: Team 5 (loses most)
# ════════════════════════════════════════════════════════════
MATCH_PLAN = [
    # (schedule_id, match_id, result)
    (1,  1,  "2-0"),   # Team 1 beats Team 2
    (2,  2,  "2-0"),   # Team 3 beats Team 4
    (3,  3,  "2-1"),   # Team 1 beats Team 3
    (4,  4,  "2-0"),   # Team 2 beats Team 5
    (5,  5,  "2-0"),   # Team 1 beats Team 4
    (6,  6,  "1-2"),   # Team 5 beats Team 3
    (7,  7,  "2-1"),   # Team 1 beats Team 5
    (8,  8,  "2-1"),   # Team 2 beats Team 4
    (9,  9,  "0-2"),   # Team 3 beats Team 2
    (10, 10, "2-0"),   # Team 4 beats Team 5
]

if __name__ == "__main__":
    print("="*60)
    print("SIMULATING ALL 10 LEAGUE MATCHES")
    print("="*60)

    start   = time.time()
    success = 0

    for schedule_id, match_id, result in MATCH_PLAN:
        ok = simulate_match(schedule_id, match_id, result)
        if ok:
            success += 1
        else:
            print(f"\n⚠️  Match {match_id} failed — stopping")
            break

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"{'✅' if success == len(MATCH_PLAN) else '❌'} "
          f"{success}/{len(MATCH_PLAN)} matches completed in {elapsed:.1f}s")

    if success == len(MATCH_PLAN):
        verify_results()
        print("\n🏆 Ready to generate playoffs!")
        print("   Go to /admin/playoffs and click Generate Playoffs")