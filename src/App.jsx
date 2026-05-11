import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'

// Public pages
import LandingPage  from './pages/public/LandingPage'
import QueueDisplay from './pages/public/QueueDisplay'
import LoginPage    from './pages/public/LoginPage'

// Admin pages
import AdminLayout   from './pages/admin/AdminLayout'
import Dashboard     from './pages/admin/Dashboard'
import Records       from './pages/admin/Records'
import Analytics     from './pages/admin/Analytics'
import QueueManager  from './pages/admin/QueueManager'
import Reports       from './pages/admin/Reports'
import AuditLogs     from './pages/admin/AuditLogs'
import UserManagement from './pages/admin/UserManagement'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )
  if (!user) return <Navigate to="/" replace state={{ from: location }} />
  return children
}

function RequireAdmin({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role !== 'admin') return <Navigate to="/app/dashboard" replace />
  return children
}

function LoginRoute() {
  const location = useLocation()
  const params   = new URLSearchParams(location.search)
  if (params.get('key') !== 'mcro-staff-2024') return <Navigate to="/" replace />
  return <LoginPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/queue-display" element={<QueueDisplay />} />
            <Route path="/login" element={<LoginRoute />} />

            {/* Admin */}
            <Route path="/app" element={<RequireAuth><AdminLayout /></RequireAuth>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"  element={<Dashboard />} />
              <Route path="records"    element={<Records />} />
              <Route path="analytics"  element={<Analytics />} />
              <Route path="queue"      element={<QueueManager />} />
              <Route path="reports"    element={<Reports />} />
              <Route path="audit"      element={<AuditLogs />} />
              <Route path="users"      element={<RequireAdmin><UserManagement /></RequireAdmin>} />
            </Route>

            {/* 404 → home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
