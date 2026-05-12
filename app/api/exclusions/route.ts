import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { unit_id, timestamp_start, timestamp_end, reason, excluded_by } = body;

    if (!timestamp_start || !timestamp_end) {
      return NextResponse.json({ error: 'Start and End timestamps are required' }, { status: 400 });
    }

    // Hanya INSERT marker rentang waktu ke BFS_EMS_Fumigasi
    // Tidak DELETE dari BFS_EMS_Sensor (DB tidak punya permission)
    const result = await pool.query(
      `INSERT INTO public."BFS_EMS_Fumigasi" (
        unit_id,
        timestamp_start,
        timestamp_end,
        reason,
        excluded_by,
        created_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING *`,
      [
        unit_id && unit_id !== 'All Units' ? unit_id : null,
        timestamp_start,
        timestamp_end,
        reason,
        excluded_by,
        excluded_by
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Rentang waktu berhasil dicatat sebagai data eksklusif.`,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('[POST /api/exclusions] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
