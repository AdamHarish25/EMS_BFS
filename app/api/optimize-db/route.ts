import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ems_sensor_unit_timestamp ON public."BFS_EMS_Sensor"(unit_id, timestamp DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ems_fumigasi_start ON public."BFS_EMS_Fumigasi"(timestamp_start DESC)`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
