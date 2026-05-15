import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RecentReadings({ readings }: { readings: any[] }) {
  const { t } = useLanguage();
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 w-full overflow-hidden">
      <h3 className="text-lg font-medium text-slate-200 mb-6">{t("Recent Readings")}</h3>
      <div className="overflow-x-auto overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="text-xs uppercase bg-slate-800/80 text-slate-300 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">{t("Time")}</th>
              <th className="px-4 py-3">{t("Unit")}</th>
              <th className="px-4 py-3">{t("Temp")}</th>
              <th className="px-4 py-3">{t("RH")}</th>
              <th className="px-4 py-3">{t("DP")}</th>
              <th className="px-4 py-3 rounded-tr-lg">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-300">
                  {format(new Date(reading.timestamp), 'HH:mm:ss')}
                </td>
                <td className="px-4 py-3">{reading.unit_id}</td>
                <td className="px-4 py-3">{reading.temperature.toFixed(1)}</td>
                <td className="px-4 py-3">{reading.relative_humidity.toFixed(1)}</td>
                <td className="px-4 py-3">{reading.differential_pressure.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    reading.status === 'normal' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    reading.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {reading.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {readings.length === 0 && (
          <div className="text-center py-8 text-slate-500">{t("No Recent")}</div>
        )}
      </div>
    </div>
  );
}
