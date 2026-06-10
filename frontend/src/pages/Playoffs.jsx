import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import LiveBadge from '../components/LiveBadge'

const MATCH_TYPE_LABEL = {
  qualifier_1: 'Qualifier 1',
  eliminator:  'Eliminator',
  qualifier_2: 'Qualifier 2',
  final:       '🏆 Final',
}

const MATCH_TYPE_COLOR = {
  qualifier_1: 'border-blue-500/50',
  eliminator:  'border-orange-500/50',
  qualifier_2: 'border-purple-500/50',
  final:       'border-yellow-500/50',
}

const MATCH_TYPE_BG = {
  qualifier_1: 'bg-blue-500/10',
  eliminator:  'bg-orange-500/10',
  qualifier_2: 'bg-purple-500/10',
  final:       'bg-yellow-500/10',
}

// Static bracket template shown during league stage
const BRACKET_TEMPLATE = [
  {
    match_type: 'qualifier_1',
    description: 'Rank 1 vs Rank 2',
    note: 'Winner → Final  |  Loser → Qualifier 2',
  },
  {
    match_type: 'eliminator',
    description: 'Rank 3 vs Rank 4',
    note: 'Winner → Qualifier 2  |  Loser → Eliminated',
  },
  {
    match_type: 'qualifier_2',
    description: 'Q1 Loser vs Eliminator Winner',
    note: 'Winner → Final',
  },
  {
    match_type: 'final',
    description: 'Q1 Winner vs Q2 Winner',
    note: '🏆 Tournament Champion',
  },
]

