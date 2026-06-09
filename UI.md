# 🎨 Frontend Modification Guide

---

## The One Rule To Never Break

The frontend **never calculates anything**. It only renders what the API returns. Before changing any data display, always check what the API already gives you:

```
http://localhost:8003/docs
```

Every endpoint is listed there with the exact response shape. If the data you need is already in the response — just use it. If it's not — ask the backend to add it, don't calculate it in React.

---

## What You Can Change Freely (Zero Risk)

These changes have **no impact on backend or data**:

- Colors, fonts, spacing, layout
- Adding/removing pages
- Reorganizing navigation
- Adding animations
- Changing button sizes
- Restructuring how data is displayed
- Dark/light mode toggle
- Mobile vs desktop layouts

---

## File Map — What Controls What

### Colors & Theme
Everything uses Tailwind utility classes. The color palette is:

| Color | Used For | Tailwind Classes |
|---|---|---|
| Slate 900 | Page background | `bg-slate-900` |
| Slate 800 | Cards | `bg-slate-800` |
| Slate 700 | Inputs, hover states | `bg-slate-700` |
| Blue 600 | Primary actions, Team A | `bg-blue-600` |
| Orange 600 | Team B | `bg-orange-600` |
| Green 400 | Wins, positive | `text-green-400` |
| Red 400/500 | Losses, live badge | `text-red-400` |
| Yellow 400 | Champion, warnings | `text-yellow-400` |

To change the entire color scheme, do a find-and-replace across `src/` — for example replace all `blue-600` with `purple-600`.

### Typography
No custom fonts are configured. To add one, edit `frontend/index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
```

Then add to `frontend/src/index.css`:

```css
@import "tailwindcss";

* {
  font-family: 'Inter', sans-serif;
}
```

---

## How To Change Each Page

### Home Page (`pages/Home.jsx`)

**What it does:** Fetches schedule from `/schedule/`, listens on WebSocket `ws/live` for real-time updates, renders `ScoreCard` for each match.

**To change the layout of match cards:** Edit `components/ScoreCard.jsx`

**To change how rounds are grouped:** Find this section and modify the grouping key:
```jsx
const rounds = schedule.reduce((acc, match) => {
  const key = match.match_type === 'league'
    ? `Round ${match.round_number}`      // ← change label here
    : match.match_type?.replace('_', ' ').toUpperCase()
  ...
})
```

**To add a banner at the top** (e.g. tournament name, date):
```jsx
// Add above the rounds map
<div className="bg-blue-600 rounded-xl p-4 text-center">
  <h2 className="text-white font-bold">GatorVolley 2026</h2>
  <p className="text-blue-200 text-sm">June 10–11, 2026</p>
</div>
```

**To change what clicking a match does:**
```jsx
onClick={() => {
  if (!match.match_id) return
  if (isAdmin) {
    navigate(`/admin/match/${match.match_id}`)
  } else {
    navigate(`/match/${match.match_id}`)  // ← change destination here
  }
}}
```

---

### ScoreCard Component (`components/ScoreCard.jsx`)

This is rendered on the Home page for every match. Changing this affects all match cards everywhere.

**To change the card size:** Modify the padding classes `p-4`

