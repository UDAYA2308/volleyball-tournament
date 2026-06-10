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
                {/* Always visible */}
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
                {/* Always visible */}
                <th className="text-center px-2 sm:px-4 py-3 w-14
                               text-blue-400">
                  Pts
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
                      {/* Points shown below name on mobile */}
                      <span className="sm:hidden block text-xs
                                       text-blue-400 font-bold mt-0.5">
                        {team.total_points?.toFixed(2)} pts
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

                    {/* Points — hidden on mobile, shown under name */}
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center
                                   font-bold text-blue-400 tabular-nums
                                   text-xs sm:text-sm hidden sm:table-cell">
                      {team.total_points?.toFixed(2)}
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
        <span>Pts = Tournament Points</span>
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