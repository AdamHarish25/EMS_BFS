import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { attributes } = body; // Array of { id: number, external_log_id: number }

    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    await client.query('BEGIN');

    const updatedRooms = [];

    for (const attr of attributes) {
      const { id, external_log_id } = attr;

      if (!id || !external_log_id) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'ID dan external_log_id diperlukan' }, { status: 400 });
      }

      const query = `
        UPDATE public."BFS_EMS_Room" 
        SET external_log_id = $1, updated_at = now()
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await client.query(query, [external_log_id, id]);
      if (result.rows.length > 0) {
        updatedRooms.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');

    // --- AUDIT TRAIL ---
    try {
      const { createAuditLog } = await import('@/lib/audit-logger');
      await createAuditLog({
        action: 'UPDATE',
        module: 'ROOM_MANAGEMENT',
        description: `Mengubah ID Sensor untuk ${updatedRooms.length} parameter`,
        newValues: updatedRooms,
        routePath: '/api/edit-room'
      });
    } catch (auditError) {
      console.error('Failed to record audit log:', auditError);
    }
    // -------------------

    return NextResponse.json({ 
      success: true, 
      message: 'Berhasil mengubah ID Sensor ruangan',
      data: updatedRooms
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('API Edit Room Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
