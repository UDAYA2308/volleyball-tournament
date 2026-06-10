import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getMatch, selectServer, recordPoint,
  undoLastRally, abandonMatch, startMatch, api
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
        flash('🏆 Match complete!', 'success')
        if (match.match_type !== 'league') {
          try {
            await api.post(`/playoffs/advance/${id}`)
          } catch (e) {
            console.error('Bracket advance error:', e)
          }
        }
      } else if (data.set_complete) {
        flash(
          `Set ${data.next_set_number - 1} complete!
           Set ${data.next_set_number} starting.`,
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
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-sm text-theme-secondary">Loading...</p>
      </div>
    </div>
  )

  if (!match) return (
    <div className="text-center py-20 text-theme-secondary">
      Match not found
    </div>
  )

  const state        = match.state
  const sets         = match.sets || []
  const rosters      = match.rosters || []
  const isLive       = match.status === 'live'
  const isPending    = match.status === 'pending'
  const isCompleted  = match.status === 'completed'
  const hasServer    = !!state?.current_server_id
  const servingTeam  = state?.serving_team_id
  const teamAPlayers = rosters.filter(p => p.team_id === match.team_a_id)
  const teamBPlayers = rosters.filter(p => p.team_id === match.team_b_id)
  const currentSet   = sets[sets.length - 1]
  const hasRallies   = sets.some(s => s.team_a_score > 0 || s.team_b_score > 0)

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">

      {/* Flash Message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold
                         text-center border
          ${message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border-green-500/40'
            : message.type === 'error'
            ? 'bg-red-500/20 text-red-400 border-red-500/40'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}>
          {message.msg}
        </div>
      )}

      {/* Header scoreboard */}
      <div className="bg-theme-card rounded-2xl border border-theme p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider
                           text-theme-secondary">
            {match.match_type === 'league'
              ? `Round ${match.round_number}`
              : match.match_type?.replace('_', ' ').toUpperCase()}
          </span>
          {isLive && <LiveBadge />}
        </div>

        {/* Team names + sets won */}
        <div className="grid grid-cols-3 items-center gap-2 text-center">
          <div className="font-black text-lg sm:text-xl md:text-2xl
                          leading-tight text-theme-primary">
            {match.team_a_name}
          </div>
          <div className="text-2xl font-black tabular-nums
                          text-theme-secondary">
            {sets.filter(s => s.winner_team_id === match.team_a_id).length}
            {' : '}
            {sets.filter(s => s.winner_team_id === match.team_b_id).length}
          </div>
          <div className="font-black text-lg sm:text-xl md:text-2xl
                          leading-tight text-theme-primary">
            {match.team_b_name}
          </div>
        </div>

        {/* Current set score */}
        {isLive && currentSet && (
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-4">
              <span className="text-5xl font-black tabular-nums w-16
                               text-right text-theme-primary">
                {currentSet.team_a_score}
              </span>
              <span className="text-3xl font-black text-theme-secondary">
                –
              </span>
              <span className="text-5xl font-black tabular-nums w-16
                               text-left text-theme-primary">
                {currentSet.team_b_score}
              </span>
            </div>
            <div className="mt-1 text-xs font-semibold text-theme-secondary">
              Set {currentSet.set_number}
              {' · '}
              first to {currentSet.set_number === 3 ? 15 : 21}, win by 2
            </div>
          </div>
        )}

        {/* Server info */}
        {isLive && (
          <div className="mt-3 text-center text-sm">
            {hasServer ? (
              <span className="text-blue-400 font-semibold">
                🏐 Serving:{' '}
                <strong className="text-theme-primary">
                  {state.server_name}
                </strong>
                {' '}({state.serving_team_name})
              </span>
            ) : (
              <span className="text-yellow-400 animate-pulse font-semibold">
                ⚠️ Select a server to continue
              </span>
            )}
          </div>
        )}
      </div>

      {/* Start Match */}
      {isPending && (
        <button
          onClick={handleStart}
          disabled={acting}
          className="w-full bg-green-600 hover:bg-green-500
                     disabled:opacity-50 text-white font-bold
                     py-4 rounded-xl text-lg transition-colors"
        >
          Start Match
        </button>
      )}

      {/* Completed State */}
      {isCompleted && (
        <div className="bg-yellow-500/10 border border-yellow-500/40
                        rounded-xl p-6 text-center space-y-2">
          <div className="text-2xl">🏆</div>
          <div className="font-black text-lg text-theme-primary">
            Match Complete
          </div>
          <div className="text-sm font-semibold text-theme-secondary">
            Winner:{' '}
            <span className="font-bold text-theme-primary">
              {match.winner_team_id === match.team_a_id
                ? match.team_a_name
                : match.team_b_name}
            </span>
          </div>
          <button
            onClick={handleUndo}
            disabled={acting}
            className="mt-3 bg-theme-input disabled:opacity-50
                       text-theme-primary px-4 py-2 rounded-lg text-sm
                       transition-colors font-semibold hover-theme"
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
                         disabled:cursor-not-allowed text-white font-black
                         py-6 rounded-xl text-base sm:text-lg
                         transition-colors active:scale-95"
            >
              +1 {match.team_a_name}
            </button>
            <button
              onClick={() => handlePoint(match.team_b_id)}
              disabled={acting || !hasServer}
              className="bg-orange-600 hover:bg-orange-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-black py-6 rounded-xl
                         text-base sm:text-lg transition-colors
                         active:scale-95"
            >
              +1 {match.team_b_name}
            </button>
          </div>

          {/* Server Selection */}
          <div className="bg-theme-card rounded-xl border border-theme p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider
                           mb-3 text-theme-secondary">
              Select Server
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Team A Players */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-400 mb-2
                                uppercase tracking-wider">
                  {match.team_a_name}
                </div>
                {teamAPlayers.map(player => {
                  const isServing = state?.current_server_id === player.id
                  const canSelect = !servingTeam ||
                                    servingTeam === player.team_id
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleSelectServer(player.id)}
                      disabled={acting || !canSelect}
                      className={`w-full text-left px-3 py-2.5 rounded-lg
                                  text-sm transition-colors font-semibold
                        ${isServing
                          ? 'bg-blue-600 text-white'
                          : canSelect
                          ? 'bg-theme-input text-theme-primary hover-theme'
                          : 'bg-theme-input text-theme-secondary opacity-40 cursor-not-allowed'
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
                <div className="text-xs font-bold text-orange-400 mb-2
                                uppercase tracking-wider">
                  {match.team_b_name}
                </div>
                {teamBPlayers.map(player => {
                  const isServing = state?.current_server_id === player.id
                  const canSelect = !servingTeam ||
                                    servingTeam === player.team_id
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleSelectServer(player.id)}
                      disabled={acting || !canSelect}
                      className={`w-full text-left px-3 py-2.5 rounded-lg
                                  text-sm transition-colors font-semibold
                        ${isServing
                          ? 'bg-orange-600 text-white'
                          : canSelect
                          ? 'bg-theme-input text-theme-primary hover-theme'
                          : 'bg-theme-input text-theme-secondary opacity-40 cursor-not-allowed'
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
            <div className="bg-theme-card rounded-xl border border-theme
                            p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider
                             mb-3 text-theme-secondary">
                Sets
              </h3>
              <div className="space-y-2">
                {sets.map(s => (
                  <div
                    key={s.set_number}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-semibold text-theme-secondary">
                      Set {s.set_number}
                    </span>
                    <span className={`font-mono font-black
                      ${s.status === 'completed'
                        ? 'text-theme-primary'
                        : 'text-blue-400'}`}>
                      {s.team_a_score} – {s.team_b_score}
                    </span>
                    <span className="text-xs font-semibold w-24
                                     text-right text-theme-secondary">
                      {s.winner_team_id
                        ? `${s.winner_team_id === match.team_a_id
                            ? match.team_a_name
                            : match.team_b_name} won`
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
              className="bg-theme-input disabled:opacity-40
                         disabled:cursor-not-allowed text-theme-primary
                         font-bold py-3 rounded-xl transition-colors
                         hover-theme"
            >
              ↩ Undo
            </button>
            <button
              onClick={handleAbandon}
              disabled={acting}
              className="disabled:opacity-40 text-red-400
                         hover:text-red-300 font-bold py-3 rounded-xl
                         border border-red-700/50 transition-colors
                         bg-red-900/20 hover:bg-red-900/30"
            >
              Abandon
            </button>
          </div>
        </>
      )}

      {/* Rally History Link */}
      <Link
        to={`/match/${id}/history`}
        className="block text-center text-sm text-theme-secondary
                   hover:text-theme-primary transition-colors py-2
                   font-semibold border border-theme rounded-xl
                   hover-theme"
      >
        📋 View Rally History
      </Link>
    </div>
  )
}