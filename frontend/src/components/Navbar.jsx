import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { isAdmin, logout } = useAuth()
  const { isDark, toggle }  = useTheme()
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
    <nav className="bg-theme-card border-b border-theme
                    sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center
                      justify-between">

        {/* Logo */}
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="text-2xl">🏐</span>
          <span className="font-bold tracking-tight text-sm sm:text-base
                           text-theme-primary">
            Volleyball
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-bold transition-colors
                  ${isActive(link.to)
                    ? 'text-theme-primary'
                    : 'text-theme-secondary hover:text-theme-primary'}`}
              >
                {link.label}
              </Link>
            ))}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg transition-colors text-base
                       text-theme-secondary hover-theme"
            aria-label="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {isAdmin ? (
            <div className="flex items-center gap-3">
              <Link
                to="/admin/playoffs"
                className="text-xs px-2 py-1 rounded-lg transition-colors
                           font-semibold bg-theme-input
                           text-theme-secondary hover:text-theme-primary"
              >
                ⚙️ Manage
              </Link>
              <button
                onClick={handleLogout}
                className="font-semibold text-sm transition-colors
                           text-red-400 hover:text-red-300"
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
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg transition-colors text-base
                       text-theme-secondary"
            aria-label="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {isAdmin && (
            <span className="text-xs bg-blue-600 text-white
                             px-2 py-1 rounded-lg font-semibold">
              Admin
            </span>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="p-1.5 rounded-lg transition-colors
                       text-theme-secondary hover-theme"
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
        <div className="md:hidden border-t border-theme bg-theme-card
                        px-4 py-3 space-y-1 transition-colors duration-200">
          {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm
                            font-bold transition-colors
                  ${isActive(link.to)
                    ? 'bg-theme-input text-theme-primary'
                    : 'text-theme-secondary hover:text-theme-primary hover-theme'}`}
              >
                {link.label}
              </Link>
            ))}

          <div className="pt-2 mt-2 border-t border-theme">
            {isAdmin ? (
              <div className="space-y-1">
                <Link
                  to="/admin/playoffs"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm
                             font-semibold text-theme-secondary
                             hover:text-theme-primary hover-theme
                             transition-colors"
                >
                  ⚙️ Manage Playoffs
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg
                             text-sm font-semibold text-red-400
                             hover:text-red-300 hover-theme
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
                           font-semibold text-theme-secondary
                           hover:text-theme-primary hover-theme
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