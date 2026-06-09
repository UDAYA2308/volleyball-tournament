import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003'
const WS_URL   = import.meta.env.VITE_WS_URL  || 'ws://localhost:8003'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

// ── TEAMS ──────────────────────────────────────────────────
export const getTeams       = () => api.get('/teams/')
export const getTeam        = (id) => api.get(`/teams/${id}`)
export const getLeaderboard = () => api.get('/teams/standings/leaderboard')
export const getPlayerStats = () => api.get('/teams/stats/players')

// ── SCHEDULE ───────────────────────────────────────────────
export const getSchedule      = () => api.get('/schedule/')
export const getScheduleEntry = (id) => api.get(`/schedule/${id}`)
export const getLiveMatches   = () => api.get('/schedule/live')

// ── MATCHES ────────────────────────────────────────────────
export const getMatch        = (id) => api.get(`/matches/${id}`)
export const getMatchHistory = (id) => api.get(`/matches/${id}/history`)
export const startMatch      = (scheduleId) => api.post(`/matches/start/${scheduleId}`)
export const selectServer    = (matchId, playerId) =>
  api.post(`/matches/${matchId}/select-server`, { player_id: playerId })
export const recordPoint     = (matchId, teamId) =>
  api.post(`/matches/${matchId}/point`, { team_id: teamId })
export const undoLastRally   = (matchId) => api.post(`/matches/${matchId}/undo`)
export const abandonMatch    = (matchId) => api.post(`/matches/${matchId}/abandon`)

// ── WEBSOCKET ──────────────────────────────────────────────
export const wsMatchUrl  = (matchId) => `${WS_URL}/ws/match/${matchId}`
export const wsGlobalUrl = () => `${WS_URL}/ws/live`