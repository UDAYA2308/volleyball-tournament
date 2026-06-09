import asyncio
import json

import websockets


async def watch_match(match_id=4):
    uri = f"ws://localhost:8003/ws/match/{match_id}"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        print("Connected. Waiting for updates...")
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            event = data.get("event")
            match_data = data.get("data", {})

            print(f"\n[EVENT: {event}]")
            if isinstance(match_data, dict):
                print(
                    f"  {match_data.get('team_a_name')} vs {match_data.get('team_b_name')}"
                )
                print(
                    f"  Score:  {match_data.get('team_a_score')}-{match_data.get('team_b_score')}"
                )
                print(f"  Set:    {match_data.get('set_number')}")
                print(
                    f"  Server: {match_data.get('current_server_name')} ({match_data.get('serving_team_name')})"
                )
                print(f"  Status: {match_data.get('match_status')}")
            else:
                print(f"  Raw: {json.dumps(data, indent=2)}")


async def watch_global():
    uri = "ws://localhost:8003/ws/live"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        print("Connected to global. Waiting for updates...")
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            event = data.get("event")
            print(f"\n[GLOBAL EVENT: {event}]")
            for match in data.get("data", []):
                print(
                    f"  {match.get('team_a_name')} "
                    f"{match.get('team_a_score')}-{match.get('team_b_score')} "
                    f"{match.get('team_b_name')} | "
                    f"Set {match.get('set_number')} | "
                    f"Server: {match.get('current_server_name')}"
                )


if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "match"
    match_id = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    if mode == "global":
        asyncio.run(watch_global())
    else:
        asyncio.run(watch_match(match_id))
