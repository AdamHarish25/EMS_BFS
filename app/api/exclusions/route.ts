import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize connection pool. 
// Requires DATABASE_URL in .env.local like: postgres://user:password@10.165.40.127:5432/dbname
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { unit_id, timestamp_start, timestamp_end, reason, excluded_by } = body;

    if (!timestamp_start || !timestamp_end) {
      return NextResponse.json({ error: 'Start and End timestamps are required' }, { status: 400 });
    }

    // Convert ISO string dates to Unix timestamps (seconds) for BFS_EMS_Sensor (which uses epoch)
    const startEpoch = Math.floor(new Date(timestamp_start).getTime() / 1000);
    const endEpoch = Math.floor(new Date(timestamp_end).getTime() / 1000);

    // Using a CTE to safely move the data in one atomic query
    let query = `
      WITH moved_rows AS (
        DELETE FROM public."BFS_EMS_Sensor"
        WHERE timestamp >= $1 AND timestamp <= $2
        AND ($3::text IS NULL OR unit_id = $3)
        RETURNING *
      )
      INSERT INTO public."BFS_EMS_Fumigasi" (
        reading_id, 
        timestamp_start, 
        timestamp_end, 
        reason, 
        excluded_by, 
        unit_id, 
        id, 
        created_date, 
        updated_date, 
        created_by, 
        temperature, 
        relative_humidity, 
        differential_pressure
      )
      SELECT 
        id::text, 
        $4, 
        $5, 
        $6, 
        $7, 
        unit_id, 
        id, 
        created_date, 
        updated_date, 
        created_by, 
        temperature, 
        relative_humidity, 
        differential_pressure
      FROM moved_rows
      RETURNING *;
    `;

    // Always provide all 7 parameters to prevent binding mismatch errors
    let values: any[] = [
      startEpoch, // $1
      endEpoch,   // $2
      unit_id !== 'All Units' && unit_id ? unit_id : null, // $3
      timestamp_start, // $4
      timestamp_end,   // $5
      reason,          // $6
      excluded_by      // $7
    ];

    // Attempt to run the query
    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      message: `Berhasil memindahkan ${result.rowCount} baris data ke tabel BFS_EMS_Fumigasi.`,
      movedCount: result.rowCount
    });

  } catch (error: any) {
    console.error('Error during data exclusion:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
