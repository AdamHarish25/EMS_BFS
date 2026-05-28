"use client";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ReportGenerator from '@/components/reports/ReportGenerator';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReportsPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const { t } = useLanguage();

  const fetchExclusions = async () => {
    try {
      const res = await fetch('/api/get-exclusions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExclusions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Gagal sinkron data exclusions:', error);
    }
  };

  useEffect(() => {
    const getStatus = (temp: number, rh: number, dp: number) => {
      if (temp > 25 || rh > 60 || dp <= 5) return 'critical';
      if (temp > 24 || rh > 59 || dp <= 8) return 'warning';
      return 'normal';
    };

    const fetchData = async () => {
      try {
        const response = await fetch('/api/sensor-readings');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const dataArray = Array.isArray(data) ? data : [];
        const formattedData = dataArray.map((item: any) => {
          const rawTime = item.jam_asli || item.timestamp || new Date().toISOString();
          let parsedTime = new Date();
          if (typeof rawTime === 'number' || !isNaN(Number(rawTime))) {
            const tsStr = String(rawTime);
            parsedTime = new Date(Number(rawTime) * (tsStr.length <= 10 ? 1000 : 1));
          } else {
            parsedTime = new Date(rawTime);
          }
          return {
            ...item,
            unit_id: typeof item.unit_id === 'string' ? item.unit_id.trim() : item.unit_id,
            timestamp: parsedTime.toISOString(),
            jam_asli: format(parsedTime, 'yyyy-MM-dd HH:mm:ssx'),
            status: (typeof item.status === 'string' ? item.status.trim().toLowerCase() : item.status)
          };
        });
        setReadings(formattedData);
      } catch (error) {
        console.error('Error fetching report data:', error);
      }
    };

    fetchData();
    fetchExclusions();

    // Poll every 5 seconds for real-time reporting updates
    const interval = setInterval(() => {
      fetchData();
      fetchExclusions();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{t("System Reports")}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t("Generate Reports")}</p>
      </div>

      <ReportGenerator readings={readings} exclusions={exclusions} />
    </div>
  );
}
