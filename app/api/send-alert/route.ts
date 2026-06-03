import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Variabel global untuk menyimpan state anti-spam
// (Akan bertahan selama server berjalan)
let lastSystemState = "";

// Tracker untuk waktu pertama kali DP anomaly terdeteksi per ruangan
// Format: { "Nama Ruangan": timestamp_ms }
let dpAnomalyTracker: Record<string, number> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { anomalies, trackingState, isCritical, lastFetchTime } = body;

    const currentSystemState = trackingState ? trackingState.join(', ') : "";

    // JIKA TIDAK ADA ANOMALI SAMA SEKALI
    if (!anomalies || anomalies.length === 0) {
      // RESET MEMORI JIKA SEMUA RUANGAN SUDAH NORMAL
      lastSystemState = "";
      return NextResponse.json({ message: 'No anomalies, state cleared' });
    }

    // --------------------------------------------------------------------
    // FILTER ANTI-SPAM TINGKAT TINGGI & LOGIC 6 MENIT DP
    // --------------------------------------------------------------------
    const SIX_MINUTES_MS = 6 * 60 * 1000;
    const now = Date.now();
    let filteredAnomalies: string[] = [];
    let filteredTrackingState: string[] = [];

    // Parse trackingState to handle DP 6-minute logic
    for (let i = 0; i < trackingState.length; i++) {
      const stateStr = trackingState[i];
      const anomalyStr = anomalies[i];

      // Extract room name from stateStr, e.g., "Dispensing 1(TEMP_CRIT|DP_WARN)" -> "Dispensing 1"
      const match = stateStr.match(/^(.*?)\((.*?)\)$/);
      if (match) {
        const room = match[1];
        const issues = match[2].split('|');

        // Check if there are any DP issues
        const hasDpIssue = issues.some((issue: string) => issue.startsWith('DP'));
        const hasNonDpIssue = issues.some((issue: string) => !issue.startsWith('DP'));

        if (hasDpIssue) {
          if (!dpAnomalyTracker[room]) {
            // First time detecting DP issue for this room
            dpAnomalyTracker[room] = now;
          }

          const timeElapsed = now - dpAnomalyTracker[room];
          if (timeElapsed >= SIX_MINUTES_MS) {
            // DP issue has persisted for >= 6 minutes, include everything
            filteredAnomalies.push(anomalyStr);
            filteredTrackingState.push(stateStr);
          } else {
            // DP issue is < 6 minutes. Only include non-DP issues if they exist
            if (hasNonDpIssue) {
              // We need to filter out the DP text from anomalyStr
              // anomalyStr format: "🔹 [Room]: Suhu kritis: 26.0°C, DP warning: 7.0 Pa"
              const parts = anomalyStr.split(']: ');
              if (parts.length === 2) {
                const prefix = parts[0] + ']: ';
                const anomaliesList = parts[1].split(', ');
                const nonDpAnomaliesList = anomaliesList.filter((a: string) => !a.includes('DP'));

                if (nonDpAnomaliesList.length > 0) {
                  filteredAnomalies.push(prefix + nonDpAnomaliesList.join(', '));

                  const nonDpIssues = issues.filter((issue: string) => !issue.startsWith('DP'));
                  filteredTrackingState.push(`${room}(${nonDpIssues.join('|')})`);
                }
              }
            }
          }
        } else {
          // No DP issues, reset tracker for this room and include as is
          delete dpAnomalyTracker[room];
          filteredAnomalies.push(anomalyStr);
          filteredTrackingState.push(stateStr);
        }
      } else {
        // Fallback if parsing fails
        filteredAnomalies.push(anomalyStr);
        filteredTrackingState.push(stateStr);
      }
    }

    // Clean up tracker for rooms that are no longer in trackingState
    const currentRooms = trackingState.map((s: string) => {
      const match = s.match(/^(.*?)\(/);
      return match ? match[1] : null;
    }).filter(Boolean);

    Object.keys(dpAnomalyTracker).forEach(room => {
      if (!currentRooms.includes(room)) {
        delete dpAnomalyTracker[room];
      }
    });

    const currentSystemStateFiltered = filteredTrackingState.join(', ');

    // JIKA SETELAH FILTER DP TIDAK ADA ANOMALI
    if (filteredAnomalies.length === 0) {
      return NextResponse.json({ message: 'Only DP anomalies under 6 minutes, or no anomalies. Email suppressed.' });
    }

    // Jika status eror ruangan masih SAMA, JANGAN KIRIM EMAIL!
    if (currentSystemStateFiltered === lastSystemState && currentSystemStateFiltered !== "") {
      return NextResponse.json({ message: 'Spam prevented: State is identical to previous alert' });
    }

    // Update currentSystemState to use the filtered version for the rest of the function
    const finalAnomaliesToReport = filteredAnomalies;
    const finalTrackingStateToStore = currentSystemStateFiltered;

    // State akan diupdate JIKA email berhasil terkirim (ada di baris bawah)
    // --------------------------------------------------------------------

    // Daftar penerima
    const daftarPenerima = [
      "andi.riwanto@dankosfarma.com",
      "Wayan.Yudhistira@dankosfarma.com",
      "Eugenius.Wirawan@dankosfarma.com",
      "Chatrin.yusuf@dankosfarma.com",
      "Rabulas.Nugroho@dankosfarma.com",
      "dhani.putra@dankosfarma.com",
      "seraf.oryzanandi@dankosfarma.com",
      "anton.hermansyah@dankosfarma.com",
      "nebulizereyedrop@gmail.com"
    ].join(', ');


    // Konfigurasi Email
    // Kita mengambil kredensial dari environment variable agar aman
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Ganti ini nanti di .env.local
      }
    });

    const statusLevel = isCritical ? "CRITICAL" : "WARNING";

    let messageText = `🚨 ALERT: Parameter ${statusLevel} terdeteksi!\n\n`;
    messageText += `Waktu Tarikan Data Terakhir: ${lastFetchTime}\n`;
    messageText += `Daftar Ruangan:\n`;
    messageText += finalAnomaliesToReport.join('\n') + `\n\n`;
    messageText += `Harap segera lakukan pengecekan terkait status Environmental Monitoring System (EMS)`;

    const mailOptions = {
      from: '"EMS Monitor" <' + process.env.EMAIL_USER + '>',
      to: daftarPenerima,
      subject: `[${statusLevel}] Peringatan Fasilitas - EMS BFS`,
      text: messageText,
    };

    await transporter.sendMail(mailOptions);

    // Update state HANYA jika email sukses terkirim tanpa error!
    lastSystemState = finalTrackingStateToStore;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /send-alert] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
