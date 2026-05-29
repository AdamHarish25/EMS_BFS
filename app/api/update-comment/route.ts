import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { id, comment } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const query = `
      UPDATE public."BFS_EMS_Sensor"
      SET comment = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [comment, id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Comment updated successfully', data: result.rows[0] });
  } catch (error: any) {
    console.error('[API /update-comment] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
