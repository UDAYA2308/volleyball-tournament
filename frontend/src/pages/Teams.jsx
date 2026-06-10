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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-sm text-theme-secondary">
          Loading teams...
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-theme-primary">
        Teams
      </h1>

      <div className="space-y-3">
        {teams.map(team => {
          const standing = getStanding(team.id)
          const isOpen   = expanded === team.id
          const players  = rosters[team.id] || []

          return (
            <div
              key={team.id}
              className={`bg-theme-card rounded-xl border transition-all
                ${isOpen
                  ? 'border-blue-500/70'
                  : 'border-theme'}`}
            >
              {/* Team Header */}
              <button
                onClick={() => handleExpand(team.id)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4
                           flex items-center justify-between
                           rounded-xl transition-colors hover-theme"
              >
                {/* Left — name + count */}
                <div className="flex items-center gap-2 sm:gap-3
                                min-w-0">
                  <span className="font-bold text-base sm:text-lg
                                   truncate text-theme-primary">
                    {team.name}
                  </span>
                  <span className="text-xs font-semibold shrink-0
                                   text-theme-secondary">
                    {team.player_count} players
                  </span>
                </div>

                {/* Right — record + chevron */}
                <div className="flex items-center gap-2 sm:gap-4
                                shrink-0 ml-2">
                  {standing && (
                    <div className="flex items-center gap-2 sm:gap-3
                                    text-xs sm:text-sm">
                      <span className="text-theme-secondary">
                        P:{' '}
                        <span className="font-mono font-bold
                                         text-theme-primary">
                          {standing.matches_played}
                        </span>
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        W:{' '}
                        <span className="font-mono">
                          {standing.matches_won}
                        </span>
                      </span>
                      <span className="text-red-400 font-semibold">
                        L:{' '}
                        <span className="font-mono">
                          {standing.matches_lost}
                        </span>
                      </span>
                      <span className="text-green-400 font-bold
                                       hidden sm:inline">
                        {standing.points} pts
                      </span>
                    </div>
                  )}
                  <span className="text-base sm:text-lg
                                   text-theme-secondary">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Mobile pts row */}
              {standing && !isOpen && (
                <div className="sm:hidden px-3 pb-2.5 flex items-center
                                gap-3 text-xs">
                  <span className="text-green-400 font-bold">
                    {standing.points} pts
                  </span>
                </div>
              )}

              {/* Roster */}
              {isOpen && (
                <div className="border-t border-theme px-3 sm:px-4
                                py-3 sm:py-4">
                  {players.length === 0 ? (
                    <div className="text-sm text-center py-4
                                    animate-pulse text-theme-secondary">
                      Loading roster...
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {/* Column headers */}
                      <div className="grid grid-cols-12 text-xs
                                      text-theme-secondary font-bold
                                      uppercase tracking-wider pb-2
                                      border-b border-theme">
                        <div className="col-span-5 sm:col-span-4">
                          Player
                        </div>
                        <div className="col-span-4 hidden sm:block">
                          Position
                        </div>
                        <div className="col-span-4 sm:col-span-3">
                          Experience
                        </div>
                        <div className="col-span-3 sm:col-span-1
                                        text-right sm:text-left">
                          Gender
                        </div>
                      </div>

                      {/* Player rows */}
                      {players.map(player => (
                        <div
                          key={player.id}
                          className="grid grid-cols-12 items-center
                                     py-2 sm:py-2.5 border-b border-theme
                                     px-1 rounded-lg transition-colors
                                     hover-theme"
                        >
                          {/* Name + captain badge */}
                          <div className="col-span-5 sm:col-span-4
                                          flex items-center gap-1.5
                                          min-w-0 pr-2">
                            <span className="font-semibold truncate
                                             text-xs sm:text-sm
                                             text-theme-primary">
                              {player.name}
                            </span>
                            {player.captain_willing === 1 && (
                              <span className="shrink-0 text-[9px]
                                               sm:text-[10px] font-bold
                                               bg-amber-500/20 text-amber-400
                                               border border-amber-500/40
                                               px-1 py-0.5 rounded">
                                C
                              </span>
                            )}
                          </div>

                          {/* Position — hidden on mobile */}
                          <div className="col-span-4 hidden sm:block
                                          text-xs truncate pr-2
                                          text-theme-primary">
                            {player.position || '—'}
                          </div>

                          {/* Experience */}
                          <div className={`col-span-4 sm:col-span-3
                                           text-xs font-semibold truncate
                            ${EXPERIENCE_COLOR[player.experience]
                              ?? 'text-theme-secondary'}`}>
                            <span className="hidden sm:inline">
                              {EXPERIENCE_LABEL[player.experience]
                                ?? player.experience ?? '—'}
                            </span>
                            <span className="sm:hidden">
                              {player.experience === 'Yes, experienced'
                                ? 'Exp'
                                : player.experience === 'Yes, casually'
                                ? 'Casual'
                                : player.experience === 'Beginner'
                                ? 'Beg'
                                : '—'}
                            </span>
                          </div>

                          {/* Gender */}
                          <div className="col-span-3 sm:col-span-1
                                          text-xs font-medium text-right
                                          sm:text-left text-theme-secondary">
                            {player.gender
                              ? player.gender.charAt(0).toUpperCase()
                              : '—'}
                          </div>
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