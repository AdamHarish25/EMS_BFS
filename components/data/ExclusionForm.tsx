"use client";
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ROOMS = ['Dispensing 1', 'Dispensing 2', 'Mixing', 'Filling', 'Transfer Plastic Mold', 'WIP'];

export default function ExclusionForm({ onAddExclusion }: { onAddExclusion: (data: any) => void }) {
  const [unitId, setUnitId] = useState('AC-01');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !startTime || !endDate || !endTime || !reason) {
      toast.error('Semua kolom harus diisi');
      return;
    }

    const payload = {
      id: Math.random().toString(36).substring(7),
      unit_id: unitId,
      timestamp_start: new Date(`${startDate}T${startTime}`).toISOString(),
      timestamp_end: new Date(`${endDate}T${endTime}`).toISOString(),
      reason,
      excluded_by: 'admin@base44.io',
      created_date: new Date().toISOString()
    };

    try {
      setIsSubmitting(true);
      
      // --- TAMBAHAN DEBUGGING (SEBELUM FETCH) ---
      console.log("[DEBUG] Memulai proses POST ke Node-RED...");
      console.log("[DEBUG] Target URL: http://10.165.40.127:1880/api/exclude-data");
      console.log("[DEBUG] Payload yang dikirim:", payload);

      const res = await fetch('http://10.165.40.127:1880/api/exclude-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // --- TAMBAHAN DEBUGGING (SETELAH FETCH) ---
      console.log("[DEBUG] Respons dari Node-RED diterima!");
      console.log("[DEBUG] Status Code:", res.status, res.statusText);

      const data = await res.json();
      console.log("[DEBUG] Data Balasan Node-RED:", data);

      if (!res.ok) throw new Error(data.error || 'Gagal memindahkan data');

      toast.success(data.message || 'Pengecualian data berhasil diproses');
      onAddExclusion(payload);

      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setReason('');
    } catch (err: any) {
      // --- TAMBAHAN DEBUGGING (JIKA ERROR) ---
      console.error("[DEBUG ERROR] Request ke Node-RED GAGAL!");
      console.error("[DEBUG ERROR] Detail:", err);
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        toast.error('NETWORK ERROR: Node-RED tidak bisa dijangkau. Cek CORS di Node-RED atau pastikan IP benar.');
        console.error("[DEBUG ERROR] Ini biasanya terjadi karena masalah CORS (Cross-Origin Resource Sharing) yang belum diaktifkan di Node-RED, atau Node-RED dalam keadaan mati.");
      } else {
        toast.error(err.message || 'Terjadi kesalahan saat menghubungi database');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
      <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-rose-500" />
        Add Data Exclusion
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Unit ID</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {ROOMS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 text-sm font-medium text-slate-300 border-b border-slate-800 pb-1">Start Period</div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="col-span-2 text-sm font-medium text-slate-300 border-b border-slate-800 pb-1 mt-2">End Period</div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Reason for Exclusion</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            placeholder="e.g. Sensor calibration, Maintenance..."
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors shadow-[0_0_15px_rgba(244,63,94,0.3)]"
        >
          {isSubmitting ? 'Memproses...' : 'Exclude Data & Move to DB'}
        </button>
      </form>
    </div>
  );
}
