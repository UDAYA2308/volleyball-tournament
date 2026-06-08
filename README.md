# Sand Volleyball Tournament Management System

A full-stack web application for managing a sand volleyball tournament, featuring live scoring, real-time leaderboard updates, and automated playoff progression.

## 🏐 Tournament Overview

### Format
- **League Stage**: Round-robin format where every team plays each other once.
- **Match Format**: Best of 3 sets.
  - Sets 1 & 2: First to 21 (win by 2, deuce at 20-20).
  - Set 3: First to 15 (win by 2, deuce at 14-14).
- **Playoffs**: IPL-style progression (Qualifier 1, Eliminator, Qualifier 2, and Final) based on league standings.

### Points System
Points are calculated based on set results and point differentials:
- **2-0 Win**: +1.5 + (sum of point diffs / 10)
- **2-0 Loss**: -1.5 + (sum of point diffs / 10)
- **2-1 Result**: (sum of point diffs / 10)

## 🛠 Tech Stack

- **Backend**: Python, FastAPI, Uvicorn
- **Frontend**: React, TailwindCSS, React Router
- **Database**: SQLite
- **Real-time**: WebSockets for live score and leaderboard updates
- **PWA**: Progressive Web App capabilities for mobile access

## 📂 Project Structure

```text
/
  /backend
    /routes        # API endpoints (teams, schedule, live, leaderboard, stats)
    /db            # SQLite schema and database connection logic
    main.py        # FastAPI application entry point
  /frontend
    /src
      /components  # Reusable UI components (Scoreboards, Modals, Brackets)
      /pages       # Main application views (Teams, Schedule, LiveScore, Leaderboard, PlayerStats)
      /hooks       # Custom React hooks (e.g., useWebSocket)
      /utils       # API helper functions and point calculations
  /scripts         # Utility scripts for seeding data and generating schedules
  start.py         # Unified script to launch both backend and frontend
```

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js & npm

### Installation & Setup
1. **Clone the repository**
2. **Install Backend Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application
The project includes a `start.py` script that automatically manages ports and environment variables for both the backend and frontend.
```bash
python start.py
```
- **Backend**: Typically runs on `http://localhost:8000`
- **Frontend**: Typically runs on `http://localhost:3000`

## 📈 Features
- ✅ **Dynamic Team Management**: Load teams and rosters from JSON.
- ✅ **Automated Scheduling**: One-click round-robin schedule generation.
- ✅ **Live Scoring**: Real-time rally-by-rally tracking with "Undo" capability.
- ✅ **IPL-Style Playoffs**: Automated bracket filling based on league performance.
- ✅ **Real-time Leaderboard**: Instant rank updates via WebSockets.
- ✅ **Player Analytics**: Serve conversion rates and performance tracking.
