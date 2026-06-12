import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { start_date, end_date, action, module } = body;

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'start_date dan end_date diperlukan' }, { status: 400 });
    }

    let query = `
      SELECT id, user_id, user_email, action, module, description, route_path, ip_address, created_at 
      FROM ems_audit_logs 
      WHERE created_at >= $1 AND created_at <= $2
    `;
    const params: any[] = [start_date, end_date];
    let paramIndex = 3;

    if (action && action !== 'ALL') {
      query += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (module && module !== 'ALL') {
      query += ` AND module = $${paramIndex}`;
      params.push(module);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT 1000`; // Batasi 1000 log untuk PDF agar browser tidak crash

    const result = await client.query(query, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Audit Report Fetch Error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data audit logs' }, { status: 500 });
  } finally {
    client.release();
  }
}
