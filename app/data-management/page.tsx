"use client";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ExclusionForm from '@/components/data/ExclusionForm';
import ExclusionList from '@/components/data/ExclusionList';
import DataTable from '@/components/data/DataTable';

export default function DataManagementPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);

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
      if (temp > 25 || rh > 60 || dp <= 20) return 'critical';
      if (temp > 24 || rh > 59 || dp <= 21) return 'warning';
      return 'normal';
    };

    const fetchData = async () => {
      try {
        const response = await fetch('/api/sensor-readings');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const dataArray = Array.isArray(data) ? data : [];
        const formattedData = dataArray.map((item: any, i: number) => {
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
            id: item.id || `r-${i}`,
            unit_id: typeof item.unit_id === 'string' ? item.unit_id.trim() : item.unit_id,
            timestamp: parsedTime.toISOString(),
            jam_asli: format(parsedTime, 'yyyy-MM-dd HH:mm:ssx'),
            status: (typeof item.status === 'string' ? item.status.trim().toLowerCase() : item.status) || getStatus(item.temperature, item.relative_humidity, item.differential_pressure)
          };
        });
        setReadings(formattedData.reverse());
      } catch (error) {
        console.error('Error fetching management data:', error);
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

  const handleAddExclusion = (data: any) => {
    // Re-fetch exclusions from the API so it reflects what was saved
    fetchExclusions();
  };

  const handleDeleteExclusion = async (id: string) => {
    try {
      await fetch('/api/exclusions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchExclusions();
    } catch (error) {
      console.error('Gagal menghapus exclusion:', error);
    }
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
