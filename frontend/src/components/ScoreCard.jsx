import LiveBadge from './LiveBadge'

const MATCH_TYPE_LABEL = {
  qualifier_1: 'Qualifier 1',
  eliminator:  'Eliminator',
  qualifier_2: 'Qualifier 2',
  final:       'Final',
}

export default function ScoreCard({ match, onClick }) {
  const isLive      = match.match_status === 'live' || match.status === 'live'
  const isCompleted = match.match_status === 'completed' || match.status === 'completed'
  const isUpcoming  = !isLive && !isCompleted
  const isPlayoff   = match.match_type !== 'league'

  const sets = match.sets || []

  const teamAWon = match.winner_team_id === match.team_a_id
  const teamBWon = match.winner_team_id === match.team_b_id

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl border transition-all duration-200
        cursor-pointer overflow-hidden
        ${isLive
          ? 'bg-slate-800 border-red-500/60 hover:border-red-400'
          : 'bg-slate-800 border-slate-600 hover:border-slate-400'
        }
      `}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full
        ${isLive
          ? 'bg-gradient-to-r from-red-500 via-orange-400 to-red-500'
          : isCompleted
          ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500'
          : isPlayoff
          ? 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500'
          : 'bg-slate-600'
        }`}
      />

      <div className="p-3 sm:p-4">

        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider
                           text-white">
            {match.match_type === 'league'
              ? `Day ${match.round_number}`
              : MATCH_TYPE_LABEL[match.match_type]
                ?? match.match_type?.replace('_', ' ').toUpperCase()
            }
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {isLive && <LiveBadge />}
            {isCompleted && (
              <span className="text-xs font-bold text-white
                               uppercase tracking-wider">
                Final
              </span>
            )}
            {isUpcoming && match.scheduled_time && (
              <span className="text-xs font-bold text-white">
                {new Date(match.scheduled_time).toLocaleTimeString([], {
                  hour:   '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-1">

          {/* Team A */}
          <div className={`
            flex items-center justify-between gap-2
            px-2 py-2 sm:py-2.5 rounded-lg transition-all
            ${isCompleted && teamAWon
              ? 'border-l-2 border-blue-400 bg-blue-500/10'
              : 'border-l-2 border-transparent'
            }
          `}>
            <div className="flex items-center gap-1.5 truncate flex-1
                            min-w-0">
              {isCompleted && teamAWon && (
                <span className="text-sm shrink-0">🏆</span>
              )}
              <span className={`font-bold text-xs sm:text-sm truncate
                ${isCompleted && teamAWon  ? 'text-white'
                : isCompleted             ? 'text-slate-300'
                : 'text-white'}`}>
                {match.team_a_name}
              </span>
            </div>
            <span className={`text-xl sm:text-2xl font-black tabular-nums
                              w-7 sm:w-8 text-right shrink-0
              ${isCompleted && teamAWon  ? 'text-blue-400'
              : isCompleted             ? 'text-slate-300'
              : 'text-white'}`}>
              {isUpcoming ? '—' : (match.team_a_sets_won ?? 0)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-600 mx-2" />

          {/* Team B */}
          <div className={`
            flex items-center justify-between gap-2
            px-2 py-2 sm:py-2.5 rounded-lg transition-all
            ${isCompleted && teamBWon
              ? 'border-l-2 border-orange-400 bg-orange-500/10'
              : 'border-l-2 border-transparent'
            }
          `}>
            <div className="flex items-center gap-1.5 truncate flex-1
                            min-w-0">
              {isCompleted && teamBWon && (
                <span className="text-sm shrink-0">🏆</span>
              )}
              <span className={`font-bold text-xs sm:text-sm truncate
                ${isCompleted && teamBWon  ? 'text-white'
                : isCompleted             ? 'text-slate-300'
                : 'text-white'}`}>
                {match.team_b_name}
              </span>
            </div>
            <span className={`text-xl sm:text-2xl font-black tabular-nums
                              w-7 sm:w-8 text-right shrink-0
              ${isCompleted && teamBWon  ? 'text-orange-400'
              : isCompleted             ? 'text-slate-300'
              : 'text-white'}`}>
              {isUpcoming ? '—' : (match.team_b_sets_won ?? 0)}
            </span>
          </div>

        </div>

        {/* Set score pills */}
        {(isLive || isCompleted) && sets.length > 0 && (
          <div className={`grid gap-1 sm:gap-1.5 mt-3 sm:mt-4
            ${sets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {sets.map(setData => {
              const isActive = setData?.status === 'active'
              const isDone   = setData?.status === 'completed'
              const setAWon  = isDone &&
                               setData.winner_team_id === match.team_a_id
              const setBWon  = isDone &&
                               setData.winner_team_id === match.team_b_id

              return (
                <div
                  key={setData.set_number}
                  className={`rounded-lg px-1.5 sm:px-2 py-1.5 text-center
                    ${isActive
                      ? 'bg-red-500/15 border border-red-400/40'
                      : 'bg-slate-700/60 border border-slate-500/40'
                    }`}
                >
                  <div className="text-xs font-bold text-white mb-0.5">
                    S{setData.set_number}
                  </div>
                  <div className="font-mono font-black text-xs sm:text-sm">
                    <span className={
                      setAWon   ? 'text-blue-400'
                      : setBWon ? 'text-white'
                      : 'text-white'
                    }>
                      {setData.team_a_score}
                    </span>
                    <span className="text-slate-300 mx-0.5">-</span>
                    <span className={
                      setBWon   ? 'text-orange-400'
                      : setAWon ? 'text-white'
                      : 'text-white'
                    }>
                      {setData.team_b_score}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upcoming date */}
        {isUpcoming && match.scheduled_time && (
          <div className="mt-3 text-center text-xs font-bold text-white">
            {new Date(match.scheduled_time).toLocaleDateString([], {
              weekday: 'short',
              month:   'short',
              day:     'numeric',
            })}
          </div>
        )}

      </div>
    </div>
  )
}