"use client";
import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Thermometer, Droplets, Wind, Filter, Loader2, Search } from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import LiveChart from '@/components/dashboard/LiveChart';
import RecentReadings from '@/components/dashboard/RecentReadings';
import { useLanguage } from '@/contexts/LanguageContext';

const ROOM_LIST = [
  'Dispensing 1', 'Dispensing 2', 'Mixing', 'Transfer Plastic Moulding', 'WIP', 'Filling'
];

export default function Dashboard() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const { t } = useLanguage();
  const [selectedRoom, setSelectedRoom] = useState('Pilih Ruangan');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<any>(null);

  const getStatus = (temp: number, rh: number, dp: number) => {
    if (temp > 25 || rh > 60 || dp <= 20) return 'critical';
    if (temp > 24 || rh > 59 || dp <= 21) return 'warning';
    return 'normal';
  };

  const formatRow = (item: any, i: number) => {
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
  };

  const handleFetchData = async () => {
    if (selectedRoom === 'Pilih Ruangan') {
      toast.error(t("Select Room First"));
      return;
    }
    if (!startDate || !endDate) {
      toast.error(t("Select Dates First"));
      return;
    }

    setIsLoading(true);
    setReadings([]);
    setFetchError(null);

    try {
      const [sensorRes, exclusionRes] = await Promise.all([
        fetch('/api/report-readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unit_id: selectedRoom,
            start_date: `${startDate.replace('T', ' ')}:00`,
            end_date: `${endDate.replace('T', ' ')}:00`
          })
        }),
        fetch('/api/get-exclusions')
      ]);

      if (!sensorRes.ok) throw new Error(`Sensor API HTTP ${sensorRes.status}`);
      if (!exclusionRes.ok) throw new Error(`Exclusion API HTTP ${exclusionRes.status}`);

      const sensorText = await sensorRes.text();
      const exclusionText = await exclusionRes.text();

      let sensorData, exclusionData;
      try {
        sensorData = JSON.parse(sensorText);
        exclusionData = JSON.parse(exclusionText);
      } catch (e) {
        throw new Error(`Invalid JSON response. Sensor: ${sensorText.substring(0, 20)}...`);
      }

      const formatted = (Array.isArray(sensorData) ? sensorData : []).map(formatRow);
      const excFormatted = (Array.isArray(exclusionData) ? exclusionData : []).map((e: any) => ({
        ...e,
        unit_id: typeof e.unit_id === 'string' ? e.unit_id.trim() : e.unit_id
      }));

      setReadings(formatted);
      setExclusions(excFormatted);
      setHasFetched(true);

      if (formatted.length === 0) {
        toast.error(t("No Data Found"));
      } else {
        toast.success(`${formatted.length} ${t("Data Loaded")}`);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setFetchError(error.message);
      toast.error(`Gagal mengambil data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReadings = useMemo(() => readings.filter(r =>
    r.timestamp != null && r.temperature != null
  ), [readings]);

  const allData = useMemo(() => {
    return [...readings].sort((a, b) =>
      new Date(b.timestamp ?? b.timestamp_start ?? 0).getTime() -
      new Date(a.timestamp ?? a.timestamp_start ?? 0).getTime()
    );
  }, [readings]);

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

  // Poll latest reading for real-time MetricCards
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchLatest = async () => {
      if (!isRoomSelected) {
        setRealtimeData(null);
        return;
      }
      try {
        const res = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(selectedRoom)}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            // Recompute status in case it's not saved or needs client-side verification
            const status = getStatus(data.temperature, data.relative_humidity, data.differential_pressure);
            setRealtimeData({ ...data, status });
          } else {
            setRealtimeData(null);
          }
        }
      } catch (err) {
        console.error("Gagal menarik data realtime:", err);
      }
    };

    fetchLatest();
    interval = setInterval(fetchLatest, 3000);

    return () => clearInterval(interval);
  }, [selectedRoom]);

  // Use realtime data if available, otherwise fallback to the latest fetched data (or '--')
  const displayData = isRoomSelected && realtimeData ? realtimeData : (hasFetched ? actualLatest : null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">{t("System Dashboard")}</h1>
        <p className="text-slate-400">{t("Monitor Central AC")}</p>
      </div>

      {/* FILTER PANEL */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-500" />
          {t("Filter Data")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("Room")}</label>
            <select
              value={selectedRoom}
              onChange={(e) => { setSelectedRoom(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            >
              <option value="Pilih Ruangan">{t("Select Room 2")}</option>
              {ROOM_LIST.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("Start Date")}</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("End Date")}</label>
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
              {isLoading ? t("Loading") : t("Show Data")}
            </button>
          </div>
        </div>
        {hasFetched && readings.length > 0 && (
          <p className="text-xs text-emerald-400 mt-3">{readings.length} data berhasil dimuat untuk {selectedRoom}</p>
        )}
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title={t("Temperature")}
          value={displayData?.temperature ? displayData.temperature.toFixed(1) : '--'}
          unit="°C"
          icon={Thermometer}
          trend="neutral"
          status={displayData?.status || 'normal'}
        />
        <MetricCard
          title={t("Humidity")}
          value={displayData?.relative_humidity ? displayData.relative_humidity.toFixed(1) : '--'}
          unit="%"
          icon={Droplets}
          trend="neutral"
          status={displayData?.status || 'normal'}
        />
        <MetricCard
          title={t("Differential Pressure")}
          value={displayData?.differential_pressure ? displayData.differential_pressure.toFixed(1) : '--'}
          unit="Pa"
          icon={Wind}
          trend="neutral"
          status={displayData?.status || 'normal'}
        />
      </div>

      {/* CHART */}
      <div>
        {!hasFetched ? (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 h-[400px] w-full flex flex-col items-center justify-center text-slate-500">
            {fetchError ? (
              <>
                <div className="w-12 h-12 mb-4 text-red-500 flex items-center justify-center rounded-full bg-red-500/10">!</div>
                <p className="text-xl font-medium text-red-400">Terjadi Error</p>
                <p className="text-sm mt-2 max-w-md text-center text-red-300/70">{fetchError}</p>
              </>
            ) : (
              <>
                <Filter className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-xl font-medium text-slate-400">{t("No Data")}</p>
                <p className="text-sm mt-2">{t("Fill Filter")}</p>
              </>
            )}
          </div>
        ) : (
          <LiveChart data={sortedReadings} />
        )}
      </div>

      {/* RECENT READINGS TABLE */}
      {!hasFetched ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center text-slate-500 py-12">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-slate-400">{t("No Data")}</p>
          <p className="text-sm mt-1">{t("Fill Filter")}</p>
        </div>
      ) : (
        <RecentReadings readings={allData} />
      )}
    </div>
  );
}
