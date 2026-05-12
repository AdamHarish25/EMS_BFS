import { Pool } from 'pg';

const pool = new Pool({
  user: 'appuser',         // sesuaikan
  host: '10.165.41.45',    // IP PC server PostgreSQL
  database: 'production',   // nama database
  password: 'appuser',  // isi password asli di sini
  port: 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
