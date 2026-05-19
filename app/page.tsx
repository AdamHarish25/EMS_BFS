"use client";
import { useState, useMemo, useEffect } from 'react';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ROOM_LIST = [
  'Dispensing 1', 'Dispensing 2', 'Mixing', 'Transfer Plastic Moulding', 'WIP', 'Filling'
];

export default function Dashboard() {
  const { t } = useLanguage();
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({});
  const [lastFetchTime, setLastFetchTime] = useState<string>('');


  const getStatus = (temp: number, rh: number, dp: number, dp1?: number | null, dp2?: number | null) => {
    let isCritical = false;
    let isWarning = false;

    if (temp > 25 || rh > 60) isCritical = true;
    else if (temp > 24 || rh > 59) isWarning = true;

    if (dp1 !== undefined && dp1 !== null && dp2 !== undefined && dp2 !== null) {
      if (dp1 <= 5 || dp2 <= 5) isCritical = true;
      else if (dp1 <= 8 || dp2 <= 8) isWarning = true;
    } else if (dp !== undefined && dp !== null) {
      if (dp <= 5) isCritical = true;
      else if (dp <= 8) isWarning = true;
    }

    if (isCritical) return 'critical';
    if (isWarning) return 'warning';
    return 'normal';
  };

  // Polling latest reading untuk SEMUA ruangan
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchAllRealtime = async () => {
      try {
        // Melakukan fetch ke semua ruangan secara bersamaan menggunakan Promise.all
        const promises = ROOM_LIST.map(async (roomName) => {
          const res = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(roomName)}`);
          let data = null;
          if (res.ok) {
            data = await res.json();
          }

          let dp1 = null;
          let dp2 = null;

          if (roomName === 'Filling' || roomName === 'Transfer Plastic Moulding') {
            const resDp1 = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(roomName + ' - DP 1')}`);
            if (resDp1.ok) {
              const dp1Data = await resDp1.json();
              dp1 = dp1Data?.differential_pressure ?? null;
            }

            const resDp2 = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(roomName + ' - DP 2')}`);
            if (resDp2.ok) {
              const dp2Data = await resDp2.json();
              dp2 = dp2Data?.differential_pressure ?? null;
            }

            if (data) {
              data.dp1 = dp1;
              data.dp2 = dp2;
            }
          }

          if (data) {
            const status = getStatus(data.temperature, data.relative_humidity, data.differential_pressure, data.dp1, data.dp2);
            return { room: roomName, data: { ...data, status } };
          }
          return { room: roomName, data: null };
        });

        const results = await Promise.all(promises);

        // Menyusun kembali hasilnya ke dalam state object
        const newRealtimeData: Record<string, any> = {};
        results.forEach((result) => {
          if (result.data) {
            newRealtimeData[result.room] = result.data;
          }
        });

        setRealtimeData(newRealtimeData);
        
        // Simpan waktu penarikan terakhir (jam:menit:detik)
        const now = new Date();
        const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
        setLastFetchTime(timeString);
      } catch (err) {
        console.error("Gagal menarik data realtime:", err);
      }
    };

    fetchAllRealtime();
    // Refresh setiap 10 detik (atau sesuaikan dengan kebutuhan, misal 60000 untuk 1 menit)
    interval = setInterval(fetchAllRealtime, 360000);

    return () => clearInterval(interval);
  }, []); // Hapus dependencies selectedRoom karena sekarang kita tarik semua

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">{t("System Dashboard")}</h1>
        <p className="text-slate-400">
          {t("Monitor Central AC").replace('......', lastFetchTime ? lastFetchTime : '...')}
        </p>
      </div>

      {/* REAL-TIME ROOMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {ROOM_LIST.map((room) => {
          const data = realtimeData[room];
          const isConnected = !!data;

          // Menentukan warna border dan background berdasarkan status (normal/warning/critical)
          const status = data?.status || 'normal';
          const borderColor =
            status === 'critical' ? 'border-red-500/50' :
              status === 'warning' ? 'border-amber-500/50' :
                'border-emerald-500/50';

          const bgGlow =
            status === 'critical' ? 'bg-red-500/10' :
              status === 'warning' ? 'bg-amber-500/10' :
                'bg-slate-800/50';

          return (
            <div key={room} className={`p-5 rounded-2xl border ${borderColor} ${bgGlow} shadow-lg transition-all duration-300`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-slate-100">{room}</h3>

                <div className="flex items-center gap-2">
                  {/* Tagging Status */}
                  {isConnected && (
                    <div className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${status === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                      status === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      }`}>
                      {status}
                    </div>
                  )}

                  {/* Indikator Live */}
                  <div className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${isConnected ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                    {isConnected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    )}
                    {isConnected ? 'Live' : 'Memuat...'}
                  </div>
                </div>
              </div>


              <div className="space-y-3">
                {/* Temperature */}
                <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Thermometer className="w-5 h-5 text-rose-400" />
                    <span className="text-sm font-medium">Temperature</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100">
                    {data?.temperature ? data.temperature.toFixed(1) : '--'} <span className="text-sm text-slate-500 font-normal">°C</span>
                  </div>
                </div>

                {/* Humidity */}
                <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium">Humidity</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100">
                    {data?.relative_humidity ? data.relative_humidity.toFixed(1) : '--'} <span className="text-sm text-slate-500 font-normal">%</span>
                  </div>
                </div>

                {/* Differential Pressure */}
                {data?.dp1 !== undefined && data?.dp2 !== undefined ? (
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Wind className="w-4 h-4 text-teal-400" />
                        <span className="text-xs font-medium">DP 1</span>
                      </div>
                      <div className="text-lg font-bold text-slate-100">
                        {data.dp1 !== null ? data.dp1.toFixed(1) : '--'} <span className="text-xs text-slate-500 font-normal">Pa</span>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Wind className="w-4 h-4 text-teal-400" />
                        <span className="text-xs font-medium">DP 2</span>
                      </div>
                      <div className="text-lg font-bold text-slate-100">
                        {data.dp2 !== null ? data.dp2.toFixed(1) : '--'} <span className="text-xs text-slate-500 font-normal">Pa</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Wind className="w-5 h-5 text-teal-400" />
                      <span className="text-sm font-medium">Diff. Pressure</span>
                    </div>
                    <div className="text-xl font-bold text-slate-100">
                      {data?.differential_pressure !== undefined && data?.differential_pressure !== null ? data.differential_pressure.toFixed(1) : '--'} <span className="text-sm text-slate-500 font-normal">Pa</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
