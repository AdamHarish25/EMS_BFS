import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { rooms } = body;

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    await client.query('BEGIN');

    const insertedRooms = [];

    for (const room of rooms) {
      const { external_log_id, room_name, target_column, unit_display_name, line, status } = room;

      if (!external_log_id || !room_name || !target_column || !unit_display_name || !line || !status) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Setiap ruangan memerlukan semua field' }, { status: 400 });
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

      const result = await client.query(query, values);
      insertedRooms.push(result.rows[0]);
    }

    await client.query('COMMIT');

    // --- AUDIT TRAIL ---
    try {
      const { createAuditLog } = await import('@/lib/audit-logger');
      await createAuditLog({
        action: 'CREATE',
        module: 'ROOM_MANAGEMENT',
        description: `Menambahkan ${insertedRooms.length} ruangan baru`,
        newValues: insertedRooms,
        routePath: '/api/add-room'
      });
    } catch (auditError) {
      console.error('Failed to record audit log:', auditError);
    }
    // -------------------

    return NextResponse.json({ 
      success: true, 
      message: 'Berhasil menambahkan ruangan baru',
      data: insertedRooms
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('API Add Room Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
