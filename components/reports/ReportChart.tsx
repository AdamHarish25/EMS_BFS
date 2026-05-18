"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';
type Reading = {
  timestamp: string;
  temperature: number;
  relative_humidity: number;
  differential_pressure: number;
};

const chartCommonProps = {
  isAnimationActive: false,
  type: 'monotone' as const,
  strokeWidth: 2,
  dot: false,
  activeDot: { r: 3, strokeWidth: 0 },
};

function MetricChart({
  title,
  unit,
  color,
  data,
  dataKey
}: {
  title: string;
  unit: string;
  color: string;
  data: any[];
  dataKey: 'temperature' | 'relative_humidity' | 'differential_pressure';
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
      <p className="text-sm font-medium text-slate-200 mb-2">{title}</p>
      <LineChart width={430} height={180} data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px' }}
          itemStyle={{ color: '#f8fafc' }}
          formatter={(value: number) => [`${Number(value).toFixed(2)} ${unit}`, title]}
        />
        <Line {...chartCommonProps} dataKey={dataKey} name={title} stroke={color} connectNulls={false} />
      </LineChart>
    </div>
  );
}

export default function ReportChart({
  validReadings,
  excludedReadings
}: {
  validReadings: Reading[];
  excludedReadings: Reading[];
}) {
  const toMetricData = (source: Reading[]) =>
    source.map(r => ({
      time: format(new Date(r.timestamp), 'HH:mm'),
      temperature: Number(r.temperature),
      relative_humidity: Number(r.relative_humidity),
      differential_pressure: Number(r.differential_pressure),
    }));

  const validData = toMetricData(validReadings);
  const excludedData = toMetricData(excludedReadings);

  return (
    <div className="w-full h-auto overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
      <div style={{ width: '940px' }} className="mx-auto space-y-5">
        <div>
          <p className="text-base font-semibold text-emerald-400 mb-3">Non-Fumigation</p>
          <div className="grid grid-cols-2 gap-3">
            <MetricChart title="Temperature" unit="°C" color="#3b82f6" data={validData} dataKey="temperature" />
            <MetricChart title="Relative Humidity" unit="%" color="#10b981" data={validData} dataKey="relative_humidity" />
            <MetricChart title="Differential Pressure" unit="Pa" color="#eab308" data={validData} dataKey="differential_pressure" />
          </div>
        </div>

        <div>
          <p className="text-base font-semibold text-rose-400 mb-3">Fumigation</p>
          <div className="grid grid-cols-2 gap-3">
            <MetricChart title="Temperature" unit="°C" color="#ef4444" data={excludedData} dataKey="temperature" />
            <MetricChart title="Relative Humidity" unit="%" color="#f43f5e" data={excludedData} dataKey="relative_humidity" />
            <MetricChart title="Differential Pressure" unit="Pa" color="#f97316" data={excludedData} dataKey="differential_pressure" />
          </div>
        </div>
      </div>
    </div>
  );
}
