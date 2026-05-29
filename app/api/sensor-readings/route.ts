import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        unit_id,
        timestamp,
        temperature,
        relative_humidity,
        differential_pressure,
        status,
        created_date,
        created_by,
        comment
      FROM public."BFS_EMS_Sensor"
      ORDER BY timestamp DESC
      LIMIT 2000
    `);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[API /sensor-readings] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
