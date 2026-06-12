"use client";

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CustomDateTimePicker from '@/components/ui/CustomDateTimePicker';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuditReportClient({ initialLogs }: { initialLogs: any[] }) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { t } = useLanguage();

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const fetchLogs = async () => {
    if (!startDate || !endDate) {
      toast.error(t("Select Dates First"));
      return;
    }

    setIsLoadingData(true);
    try {
      const res = await fetch('/api/audit/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          action: actionFilter,
          module: moduleFilter
        })
      });

      if (!res.ok) throw new Error('Gagal menarik data');

      const data = await res.json();
      setLogs(data);

      if (data.length === 0) {
        toast.error(t("No Logs Found"));
      } else {
        toast.success(data.length + " " + t("Logs Pulled"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("Error Pull Logs"));
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleGeneratePDF = () => {
    if (logs.length === 0) {
      toast.error(t("No Data Export"));
      return;
    }

    setIsGenerating(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');

      // HEADER
      pdf.setFontSize(18);
      pdf.setTextColor(40);
      pdf.text(t("Audit Report Title"), 14, 22);

      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`${t("Created At:")} ${format(new Date(), 'dd MMM yyyy HH:mm:ss')}`, 14, 28);

      const dateRangeText = startDate || endDate
        ? `${t("Period:")} ${startDate ? format(new Date(startDate), 'dd MMM yyyy HH:mm') : t("Start")} s.d ${endDate ? format(new Date(endDate), 'dd MMM yyyy HH:mm') : t("Now")}`
        : `${t("Period:")} ${t("Last 100 Logs Default")}`;
      pdf.text(dateRangeText, 14, 34);

      if (actionFilter !== 'ALL') pdf.text(`${t("Action Filter")}: ${actionFilter}`, 14, 40);
      if (moduleFilter !== 'ALL') pdf.text(`${t("Module Filter")}: ${moduleFilter}`, 14, actionFilter !== 'ALL' ? 46 : 40);

      const startY = actionFilter !== 'ALL' || moduleFilter !== 'ALL' ? 52 : 42;

      // ROWS
      const tableRows = logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email || log.user_id || 'System',
        log.action,
        log.module,
        log.description,
        log.ip_address || '-'
      ]);

      autoTable(pdf, {
        startY: startY,
        head: [[t("Time"), t("User / Email"), t("Action Col"), t("Module Col"), t("Description Col"), t("IP Address Col")]],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 25 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const actionText = data.cell.raw;
            if (actionText === 'CREATE') {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            } else if (actionText === 'DELETE') {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (actionText === 'UPDATE') {
              data.cell.styles.textColor = [37, 99, 235];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      pdf.save(`Audit-Report-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
      toast.success(t("PDF Downloaded"));
    } catch (err) {
      console.error(err);
      toast.error(t("Failed Generate PDF"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("Audit Trail & Reporting")}</h1>
      </div>

      {/* FILTER PANEL */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-blue-500" />
          {t("Filter & Pull Data")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <CustomDateTimePicker
            value={startDate}
            onChange={setStartDate}
            label={t("Start Date")}
            placeholder={t("Select Start Date Placeholder")}
          />
          <CustomDateTimePicker
            value={endDate}
            onChange={setEndDate}
            label={t("End Date")}
            placeholder={t("Select End Date Placeholder")}
          />
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-2">{t("Action Filter")}</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">{t("All Actions")}</option>
              <option value="VIEW">VIEW</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="EXPORT">EXPORT</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-2">{t("Module Filter")}</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">{t("All Modules")}</option>
              <option value="PAGE_NAVIGATION">PAGE_NAVIGATION</option>
              <option value="ROOM_MANAGEMENT">ROOM_MANAGEMENT</option>
              <option value="DATA_EXCLUSION">DATA_EXCLUSION</option>
              <option value="REPORTING">REPORTING</option>
              <option value="AUTH">AUTH</option>
              <option value="SETTINGS">SETTINGS</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-6">
          <button
            onClick={fetchLogs}
            disabled={isLoadingData}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm"
          >
            {isLoadingData ? t("Fetching Data") : `🔍 ${t("Pull Log Data")}`}
          </button>

          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || logs.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm"
          >
            {isGenerating ? t("Rendering PDF") : <><Download className="w-4 h-4" /> {t("Download")}</>}
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            {t("Preview Log Data")} ({logs.length} data)
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-950 sticky top-0 border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-medium">{t("Time")}</th>
                <th className="px-4 py-3 font-medium">{t("User / Email")}</th>
                <th className="px-4 py-3 font-medium">{t("Action Col")}</th>
                <th className="px-4 py-3 font-medium">{t("Module Col")}</th>
                <th className="px-4 py-3 font-medium">{t("Description Col")}</th>
                <th className="px-4 py-3 font-medium">{t("IP Address Col")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    {t("No Activity Logs")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-zinc-500">
                      {log.user_email || log.user_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.action === 'CREATE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{log.module}</td>
                    <td className="px-4 py-3">{log.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-zinc-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
