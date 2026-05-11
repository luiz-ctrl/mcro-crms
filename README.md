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
```

### 3. Set Environment Variables in Vercel Dashboard

Go to: Project → Settings → Environment Variables

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `JWT_SECRET` | A strong random secret string |

---

## 🔐 Default Admin Credentials

After running `db/init.sql`:

- **Email**: `admin@mcro-generaluna.gov.ph`  
- **Password**: `Admin@2024`

> ⚠️ Change this password immediately after first login by updating the bcrypt hash in the database.

### To generate a new password hash:
```bash
node -e "const b=require('bcryptjs'); b.hash('YourNewPassword',10).then(h=>console.log(h))"
```

Then run:
```sql
UPDATE users SET password = '<hash>' WHERE email = 'admin@mcro-generaluna.gov.ph';
```

---

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
```

---

## 🧪 Local Development

```bash
# Install API dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Start frontend dev server (proxies /api to localhost:3000)
npm run dev
```

For local API testing, you'll need a local PostgreSQL or use `vercel dev`:
```bash
# Requires Vercel CLI
vercel dev
```

---

## 📋 API Reference

All API routes (except `/api/auth/login`) require:
```
Authorization: Bearer <token>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/records` | List records (paginated, searchable) |
| POST | `/api/records` | Create record |
| PUT | `/api/records/:id` | Update record |
| DELETE | `/api/records/:id` | Delete record |
| GET | `/api/analytics/summary` | Dashboard totals |
| GET | `/api/analytics/top-transactions` | Top types + monthly trend |
| GET | `/api/analytics/status-distribution` | Status + sex breakdown |
| GET | `/api/audit` | Paginated audit logs |

---

## 🔒 Security Notes

- All non-login API routes validate JWT on every request
- Passwords stored as bcrypt hashes (cost factor 10)
- All mutations logged to `audit_logs` table
- JWT expires in 8 hours
- CORS headers set on all endpoints
