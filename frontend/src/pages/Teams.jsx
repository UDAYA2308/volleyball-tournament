import { useEffect, useState } from 'react'
import { getTeams, getTeam, getLeaderboard } from '../api/client'

const EXPERIENCE_COLOR = {
  'Yes, experienced': 'text-green-400',
  'Yes, casually':    'text-blue-400',
  'Beginner':         'text-yellow-400',
}

const EXPERIENCE_LABEL = {
  'Yes, experienced': 'Experienced',
  'Yes, casually':    'Casual',
  'Beginner':         'Beginner',
}

export default function Teams() {
  const [teams, setTeams]         = useState([])
  const [standings, setStandings] = useState([])
  const [expanded, setExpanded]   = useState(null)
  const [rosters, setRosters]     = useState({})
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([getTeams(), getLeaderboard()])
      .then(([t, s]) => {
        setTeams(t.data)
        setStandings(s.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleExpand = async (teamId) => {
    if (expanded === teamId) {
      setExpanded(null)
      return
    }
    setExpanded(teamId)
    if (!rosters[teamId]) {
      const r = await getTeam(teamId)
      setRosters(prev => ({ ...prev, [teamId]: r.data.players }))
    }
  }

  const getStanding = (teamId) =>
    standings.find(s => s.team_id === teamId)

  const getRank = (teamId) => {
    const idx = standings.findIndex(s => s.team_id === teamId)
    return idx === -1 ? null : idx + 1
  }

  const RANK_BADGE = {
    1: { label: '🥇 Rank 1', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    2: { label: '🥈 Rank 2', cls: 'bg-slate-400/20 text-slate-300 border-slate-400/30' },
    3: { label: '🥉 Rank 3', cls: 'bg-orange-700/20 text-orange-400 border-orange-700/30' },
    4: { label: '✅ Rank 4', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    5: { label: '❌ Rank 5', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading teams...</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Teams</h1>

      <div className="space-y-3">
        {teams.map(team => {
          const standing = getStanding(team.id)
          const rank     = getRank(team.id)
          const badge    = RANK_BADGE[rank]
          const isOpen   = expanded === team.id
          const players  = rosters[team.id] || []

          return (
            <div key={team.id}
              className={`bg-slate-800 rounded-xl border transition-all
                ${isOpen ? 'border-blue-500/50' : 'border-slate-700'}`}
            >
              {/* Team Header */}
              <button
                onClick={() => handleExpand(team.id)}
                className="w-full px-4 py-4 flex items-center justify-between
                           hover:bg-slate-700/30 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  {badge && (
                    <span className={`text-xs font-semibold px-2 py-1
                                      rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                  <span className="font-bold text-white text-lg">
                    {team.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {team.player_count} players
                  </span>
                </div>

                {/* Match record */}
                <div className="flex items-center gap-4">
                  {standing && (
                    <div className="hidden sm:flex items-center gap-3 text-sm">
                      <span className="text-slate-400">
                        P: <span className="text-white font-mono">
                          {standing.matches_played}
                        </span>
                      </span>
                      <span className="text-green-400">
                        W: <span className="font-mono">
                          {standing.matches_won}
                        </span>
                      </span>
                      <span className="text-red-400">
                        L: <span className="font-mono">
                          {standing.matches_lost}
                        </span>
                      </span>
                      <span className="text-blue-400 font-bold">
                        {standing.total_points?.toFixed(2)} pts
                      </span>
                    </div>
                  )}
                  <span className="text-slate-400 text-lg">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Mobile stats row */}
              {standing && (
                <div className="sm:hidden px-4 pb-3 flex gap-4 text-sm">
                  <span className="text-slate-400">
                    P: <span className="text-white font-mono">
                      {standing.matches_played}
                    </span>
                  </span>
                  <span className="text-green-400">
                    W: <span className="font-mono">{standing.matches_won}</span>
                  </span>
                  <span className="text-red-400">
                    L: <span className="font-mono">{standing.matches_lost}</span>
                  </span>
                  <span className="text-blue-400 font-bold">
                    {standing.total_points?.toFixed(2)} pts
                  </span>
                </div>
              )}

              {/* Roster */}
              {isOpen && (
                <div className="border-t border-slate-700 px-4 py-4">
                  {players.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-4
                                    animate-pulse">
                      Loading roster...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 text-xs text-slate-500
                                      uppercase tracking-wider pb-2
                                      border-b border-slate-700/50">
                        <span>Player</span>
                        <span className="hidden sm:block">Position</span>
                        <span>Experience</span>
                        <span>Gender</span>
                      </div>
                      {players.map(player => (
                        <div key={player.id}
                          className="grid grid-cols-4 items-center py-2
                                     border-b border-slate-700/30 text-sm
                                     hover:bg-slate-700/20 rounded-lg px-1
                                     transition-colors">
                          <span className="text-white font-medium truncate pr-2">
                            {player.name}
                          </span>
                          <span className="hidden sm:block text-slate-400
                                           text-xs truncate pr-2">
                            {player.position || '—'}
                          </span>
                          <span className={`text-xs font-medium
                            ${EXPERIENCE_COLOR[player.experience]
                              ?? 'text-slate-400'}`}>
                            {EXPERIENCE_LABEL[player.experience]
                              ?? player.experience ?? '—'}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {player.gender || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}