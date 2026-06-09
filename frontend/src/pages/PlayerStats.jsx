import { useEffect, useState } from 'react'
import { getPlayerStats } from '../api/client'

export default function PlayerStats() {
  const [stats, setStats]     = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy]   = useState('serve_conversion_rate')
  const [filterTeam, setFilterTeam] = useState('all')

  useEffect(() => {
    getPlayerStats()
      .then(r => setStats(r.data))
      .finally(() => setLoading(false))
  }, [])

  const teams = ['all', ...new Set(stats.map(p => p.team_name))]

  const filtered = stats
    .filter(p => filterTeam === 'all' || p.team_name === filterTeam)
    .filter(p => p.total_serves > 0)
    .sort((a, b) => {
      if (sortBy === 'serve_conversion_rate') {
        return (b.serve_conversion_rate ?? 0) - (a.serve_conversion_rate ?? 0)
      }
      if (sortBy === 'total_serves') {
        return b.total_serves - a.total_serves
      }
      if (sortBy === 'serve_points_won') {
        return b.serve_points_won - a.serve_points_won
      }
      return 0
    })

  const getConversionColor = (rate) => {
    if (rate >= 70) return 'text-green-400'
    if (rate >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConversionBg = (rate) => {
    if (rate >= 70) return 'bg-green-500'
    if (rate >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading player stats...</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Player Stats</h1>

      {/* Top 3 Cards */}
      {filtered.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {filtered.slice(0, 3).map((player, i) => (
            <div key={player.player_id}
              className={`bg-slate-800 rounded-xl border p-4 text-center
                ${i === 0
                  ? 'border-yellow-500/50'
                  : i === 1
                  ? 'border-slate-400/50'
                  : 'border-orange-700/50'}`}
            >
              <div className="text-2xl mb-1">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </div>
              <div className="font-bold text-white text-sm truncate">
                {player.player_name}
              </div>
              <div className="text-xs text-slate-400 mb-2 truncate">
                {player.team_name}
              </div>
              <div className={`text-2xl font-black
                ${getConversionColor(player.serve_conversion_rate)}`}>
                {player.serve_conversion_rate?.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {player.serve_points_won}/{player.total_serves} serves
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <div className="flex gap-1">
            {[
              { key: 'serve_conversion_rate', label: 'Conversion %' },
              { key: 'total_serves',          label: 'Most Serves'  },
              { key: 'serve_points_won',      label: 'Points Won'   },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors
                  ${sortBy === opt.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Team Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Team:</span>
          <div className="flex gap-1 flex-wrap">
            {teams.map(team => (
              <button
                key={team}
                onClick={() => setFilterTeam(team)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize
                  ${filterTeam === team
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {team}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Table */}
      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          No serve data yet — matches need to be played first
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400
                             text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Team</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Position</th>
                <th className="text-center px-4 py-3">Serves</th>
                <th className="text-center px-4 py-3">Won</th>
                <th className="text-center px-4 py-3">Lost</th>
                <th className="text-center px-4 py-3 text-blue-400">Rate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((player, i) => (
                <tr key={player.player_id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30
                             transition-colors">
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {player.player_name}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {player.team_name}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs
                                 hidden md:table-cell max-w-32 truncate">
                    {player.position || '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300
                                 font-mono">
                    {player.total_serves}
                  </td>
                  <td className="px-4 py-3 text-center text-green-400
                                 font-mono">
                    {player.serve_points_won}
                  </td>
                  <td className="px-4 py-3 text-center text-red-400
                                 font-mono">
                    {player.serve_points_lost}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-bold tabular-nums
                        ${getConversionColor(player.serve_conversion_rate)}`}>
                        {player.serve_conversion_rate?.toFixed(1)}%
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all
                            ${getConversionBg(player.serve_conversion_rate)}`}
                          style={{ width: `${player.serve_conversion_rate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-600 text-center">
        Only players with at least 1 serve are shown
      </p>
    </div>
  )
}