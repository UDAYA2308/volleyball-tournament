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
      <div className="text-slate-400 animate-pulse">Loading history...</div>
    </div>
  )
  if (!history) return (
    <div className="text-center text-slate-400 py-20">No history found</div>
  )

  const teamAName = match?.team_a_name
  const teamBName = match?.team_b_name

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Rally History</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {teamAName} vs {teamBName}
          </p>
        </div>
        <Link
          to={`/match/${id}`}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← Back
        </Link>
      </div>

      {/* Summary */}
<div className="grid grid-cols-2 gap-3">
  <div className="bg-slate-800 border border-slate-700 rounded-xl
                  p-3 text-center">
    <div className="text-2xl font-black text-white">
      {history.total_rallies}
    </div>
    <div className="text-xs text-slate-400 mt-0.5">Total Rallies</div>
  </div>
  <div className="bg-slate-800 border border-slate-700 rounded-xl
                  p-3 text-center">
    <div className="text-2xl font-black text-white">
      {history.sets.length}
    </div>
    <div className="text-xs text-slate-400 mt-0.5">Sets Played</div>
  </div>
</div>

      {/* Sets */}
      {history.sets.map(set => {
        // Build running score for each rally
        let scoreA = 0
        let scoreB = 0
        const ralliesWithScore = set.rallies.map(rally => {
          if (rally.point_won_by === teamAName) scoreA++
          else scoreB++
          return { ...rally, runningA: scoreA, runningB: scoreB }
        })

        const finalA = ralliesWithScore[ralliesWithScore.length - 1]?.runningA ?? 0
        const finalB = ralliesWithScore[ralliesWithScore.length - 1]?.runningB ?? 0
        const setWinner = finalA > finalB ? teamAName : teamBName

        return (
          <div key={set.set_number}
            className="bg-slate-800 rounded-xl border border-slate-700
                       overflow-hidden">

            {/* Set Header */}
            <div className="px-4 py-3 border-b border-slate-700
                            flex items-center justify-between
                            bg-slate-700/40">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">
                  Set {set.set_number}
                </span>
                <span className="text-xs text-slate-400">
                  {set.rallies.length} rallies
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-white text-lg">
                  {finalA} – {finalB}
                </span>
                <span className="text-xs text-yellow-400 font-medium">
                  {setWinner} won
                </span>
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 px-4 py-2 text-xs
                            text-slate-500 uppercase tracking-wider
                            border-b border-slate-700/50">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Server</div>
              <div className="col-span-4">Point Won By</div>
              <div className="col-span-4 text-center">Score</div>
            </div>

            {/* Rallies */}
            <div className="divide-y divide-slate-700/30">
              {ralliesWithScore.map((rally, idx) => {
                const isTeamA     = rally.point_won_by === teamAName
                const isSetPoint  = rally.resulted_in_set_completion === 1
                const isMatchPoint = rally.resulted_in_match_completion === 1
                const isHighlight = isSetPoint || isMatchPoint

                return (
                  <div
                    key={rally.rally_sequence}
                    className={`grid grid-cols-12 items-center px-4 py-2.5
                      text-sm transition-colors
                      ${isMatchPoint
                        ? 'bg-yellow-500/10 border-l-2 border-yellow-500'
                        : isSetPoint
                        ? 'bg-green-500/10 border-l-2 border-green-500'
                        : idx % 2 === 0
                        ? 'bg-transparent'
                        : 'bg-slate-700/10'
                      }`}
                  >
                    {/* Rally number */}
                    <div className="col-span-1 text-slate-600 text-xs
                                    tabular-nums">
                      {rally.rally_sequence}
                    </div>

                    {/* Server */}
                    <div className="col-span-3 text-slate-400 text-xs
                                    truncate pr-1">
                      🏐 {rally.server_name.split(' ')[0]}
                    </div>

                    {/* Point won by */}
                    <div className="col-span-4">
                      <span className={`font-semibold text-xs px-2 py-0.5
                                        rounded-full
                        ${isTeamA
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-orange-500/20 text-orange-300'}`}>
                        {rally.point_won_by}
                      </span>
                    </div>

                    {/* Running score */}
                    <div className="col-span-4 flex items-center
                                    justify-center gap-1">
                      <span className={`tabular-nums font-bold text-sm w-6
                                        text-right
                        ${isTeamA ? 'text-blue-400' : 'text-slate-300'}`}>
                        {rally.runningA}
                      </span>
                      <span className="text-slate-600 text-xs">–</span>
                      <span className={`tabular-nums font-bold text-sm w-6
                                        text-left
                        ${!isTeamA ? 'text-orange-400' : 'text-slate-300'}`}>
                        {rally.runningB}
                      </span>
                      {isHighlight && (
                        <span className={`ml-1 text-xs font-bold
                          ${isMatchPoint ? 'text-yellow-400' : 'text-green-400'}`}>
                          {isMatchPoint ? '🏆' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Set footer */}
            <div className="px-4 py-3 border-t border-slate-700/50
                            bg-slate-700/20 flex justify-between
                            text-xs text-slate-400">
              <span>
                {teamAName}: {ralliesWithScore.filter(
                  r => r.point_won_by === teamAName
                ).length} pts
              </span>
              <span className="text-yellow-400 font-medium">
                🏆 {setWinner}
              </span>
              <span>
                {teamBName}: {ralliesWithScore.filter(
                  r => r.point_won_by === teamBName
                ).length} pts
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}