# MCRO General Luna, Quezon
## Civil Registry Management System (CRMS)

A full-stack government-grade web application for managing civil registry transactions, visitors, and official documents for the Municipal Civil Registry Office of General Luna, Quezon.

---

## 🗂️ Project Structure

```
crms/
├── backend/                  # Node.js + Express + PostgreSQL
│   ├── config/db.js          # PostgreSQL pool connection
│   ├── middleware/auth.js    # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/login
│   │   ├── visitors.js       # CRUD for visitor records
│   │   ├── analytics.js      # Dashboard analytics endpoints
│   │   └── audit.js          # Audit log endpoints
│   ├── schema.sql            # PostgreSQL table definitions
│   ├── server.js             # Express app entry point
│   ├── render.yaml           # Render deployment config
│   └── .env.example
│
└── frontend/                 # React + Vite
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── Header.jsx
    │   │   └── AddVisitorModal.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── VisitorsPage.jsx
    │   │   ├── AnalyticsPage.jsx
    │   │   └── AuditLogsPage.jsx
    │   ├── services/api.js   # Axios API service
    │   ├── App.jsx           # Router
    │   ├── main.jsx
    │   └── index.css         # Global styles
    ├── netlify.toml          # Netlify deployment config
    └── .env.example
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18+
- PostgreSQL v14+
- npm or yarn

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env and fill in your PostgreSQL DATABASE_URL and JWT_SECRET

npm install
node server.js
```

The server will auto-create all tables and seed the admin user on first start.

**Default Admin Credentials:**
- Email: `admin@mcro-generalluna.gov.ph`
- Password: `Admin@1234`

### 2. Setup Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000

npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## 🗄️ Database Setup

If you prefer to run the schema manually:

```bash
psql -U postgres -d your_database -f backend/schema.sql
```

Or connect to your PostgreSQL instance and paste the contents of `schema.sql`.

---

## 🌐 Deployment

### Backend → Render

1. Push the `backend/` folder to a GitHub repo
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect the repo
4. Set environment variables:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `JWT_SECRET` — a long random secret
   - `CORS_ORIGIN` — your Netlify frontend URL
   - `NODE_ENV` — `production`
5. Build command: `npm install`
6. Start command: `npm start`

**Recommended free PostgreSQL:** Render PostgreSQL or Supabase (free tier)

### Frontend → Netlify

1. Push the `frontend/` folder to GitHub
2. Create a new site on [netlify.com](https://netlify.com)
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variable:
   - `VITE_API_URL` — your Render backend URL (e.g., `https://mcro-crms-backend.onrender.com`)
5. The `netlify.toml` handles SPA routing automatically

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login, returns JWT | ❌ |
| POST | `/api/auth/register` | Register new user | ❌ |
| GET | `/api/visitors` | List visitors (paginated, filterable) | ✅ |
| POST | `/api/visitors` | Register new visitor | ✅ |
| GET | `/api/visitors/:id` | Get visitor by ID | ✅ |
| PATCH | `/api/visitors/:id/status` | Update visitor status | ✅ |
| DELETE | `/api/visitors/:id` | Delete visitor record | ✅ |
| GET | `/api/analytics/summary` | Dashboard summary stats | ✅ |
| GET | `/api/analytics/top-barangays` | Top barangays by visitor count | ✅ |
| GET | `/api/analytics/monthly` | Monthly visitor trend (12mo) | ✅ |
| GET | `/api/analytics/status-breakdown` | Status count breakdown | ✅ |
| GET | `/api/audit` | Audit log entries (paginated) | ✅ |
| GET | `/health` | Health check | ❌ |

---

## 🔐 Auth Flow

1. User POSTs credentials to `/api/auth/login`
2. Server validates and returns a **JWT token** (8h expiry)
3. Frontend stores token in `localStorage`
4. All protected API calls include `Authorization: Bearer <token>` header
5. 401 responses automatically redirect to `/login`

---

## ✨ Features

- 🏛️ Government-style clean UI with navy + gold color scheme
- 👥 Full visitor CRUD with search/filter/pagination
- 📊 Analytics dashboard with Bar, Line, Doughnut charts (Chart.js)
- 📄 PDF export via jsPDF + html2canvas
- 📋 Complete audit trail for all system actions
- 🔐 JWT authentication with protected routes
- 📱 Responsive layout

---

## 🛡️ Legal

This system is designed for authorized personnel of the Municipal Civil Registry Office of General Luna, Quezon. Unauthorized access is prohibited under Philippine law (RA 9048, Data Privacy Act of 2012).
