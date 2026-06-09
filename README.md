# 🏐 Volleyball Tournament Management System
## Master Documentation

---

## 1. System Overview

This is a real-time web application for managing a sand volleyball tournament. It replaces manual scorekeeping with a digital system that enforces volleyball rules, tracks player performance, and automates league standings and playoff brackets.

### Core Philosophy: Backend-Heavy, Frontend-Dumb
All business logic, score calculations, and rule enforcement happen in the backend. The frontend is a pure presentation layer — it receives final values and displays them. It never performs math or makes business decisions.

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React.js + Tailwind CSS (Vite) |
| Backend | Python 3.13 + FastAPI + Uvicorn |
| Database | SQLite |
| Real-time | WebSockets |
| Package Manager | uv (Python), npm (Node) |

---

## 2. Project Structure

```
volleyball-tournament/
├── start.py                    ← Launch both servers (start here)
├── simulate_league.py          ← Dev tool: simulate all league matches
├── simulate_playoffs.py        ← Dev tool: simulate Q1 + Eliminator
├── simulate_playoffs_q2_final.py ← Dev tool: simulate Q2 + Final
│
├── database/
│   ├── database.py             ← DB connection + init_db()
│   ├── schema.sql              ← Complete database schema
│   ├── tournament.db           ← SQLite database file
│   └── test.py                 ← Data verification script
│
├── backend/
│   ├── main.py                 ← FastAPI app + CORS + startup
│   ├── broadcaster.py          ← WebSocket connection manager
│   └── routers/
│       ├── teams.py            ← Teams, leaderboard, player stats
│       ├── schedule.py         ← Match schedule endpoints
│       ├── matches.py          ← Live engine (the core)
│       ├── live.py             ← WebSocket endpoints
│       └── playoffs.py         ← Playoff generation + bracket
│
└── frontend/
    ├── .env                    ← API URL + admin password
    └── src/
        ├── api/
        │   └── client.js       ← All API calls in one place
        ├── hooks/
        │   └── useWebSocket.js ← WebSocket auto-reconnect hook
        ├── context/
        │   └── AuthContext.jsx ← Admin password gate
        ├── components/
        │   ├── Navbar.jsx
        │   ├── LiveBadge.jsx
        │   └── ScoreCard.jsx
        └── pages/
            ├── Home.jsx            ← Schedule overview
            ├── Leaderboard.jsx     ← League standings
            ├── MatchViewer.jsx     ← Live score viewer
            ├── MatchHistory.jsx    ← Point by point history
            ├── Teams.jsx           ← Team rosters
            ├── PlayerStats.jsx     ← Serve statistics
            ├── Playoffs.jsx        ← Public bracket view
            └── admin/
                ├── AdminLogin.jsx
                ├── AdminMatchControl.jsx ← Score a match
                └── AdminPlayoffs.jsx     ← Generate playoffs
```

---

## 3. How To Start The System

### First Time Setup
```bash
# 1. Install Python dependencies
uv sync

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Initialize database
uv run python database/database.py init

# 4. Seed teams and players
# (run your seed script with data.csv and teams.json)

# 5. Start everything
uv run python start.py
```

### Every Subsequent Time
```bash
uv run python start.py
```

`start.py` automatically:
- Finds the next free port for both servers
- Gets your local network IP
- Writes the correct `.env` to the frontend
- Starts both servers
- Opens the browser
- Prints the URL for all devices on the network
- Shuts both down cleanly on `Ctrl+C`

### Manual Start (if needed)
```bash
# Backend only
uv run uvicorn backend.main:app --reload --port 8000

# Frontend only
cd frontend && npm run dev
```

---

## 4. Database Architecture

### The Golden Rule
**Never store a calculated value if it can be derived from the `rallies` table.**

The `rallies` table is the atomic truth. Every point ever scored is a row in this table. Scores, standings, and stats are all derived from it via SQL views.

### Tables (in dependency order)

#### `teams`
Stores the 5 teams.
```sql
id | name | created_at
```

#### `players`
Every player linked to their team.
```sql
id | team_id | name | gender | whatsapp | experience | position | captain_willing
```

#### `tournament_config`
Single row — global state machine for the tournament.
```sql
id=1 | stage ('league' → 'playoffs' → 'completed') | league_locked_at
```

