import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

export default function AdminPlayoffs() {
  const [status, setStatus]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage]     = useState(null)
  const navigate                  = useNavigate()

  const loadStatus = () =>
    api.get('/playoffs/status')
      .then(r => setStatus(r.data))
      .finally(() => setLoading(false))

  useEffect(() => { loadStatus() }, [])

  const flash = (msg, type = 'info') => {
    setMessage({ msg, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleGenerate = async () => {
    if (!confirm(
      'Generate playoffs from current standings? This cannot be undone.'
    )) return
    try {
      setGenerating(true)
      const r = await api.post('/playoffs/generate')
      flash(`✅ ${r.data.message}`, 'success')
      await loadStatus()
      // Redirect to public bracket after generation
      setTimeout(() => navigate('/playoffs'), 1500)
    } catch (e) {
      flash(e.response?.data?.detail || 'Error generating playoffs', 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading...</div>
    </div>
  )

  const allDone = status?.league_matches_done === status?.league_matches_total
  const remaining = (status?.league_matches_total ?? 0) -
                    (status?.league_matches_done ?? 0)

  return (
    <div className="space-y-6 max-w-sm mx-auto mt-10">
      <h1 className="text-2xl font-bold text-white text-center">
        Generate Playoffs
      </h1>

      {/* Flash */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium text-center
          ${message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {message.msg}
        </div>
      )}

      {/* Already in playoffs */}
      {status?.stage !== 'league' && (
        <div className="bg-blue-500/10 border border-blue-500/30
                        rounded-xl p-6 text-center space-y-3">
          <div className="text-3xl">🏆</div>
          <div className="text-white font-bold">
            Playoffs already generated
          </div>
          <div className="text-slate-400 text-sm capitalize">
            Current stage: {status?.stage}
          </div>
          <button
            onClick={() => navigate('/playoffs')}
            className="bg-blue-600 hover:bg-blue-500 text-white
                       px-6 py-2 rounded-lg transition-colors text-sm"
          >
            View Bracket →
          </button>
        </div>
      )}

      {/* League stage */}
      {status?.stage === 'league' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6
                        space-y-4">

          {/* Progress */}
          <div className="text-center">
            <div className="text-4xl font-black text-white tabular-nums">
              {status?.league_matches_done}
              <span className="text-slate-600 mx-1">/</span>
              {status?.league_matches_total}
            </div>
            <div className="text-slate-400 text-sm mt-1">
              league matches completed
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{
                width: `${((status?.league_matches_done ?? 0) /
                          (status?.league_matches_total ?? 1)) * 100}%`
              }}
            />
          </div>

          {/* Status message */}
          {!allDone ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30
                            rounded-lg p-3 text-sm text-yellow-400 text-center">
              ⚠️ {remaining} match{remaining !== 1 ? 'es' : ''} remaining
              before playoffs can be generated
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30
                            rounded-lg p-3 text-sm text-green-400 text-center">
              ✅ All league matches complete — ready to generate playoffs
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !allDone}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                       disabled:cursor-not-allowed text-white font-bold
                       py-4 rounded-xl text-lg transition-colors"
          >
            {generating ? 'Generating...' : '🏆 Generate Playoffs'}
          </button>
        </div>
      )}

      {/* Link to bracket */}
      <button
        onClick={() => navigate('/playoffs')}
        className="w-full text-center text-sm text-slate-400
                   hover:text-slate-300 transition-colors py-2"
      >
        View public bracket →
      </button>
    </div>
  )
}