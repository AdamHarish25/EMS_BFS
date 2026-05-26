import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { external_log_id, room_name, target_column, unit_display_name, line, status } = body;

    if (!external_log_id || !room_name || !target_column || !unit_display_name || !line || !status) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const query = `
      INSERT INTO public."BFS_EMS_Room" 
      (id, external_log_id, room_name, target_column, unit_display_name, "Line", status, created_at, updated_at)
      VALUES (
        COALESCE((SELECT MAX(id) FROM public."BFS_EMS_Room"), 0) + 1,
        $1, $2, $3, $4, $5, $6, now(), now()
      )
      RETURNING *
    `;
    
    const values = [
      external_log_id,
      room_name,
      target_column,
      unit_display_name,
      line,
      status
    ];

    const result = await pool.query(query, values);

    return NextResponse.json({ 
      success: true, 
      message: 'Berhasil menambahkan ruangan baru',
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('API Add Room Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
