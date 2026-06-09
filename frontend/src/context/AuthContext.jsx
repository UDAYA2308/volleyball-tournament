import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'volleyball2026'
const STORAGE_KEY    = 'vb_admin_auth'

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )

  const login = (password) => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setIsAdmin(true)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)