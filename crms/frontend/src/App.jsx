import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VisitorsPage from './pages/VisitorsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import Sidebar from './components/Sidebar';

function ProtectedLayout({ children }) {
  const token = localStorage.getItem('crms_token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <ProtectedLayout><DashboardPage /></ProtectedLayout>
        } />
        <Route path="/visitors" element={
          <ProtectedLayout><VisitorsPage /></ProtectedLayout>
        } />
        <Route path="/analytics" element={
          <ProtectedLayout><AnalyticsPage /></ProtectedLayout>
        } />
        <Route path="/audit-logs" element={
          <ProtectedLayout><AuditLogsPage /></ProtectedLayout>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
