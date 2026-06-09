import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.database import init_db
from backend.routers import teams
# add this import at the top with the other routers
from backend.routers import schedule

# add this line after app.include_router(teams.router)


app = FastAPI(
    title="Volleyball Tournament API",
    version="1.0.0"
)

# ── CORS ──────────────────────────────────────────────────────
# During development allow all origins
# Lock this down to your frontend URL in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import asyncio

@app.on_event("startup")
async def on_startup():
    init_db()
    # Store the event loop for use in sync route handlers
    app.state.loop = asyncio.get_event_loop()
    print("Database ready.")


# ── ROUTERS ───────────────────────────────────────────────────
app.include_router(teams.router)
app.include_router(schedule.router)

from backend.routers import matches

app.include_router(matches.router)

from backend.routers import live

app.include_router(live.router)

from backend.routers import playoffs
app.include_router(playoffs.router)

# ── HEALTH CHECK ──────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "Volleyball Tournament API is running"}