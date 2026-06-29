import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createAuditLog } from '@/lib/audit-logger';

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
        "comment"
      FROM public."BFS_EMS_Sensor"
    `;
    const values: any[] = [];
    let paramIndex = 1;

    // Match base room OR sub-rooms (e.g. "Filling", "Filling - DP 1", "Sampling DP-1")
    query += ` WHERE (unit_id = $${paramIndex} 
                     OR unit_id LIKE $${paramIndex} || ' - DP %' 
                     OR unit_id LIKE $${paramIndex} || ' DP-%'
                     OR unit_id LIKE $${paramIndex} || ' T-%'
                     OR unit_id LIKE $${paramIndex} || ' RH-%')`;
    values.push(unit_id);
    paramIndex += 1;

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
    
    // Add audit log
    await createAuditLog({
      action: 'EXPORT', // Or VIEW, but EXPORT fits generating a report better. Or VIEW because it's fetching data for report. Let's use VIEW. Actually EXPORT is for downloading. Let's use 'EXPORT' as making report is exporting data basically or 'VIEW'. The user said "buat report", let's use 'EXPORT'
      module: 'REPORTING',
      description: `Generated report for unit(s): ${unit_id}. Date range: ${start_date || 'N/A'} to ${end_date || 'N/A'}. Total rows: ${result.rows.length}`,
      userEmail: 'System'
    });

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[API /report-readings] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
