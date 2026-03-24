import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crms_token');
      localStorage.removeItem('crms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

// Visitors
export const getVisitors = (params) => api.get('/visitors', { params });
export const getVisitor = (id) => api.get(`/visitors/${id}`);
export const createVisitor = (data) => api.post('/visitors', data);
export const updateVisitorStatus = (id, status) =>
  api.patch(`/visitors/${id}/status`, { status });
export const deleteVisitor = (id) => api.delete(`/visitors/${id}`);

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary');
export const getTopBarangays = () => api.get('/analytics/top-barangays');
export const getMonthlyAnalytics = () => api.get('/analytics/monthly');
export const getStatusBreakdown = () => api.get('/analytics/status-breakdown');

// Audit Logs
export const getAuditLogs = (params) => api.get('/audit', { params });

export default api;
