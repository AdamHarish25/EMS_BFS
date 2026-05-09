"use client";
import { useState, useEffect } from 'react';
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

    // Generate mock data
    const mockReadings = Array.from({ length: 60 }).map((_, i) => {
      const time = new Date();
      time.setMinutes(time.getMinutes() - (60 - i) * 10);
      const temp = 23 + Math.random() * 1.5; 
      const rh = 57 + Math.random() * 2.5;     
      const dp = 21.5 + Math.random() * 2;
      return {
        id: `r-${i}`,
        timestamp: time.toISOString(),
        unit_id: 'AC-01',
        temperature: temp,
        relative_humidity: rh,
        differential_pressure: dp,
        status: 'normal'
      };
    });
    
    // Create an anomaly bump for the excluded part
    mockReadings.forEach((r, i) => {
      if (i > 20 && i < 30) {
        r.temperature += 1.5; // Spike Temp to > 25
        r.relative_humidity += 2.0; // Spike RH to > 60
        r.differential_pressure -= 2.5; // Drop DP to < 20
      }
      r.status = getStatus(r.temperature, r.relative_humidity, r.differential_pressure);
    });

    setReadings(mockReadings);
    
    // Mock exclusions (excluding the anomaly spike)
    const startAnomaly = new Date(mockReadings[20].timestamp);
    const endAnomaly = new Date(mockReadings[30].timestamp);

    setExclusions([{
      id: 'exc-1',
      unit_id: 'AC-01',
      timestamp_start: startAnomaly.toISOString(),
      timestamp_end: endAnomaly.toISOString(),
      reason: 'Temperature sensor malfunction (Spike anomaly)'
    }]);
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
