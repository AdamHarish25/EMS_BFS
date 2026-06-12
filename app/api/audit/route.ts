import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit-logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi basic payload
    if (!body.action || !body.module || !body.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ambil IP address dari headers (opsional)
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1';
                      
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await createAuditLog({
      userId: body.userId, 
      userEmail: body.userEmail,
      action: body.action,
      module: body.module,
      description: body.description,
      entityId: body.entityId,
      oldValues: body.oldValues,
      newValues: body.newValues,
      routePath: body.routePath || new URL(request.url).pathname,
      ipAddress: ipAddress.split(',')[0], // Kadang IP diforward sebagai comma separated list
      userAgent: userAgent
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Audit Route Error:', error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
