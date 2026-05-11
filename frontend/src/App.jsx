import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Records from './pages/Records.jsx';
import Analytics from './pages/Analytics.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Queue from './pages/Queue.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Landing from './pages/Landing.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1f3d' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,.2)', borderTopColor: '#c9973a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
  return user ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/app/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<Landing />} />

          {/* Auth — no PublicRoute wrapper; Login.jsx gates itself via ?key=login */}
          <Route path="/login" element={<Login />} />

          {/* Protected staff area */}
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="records" element={<Records />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="queue" element={<Queue />} />
            <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
