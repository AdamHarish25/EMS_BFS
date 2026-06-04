"use client";
import { useState, useMemo, useEffect } from "react";
import { Thermometer, Droplets, Wind } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

  // Polling latest reading untuk SEMUA ruangan
  useEffect(() => {
    // Fetch rooms on mount and listen for new room events
    fetchRooms();
    const handleRoomAdded = () => {
      fetchRooms();
    };
    window.addEventListener("ems-room-added", handleRoomAdded);

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

          let dp1 = null;
          let dp2 = null;

          if (
            roomName === "Filling" ||
            roomName === "Transfer Plastic Moulding"
          ) {
            const resDp1 = await fetch(
              `/api/latest-reading?unit_id=${encodeURIComponent(roomName + " - DP 1")}`,
            );
            if (resDp1.ok) {
              const dp1Data = await resDp1.json();
              dp1 = dp1Data?.differential_pressure ?? null;
            }

            const resDp2 = await fetch(
              `/api/latest-reading?unit_id=${encodeURIComponent(roomName + " - DP 2")}`,
            );
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
      window.removeEventListener("ems-room-added", handleRoomAdded);
    };
  }, [roomList]); // Refresh polling when room list changes

  // Fetch all rooms from API
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

  // Hitung KPI
  const totalRooms = roomList.length;
  const activeRooms = Object.values(realtimeData).filter(d => !!d).length;
  const criticalRooms = Object.values(realtimeData).filter(d => d && d.status === 'critical').length;
  const warningRooms = Object.values(realtimeData).filter(d => d && d.status === 'warning').length;

  useEffect(() => {
    // Broadcast status to the sidebar for instant visual sync
    window.dispatchEvent(new CustomEvent('ems-system-status', { detail: { isOnline: activeRooms > 0 } }));
  }, [activeRooms]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
        {roomList.map((room) => {
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
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{room}</h3>

                <div className="flex items-center gap-2">
                  {/* Tagging Status */}
                  {isConnected && (
                    <div
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
                        status === "critical"
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
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                      isConnected
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
    </div>
  );
}
