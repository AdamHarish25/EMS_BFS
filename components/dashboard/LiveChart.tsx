"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface DataPoint {
  timestamp: string;
  temperature: number;
  differential_pressure: number;
  relative_humidity: number;
}

export default function LiveChart({ data }: { data: DataPoint[] }) {
  const { t } = useLanguage();
  const formattedData = data
    .filter(d => {
      // Hanya tampilkan baris yang punya timestamp valid dan nilai sensor
      if (!d.timestamp) return false;
      const t = new Date(d.timestamp);
      return !isNaN(t.getTime()) && d.temperature != null;
    })
    .map(d => ({
      ...d,
      time: format(new Date(d.timestamp), 'HH:mm:ss')
    }));

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 h-[400px] w-full">
      <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        {t("Live Trends")}
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            <Line isAnimationActive={false} type="monotone" dataKey="temperature" name={t("Temp")} stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="relative_humidity" name={t("RH")} stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="differential_pressure" name={t("DP")} stroke="#eab308" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
