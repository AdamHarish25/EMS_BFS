"use client";
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function AddReadingForm({ onAdd }: { onAdd: (data: any) => void }) {
  const [formData, setFormData] = useState({
    unit_id: 'AC-01',
    temperature: '',
    relative_humidity: '',
    differential_pressure: '',
    status: 'normal'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      temperature: Number(formData.temperature),
      relative_humidity: Number(formData.relative_humidity),
      differential_pressure: Number(formData.differential_pressure),
      timestamp: new Date().toISOString()
    });
    setFormData(prev => ({ ...prev, temperature: '', relative_humidity: '', differential_pressure: '' }));
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 w-full">
      <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
          <Plus className="w-4 h-4" />
        </div>
        Manual Entry
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Unit ID</label>
            <select 
              value={formData.unit_id} 
              onChange={e => setFormData({...formData, unit_id: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="AC-01">AC-01</option>
              <option value="AC-02">AC-02</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="normal">Normal</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Temp (°C)</label>
            <input 
              required type="number" step="0.1" 
              value={formData.temperature} 
              onChange={e => setFormData({...formData, temperature: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="22.5"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">RH (%)</label>
            <input 
              required type="number" step="0.1" 
              value={formData.relative_humidity} 
              onChange={e => setFormData({...formData, relative_humidity: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="45.0"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">DP (Pa)</label>
            <input 
              required type="number" step="0.1" 
              value={formData.differential_pressure} 
              onChange={e => setFormData({...formData, differential_pressure: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="12.5"
            />
          </div>
        </div>
        <button 
          type="submit" 
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] mt-4"
        >
          Add Reading
        </button>
      </form>
    </div>
  );
}
