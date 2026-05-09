"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

export default function ReportChart({ readings, exclusions }: { readings: any[], exclusions: any[] }) {
  const isExcluded = (reading: any) => {
    return exclusions.some(exc => {
      if (exc.unit_id !== 'All Units' && exc.unit_id !== reading.unit_id) return false;
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
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
          
          {/* Temperature */}
          <Line type="monotone" dataKey="validTemp" name="Valid Temp (°C)" stroke="#3b82f6" strokeWidth={3} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="excludedTemp" name="Excluded Temp" stroke="#ef4444" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4, fill: '#ef4444' }} connectNulls={false} />
          
          {/* Relative Humidity */}
          <Line type="monotone" dataKey="validRH" name="Valid RH (%)" stroke="#10b981" strokeWidth={3} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="excludedRH" name="Excluded RH" stroke="#f43f5e" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4, fill: '#f43f5e' }} connectNulls={false} />
          
          {/* Differential Pressure */}
          <Line type="monotone" dataKey="validDP" name="Valid DP (Pa)" stroke="#eab308" strokeWidth={3} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="excludedDP" name="Excluded DP" stroke="#f97316" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4, fill: '#f97316' }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
