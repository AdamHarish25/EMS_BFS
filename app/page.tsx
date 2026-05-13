"use client";
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Thermometer, Droplets, Wind, Filter, WifiOff, Loader2 } from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import LiveChart from '@/components/dashboard/LiveChart';
import RecentReadings from '@/components/dashboard/RecentReadings';


export default function Dashboard() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('Pilih Ruangan');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  /* 
  ================================================================================
  [TEMPLATE] INTEGRASI REAL-TIME KE DATABASE POSTGRESQL (Menggunakan React Query)
  ================================================================================
  // 1. Uncomment import ini nanti:
  // import { useQuery } from '@tanstack/react-query';
  
  // 2. Buat fungsi fetcher ke API yang terhubung dengan PostgreSQL (misal: Node.js/Prisma)
  // const fetchLiveSensorData = async () => {
  //   const res = await fetch('/api/sensors/ac-01/readings?limit=20');
  //   if (!res.ok) throw new Error('Gagal mengambil data');
  //   return res.json();
  // };

  // 3. Gunakan useQuery di dalam komponen Dashboard:
  // const { data: dbReadings, isLoading, error } = useQuery({
  //   queryKey: ['sensorData', 'AC-01'],
  //   queryFn: fetchLiveSensorData,
  //   refetchInterval: 5000, // <--- Polling otomatis ke DB setiap 5 detik (Real-time effect)
  // });
  
  // Nanti saat sudah siap, Anda tinggal mengganti 'readings' di bawah 
  // dengan 'dbReadings' yang berasal dari React Query ini.
  ================================================================================
  */

  const getStatus = (temp: number, rh: number, dp: number) => {
    if (temp > 25 || rh > 60 || dp <= 20) return 'critical';
    if (temp > 24 || rh > 59 || dp <= 21) return 'warning';
    return 'normal';
  };

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sensor-readings');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const dataArray = Array.isArray(data) ? data : [];
        const formattedData = dataArray.map((item: any) => {
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
            unit_id: typeof item.unit_id === 'string' ? item.unit_id.trim() : item.unit_id,
            timestamp: parsedTime.toISOString(),
            jam_asli: format(parsedTime, 'yyyy-MM-dd HH:mm:ssx'),
            status: (typeof item.status === 'string' ? item.status.trim().toLowerCase() : item.status) || getStatus(item.temperature, item.relative_humidity, item.differential_pressure)
          };
        });
        if (mounted) {
          setReadings(formattedData);
          setApiError(null);
          console.log(`[DEBUG] Sensor: ${formattedData.length} rows`);
        }
      } catch (error: any) {
        if (mounted) setApiError(`Gagal membaca tabel BFS_EMS_Sensor: ${error.message}`);
        console.error('[DEBUG] Sensor fetch error:', error.message);
      }
    };

    const fetchExclusions = async () => {
      try {
        const res = await fetch('/api/get-exclusions');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        if (mounted) {
          setExclusions(arr.map((e: any) => ({ ...e, unit_id: typeof e.unit_id === 'string' ? e.unit_id.trim() : e.unit_id })));
          console.log(`[DEBUG] Exclusions: ${arr.length} rows`);
        }
      } catch (error: any) {
        console.error('[DEBUG] Exclusions fetch error:', error.message);
      }
    };

    const fetchAll = async () => {
      await Promise.all([fetchData(), fetchExclusions()]);
      if (mounted) setIsLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const uniqueRooms = useMemo(() => {
    const allRooms = [
      ...readings.map(r => (r.unit_id || '').trim()),
      ...exclusions.map(e => (e.unit_id || '').trim())
    ];
    const rooms = Array.from(new Set(allRooms)).filter(Boolean).sort() as string[];
    console.log('[DEBUG] uniqueRooms:', rooms);
    return rooms;
  }, [readings, exclusions]);

  // Gabungkan data dari kedua tabel: sensor (BFS_EMS_Sensor) + fumigasi (BFS_EMS_Fumigasi)
  const allData = useMemo(() => {
    const combined = [...readings, ...exclusions];
    // Sort by timestamp descending (newest first)
    return combined.sort((a, b) => new Date(b.timestamp ?? b.timestamp_start ?? 0).getTime() - new Date(a.timestamp ?? a.timestamp_start ?? 0).getTime());
  }, [readings, exclusions]);

  // Untuk grafik & MetricCard: hanya data sensor nyata (punya timestamp + nilai sensor)
  const filteredReadings = useMemo(() => {
    if (selectedRoom === 'Pilih Ruangan') return [];
    return readings.filter(r =>
      (r.unit_id || '').trim() === selectedRoom &&
      r.timestamp != null &&
      r.temperature != null
    );
  }, [readings, selectedRoom]);

  // Untuk RecentReadings table: gabungan sensor + exclusion marker
  const filteredAll = useMemo(() => {
    if (selectedRoom === 'Pilih Ruangan') return [];
    return allData.filter(r => (r.unit_id || '').trim() === selectedRoom);
  }, [allData, selectedRoom]);

  // Ensure latest is correctly derived from filteredReadings
  const latest = filteredReadings.length > 0 
    ? filteredReadings[0] // Assuming newest is first or last? Let's use [0] if API returns DESC
    : { temperature: 0, relative_humidity: 0, differential_pressure: 0, status: 'normal' };
    
  // Fallback to last item if [0] is not the newest (e.g. if API is ASC)
  const actualLatest = useMemo(() => {
    if (filteredReadings.length === 0) return { temperature: 0, relative_humidity: 0, differential_pressure: 0, status: 'normal' };
    const firstTime = new Date(filteredReadings[0].timestamp).getTime();
    const lastTime = new Date(filteredReadings[filteredReadings.length - 1].timestamp).getTime();
    return firstTime > lastTime ? filteredReadings[0] : filteredReadings[filteredReadings.length - 1];
  }, [filteredReadings]);

  const sortedReadings = useMemo(() => {
    if (filteredReadings.length === 0) return [];
    const firstTime = new Date(filteredReadings[0].timestamp).getTime();
    const lastTime = new Date(filteredReadings[filteredReadings.length - 1].timestamp).getTime();
    if (firstTime > lastTime) return filteredReadings;
    return [...filteredReadings].reverse();
  }, [filteredReadings]);

  const isRoomSelected = selectedRoom !== 'Pilih Ruangan';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* API Error Banner */}
      {apiError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <WifiOff className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Koneksi Node-RED Gagal</p>
            <p className="text-xs opacity-80">{apiError} — Pastikan Node-RED menyala dan CORS sudah diaktifkan.</p>
          </div>
        </div>
      )}

      {/* Loading Banner */}
      {isLoading && !apiError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <p className="text-sm">Memuat data sensor dari database...</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">System Dashboard</h1>
        <p className="text-slate-400">Real-time Central AC monitoring and analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Temperature" 
          value={isRoomSelected ? (actualLatest.temperature?.toFixed(1) ?? '--') : '--'} 
          unit="°C" 
          icon={Thermometer} 
          trend="neutral"
          status={isRoomSelected ? actualLatest.status : 'normal'} 
        />
        <MetricCard 
          title="Humidity" 
          value={isRoomSelected ? (actualLatest.relative_humidity?.toFixed(1) ?? '--') : '--'} 
          unit="%" 
          icon={Droplets} 
          trend="neutral"
          status={isRoomSelected ? actualLatest.status : 'normal'} 
        />
        <MetricCard 
          title="Differential Pressure" 
          value={isRoomSelected ? (actualLatest.differential_pressure?.toFixed(1) ?? '--') : '--'} 
          unit="Pa" 
          icon={Wind} 
          trend="neutral"
          status={isRoomSelected ? actualLatest.status : 'normal'} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!isRoomSelected ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 h-[400px] w-full flex flex-col items-center justify-center text-slate-500">
              <Filter className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-xl font-medium text-slate-400">Pilih Ruangan Dulu</p>
              <p className="text-sm mt-2">Silakan pilih ruangan di filter untuk melihat grafik data.</p>
            </div>
          ) : (
            <LiveChart data={filteredReadings} />
          )}
        </div>
        <div>
          {/* Room Selector replacing AddReadingForm */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl h-full flex flex-col">
            <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-500" />
              Room Filter
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Pilih ruangan untuk menyaring data grafik, status metrik, dan tabel di bawah ini.
            </p>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">Unit ID (Ruangan)</label>
              <select 
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="Pilih Ruangan">-- Pilih Ruangan --</option>
                {uniqueRooms.map(r => (
                  <option key={r as string} value={r as string}>{r as string}</option>
                ))}
              </select>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Records Found</span>
                <span className="font-medium text-slate-200">{filteredAll.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adjust RecentReadings to use filtered data and pass as-is or reversed depending on chronological order */}
      {!isRoomSelected ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center text-slate-500 py-12">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-slate-400">Pilih Ruangan Dulu</p>
          <p className="text-sm mt-1">Silakan pilih ruangan di filter untuk melihat histori sensor.</p>
        </div>
      ) : (
        <RecentReadings readings={filteredAll} />
      )}
    </div>
  );
}
