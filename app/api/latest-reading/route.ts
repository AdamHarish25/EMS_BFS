import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const unit_id = searchParams.get('unit_id');

    if (!unit_id || unit_id === 'Pilih Ruangan') {
      return NextResponse.json(null);
    }

    const query = `
      SELECT 
        id, unit_id, timestamp, temperature, relative_humidity, differential_pressure, status
      FROM public."BFS_EMS_Sensor"
      WHERE unit_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [unit_id]);
    return NextResponse.json(result.rows[0] || null);
  } catch (error: any) {
    console.error('[API /latest-reading] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
