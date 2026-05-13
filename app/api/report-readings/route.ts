import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { unit_id, start_date, end_date } = body;

    if (!unit_id || unit_id === 'Pilih Ruangan') {
      return NextResponse.json([]);
    }

    let query = `
      SELECT 
        id,
        unit_id,
        timestamp,
        temperature,
        relative_humidity,
        differential_pressure,
        status,
        created_date,
        created_by
      FROM public."BFS_EMS_Sensor"
      WHERE unit_id = $1
    `;
    const values: any[] = [unit_id];

    if (start_date) {
      query += ` AND "timestamp" >= EXTRACT(EPOCH FROM $2::timestamp AT TIME ZONE 'Asia/Jakarta')`;
      values.push(start_date);
    }
    
    if (end_date) {
      query += ` AND "timestamp" <= EXTRACT(EPOCH FROM $3::timestamp AT TIME ZONE 'Asia/Jakarta')`;
      values.push(end_date);
    }

    query += ` ORDER BY timestamp ASC`; // Urutkan dari yang paling lama ke terbaru untuk report

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[API /report-readings] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
