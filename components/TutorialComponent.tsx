"use client";
import React, { useMemo } from 'react';
import { Joyride, Step } from 'react-joyride';
import { usePathname } from 'next/navigation';
import { useTutorial } from '@/contexts/TutorialContext';
import { useTheme } from 'next-themes';

const JoyrideComponent = Joyride as any;

const CustomBeacon = React.forwardRef<HTMLSpanElement, any>((props, ref) => {
  // We extract out the non-DOM props injected by react-joyride
  const { continuous, index, isLastStep, size, step, ...domProps } = props;

  return (
    <span
      {...domProps}
      ref={ref}
      className="relative flex items-center justify-center group outline-none"
    >
      {/* Outer Pulse/Ping */}
      <span className="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-75"></span>
      {/* Inner Dot */}
      <span className="relative z-10 w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-md transition-transform transform hover:scale-110"></span>
      {/* Text Popup */}
      <span className="absolute left-10 whitespace-nowrap bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none animate-bounce">
        Klik untuk memulai
      </span>
    </span>
  );
});
CustomBeacon.displayName = "CustomBeacon";

export default function TutorialComponent() {
  const pathname = usePathname();
  const { runTutorial, stopTutorial } = useTutorial();
  const { theme } = useTheme();

  const steps = useMemo<Step[]>(() => {
    switch (pathname) {
      case '/':
        return [
          {
            target: 'h1',
            content: 'Selamat datang di Dasbor Sistem! Anda dapat memantau seluruh ruangan secara realtime di sini.',

          },
          {
            target: '.grid-cols-1.md\\:grid-cols-3',
            content: 'Bagian ini menampilkan ringkasan Status Sistem, unit aktif, dan peringatan (anomali) yang sedang terjadi.',
          },
          {
            target: '.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3',
            content: 'Di sini Anda dapat melihat data sensor (Suhu, Kelembapan, dan Tekanan) untuk setiap ruangan secara langsung.',
          },
        ];
      case '/data-management':
        return [
          {
            target: 'h1',
            content: 'Halaman Manajemen Data. Gunakan halaman ini untuk mencatat pengecualian data, misalnya saat Kalibrasi atau Fumigasi.',

          },
          {
            target: '#room-form',
            content: 'Isi form ini untuk menentukan ruangan yang ingin ditambahkan.',
          },
          {
            target: '#exclusion-form',
            content: 'Isi form ini untuk menentukan ruangan dan rentang waktu yang ingin dikecualikan dari sistem peringatan.',
          },
          {
            target: '#exclusion-list',
            content: 'Daftar pengecualian yang sedang aktif akan muncul di area ini.',
          },
          {
            target: '#table-data',
            content: 'Tabel ini menampilkan seluruh data sensor dari setiap ruangan. Anda dapat memfilter data berdasarkan tanggal, waktu, dan ruangan.',
            placement: 'top',
          }
        ];
      case '/reports':
        return [
          {
            target: 'h1',
            content: 'Halaman Laporan Sistem memungkinkan Anda menarik data riwayat dan mengunduhnya sebagai file PDF.',

          },
          {
            target: '.grid-cols-1.md\\:grid-cols-4',
            content: 'Tentukan rentang waktu, ruangan, dan jenis laporan yang ingin ditarik menggunakan form filter ini.',
          },
          {
            target: '.recharts-wrapper, .h-\\[400px\\]',
            content: 'Pratinjau visual berupa grafik data sensor akan muncul di area ini sebelum Anda mencetak/unduh PDF.',
          },
        ];
      case '/emails':
        return [
          {
            target: 'h1',
            content: 'Pengaturan Email Alert. Kelola daftar penerima email notifikasi ketika sistem mendeteksi adanya anomali.',

          },
          {
            target: 'table',
            content: 'Anda dapat menambah atau menghapus penerima, serta mengatur filter pengiriman pada tabel ini.',
          },
        ];
      case '/audit-log':
        return [
          {
            target: 'h1',
            content: 'Halaman Audit Trail menyimpan rekam jejak setiap interaksi dan aktivitas pengguna dalam sistem.',

          },
          {
            target: '.grid-cols-1.md\\:grid-cols-3, .grid-cols-1.sm\\:grid-cols-2',
            content: 'Anda dapat melakukan filter data berdasarkan periode waktu, jenis aksi, atau modul yang diakses.',
          },
          {
            target: 'table',
            content: 'Seluruh riwayat aktivitas beserta detail user, alamat IP, dan waktu kejadian tersimpan pada tabel ini.',
          },
        ];
      default:
        return [
          {
            target: 'body',
            content: 'Fitur tutorial belum tersedia untuk halaman ini.',
            placement: 'center',
          }
        ];
    }
  }, [pathname]);

  const handleJoyrideCallback = (data: any) => {
    const { status, action } = data;
    const finishedStatuses = ['finished', 'skipped'];
    if (finishedStatuses.includes(status) || action === 'close') {
      stopTutorial();
    }
  };

  if (!runTutorial) return null;

  return (
    <JoyrideComponent
      steps={steps}
      run={true}
      beaconComponent={CustomBeacon}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: 'Kembali',
        close: 'Tutup',
        last: 'Selesai',
        next: 'Lanjut',
        skip: 'Lewati',
      }}
      styles={({
        options: {
          zIndex: 10000,
          primaryColor: '#3b82f6',
          backgroundColor: theme === 'dark' ? '#3b82f6' : '#ffffff',
          textColor: theme === 'dark' ? '#f8fafc' : '#3b82f6',
          arrowColor: theme === 'dark' ? '#3b82f6' : '#ffffff',
        },
      }) as any}
    />
  );
}
