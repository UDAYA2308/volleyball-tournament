import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { isAdmin, logout } = useAuth()
  const navigate            = useNavigate()
  const location            = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const navLinks = [
    { to: '/',            label: 'Schedule'  },
    { to: '/leaderboard', label: 'Standings' },
    { to: '/playoffs',    label: 'Playoffs'  },
    { to: '/teams',       label: 'Teams'     },
    { to: '/players',     label: 'Players'   },
  ]

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path)

  return (
    <nav className="bg-slate-800 border-b border-slate-600
                    sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center
                      justify-between">

        {/* Logo */}
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="text-2xl">🏐</span>
          <span className="font-bold text-white tracking-tight
                           text-sm sm:text-base">
            Volleyball
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-medium transition-colors
                ${isActive(link.to)
                  ? 'text-white'
                  : 'text-slate-300 hover:text-white'}`}
            >
              {link.label}
            </Link>
          ))}

          {isAdmin ? (
            <div className="flex items-center gap-3">
              <Link
                to="/admin/playoffs"
                className="text-xs bg-slate-700 hover:bg-slate-600
                           text-slate-300 hover:text-white px-2 py-1
                           rounded-lg transition-colors font-semibold"
              >
                ⚙️ Manage
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300
                           transition-colors font-semibold text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/admin"
              className="bg-blue-600 hover:bg-blue-500 text-white
                         px-3 py-1.5 rounded-lg transition-colors
                         font-semibold text-xs"
            >
              Admin
            </Link>
          )}
        </div>

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-2">
          {isAdmin && (
            <span className="text-xs bg-blue-600 text-white
                             px-2 py-1 rounded-lg font-semibold">
              Admin
            </span>
          )}
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="text-slate-300 hover:text-white transition-colors
                       p-1.5 rounded-lg hover:bg-slate-700"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-600
                        bg-slate-800 px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm
                          font-medium transition-colors
                ${isActive(link.to)
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-2 border-t border-slate-600/50 mt-2">
            {isAdmin ? (
              <div className="space-y-1">
                <Link
                  to="/admin/playoffs"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm
                             font-semibold text-slate-300
                             hover:text-white hover:bg-slate-700/50
                             transition-colors"
                >
                  ⚙️ Manage Playoffs
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg
                             text-sm font-semibold text-red-400
                             hover:text-red-300 hover:bg-slate-700/50
                             transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm
                           font-semibold text-slate-300
                           hover:text-white hover:bg-slate-700/50
                           transition-colors"
              >
                🔒 Admin Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}