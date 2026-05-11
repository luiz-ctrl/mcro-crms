import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mcro_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const onLoginPage = window.location.pathname.includes('/login');
      if (!onLoginPage) {
        // Session expired elsewhere in the app — clear storage and go home
        localStorage.removeItem('mcro_token');
        localStorage.removeItem('mcro_user');
        window.location.href = '/';
      }
      // On the login page itself, do nothing here —
      // Login.jsx catches the error and shows it inline so the user can try again
    }
    return Promise.reject(err);
  }
);

export default API;