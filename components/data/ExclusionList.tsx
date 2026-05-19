"use client";
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ExclusionList({ exclusions, onDelete }: { exclusions: any[], onDelete: (id: string | string[]) => void }) {
  const { t } = useLanguage();
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
      <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h3 className="font-medium text-slate-200">{t("Active Exclusions")}</h3>
        <span className="text-xs font-medium text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          {Array.from(new Set(exclusions.map(e => `${e.unit_id}-${e.timestamp_start}-${e.timestamp_end}`))).length} TOTAL
        </span>
      </div>

      {exclusions.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          {t("No Active")}
        </div>
      ) : (
        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          {Object.values(
            exclusions.reduce((acc, exc) => {
              const key = `${exc.unit_id}-${exc.timestamp_start}-${exc.timestamp_end}`;
              if (!acc[key]) acc[key] = { ...exc, ids: [exc.id || exc.reading_id] };
              else acc[key].ids.push(exc.id || exc.reading_id);
              return acc;
            }, {} as Record<string, any>)
          ).map((exc: any, i: number) => {
            const excId = exc.ids;
            return (
              <div key={i} className="flex flex-col gap-2 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 w-fit">
                        {exc.unit_id}
                      </span>
                      {exc.reason?.includes('[TAG:Warning/Critical]') ? (
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 w-fit border border-rose-500/20">
                          TMS Only
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 w-fit border border-slate-500/20">
                          Semua Status
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-300 font-medium mt-1">
                      {format(new Date(exc.timestamp_start), 'MMM dd, HH:mm')} - {format(new Date(exc.timestamp_end), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  <button
                    onClick={() => onDelete(excId)}
                    className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all p-2"
                    title={t("Remove Exclusion")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-400 italic">"{exc.reason?.replace(/\[TAG:.*?\]\s*/g, '')}"</p>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[8px] text-slate-400">
                    {exc.excluded_by?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  {exc.excluded_by ?? t("Unknown")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
