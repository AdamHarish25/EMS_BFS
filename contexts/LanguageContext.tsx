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
    "Monitor Central AC": "Data terkini ditarik pada pukul ...... ",
    "Filter Data": "Filter Pencarian",
    "Room": "Ruangan",
    "Select Room": "Pilih Ruangan",
    "Select Room 2": "-- Pilih Ruangan --",
    "Start Date": "Waktu Mulai",
    "End Date": "Waktu Selesai",
    "Show Data": "Tampilkan Data",
    "Loading": "Memuat...",
    "Select Room First": "Silakan pilih ruangan terlebih dahulu!",
    "Select Dates First": "Tentukan Waktu Mulai & Selesai terlebih dahulu!",
    "No Data Found": "Tidak ada data pada rentang waktu tersebut.",
    "Data Loaded": "data berhasil dimuat!",
    "Temperature": "Suhu",
    "Humidity": "Kelembapan",
    "Differential Pressure": "Tekanan Diferensial",
    "No Data": "Belum Ada Data",
    "Fill Filter": "Isi filter pencarian di atas, lalu klik \"Tampilkan Data\".",
    "Live Trends": "Tren Sensor Terkini",
    "Recent Readings": "Riwayat Pembacaan Terakhir",
    "Time": "Waktu",
    "Unit": "Ruangan",
    "Temp": "Suhu (°C)",
    "RH": "Kelembapan (%)",
    "DP": "Tekanan (Pa)",
    "Status": "Status",
    "No Recent": "Tidak ada riwayat terbaru",
    "Data Management": "Manajemen Data",
    "Manage Data": "Kelola data sensor dan riwayat pengecualian (seperti Fumigasi/Kalibrasi).",
    "Add Exclusion": "Catat Pengecualian Data",
    "Start Period": "Waktu Mulai",
    "End Period": "Waktu Selesai",
    "Date": "Tanggal",
    "TimeOnly": "Jam",
    "Reason": "Alasan Pengecualian",
    "Reason Placeholder": "Misal: Kalibrasi, Maintenance, Fumigasi...",
    "Exclude": "Simpan Pengecualian",
    "Active Exclusions": "Daftar Pengecualian Aktif",
    "No Active": "Tidak ada pengecualian yang sedang aktif",
    "Remove Exclusion": "Hapus",
    "Unknown": "Tidak diketahui",
    "Raw Telemetry": "Data Mentah Sensor",
    "Records Shown": "data ditampilkan",
    "Excluded": "Dikecualikan",
    "System Reports": "Laporan Sistem",
    "Generate Reports": "Buat dan unduh laporan pemantauan ruangan.",
    "Filter Config": "Pengaturan Filter",
    "Report Type": "Tipe Laporan",
    "All Data": "Semua Data",
    "Valid Only": "Data Normal (Non-Fumigasi)",
    "Excluded Only": "Data Anomali (Fumigasi)",
    "Pull Data": "Tampilkan Laporan",
    "PDF Export": "Ekspor ke PDF",
    "Download Report Desc": "Simpan laporan grafik dan data riwayat dalam format PDF.",
    "Download": "Unduh PDF",
    "Filtered Records": "Total Data",
    "Valid Data": "Data Valid",
    "Excluded Fumigasi": "Data Dikecualikan",
    "Visual Preview": "Pratinjau Grafik",
    "Included in PDF": "Tampil di PDF",
    "Choose Room PDF": "Silakan pilih ruangan untuk melihat grafik data.",
    "Fill Filter PDF": "Tentukan filter waktu lalu klik \"Tampilkan Laporan\".",
    "DashboardMenu": "Dasbor",
    "DataManagementMenu": "Manajemen Data",
    "ReportsMenu": "Laporan",
    "Fetching Data": "Mengambil Data...",
    "Rendering PDF": "Membuat PDF...",
    "System Online": "Sistem Online",
    "System Offline": "Sistem Offline",
    "All Fields Required": "Semua kolom harus diisi",
    "Failed Add Room": "Gagal menambahkan ruangan",
    "Success Add Room": "Ruangan berhasil ditambahkan",
    "Error Add Room": "Terjadi kesalahan saat menambahkan ruangan",
    "Add New Room": "Tambah Ruangan Baru (Master Data)",
    "External Log ID": "ID Log Eksternal",
    "Room Name": "Nama Ruangan",
    "Target Column": "Kolom Target",
    "Unit Display Name": "Nama Tampilan Unit",
    "Line": "Line",
    "Active": "Aktif",
    "Inactive": "Nonaktif",
    "Add Room": "Tambah Ruangan",
    "System Status": "Status Sistem",
    "Active Units": "Unit Aktif",
    "Active Alerts": "Peringatan Aktif",
    "Rooms": "Ruangan",
    "Crit": "Tindakan",
    "Warn": "Waspada",
    "Live": "Langsung",
    "critical": "Tindakan",
    "warning": "Waspada",
    "normal": "Normal",
    "Data Interval": "Interval Data",
    "Raw Data": "Semua Data (Mentah)",
    "Per 5 Min": "Per 5 Menit",
    "Per 1 Hour": "Per 1 Jam",
    "Data Type": "Tipe Data",
    "Normal Recorded": "Normal (Recorded)",
    "Excluded TMS": "TMS / Anomali (Excluded)",
    "Theme": "Tema"
  },
  en: {
    "System Dashboard": "System Dashboard",
    "Monitor Central AC": "Latest data synced at ...... ",
    "Filter Data": "Search Filter",
    "Room": "Room",
    "Select Room": "Select Room",
    "Select Room 2": "-- Select Room --",
    "Start Date": "Start Time",
    "End Date": "End Time",
    "Show Data": "Show Data",
    "Loading": "Loading...",
    "Select Room First": "Please select a room first!",
    "Select Dates First": "Please select a time range first!",
    "No Data Found": "No data found for this period.",
    "Data Loaded": "records loaded!",
    "Temperature": "Temperature",
    "Humidity": "Humidity",
    "Differential Pressure": "Differential Pressure",
    "No Data": "No Data Found",
    "Fill Filter": "Adjust the filters above and click \"Show Data\".",
    "Live Trends": "Live Sensor Trends",
    "Recent Readings": "Recent History",
    "Time": "Time",
    "Unit": "Room",
    "Temp": "Temp (°C)",
    "RH": "RH (%)",
    "DP": "DP (Pa)",
    "Status": "Status",
    "No Recent": "No recent history available",
    "Data Management": "Data Management",
    "Manage Data": "Manage sensor data and view excluded records (e.g. Maintenance/Fumigation).",
    "Add Exclusion": "Log Data Exclusion",
    "Start Period": "Start Time",
    "End Period": "End Time",
    "Date": "Date",
    "TimeOnly": "Time",
    "Reason": "Reason for Exclusion",
    "Reason Placeholder": "e.g. Calibration, Fumigation...",
    "Exclude": "Save Exclusion",
    "Active Exclusions": "Active Exclusions List",
    "No Active": "No active exclusions found",
    "Remove Exclusion": "Remove",
    "Unknown": "Unknown",
    "Raw Telemetry": "Raw Sensor Data",
    "Records Shown": "records shown",
    "Excluded": "Excluded",
    "System Reports": "System Reports",
    "Generate Reports": "Generate and download room monitoring reports.",
    "Filter Config": "Filter Settings",
    "Report Type": "Report Type",
    "All Data": "All Data",
    "Valid Only": "Normal Data (Valid)",
    "Excluded Only": "Anomaly Data (Excluded)",
    "Pull Data": "Generate Report",
    "PDF Export": "Export to PDF",
    "Download Report Desc": "Save the visual charts and data records as a PDF document.",
    "Download": "Download PDF",
    "Filtered Records": "Total Records",
    "Valid Data": "Valid Records",
    "Excluded Fumigasi": "Excluded Records",
    "Visual Preview": "Chart Preview",
    "Included in PDF": "Included in PDF",
    "Choose Room PDF": "Please select a room to view its data chart.",
    "Fill Filter PDF": "Set the time filter and click \"Generate Report\".",
    "DashboardMenu": "Dashboard",
    "DataManagementMenu": "Data Management",
    "ReportsMenu": "Reports",
    "Fetching Data": "Fetching Data...",
    "Rendering PDF": "Rendering PDF...",
    "System Online": "System Online",
    "System Offline": "System Offline",
    "All Fields Required": "All fields must be filled",
    "Failed Add Room": "Failed to add room",
    "Success Add Room": "Room successfully added",
    "Error Add Room": "An error occurred while adding the room",
    "Add New Room": "Add New Room (Master Data)",
    "External Log ID": "External Log ID",
    "Room Name": "Room Name",
    "Target Column": "Target Column",
    "Unit Display Name": "Unit Display Name",
    "Line": "Line",
    "Active": "Active",
    "Inactive": "Inactive",
    "Add Room": "Add Room",
    "System Status": "System Status",
    "Active Units": "Active Units",
    "Active Alerts": "Active Alerts",
    "Rooms": "Rooms",
    "Crit": "Action",
    "Warn": "Alert",
    "Live": "Live",
    "critical": "Action",
    "warning": "Alert",
    "normal": "Normal",
    "Data Interval": "Data Interval",
    "Raw Data": "All Data (Raw)",
    "Per 5 Min": "Per 5 Minutes",
    "Per 1 Hour": "Per 1 Hour",
    "Data Type": "Data Type",
    "Normal Recorded": "Normal (Recorded)",
    "Excluded TMS": "TMS / Anomaly (Excluded)",
    "Theme": "Theme"
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'id',
  toggleLang: () => { },
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
