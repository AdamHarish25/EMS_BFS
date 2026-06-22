import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createAuditLog } from '@/lib/audit-logger';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    await query('DELETE FROM "BFS_EMS_Emails" WHERE id = $1', [id]);

    // Add audit log
    await createAuditLog({
      action: 'DELETE',
      module: 'SETTINGS',
      description: `Deleted email recipient with ID: ${id}`,
      userEmail: 'System',
      entityId: id.toString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
