import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMatch } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import { wsMatchUrl } from '../api/client'
import LiveBadge from '../components/LiveBadge'

export default function MatchViewer() {
  const { id }           = useParams()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const { data: wsData, connected } = useWebSocket(wsMatchUrl(id))

  useEffect(() => {
    getMatch(id)
      .then(r => setMatch(r.data))
      .finally(() => setLoading(false))
  }, [id])

  // Update from WebSocket
  useEffect(() => {
    if (!wsData?.data) return
    const live = wsData.data
    if (!live.match_id) return
    setMatch(prev => {
      if (!prev) return prev
      return {
        ...prev,
        status:        live.match_status,
        winner_team_id: live.winner_team_id,
        state: {
          ...prev.state,
          current_server_id:  live.current_server_id,
          serving_team_id:    live.serving_team_id,
          server_name:        live.current_server_name,
          serving_team_name:  live.serving_team_name,
        },
        _live: live,
      }
    })
  }, [wsData])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading match...</div>
    </div>
  )
  if (!match) return (
    <div className="text-center text-slate-400 py-20">Match not found</div>
  )

  const live     = match._live
  const sets     = match.sets || []
  const state    = match.state
  const isLive   = match.status === 'live'
  const isDone   = match.status === 'completed'

  // Scores — prefer WebSocket live data
  const teamAScore = live?.team_a_score ?? 0
  const teamBScore = live?.team_b_score ?? 0
  const teamASets  = live?.team_a_sets_won
    ?? sets.filter(s => s.winner_team_id === match.team_a_id).length
  const teamBSets  = live?.team_b_sets_won
    ?? sets.filter(s => s.winner_team_id === match.team_b_id).length

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            {match.match_type === 'league'
              ? `Round ${match.round_number}`
              : match.match_type?.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLive && <LiveBadge />}
          {!connected && isLive && (
            <span className="text-xs text-yellow-400 animate-pulse">
              reconnecting...
            </span>
          )}
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="grid grid-cols-3 items-center gap-4">

          {/* Team A */}
          <div className={`text-center ${
            isDone && match.winner_team_id === match.team_a_id
              ? 'text-white' : 'text-slate-300'
          }`}>
            <div className="font-bold text-lg leading-tight">
              {match.team_a_name}
            </div>
            {isDone && match.winner_team_id === match.team_a_id && (
              <div className="text-xs text-yellow-400 mt-1">🏆 Winner</div>
            )}
            {isLive && state?.serving_team_id === match.team_a_id && (
              <div className="text-xs text-blue-400 mt-1 animate-pulse">
                ● Serving
              </div>
            )}
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl font-black tabular-nums text-white">
                {teamASets}
              </span>
              <span className="text-2xl text-slate-600">:</span>
              <span className="text-5xl font-black tabular-nums text-white">
                {teamBSets}
              </span>
            </div>
            {isLive && (
              <div className="mt-2 text-slate-400 text-sm tabular-nums">
                {teamAScore} – {teamBScore}
              </div>
            )}
            {isLive && live?.set_number && (
              <div className="text-xs text-slate-500 mt-1">
                Set {live.set_number}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className={`text-center ${
            isDone && match.winner_team_id === match.team_b_id
              ? 'text-white' : 'text-slate-300'
          }`}>
            <div className="font-bold text-lg leading-tight">
              {match.team_b_name}
            </div>
            {isDone && match.winner_team_id === match.team_b_id && (
              <div className="text-xs text-yellow-400 mt-1">🏆 Winner</div>
            )}
            {isLive && state?.serving_team_id === match.team_b_id && (
              <div className="text-xs text-blue-400 mt-1 animate-pulse">
                ● Serving
              </div>
            )}
          </div>
        </div>

        {/* Current Server */}
        {isLive && state?.server_name && (
          <div className="mt-4 text-center text-sm text-slate-400
                          bg-slate-700/50 rounded-lg py-2">
            🏐 <span className="text-white font-medium">{state.server_name}</span>
            {' '}is serving
          </div>
        )}
      </div>

      {/* Set Scores */}
      {sets.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">
            Set Scores
          </h3>
          <div className="space-y-2">
            {sets.map(s => (
              <div key={s.set_number}
                className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Set {s.set_number}</span>
                <span className={`font-mono font-bold ${
                  s.status === 'completed' ? 'text-white' : 'text-blue-400'
                }`}>
                  {s.team_a_score} – {s.team_b_score}
                </span>
                {s.winner_team_id && (
                  <span className="text-xs text-slate-500">
                    {s.winner_team_id === match.team_a_id
                      ? match.team_a_name
                      : match.team_b_name} won
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match History Link */}
      <Link
        to={`/match/${id}/history`}
        className="block text-center text-sm text-blue-400
                   hover:text-blue-300 transition-colors py-2"
      >
        View point-by-point history →
      </Link>
    </div>
  )
}