"use client";
import { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import LiveChart from '@/components/dashboard/LiveChart';
import RecentReadings from '@/components/dashboard/RecentReadings';
import AddReadingForm from '@/components/dashboard/AddReadingForm';

export default function Dashboard() {
  // Mock initial data
  const [readings, setReadings] = useState<any[]>([]);

  /* 
  ================================================================================
  [TEMPLATE] INTEGRASI REAL-TIME KE DATABASE POSTGRESQL (Menggunakan React Query)
  ================================================================================
  // 1. Uncomment import ini nanti:
  // import { useQuery } from '@tanstack/react-query';
  
  // 2. Buat fungsi fetcher ke API yang terhubung dengan PostgreSQL (misal: Node.js/Prisma)
  // const fetchLiveSensorData = async () => {
  //   const res = await fetch('/api/sensors/ac-01/readings?limit=20');
  //   if (!res.ok) throw new Error('Gagal mengambil data');
  //   return res.json();
  // };

  // 3. Gunakan useQuery di dalam komponen Dashboard:
  // const { data: dbReadings, isLoading, error } = useQuery({
  //   queryKey: ['sensorData', 'AC-01'],
  //   queryFn: fetchLiveSensorData,
  //   refetchInterval: 5000, // <--- Polling otomatis ke DB setiap 5 detik (Real-time effect)
  // });
  
  // Nanti saat sudah siap, Anda tinggal mengganti 'readings' di bawah 
  // dengan 'dbReadings' yang berasal dari React Query ini.
  ================================================================================
  */

  const getStatus = (temp: number, rh: number, dp: number) => {
    if (temp > 25 || rh > 60 || dp <= 20) return 'critical';
    if (temp > 24 || rh > 59 || dp <= 21) return 'warning';
    return 'normal';
  };

  useEffect(() => {
    const rooms = ['Dispensing 1', 'Dispensing 2', 'Mixing', 'Filling', 'Transfer Plastic Mold', 'WIP'];
    
    // Generate some initial mock data
    const initialData = Array.from({ length: 20 }).map((_, i) => {
      const time = new Date();
      time.setMinutes(time.getMinutes() - (20 - i));
      const temp = 23 + Math.random() * 2.5; // Will cross 24 and 25 occasionally
      const rh = 57 + Math.random() * 4;     // Will cross 59 and 60 occasionally
      const dp = 19 + Math.random() * 4;     // Will cross 21 and 20 occasionally
      return {
        timestamp: time.toISOString(),
        unit_id: rooms[i % rooms.length],
        temperature: temp,
        relative_humidity: rh,
        differential_pressure: dp,
        status: getStatus(temp, rh, dp)
      };
    });
    setReadings(initialData);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setReadings(prev => {
        const temp = 23 + Math.random() * 2.5;
        const rh = 57 + Math.random() * 4;
        const dp = 19 + Math.random() * 4;
        const newData = [...prev.slice(1), {
          timestamp: new Date().toISOString(),
          unit_id: rooms[Math.floor(Math.random() * rooms.length)],
          temperature: temp,
          relative_humidity: rh,
          differential_pressure: dp,
          status: getStatus(temp, rh, dp)
        }];
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAddReading = (data: any) => {
    setReadings(prev => [...prev.slice(1), data]);
  };

  const latest = readings[readings.length - 1] || { temperature: 0, relative_humidity: 0, differential_pressure: 0, status: 'normal' };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">System Dashboard</h1>
        <p className="text-slate-400">Real-time Central AC monitoring and analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Temperature" 
          value={latest.temperature.toFixed(1)} 
          unit="°C" 
          icon={Thermometer} 
          trend="up"
          trendValue="0.2"
          status={latest.temperature > 25 ? 'critical' : latest.temperature > 24 ? 'warning' : 'normal'} 
        />
        <MetricCard 
          title="Humidity" 
          value={latest.relative_humidity.toFixed(1)} 
          unit="%" 
          icon={Droplets} 
          trend="down"
          trendValue="1.5"
          status={latest.relative_humidity > 60 ? 'critical' : latest.relative_humidity > 59 ? 'warning' : 'normal'} 
        />
        <MetricCard 
          title="Differential Pressure" 
          value={latest.differential_pressure.toFixed(1)} 
          unit="Pa" 
          icon={Wind} 
          trend="neutral"
          status={latest.differential_pressure <= 20 ? 'critical' : latest.differential_pressure <= 21 ? 'warning' : 'normal'} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveChart data={readings} />
        </div>
        <div>
          <AddReadingForm onAdd={handleAddReading} />
        </div>
      </div>

      <RecentReadings readings={[...readings].reverse()} />
    </div>
  );
}
