import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const unit_id = searchParams.get('unit_id');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start dan end wajib diisi' }, { status: 400 });
  }

  try {
    const startEpoch = Math.floor(new Date(start).getTime() / 1000);
    const endEpoch = Math.floor(new Date(end).getTime() / 1000);

    const result = await pool.query(
      `SELECT
        ROUND(AVG(temperature)::numeric, 2)             AS avg_temperature,
        ROUND(MIN(temperature)::numeric, 2)             AS min_temperature,
        ROUND(MAX(temperature)::numeric, 2)             AS max_temperature,
        ROUND(AVG(relative_humidity)::numeric, 2)       AS avg_relative_humidity,
        ROUND(MIN(relative_humidity)::numeric, 2)       AS min_relative_humidity,
        ROUND(MAX(relative_humidity)::numeric, 2)       AS max_relative_humidity,
        ROUND(AVG(differential_pressure)::numeric, 2)   AS avg_differential_pressure,
        ROUND(MIN(differential_pressure)::numeric, 2)   AS min_differential_pressure,
        ROUND(MAX(differential_pressure)::numeric, 2)   AS max_differential_pressure,
        COUNT(*)                                        AS total_rows
      FROM public."BFS_EMS_Sensor"
      WHERE
        (timestamp BETWEEN $1 AND $2 OR timestamp BETWEEN ($1 * 1000) AND ($2 * 1000))
        AND ($3::text IS NULL OR TRIM(unit_id) = TRIM($3))`,
      [startEpoch, endEpoch, unit_id || null]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('[API /sensor-stats] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
