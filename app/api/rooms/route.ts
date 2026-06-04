import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT room_name 
      FROM public."BFS_EMS_Room" 
      ORDER BY room_name ASC
    `;
    const result = await pool.query(query);
    const rooms = result.rows.map((row: any) => row.room_name);
    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error('API Get Rooms Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
