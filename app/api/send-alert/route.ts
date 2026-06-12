import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { query } from '@/lib/db';
import { globalSettings } from '@/lib/store';

// Tracker global untuk waktu deteksi anomali per ruangan dan nilai terakhir yang dikirim
// Format: { "Nama Ruangan": { firstSeen: number, lastSentTime: number, lastSentValues: any } }
let anomalyTracker: Record<string, { firstSeen: number, lastSentTime: number, lastSentValues: any }> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { anomalies, trackingState, isCritical, lastFetchTime, rawValues } = body;

    // JIKA TIDAK ADA ANOMALI SAMA SEKALI
    if (!anomalies || anomalies.length === 0) {
      // RESET MEMORI JIKA SEMUA RUANGAN SUDAH NORMAL
      anomalyTracker = {};
      return NextResponse.json({ message: 'No anomalies, state cleared' });
    }

    // --------------------------------------------------------------------
    // FILTER ANTI-SPAM: DURASI 10 MENIT & PERUBAHAN SIGNIFIKAN
    // --------------------------------------------------------------------
    const TEN_MINUTES_MS = globalSettings.alarmDuration * 60 * 1000;
    const now = Date.now();
    let filteredAnomalies: string[] = [];
    let roomsToUpdate: string[] = [];

    // Ambil daftar ruangan yang saat ini memiliki anomali
    const currentAbnormalRooms = trackingState.map((s: string) => {
      const match = s.match(/^(.*?)\(/);
      return match ? match[1] : null;
    }).filter(Boolean);

    // Bersihkan ruangan yang sudah kembali normal dari tracker
    Object.keys(anomalyTracker).forEach(room => {
      if (!currentAbnormalRooms.includes(room)) {
        delete anomalyTracker[room];
      }
    });

    for (let i = 0; i < trackingState.length; i++) {
      const stateStr = trackingState[i];
      const anomalyStr = anomalies[i];

      const match = stateStr.match(/^(.*?)\(/);
      if (!match) continue;

      const room = match[1];
      const currentValues = rawValues?.[room];

      // Jika baru pertama kali terdeteksi anomali
      if (!anomalyTracker[room]) {
        anomalyTracker[room] = {
          firstSeen: now,
          lastSentTime: 0,
          lastSentValues: null
        };
      }

      const tracker = anomalyTracker[room];
      const duration = now - tracker.firstSeen;

      // Syarat 1: Harus berdurasi lebih dari atau sama dengan 10 menit
      if (duration >= TEN_MINUTES_MS) {
        let isSignificant = false;

        // Syarat 2: Perubahan nilai harus signifikan
        if (!tracker.lastSentValues) {
          // Jika belum pernah dikirim sama sekali, anggap signifikan
          isSignificant = true;
        } else if (currentValues) {
          // Bandingkan dengan yang terakhir dikirim
          const last = tracker.lastSentValues;
          const cur = currentValues;

          const tempDiff = Math.abs((cur.temperature || 0) - (last.temperature || 0));
          const rhDiff = Math.abs((cur.relative_humidity || 0) - (last.relative_humidity || 0));

          let dpDiff = 0, dp1Diff = 0, dp2Diff = 0;
          if (cur.differential_pressure !== undefined && cur.differential_pressure !== null && last.differential_pressure !== undefined && last.differential_pressure !== null) {
            dpDiff = Math.abs(cur.differential_pressure - last.differential_pressure);
          }
          if (cur.dp1 !== undefined && cur.dp1 !== null && last.dp1 !== undefined && last.dp1 !== null) {
            dp1Diff = Math.abs(cur.dp1 - last.dp1);
          }
          if (cur.dp2 !== undefined && cur.dp2 !== null && last.dp2 !== undefined && last.dp2 !== null) {
            dp2Diff = Math.abs(cur.dp2 - last.dp2);
          }

          // Kriteria Signifikan (Bisa disesuaikan batasnya)
          if (tempDiff >= 0.5 || rhDiff >= 2.0 || dpDiff >= 2.0 || dp1Diff >= 2.0 || dp2Diff >= 2.0) {
            isSignificant = true;
          }
        } else {
          // Fallback jika rawValues kosong untuk ruangan tersebut (harus dikirim jika > 10m)
          isSignificant = true;
        }

        if (isSignificant) {
          filteredAnomalies.push(anomalyStr);
          roomsToUpdate.push(room);
        }
      }
    }

    // JIKA TIDAK ADA YANG SIGNIFIKAN ATAU DURASI < 10 MENIT
    if (filteredAnomalies.length === 0) {
      return NextResponse.json({ message: 'No significant changes or duration < 10 minutes. Email suppressed.' });
    }

    // --------------------------------------------------------------------

    // Daftar penerima
    let daftarPenerima = "nebulizereyedrop@gmail.com"; // Fallback default
    try {
      const resEmails = await query('SELECT email FROM "BFS_EMS_Emails"');
      if (resEmails.rows.length > 0) {
        daftarPenerima = resEmails.rows.map((r: any) => r.email).join(', ');
      }
    } catch (err) {
      console.error("Gagal mengambil daftar email dari DB:", err);
    }

    // Konfigurasi Email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const statusLevel = isCritical ? "CRITICAL" : "WARNING";

    let messageText = `🚨 ALERT: Parameter ${statusLevel} terdeteksi!\n\n`;
    messageText += `Waktu Tarikan Data Terakhir: ${lastFetchTime}\n`;
    messageText += `Daftar Ruangan:\n`;
    messageText += filteredAnomalies.join('\n') + `\n\n`;
    messageText += `Harap segera lakukan pengecekan terkait status Environmental Monitoring System (EMS)`;
    messageText += `Link EMS: http://10.165.40.13:3000/`;

    const mailOptions = {
      from: '"EMS Monitor" <' + process.env.EMAIL_USER + '>',
      to: daftarPenerima,
      subject: `[${statusLevel}] Peringatan Fasilitas - EMS BFS`,
      text: messageText,
    };

    await transporter.sendMail(mailOptions);

    // Update state tracker HANYA jika email sukses terkirim
    roomsToUpdate.forEach(room => {
      if (anomalyTracker[room]) {
        anomalyTracker[room].lastSentTime = now;
        if (rawValues?.[room]) {
          anomalyTracker[room].lastSentValues = JSON.parse(JSON.stringify(rawValues[room]));
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /send-alert] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
