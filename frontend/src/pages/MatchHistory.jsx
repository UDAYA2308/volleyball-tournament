import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMatchHistory, getMatch } from '../api/client'

export default function MatchHistory() {
  const { id }                = useParams()
  const [history, setHistory] = useState(null)
  const [match, setMatch]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMatchHistory(id), getMatch(id)])
      .then(([h, m]) => {
        setHistory(h.data)
        setMatch(m.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-sm text-theme-secondary">
          Loading history...
        </p>
      </div>
    </div>
  )

  if (!history) return (
    <div className="text-center py-20 text-theme-secondary">
      No history found
    </div>
  )

  const teamAName = match?.team_a_name
  const teamBName = match?.team_b_name

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-theme-primary">
            Rally History
          </h1>
          <p className="text-sm mt-0.5 text-theme-secondary">
            {teamAName} vs {teamBName}
          </p>
        </div>
        <Link
          to={`/match/${id}`}
          className="text-sm text-blue-400 hover:text-blue-300
                     transition-colors font-semibold shrink-0 ml-4"
        >
          ← Back
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-theme-card rounded-xl border border-theme
                        p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black
                          text-theme-primary">
            {history.total_rallies}
          </div>
          <div className="text-xs font-semibold mt-0.5
                          text-theme-secondary">
            Total Rallies
          </div>
        </div>
        <div className="bg-theme-card rounded-xl border border-theme
                        p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black
                          text-theme-primary">
            {history.sets.length}
          </div>
          <div className="text-xs font-semibold mt-0.5
                          text-theme-secondary">
            Sets Played
          </div>
        </div>
      </div>

      {/* Sets */}
      {history.sets.map(set => {
        let scoreA = 0
        let scoreB = 0
        const ralliesWithScore = set.rallies.map(rally => {
          if (rally.point_won_by === teamAName) scoreA++
          else scoreB++
          return { ...rally, runningA: scoreA, runningB: scoreB }
        })

        const finalA    = ralliesWithScore[ralliesWithScore.length - 1]?.runningA ?? 0
        const finalB    = ralliesWithScore[ralliesWithScore.length - 1]?.runningB ?? 0
        const setWinner = finalA > finalB ? teamAName : teamBName

        return (
          <div
            key={set.set_number}
            className="bg-theme-card rounded-xl border border-theme
                       overflow-hidden"
          >
            {/* Set Header */}
            <div className="px-3 sm:px-4 py-3 border-b border-theme
                            flex items-center justify-between
                            bg-theme-input">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-bold text-sm sm:text-base
                                 text-theme-primary">
                  Set {set.set_number}
                </span>
                <span className="text-xs font-semibold
                                 text-theme-secondary">
                  {set.rallies.length} rallies
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-mono font-black text-base sm:text-lg
                                 text-theme-primary">
                  {finalA} – {finalB}
                </span>
                <span className="text-xs text-yellow-400 font-bold
                                 hidden sm:inline">
                  {setWinner} won
                </span>
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 px-3 sm:px-4 py-2 text-xs
                            text-theme-secondary font-bold uppercase
                            tracking-wider border-b border-theme">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Server</div>
              <div className="col-span-4">Won By</div>
              <div className="col-span-4 text-center">Score</div>
            </div>

            {/* Rallies */}
            <div>
              {ralliesWithScore.map((rally, idx) => {
                const isTeamA      = rally.point_won_by === teamAName
                const isSetPoint   = rally.resulted_in_set_completion === 1
                const isMatchPoint = rally.resulted_in_match_completion === 1

                return (
                  <div
                    key={rally.rally_sequence}
                    className={`grid grid-cols-12 items-center
                      px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm
                      border-b border-theme transition-colors
                      ${isMatchPoint
                        ? 'bg-yellow-500/10 border-l-2 border-yellow-500'
                        : isSetPoint
                        ? 'bg-green-500/10 border-l-2 border-green-500'
                        : idx % 2 === 0
                        ? 'bg-transparent'
                        : 'bg-theme-input'
                      }`}
                  >
                    {/* Rally number */}
                    <div className="col-span-1 text-theme-secondary
                                    tabular-nums font-semibold">
                      {rally.rally_sequence}
                    </div>

                    {/* Server */}
                    <div className="col-span-3 text-theme-secondary
                                    truncate pr-1 font-medium">
                      🏐{' '}
                      <span className="hidden sm:inline">
                        {rally.server_name.split(' ')[0]}
                      </span>
                      <span className="sm:hidden">
                        {rally.server_name.split(' ')[0].slice(0, 6)}
                      </span>
                    </div>

                    {/* Point won by */}
                    <div className="col-span-4">
                      <span className={`font-semibold text-xs px-1.5
                                        sm:px-2 py-0.5 rounded-full
                        ${isTeamA
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-orange-500/20 text-orange-400'}`}>
                        <span className="hidden sm:inline">
                          {rally.point_won_by}
                        </span>
                        <span className="sm:hidden">
                          {rally.point_won_by?.split(' ').pop()}
                        </span>
                      </span>
                    </div>

                    {/* Running score */}
                    <div className="col-span-4 flex items-center
                                    justify-center gap-0.5 sm:gap-1">
                      <span className={`tabular-nums font-bold
                                        w-5 sm:w-6 text-right
                        ${isTeamA
                          ? 'text-blue-400'
                          : 'text-theme-primary'}`}>
                        {rally.runningA}
                      </span>
                      <span className="text-theme-secondary text-xs">
                        –
                      </span>
                      <span className={`tabular-nums font-bold
                                        w-5 sm:w-6 text-left
                        ${!isTeamA
                          ? 'text-orange-400'
                          : 'text-theme-primary'}`}>
                        {rally.runningB}
                      </span>
                      {(isSetPoint || isMatchPoint) && (
                        <span className={`ml-0.5 sm:ml-1 text-xs font-bold
                          ${isMatchPoint
                            ? 'text-yellow-400'
                            : 'text-green-400'}`}>
                          {isMatchPoint ? '🏆' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Set footer */}
            <div className="px-3 sm:px-4 py-3 border-t border-theme
                            bg-theme-input flex justify-between
                            text-xs font-semibold text-theme-secondary">
              <span>
                <span className="hidden sm:inline">{teamAName}: </span>
                <span className="sm:hidden">A: </span>
                <span className="font-bold text-theme-primary">
                  {ralliesWithScore.filter(
                    r => r.point_won_by === teamAName
                  ).length}
                </span>
                {' '}pts
              </span>
              <span className="text-yellow-400 font-bold">
                🏆{' '}
                <span className="hidden sm:inline">{setWinner}</span>
                <span className="sm:hidden">
                  {setWinner?.split(' ').pop()}
                </span>
              </span>
              <span>
                <span className="hidden sm:inline">{teamBName}: </span>
                <span className="sm:hidden">B: </span>
                <span className="font-bold text-theme-primary">
                  {ralliesWithScore.filter(
                    r => r.point_won_by === teamBName
                  ).length}
                </span>
                {' '}pts
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}