#### `schedule`
All fixtures — league and playoff. Playoff placeholders have `NULL` team ids until teams are known.
```sql
id | team_a_id | team_b_id | round_number | match_type | scheduled_time | status
```
`match_type` values: `league`, `qualifier_1`, `eliminator`, `qualifier_2`, `final`
`status` values: `upcoming`, `live`, `completed`

#### `matches`
Created when a match is actually started. Links to schedule.
```sql
id | schedule_id | team_a_id | team_b_id | status | winner_team_id
```
`status` values: `pending`, `live`, `completed`, `abandoned`

#### `sets`
One row per set played. Score columns are a **performance cache** — always read scores from the `set_scores` view.
```sql
id | match_id | set_number | team_a_score | team_b_score | status | winner_team_id | first_server_team_id
```

#### `rallies` ← The Atomic Truth Table
Every single point ever scored. This table is never updated, only inserted and deleted (for undo).
```sql
id | set_id | match_id | set_number | rally_sequence | serving_team_id | server_player_id | point_won_by_team_id | resulted_in_set_completion | resulted_in_match_completion
```

#### `match_state` ← Live Memory
One row per active match. Tracks who is currently serving. Never deleted — status set to `completed` when match ends.
```sql
match_id | current_set_id | current_server_id | serving_team_id | status | last_updated
```

### Views (derived data — never stored)

| View | Purpose |
|---|---|
| `set_scores` | Current score per set from rallies |
| `match_set_differentials` | Sets won + point diff per match |
| `match_results` | Final results + tournament points (league only) |
| `leaderboard` | Ranked standings with tiebreakers |
| `player_stats` | Serve efficiency per player |
| `live_match_view` | Single payload for WebSocket broadcast |

### Points Formula
```
2-0 win:  +1.5 + (sum of point diffs / 10)
2-0 loss: -1.5 + (sum of point diffs / 10)
2-1 result: (sum of point diffs / 10)
```
Point diff is always from each team's own perspective (positive when winning a set, negative when losing).

### Tiebreaker Order
1. Total tournament points
2. Sets won
3. Total point differential

---

## 5. The Live Engine

This is the core of the system. All logic lives in `backend/routers/matches.py`.

### Set Rules
- Sets 1 & 2: first to 21, win by 2, no cap
- Set 3: first to 15, win by 2, no cap
- Deuce is unlimited in all sets

### The Admin Flow (one match)

```
1. Admin clicks "Start Match" on schedule card
   → POST /matches/start/{schedule_id}
   → Creates match row (status='live')
   → Creates Set 1 row
   → Creates match_state row (server=NULL)
   → WebSocket broadcasts to all viewers

2. Admin taps a player name to select server
   → POST /matches/{match_id}/select-server
   → Body: { "player_id": 84 }
   → Validates player belongs to correct team
   → Updates match_state.current_server_id
   → Point buttons unlock
   → WebSocket broadcasts

3. Admin taps "+1 Team A" or "+1 Team B"
   → POST /matches/{match_id}/point
   → Body: { "team_id": 1 }
   → Inserts rally row
   → Updates set score cache
   → Checks set completion (win by 2 rule)
   → Checks match completion (first to 2 sets)
   → If side-out: resets server to NULL, buttons lock
   → WebSocket broadcasts

4. Repeat from step 2

5. Match ends automatically when a team wins 2 sets
   → match.status = 'completed'
   → schedule.status = 'completed'
   → match_state.status = 'completed'
   → Leaderboard updates automatically
```

### Side-Out Logic
When the receiving team wins a point:
- `match_state.current_server_id` → `NULL`
- `match_state.serving_team_id` → scoring team
- Point buttons lock until new server selected
- API validates that new server belongs to the now-serving team

### Set Completion Logic
After every point the backend runs:
```python
target = 15 if set_number == 3 else 21
a_wins = score_a >= target and (score_a - score_b) >= 2
b_wins = score_b >= target and (score_b - score_a) >= 2
```
If a set completes:
- Set row marked `completed`
- New set created automatically
- Serving team auto-assigned = set winner
- Admin must still select the serving player

### Undo System
Three cases handled differently:

**Case 1 — Normal rally:**
Delete rally → decrement set score cache → restore server from deleted rally

**Case 2 — Rally completed a set:**
Delete rally → reopen set (status='active', winner=NULL) → delete new set if empty → restore match_state to reopened set

**Case 3 — Rally completed the match:**
Delete rally → reopen set → reopen match (status='live') → restore match_state (never deleted, status='active' again)