**To change the set score grid columns:**
```jsx
// Currently adapts between 2 and 3 columns
<div className={`grid gap-1.5 ${sets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
```

**To add scheduled time for all matches (not just upcoming):**
```jsx
// Remove the condition, always show it
{match.scheduled_time && (
  <div className="mt-2 text-center text-xs text-slate-500">
    {new Date(match.scheduled_time).toLocaleString()}
  </div>
)}
```

**To change the LIVE badge:** Edit `components/LiveBadge.jsx`

---

### Leaderboard Page (`pages/Leaderboard.jsx`)

**What it does:** Fetches from `/teams/standings/leaderboard`, polls every 30 seconds.

**To change polling interval:**
```jsx
const interval = setInterval(load, 30000)  // ← change ms here
```

**To add/remove columns:** Find the `<thead>` and `<tbody>` sections and add/remove `<th>` and `<td>` pairs together. Available fields from the API:
```
team_id, team_name, matches_played, matches_won,
matches_lost, total_points, sets_won, total_point_diff, rank
```

**To change the "last playoff spot" label:**
```jsx
{i === 3 && (
  <span className="ml-2 text-xs text-slate-500 font-normal">
    last playoff spot   // ← change text here
  </span>
)}
```

**To highlight top 4 differently:**
```jsx
// Currently top 4 are full opacity, rank 5 is dimmed
${i < 4 ? 'hover:bg-slate-700/50' : 'opacity-60 hover:bg-slate-700/30'}
```

---

### Match Viewer Page (`pages/MatchViewer.jsx`)

**What it does:** Fetches initial state from `/matches/{id}`, then listens on `ws/match/{id}` for live updates. Scores update in real time without polling.

**To change the score display size:**
```jsx
// The big set score numbers
<span className="text-5xl font-black tabular-nums text-white">
  {teamASets}               // ← text-5xl controls size
</span>
```

**To show the current point score differently:**
```jsx
// Currently shows "14 – 11" below the set score
{isLive && (
  <div className="mt-2 text-slate-400 text-sm tabular-nums">
    {teamAScore} – {teamBScore}   // ← format it however you want
  </div>
)}
```

**To add a serve indicator that's more visible:**
```jsx
// Currently shows "● Serving" in small text
// Make it bigger and more prominent:
{isLive && state?.serving_team_id === match.team_a_id && (
  <div className="text-blue-400 font-bold animate-pulse">
    🏐 SERVING
  </div>
)}
```

---

### Match History Page (`pages/MatchHistory.jsx`)

**What it does:** Fetches from `/matches/{id}/history` and `/matches/{id}`. Calculates running score in the frontend (this is the one exception to the no-math rule).

**To change what columns show in the rally table:**
The grid is `grid-cols-12`. Current split:
```
col-span-1  → rally number
col-span-3  → server name
col-span-4  → point won by
col-span-4  → running score
```
Adjust the `col-span-X` values to redistribute space. They must always add up to 12.

**To change rally row highlight colors:**
```jsx
${isMatchPoint
  ? 'bg-yellow-500/10 border-l-2 border-yellow-500'  // ← match point color
  : isSetPoint
  ? 'bg-green-500/10 border-l-2 border-green-500'    // ← set point color
  : idx % 2 === 0
  ? 'bg-transparent'                                  // ← even rows
  : 'bg-slate-700/10'                                 // ← odd rows
}
```

**To show full server name instead of first name only:**
```jsx
// Currently:
🏐 {rally.server_name.split(' ')[0]}
// Change to:
🏐 {rally.server_name}
```

---

### Admin Match Control (`pages/admin/AdminMatchControl.jsx`)

**What it does:** The most complex page. Fetches match state, refreshes on every WebSocket update, handles start/serve/point/undo/abandon actions.

**To change point button size (mobile friendliness):**
```jsx
// Currently py-6 (tall buttons)
<button className="... py-6 rounded-xl text-lg ...">
  +1 {match.team_a_name}    // ← increase py-8 or py-10 for larger touch targets
</button>
```

**To change Team A / Team B button colors:**
```jsx
// Team A button
className="bg-blue-600 hover:bg-blue-500 ..."    // ← change color here

// Team B button  
className="bg-orange-600 hover:bg-orange-500 ..." // ← change color here
```

**To change how player names appear in server selection:**
```jsx
{player.name}
{isServing && ' 🏐'}    // ← change the serving indicator
```

**To add a confirmation before recording a point** (prevent fat-finger mistakes):
```jsx
const handlePoint = async (teamId) => {
  // Add this line:
  if (!confirm(`Record point for ${teamId === match.team_a_id ? match.team_a_name : match.team_b_name}?`)) return
  // rest of function...
}
```

**To change the flash message duration:**
```jsx
setTimeout(() => setMessage(null), 3000)  // ← change ms here
```

---

### Teams Page (`pages/Teams.jsx`)

**What it does:** Fetches all teams from `/teams/` and standings from `/teams/standings/leaderboard`. Loads individual roster lazily when a team is expanded via `/teams/{id}`.

**To change experience level colors:**
```jsx
const EXPERIENCE_COLOR = {
  'Yes, experienced': 'text-green-400',   // ← change colors here
  'Yes, casually':    'text-blue-400',
  'Beginner':         'text-yellow-400',
}
```

**To change experience level labels:**
```jsx
const EXPERIENCE_LABEL = {
  'Yes, experienced': 'Experienced',  // ← change display text here
  'Yes, casually':    'Casual',
  'Beginner':         'Beginner',
}
```

**To add/remove columns in the roster table:** The roster grid is `grid-cols-4`. Add or remove columns and adjust the grid accordingly.

**To change rank badges:**
```jsx
const RANK_BADGE = {
  1: { label: '🥇 Rank 1', cls: 'bg-yellow-500/20 text-yellow-400 ...' },
  // ← change emoji, label, or colors
}
```

---

### Player Stats Page (`pages/PlayerStats.jsx`)

**What it does:** Fetches from `/teams/stats/players`. All filtering and sorting happens in the frontend since it's just re-ordering already-fetched data.

**To add or remove sort options:**
```jsx
{[
  { key: 'serve_conversion_rate', label: 'Conversion %' },
  { key: 'total_serves',          label: 'Most Serves'  },
  { key: 'serve_points_won',      label: 'Points Won'   },
  // ← add new sort keys here, must match API field names
].map(opt => ...)}
```

**To change the conversion rate color thresholds:**
```jsx
const getConversionColor = (rate) => {
  if (rate >= 70) return 'text-green-400'   // ← change threshold
  if (rate >= 50) return 'text-yellow-400'  // ← change threshold
  return 'text-red-400'
}
```

**To hide players with zero serves** (already filtered):
```jsx
.filter(p => p.total_serves > 0)  // ← change to > 5 to only show active servers
```

---

### Playoffs Page (`pages/Playoffs.jsx`)

**What it does:** Fetches from `/playoffs/status` and `/playoffs/bracket`, polls every 15 seconds.

**To change match type labels:**
```jsx
const MATCH_TYPE_LABEL = {
  qualifier_1: 'Qualifier 1',   // ← change display names
  eliminator:  'Eliminator',
  qualifier_2: 'Qualifier 2',
  final:       '🏆 Final',
}
```

**To change bracket card colors:**
```jsx
const MATCH_TYPE_COLOR = {
  qualifier_1: 'border-blue-500/50',    // ← change border colors
  eliminator:  'border-orange-500/50',
  qualifier_2: 'border-purple-500/50',
  final:       'border-yellow-500/50',
}
```

**To change polling interval:**
```jsx
const interval = setInterval(load, 15000)  // ← change ms
```

---

## How To Add a Completely New Page

### Step 1: Create the page file
```jsx
// frontend/src/pages/NewPage.jsx
import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function NewPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/some-endpoint')
      .then(r => setData(r.data))
  }, [])

  if (!data) return <div className="text-slate-400">Loading...</div>

  return (
    <div>
      {/* your UI here */}
    </div>
  )
}
```

### Step 2: Add the route in `App.jsx`
```jsx
import NewPage from './pages/NewPage'

