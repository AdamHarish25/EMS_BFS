import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT *
      FROM public."BFS_EMS_Fumigasi"
      ORDER BY timestamp_start DESC
    `);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[API /get-exclusions] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
