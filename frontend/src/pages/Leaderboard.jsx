import { useEffect, useState } from 'react'
import { getLeaderboard } from '../api/client'

const RANK_COLOR = {
  1: 'text-amber-400',
  2: 'text-slate-1',
  3: 'text-orange-400',
}

export default function Leaderboard() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const load = () =>
      getLeaderboard()
        .then(r => setStandings(r.data))
        .finally(() => setLoading(false))
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-slate-300 text-sm">Loading standings...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-white">
        League Standings
      </h1>

      <div className="bg-slate-800 rounded-xl border border-slate-600
                      overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-slate-600 text-slate-300
                             text-xs uppercase tracking-wider">
                <th className="text-left px-3 sm:px-4 py-3 w-8">#</th>
                <th className="text-left px-3 sm:px-4 py-3">Team</th>
                <th className="text-center px-2 sm:px-4 py-3 w-8">P</th>
                <th className="text-center px-2 sm:px-4 py-3 w-8">W</th>
                <th className="text-center px-2 sm:px-4 py-3 w-8">L</th>
                {/* Hidden on mobile */}
                <th className="text-center px-2 sm:px-4 py-3 w-10
                               hidden sm:table-cell">
                  Sets
                </th>
                <th className="text-center px-2 sm:px-4 py-3 w-12
                               hidden md:table-cell">
                  Diff
                </th>
                {/* Match Points — always visible, first */}
                <th className="text-center px-2 sm:px-4 py-3 w-14
                               text-green-400">
                  Pts
                </th>
                {/* Points Rate — after Pts, hidden on mobile */}
                <th className="text-center px-2 sm:px-4 py-3 w-14
                               text-blue-400 hidden sm:table-cell">
                  PR
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, i) => {
                const rank   = i + 1
                const isLast = i === standings.length - 1

                return (
                  <tr
                    key={team.team_id}
                    className={`transition-colors hover:bg-slate-700/50
                      ${!isLast
                        ? 'border-b border-slate-600/50' : ''}`}
                  >
                    {/* Rank */}
                    <td className="px-3 sm:px-4 py-3 sm:py-3.5">
                      <span className={`text-sm font-bold tabular-nums
                        ${RANK_COLOR[rank] ?? 'text-slate-300'}`}>
                        {rank}
                      </span>
                    </td>

                    {/* Team name */}
                    <td className="px-3 sm:px-4 py-3 sm:py-3.5">
                      <span className="font-semibold text-white text-sm
                                       leading-tight">
                        {team.team_name}
                      </span>
                      {/* Match points shown below name on mobile */}
                      <span className="sm:hidden block text-xs
                                       text-green-400 font-bold mt-0.5">
                        {team.points} pts
                      </span>
                    </td>

                    {/* Played */}
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                   text-slate-300 tabular-nums text-xs
                                   sm:text-sm">
                      {team.matches_played}
                    </td>

                    {/* Won */}
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                   text-emerald-400 font-semibold tabular-nums
                                   text-xs sm:text-sm">
                      {team.matches_won}
                    </td>

                    {/* Lost */}
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                   text-red-400 font-semibold tabular-nums
                                   text-xs sm:text-sm">
                      {team.matches_lost}
                    </td>

                    {/* Sets — hidden on mobile */}
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                   text-slate-300 tabular-nums text-xs
                                   sm:text-sm hidden sm:table-cell">
                      {team.sets_won}
                    </td>

                    {/* Diff — hidden on tablet */}
                    <td className={`px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                    font-semibold tabular-nums text-xs
                                    sm:text-sm hidden md:table-cell
                      ${team.total_point_diff > 0 ? 'text-emerald-400'
                      : team.total_point_diff < 0 ? 'text-red-400'
                      : 'text-slate-300'}`}>
                      {team.total_point_diff > 0 ? '+' : ''}
                      {team.total_point_diff}
                    </td>

                    {/* Match Points — always visible */}
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                   font-bold text-green-400 tabular-nums
                                   text-xs sm:text-sm">
                      {team.points}
                    </td>

                    {/* Points Rate — hidden on mobile */}
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                   font-bold text-blue-400 tabular-nums
                                   text-xs sm:text-sm hidden sm:table-cell">
                      {team.points_rate?.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs
                      text-slate-300 px-1">
        <span>P = Played</span>
        <span>W = Won</span>
        <span>L = Lost</span>
        <span className="hidden sm:inline">Sets = Sets Won</span>
        <span className="hidden md:inline">Diff = Point Differential</span>
        <span>Pts = Match Points</span>
        <span className="hidden sm:inline">PR = Points Rate</span>
      </div>

      {/* Scoring explanation */}
      <div className="bg-slate-800/60 border border-slate-600
                      rounded-xl p-4 space-y-4 text-xs sm:text-sm">
        <div className="font-bold text-white text-sm">
          How standings are calculated
        </div>

        {/* Points */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold uppercase
                             tracking-wider text-xs">
              Pts — Match Points
            </span>
          </div>
          <div className="text-slate-300 leading-relaxed">
            Every match result awards match points regardless of score:
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-green-500/10 border border-green-500/20
                            rounded-lg px-3 py-2 text-center">
              <div className="text-green-400 font-black text-lg">2</div>
              <div className="text-slate-300 text-xs">Win (2-0 or 2-1)</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20
                            rounded-lg px-3 py-2 text-center">
              <div className="text-red-400 font-black text-lg">0</div>
              <div className="text-slate-300 text-xs">Loss (0-2 or 1-2)</div>
            </div>
          </div>
          <div className="text-slate-400 text-xs mt-1">
            This is the primary ranking criteria — teams are sorted by
            Pts first.
          </div>
        </div>

        <div className="h-px bg-slate-600/50" />

        {/* Points Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold uppercase
                             tracking-wider text-xs">
              PR — Points Rate
            </span>
          </div>
          <div className="text-slate-300 leading-relaxed">
            Used as a tiebreaker when two teams have equal Pts.
            Rewards dominant wins and penalises heavy losses:
          </div>
          <div className="space-y-1.5 mt-1">
            <div className="bg-slate-700/50 rounded-lg px-3 py-2
                            flex items-center justify-between">
              <span className="text-slate-300">2-0 Win</span>
              <span className="text-green-400 font-mono font-bold">
                +1.5 + (point diff / 10)
              </span>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-3 py-2
                            flex items-center justify-between">
              <span className="text-slate-300">2-1 Win or Loss</span>
              <span className="text-yellow-400 font-mono font-bold">
                point diff / 10
              </span>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-3 py-2
                            flex items-center justify-between">
              <span className="text-slate-300">0-2 Loss</span>
              <span className="text-red-400 font-mono font-bold">
                −1.5 + (point diff / 10)
              </span>
            </div>
          </div>
          <div className="text-slate-400 text-xs mt-1">
            Point diff is the sum of (your score − opponent score) across
            all sets in that match. A team that wins 21-10, 21-12 will
            have a higher PR than one that wins 21-19, 21-19.
          </div>
        </div>

        <div className="h-px bg-slate-600/50" />

        {/* Tiebreaker order */}
        <div className="space-y-1.5">
          <div className="text-white font-bold text-xs uppercase
                          tracking-wider">
            Tiebreaker Order
          </div>
          <div className="space-y-1">
            {[
              { n: '1', label: 'Match Points (Pts)',      color: 'text-green-400' },
              { n: '2', label: 'Points Rate (PR)',         color: 'text-blue-400'  },
            ].map(row => (
              <div key={row.n}
                   className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-slate-700
                                 text-slate-300 font-bold flex items-center
                                 justify-center shrink-0 text-[10px]">
                  {row.n}
                </span>
                <span className={`font-semibold ${row.color}`}>
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Qualifier note */}
      {standings.length >= 4 && (
        <div className="bg-blue-500/10 border border-blue-500/30
                        rounded-xl p-3 sm:p-4 text-xs sm:text-sm
                        text-blue-300">
          🏆 Top 4 teams qualify for playoffs
        </div>
      )}
    </div>
  )
}