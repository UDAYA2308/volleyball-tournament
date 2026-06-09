import LiveBadge from './LiveBadge'

export default function ScoreCard({ match, onClick }) {
  const isLive      = match.match_status === 'live' || match.status === 'live'
  const isCompleted = match.match_status === 'completed' || match.status === 'completed'

  // Build set scores array — max 3 sets
  const sets = match.sets || []

  return (
    <div
      onClick={onClick}
      className={`
        bg-slate-800 rounded-xl p-4 border transition-all cursor-pointer
        ${isLive
          ? 'border-red-500/50 hover:border-red-400'
          : 'border-slate-700 hover:border-slate-500'}
      `}
    >
      {/* Top row: round label + status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400">
          {match.match_type === 'league'
            ? `Round ${match.round_number}`
            : match.match_type?.replace('_', ' ').toUpperCase()}
        </span>
        {isLive && <LiveBadge />}
        {isCompleted && (
          <span className="text-xs text-slate-500 font-medium">FINAL</span>
        )}
        {!isLive && !isCompleted && (
          <span className="text-xs text-slate-500">UPCOMING</span>
        )}
      </div>

      {/* Team names + set score tally */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`font-semibold text-sm flex-1 text-right truncate
          ${match.winner_team_id === match.team_a_id
            ? 'text-white' : 'text-slate-400'}`}>
          {match.team_a_name}
        </span>

        <div className="flex items-center gap-1.5 text-2xl font-black tabular-nums">
          <span className={match.winner_team_id === match.team_a_id
            ? 'text-white' : 'text-slate-300'}>
            {match.team_a_sets_won ?? '-'}
          </span>
          <span className="text-slate-600 text-lg">:</span>
          <span className={match.winner_team_id === match.team_b_id
            ? 'text-white' : 'text-slate-300'}>
            {match.team_b_sets_won ?? '-'}
          </span>
        </div>

        <span className={`font-semibold text-sm flex-1 truncate
          ${match.winner_team_id === match.team_b_id
            ? 'text-white' : 'text-slate-400'}`}>
          {match.team_b_name}
        </span>
      </div>

      {/* Per-set score grid — only show played sets */}
        {(isLive || isCompleted) && sets.length > 0 && (
          <div className={`grid gap-1.5 ${sets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {sets.map(setData => {
              const isActive = setData?.status === 'active'
              const isDone   = setData?.status === 'completed'

              return (
                <div
                  key={setData.set_number}
                  className={`rounded-lg px-2 py-1.5 text-center
                    ${isActive
                      ? 'bg-blue-500/20 border border-blue-500/40'
                      : isDone
                      ? 'bg-slate-700/60 border border-slate-600/40'
                      : 'bg-slate-700/20 border border-slate-700/30'}`}
                >
                  <div className="text-xs text-slate-500 mb-0.5">
                    Set {setData.set_number}
                  </div>
                  <div className={`font-mono font-bold text-sm
                    ${isActive ? 'text-blue-300' : 'text-slate-300'}`}>
                    {setData.team_a_score}
                    <span className="text-slate-600 mx-0.5">-</span>
                    {setData.team_b_score}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Scheduled time for upcoming matches */}
      {!isCompleted && !isLive && match.scheduled_time && (
        <div className="mt-2 text-center text-xs text-slate-500">
          {new Date(match.scheduled_time).toLocaleString()}
        </div>
      )}
    </div>
  )
}