// inside <Routes>:
<Route path="/new-page" element={<NewPage />} />

// if admin only:
<Route path="/new-page" element={
  <ProtectedRoute><NewPage /></ProtectedRoute>
} />
```

### Step 3: Add to navbar in `Navbar.jsx`
```jsx
<Link
  to="/new-page"
  className="text-slate-300 hover:text-white transition-colors"
>
  New Page
</Link>
```

---

## How To Add a New API Call

All API functions live in `frontend/src/api/client.js`. Add yours there:

```js
// Simple GET
export const getSomething = (id) => api.get(`/something/${id}`)

// POST with body
export const doSomething = (id, data) =>
  api.post(`/something/${id}`, data)
```

Then import and use in your page:
```jsx
import { getSomething } from '../api/client'

const result = await getSomething(id)
setData(result.data)
```

---

## How To Change the Navbar

Edit `frontend/src/components/Navbar.jsx`.

**To add a link for everyone:**
```jsx
<Link to="/new-page" className="text-slate-300 hover:text-white transition-colors">
  New Page
</Link>
```

**To add a link only for admins:**
```jsx
{isAdmin && (
  <Link to="/admin/new-page" className="text-slate-300 hover:text-white transition-colors">
    Admin Only
  </Link>
)}
```

**To change the tournament name in the header:**
```jsx
<span className="font-bold text-white tracking-tight">
  Volleyball Tournament   // ← change this
</span>
```

**To add a logo:**
```jsx
<img src="/logo.png" className="h-8 w-8" alt="logo" />
// place logo.png in frontend/public/
```

---

## Common Mistakes To Avoid

**1. Don't calculate scores in the frontend**
```jsx
// ❌ Wrong
const score = rallies.filter(r => r.team === 'Team A').length

// ✅ Right
const score = match.team_a_score  // use what the API gives you
```

**2. Don't hardcode team names or IDs**
```jsx
// ❌ Wrong
if (team === 'Team 1') { ... }

// ✅ Right
if (teamId === match.team_a_id) { ... }
```

**3. Always handle loading and null states**
```jsx
if (loading) return <div className="animate-pulse">Loading...</div>
if (!data)   return <div>Not found</div>
// then render
```

**4. Don't store API data in multiple state variables when one object works**
```jsx
// ❌ Messy
const [teamA, setTeamA] = useState(null)
const [teamB, setTeamB] = useState(null)
const [sets, setSets]   = useState([])

// ✅ Clean
const [match, setMatch] = useState(null)
// access as match.team_a_name, match.sets, etc.
```

**5. Use `api/client.js` for all API calls — never write `fetch()` directly in a page**

---

## Environment Variables

All environment config lives in `frontend/.env`:

```
VITE_API_URL=http://192.168.x.x:8003      ← backend URL
VITE_WS_URL=ws://192.168.x.x:8003         ← WebSocket URL
VITE_ADMIN_PASSWORD=volleyball2026         ← admin password
```

`start.py` rewrites this file automatically on every launch with the correct IP. If you're running manually, update it yourself before starting the frontend.

Access these in code via:
```js
import.meta.env.VITE_API_URL
import.meta.env.VITE_ADMIN_PASSWORD
```