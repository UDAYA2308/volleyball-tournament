import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar              from './components/Navbar'
import Home                from './pages/Home'
import Leaderboard         from './pages/Leaderboard'
import MatchViewer         from './pages/MatchViewer'
import MatchHistory        from './pages/MatchHistory'
import AdminLogin          from './pages/admin/AdminLogin'
import AdminMatchControl   from './pages/admin/AdminMatchControl'
import AdminPlayoffs       from './pages/admin/AdminPlayoffs'
import PlayerStats      from     './pages/PlayerStats'
import Teams from './pages/Teams'
import Playoffs from './pages/Playoffs'



function ProtectedRoute({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/admin" replace />
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/"                   element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/players"             element={<PlayerStats />} />
          <Route path="/leaderboard"        element={<Leaderboard />} />
          <Route path="/playoffs" element={<Playoffs />} />
          <Route path="/match/:id"          element={<MatchViewer />} />
          <Route path="/match/:id/history"  element={<MatchHistory />} />
          <Route path="/admin"              element={<AdminLogin />} />
          <Route path="/admin/match/:id"    element={
            <ProtectedRoute><AdminMatchControl /></ProtectedRoute>
          } />
          <Route path="/admin/playoffs"     element={
            <ProtectedRoute><AdminPlayoffs /></ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}