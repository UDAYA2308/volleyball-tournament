-- ============================================================
-- SAND VOLLEYBALL TOURNAMENT MANAGEMENT SYSTEM
-- Schema Version: 1.0 (Final)
-- ============================================================

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS teams (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id         INTEGER REFERENCES teams(id),
    name            TEXT    NOT NULL,
    gender          TEXT,
    whatsapp        TEXT,
    experience      TEXT,
    position        TEXT,
    captain_willing INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TOURNAMENT CONFIG (single row, global state machine)
-- ============================================================

CREATE TABLE IF NOT EXISTS tournament_config (
    id               INTEGER PRIMARY KEY DEFAULT 1,
    stage            TEXT    NOT NULL DEFAULT 'league',
    league_locked_at TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO tournament_config (id, stage) VALUES (1, 'league');

-- ============================================================
-- SCHEDULE & MATCH TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    team_a_id      INTEGER REFERENCES teams(id),
    team_b_id      INTEGER REFERENCES teams(id),
    round_number   INTEGER,
    match_type     TEXT    NOT NULL DEFAULT 'league',
    scheduled_time TIMESTAMP,
    status         TEXT    NOT NULL DEFAULT 'upcoming',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id    INTEGER REFERENCES schedule(id),
    team_a_id      INTEGER REFERENCES teams(id),
    team_b_id      INTEGER REFERENCES teams(id),
    status         TEXT    NOT NULL DEFAULT 'pending',
    winner_team_id INTEGER REFERENCES teams(id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sets (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id             INTEGER REFERENCES matches(id),
    set_number           INTEGER NOT NULL,
    team_a_score         INTEGER NOT NULL DEFAULT 0,
    team_b_score         INTEGER NOT NULL DEFAULT 0,
    status               TEXT    NOT NULL DEFAULT 'active',
    winner_team_id       INTEGER REFERENCES teams(id),
    first_server_team_id INTEGER REFERENCES teams(id),
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ATOMIC TRUTH TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS rallies (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id                      INTEGER REFERENCES sets(id),
    match_id                    INTEGER REFERENCES matches(id),
    set_number                  INTEGER NOT NULL,
    rally_sequence              INTEGER NOT NULL,
    serving_team_id             INTEGER REFERENCES teams(id),
    server_player_id            INTEGER REFERENCES players(id),
    point_won_by_team_id        INTEGER REFERENCES teams(id),
    resulted_in_set_completion  INTEGER NOT NULL DEFAULT 0,
    resulted_in_match_completion INTEGER NOT NULL DEFAULT 0,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- LIVE MEMORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS match_state (
    match_id          INTEGER PRIMARY KEY REFERENCES matches(id),
    current_set_id    INTEGER REFERENCES sets(id),
    current_server_id INTEGER REFERENCES players(id),
    serving_team_id   INTEGER REFERENCES teams(id),
    status            TEXT    NOT NULL DEFAULT 'active',
    last_updated      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_players_team
    ON players(team_id);

CREATE INDEX IF NOT EXISTS idx_rallies_set
    ON rallies(set_id);

CREATE INDEX IF NOT EXISTS idx_rallies_match
    ON rallies(match_id);

CREATE INDEX IF NOT EXISTS idx_rallies_sequence
    ON rallies(set_id, rally_sequence);

CREATE INDEX IF NOT EXISTS idx_sets_match
    ON sets(match_id);

CREATE INDEX IF NOT EXISTS idx_schedule_status
    ON schedule(status);

CREATE INDEX IF NOT EXISTS idx_schedule_type
    ON schedule(match_type);

CREATE INDEX IF NOT EXISTS idx_match_state_status
    ON match_state(status);

-- ============================================================
-- VIEW 1: SET SCORES
-- Derives current score per set purely from rallies
-- This is the source of truth for all score display
-- ============================================================

DROP VIEW IF EXISTS set_scores;
CREATE VIEW set_scores AS
SELECT
    r.set_id,
    r.match_id,
    r.set_number,
    m.team_a_id,
    m.team_b_id,
    SUM(CASE WHEN r.point_won_by_team_id = m.team_a_id THEN 1 ELSE 0 END) AS team_a_score,
    SUM(CASE WHEN r.point_won_by_team_id = m.team_b_id THEN 1 ELSE 0 END) AS team_b_score,
    COUNT(r.id) AS total_rallies
FROM rallies r
JOIN matches m ON m.id = r.match_id
GROUP BY r.set_id, r.match_id, r.set_number;

-- ============================================================
-- VIEW 2: MATCH SET DIFFERENTIALS
-- Per match: sets won and point differentials across all sets
-- ============================================================

DROP VIEW IF EXISTS match_set_differentials;
CREATE VIEW match_set_differentials AS
SELECT
    s.match_id,
    m.team_a_id,
    m.team_b_id,
    SUM(
        COALESCE(ss.team_a_score, s.team_a_score) -
        COALESCE(ss.team_b_score, s.team_b_score)
    ) AS team_a_point_diff,
    SUM(CASE WHEN s.winner_team_id = m.team_a_id THEN 1 ELSE 0 END) AS team_a_sets_won,
    SUM(CASE WHEN s.winner_team_id = m.team_b_id THEN 1 ELSE 0 END) AS team_b_sets_won
FROM sets s
JOIN matches m ON m.id = s.match_id
LEFT JOIN set_scores ss ON ss.set_id = s.id
WHERE s.status = 'completed'
GROUP BY s.match_id, m.team_a_id, m.team_b_id;

-- ============================================================
-- VIEW 3: MATCH RESULTS
-- ============================================================
DROP VIEW IF EXISTS match_results;
CREATE VIEW match_results AS
SELECT
    m.id                    AS match_id,
    m.team_a_id,
    m.team_b_id,
    m.winner_team_id,
    sc.match_type,
    msd.team_a_sets_won,
    msd.team_b_sets_won,
    msd.team_a_point_diff,
    -- ── NEW: match points (2 for win, 0 for loss) ──
    CASE
        WHEN m.winner_team_id = m.team_a_id THEN 2
        ELSE 0
    END AS team_a_match_points,
    CASE
        WHEN m.winner_team_id = m.team_b_id THEN 2
        ELSE 0
    END AS team_b_match_points,
    -- ── RENAMED: points rate (unchanged formula) ──
    CASE
        WHEN m.winner_team_id = m.team_a_id AND msd.team_b_sets_won = 0
            THEN 1.5 + (msd.team_a_point_diff / 10.0)
        WHEN m.winner_team_id = m.team_b_id AND msd.team_a_sets_won = 0
            THEN -1.5 + (msd.team_a_point_diff / 10.0)
        ELSE
            msd.team_a_point_diff / 10.0
    END AS team_a_points_rate,
    CASE
        WHEN m.winner_team_id = m.team_b_id AND msd.team_a_sets_won = 0
            THEN 1.5 + ((-msd.team_a_point_diff) / 10.0)
        WHEN m.winner_team_id = m.team_a_id AND msd.team_b_sets_won = 0
            THEN -1.5 + ((-msd.team_a_point_diff) / 10.0)
        ELSE
            (-msd.team_a_point_diff) / 10.0
    END AS team_b_points_rate
FROM matches m
JOIN schedule sc ON sc.id = m.schedule_id
JOIN match_set_differentials msd ON msd.match_id = m.id
WHERE m.status = 'completed'
  AND sc.match_type = 'league';

-- ============================================================
-- VIEW 4: LEADERBOARD
-- ============================================================
DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
SELECT
    t.id                    AS team_id,
    t.name                  AS team_name,
    COUNT(DISTINCT mr.match_id) AS matches_played,
    SUM(CASE
        WHEN (mr.team_a_id = t.id AND mr.winner_team_id = t.id)
          OR (mr.team_b_id = t.id AND mr.winner_team_id = t.id)
        THEN 1 ELSE 0
    END)                    AS matches_won,
    SUM(CASE
        WHEN (mr.team_a_id = t.id OR mr.team_b_id = t.id)
         AND mr.winner_team_id != t.id
        THEN 1 ELSE 0
    END)                    AS matches_lost,
    -- ── NEW: match points ──
    COALESCE(SUM(
        CASE
            WHEN mr.team_a_id = t.id THEN mr.team_a_match_points
            ELSE mr.team_b_match_points
        END
    ), 0)                   AS points,
    -- ── RENAMED: points rate ──
    COALESCE(SUM(
        CASE
            WHEN mr.team_a_id = t.id THEN mr.team_a_points_rate
            ELSE mr.team_b_points_rate
        END
    ), 0.0)                 AS points_rate,
    COALESCE(SUM(
        CASE
            WHEN mr.team_a_id = t.id THEN mr.team_a_sets_won
            ELSE mr.team_b_sets_won
        END
    ), 0)                   AS sets_won,
    COALESCE(SUM(
        CASE
            WHEN mr.team_a_id = t.id THEN mr.team_a_point_diff
            ELSE -mr.team_a_point_diff
        END
    ), 0)                   AS total_point_diff
FROM teams t
LEFT JOIN match_results mr
    ON mr.team_a_id = t.id OR mr.team_b_id = t.id
GROUP BY t.id, t.name
ORDER BY
    points           DESC,
    points_rate      DESC,
    sets_won         DESC,
    total_point_diff DESC;

-- ============================================================
-- VIEW 5: PLAYER STATS
-- Serve efficiency per player across all matches
-- ============================================================

DROP VIEW IF EXISTS player_stats;
CREATE VIEW player_stats AS
SELECT
    p.id                    AS player_id,
    p.name                  AS player_name,
    p.position,
    p.team_id,
    t.name                  AS team_name,
    COUNT(r.id)             AS total_serves,
    SUM(CASE WHEN r.point_won_by_team_id = r.serving_team_id THEN 1 ELSE 0 END)
                            AS serve_points_won,
    SUM(CASE WHEN r.point_won_by_team_id != r.serving_team_id THEN 1 ELSE 0 END)
                            AS serve_points_lost,
    ROUND(
        100.0 *
        SUM(CASE WHEN r.point_won_by_team_id = r.serving_team_id THEN 1 ELSE 0 END)
        / NULLIF(COUNT(r.id), 0),
    2)                      AS serve_conversion_rate
FROM players p
JOIN teams t ON t.id = p.team_id
LEFT JOIN rallies r ON r.server_player_id = p.id
GROUP BY p.id, p.name, p.position, p.team_id, t.name;

-- ============================================================
-- VIEW 6: LIVE MATCH VIEW
-- Single payload for WebSocket broadcast
-- Never reads from sets.team_a_score / team_b_score directly
-- ============================================================

DROP VIEW IF EXISTS live_match_view;
CREATE VIEW live_match_view AS
SELECT
    m.id                    AS match_id,
    m.status                AS match_status,
    sc.match_type,
    sc.round_number,

    -- Teams
    ta.id                   AS team_a_id,
    ta.name                 AS team_a_name,
    tb.id                   AS team_b_id,
    tb.name                 AS team_b_name,

    -- Current set info
    ms.current_set_id,
    s.set_number,

    -- Live point scores from rallies (source of truth)
    COALESCE(ss.team_a_score, 0) AS team_a_score,
    COALESCE(ss.team_b_score, 0) AS team_b_score,

    -- Sets won per team
    (
        SELECT COUNT(*) FROM sets
        WHERE match_id = m.id
          AND winner_team_id = m.team_a_id
          AND status = 'completed'
    )                       AS team_a_sets_won,
    (
        SELECT COUNT(*) FROM sets
        WHERE match_id = m.id
          AND winner_team_id = m.team_b_id
          AND status = 'completed'
    )                       AS team_b_sets_won,

    -- Serving state
    ms.serving_team_id,
    srv_team.name           AS serving_team_name,
    ms.current_server_id,
    p.name                  AS current_server_name,

    ms.status               AS match_state_status,
    ms.last_updated
FROM matches m
JOIN schedule sc        ON sc.id = m.schedule_id
JOIN teams ta           ON ta.id = m.team_a_id
JOIN teams tb           ON tb.id = m.team_b_id
JOIN match_state ms     ON ms.match_id = m.id
LEFT JOIN sets s        ON s.id = ms.current_set_id
LEFT JOIN set_scores ss ON ss.set_id = ms.current_set_id
LEFT JOIN players p     ON p.id = ms.current_server_id
LEFT JOIN teams srv_team ON srv_team.id = ms.serving_team_id
WHERE m.status = 'live';