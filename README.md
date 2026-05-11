# MCRO General Luna Quezon – Civil Registry Management System

Admin-only civil registry management system deployable on Vercel.

---

## 🏗️ Tech Stack

- **Frontend**: React 18 + Vite + Recharts + jsPDF
- **Backend**: Vercel Serverless Functions (Node.js 18)
- **Database**: PostgreSQL (Neon.tech recommended)
- **Auth**: JWT (8hr expiry)

---

## 🚀 Quick Deploy to Vercel

### 1. Set up PostgreSQL Database

Sign up at [neon.tech](https://neon.tech) (free tier works).

Run the init script on your database:
```bash
psql $DATABASE_URL < db/init.sql
```

Or use the Neon SQL editor to paste and run `db/init.sql`.

### 2. Fork / Clone repo then deploy

```bash
npm install -g vercel
vercel --prod

## 📁 Project Structure

```
mcro-crms/
├── api/
│   ├── _db.js                    # PostgreSQL connection pool
│   ├── _auth.js                  # JWT + CORS helpers
│   ├── auth/
│   │   └── login.js              # POST /api/auth/login
│   ├── records/
│   │   ├── index.js              # GET + POST /api/records
│   │   └── [id].js               # PUT + DELETE /api/records/:id
│   ├── analytics/
│   │   ├── summary.js            # GET /api/analytics/summary
│   │   ├── top-transactions.js   # GET /api/analytics/top-transactions
│   │   └── status-distribution.js# GET /api/analytics/status-distribution
│   └── audit/
│       └── index.js              # GET /api/audit
├── db/
│   └── init.sql                  # Database initialization script
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Layout.css
│   │   │   ├── Sidebar.jsx
│   │   │   └── Sidebar.css
│   │   └── pages/
│   │       ├── Login.jsx + .css
│   │       ├── Dashboard.jsx + .css
│   │       ├── Records.jsx + .css
│   │       ├── Analytics.jsx
│   │       └── AuditLogs.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json                  # API dependencies
├── vercel.json                   # Vercel deployment config
└── README.md
