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
      <div className="max-w-sm mx-auto mt-20 text-center space-y-4">
        <div className="text-green-400 text-lg font-semibold">
          ✅ Admin access active
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-500 text-white
                     px-6 py-2 rounded-lg transition-colors"
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
    <div className="max-w-sm mx-auto mt-20">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
        <h1 className="text-xl font-bold text-white mb-2 text-center">
          Admin Access
        </h1>
        <p className="text-slate-400 text-sm text-center mb-6">
          Enter the admin password to manage matches
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-slate-700 border border-slate-600
                       rounded-lg px-4 py-3 text-white placeholder-slate-400
                       focus:outline-none focus:border-blue-500 transition-colors"
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white
                       font-semibold py-3 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}