import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET() {
  try {
    const res = await query('SELECT * FROM "BFS_EMS_Emails" ORDER BY id ASC');
    
    // Add audit log
    await createAuditLog({
      action: 'VIEW',
      module: 'SETTINGS',
      description: `Fetched all email recipients. Total: ${res.rows.length} emails.`,
      userEmail: 'System'
    });

    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Failed to get emails:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email, added_by } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const res = await query(
      'INSERT INTO "BFS_EMS_Emails" (email, added_by) VALUES ($1, $2) RETURNING *',
      [email, added_by || 'System']
    );

    // Add audit log
    await createAuditLog({
      action: 'CREATE',
      module: 'SETTINGS',
      description: `Added new email recipient: ${email}`,
      userEmail: added_by || 'System',
      newValues: { email, added_by }
    });

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    console.error('Failed to add email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
