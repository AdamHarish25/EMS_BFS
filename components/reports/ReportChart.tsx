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

const CustomDot = (props: any) => {
  const { cx, cy, payload, dataKey } = props;
  const value = payload[dataKey];
  let isAlert = false;
  if (dataKey === 'temperature') isAlert = value >= 24;
  if (dataKey === 'relative_humidity') isAlert = value >= 59;
  if (dataKey === 'differential_pressure') isAlert = value <= 8;

  if (isAlert) {
    return (
      <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="none" />
    );
  }
  return null;
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
  const values = data.map(d => Number(d[dataKey]));
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 0;

  let yMin = minVal - (minVal * 0.1);
  let yMax = maxVal + (maxVal * 0.1);

  let threshold = 0;
  let isGreater = true;

  if (dataKey === 'temperature') {
    threshold = 24;
    yMin = Math.min(minVal - 1, 22);
    yMax = Math.max(maxVal + 1, 26);
    isGreater = true;
  } else if (dataKey === 'relative_humidity') {
    threshold = 59;
    yMin = Math.min(minVal - 2, 50);
    yMax = Math.max(maxVal + 2, 65);
    isGreater = true;
  } else if (dataKey === 'differential_pressure') {
    threshold = 8;
    yMin = Math.min(minVal - 2, 0);
    yMax = Math.max(maxVal + 2, 12);
    isGreater = false;
  }

  let percent = (yMax - threshold) / (yMax - yMin);
  percent = Math.max(0, Math.min(1, percent));

  const gradientId = `color-${dataKey}-${title.replace(/\s+/g, '')}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-medium text-slate-800 mb-2">{title}</p>
      <LineChart width={430} height={180} data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {isGreater ? (
              <>
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset={`${percent * 100}%`} stopColor="#ef4444" stopOpacity={1} />
                <stop offset={`${percent * 100}%`} stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset={`${percent * 100}%`} stopColor={color} stopOpacity={1} />
                <stop offset={`${percent * 100}%`} stopColor="#ef4444" stopOpacity={1} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
              </>
            )}
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={[yMin, yMax]}
          allowDataOverflow
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}
          itemStyle={{ color: '#0f172a' }}
          formatter={(value: number) => [`${Number(value).toFixed(2)} ${unit}`, title]}
        />
        <Line
          {...chartCommonProps}
          dataKey={dataKey}
          name={title}
          stroke={`url(#${gradientId})`}
          connectNulls={false}
          dot={<CustomDot dataKey={dataKey} />}
        />
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
            <MetricChart title="Relative Humidity" unit="%" color="#3b82f6" data={validData} dataKey="relative_humidity" />
            <MetricChart title="Differential Pressure" unit="Pa" color="#3b82f6" data={validData} dataKey="differential_pressure" />
          </div>
        </div>

        <div>
          <p className="text-base font-semibold text-rose-400 mb-3">Fumigation</p>
          <div className="grid grid-cols-2 gap-3">
            <MetricChart title="Temperature" unit="°C" color="#3b82f6" data={excludedData} dataKey="temperature" />
            <MetricChart title="Relative Humidity" unit="%" color="#3b82f6" data={excludedData} dataKey="relative_humidity" />
            <MetricChart title="Differential Pressure" unit="Pa" color="#3b82f6" data={excludedData} dataKey="differential_pressure" />
          </div>
        </div>
      </div>
    </div>
  );
}
