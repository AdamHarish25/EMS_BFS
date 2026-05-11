"use client";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ReportGenerator from '@/components/reports/ReportGenerator';

export default function ReportsPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);

  useEffect(() => {
    const getStatus = (temp: number, rh: number, dp: number) => {
      if (temp > 25 || rh > 60 || dp <= 20) return 'critical';
      if (temp > 24 || rh > 59 || dp <= 21) return 'warning';
      return 'normal';
    };

    const fetchData = async () => {
      try {
        const response = await fetch('http://10.165.40.127:1880/api/ems-bfs');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        
        // Normalize data to array
        const dataArray = Array.isArray(data) ? data : (data.data ? data.data : [data]);
        
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
            status: (typeof item.status === 'string' ? item.status.trim().toLowerCase() : item.status) || getStatus(item.temperature, item.relative_humidity, item.differential_pressure)
          };
        });
        
        setReadings(formattedData);
        
        // Mock exclusions (adjust as needed if API provides exclusions later)
        if (formattedData.length >= 31) {
          const startAnomaly = new Date(formattedData[20].timestamp);
          const endAnomaly = new Date(formattedData[30].timestamp);

          setExclusions([{
            id: 'exc-1',
            unit_id: 'AC-01',
            timestamp_start: startAnomaly.toISOString(),
            timestamp_end: endAnomaly.toISOString(),
            reason: 'Temperature sensor malfunction (Spike anomaly)'
          }]);
        } else {
          setExclusions([]);
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      }
    };

    fetchData();
    
    // Poll every 5 seconds for real-time reporting updates
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">System Reports</h1>
        <p className="text-slate-400">Generate and export performance reports.</p>
      </div>
      
      <ReportGenerator readings={readings} exclusions={exclusions} />
    </div>
  );
}
