import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getMatch, selectServer, recordPoint,
  undoLastRally, abandonMatch, startMatch
} from '../../api/client'
import { useWebSocket } from '../../hooks/useWebSocket'
import { wsMatchUrl } from '../../api/client'
import LiveBadge from '../../components/LiveBadge'

export default function AdminMatchControl() {
  const { id }                = useParams()
  const navigate              = useNavigate()
  const [match, setMatch]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)
  const [message, setMessage] = useState(null)
  const { data: wsData }      = useWebSocket(wsMatchUrl(id))

  const loadMatch = () =>
    getMatch(id).then(r => setMatch(r.data)).finally(() => setLoading(false))

  useEffect(() => { loadMatch() }, [id])

  // Refresh match state on every WebSocket update
  useEffect(() => {
    if (!wsData?.data) return
    loadMatch()
  }, [wsData])

  const flash = (msg, type = 'info') => {
    setMessage({ msg, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleStart = async () => {
    try {
      setActing(true)
      await startMatch(match.schedule_id ?? id)
      await loadMatch()
      flash('Match started!', 'success')
    } catch (e) {
      flash(e.response?.data?.detail || 'Error starting match', 'error')
    } finally {
      setActing(false)
    }
  }

  const handleSelectServer = async (playerId) => {
    try {
      setActing(true)
      await selectServer(id, playerId)
      await loadMatch()
    } catch (e) {
      flash(e.response?.data?.detail || 'Error selecting server', 'error')
    } finally {
      setActing(false)
    }
  }

  const handlePoint = async (teamId) => {
  try {
    setActing(true)
    const r = await recordPoint(id, teamId)
    const data = r.data

    if (data.match_complete) {
      flash(`🏆 Match complete!`, 'success')
      // Auto-advance playoff bracket if this is a playoff match
      if (match.match_type !== 'league') {
        try {
          await api.post(`/playoffs/advance/${id}`)
        } catch (e) {
          console.error('Bracket advance error:', e)
        }
      }
    } else if (data.set_complete) {
      flash(
        `Set ${data.next_set_number - 1} complete! Set ${data.next_set_number} starting.`,
        'success'
      )
    }
    await loadMatch()
  } catch (e) {
    flash(e.response?.data?.detail || 'Error recording point', 'error')
  } finally {
    setActing(false)
  }
}

  const handleUndo = async () => {
    try {
      setActing(true)
      await undoLastRally(id)
      await loadMatch()
      flash('Undo successful', 'info')
    } catch (e) {
      flash(e.response?.data?.detail || 'Nothing to undo', 'error')
    } finally {
      setActing(false)
    }
  }

  const handleAbandon = async () => {
    if (!confirm('Are you sure you want to abandon this match?')) return
    try {
      setActing(true)
      await abandonMatch(id)
      navigate('/')
    } catch (e) {
      flash(e.response?.data?.detail || 'Error abandoning match', 'error')
    } finally {
      setActing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading...</div>
    </div>
  )
  if (!match) return (
    <div className="text-center text-slate-400 py-20">Match not found</div>
  )

  const state       = match.state
  const sets        = match.sets || []
  const rosters     = match.rosters || []
  const isLive      = match.status === 'live'
  const isPending   = match.status === 'pending'
  const isCompleted = match.status === 'completed'
  const hasServer   = !!state?.current_server_id
  const servingTeam = state?.serving_team_id

  const teamAPlayers = rosters.filter(p => p.team_id === match.team_a_id)
  const teamBPlayers = rosters.filter(p => p.team_id === match.team_b_id)

  const currentSet = sets[sets.length - 1]
  const hasRallies = sets.some(s => s.team_a_score > 0 || s.team_b_score > 0)

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">

      {/* Flash Message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium text-center
          ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            message.type === 'error'   ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                         'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
          {message.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            {match.match_type === 'league'
              ? `Round ${match.round_number}`
              : match.match_type?.replace('_', ' ').toUpperCase()}
          </span>
          {isLive && <LiveBadge />}
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-3 items-center gap-2 text-center">
          <div className="font-bold text-white">{match.team_a_name}</div>
          <div className="text-4xl font-black text-white tabular-nums">
            {sets.filter(s => s.winner_team_id === match.team_a_id).length}
            {' : '}
            {sets.filter(s => s.winner_team_id === match.team_b_id).length}
          </div>
          <div className="font-bold text-white">{match.team_b_name}</div>
        </div>

        {/* Current set score */}
        {isLive && currentSet && (
          <div className="mt-3 text-center">
            <span className="text-slate-400 text-sm">
              Set {currentSet.set_number}:{' '}
            </span>
            <span className="text-white font-mono font-bold text-lg">
              {currentSet.team_a_score} – {currentSet.team_b_score}
            </span>
            <span className="text-slate-500 text-xs ml-2">
              (first to {currentSet.set_number === 3 ? 15 : 21}, win by 2)
            </span>
          </div>
        )}

        {/* Server info */}
        {isLive && (
          <div className="mt-3 text-center text-sm">
            {hasServer ? (
              <span className="text-blue-400">
                🏐 Serving: <strong>{state.server_name}</strong>
                {' '}({state.serving_team_name})
              </span>
            ) : (
              <span className="text-yellow-400 animate-pulse">
                ⚠️ Select a server to continue
              </span>
            )}
          </div>
        )}
      </div>

      {/* Start Match Button */}
      {isPending && (
        <button
          onClick={handleStart}
          disabled={acting}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50
                     text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          Start Match
        </button>
      )}

      {/* Completed State */}
      {isCompleted && (
        <div className="bg-yellow-500/10 border border-yellow-500/30
                        rounded-xl p-6 text-center space-y-2">
          <div className="text-2xl">🏆</div>
          <div className="text-white font-bold text-lg">Match Complete</div>
          <div className="text-slate-400 text-sm">
            Winner:{' '}
            <span className="text-white font-semibold">
              {match.winner_team_id === match.team_a_id
                ? match.team_a_name : match.team_b_name}
            </span>
          </div>
          <button
            onClick={handleUndo}
            disabled={acting}
            className="mt-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50
                       text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            ↩ Undo Last Point
          </button>
        </div>
      )}

      {/* Live Controls */}
      {isLive && (
        <>
          {/* Point Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePoint(match.team_a_id)}
              disabled={acting || !hasServer}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-bold
                         py-6 rounded-xl text-lg transition-colors
                         active:scale-95"
            >
              +1 {match.team_a_name}
            </button>
            <button
              onClick={() => handlePoint(match.team_b_id)}
              disabled={acting || !hasServer}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-bold
                         py-6 rounded-xl text-lg transition-colors
                         active:scale-95"
            >
              +1 {match.team_b_name}
            </button>
          </div>

          {/* Server Selection */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">
              Select Server
            </h3>
            <div className="grid grid-cols-2 gap-3">

              {/* Team A Players */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-blue-400 mb-2">
                  {match.team_a_name}
                </div>
                {teamAPlayers.map(player => {
                  const isServing    = state?.current_server_id === player.id
                  const canSelect    = !servingTeam || servingTeam === player.team_id
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleSelectServer(player.id)}
                      disabled={acting || !canSelect}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm
                                  transition-colors font-medium
                        ${isServing
                          ? 'bg-blue-600 text-white'
                          : canSelect
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                    >
                      {player.name}
                      {isServing && ' 🏐'}
                    </button>
                  )
                })}
              </div>

              {/* Team B Players */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-orange-400 mb-2">
                  {match.team_b_name}
                </div>
                {teamBPlayers.map(player => {
                  const isServing = state?.current_server_id === player.id
                  const canSelect = !servingTeam || servingTeam === player.team_id
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleSelectServer(player.id)}
                      disabled={acting || !canSelect}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm
                                  transition-colors font-medium
                        ${isServing
                          ? 'bg-orange-600 text-white'
                          : canSelect
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                    >
                      {player.name}
                      {isServing && ' 🏐'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Set History */}
          {sets.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                Sets
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
                    <span className="text-xs text-slate-500 w-24 text-right">
                      {s.winner_team_id
                        ? `${s.winner_team_id === match.team_a_id
                            ? match.team_a_name : match.team_b_name} won`
                        : 'In progress'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Undo & Abandon */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleUndo}
              disabled={acting || !hasRallies}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-semibold
                         py-3 rounded-xl transition-colors"
            >
              ↩ Undo
            </button>
            <button
              onClick={handleAbandon}
              disabled={acting}
              className="bg-red-900/50 hover:bg-red-800/50 disabled:opacity-40
                         text-red-400 font-semibold py-3 rounded-xl
                         border border-red-800/50 transition-colors"
            >
              Abandon
            </button>
          </div>
        </>
      )}

    {/* Match History Link */}
<Link
  to={`/match/${id}/history`}
  className="block text-center text-sm text-slate-400
             hover:text-slate-300 transition-colors py-2
             border border-slate-700 rounded-xl"
>
  📋 View Rally History
</Link>
    </div>
  )
}