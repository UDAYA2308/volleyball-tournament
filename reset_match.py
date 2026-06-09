import asyncio
import websockets
import json

async def watch_match():
    uri = "ws://localhost:8003/ws/match/4"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        print("Connected. Waiting for updates...")
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print(f"\n[EVENT: {data.get('event')}]")
            match_data = data.get("data", {})
            print(f"  Match: {match_data.get('team_a_name')} vs {match_data.get('team_b_name')}")
            print(f"  Score: {match_data.get('team_a_score')}-{match_data.get('team_b_score')}")
            print(f"  Set: {match_data.get('set_number')}")
            print(f"  Server: {match_data.get('current_server_name')}")
            print(f"  Status: {match_data.get('match_status')}")

async def watch_global():
    uri = "ws://localhost:8003/ws/live"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        print("Connected to global. Waiting for updates...")
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print(f"\n[GLOBAL EVENT: {data.get('event')}]")
            for match in data.get("data", []):
                print(f"  {match.get('team_a_name')} {match.get('team_a_score')}-{match.get('team_b_score')} {match.get('team_b_name')}")

if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "match"
    if mode == "global":
        asyncio.run(watch_global())
    else:
        asyncio.run(watch_match())