import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { globalSettings } from '@/lib/store';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET() {
  try {
    const res = await query('SELECT * FROM "BFS_EMS_ALARM_Duration" LIMIT 1');
    if (res.rows.length > 0) {
      const duration = res.rows[0].alarm_duration;
      globalSettings.alarmDuration = duration;
      return NextResponse.json({ duration });
    }
    return NextResponse.json({ duration: globalSettings.alarmDuration });
  } catch (error: any) {
    console.error('Failed to get alarm config:', error);
    return NextResponse.json({ duration: globalSettings.alarmDuration });
  }
}

export async function POST(req: Request) {
  try {
    const { duration } = await req.json();
    if (duration !== undefined) {
      let val = parseInt(duration, 10);
      if (val > 15) val = 15;
      if (val < 1) val = 1;

      const checkRes = await query('SELECT * FROM "BFS_EMS_ALARM_Duration" LIMIT 1');
      if (checkRes.rows.length > 0) {
        await query('UPDATE "BFS_EMS_ALARM_Duration" SET alarm_duration = $1', [val]);

        await createAuditLog({
          action: 'UPDATE',
          module: 'SETTINGS',
          description: `Updated alarm duration to ${val}`,
          userEmail: 'System'
        });
      } else {
        await query('INSERT INTO "BFS_EMS_ALARM_Duration" (alarm_duration) VALUES ($1)', [val]);

        await createAuditLog({
          action: 'CREATE',
          module: 'SETTINGS',
          description: `Created alarm duration with ${val}`,
          userEmail: 'System'
        });
      }

      globalSettings.alarmDuration = val;
      return NextResponse.json({ success: true, duration: val });
    }
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  } catch (err: any) {
    console.error('Failed to set alarm config:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