Undo is disabled until at least one rally exists in the match.

---

## 6. Real-Time Architecture

### How WebSockets Work

```
Admin taps point
      ↓
POST /matches/{id}/point
      ↓
Backend records rally
      ↓
broadcast_update(match_id) called
      ↓
asyncio.run_coroutine_threadsafe() schedules broadcast
      ↓
ConnectionManager sends to:
  - All clients on ws://host/ws/match/{match_id}
  - All clients on ws://host/ws/live
      ↓
Frontend receives JSON → updates UI instantly
```

### WebSocket Endpoints
```
ws://host/ws/match/{match_id}  ← specific match viewers
ws://host/ws/live              ← global scoreboard (all live matches)
```

### What Gets Broadcast
Every broadcast sends the complete `live_match_view` payload:
```json
{
  "event": "update",
  "data": {
    "match_id": 1,
    "match_status": "live",
    "team_a_name": "Team 1",
    "team_b_name": "Team 2",
    "team_a_score": 14,
    "team_b_score": 11,
    "team_a_sets_won": 1,
    "team_b_sets_won": 0,
    "set_number": 2,
    "current_server_name": "Heet Patel",
    "serving_team_name": "Team 1"
  }
}
```

### Auto-Reconnect
The `useWebSocket` hook in the frontend automatically reconnects every 3 seconds if the connection drops.

---

## 7. API Reference

### Teams
| Method | Endpoint | Description |
|---|---|---|
| GET | `/teams/` | All teams with player counts |
| GET | `/teams/{id}` | Single team with full roster |
| GET | `/teams/standings/leaderboard` | Ranked standings |
| GET | `/teams/stats/players` | All player serve stats |
| GET | `/teams/stats/players/{id}` | Single player stats |

### Schedule
| Method | Endpoint | Description |
|---|---|---|
| GET | `/schedule/` | Full schedule with set scores |
| GET | `/schedule/type/{match_type}` | Filter by type |
| GET | `/schedule/live` | Currently live matches |
| GET | `/schedule/{id}` | Single schedule entry |

### Matches
| Method | Endpoint | Description |
|---|---|---|
| GET | `/matches/{id}` | Match state + sets + rosters |
| POST | `/matches/start/{schedule_id}` | Start a match |
| POST | `/matches/{id}/select-server` | Select serving player |
| POST | `/matches/{id}/point` | Record a point |
| POST | `/matches/{id}/undo` | Undo last rally |
| GET | `/matches/{id}/history` | Point by point history |
| POST | `/matches/{id}/abandon` | Abandon a live match |

### Playoffs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/playoffs/status` | Tournament stage + league progress |
| GET | `/playoffs/bracket` | Full bracket with scores |
| POST | `/playoffs/generate` | Generate playoff fixtures (admin) |
| POST | `/playoffs/advance/{match_id}` | Advance bracket after match |

### WebSocket
| Endpoint | Description |
|---|---|
| `ws://.../ws/match/{id}` | Live updates for one match |
| `ws://.../ws/live` | Live updates for all matches |

---

## 8. Frontend Pages

### Public Pages (anyone)

| URL | Page | Description |
|---|---|---|
| `/` | Home | Schedule with live set scores |
| `/leaderboard` | Leaderboard | League standings, auto-refreshes every 30s |
| `/match/:id` | MatchViewer | Live score via WebSocket |
| `/match/:id/history` | MatchHistory | Point by point rally log |
| `/teams` | Teams | Team rosters, expandable |
| `/players` | PlayerStats | Serve efficiency table |
| `/playoffs` | Playoffs | Bracket view, auto-refreshes every 15s |

### Admin Pages (password protected)

| URL | Page | Description |
|---|---|---|
| `/admin` | AdminLogin | Password entry |
| `/admin/match/:id` | AdminMatchControl | Score a match |
| `/admin/playoffs` | AdminPlayoffs | Generate playoff bracket |

### Admin Access
- Password stored in `frontend/.env` as `VITE_ADMIN_PASSWORD`
- Auth state stored in `localStorage` — persists across page refreshes
- All admin buttons hidden from public — same URL, same data, different controls shown

---

## 9. Tournament Flow

