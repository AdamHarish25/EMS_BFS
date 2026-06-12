import { NextResponse } from 'next/server';
import { globalSettings } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ duration: globalSettings.alarmDuration });
}

export async function POST(req: Request) {
  try {
    const { duration } = await req.json();
    if (duration !== undefined) {
      let val = parseInt(duration, 10);
      if (val > 15) val = 15;
      if (val < 1) val = 1;
      globalSettings.alarmDuration = val;
      return NextResponse.json({ success: true, duration: globalSettings.alarmDuration });
    }
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
