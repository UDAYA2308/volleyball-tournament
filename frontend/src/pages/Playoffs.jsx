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

const BRACKET_TEMPLATE = [
  {
    match_type:  'qualifier_1',
    description: 'Rank 1 vs Rank 2',
    note:        'Winner → Final  |  Loser → Q2',
  },
  {
    match_type:  'eliminator',
    description: 'Rank 3 vs Rank 4',
    note:        'Winner → Q2  |  Loser → Out',
  },
  {
    match_type:  'qualifier_2',
    description: 'Q1 Loser vs Eliminator Winner',
    note:        'Winner → Final',
  },
  {
    match_type:  'final',
    description: 'Q1 Winner vs Q2 Winner',
    note:        '🏆 Tournament Champion',
  },
]

// ── Bracket card ──────────────────────────────────────────
function BracketCard({ entry, isTemplate, onClick }) {
  const isLive   = entry.schedule_status === 'live'
  const isDone   = entry.schedule_status === 'completed'
  const isTBD    = !entry.team_a_name || !entry.team_b_name
  const teamAWon = entry.winner_team_id === entry.team_a_id
  const teamBWon = entry.winner_team_id === entry.team_b_id

  const BORDER_COLOR = {
    qualifier_1: 'border-blue-500/60',
    eliminator:  'border-orange-500/60',
    qualifier_2: 'border-purple-500/60',
    final:       'border-yellow-500/60',
  }

  const TOP_BAR = {
    qualifier_1: 'bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600',
    eliminator:  'bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600',
    qualifier_2: 'bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600',
    final:       'bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600',
  }

  return (
    <div
      onClick={onClick}
      className={`bg-theme-card rounded-xl border overflow-hidden
                  transition-all duration-200
        ${BORDER_COLOR[entry.match_type] ?? 'border-theme'}
        ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full
        ${TOP_BAR[entry.match_type] ?? 'bg-theme-input'}`}
      />

      <div className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-theme-primary">
            {MATCH_TYPE_LABEL[entry.match_type]}
          </span>
          <div className="flex items-center gap-2">
            {isLive && <LiveBadge />}
            {isDone && !isTemplate && (
              <span className="text-xs font-bold uppercase tracking-wider
                               text-theme-primary">
                Final
              </span>
            )}
            {!isLive && !isDone && !isTBD && !isTemplate && (
              <span className="text-xs font-semibold uppercase
                               tracking-wider text-theme-secondary">
                Upcoming
              </span>
            )}
            {(isTBD || isTemplate) && (
              <span className="text-xs font-semibold text-theme-secondary">
                TBD
              </span>
            )}
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-1">
          {/* Team A */}
          <div className={`flex items-center justify-between gap-2
                           px-2 py-2 rounded-lg transition-all
            ${isDone && teamAWon && !isTemplate
              ? 'border-l-2 border-blue-400 bg-blue-500/10'
              : 'border-l-2 border-transparent'}`}>
            <div className="flex items-center gap-1.5 truncate flex-1">
              {isDone && teamAWon && !isTemplate && (
                <span className="text-sm shrink-0">🏆</span>
              )}
              <span className={`font-bold text-sm truncate
                ${isDone && teamAWon && !isTemplate ? 'text-blue-400'
                : isDone && !isTemplate ? 'text-theme-secondary'
                : 'text-theme-primary'}`}>
                {isTemplate
                  ? <span className="text-xs text-theme-secondary">
                      ⏳ TBD
                    </span>
                  : entry.team_a_name
                  ?? <span className="text-xs text-theme-secondary">
                       ⏳ TBD
                     </span>
                }
              </span>
            </div>
            {!isTemplate && (
              <span className={`text-2xl font-black tabular-nums
                                w-8 text-right shrink-0
                ${isDone && teamAWon  ? 'text-blue-400'
                : isDone             ? 'text-theme-secondary'
                :                      'text-theme-primary'}`}>
                {isTBD ? '-' : (entry.team_a_sets_won ?? 0)}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-theme-input mx-2" />

          {/* Team B */}
          <div className={`flex items-center justify-between gap-2
                           px-2 py-2 rounded-lg transition-all
            ${isDone && teamBWon && !isTemplate
              ? 'border-l-2 border-orange-400 bg-orange-500/10'
              : 'border-l-2 border-transparent'}`}>
            <div className="flex items-center gap-1.5 truncate flex-1">
              {isDone && teamBWon && !isTemplate && (
                <span className="text-sm shrink-0">🏆</span>
              )}
              <span className={`font-bold text-sm truncate
                ${isDone && teamBWon && !isTemplate ? 'text-orange-400'
                : isDone && !isTemplate ? 'text-theme-secondary'
                : 'text-theme-primary'}`}>
                {isTemplate
                  ? <span className="text-xs text-theme-secondary">
                      ⏳ TBD
                    </span>
                  : entry.team_b_name
                  ?? <span className="text-xs text-theme-secondary">
                       ⏳ TBD
                     </span>
                }
              </span>
            </div>
            {!isTemplate && (
              <span className={`text-2xl font-black tabular-nums
                                w-8 text-right shrink-0
                ${isDone && teamBWon  ? 'text-orange-400'
                : isDone             ? 'text-theme-secondary'
                :                      'text-theme-primary'}`}>
                {isTBD ? '-' : (entry.team_b_sets_won ?? 0)}
              </span>
            )}
          </div>
        </div>

        {/* Set scores */}
        {!isTemplate && entry.sets?.length > 0 && (
          <div className={`grid gap-1.5 mt-3
            ${entry.sets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {entry.sets.map(s => (
              <div key={s.set_number}
                   className="bg-theme-input rounded-lg px-2 py-1.5
                              text-center border border-theme">
                <div className="text-xs font-bold mb-0.5
                                text-theme-secondary">
                  S{s.set_number}
                </div>
                <div className="font-mono font-bold text-sm
                                text-theme-primary">
                  {s.team_a_score}-{s.team_b_score}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Description for template */}
        {isTemplate && (
          <div className="mt-2 text-center text-xs font-medium
                          text-theme-secondary">
            {entry.description}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
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
        api.get('/playoffs/bracket'),
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
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-sm text-theme-secondary">
          Loading bracket...
        </p>
      </div>
    </div>
  )

  const isLeague    = status?.stage === 'league'
  const isCompleted = status?.stage === 'completed'

  const getEntry = (type) =>
    bracket?.bracket?.find(e => e.match_type === type)

  const q1   = getEntry('qualifier_1')
  const elim = getEntry('eliminator')
  const q2   = getEntry('qualifier_2')
  const fin  = getEntry('final')

  const elimLoser = elim?.winner_team_id
    ? (elim.winner_team_id === elim.team_a_id
        ? elim.team_b_name
        : elim.team_a_name)
    : null

  const handleClick = (entry) => {
    if (!entry?.match_id) return
    const isTBD = !entry.team_a_name || !entry.team_b_name
    if (isTBD) return
    navigate(isAdmin
      ? `/admin/match/${entry.match_id}`
      : `/match/${entry.match_id}`)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-primary">
          Playoffs
        </h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/playoffs')}
            className="text-xs bg-theme-input px-3 py-1.5 rounded-lg
                       transition-colors font-semibold text-theme-secondary
                       hover:text-theme-primary"
          >
            ⚙️ Admin
          </button>
        )}
      </div>

      {/* Champion banner */}
      {isCompleted && (
        <div className="bg-yellow-500/10 border border-yellow-500/50
                        rounded-2xl p-6 sm:p-8 text-center space-y-3">
          <div className="text-4xl sm:text-5xl">🏆</div>
          <div className="text-xl sm:text-2xl font-black text-theme-primary">
            Tournament Champion
          </div>
          <div className="text-yellow-400 font-bold text-xl sm:text-2xl
                          truncate px-4">
            {fin?.winner_name}
          </div>
        </div>
      )}

      {/* League progress */}
      {isLeague && (
        <div className="bg-theme-card rounded-xl border border-theme
                        p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-theme-secondary">
              League Progress
            </span>
            <span className="font-mono font-bold text-theme-primary">
              {status?.league_matches_done}/
              {status?.league_matches_total} matches
            </span>
          </div>
          <div className="w-full bg-theme-input h-2 rounded-full">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${(status?.league_matches_done /
                          status?.league_matches_total) * 100}%`
              }}
            />
          </div>
          <p className="text-xs text-theme-secondary">
            Teams seeded into bracket once all league matches are done
          </p>
        </div>
      )}

      {/* Bracket */}
      <div className="space-y-0">
        {isLeague ? (
          <div className="space-y-0">
            <BracketCard
              entry={BRACKET_TEMPLATE.find(t => t.match_type === 'final')}
              isTemplate
            />
            <div className="flex gap-3 pl-4">
              <div className="flex flex-col items-center">
                <div className="w-px h-6 bg-blue-500/40" />
                <div className="text-xs text-blue-400 font-semibold
                                whitespace-nowrap">
                  Q1 Winner
                </div>
                <div className="w-px h-4 bg-blue-500/40" />
              </div>
              <div className="flex flex-col items-center ml-auto mr-4">
                <div className="w-px h-6 bg-purple-500/40" />
                <div className="text-xs text-purple-400 font-semibold
                                whitespace-nowrap">
                  Q2 Winner
                </div>
                <div className="w-px h-4 bg-purple-500/40" />
              </div>
            </div>
            <BracketCard
              entry={BRACKET_TEMPLATE.find(
                t => t.match_type === 'qualifier_2')}
              isTemplate
            />
            <div className="flex gap-3 pl-4">
              <div className="flex flex-col items-center">
                <div className="w-px h-6 bg-blue-500/40" />
                <div className="text-xs text-blue-400 font-semibold
                                whitespace-nowrap">
                  Q1 Loser
                </div>
                <div className="w-px h-4 bg-blue-500/40" />
              </div>
              <div className="flex flex-col items-center ml-auto mr-4">
                <div className="w-px h-6 bg-orange-500/40" />
                <div className="text-xs text-orange-400 font-semibold
                                whitespace-nowrap">
                  Elim Winner
                </div>
                <div className="w-px h-4 bg-orange-500/40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BracketCard
                entry={BRACKET_TEMPLATE.find(
                  t => t.match_type === 'qualifier_1')}
                isTemplate
              />
              <BracketCard
                entry={BRACKET_TEMPLATE.find(
                  t => t.match_type === 'eliminator')}
                isTemplate
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="text-center text-xs text-theme-secondary">
                Rank 1 vs Rank 2
              </div>
              <div className="text-center text-xs text-theme-secondary">
                Rank 3 vs Rank 4
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {fin && (
              <BracketCard
                entry={fin}
                onClick={() => handleClick(fin)}
              />
            )}
            <div className="flex justify-between px-4">
              <div className="flex flex-col items-center">
                <div className="w-px h-5 bg-blue-500/50" />
                <div className="text-xs text-blue-400 font-semibold
                                whitespace-nowrap py-0.5">
                  Q1 Winner{q1?.winner_name
                    ? `: ${q1.winner_name}` : ''}
                </div>
                <div className="w-px h-5 bg-blue-500/50" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-px h-5 bg-purple-500/50" />
                <div className="text-xs text-purple-400 font-semibold
                                whitespace-nowrap py-0.5">
                  Q2 Winner{q2?.winner_name
                    ? `: ${q2.winner_name}` : ''}
                </div>
                <div className="w-px h-5 bg-purple-500/50" />
              </div>
            </div>
            {q2 && (
              <BracketCard
                entry={q2}
                onClick={() => handleClick(q2)}
              />
            )}
            <div className="flex justify-between px-4">
              <div className="flex flex-col items-center">
                <div className="w-px h-5 bg-blue-500/50" />
                <div className="text-xs text-blue-400 font-semibold
                                whitespace-nowrap py-0.5">
                  Q1 Loser{q1?.winner_team_id
                    ? `: ${q1.team_a_id === q1.winner_team_id
                        ? q1.team_b_name : q1.team_a_name}`
                    : ''}
                </div>
                <div className="w-px h-5 bg-blue-500/50" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-px h-5 bg-orange-500/50" />
                <div className="text-xs text-orange-400 font-semibold
                                whitespace-nowrap py-0.5">
                  Elim Winner{elim?.winner_name
                    ? `: ${elim.winner_name}` : ''}
                </div>
                <div className="w-px h-5 bg-orange-500/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {q1 && (
                <BracketCard
                  entry={q1}
                  onClick={() => handleClick(q1)}
                />
              )}
              {elim && (
                <BracketCard
                  entry={elim}
                  onClick={() => handleClick(elim)}
                />
              )}
            </div>
            {elimLoser && (
              <div className="flex justify-end mt-1 pr-1">
                <div className="flex items-center gap-1.5 text-xs
                                text-red-400 font-semibold">
                  <span>❌</span>
                  <span>{elimLoser} eliminated</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* IPL format legend */}
      <div className="bg-theme-card rounded-xl border border-theme
                      p-3 space-y-1.5">
        <div className="font-bold text-sm mb-2 text-theme-primary">
          How it works
        </div>
        {[
          { dot: '🔵', label: 'Q1 Winner',        arrow: 'directly to Final', color: 'text-blue-400'   },
          { dot: '🔵', label: 'Q1 Loser',          arrow: 'Qualifier 2',       color: 'text-blue-400'   },
          { dot: '🟠', label: 'Eliminator Winner', arrow: 'Qualifier 2',       color: 'text-orange-400' },
          { dot: '🟠', label: 'Eliminator Loser',  arrow: 'Eliminated',        color: 'text-red-400'    },
          { dot: '🟣', label: 'Q2 Winner',         arrow: 'Final',             color: 'text-purple-400' },
        ].map(row => (
          <div key={row.label}
               className="flex items-center gap-2 text-xs
                          text-theme-secondary">
            <span className="shrink-0">{row.dot}</span>
            <span className={`font-bold shrink-0 ${row.color}`}>
              {row.label}
            </span>
            <span className="text-theme-secondary">→</span>
            <span className="text-theme-primary">{row.arrow}</span>
          </div>
        ))}
      </div>
    </div>
  )
}