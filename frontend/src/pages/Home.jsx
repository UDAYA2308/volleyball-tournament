import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSchedule } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import { wsGlobalUrl } from '../api/client'
import ScoreCard from '../components/ScoreCard'
import LiveBadge from '../components/LiveBadge'
import { useAuth } from '../context/AuthContext'

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
    const liveMatches = Array.isArray(wsData.data) ? wsData.data : [wsData.data]
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

  const rounds = schedule.reduce((acc, match) => {
    const key = match.match_type === 'league'
      ? `Round ${match.round_number}`
      : match.match_type?.replace('_', ' ').toUpperCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading schedule...</div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Match Schedule</h1>
        {schedule.some(m => m.match_status === 'live') && <LiveBadge />}
      </div>

      {Object.entries(rounds).map(([round, matches]) => (
        <div key={round}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase
                         tracking-wider mb-3">
            {round}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
      ))}
    </div>
  )
}