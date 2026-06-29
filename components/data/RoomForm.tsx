"use client";
import { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Attribute {
  id: string;
  name: string;
  externalLogId: string;
  targetColumn: string;
  required: boolean;
  deletable: boolean;
}

export default function RoomForm({ onAddRoom }: { onAddRoom?: (data: any) => void }) {
  const { t } = useLanguage();
  const [roomName, setRoomName] = useState('');
  const [line, setLine] = useState('');
  const [status, setStatus] = useState('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [attributes, setAttributes] = useState<Attribute[]>([
    { id: 'temp', name: 'Temperature', externalLogId: '', targetColumn: 'temperature', required: true, deletable: false },
    { id: 'rh', name: 'Relative Humidity', externalLogId: '', targetColumn: 'relative_humidity', required: true, deletable: false },
    { id: 'dp1', name: 'Differential Pressure 1', externalLogId: '', targetColumn: 'differential_pressure', required: true, deletable: false }
  ]);

  const getGeneratedName = (attr: Attribute, currentRoomName: string, allAttrs: Attribute[]) => {
    if (!currentRoomName) return '[Room Name]';

    const tempCount = allAttrs.filter(a => a.targetColumn === 'temperature').length;
    const rhCount = allAttrs.filter(a => a.targetColumn === 'relative_humidity').length;
    const dpCount = allAttrs.filter(a => a.targetColumn === 'differential_pressure').length;

    if (tempCount > 1 || rhCount > 1 || dpCount > 1) {
      if (attr.targetColumn === 'temperature' || attr.targetColumn === 'relative_humidity') {
        if (tempCount === 1 && rhCount === 1) {
          return `${currentRoomName}`;
        }

        if (attr.targetColumn === 'temperature') {
          if (tempCount === 1) return `${currentRoomName}`;
          const tIndex = allAttrs.filter(a => a.targetColumn === 'temperature').findIndex(a => a.id === attr.id) + 1;
          return `${currentRoomName} T-${tIndex}`;
        }
        if (attr.targetColumn === 'relative_humidity') {
          if (rhCount === 1) return `${currentRoomName}`;
          const rIndex = allAttrs.filter(a => a.targetColumn === 'relative_humidity').findIndex(a => a.id === attr.id) + 1;
          return `${currentRoomName} RH-${rIndex}`;
        }
      } else if (attr.targetColumn === 'differential_pressure') {
        if (dpCount === 1) return `${currentRoomName}`;
        const dIndex = allAttrs.filter(a => a.targetColumn === 'differential_pressure').findIndex(a => a.id === attr.id) + 1;
        return `${currentRoomName} DP-${dIndex}`;
      }
    }

    return currentRoomName;
  };

  const addDifferentialPressure = () => {
    const dpCount = attributes.filter(attr => attr.targetColumn === 'differential_pressure').length;
    const newId = `dp${attributes.length + 1}`;
    setAttributes([
      ...attributes,
      {
        id: newId,
        name: `New Parameter ${dpCount + 1}`,
        externalLogId: '',
        targetColumn: 'differential_pressure',
        required: false,
        deletable: true
      }
    ]);
  };

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter(attr => attr.id !== id));
  };

  const updateAttribute = (id: string, field: keyof Attribute, value: string) => {
    setAttributes(attributes.map(attr =>
      attr.id === id ? { ...attr, [field]: value } : attr
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!roomName || !line) {
      toast.error(t("All Fields Required"));
      return;
    }

    // Validate required attributes
    for (const attr of attributes) {
      if (attr.required && (!attr.externalLogId || !attr.targetColumn)) {
        toast.error(`Please fill in all required fields for ${attr.name}`);
        return;
      }
    }

    const rooms = attributes.map(attr => {
      const generatedName = getGeneratedName(attr, roomName, attributes);

      return {
        external_log_id: Number(attr.externalLogId),
        room_name: generatedName,
        target_column: attr.targetColumn,
        unit_display_name: generatedName,
        line: line,
        status: status
      };
    });

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/add-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Failed Add Room"));

      toast.success(data.message || t("Success Add Room"));
      if (onAddRoom) onAddRoom(data.data);
      // Dispatch custom event to refresh dashboard
      window.dispatchEvent(new CustomEvent("ems-room-added"));

      // Reset form
      setRoomName('');
      setLine('');
      setStatus('Active');
      setAttributes([
        { id: 'temp', name: 'Temperature', externalLogId: '', targetColumn: 'temperature', required: true, deletable: false },
        { id: 'rh', name: 'Relative Humidity', externalLogId: '', targetColumn: 'relative_humidity', required: true, deletable: false },
        { id: 'dp1', name: 'Differential Pressure 1', externalLogId: '', targetColumn: 'differential_pressure', required: true, deletable: false }
      ]);
    } catch (err: any) {
      toast.error(err.message || t("Error Add Room"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columnOptions = ['temperature', 'relative_humidity', 'differential_pressure'];
  const lineOptions = ['Line-001', 'Line-002', 'Line-003', 'Line-004', 'Line-005', 'Line-006', 'Line-007', 'Line-008', 'Line-009', 'Line-010'];

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-emerald-500" />
        {t("Add New Room")}
      </h3>
      <form id="room-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Room Name")}</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="e.g. Transfer Plastic Moulding"
          />
        </div>

        {/* Attributes */}
        <div className="space-y-4">
          {attributes.map((attr, index) => (
            <div key={attr.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-slate-700 dark:text-slate-200">{attr.name}</span>
                {attr.deletable && (
                  <button
                    type="button"
                    onClick={() => removeAttribute(attr.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">ID</label>
                  <input
                    type="number"
                    value={attr.externalLogId}
                    onChange={(e) => updateAttribute(attr.id, 'externalLogId', e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="ID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Column</label>
                  <select
                    value={attr.targetColumn}
                    onChange={(e) => updateAttribute(attr.id, 'targetColumn', e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {columnOptions.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Generated Room Name</label>
                <input
                  type="text"
                  value={getGeneratedName(attr, roomName, attributes)}
                  readOnly
                  className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Differential Pressure Button */}
        <button
          type="button"
          onClick={addDifferentialPressure}
          className="w-full border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
        >
          + Add Another Parameter
        </button>

        {/* Line and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Line")}</label>
            <select
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Select Line</option>
              {lineOptions.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Status")}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="Active">Aktif</option>
              <option value="Inactive">Non-aktif</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-2"
        >
          {isSubmitting ? t("Loading") : t("Add Room")}
        </button>
      </form>
    </div>
  );
}
