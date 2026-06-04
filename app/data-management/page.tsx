"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import ExclusionForm from "@/components/data/ExclusionForm";
import ExclusionList from "@/components/data/ExclusionList";
import DataTable from "@/components/data/DataTable";
import RoomForm from "@/components/data/RoomForm";
import { useLanguage } from "@/contexts/LanguageContext";

const NODE_RED =
  process.env.NEXT_PUBLIC_NODE_RED_URL || "http://10.165.40.127:1880";

const DEFAULT_ROOM_LIST = [
  "Dispensing 1",
  "Dispensing 2",
  "Mixing",
  "Transfer Plastic Moulding",
  "WIP",
  "Filling",
];

export default function DataManagementPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const { t } = useLanguage();
  const [selectedRoom, setSelectedRoom] = useState("Pilih Ruangan");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roomList, setRoomList] = useState<string[]>(DEFAULT_ROOM_LIST);
  const [dataInterval, setDataInterval] = useState("raw");
  const [dataFilter, setDataFilter] = useState("Semua Data");
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const getStatus = (temp: number, rh: number, dp: number) => {
    if (temp > 25 || rh > 60 || dp <= 5) return "critical";
    if (temp > 24 || rh > 59 || dp <= 8) return "warning";
    return "normal";
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setRoomList(data);
        }
      }
    } catch (err) {
      console.error("Gagal menarik daftar ruangan:", err);
    }
  };

  const fetchExclusions = async () => {
    try {
      const res = await fetch("/api/get-exclusions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Pre-calculate timestamp untuk optimasi super cepat
      const formattedExc = (Array.isArray(data) ? data : []).map((exc) => ({
        ...exc,
        startTime: new Date(exc.timestamp_start).getTime(),
        endTime: new Date(exc.timestamp_end).getTime(),
      }));
      setExclusions(formattedExc);
    } catch (error) {
      console.error("Gagal sinkron data exclusions:", error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchExclusions();
    const handleRoomAdded = () => {
      fetchRooms();
    };
    window.addEventListener("ems-room-added", handleRoomAdded);
    return () => {
      window.removeEventListener("ems-room-added", handleRoomAdded);
    };
  }, []);

  const handleFetchData = async () => {
    if (selectedRoom === "Pilih Ruangan") {
      toast.error(t("Select Room First"));
      return;
    }
    if (!startDate || !endDate) {
      toast.error(t("Select Dates First"));
      return;
    }

    setIsLoading(true);
    setReadings([]);

    // Beri jeda 50ms agar UI sempat update "Loading" sebelum CPU terkunci
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const [sensorRes] = await Promise.all([
        fetch("/api/report-readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unit_id: selectedRoom,
            start_date: `${startDate.replace("T", " ")}:00`,
            end_date: `${endDate.replace("T", " ")}:00`,
          }),
        }),
        fetchExclusions(),
      ]);

      const sensorData = await sensorRes.json();

      const formatted = (Array.isArray(sensorData) ? sensorData : []).map(
        (item: any, i: number) => {
          const rawTime =
            item.jam_asli || item.timestamp || new Date().toISOString();
          let timestampValue;
          if (typeof rawTime === "number" || !isNaN(Number(rawTime))) {
            const tsStr = String(rawTime);
            timestampValue = Number(rawTime) * (tsStr.length <= 10 ? 1000 : 1);
          } else {
            timestampValue = new Date(rawTime).getTime();
          }

          return {
            ...item,
            id: item.id || `r-${i}`,
            unit_id:
              typeof item.unit_id === "string"
                ? item.unit_id.trim()
                : item.unit_id,
            timestamp: new Date(timestampValue).toISOString(),
            timestampValue, // Simpan angka mentah agar tidak perlu new Date() lagi di table
            jam_asli:
              item.jam_asli || format(timestampValue, "yyyy-MM-dd HH:mm:ssx"),
            status:
              (typeof item.status === "string"
                ? item.status.trim().toLowerCase()
                : item.status) ||
              getStatus(
                item.temperature,
                item.relative_humidity,
                item.differential_pressure,
              ),
          };
        },
      );

      // Urutkan dari yang terbaru ke terlama secara in-place (O(N log N)) SEKARANG juga
      formatted.sort((a, b) => a.timestampValue - b.timestampValue);

      let finalData = formatted;
      if (dataInterval === "5m") {
        finalData = [];
        let lastTime = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (formatted[i].timestampValue - lastTime >= 5 * 60 * 1000) {
            finalData.push(formatted[i]);
            lastTime = formatted[i].timestampValue;
          }
        }
      } else if (dataInterval === "1h") {
        finalData = [];
        let lastTime = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (formatted[i].timestampValue - lastTime >= 60 * 60 * 1000) {
            finalData.push(formatted[i]);
            lastTime = formatted[i].timestampValue;
          }
        }
      }

      // Reverse balik agar yang terbaru ada di atas untuk tabel
      finalData.reverse();

      setReadings(finalData);
      setHasFetched(true);

      if (finalData.length === 0) {
        toast.error(t("No Data Found"));
      } else {
        toast.success(`${finalData.length} ${t("Data Loaded")}`);
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
      toast.error("ID exclusion tidak valid, tidak bisa menghapus.");
      return;
    }
    const idArray = Array.isArray(ids) ? ids : [ids];
    try {
      for (const id of idArray) {
        const res = await fetch(`${NODE_RED}/api/delete-exclusion`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(id) }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
      }
      toast.success("Data exclusion berhasil dihapus.");
      fetchExclusions();
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          {t("Data Management")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">{t("Manage Data")}</p>
      </div>

      {/* FILTER PANEL */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" /> Filter Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t("Room")}</label>
            <select
              value={selectedRoom}
              onChange={(e) => { setSelectedRoom(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all shadow-inner"
            >
              <option value="Pilih Ruangan">{t("Select Room 2")}</option>
              {roomList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t("Start Date")}</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm [&::-webkit-calendar-picker-indicator]:invert transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t("End Date")}</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm [&::-webkit-calendar-picker-indicator]:invert transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t("Data Interval")}</label>
            <select
              value={dataInterval}
              onChange={(e) => { setDataInterval(e.target.value); setHasFetched(false); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all shadow-inner"
            >
              <option value="raw">{t("Raw Data")}</option>
              <option value="5m">{t("Per 5 Min")}</option>
              <option value="1h">{t("Per 1 Hour")}</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleFetchData}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm shadow-[0_0_15px_rgba(37,99,235,0.2)]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoading ? t("Loading") : t("Show Data")}
            </button>
          </div>
        </div>
        {hasFetched && (
          <p className="text-xs text-emerald-400 mt-3">
            {readings.length} data ditampilkan untuk {selectedRoom}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <RoomForm />
          <ExclusionForm
            onAddExclusion={handleAddExclusion}
            readings={readings}
          />
          <ExclusionList
            exclusions={exclusions}
            onDelete={handleDeleteExclusion}
          />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <DataTable
            readings={readings}
            exclusions={exclusions}
            dataFilter={dataFilter}
          />
          {hasFetched && (
            <div className="flex items-center justify-end bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("Data Type")}:</label>
                <select
                  value={dataFilter}
                  onChange={(e) => setDataFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all shadow-inner"
                >
                  <option value="Semua Data">{t("All Data")}</option>
                  <option value="Non-Fumigasi">{t("Normal Recorded")}</option>
                  <option value="Fumigasi">{t("Excluded TMS")}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
