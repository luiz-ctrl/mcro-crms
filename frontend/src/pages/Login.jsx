import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import API from '../utils/api.js';
import './Login.css';

function EyeIcon({ open }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="spin-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function Login() {
  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Allow access only with ?key=login
  const allowed = useRef(
    new URLSearchParams(window.location.search).get('key') === 'login'
  ).current;

  useEffect(() => {
    if (!allowed) {
      window.location.href = '/';
    }
  }, [allowed]);

  if (!allowed) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const { data } = await API.post('/auth/login', { username: form.username, password: form.password });

      login(data.token, data.user);

      navigate('/app/dashboard');
    } catch (err) {
      const msg =
        err.response?.status === 401
          ? 'Incorrect email or password. Please try again.'
          : err.response?.data?.error ||
            'Login failed. Please try again.';

      setError(msg);

      setShake(true);

      setTimeout(() => {
        setShake(false);
      }, 600);

      setForm((prev) => ({
        ...prev,
        password: '',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* Centered Login Card */}
      <div className="login-right">
        <div
          className={`login-card${
            shake ? ' login-card--shake' : ''
          }`}
        >
          <div className="login-card-header">
            <div className="login-card-top-badge">
              Restricted Access
            </div>

            <h2>Admin Sign In</h2>

            <p>Authorized personnel only</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="login-form"
          >
            {/* Error Message */}
            {error && (
              <div
                className="login-error"
                role="alert"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                  />
                  <line
                    x1="12"
                    y1="16"
                    x2="12.01"
                    y2="16"
                  />
                </svg>

                {error}
              </div>
            )}

            {/* Username */}
            <div className="form-group">
              <label className="form-label">
                Username
              </label>

              <input
                className={`form-input${
                  error ? ' form-input--error' : ''
                }`}
                type="text"
                placeholder="e.g. jdelacruz"
                value={form.username}
                onChange={(e) => {
                  setError('');

                  setForm((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }));
                }}
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">
                Password
              </label>

              <div className="password-wrapper">
                <input
                  className={`form-input${
                    error ? ' form-input--error' : ''
                  }`}
                  type={
                    showPassword ? 'text' : 'password'
                  }
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setError('');

                    setForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }));
                  }}
                  required
                />

                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner />
                  Signing in...
                </>
              ) : (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />

                    <polyline points="10 17 15 12 10 7" />

                    <line
                      x1="15"
                      y1="12"
                      x2="3"
                      y2="12"
                    />
                  </svg>

                  Sign In
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            className="login-back-btn"
            onClick={() => navigate('/')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Home
          </button>

          <p className="login-footer-note">
            This system is restricted to authorized
            MCRO staff only.
            <br />
            Unauthorized access is prohibited and
            monitored.
          </p>
        </div>
      </div>
    </div>
  );
}