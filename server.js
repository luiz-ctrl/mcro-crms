import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiHandler from './api/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Single handler mirrors Vercel `api/index.js` (route files under ./api/auth etc. are not used).
app.use('/api', (req, res, next) => {
  Promise.resolve(apiHandler(req, res)).catch(next);
});

app.get('/queue-display', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/queue-display.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ MCRO local server running at http://localhost:${PORT}`);
  console.log(`   Frontend:      http://localhost:5173`);
  console.log(`   Queue Display: http://localhost:5173/queue-display.html`);
  console.log(`   DB: ${process.env.DATABASE_URL ? '✅ DATABASE_URL loaded' : '❌ DATABASE_URL missing!'}`);
});
