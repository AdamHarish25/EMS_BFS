import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'normal' | 'warning' | 'critical';
  trendValue?: string;
}

export default function MetricCard({ title, value, unit, icon: Icon, trend, status = 'normal', trendValue }: MetricCardProps) {
  const statusColors = {
    normal: 'bg-green-500/20 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
    critical: 'bg-red-500/20 text-red-400 border-red-500/20',
  };

  const statusGlow = {
    normal: 'shadow-[0_0_15px_rgba(34,197,94,0.1)]',
    warning: 'shadow-[0_0_15px_rgba(234,179,8,0.1)]',
    critical: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]',
  };

  return (
    <div className={`p-6 rounded-2xl bg-slate-900 border border-slate-800 ${statusGlow[status]} flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${statusColors[status]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-slate-400 font-medium">{title}</h3>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status].split(' ')[0]} ${status === 'critical' ? 'animate-pulse' : ''}`} />
      </div>
      
      <div className="mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-slate-50 tracking-tight">{value}</span>
          <span className="text-lg text-slate-500 font-medium">{unit}</span>
        </div>
        
        {trendValue && (
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className={trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-slate-400'}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '-'} {trendValue}
            </span>
            <span className="text-slate-600">vs last hour</span>
          </div>
        )}
      </div>
    </div>
  );
}
