"use client";
import { format } from 'date-fns';
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DataTable({ readings, exclusions }: { readings: any[], exclusions: any[] }) {
  const { t } = useLanguage();

  const isExcluded = (reading: any) => {
    const readingTime = reading.timestampValue;
    if (!readingTime) return false; // Fallback jika tidak ada timestampValue

    for (let i = 0; i < exclusions.length; i++) {
      const exc = exclusions[i];
      if ((exc.unit_id || '').trim() !== 'All Units' && (exc.unit_id || '').trim() !== (reading.unit_id || '').trim()) continue;
      if (readingTime >= exc.startTime && readingTime <= exc.endTime) {
        const reasonStr = exc.reason || '';
        if (reasonStr.includes('[TAG:Warning/Critical]') && (reading.status === 'normal' || !reading.status)) {
          continue;
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

    const renderCell = (type: 'temp' | 'rh' | 'dp', value: number | null | undefined) => {
      const status = getParamStatus(type, value);
      let colorClass = 'text-slate-300';

      if (status === 'critical') {
        colorClass = 'text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 rounded px-2 py-0.5 inline-block';
      } else if (status === 'warning') {
        colorClass = 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 inline-block';
      }

      return (
        <span className={colorClass}>
          {value != null ? value.toFixed(1) : '--'}
        </span>
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

        if (rawUnit.endsWith('- DP 1')) {
          baseUnit = rawUnit.replace(' - DP 1', '');
          isDp1 = true;
        } else if (rawUnit.endsWith('- DP 2')) {
          baseUnit = rawUnit.replace(' - DP 2', '');
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

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h3 className="font-medium text-slate-200">{t("Raw Telemetry")}</h3>
          <span className="text-xs font-medium text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">{allData.length} {t("Records Shown")}</span>
        </div>
        <div className="overflow-x-auto max-h-[800px] custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">{t("Time")}</th>
                <th className="px-6 py-4 font-semibold tracking-wider">{t("Unit")}</th>
                <th className="px-6 py-4 font-semibold tracking-wider">{t("Temp")}</th>
                <th className="px-6 py-4 font-semibold tracking-wider">{t("RH")}</th>
                <th className="px-6 py-4 font-semibold tracking-wider">DP 1 / DP</th>
                <th className="px-6 py-4 font-semibold tracking-wider">DP 2</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">{t("Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(() => {
                let lastDateStr = ''; // Untuk menyimpan jejak tanggal terakhir

                return allData.map((r, i) => {
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
                      <tr key={`header-${dateStr}`} className="bg-slate-900/90 sticky top-[48px] z-10 backdrop-blur-md shadow-md border-y border-slate-700/50">
                        <td colSpan={6} className="px-6 py-2.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
                          {displayDate}
                        </td>
                      </tr>
                    );
                    lastDateStr = dateStr;
                  }

                  return (
                    <React.Fragment key={r.id || i}>
                      {dateSeparator}
                      <tr className={`hover:bg-slate-800/40 transition-colors ${excluded ? 'bg-rose-950/20 hover:bg-rose-950/30 opacity-60' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                          {/* Tampilkan jamnya saja karena tanggalnya sudah ada di header atas */}
                          {r.jam_asli ? r.jam_asli.split(' ')[1] : displayTime}
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{r.unit_id}</td>
                        <td className="px-6 py-4">
                          {renderCell('temp', r.temperature)}
                        </td>
                        <td className="px-6 py-4">
                          {renderCell('rh', r.relative_humidity)}
                        </td>
                        <td className="px-6 py-4">
                          {renderCell('dp', r.dp1 != null ? r.dp1 : r.differential_pressure)}
                        </td>
                        <td className="px-6 py-4">
                          {renderCell('dp', r.dp2)}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                          {excluded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              <ShieldAlert className="w-3 h-3" />
                              {t("Excluded")}
                            </span>
                          )}
                          {!excluded && (
                            <span className="text-slate-500 text-[10px] uppercase font-semibold">
                              Recorded
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
