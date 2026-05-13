"use client";
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import ExclusionForm from '@/components/data/ExclusionForm';
import ExclusionList from '@/components/data/ExclusionList';
import DataTable from '@/components/data/DataTable';

const NODE_RED = 'http://10.165.40.127:1880';

const ROOM_LIST = [
  'Dispensing 1', 'Dispensing 2', 'Mixing', 'Transfer Plastic Moulding', 'WIP', 'Labelling'
];

export default function DataManagementPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('Pilih Ruangan');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const getStatus = (temp: number, rh: number, dp: number) => {
    if (temp > 25 || rh > 60 || dp <= 20) return 'critical';
    if (temp > 24 || rh > 59 || dp <= 21) return 'warning';
    return 'normal';
  };

  const fetchExclusions = async () => {
    try {
      const res = await fetch('/api/get-exclusions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExclusions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Gagal sinkron data exclusions:', error);
    }
  };

  const handleFetchData = async () => {
    if (selectedRoom === 'Pilih Ruangan') {
      toast.error('Pilih Ruangan terlebih dahulu!');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Pilih Start Date & End Date terlebih dahulu!');
      return;
    }

    setIsLoading(true);
    setReadings([]);

    try {
      const [sensorRes] = await Promise.all([
        fetch('/api/report-readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unit_id: selectedRoom,
            start_date: `${startDate.replace('T', ' ')}:00`,
            end_date: `${endDate.replace('T', ' ')}:00`
          })
        }),
        fetchExclusions()
      ]);

      const sensorData = await sensorRes.json();
      const formatted = (Array.isArray(sensorData) ? sensorData : []).map((item: any, i: number) => {
        const rawTime = item.jam_asli || item.timestamp || new Date().toISOString();
        let parsedTime = new Date();
        if (typeof rawTime === 'number' || !isNaN(Number(rawTime))) {
          const tsStr = String(rawTime);
          parsedTime = new Date(Number(rawTime) * (tsStr.length <= 10 ? 1000 : 1));
        } else {
          parsedTime = new Date(rawTime);
        }
        return {
          ...item,
          id: item.id || `r-${i}`,
          unit_id: typeof item.unit_id === 'string' ? item.unit_id.trim() : item.unit_id,
          timestamp: parsedTime.toISOString(),
          jam_asli: format(parsedTime, 'yyyy-MM-dd HH:mm:ssx'),
          status: (typeof item.status === 'string' ? item.status.trim().toLowerCase() : item.status)
            || getStatus(item.temperature, item.relative_humidity, item.differential_pressure)
        };
      });

      setReadings(formatted.reverse());
      setHasFetched(true);

      if (formatted.length === 0) {
        toast.error('Tidak ada data ditemukan pada rentang waktu ini.');
      } else {
        toast.success(`${formatted.length} data berhasil dimuat!`);
      }
    } catch (error: any) {
      toast.error(`Gagal mengambil data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExclusion = () => {
    fetchExclusions();
    // Re-fetch sensor data juga supaya highlight exclusion terbaru langsung muncul
    if (hasFetched) handleFetchData();
  };

  const handleDeleteExclusion = async (ids: string | string[]) => {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      toast.error('ID exclusion tidak valid, tidak bisa menghapus.');
      return;
    }
    const idArray = Array.isArray(ids) ? ids : [ids];
    try {
      for (const id of idArray) {
        const res = await fetch(`${NODE_RED}/api/delete-exclusion`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: Number(id) })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
      }
      toast.success('Data exclusion berhasil dihapus.');
      fetchExclusions();
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Data Management</h1>
        <p className="text-slate-400">Manage data exclusions and view raw sensor telemetry.</p>
      </div>

      {/* FILTER PANEL */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h3 className="text-base font-semibold text-slate-200 mb-4">🔍 Filter Data Sensor</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Ruangan (Unit)</label>
            <select
              value={selectedRoom}
              onChange={(e) => { setSelectedRoom(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            >
              <option value="Pilih Ruangan">-- Pilih Ruangan --</option>
              {ROOM_LIST.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Date & Time</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">End Date & Time</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            />
          </div>
          <div>
            <button
              onClick={handleFetchData}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoading ? 'Memuat...' : 'Tampilkan Data'}
            </button>
          </div>
        </div>
        {hasFetched && (
          <p className="text-xs text-emerald-400 mt-3">{readings.length} data ditampilkan untuk {selectedRoom}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <ExclusionForm onAddExclusion={handleAddExclusion} readings={readings} />
          <ExclusionList exclusions={exclusions} onDelete={handleDeleteExclusion} />
        </div>
        <div className="lg:col-span-2">
          <DataTable readings={readings} exclusions={exclusions} />
        </div>
      </div>
    </div>
  );
}
