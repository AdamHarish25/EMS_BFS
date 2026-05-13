import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { unit_id, timestamp_start, timestamp_end, reason, excluded_by } = body;

    if (!unit_id || !timestamp_start || !timestamp_end || !reason) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // DEBUG LOG
    console.log('[DEBUG add-exclusion] Payload:', body);
    
    // Uji coba select data langsung untuk debug
    const debugQuery = `
      SELECT id, "timestamp", unit_id 
      FROM public."BFS_EMS_Sensor" 
      WHERE unit_id = $1 
      ORDER BY "timestamp" DESC LIMIT 5
    `;
    const debugData = await pool.query(debugQuery, [unit_id]);
    console.log('[DEBUG add-exclusion] Top 5 data for', unit_id, ':', debugData.rows);

    const startEpoch = new Date(timestamp_start).getTime();
    const endEpoch = new Date(timestamp_end).getTime();
    console.log('[DEBUG add-exclusion] JS calculated Epochs:', { startEpoch, endEpoch });

    // Karena user ingin memindahkan data sensor secara UTUH (termasuk temp, hum, press),
    // Kita lakukan INSERT ke Fumigasi dengan mengambil data dari Sensor pada rentang waktu tersebut.
    const query = `
      INSERT INTO public."BFS_EMS_Fumigasi" 
      (reading_id, timestamp_start, timestamp_end, reason, excluded_by, unit_id, created_date, updated_date, created_by, temperature, relative_humidity, differential_pressure)
      SELECT 
        id, $1::timestamp, $2::timestamp, $3::text, $4::text, unit_id, now(), now(), $4::text, temperature, relative_humidity, differential_pressure
      FROM public."BFS_EMS_Sensor"
      WHERE unit_id = $5 
        AND "timestamp" >= EXTRACT(EPOCH FROM $1::timestamp AT TIME ZONE 'Asia/Jakarta')
        AND "timestamp" <= EXTRACT(EPOCH FROM $2::timestamp AT TIME ZONE 'Asia/Jakarta')
      RETURNING *
    `;
    
    const values = [
      timestamp_start,
      timestamp_end,
      reason,
      excluded_by || 'admin@base44.io',
      unit_id
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Tidak ada data sensor ditemukan pada rentang waktu ini' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengeksklusi ${result.rowCount} data sensor ke tabel Fumigasi beserta suhunya!`,
      data: result.rows
    });

  } catch (error: any) {
    console.error('API Add Exclusion Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
