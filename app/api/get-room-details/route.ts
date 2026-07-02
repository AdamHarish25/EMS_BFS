import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomName = searchParams.get('roomName');

  if (!roomName) {
    return NextResponse.json({ error: 'roomName is required' }, { status: 400 });
  }

  try {
    // We want to fetch all rows associated with this room.
    // In BFS_EMS_Room, the base room is stored in 'unit_display_name' or we can match 'room_name' using LIKE
    const query = `
      SELECT * 
      FROM public."BFS_EMS_Room" 
      WHERE unit_display_name = $1 OR room_name LIKE $2
      ORDER BY id ASC
    `;
    const result = await pool.query(query, [roomName, `${roomName}%`]);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('API Get Room Details Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
