"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'id' | 'en';

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  id: {
    "System Dashboard": "Dasbor Sistem",
    "Monitor Central AC": "Monitor Central AC berdasarkan rentang waktu yang dipilih.",
    "Filter Data": "Filter Data",
    "Room": "Ruangan (Unit)",
    "Select Room": "Pilih Ruangan",
    "Select Room 2": "-- Pilih Ruangan --",
    "Start Date": "Tanggal & Waktu Mulai",
    "End Date": "Tanggal & Waktu Selesai",
    "Show Data": "Tampilkan Data",
    "Loading": "Memuat...",
    "Select Room First": "Pilih Ruangan terlebih dahulu!",
    "Select Dates First": "Pilih Tanggal Mulai & Selesai terlebih dahulu!",
    "No Data Found": "Tidak ada data ditemukan pada rentang waktu ini.",
    "Data Loaded": "data berhasil dimuat!",
    "Temperature": "Suhu",
    "Humidity": "Kelembapan",
    "Differential Pressure": "Tekanan Diferensial",
    "No Data": "Belum Ada Data",
    "Fill Filter": "Isi filter di atas lalu klik \"Tampilkan Data\".",
    "Live Trends": "Tren Sensor Langsung",
    "Recent Readings": "Pembacaan Terbaru",
    "Time": "Waktu",
    "Unit": "Ruangan",
    "Temp": "Suhu (°C)",
    "RH": "Kelembapan (%)",
    "DP": "Tekanan (Pa)",
    "Status": "Status",
    "No Recent": "Tidak ada pembacaan terbaru",
    "Data Management": "Manajemen Data",
    "Manage Data": "Kelola pengecualian data dan lihat telemetri sensor mentah.",
    "Add Exclusion": "Tambah Pengecualian Data",
    "Start Period": "Periode Mulai",
    "End Period": "Periode Selesai",
    "Date": "Tanggal",
    "TimeOnly": "Waktu",
    "Reason": "Alasan Pengecualian",
    "Reason Placeholder": "contoh: Kalibrasi sensor, Maintenance...",
    "Exclude": "Kecualikan Data & Simpan ke DB",
    "Active Exclusions": "Pengecualian Aktif",
    "No Active": "Tidak ada pengecualian data aktif",
    "Remove Exclusion": "Hapus Pengecualian",
    "Unknown": "Tidak diketahui",
    "Raw Telemetry": "Telemetri Sensor Mentah",
    "Records Shown": "data ditampilkan",
    "Excluded": "Dikecualikan",
    "System Reports": "Laporan Sistem",
    "Generate Reports": "Buat dan ekspor laporan kinerja.",
    "Filter Config": "Konfigurasi Filter",
    "Report Type": "Tipe Data Laporan",
    "All Data": "Semua Data",
    "Valid Only": "Non-Fumigasi (Valid Only)",
    "Excluded Only": "Fumigasi (Excluded Only)",
    "Pull Data": "Tarik Data",
    "PDF Export": "Ekspor PDF",
    "Download Report Desc": "Unduh laporan komprehensif berdasarkan filter yang Anda pilih.",
    "Download": "Unduh Laporan",
    "Filtered Records": "Data Disaring",
    "Valid Data": "Data Valid",
    "Excluded Fumigasi": "Fumigasi / Dikecualikan",
    "Visual Preview": "Pratinjau Visual",
    "Included in PDF": "Akan disertakan di PDF",
    "Choose Room PDF": "Silakan pilih ruangan di filter untuk melihat preview grafik.",
    "Fill Filter PDF": "Isi filter lalu klik \"Tarik Data\" untuk memuat grafik.",
    "DashboardMenu": "Dasbor",
    "DataManagementMenu": "Manajemen Data",
    "ReportsMenu": "Laporan",
    "Fetching Data": "Mengambil Data...",
    "Rendering PDF": "Membuat PDF...",
    "System Online": "Sistem Online",
    "System Offline": "Sistem Offline"
  },
  en: {
    "System Dashboard": "System Dashboard",
    "Monitor Central AC": "Monitor Central AC based on the selected time range.",
    "Filter Data": "Filter Data",
    "Room": "Room (Unit)",
    "Select Room": "Select Room",
    "Select Room 2": "-- Select Room --",
    "Start Date": "Start Date & Time",
    "End Date": "End Date & Time",
    "Show Data": "Show Data",
    "Loading": "Loading...",
    "Select Room First": "Please select a room first!",
    "Select Dates First": "Please select Start & End dates first!",
    "No Data Found": "No data found for this time range.",
    "Data Loaded": "data successfully loaded!",
    "Temperature": "Temperature",
    "Humidity": "Humidity",
    "Differential Pressure": "Differential Pressure",
    "No Data": "No Data Yet",
    "Fill Filter": "Fill in the filters above and click \"Show Data\".",
    "Live Trends": "Live Sensor Trends",
    "Recent Readings": "Recent Readings",
    "Time": "Time",
    "Unit": "Unit",
    "Temp": "Temp (°C)",
    "RH": "RH (%)",
    "DP": "DP (Pa)",
    "Status": "Status",
    "No Recent": "No recent readings",
    "Data Management": "Data Management",
    "Manage Data": "Manage data exclusions and view raw sensor telemetry.",
    "Add Exclusion": "Add Data Exclusion",
    "Start Period": "Start Period",
    "End Period": "End Period",
    "Date": "Date",
    "TimeOnly": "Time",
    "Reason": "Reason for Exclusion",
    "Reason Placeholder": "e.g. Sensor calibration, Maintenance...",
    "Exclude": "Exclude Data & Move to DB",
    "Active Exclusions": "Active Exclusions",
    "No Active": "No active data exclusions",
    "Remove Exclusion": "Remove Exclusion",
    "Unknown": "Unknown",
    "Raw Telemetry": "Raw Sensor Telemetry",
    "Records Shown": "records shown",
    "Excluded": "Excluded",
    "System Reports": "System Reports",
    "Generate Reports": "Generate and export performance reports.",
    "Filter Config": "Filter Configuration",
    "Report Type": "Report Data Type",
    "All Data": "All Data",
    "Valid Only": "Non-Fumigasi (Valid Only)",
    "Excluded Only": "Fumigasi (Excluded Only)",
    "Pull Data": "Pull Data",
    "PDF Export": "PDF Export",
    "Download Report Desc": "Download the comprehensive report based on your selected filters.",
    "Download": "Download Report",
    "Filtered Records": "Filtered Records",
    "Valid Data": "Valid Data",
    "Excluded Fumigasi": "Fumigasi / Excluded",
    "Visual Preview": "Visual Preview",
    "Included in PDF": "Will be included in PDF",
    "Choose Room PDF": "Please select a room in the filter to see the chart preview.",
    "Fill Filter PDF": "Fill in the filter and click \"Pull Data\" to load the chart.",
    "DashboardMenu": "Dashboard",
    "DataManagementMenu": "Data Management",
    "ReportsMenu": "Reports",
    "Fetching Data": "Fetching Data...",
    "Rendering PDF": "Rendering PDF...",
    "System Online": "System Online",
    "System Offline": "System Offline"
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'id',
  toggleLang: () => {},
  t: (key) => key
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Language>('id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('app_lang');
    if (saved === 'en' || saved === 'id') {
      setLang(saved as Language);
    }
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'id' ? 'en' : 'id';
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = (key: string) => {
    if (!mounted) return translations['id'][key] || key; // Default to ID for SSR consistency initially
    return translations[lang][key] || translations['id'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
