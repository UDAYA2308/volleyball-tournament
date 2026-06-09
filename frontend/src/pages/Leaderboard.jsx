import { useEffect, useState } from 'react'
import { getLeaderboard } from '../api/client'

const MEDAL = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const load = () =>
      getLeaderboard()
        .then(r => setStandings(r.data))
        .finally(() => setLoading(false))
    load()
    // Poll every 30 seconds
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading standings...</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">League Standings</h1>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Team</th>
              <th className="text-center px-4 py-3">P</th>
              <th className="text-center px-4 py-3">W</th>
              <th className="text-center px-4 py-3">L</th>
              <th className="text-center px-4 py-3">Sets</th>
              <th className="text-center px-4 py-3">Diff</th>
              <th className="text-center px-4 py-3 text-blue-400">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, i) => (
              <tr
                key={team.team_id}
                className={`border-b border-slate-700/50 transition-colors
                  ${i < 4 ? 'hover:bg-slate-700/50' : 'opacity-60 hover:bg-slate-700/30'}`}
              >
                <td className="px-4 py-3 text-lg">
                  {MEDAL[i] ?? <span className="text-slate-500 text-sm">{i + 1}</span>}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {team.team_name}
                  {i === 3 && (
                    <span className="ml-2 text-xs text-slate-500 font-normal">
                      last playoff spot
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-slate-300">
                  {team.matches_played}
                </td>
                <td className="px-4 py-3 text-center text-green-400">
                  {team.matches_won}
                </td>
                <td className="px-4 py-3 text-center text-red-400">
                  {team.matches_lost}
                </td>
                <td className="px-4 py-3 text-center text-slate-300">
                  {team.sets_won}
                </td>
                <td className={`px-4 py-3 text-center font-mono
                  ${team.total_point_diff > 0
                    ? 'text-green-400'
                    : team.total_point_diff < 0
                    ? 'text-red-400'
                    : 'text-slate-400'}`}>
                  {team.total_point_diff > 0 ? '+' : ''}{team.total_point_diff}
                </td>
                <td className="px-4 py-3 text-center font-bold text-blue-400">
                  {team.total_points?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 text-xs text-slate-500">
        <span>P = Played</span>
        <span>W = Won</span>
        <span>L = Lost</span>
        <span>Pts = Tournament Points</span>
      </div>

      {standings.length >= 4 && (
        <div className="bg-blue-500/10 border border-blue-500/30
                        rounded-xl p-4 text-sm text-blue-300">
          🏆 Top 4 teams qualify for playoffs
        </div>
      )}
    </div>
  )
}