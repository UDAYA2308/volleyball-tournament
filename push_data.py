import csv
import json
import sqlite3
import os

def push_data():
    db_path = 'database/tournament.db'
    csv_path = 'data.csv'
    teams_json_path = 'teams.json'

    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Clear existing data to avoid duplicates/conflicts
        cursor.execute("DELETE FROM players")
        cursor.execute("DELETE FROM teams")

        # 1. Insert Teams from JSON (Format: {"Team 1": ["Player A", "Player B"], ...})
        print("Inserting teams from teams.json...")
        with open(teams_json_path, 'r') as f:
            teams_mapping = json.load(f)
        
        # Create a lookup for team_name -> team_id
        team_name_to_id = {}
        for idx, team_name in enumerate(teams_mapping.keys(), start=1):
            cursor.execute(
                "INSERT INTO teams (id, name) VALUES (?, ?)",
                (idx, team_name)
            )
            team_name_to_id[team_name] = idx
        
        # 2. Insert Players from CSV and assign to team based on teams.json
        print("Inserting players from data.csv...")
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Create a reverse mapping: player_name -> team_name
            player_to_team = {}
            for team_name, players in teams_mapping.items():
                for p_name in players:
                    player_to_team[p_name] = team_name

            for row in reader:
                name = row.get('Full name')
                team_name = player_to_team.get(name)
                team_id = team_name_to_id.get(team_name) if team_name else None
                
                gender = row.get('Gender')
                whatsapp = row.get('Whatsapp number ') 
                experience = row.get('Have you played volleyball before? ')
                position = row.get('Which position do you play best?')
                
                captain_val = row.get('Are you willing to be a captain?')
                captain_willing = 1 if captain_val and captain_val.lower() in ['yes', 'maybe'] else 0

                cursor.execute(
                    """
                    INSERT INTO players (team_id, name, gender, whatsapp, experience, position, captain_willing)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (team_id, name, gender, whatsapp, experience, position, captain_willing)
                )

        conn.commit()
        print("Successfully pushed data to database.")

    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    push_data()
