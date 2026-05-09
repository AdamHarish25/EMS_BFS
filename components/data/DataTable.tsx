"use client";
import { format } from 'date-fns';
import { ShieldAlert } from 'lucide-react';

export default function DataTable({ readings, exclusions }: { readings: any[], exclusions: any[] }) {
  
  const isExcluded = (reading: any) => {
    return exclusions.some(exc => {
      if (exc.unit_id !== 'All Units' && exc.unit_id !== reading.unit_id) return false;
      const readingTime = new Date(reading.timestamp).getTime();
      const start = new Date(exc.timestamp_start).getTime();
      const end = new Date(exc.timestamp_end).getTime();
      return readingTime >= start && readingTime <= end;
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
      <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h3 className="font-medium text-slate-200">Raw Sensor Telemetry</h3>
        <span className="text-xs font-medium text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">{readings.length} records shown</span>
      </div>
      <div className="overflow-x-auto max-h-[800px] custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">Timestamp</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Unit ID</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Temp (°C)</th>
              <th className="px-6 py-4 font-semibold tracking-wider">RH (%)</th>
              <th className="px-6 py-4 font-semibold tracking-wider">DP (Pa)</th>
              <th className="px-6 py-4 font-semibold tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {readings.map((r, i) => {
              const excluded = isExcluded(r);
              return (
                <tr key={r.id || i} className={`hover:bg-slate-800/40 transition-colors ${excluded ? 'opacity-40 bg-rose-950/10 hover:bg-rose-950/20' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                    {format(new Date(r.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">{r.unit_id}</td>
                  <td className="px-6 py-4 text-slate-300">{r.temperature.toFixed(1)}</td>
                  <td className="px-6 py-4 text-slate-300">{r.relative_humidity.toFixed(1)}</td>
                  <td className="px-6 py-4 text-slate-300">{r.differential_pressure.toFixed(1)}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                    {excluded && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        <ShieldAlert className="w-3 h-3" />
                        Excluded
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border tracking-wider
                      ${r.status === 'normal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        r.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