export default function Playoffs() {
  const [status, setStatus]   = useState(null)
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isAdmin }           = useAuth()
  const navigate              = useNavigate()

  useEffect(() => {
    const load = () =>
      Promise.all([
        api.get('/playoffs/status'),
        api.get('/playoffs/bracket')
      ]).then(([s, b]) => {
        setStatus(s.data)
        setBracket(b.data)
      }).finally(() => setLoading(false))

    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading bracket...</div>
    </div>
  )

  const isLeague    = status?.stage === 'league'
  const isPlayoffs  = status?.stage === 'playoffs'
  const isCompleted = status?.stage === 'completed'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Playoffs</h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/playoffs')}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300
                       px-3 py-1.5 rounded-lg transition-colors"
          >
            ⚙️ Admin
          </button>
        )}
      </div>

      {/* Champion banner */}
      {isCompleted && (
        <div className="bg-yellow-500/10 border border-yellow-500/50
                        rounded-2xl p-8 text-center space-y-3">
          <div className="text-5xl">🏆</div>
          <div className="text-2xl font-black text-white">Tournament Champion</div>
          <div className="text-yellow-400 font-bold text-2xl">
            {bracket?.bracket?.find(b => b.match_type === 'final')?.winner_name}
          </div>
        </div>
      )}

      {/* League progress bar — shown during league stage */}
      {isLeague && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4
                        space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">League Progress</span>
            <span className="text-white font-mono font-bold">
              {status?.league_matches_done}/{status?.league_matches_total} matches
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${(status?.league_matches_done / status?.league_matches_total) * 100}%`
              }}
            />
          </div>
          <p className="text-xs text-slate-500">
            Teams will be seeded into the bracket once all league matches are done
          </p>
        </div>
      )}

      {/* IPL format explanation */}
      <div className="bg-slate-800/50 border border-slate-700/50
                      rounded-xl p-3 text-xs text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300 mb-2">IPL Playoff Format</div>
        <div>🔵 <strong className="text-slate-300">Q1 Winner</strong> → directly to Final</div>
        <div>🔵 <strong className="text-slate-300">Q1 Loser</strong> → Qualifier 2</div>
        <div>🟠 <strong className="text-slate-300">Eliminator Winner</strong> → Qualifier 2</div>
        <div>🟠 <strong className="text-slate-300">Eliminator Loser</strong> → Eliminated</div>
        <div>🟣 <strong className="text-slate-300">Q2 Winner</strong> → Final</div>
      </div>

      {/* Bracket — always visible */}
      <div className="space-y-3">
        {isLeague
          // ── TEMPLATE (league stage) ──────────────────────
          ? BRACKET_TEMPLATE.map(entry => (
              <div
                key={entry.match_type}
                className={`rounded-xl border p-4
                  ${MATCH_TYPE_COLOR[entry.match_type]}
                  ${MATCH_TYPE_BG[entry.match_type]}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">
                    {MATCH_TYPE_LABEL[entry.match_type]}
                  </span>
                  <span className="text-xs text-slate-500">PENDING LEAGUE</span>
                </div>

                {/* TBD teams */}
                <div className="grid grid-cols-3 items-center text-center gap-2">
                  <div className="text-slate-500 text-sm font-medium">
                    ⏳ TBD
                  </div>
                  <div className="text-2xl font-black text-slate-600">
                    - : -
                  </div>
                  <div className="text-slate-500 text-sm font-medium">
                    ⏳ TBD
                  </div>
                </div>

                <div className="mt-3 text-center text-xs text-slate-500">
                  {entry.description}
                </div>
                <div className="mt-1 text-center text-xs text-slate-600">
                  {entry.note}
                </div>
              </div>
            ))

          // ── REAL BRACKET (playoffs/completed) ────────────
          : bracket?.bracket?.map(entry => {
              const isLive = entry.schedule_status === 'live'
              const isDone = entry.schedule_status === 'completed'
              const isTBD  = !entry.team_a_name || !entry.team_b_name

              return (
                <div
                  key={entry.schedule_id}
                  onClick={() => {
                    if (entry.match_id && !isTBD) {
                      navigate(isAdmin
                        ? `/admin/match/${entry.match_id}`
                        : `/match/${entry.match_id}`)
                    }
                  }}
                  className={`rounded-xl border p-4 transition-all
                    ${MATCH_TYPE_COLOR[entry.match_type] ?? 'border-slate-700'}
                    ${MATCH_TYPE_BG[entry.match_type] ?? 'bg-slate-800'}
                    ${entry.match_id && !isTBD ? 'cursor-pointer hover:opacity-90' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">
                      {MATCH_TYPE_LABEL[entry.match_type]}
                    </span>
                    <div className="flex items-center gap-2">
                      {isLive && <LiveBadge />}
                      {isDone && (
                        <span className="text-xs text-green-400 font-medium">FINAL</span>
                      )}
                      {!isLive && !isDone && !isTBD && (
                        <span className="text-xs text-slate-500">UPCOMING</span>
                      )}
                      {isTBD && (
                        <span className="text-xs text-slate-600">TBD</span>
                      )}
                    </div>
                  </div>

                  {/* Teams + Score */}
                  <div className="grid grid-cols-3 items-center text-center gap-2">
                    <div className={`font-semibold text-sm
                      ${entry.winner_team_id === entry.team_a_id && isDone
                        ? 'text-white' : 'text-slate-300'}`}>
                      {entry.team_a_name ?? (
                        <span className="text-slate-600 text-xs">⏳ TBD</span>
                      )}
                      {entry.winner_team_id === entry.team_a_id && isDone && (
                        <div className="text-xs text-yellow-400 mt-0.5">🏆 Winner</div>
                      )}
                    </div>
                    <div className="text-3xl font-black tabular-nums">
                      <span className={
                        entry.winner_team_id === entry.team_a_id && isDone
                          ? 'text-white' : 'text-slate-400'
                      }>
                        {isTBD ? '-' : (entry.team_a_sets_won ?? '-')}
                      </span>
                      <span className="text-slate-600 mx-1 text-xl">:</span>
                      <span className={
                        entry.winner_team_id === entry.team_b_id && isDone
                          ? 'text-white' : 'text-slate-400'
                      }>
                        {isTBD ? '-' : (entry.team_b_sets_won ?? '-')}
                      </span>
                    </div>
                    <div className={`font-semibold text-sm
                      ${entry.winner_team_id === entry.team_b_id && isDone
                        ? 'text-white' : 'text-slate-300'}`}>
                      {entry.team_b_name ?? (
                        <span className="text-slate-600 text-xs">⏳ TBD</span>
                      )}
                      {entry.winner_team_id === entry.team_b_id && isDone && (
                        <div className="text-xs text-yellow-400 mt-0.5">🏆 Winner</div>
                      )}
                    </div>
                  </div>

                  {/* Set scores */}
                  {entry.sets?.length > 0 && (
                    <div className={`grid gap-1.5 mt-3
                      ${entry.sets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {entry.sets.map(s => (
                        <div key={s.set_number}
                          className="bg-slate-800/80 rounded-lg px-2 py-1.5 text-center">
                          <div className="text-xs text-slate-500 mb-0.5">
                            Set {s.set_number}
                          </div>
                          <div className="font-mono font-bold text-sm text-slate-300">
                            {s.team_a_score}-{s.team_b_score}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advancement note */}
                  {isDone && entry.winner_name && entry.match_type !== 'final' && (
                    <div className="mt-3 text-center text-xs text-slate-400">
                      {entry.match_type === 'qualifier_1' && (
                        <>
                          <span className="text-green-400 font-medium">{entry.winner_name}</span>
                          {' '}→ Final &nbsp;|&nbsp;{' '}
                          <span className="text-yellow-400 font-medium">
                            {entry.team_a_name === entry.winner_name
                              ? entry.team_b_name : entry.team_a_name}
                          </span>
                          {' '}→ Qualifier 2
                        </>
                      )}
                      {entry.match_type === 'eliminator' && (
                        <>
                          <span className="text-green-400 font-medium">{entry.winner_name}</span>
                          {' '}→ Qualifier 2 &nbsp;|&nbsp;{' '}
                          <span className="text-red-400 font-medium">
                            {entry.team_a_name === entry.winner_name
                              ? entry.team_b_name : entry.team_a_name}
                          </span>
                          {' '}eliminated
                        </>
                      )}
                      {entry.match_type === 'qualifier_2' && (
                        <>
                          <span className="text-green-400 font-medium">{entry.winner_name}</span>
                          {' '}→ Final
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })
        }
      </div>
    </div>
  )
}