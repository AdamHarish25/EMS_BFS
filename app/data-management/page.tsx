"use client";
import { useState, useEffect } from 'react';
import ExclusionForm from '@/components/data/ExclusionForm';
import ExclusionList from '@/components/data/ExclusionList';
import DataTable from '@/components/data/DataTable';

export default function DataManagementPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);

  useEffect(() => {
    const getStatus = (temp: number, rh: number, dp: number) => {
      if (temp > 25 || rh > 60 || dp <= 20) return 'critical';
      if (temp > 24 || rh > 59 || dp <= 21) return 'warning';
      return 'normal';
    };

    // Generate some mock data for readings
    const mockReadings = Array.from({ length: 50 }).map((_, i) => {
      const time = new Date();
      time.setMinutes(time.getMinutes() - (50 - i) * 15); // 15 min intervals
      const temp = 23 + Math.random() * 2.5; 
      const rh = 57 + Math.random() * 4;     
      const dp = 19 + Math.random() * 4;
      return {
        id: `r-${i}`,
        timestamp: time.toISOString(),
        unit_id: 'AC-01',
        temperature: temp,
        relative_humidity: rh,
        differential_pressure: dp,
        status: getStatus(temp, rh, dp)
      };
    });
    setReadings(mockReadings.reverse());
    
    // Mock exclusions
    const pastTime = new Date();
    pastTime.setHours(pastTime.getHours() - 3);
    const pastTimeEnd = new Date();
    pastTimeEnd.setHours(pastTimeEnd.getHours() - 1);
    
    setExclusions([{
      id: 'exc-1',
      unit_id: 'AC-01',
      timestamp_start: pastTime.toISOString(),
      timestamp_end: pastTimeEnd.toISOString(),
      reason: 'Scheduled maintenance and sensor calibration',
      excluded_by: 'admin@base44.io'
    }]);
  }, []);

  const handleAddExclusion = (data: any) => {
    setExclusions(prev => [data, ...prev]);
  };

  const handleDeleteExclusion = (id: string) => {
    setExclusions(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Data Management</h1>
        <p className="text-slate-400">Manage data exclusions and view raw sensor telemetry.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <ExclusionForm onAddExclusion={handleAddExclusion} />
          <ExclusionList exclusions={exclusions} onDelete={handleDeleteExclusion} />
        </div>
        <div className="lg:col-span-2">
          <DataTable readings={readings} exclusions={exclusions} />
        </div>
      </div>
    </div>
  );
}
