"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';

export default function ReportChart({ readings, exclusions }: { readings: any[], exclusions: any[] }) {
  const isExcluded = (reading: any) => {
    return exclusions.some(exc => {
      const excUnit = (exc.unit_id || '').trim();
      const readingUnit = (reading.unit_id || '').trim();
      if (excUnit !== 'All Units' && excUnit !== readingUnit) return false;
      const readingTime = new Date(reading.timestamp).getTime();
      const start = new Date(exc.timestamp_start).getTime();
      const end = new Date(exc.timestamp_end).getTime();
      return readingTime >= start && readingTime <= end;
    });
  };

  const data = readings.map(r => {
    const excluded = isExcluded(r);
    return {
      ...r,
      time: format(new Date(r.timestamp), 'HH:mm'),
      validTemp: excluded ? null : r.temperature,
      excludedTemp: excluded ? r.temperature : null,
      validRH: excluded ? null : r.relative_humidity,
      excludedRH: excluded ? r.relative_humidity : null,
      validDP: excluded ? null : r.differential_pressure,
      excludedDP: excluded ? r.differential_pressure : null,
    };
  });

  return (
    <div className="w-full h-auto overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
      <div style={{ width: '900px', height: '400px' }} className="mx-auto">
        <LineChart width={900} height={350} data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          
          {/* Temperature */}
          <Line isAnimationActive={false} type="monotone" dataKey="validTemp" name="Valid Temp (°C)" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
          <Line isAnimationActive={false} type="monotone" dataKey="excludedTemp" name="Excluded Temp" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 6" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
          
          {/* Relative Humidity */}
          <Line isAnimationActive={false} type="monotone" dataKey="validRH" name="Valid RH (%)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
          <Line isAnimationActive={false} type="monotone" dataKey="excludedRH" name="Excluded RH" stroke="#f43f5e" strokeWidth={2} strokeDasharray="6 6" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
          
          {/* Differential Pressure */}
          <Line isAnimationActive={false} type="monotone" dataKey="validDP" name="Valid DP (Pa)" stroke="#eab308" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
          <Line isAnimationActive={false} type="monotone" dataKey="excludedDP" name="Excluded DP" stroke="#f97316" strokeWidth={2} strokeDasharray="6 6" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
        </LineChart>

        {/* Custom HTML Legend to avoid html2canvas SVG serialization errors */}
        <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>Valid Temp (°C)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-red-500"></div>Excluded Temp</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Valid RH (%)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-rose-500"></div>Excluded RH</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>Valid DP (Pa)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-orange-500"></div>Excluded DP</div>
        </div>
      </div>
    </div>
  );
}
