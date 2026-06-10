import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const { login, isAdmin }      = useAuth()
  const navigate                = useNavigate()

  if (isAdmin) {
    return (
      <div className="max-w-sm mx-auto mt-16 sm:mt-20 text-center
                      space-y-4 px-4 sm:px-0">
        <div className="text-green-400 text-base sm:text-lg font-semibold">
          ✅ Admin access active
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold
                     px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          Go to Schedule
        </button>
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (login(password)) {
      navigate('/')
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 sm:mt-20 px-4 sm:px-0">
      <div className="bg-theme-card rounded-2xl border border-theme
                      p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-lg sm:text-xl font-bold text-theme-primary
                         mb-2">
            Admin Access
          </h1>
          <p className="text-sm text-theme-secondary">
            Enter the admin password to manage matches
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-theme-input border border-theme
                       rounded-lg px-4 py-3 text-theme-primary text-sm
                       placeholder:text-theme-secondary focus:outline-none
                       focus:border-blue-500 transition-colors"
          />
          {error && (
            <p className="text-red-400 text-sm text-center font-semibold">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white
                       font-bold py-3 rounded-lg transition-colors
                       text-sm sm:text-base"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}