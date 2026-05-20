import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Variabel global untuk menyimpan state anti-spam
// (Akan bertahan selama server berjalan)
let lastSystemState = "";

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
    // FILTER ANTI-SPAM TINGKAT TINGGI
    // --------------------------------------------------------------------
    // Jika status eror ruangan masih SAMA, JANGAN KIRIM EMAIL!
    if (currentSystemState === lastSystemState && currentSystemState !== "") {
      return NextResponse.json({ message: 'Spam prevented: State is identical to previous alert' });
    }

    // State akan diupdate JIKA email berhasil terkirim (ada di baris bawah)
    // --------------------------------------------------------------------

    // Daftar penerima
    const daftarPenerima = [
      // "andi.riwanto@dankosfarma.com",
      // "Wayan.Yudhistira@dankosfarma.com",
      // "Eugenius.Wirawan@dankosfarma.com",
      // "Chatrin.yusuf@dankosfarma.com",
      // "Rabulas.Nugroho@dankosfarma.com",
      // "dhani.putra@dankosfarma.com",
      // "seraf.oryzanandi@dankosfarma.com",
      // "anton.hermansyah@dankosfarma.com",
      "nebulizereyedrop@gmail.com"
    ].join(', ');


    // Konfigurasi Email
    // Kita mengambil kredensial dari environment variable agar aman
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || "nebulizereyedrop@gmail.com",
        pass: process.env.EMAIL_PASS || "mwqm yczf knhi rjby" // Ganti ini nanti di .env.local
      }
    });

    const statusLevel = isCritical ? "CRITICAL" : "WARNING";

    let messageText = `🚨 ALERT: Parameter ${statusLevel} terdeteksi!\n\n`;
    messageText += `Waktu Tarikan Data Terakhir: ${lastFetchTime}\n`;
    messageText += `Daftar Ruangan:\n`;
    messageText += anomalies.join('\n') + `\n\n`;
    messageText += `Harap segera lakukan pengecekan terkait status Environmental Monitoring System (EMS)`;

    const mailOptions = {
      from: '"EMS Monitor" <' + (process.env.EMAIL_USER || "nebulizereyedrop@gmail.com") + '>',
      to: daftarPenerima,
      subject: `[${statusLevel}] Peringatan Fasilitas - EMS BFS`,
      text: messageText,
    };

    await transporter.sendMail(mailOptions);

    // Update state HANYA jika email sukses terkirim tanpa error!
    lastSystemState = currentSystemState;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /send-alert] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
