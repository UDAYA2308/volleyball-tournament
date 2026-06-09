import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏐</span>
          <span className="font-bold text-white tracking-tight">
            Volleyball Tournament
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-300 hover:text-white transition-colors">
            Schedule
          </Link>
          <Link to="/leaderboard" className="text-slate-300 hover:text-white transition-colors">
            Standings
          </Link>
          <Link to="/playoffs" className="text-slate-300 hover:text-white transition-colors">
            Playoffs
          </Link>
          <Link to="/teams" className="text-slate-300 hover:text-white transition-colors">
            Teams
          </Link>
          <Link to="/players" className="text-slate-300 hover:text-white transition-colors">
            Players
          </Link>
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <Link
                to="/admin/playoffs"
                className="text-xs bg-slate-700 hover:bg-slate-600
                           text-slate-300 px-2 py-1 rounded-lg transition-colors"
              >
                ⚙️ Manage
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/admin"
              className="bg-blue-600 hover:bg-blue-500 text-white
                         px-3 py-1.5 rounded-lg transition-colors"
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}