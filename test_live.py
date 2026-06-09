import time

import requests

BASE_URL = "http://localhost:8003"
s = requests.Session()

match_id = 4  # already live

# Score points back and forth
rallies = [
    (80, 2),  # r serves, Team 2 scores
    (80, 2),  # Team 2 scores again
    (80, 5),  # Team 5 scores (side-out)
    (73, 5),  # ra serves, Team 5 scores
    (73, 5),  # Team 5 scores again
    (73, 2),  # Team 2 scores (side-out)
    (80, 2),  # r serves, Team 2 scores
    (80, 2),  # Team 2 scores
    (80, 5),  # Team 5 scores (side-out)
    (73, 2),  # Team 2 scores (side-out)
]

for server, scorer in rallies:
    r = s.post(
        f"{BASE_URL}/matches/{match_id}/select-server", json={"player_id": server}
    )
    if r.status_code != 200:
        print(f"Server select failed: {r.json()}")
        break
    r = s.post(f"{BASE_URL}/matches/{match_id}/point", json={"team_id": scorer})
    if r.status_code != 200:
        print(f"Point failed: {r.json()}")
        break
    data = r.json()
    print(f"score={data.get('score')} side_out={data.get('side_out')}")
    time.sleep(0.5)
    time.sleep(0.5)
