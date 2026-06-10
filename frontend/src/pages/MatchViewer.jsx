import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMatch } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import { wsMatchUrl } from '../api/client'
import LiveBadge from '../components/LiveBadge'

export default function MatchViewer() {
  const { id }                      = useParams()
  const [match, setMatch]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const { data: wsData, connected } = useWebSocket(wsMatchUrl(id))

  useEffect(() => {
    getMatch(id)
      .then(r => setMatch(r.data))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!wsData?.data) return
    const live = wsData.data
    if (!live.match_id) return
    setMatch(prev => {
      if (!prev) return prev
      return {
        ...prev,
        status:         live.match_status,
        winner_team_id: live.winner_team_id,
        state: {
          ...prev.state,
          current_server_id: live.current_server_id,
          serving_team_id:   live.serving_team_id,
          server_name:       live.current_server_name,
          serving_team_name: live.serving_team_name,
        },
        _live: live,
      }
    })
  }, [wsData])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-slate-300 text-sm">Loading match...</p>
      </div>
    </div>
  )

  if (!match) return (
    <div className="text-center text-slate-300 py-20">
      Match not found
    </div>
  )

  const live   = match._live
  const sets   = match.sets || []
  const state  = match.state
  const isLive = match.status === 'live'
  const isDone = match.status === 'completed'

  const teamAScore = live?.team_a_score ?? 0
  const teamBScore = live?.team_b_score ?? 0
  const teamASets  = live?.team_a_sets_won
    ?? sets.filter(s => s.winner_team_id === match.team_a_id).length
  const teamBSets  = live?.team_b_sets_won
    ?? sets.filter(s => s.winner_team_id === match.team_b_id).length

  const teamAWon = match.winner_team_id === match.team_a_id
  const teamBWon = match.winner_team_id === match.team_b_id

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider
                         text-slate-300">
          {match.match_type === 'league'
            ? `Round ${match.round_number}`
            : match.match_type?.replace('_', ' ').toUpperCase()}
        </span>
        <div className="flex items-center gap-2">
          {isLive && <LiveBadge />}
          {!connected && isLive && (
            <span className="text-xs font-semibold text-yellow-400
                             animate-pulse">
              reconnecting...
            </span>
          )}
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="bg-slate-800 rounded-2xl border border-slate-600
                      p-4 sm:p-6">
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">

          {/* Team A */}
          <div className={`text-center
            ${isDone && teamAWon ? 'text-white' : 'text-slate-300'}`}>
            <div className="font-black text-base sm:text-xl md:text-2xl
                            leading-tight">
              {match.team_a_name}
            </div>
            {isDone && teamAWon && (
              <div className="text-xs text-yellow-400 mt-1 font-bold">
                🏆 Winner
              </div>
            )}
            {isLive && state?.serving_team_id === match.team_a_id && (
              <div className="text-xs text-blue-400 mt-1 animate-pulse
                              font-semibold">
                ● Serving
              </div>
            )}
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-3">
              <span className={`text-4xl sm:text-5xl font-black tabular-nums
                ${isDone && teamAWon ? 'text-blue-400' : 'text-white'}`}>
                {teamASets}
              </span>
              <span className="text-xl sm:text-2xl text-slate-400">:</span>
              <span className={`text-4xl sm:text-5xl font-black tabular-nums
                ${isDone && teamBWon ? 'text-orange-400' : 'text-white'}`}>
                {teamBSets}
              </span>
            </div>
            {isLive && (
              <div className="mt-1 sm:mt-2 text-white font-mono font-bold
                              text-sm tabular-nums">
                {teamAScore} – {teamBScore}
              </div>
            )}
            {isLive && live?.set_number && (
              <div className="text-xs text-slate-300 font-semibold mt-0.5">
                Set {live.set_number}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className={`text-center
            ${isDone && teamBWon ? 'text-white' : 'text-slate-300'}`}>
            <div className="font-black text-base sm:text-xl md:text-2xl
                            leading-tight">
              {match.team_b_name}
            </div>
            {isDone && teamBWon && (
              <div className="text-xs text-yellow-400 mt-1 font-bold">
                🏆 Winner
              </div>
            )}
            {isLive && state?.serving_team_id === match.team_b_id && (
              <div className="text-xs text-blue-400 mt-1 animate-pulse
                              font-semibold">
                ● Serving
              </div>
            )}
          </div>
        </div>

        {/* Current Server */}
        {isLive && state?.server_name && (
          <div className="mt-4 text-center text-sm text-slate-300
                          bg-slate-700/50 rounded-lg py-2 font-medium">
            🏐{' '}
            <span className="text-white font-bold">
              {state.server_name}
            </span>
            {' '}is serving
          </div>
        )}
      </div>

      {/* Set Scores */}
      {sets.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase
                         tracking-wider mb-3">
            Set Scores
          </h3>
          <div className="space-y-2">
            {sets.map(s => {
              const setAWon = s.winner_team_id === match.team_a_id
              const setBWon = s.winner_team_id === match.team_b_id

              return (
                <div
                  key={s.set_number}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-300 font-semibold w-12">
                    Set {s.set_number}
                  </span>
                  <span className="font-mono font-bold">
                    <span className={setAWon ? 'text-blue-400' : 'text-white'}>
                      {s.team_a_score}
                    </span>
                    <span className="text-slate-300 mx-1">–</span>
                    <span className={setBWon
                      ? 'text-orange-400' : 'text-white'}>
                      {s.team_b_score}
                    </span>
                  </span>
                  {s.winner_team_id ? (
                    <span className="text-xs text-slate-300 font-semibold
                                     text-right">
                      {s.winner_team_id === match.team_a_id
                        ? match.team_a_name
                        : match.team_b_name}{' '}won
                    </span>
                  ) : (
                    <span className="text-xs text-blue-400 font-semibold">
                      In progress
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Match History Link */}
      <Link
        to={`/match/${id}/history`}
        className="block text-center text-sm text-blue-400
                   hover:text-blue-300 transition-colors py-2
                   font-semibold"
      >
        View point-by-point history →
      </Link>

    </div>
  )
}