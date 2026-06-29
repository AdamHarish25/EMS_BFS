"use client";
import { format } from 'date-fns';
import React from 'react';
import { ShieldAlert, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const NODE_RED = process.env.NEXT_PUBLIC_NODE_RED_URL || "http://10.165.40.13:1880";

export default function DataTable({ readings, exclusions, dataFilter = 'Semua Data' }: { readings: any[], exclusions: any[], dataFilter?: string }) {
  const { t } = useLanguage();
  const [comments, setComments] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const initialComments: Record<string, string> = {};
    readings.forEach(r => {
      if (r.id && r.comment) {
        initialComments[r.id] = r.comment;
      }
    });
    setComments(initialComments);
  }, [readings]);

  const handleCommentClick = async (id: string, currentValue: number | string, typeName: string) => {
    if (!id) {
      toast.error('Gagal menambah komentar: Data ID tidak valid');
      return;
    }
    const existing = comments[id] || '';
    const newComment = window.prompt(`Berikan komentar untuk anomali ${typeName} (${currentValue}):`, existing);
    if (newComment !== null) {
      const updated = { ...comments };
      if (newComment.trim() === '') {
        delete updated[id];
      } else {
        updated[id] = newComment;
      }
      setComments(updated);

      try {
        const res = await fetch(`${NODE_RED}/api/update-comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, comment: newComment.trim() === '' ? null : newComment.trim() })
        });
        if (!res.ok) {
          throw new Error('Gagal menyimpan ke Node-RED');
        }
        toast.success('Komentar berhasil disimpan');
      } catch (e: any) {
        toast.error(e.message);
        // revert
        setComments(comments);
      }
    }
  };

  const isExcluded = (reading: any) => {
    const readingTime = reading.timestampValue;
    if (!readingTime) return false; // Fallback jika tidak ada timestampValue

    for (let i = 0; i < exclusions.length; i++) {
      const exc = exclusions[i];
      if ((exc.unit_id || '').trim() !== 'All Units' && (exc.unit_id || '').trim() !== (reading.unit_id || '').trim()) continue;
      if (readingTime >= exc.startTime && readingTime <= exc.endTime) {
        const reasonStr = exc.reason || '';
        if (reasonStr.includes('[TAG:Warning/Critical]')) {
          const temp = reading.temperature != null ? Number(reading.temperature) : null;
          const rh = reading.relative_humidity != null ? Number(reading.relative_humidity) : null;
          const dp = reading.dp1 != null ? Number(reading.dp1) : (reading.differential_pressure != null ? Number(reading.differential_pressure) : null);
          const dp2 = reading.dp2 != null ? Number(reading.dp2) : null;

          const isWarningOrCritical =
            (temp != null && temp > 24) ||
            (rh != null && rh > 59) ||
            (dp != null && dp <= 8) ||
            (dp2 != null && dp2 <= 8);

          if (!isWarningOrCritical) {
            continue;
          }
        }
        return true;
      }
    }
    return false;
  };

  const getParamStatus = (type: 'temp' | 'rh' | 'dp', value: number | null | undefined) => {
    if (value === null || value === undefined) return 'normal';
    if (type === 'temp') {
      if (value > 25) return 'critical';
      if (value > 24) return 'warning';
    } else if (type === 'rh') {
      if (value > 60) return 'critical';
      if (value > 59) return 'warning';
    } else if (type === 'dp') {
      if (value <= 5) return 'critical';
      if (value <= 8) return 'warning';
    }
    return 'normal';
  };

  const renderCell = (type: 'temp' | 'rh' | 'dp', value: number | null | undefined, readingId?: string) => {
    const status = getParamStatus(type, value);
    let colorClass = 'text-slate-600 dark:text-slate-300';
    let isAnomalous = false;

    if (status === 'critical') {
      colorClass = 'text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 rounded px-2 py-0.5 inline-block cursor-pointer hover:bg-rose-500/20 transition-colors';
      isAnomalous = true;
    } else if (status === 'warning') {
      colorClass = 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 inline-block cursor-pointer hover:bg-amber-500/20 transition-colors';
      isAnomalous = true;
    }

    const typeName = type === 'temp' ? 'Suhu' : type === 'rh' ? 'Kelembapan' : 'Differential Pressure';
    const commentKey = readingId;
    const hasComment = commentKey && comments[commentKey];

    return (
      <div className="flex items-center gap-2">
        <span
          className={colorClass}
          onClick={() => {
            if (isAnomalous && commentKey) {
              handleCommentClick(commentKey, value != null ? value.toFixed(1) : '--', typeName);
            }
          }}
          title={isAnomalous ? "Klik untuk menambah komentar" : ""}
        >
          {value != null ? value.toFixed(1) : '--'}
        </span>
        {hasComment && isAnomalous && (
          <div className="group relative flex items-center">
            <MessageSquare className="w-4 h-4 text-blue-500 cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-50 whitespace-normal">
              {comments[commentKey]}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const groupReadings = (raw: any[]) => {
    const map = new Map<string, any>();
    const results: any[] = [];

    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const rawUnit = (r.unit_id || '').trim();
      let baseUnit = rawUnit;
      let isDp1 = false;
      let isDp2 = false;

      if (rawUnit.match(/(- DP 1| DP-1)$/i)) {
        baseUnit = rawUnit.replace(/(- DP 1| DP-1)$/i, '');
        isDp1 = true;
      } else if (rawUnit.match(/(- DP 2| DP-2)$/i)) {
        baseUnit = rawUnit.replace(/(- DP 2| DP-2)$/i, '');
        isDp2 = true;
      }

      const timeKey = r.jam_asli || r.timestamp || r.timestampValue;
      const key = `${timeKey}_${baseUnit}`;

      let existing = map.get(key);
      if (!existing) {
        existing = { ...r, unit_id: baseUnit, dp1: null, dp2: null };
        if (isDp1 || isDp2) {
          // don't overwrite with 0s if it's just the DP record
          existing.temperature = null;
          existing.relative_humidity = null;
          existing.differential_pressure = null;
        }
        map.set(key, existing);
        results.push(existing);
      }

      if (isDp1) {
        existing.dp1 = r.differential_pressure;
        if (r.status !== 'normal' && existing.status === 'normal') existing.status = r.status;
      } else if (isDp2) {
        existing.dp2 = r.differential_pressure;
        if (r.status !== 'normal' && existing.status === 'normal') existing.status = r.status;
      } else {
        existing.temperature = r.temperature;
        existing.relative_humidity = r.relative_humidity;
        existing.differential_pressure = r.differential_pressure;
        existing.id = r.id;
        // keep the worst status
        if (r.status !== 'normal' || !existing.status) existing.status = r.status;
      }
    }
    return results;
  };

  const allData = groupReadings(readings);

  // Lakukan filter di awal agar bisa menghitung jumlah record yang akurat
  const filteredData = allData.filter(r => {
    const excluded = isExcluded(r);
    if (dataFilter === 'Non-Fumigasi' && excluded) return false;
    if (dataFilter === 'Fumigasi' && !excluded) return false;
    return true;
  });

  return (
    <div id="table-data" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/50">
        <h3 className="font-medium text-slate-700 dark:text-slate-200">{t("Raw Telemetry")}</h3>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">{filteredData.length} {t("Records Shown")}</span>
      </div>
      <div className="overflow-x-auto max-h-[800px] custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/90 sticky top-0 z-30 backdrop-blur-md shadow-md">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">{t("Time")}</th>
              <th className="px-6 py-4 font-semibold tracking-wider">{t("Unit")}</th>
              <th className="px-6 py-4 font-semibold tracking-wider">{t("Temp")}</th>
              <th className="px-6 py-4 font-semibold tracking-wider">{t("RH")}</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Differential Pressure 1 (Pa)</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Differential Pressure 2 (Pa)</th>
              <th className="px-6 py-4 font-semibold tracking-wider text-right">{t("Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-medium">
                  {t("No Activity Logs")} "{dataFilter}".
                </td>
              </tr>
            ) : (() => {
              let lastDateStr = ''; // Untuk menyimpan jejak tanggal terakhir

              return filteredData.map((r, i) => {
                const excluded = isExcluded(r);

                // Ekstrak informasi Tanggal dan Jam
                const rDate = new Date(r.timestamp ?? r.timestamp_start ?? 0);
                const dateStr = format(rDate, 'yyyy-MM-dd');
                const displayDate = format(rDate, 'EEEE, dd MMMM yyyy'); // Cth: Monday, 18 May 2026
                const displayTime = format(rDate, 'HH:mm:ss'); // Cth: 14:30:00

                let dateSeparator = null;

                // Jika tanggal di baris ini beda dengan baris sebelumnya, sisipkan Pemisah!
                if (dateStr !== lastDateStr) {
                  dateSeparator = (
                    <tr key={`header-${dateStr}`} className="bg-white/95 dark:bg-slate-900/95 sticky top-[82px] z-10 backdrop-blur-md shadow-lg border-y border-slate-200 dark:border-slate-700">
                      <td colSpan={7} className="px-6 py-2 text-xs font-bold text-blue-500 uppercase tracking-wider">
                        {displayDate}
                      </td>
                    </tr>
                  );
                  lastDateStr = dateStr;
                }

                return (
                  <React.Fragment key={r.id || i}>
                    {dateSeparator}
                    <tr className={`hover:bg-slate-100 dark:bg-slate-800/40 transition-colors ${excluded ? 'bg-rose-950/20 hover:bg-rose-950/30 opacity-60' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {/* Tampilkan jamnya saja karena tanggalnya sudah ada di header atas */}
                        {r.jam_asli ? r.jam_asli.split(' ')[1].split('+')[0].split('-')[0] : displayTime}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{r.unit_id}</td>
                      <td className="px-6 py-4">
                        {renderCell('temp', r.temperature, r.id)}
                      </td>
                      <td className="px-6 py-4">
                        {renderCell('rh', r.relative_humidity, r.id)}
                      </td>
                      <td className="px-6 py-4">
                        {renderCell('dp', r.dp1 != null ? r.dp1 : r.differential_pressure, r.id)}
                      </td>
                      <td className="px-6 py-4">
                        {renderCell('dp', r.dp2, r.id)}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                        {excluded && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            TMS
                          </span>
                        )}
                        {!excluded && (
                          <span className="text-slate-500 text-[10px] uppercase font-semibold">
                            MS
                          </span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              });
            })()}
          </tbody>

        </table>
      </div>
    </div>
  );
}