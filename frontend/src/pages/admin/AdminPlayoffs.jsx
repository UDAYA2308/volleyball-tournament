import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

export default function AdminPlayoffs() {
  const [status, setStatus]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage]       = useState(null)
  const navigate                    = useNavigate()

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
      setTimeout(() => navigate('/playoffs'), 1500)
    } catch (e) {
      flash(e.response?.data?.detail || 'Error generating playoffs', 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500
                        border-t-transparent animate-spin" />
        <p className="text-sm text-theme-secondary">Loading...</p>
      </div>
    </div>
  )

  const allDone   = status?.league_matches_done === status?.league_matches_total
  const remaining = (status?.league_matches_total ?? 0) -
                    (status?.league_matches_done ?? 0)

  return (
    <div className="space-y-6 max-w-sm mx-auto mt-6 sm:mt-10
                    px-4 sm:px-0">
      <h1 className="text-xl sm:text-2xl font-bold text-center
                     text-theme-primary">
        Generate Playoffs
      </h1>

      {/* Flash */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold
                         text-center border
          ${message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border-green-500/40'
            : 'bg-red-500/20 text-red-400 border-red-500/40'}`}>
          {message.msg}
        </div>
      )}

      {/* Already in playoffs */}
      {status?.stage !== 'league' && (
        <div className="bg-blue-500/10 border border-blue-500/30
                        rounded-xl p-5 sm:p-6 text-center space-y-3">
          <div className="text-3xl">🏆</div>
          <div className="font-bold text-base sm:text-lg text-theme-primary">
            Playoffs already generated
          </div>
          <div className="text-sm capitalize text-theme-secondary">
            Current stage:{' '}
            <span className="font-semibold text-theme-primary">
              {status?.stage}
            </span>
          </div>
          <button
            onClick={() => navigate('/playoffs')}
            className="bg-blue-600 hover:bg-blue-500 text-white
                       px-6 py-2 rounded-lg transition-colors text-sm
                       font-semibold"
          >
            View Bracket →
          </button>
        </div>
      )}

      {/* League stage */}
      {status?.stage === 'league' && (
        <div className="bg-theme-card rounded-xl border border-theme
                        p-4 sm:p-6 space-y-4">
          {/* Progress */}
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-black tabular-nums
                            text-theme-primary">
              {status?.league_matches_done}
              <span className="text-theme-secondary mx-1">/</span>
              {status?.league_matches_total}
            </div>
            <div className="text-sm font-semibold mt-1 text-theme-secondary">
              league matches completed
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-theme-input rounded-full h-3">
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
                            rounded-lg p-3 text-sm font-semibold
                            text-yellow-400 text-center">
              ⚠️{' '}
              <span className="text-theme-primary">
                {remaining} match{remaining !== 1 ? 'es' : ''}
              </span>
              {' '}remaining before playoffs can be generated
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30
                            rounded-lg p-3 text-sm font-semibold
                            text-green-400 text-center">
              ✅ All league matches complete — ready to generate playoffs
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !allDone}
            className="w-full bg-blue-600 hover:bg-blue-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-bold py-4 rounded-xl text-lg
                       transition-colors"
          >
            {generating ? 'Generating...' : '🏆 Generate Playoffs'}
          </button>
        </div>
      )}

      {/* Link to bracket */}
      <button
        onClick={() => navigate('/playoffs')}
        className="w-full text-center text-sm font-semibold rounded-xl
                   py-2 border border-theme transition-colors
                   text-theme-secondary hover:text-theme-primary
                   hover-theme"
      >
        View public bracket →
      </button>
    </div>
  )
}