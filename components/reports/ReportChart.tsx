"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
type Reading = {
  timestamp: string;
  temperature: number;
  relative_humidity: number;
  differential_pressure: number;
  dp1?: number | null;
  dp2?: number | null;
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
  if (dataKey === 'differential_pressure' || dataKey === 'dp2') isAlert = value <= 8;

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
  dataKey: 'temperature' | 'relative_humidity' | 'differential_pressure' | 'dp2';
}) {
  const values = data
    .filter(d => d[dataKey] !== null && d[dataKey] !== undefined)
    .map(d => Number(d[dataKey]))
    .filter(v => !isNaN(v) && v !== 0);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 0;

  let yMin = minVal - (minVal * 0.1);
  let yMax = maxVal + (maxVal * 0.1);

  let threshold = 0;
  let isGreater = true;
  let warningLimit = 0;
  let criticalLimit = 0;

  if (dataKey === 'temperature') {
    threshold = 24;
    warningLimit = 24;
    criticalLimit = 25;
    yMin = Math.min(minVal - 1, 22);
    yMax = Math.max(maxVal + 1, 27);
    isGreater = true;
  } else if (dataKey === 'relative_humidity') {
    threshold = 59;
    warningLimit = 59;
    criticalLimit = 60;
    yMin = Math.min(minVal - 2, 50);
    yMax = Math.max(maxVal + 2, 65);
    isGreater = true;
  } else if (dataKey === 'differential_pressure' || dataKey === 'dp2') {
    threshold = 8;
    warningLimit = 8;
    criticalLimit = 5;
    yMin = Math.min(minVal - 2, 0);
    yMax = Math.max(maxVal + 2, 12);
    isGreater = false;
  }

  // Membuat yMin dan yMax menjadi kelipatan 5 (0, 5, 10, 15, dst) agar mudah dibaca
  const step = 5;
  yMin = Math.floor(yMin / step) * step;
  yMax = Math.ceil(yMax / step) * step;
  
  const ticks = [];
  for (let i = yMin; i <= yMax; i += step) {
    ticks.push(i);
  }

  let percent = 0;
  if (maxVal === minVal) {
    if (isGreater) {
      percent = maxVal >= threshold ? 1 : 0;
    } else {
      percent = maxVal <= threshold ? 0 : 1;
    }
  } else {
    percent = (maxVal - threshold) / (maxVal - minVal);
  }
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
        <CartesianGrid strokeDasharray="3 3" stroke="black" vertical={true} />
        <XAxis 
          dataKey="time" 
          stroke="#475569" 
          fontSize={12} 
          fontWeight={500}
          tickLine={true} 
          axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} 
        />
        <YAxis
          stroke="#475569"
          fontSize={12}
          fontWeight={500}
          tickLine={true}
          axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
          domain={[yMin, yMax]}
          ticks={ticks}
          allowDataOverflow
        />
        <ReferenceLine
          y={warningLimit}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{ position: isGreater ? 'insideBottomLeft' : 'insideTopLeft', value: 'Waspada', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }}
        />
        <ReferenceLine
          y={criticalLimit}
          stroke="#ef4444"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{ position: isGreater ? 'insideTopLeft' : 'insideBottomLeft', value: 'Tindakan', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
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
  excludedReadings,
  excludedParams = { temp: false, rh: false, dp: false }
}: {
  validReadings: Reading[];
  excludedReadings: Reading[];
  excludedParams?: { temp: boolean; rh: boolean; dp: boolean };
}) {
  const toMetricData = (source: Reading[]) =>
    source.map(r => ({
      time: format(new Date(r.timestamp), 'HH:mm'),
      temperature: Number(r.temperature),
      relative_humidity: Number(r.relative_humidity),
      differential_pressure: r.dp1 != null ? Number(r.dp1) : Number(r.differential_pressure),
      dp2: r.dp2 != null ? Number(r.dp2) : null,
    }));

  const validData = toMetricData(validReadings);
  const excludedData = toMetricData(excludedReadings);

  const hasDp2Valid = validData.some(d => d.dp2 !== null);
  const hasDp2Excluded = excludedData.some(d => d.dp2 !== null);

  return (
    <div className="w-full h-auto overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
      <div style={{ width: '940px' }} className="mx-auto space-y-5">
        <div>
          <p className="text-base font-semibold text-emerald-400 mb-3">Non-Fumigation</p>
          <div className="grid grid-cols-2 gap-3">
            {!excludedParams.temp && (
              <MetricChart title="Temperature" unit="°C" color="#3b82f6" data={validData} dataKey="temperature" />
            )}
            {!excludedParams.rh && (
              <MetricChart title="Relative Humidity" unit="%" color="#3b82f6" data={validData} dataKey="relative_humidity" />
            )}
            {!excludedParams.dp && (
              <>
                <MetricChart title={hasDp2Valid ? "Differential Pressure 1" : "Differential Pressure"} unit="Pa" color="#3b82f6" data={validData} dataKey="differential_pressure" />
                {hasDp2Valid && (
                  <MetricChart title="Differential Pressure 2" unit="Pa" color="#3b82f6" data={validData} dataKey="dp2" />
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <p className="text-base font-semibold text-rose-400 mb-3">Fumigation</p>
          <div className="grid grid-cols-2 gap-3">
            {!excludedParams.temp && (
              <MetricChart title="Temperature" unit="°C" color="#3b82f6" data={excludedData} dataKey="temperature" />
            )}
            {!excludedParams.rh && (
              <MetricChart title="Relative Humidity" unit="%" color="#3b82f6" data={excludedData} dataKey="relative_humidity" />
            )}
            {!excludedParams.dp && (
              <>
                <MetricChart title={hasDp2Excluded ? "Differential Pressure 1" : "Differential Pressure"} unit="Pa" color="#3b82f6" data={excludedData} dataKey="differential_pressure" />
                {hasDp2Excluded && (
                  <MetricChart title="Differential Pressure 2" unit="Pa" color="#3b82f6" data={excludedData} dataKey="dp2" />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
