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

def get_match_state(match_id):
    r = session.get(f"{BASE_URL}/matches/{match_id}")
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
        return None, None, None, None
    team_a_players = [
        p["id"] for p in conn.execute(
            "SELECT id FROM players WHERE team_id = ?",
            (match["team_a_id"],)
        ).fetchall()
    ]
    team_b_players = [
        p["id"] for p in conn.execute(
            "SELECT id FROM players WHERE team_id = ?",
            (match["team_b_id"],)
        ).fetchall()
    ]
    conn.close()
    return team_a_players, team_b_players, match["team_a_id"], match["team_b_id"]

def reset_playoff_match(match_id, schedule_id):
    conn = db()
    conn.execute("DELETE FROM rallies      WHERE match_id = ?", (match_id,))
    conn.execute("DELETE FROM sets         WHERE match_id = ?", (match_id,))
    conn.execute("DELETE FROM match_state  WHERE match_id = ?", (match_id,))
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

def play_set(match_id, team_a_id, team_b_id,
             team_a_players, team_b_players,
             target_a, target_b):
    score_a = 0
    score_b = 0

    while score_a < target_a or score_b < target_b:
        state = get_match_state(match_id)
        if not state:
            return False

        match_state  = state.get("state", {})
        serving_team = match_state.get("serving_team_id")
        has_server   = match_state.get("current_server_id")

        if not has_server:
            if serving_team == team_a_id:
                server = random.choice(team_a_players)
            elif serving_team == team_b_id:
                server = random.choice(team_b_players)
            else:
                server = random.choice(
                    team_a_players if random.random() > 0.5 else team_b_players
                )

            r = post(
                f"/matches/{match_id}/select-server",
                {"player_id": server}
            )
            if r.status_code != 200:
                return False

            state        = get_match_state(match_id)
            match_state  = state.get("state", {})
            serving_team = match_state.get("serving_team_id")

        need_a = target_a - score_a
        need_b = target_b - score_b

        if need_a == 0:
            scorer = team_b_id
        elif need_b == 0:
            scorer = team_a_id
        else:
            total  = need_a + need_b
            scorer = team_a_id if random.random() < (need_a / total) else team_b_id

        r = post(f"/matches/{match_id}/point", {"team_id": scorer})
        if r.status_code != 200:
            return False

        data = r.json()

        if scorer == team_a_id:
            score_a += 1
        else:
            score_b += 1

        if data.get("set_complete") or data.get("match_complete"):
            break

    return True


def simulate_playoff_match(schedule_id, match_id, result):
    """Simulate a playoff match and auto-advance the bracket."""
    print(f"\n  Simulating playoff match {match_id} "
          f"(schedule {schedule_id}) → {result}")

    reset_playoff_match(match_id, schedule_id)

    team_a_players, team_b_players, team_a_id, team_b_id = \
        get_players_for_match(match_id)

    if not team_a_id:
        print(f"  ❌ Could not load players for match {match_id}")
        return False

    # Start match
    r = post(f"/matches/start/{schedule_id}")
    if r.status_code != 200:
        print(f"  ❌ Could not start match: {r.json()}")
        return False

    if result == "2-0":
        s1_b = random.randint(10, 17)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, 21, s1_b):
            return False
        s2_b = random.randint(10, 17)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, 21, s2_b):
            return False

    elif result == "0-2":
        s1_a = random.randint(10, 17)
        if not play_set(match_id, team_a_id, team_b_id,
                        team_a_players, team_b_players, s1_a, 21):
            return False
        s2_a = random.randint(10, 17)
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

    # Auto-advance the bracket
    r = post(f"/playoffs/advance/{match_id}")
    if r.status_code != 200:
        print(f"  ❌ Bracket advance failed: {r.json()}")
        return False

    print(f"  ✅ Match {match_id} complete — bracket advanced")
    return True


def get_playoff_matches():
    """Fetch current playoff schedule and match ids."""
    conn = db()
    rows = conn.execute("""
        SELECT
            s.id    AS schedule_id,
            s.match_type,
            s.status AS schedule_status,
            m.id    AS match_id,
            m.status AS match_status,
            ta.name AS team_a,
            tb.name AS team_b
        FROM schedule s
        LEFT JOIN matches m ON m.schedule_id = s.id
        LEFT JOIN teams ta ON ta.id = s.team_a_id
        LEFT JOIN teams tb ON tb.id = s.team_b_id
        WHERE s.match_type != 'league'
        ORDER BY
            CASE s.match_type
                WHEN 'qualifier_1' THEN 1
                WHEN 'eliminator'  THEN 2
                WHEN 'qualifier_2' THEN 3
                WHEN 'final'       THEN 4
            END
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def verify_bracket():
    print("\n" + "="*60)
    print("PLAYOFF BRACKET STATUS")
    print("="*60)
    matches = get_playoff_matches()
    for m in matches:
        print(f"  {m['match_type']:<14} "
              f"{m['team_a'] or 'TBD':<12} vs "
              f"{m['team_b'] or 'TBD':<12} "
              f"match_id={m['match_id']} "
              f"status={m['match_status'] or m['schedule_status']}")


if __name__ == "__main__":
    print("="*60)
    print("SIMULATING PLAYOFF MATCHES (Q1 + ELIMINATOR)")
    print("="*60)

    # Show current bracket
    verify_bracket()

    matches = get_playoff_matches()

    # Find Q1 and Eliminator
    q1   = next((m for m in matches if m["match_type"] == "qualifier_1"), None)
    elim = next((m for m in matches if m["match_type"] == "eliminator"),  None)

    if not q1:
        print("\n❌ No Qualifier 1 found. Have you generated playoffs?")
        print("   Run: POST /playoffs/generate")
        exit(1)

    if not elim:
        print("\n❌ No Eliminator found.")
        exit(1)

    if not q1["match_id"]:
        print("\n❌ Qualifier 1 has no match row yet.")
        exit(1)

    if not elim["match_id"]:
        print("\n❌ Eliminator has no match row yet.")
        exit(1)

    start = time.time()

    # Simulate Q1: Rank 1 wins (team_a wins 2-1)
    print(f"\n>>> QUALIFIER 1: {q1['team_a']} vs {q1['team_b']}")
    ok = simulate_playoff_match(q1["schedule_id"], q1["match_id"], "2-1")
    if not ok:
        print("❌ Qualifier 1 failed")
        exit(1)

    # Simulate Eliminator: Rank 3 wins (team_a wins 2-0)
    print(f"\n>>> ELIMINATOR: {elim['team_a']} vs {elim['team_b']}")
    ok = simulate_playoff_match(elim["schedule_id"], elim["match_id"], "2-0")
    if not ok:
        print("❌ Eliminator failed")
        exit(1)

    elapsed = time.time() - start
    print(f"\n✅ Both matches complete in {elapsed:.1f}s")

    # Show updated bracket
    verify_bracket()

    # Show Q2 teams
    print("\n" + "="*60)
    print("QUALIFIER 2 is now ready:")
    matches = get_playoff_matches()
    q2 = next((m for m in matches if m["match_type"] == "qualifier_2"), None)
    if q2:
        print(f"  {q2['team_a'] or 'TBD'} vs {q2['team_b'] or 'TBD'}")
        print(f"  match_id={q2['match_id']} status={q2['match_status']}")