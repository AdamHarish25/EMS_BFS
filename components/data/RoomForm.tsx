"use client";
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RoomForm({ onAddRoom }: { onAddRoom?: (data: any) => void }) {
  const { t } = useLanguage();
  const [externalLogId, setExternalLogId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [unitDisplayName, setUnitDisplayName] = useState('');
  const [line, setLine] = useState('');
  const [status, setStatus] = useState('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalLogId || !roomName || !targetColumn || !unitDisplayName || !line) {
      toast.error(t("All Fields Required"));
      return;
    }

    const payload = {
      external_log_id: Number(externalLogId),
      room_name: roomName,
      target_column: targetColumn,
      unit_display_name: unitDisplayName,
      line: line,
      status: status,
    };

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/add-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Failed Add Room"));

      toast.success(data.message || t("Success Add Room"));
      if (onAddRoom) onAddRoom(payload);

      setExternalLogId('');
      setRoomName('');
      setTargetColumn('');
      setUnitDisplayName('');
      setLine('');
      setStatus('Active');
    } catch (err: any) {
      toast.error(err.message || t("Error Add Room"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-emerald-500" />
        {t("Add New Room")}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("External Log ID")}</label>
          <input
            type="number"
            value={externalLogId}
            onChange={(e) => setExternalLogId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="e.g. 101"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Room Name")}</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="e.g. Dispensing 1"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Target Column")}</label>
            <input
              type="text"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="e.g. EMS_Temp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Unit Display Name")}</label>
            <input
              type="text"
              value={unitDisplayName}
              onChange={(e) => setUnitDisplayName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="e.g. Temp °C"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Line")}</label>
            <input
              type="text"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="e.g. Line 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t("Status")}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="Active">{t("Active")}</option>
              <option value="Inactive">{t("Inactive")}</option>
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
