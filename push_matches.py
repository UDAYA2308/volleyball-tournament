import json
import os
import sqlite3


def push_matches():
    db_path = "database/tournament.db"
    matches_json_path = "matches.json"

    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Clear existing schedule and matches to avoid duplicates
        cursor.execute("DELETE FROM matches")
        cursor.execute("DELETE FROM schedule")

        # 1. Load matches from JSON
        with open(matches_json_path, "r") as f:
            matches_data = json.load(f)

        # 2. Map team names to IDs
        cursor.execute("SELECT id, name FROM teams")
        team_map = {name: tid for tid, name in cursor.fetchall()}

        print("Pushing league fixtures to database...")

        for m in matches_data:
            team_a_id = team_map.get(m["team_a"])
            team_b_id = team_map.get(m["team_b"])

            if not team_a_id or not team_b_id:
                print(
                    f"Warning: Could not find ID for teams {m['team_a']} or {m['team_b']}. Skipping."
                )
                continue

            # Insert into 'schedule' table first
            cursor.execute(
                """
                INSERT INTO schedule (team_a_id, team_b_id, round_number, match_type, scheduled_time, status)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    team_a_id,
                    team_b_id,
                    m["round_number"],
                    m["match_type"],
                    m["scheduled_time"],
                    m["status"],
                ),
            )

            schedule_id = cursor.lastrowid

            # Insert into 'matches' table
            cursor.execute(
                """
                INSERT INTO matches (schedule_id, team_a_id, team_b_id, status)
                VALUES (?, ?, ?, ?)
                """,
                (schedule_id, team_a_id, team_b_id, "pending"),
            )

        conn.commit()
        print(f"Successfully pushed {len(matches_data)} matches to the database.")

    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    push_matches()