```
PHASE 1: LEAGUE
────────────────
10 round-robin matches (every team plays every other team once)
5 rounds, 2 matches per round
Leaderboard updates after every completed match

PHASE 2: PLAYOFF GENERATION
────────────────────────────
Admin clicks "Generate Playoffs" (only after all 10 league matches done)
Top 4 teams seeded from leaderboard
Fixtures created:
  - Qualifier 1:  Rank 1 vs Rank 2
  - Eliminator:   Rank 3 vs Rank 4
  - Qualifier 2:  TBD (placeholder)
  - Final:        TBD (placeholder)
League leaderboard frozen — playoff matches don't affect it

PHASE 3: PLAYOFFS (IPL FORMAT)
────────────────────────────────
Q1 winner    → directly to Final
Q1 loser     → Qualifier 2
Elim winner  → Qualifier 2
Elim loser   → eliminated

Q2 winner    → Final
Final winner → Champion
```

---

## 10. How To Make Changes

### Change the UI of a page
Edit the corresponding file in `frontend/src/pages/`. The backend doesn't need to change. The page just renders what the API returns.

### Add a new field to an existing page
1. Check if the backend already returns that field — hit the API endpoint in the browser
2. If yes: just use it in the JSX
3. If no: add it to the SQL query in the relevant router file, then use it in the JSX

### Change how a page looks (colors, layout, spacing)
Edit only the JSX and Tailwind classes in the page or component file. No backend changes needed.

### Add a new page
1. Create `frontend/src/pages/NewPage.jsx`
2. Add `<Route path="/new-page" element={<NewPage />} />` in `App.jsx`
3. Add a `<Link>` in `Navbar.jsx`
4. Use functions from `frontend/src/api/client.js` to fetch data

### Add a new API endpoint
1. Add the function to the relevant router in `backend/routers/`
2. Add a corresponding function in `frontend/src/api/client.js`
3. Use it in your page

### Change the points formula
Edit the `match_results` view in `schema.sql` then run:
```bash
uv run python database/database.py reset
```
Warning: this wipes all data. In production, edit the view directly in SQLite.

### Change set rules (e.g. first to 25 instead of 21)
Edit `get_set_target()` in `backend/routers/matches.py`:
```python
def get_set_target(set_number: int) -> int:
    return 15 if set_number == 3 else 21  # change 21 here
```

### Change the admin password
Edit `frontend/.env`:
```
VITE_ADMIN_PASSWORD=yournewpassword
```
Restart the frontend. No backend change needed.

### Reset the entire tournament (start over)
```bash
uv run python database/database.py reset
# then re-run your seed script
```

---

## 11. Data Flow Diagram

```
data.csv + teams.json
        ↓
    seed script
        ↓
   SQLite Database
   ┌─────────────────────────────────────┐
   │  teams → players                    │
   │  schedule (10 league fixtures)      │
   │  matches (pre-seeded as pending)    │
   │                                     │
   │  Admin scores a point               │
   │         ↓                           │
   │  rallies (INSERT)                   │
   │         ↓                           │
   │  sets (UPDATE cache)                │
   │         ↓                           │
   │  set_scores VIEW (derived)          │
   │         ↓                           │
   │  match_results VIEW (derived)       │
   │         ↓                           │
   │  leaderboard VIEW (derived)         │
   └─────────────────────────────────────┘
        ↓                    ↓
   REST API              WebSocket
        ↓                    ↓
   React Frontend ←──────────┘
   (display only)
```

---

## 12. Known Limitations & Future Improvements

| Item | Notes |
|---|---|
| Auth | Frontend password only — no JWT, no user accounts. Fine for a single-day tournament. |
| Running score in history | Calculated in frontend (MatchHistory.jsx). Could be moved to backend. |
| Sets won in schedule | Calculated in schedule.py endpoint. Could be a DB view. |
| No offline support | If the server goes down mid-match, admin loses the UI. Match state is safe in DB. |
| Single admin | No protection against two admins scoring the same match simultaneously. |
| SQLite | Fine for a single tournament. Would need PostgreSQL for multiple concurrent tournaments. |

---

## 13. Deployment Checklist (Tournament Day)

```
□ Change admin password in frontend/.env
□ Run: uv run python start.py
□ Note the IP address it prints
□ Share that URL with all viewers
□ Test on admin's phone/tablet before tournament starts
□ Keep admin device screen from auto-locking
□ Make sure all devices are on the same WiFi network
□ Keep a browser tab open on the API docs as backup:
  http://{ip}:{port}/docs
```