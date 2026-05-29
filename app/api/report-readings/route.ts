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
        created_by,
        comment
      FROM public."BFS_EMS_Sensor"
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (unit_id === 'Filling') {
      query += ` WHERE unit_id IN ($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`;
      values.push('Filling', 'Filling - DP 1', 'Filling - DP 2');
      paramIndex += 3;
    } else if (unit_id === 'Transfer Plastic Moulding') {
      query += ` WHERE unit_id IN ($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`;
      values.push('Transfer Plastic Moulding', 'Transfer Plastic Moulding - DP 1', 'Transfer Plastic Moulding - DP 2');
      paramIndex += 3;
    } else {
      query += ` WHERE unit_id = $${paramIndex}`;
      values.push(unit_id);
      paramIndex += 1;
    }

    if (start_date) {
      query += ` AND "timestamp" >= EXTRACT(EPOCH FROM $${paramIndex}::timestamp AT TIME ZONE 'Asia/Jakarta')`;
      values.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND "timestamp" <= EXTRACT(EPOCH FROM $${paramIndex}::timestamp AT TIME ZONE 'Asia/Jakarta')`;
      values.push(end_date);
      paramIndex++;
    }

    query += ` ORDER BY timestamp ASC`; // Urutkan dari yang paling lama ke terbaru untuk report

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[API /report-readings] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
