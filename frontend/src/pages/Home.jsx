import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSchedule, wsGlobalUrl } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import ScoreCard from '../components/ScoreCard'
import LiveBadge from '../components/LiveBadge'
import { useAuth } from '../context/AuthContext'

const ROUND_ORDER = {
  'FINAL':        1,
  'QUALIFIER 2':  2,
  'ELIMINATOR':   3,
  'QUALIFIER 1':  4,
}

export default function Home() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading]   = useState(true)
  const navigate                = useNavigate()
  const { isAdmin }             = useAuth()
  const { data: wsData }        = useWebSocket(wsGlobalUrl())

  useEffect(() => {
    getSchedule()
      .then(r => setSchedule(r.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!wsData?.data) return
    const liveMatches = Array.isArray(wsData.data)
      ? wsData.data : [wsData.data]
    setSchedule(prev => prev.map(match => {
      const live = liveMatches.find(m => m.match_id === match.match_id)
      if (!live) return match
      return {
        ...match,
        match_status:    live.match_status,
        team_a_sets_won: live.team_a_sets_won,
        team_b_sets_won: live.team_b_sets_won,
      }
    }))
  }, [wsData])

  // Group by round/match type
  const rounds = schedule.reduce((acc, match) => {
    const key = match.match_type === 'league'
      ? `Day ${match.round_number}`
      : match.match_type?.replace('_', ' ').toUpperCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  // Sort — playoffs first (Final at top), then league days
  const sortedRounds = Object.entries(rounds).sort(([a], [b]) => {
    const aIsPlayoff = ROUND_ORDER[a] !== undefined
    const bIsPlayoff = ROUND_ORDER[b] !== undefined

    // Both playoffs — sort by playoff order (Final=1 first)
    if (aIsPlayoff && bIsPlayoff) {
      return ROUND_ORDER[a] - ROUND_ORDER[b]
    }
    // Playoffs come before league
    if (aIsPlayoff) return -1
    if (bIsPlayoff) return 1
    // Both league days — sort numerically
    const aDay = parseInt(a.replace('Day ', ''))
    const bDay = parseInt(b.replace('Day ', ''))
    return aDay - bDay
  })

  const hasLive = schedule.some(m => m.match_status === 'live')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-slate-300 text-sm">Loading schedule...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 sm:space-y-10">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Match Schedule
        </h1>
        {hasLive && <LiveBadge />}
      </div>

      {/* Rounds */}
      {sortedRounds.map(([round, matches]) => {
        const completedCount = matches.filter(
          m => m.match_status === 'completed' || m.status === 'completed'
        ).length
        const liveCount = matches.filter(
          m => m.match_status === 'live' || m.status === 'live'
        ).length
        const isPlayoff = ROUND_ORDER[round] !== undefined

        return (
          <div key={round} className="space-y-3">

            {/* Round header */}
            <div className="flex items-center justify-between
                            border-b border-slate-600 pb-2">
              <h2 className={`text-xs sm:text-sm font-bold uppercase
                              tracking-widest
                ${isPlayoff ? 'text-blue-400' : 'text-white'}`}>
                {round}
              </h2>
              <div className="flex items-center gap-2 sm:gap-3">
                {liveCount > 0 && (
                  <span className="text-xs font-bold text-red-400">
                    {liveCount} live
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-300">
                  {completedCount}/{matches.length} played
                </span>
              </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matches.map(match => (
                <ScoreCard
                  key={match.id}
                  match={match}
                  onClick={() => {
                    if (!match.match_id) return
                    if (isAdmin) {
                      navigate(`/admin/match/${match.match_id}`)
                    } else {
                      navigate(`/match/${match.match_id}`)
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}