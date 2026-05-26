import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic'; // <--- INI PENTING: Matikan cache Next.js

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        TRIM(reading_id) as reading_id,
        timestamp_start,
        timestamp_end,
        TRIM(reason) as reason,
        TRIM(excluded_by) as excluded_by,
        TRIM(unit_id) as unit_id,
        created_date,
        updated_date,
        TRIM(created_by) as created_by,
        temperature,
        relative_humidity,
        differential_pressure,
        "Line"
      FROM public."BFS_EMS_Fumigasi"
      ORDER BY timestamp_start DESC
    `);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[API /get-exclusions] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
