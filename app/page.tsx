"use client";
import { useState, useMemo, useEffect } from "react";
import { Thermometer, Droplets, Wind, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const DEFAULT_ROOM_LIST = [
  "Dispensing 1",
  "Dispensing 2",
  "Mixing",
  "Transfer Plastic Moulding",
  "WIP",
  "Filling",
];

export default function Dashboard() {
  const { t } = useLanguage();
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({});
  const [lastFetchTime, setLastFetchTime] = useState<string>("");
  const [roomList, setRoomList] = useState<string[]>(DEFAULT_ROOM_LIST);
  const [allRooms, setAllRooms] = useState<string[]>(DEFAULT_ROOM_LIST);
  const [filterType, setFilterType] = useState<"all" | "hardcoded" | "other">("all");

  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editingAttributes, setEditingAttributes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditRoom = async (roomName: string) => {
    setEditingRoom(roomName);
    setEditingAttributes([]);
    try {
      const res = await fetch(`/api/get-room-details?roomName=${encodeURIComponent(roomName)}`);
      if (res.ok) {
        const data = await res.json();
        setEditingAttributes(data);
      } else {
        toast.error("Gagal mengambil data ruangan");
        setEditingRoom(null);
      }
    } catch (err) {
      toast.error("Gagal mengambil data ruangan");
      setEditingRoom(null);
    }
  };

  const handleSaveRoom = async () => {
    setIsSaving(true);
    try {
      const payload = editingAttributes.map((attr) => ({
        id: attr.id,
        external_log_id: Number(attr.external_log_id),
      }));

      const res = await fetch("/api/edit-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: payload }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Berhasil mengubah ID Sensor");
        setEditingRoom(null);
      } else {
        toast.error(data.error || "Gagal mengubah ID Sensor");
      }
    } catch (err) {
      toast.error("Gagal mengubah ID Sensor");
    } finally {
      setIsSaving(false);
    }
  };

  const displayedRooms = useMemo(() => {
    if (filterType === "hardcoded") {
      return roomList.filter((room) => DEFAULT_ROOM_LIST.includes(room));
    }
    if (filterType === "other") {
      return roomList.filter((room) => !DEFAULT_ROOM_LIST.includes(room));
    }
    return roomList;
  }, [roomList, filterType]);

  const displayedData = useMemo(() => {
    return Object.entries(realtimeData)
      .filter(([room]) => displayedRooms.includes(room))
      .map(([, data]) => data);
  }, [realtimeData, displayedRooms]);

  const getStatus = (
    temp: number,
    rh: number,
    dp: number,
    dp1?: number | null,
    dp2?: number | null,
  ) => {
    let isCritical = false;
    let isWarning = false;

    if (temp > 25 || rh > 60) isCritical = true;
    else if (temp > 24 || rh > 59) isWarning = true;

    if (
      dp1 !== undefined &&
      dp1 !== null &&
      dp2 !== undefined &&
      dp2 !== null
    ) {
      if (dp1 <= 5 || dp2 <= 5) isCritical = true;
      else if (dp1 <= 8 || dp2 <= 8) isWarning = true;
    } else if (dp !== undefined && dp !== null) {
      if (dp <= 5) isCritical = true;
      else if (dp <= 8) isWarning = true;
    }

    if (isCritical) return "critical";
    if (isWarning) return "warning";
    return "normal";
  };

  // Fetch rooms on mount and listen for new room events
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

  // Polling latest reading untuk SEMUA ruangan
  useEffect(() => {
    if (roomList.length === 0) return;

    let interval: NodeJS.Timeout;

    const fetchAllRealtime = async () => {
      try {
        // Melakukan fetch ke semua ruangan secara bersamaan menggunakan Promise.all
        const promises = roomList.map(async (roomName) => {
          const res = await fetch(
            `/api/latest-reading?unit_id=${encodeURIComponent(roomName)}`,
          );
          let data = null;
          if (res.ok) {
            data = await res.json();
          }

          let dp1: number | null | undefined = undefined;
          let dp2: number | null | undefined = undefined;

          // Cek apakah ruangan ini punya lebih dari 1 DP (dinamis dari database atau hardcoded legacy)
          let isTwoDP = roomName === "Filling" || roomName === "Transfer Plastic Moulding";
          if (allRooms.includes(roomName + " - DP 1") || allRooms.includes(roomName + " DP-1")) {
            isTwoDP = true;
          }

          if (isTwoDP) {
            dp1 = null;
            dp2 = null;

            // Fetch DP1
            let resDp1 = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(roomName + " - DP 1")}`);
            if (resDp1.ok) {
              const d = await resDp1.json();
              if (d) dp1 = d.differential_pressure ?? null;
            }
            if (dp1 === null) {
              resDp1 = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(roomName + " DP-1")}`);
              if (resDp1.ok) {
                const d = await resDp1.json();
                if (d) dp1 = d.differential_pressure ?? null;
              }
            }

            // Fetch DP2
            let resDp2 = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(roomName + " - DP 2")}`);
            if (resDp2.ok) {
              const d = await resDp2.json();
              if (d) dp2 = d.differential_pressure ?? null;
            }
            if (dp2 === null) {
              resDp2 = await fetch(`/api/latest-reading?unit_id=${encodeURIComponent(roomName + " DP-2")}`);
              if (resDp2.ok) {
                const d = await resDp2.json();
                if (d) dp2 = d.differential_pressure ?? null;
              }
            }
          }

          if (data) {
            if (dp1 !== undefined) data.dp1 = dp1;
            if (dp2 !== undefined) data.dp2 = dp2;
          }

          if (data) {
            const status = getStatus(
              data.temperature,
              data.relative_humidity,
              data.differential_pressure,
              data.dp1,
              data.dp2,
            );
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
        const timeString = now
          .toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
          .replace(/\./g, ":");
        setLastFetchTime(timeString);

        // --- CEK ANOMALI UNTUK EMAIL ALERT ---
        const allAnomalies: string[] = [];
        const trackingState: string[] = [];
        let isCriticalGlobal = false;

        results.forEach((result) => {
          if (!result.data) return;
          const {
            status,
            temperature,
            relative_humidity,
            differential_pressure,
            dp1,
            dp2,
          } = result.data;

          if (status !== "normal") {
            let roomAnomalies = [];
            let roomState = [];

            // Re-evaluate to get specific messages
            if (temperature > 25) {
              roomAnomalies.push(`Suhu tindakan: ${temperature.toFixed(1)}°C`);
              roomState.push("TEMP_CRIT");
              isCriticalGlobal = true;
            } else if (temperature > 24) {
              roomAnomalies.push(`Suhu waspada: ${temperature.toFixed(1)}°C`);
              roomState.push("TEMP_WARN");
            }

            if (relative_humidity > 60) {
              roomAnomalies.push(`RH tindakan: ${relative_humidity.toFixed(1)}%`);
              roomState.push("RH_CRIT");
              isCriticalGlobal = true;
            } else if (relative_humidity > 59) {
              roomAnomalies.push(
                `RH waspada: ${relative_humidity.toFixed(1)}%`,
              );
              roomState.push("RH_WARN");
            }

            // Base DP
            if (
              differential_pressure !== undefined &&
              differential_pressure !== null
            ) {
              if (differential_pressure <= 5) {
                roomAnomalies.push(
                  `DP tindakan: ${differential_pressure.toFixed(1)} Pa`,
                );
                roomState.push("DP_CRIT");
                isCriticalGlobal = true;
              } else if (differential_pressure <= 8) {
                roomAnomalies.push(
                  `DP waspada: ${differential_pressure.toFixed(1)} Pa`,
                );
                roomState.push("DP_WARN");
              }
            }

            // DP1
            if (dp1 !== undefined && dp1 !== null) {
              if (dp1 <= 5) {
                roomAnomalies.push(`DP 1 tindakan: ${dp1.toFixed(1)} Pa`);
                roomState.push("DP1_CRIT");
                isCriticalGlobal = true;
              } else if (dp1 <= 8) {
                roomAnomalies.push(`DP 1 waspada: ${dp1.toFixed(1)} Pa`);
                roomState.push("DP1_WARN");
              }
            }

            // DP2
            if (dp2 !== undefined && dp2 !== null) {
              if (dp2 <= 5) {
                roomAnomalies.push(`DP 2 tindakan: ${dp2.toFixed(1)} Pa`);
                roomState.push("DP2_CRIT");
                isCriticalGlobal = true;
              } else if (dp2 <= 8) {
                roomAnomalies.push(`DP 2 waspada: ${dp2.toFixed(1)} Pa`);
                roomState.push("DP2_WARN");
              }
            }

            if (roomAnomalies.length > 0) {
              allAnomalies.push(
                `🔹 [${result.room}]: ${roomAnomalies.join(", ")}`,
              );
              trackingState.push(`${result.room}(${roomState.join("|")})`);
            }
          }
        });

        // Selalu panggil API, biarkan API yang memutuskan apakah ini SPAM atau NORMAL (Clear State)
        fetch("/api/send-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anomalies: allAnomalies,
            trackingState: trackingState,
            isCritical: isCriticalGlobal,
            lastFetchTime: timeString,
            rawValues: newRealtimeData,
          }),
        }).catch((err) => console.error("Gagal kirim email alert:", err));
        // ------------------------------------
      } catch (err) {
        console.error("Gagal menarik data realtime:", err);
      }
    };

    fetchAllRealtime();
    // Refresh setiap 10 detik (atau sesuaikan dengan kebutuhan, misal 60000 untuk 1 menit)
    interval = setInterval(fetchAllRealtime, 360000);

    return () => {
      clearInterval(interval);
    };
  }, [roomList, allRooms]); // Refresh polling when room list changes

  // Fetch all rooms from API
  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setAllRooms(data);
          // Filter out sub-rooms so they don't get rendered as separate cards
          const baseRooms = data.filter((room: string) => !room.match(/(- DP \d+|DP-\d+| T-\d+| RH-\d+)$/i));
          setRoomList(baseRooms);
        }
      }
    } catch (err) {
      console.error("Gagal menarik daftar ruangan:", err);
    }
  };

  // Hitung KPI
  const totalRooms = displayedRooms.length;
  const activeRooms = displayedData.filter(d => !!d).length;
  const criticalRooms = displayedData.filter(d => d && d.status === 'critical').length;
  const warningRooms = displayedData.filter(d => d && d.status === 'warning').length;

  useEffect(() => {
    // Broadcast status to the sidebar for instant visual sync
    window.dispatchEvent(new CustomEvent('ems-system-status', { detail: { isOnline: activeRooms > 0 } }));
  }, [activeRooms]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            {t("System Dashboard")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t("Monitor Central AC").replace(
              "......",
              lastFetchTime ? lastFetchTime : "...",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
          >
            <option value="all">Semua Ruangan</option>
            <option value="hardcoded">Ruangan Utama (6)</option>
            <option value="other">Ruangan Lainnya</option>
          </select>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-center">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{t("System Status")}</div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${activeRooms > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeRooms > 0 ? t("System Online") : t("System Offline")}</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-center">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{t("Active Units")}</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{activeRooms}</div>
            <div className="text-slate-500 text-sm font-medium">/ {totalRooms} {t("Rooms")}</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-center">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{t("Active Alerts")}</div>
          <div className="flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${criticalRooms > 0 ? 'text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>{criticalRooms}</span>
              <span className="text-xs text-slate-500 uppercase">{t("Crit")}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${warningRooms > 0 ? 'text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>{warningRooms}</span>
              <span className="text-xs text-slate-500 uppercase">{t("Warn")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME ROOMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {displayedRooms.map((room) => {
          const data = realtimeData[room];
          const isConnected = !!data;

          // Menentukan warna border dan background berdasarkan status (normal/warning/critical)
          const status = data?.status || "normal";
          const borderColor =
            status === "critical"
              ? "border-red-500/50"
              : status === "warning"
                ? "border-amber-500/50"
                : "border-emerald-500/50";

          const bgGlow =
            status === "critical"
              ? "bg-red-500/10"
              : status === "warning"
                ? "bg-amber-500/10"
                : "bg-slate-100 dark:bg-slate-800/50";

          return (
            <div
              key={room}
              className={`p-5 rounded-2xl border ${borderColor} ${bgGlow} shadow-lg transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{room}</h3>
                  <button 
                    onClick={() => handleEditRoom(room)}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Edit Sensor ID"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tagging Status */}
                  {isConnected && (
                    <div
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${status === "critical"
                        ? "bg-red-500/20 text-red-400 border-red-500/50"
                        : status === "warning"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        }`}
                    >
                      {t(status)}
                    </div>
                  )}

                  {/* Indikator Live */}
                  <div
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${isConnected
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                  >
                    {isConnected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    )}
                    {isConnected ? t("Live") : t("Loading")}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/50 mt-2">
                <div className={`grid ${data?.dp1 !== undefined && data?.dp2 !== undefined ? 'grid-cols-2 gap-y-6 gap-x-4' : 'grid-cols-3 gap-4'} items-center`}>
                  {/* Temperature */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                      <Thermometer className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-medium uppercase tracking-wider">Temp</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {data?.temperature ? data.temperature.toFixed(1) : "--"}
                      <span className="text-sm text-slate-500 font-normal ml-0.5">°C</span>
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-medium uppercase tracking-wider">RH</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {data?.relative_humidity ? data.relative_humidity.toFixed(1) : "--"}
                      <span className="text-sm text-slate-500 font-normal ml-0.5">%</span>
                    </div>
                  </div>

                  {/* Differential Pressure */}
                  {data?.dp1 !== undefined && data?.dp2 !== undefined ? (
                    <>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                          <Wind className="w-4 h-4 text-teal-400 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">Differential Pressure 1</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                          {data.dp1 !== null ? data.dp1.toFixed(1) : "--"}
                          <span className="text-sm text-slate-500 font-normal ml-0.5">Pa</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                          <Wind className="w-4 h-4 text-teal-400 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">Differential Pressure 2</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                          {data.dp2 !== null ? data.dp2.toFixed(1) : "--"}
                          <span className="text-sm text-slate-500 font-normal ml-0.5">Pa</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                        <Wind className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">Differential Pressure</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {data?.differential_pressure !== undefined && data?.differential_pressure !== null
                          ? data.differential_pressure.toFixed(1)
                          : "--"}
                        <span className="text-sm text-slate-500 font-normal ml-0.5">Pa</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Edit Sensor ID - {editingRoom}</h3>
            {editingAttributes.length === 0 ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {editingAttributes.map((attr, idx) => (
                  <div key={attr.id} className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize flex justify-between">
                      <span>{attr.target_column.replace('_', ' ')}</span>
                      {attr.room_name !== attr.unit_display_name && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                          {attr.room_name}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={attr.external_log_id || ''}
                      onChange={(e) => {
                        const newVal = [...editingAttributes];
                        newVal[idx].external_log_id = e.target.value;
                        setEditingAttributes(newVal);
                      }}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <button
                onClick={() => setEditingRoom(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRoom}
                disabled={isSaving || editingAttributes.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
