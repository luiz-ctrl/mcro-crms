import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL?.includes('neon') && !process.env.DATABASE_URL?.includes('supabase') && !process.env.DATABASE_URL?.includes('render');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

export async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}
