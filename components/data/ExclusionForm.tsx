'use client';
import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import CustomDateTimePicker from '@/components/ui/CustomDateTimePicker';

const NODE_RED = process.env.NEXT_PUBLIC_NODE_RED_URL || 'http://10.165.40.13:1880';
const ROOMS = ['Dispensing 1', 'Dispensing 2', 'Mixing', 'Filling', 'Transfer Plastic Moulding', 'WIP'];

export default function ExclusionForm({ onAddExclusion, readings = [] }: { onAddExclusion: (data: any) => void, readings?: any[] }) {
  const { t } = useLanguage();
  const [roomList, setRoomList] = useState<string[]>(ROOMS);
  const [unitId, setUnitId] = useState(roomList[0]);
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [exclusionType, setExclusionType] = useState('Fumigasi');
  const [reason, setReason] = useState('');
  const [statusTag, setStatusTag] = useState('Semua');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all rooms from API
  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const baseRooms = (data as string[])
            .filter((room): room is string => typeof room === 'string' && room.trim().length > 0)
            .map((room) => room.trim())
            .filter((room) => !room.match(/(- DP \d+|DP-\d+| T-\d+| RH-\d+)$/i));

          if (baseRooms.length > 0) {
            setRoomList(baseRooms);
            setUnitId((prev) => (baseRooms.includes(prev) ? prev : baseRooms[0]));
            return;
          }
        }
      }
      setRoomList(ROOMS);
      setUnitId((prev) => (ROOMS.includes(prev) ? prev : ROOMS[0]));
    } catch (err) {
      console.error("Gagal menarik daftar ruangan:", err);
      setRoomList(ROOMS);
      setUnitId((prev) => (ROOMS.includes(prev) ? prev : ROOMS[0]));
    }
  };

  useEffect(() => {
    fetchRooms();
    const handleRoomAdded = () => {
      fetchRooms();
    };
    window.addEventListener("ems-room-added", handleRoomAdded);
    return () => {
      window.removeEventListener("ems-room-added", handleRoomAdded);
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateTime || !endDateTime || !reason) {
      toast.error('Semua kolom harus diisi');
      return;
    }

    const [startDate, startTime] = startDateTime.split('T');
    const [endDate, endTime] = endDateTime.split('T');
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) {
      toast.error('Waktu selesai harus setelah waktu mulai');
      return;
    }

    if (exclusionType === 'Fumigasi') {
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 3) {
        toast.error('Untuk Fumigasi, pengecualian data maksimal hanya 3 jam!');
        return;
      }
    }

    const payload = {
      unit_id: unitId,
      timestamp_start: `${startDate} ${startTime}:00`,
      timestamp_end: `${endDate} ${endTime}:00`,
      reason: `[${exclusionType}] [TAG:${statusTag}] ${reason}`,
      excluded_by: 'admin@base44.io',
    };

    try {
      setIsSubmitting(true);

      // Bypass Node-RED: Kita langsung panggil API Next.js kita sendiri karena INSERT diizinkan
      const res = await fetch(`/api/add-exclusion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memindahkan data');

      toast.success(data.message || 'Data berhasil dipindahkan ke tabel Fumigasi');
      onAddExclusion(payload);

      setStartDateTime('');
      setEndDateTime('');
      setReason('');
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        toast.error('NETWORK ERROR: Node-RED tidak bisa dijangkau. Pastikan Node-RED menyala.');
      } else {
        toast.error(err.message || 'Terjadi kesalahan saat menghubungi database');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-rose-500" />
        {t("Add Exclusion")}
      </h3>
      <form id="exclusion-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Room")}</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {roomList.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Tipe Anomali</label>
          <select
            value={exclusionType}
            onChange={(e) => setExclusionType(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="Fumigasi">Fumigasi (Maks 3 Jam)</option>
            <option value="PM">PM / Preventive Maintenance</option>
          </select>
        </div>
        <div className="space-y-4">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1">{t("Start Period")}</div>
          <CustomDateTimePicker
            value={startDateTime}
            onChange={setStartDateTime}
            label=""
            placeholder="Select start date & time"
          />

          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1">{t("End Period")}</div>
          <CustomDateTimePicker
            value={endDateTime}
            onChange={setEndDateTime}
            label=""
            placeholder="Select end date & time"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Reason")}</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              placeholder={t("Reason Placeholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Target Data (Status)</label>
            <select
              value={statusTag}
              onChange={(e) => setStatusTag(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="Semua">Semua Status (Normal + Warning/Critical)</option>
              <option value="Warning/Critical">Hanya Data TMS</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors shadow-[0_0_15px_rgba(244,63,94,0.3)]"
        >
          {isSubmitting ? t("Loading") : t("Exclude")}
        </button>
      </form>
    </div>
  );
}
