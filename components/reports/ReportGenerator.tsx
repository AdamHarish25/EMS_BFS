"use client";
import React, { useState, useRef, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Download, FileText, FileBarChart, Calendar, Filter } from 'lucide-react';
import ReportChart from './ReportChart';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ReportGenerator({ readings, exclusions }: { readings: any[], exclusions: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('Semua Data'); // Semua Data, Fumigasi, Non-Fumigasi
  const [selectedRoom, setSelectedRoom] = useState('Pilih Ruangan');
  const [serverReadings, setServerReadings] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const uniqueRooms = React.useMemo(() => {
    const allRooms = [
      ...readings.map(r => (r.unit_id || '').trim()),
      ...exclusions.map(e => (e.unit_id || '').trim())
    ];
    const rooms = Array.from(new Set(allRooms));
    return rooms.filter(Boolean).sort();
  }, [readings, exclusions]);

  const parsedExclusions = useMemo(() => {
    return exclusions.map(exc => ({
      ...exc,
      startTime: new Date(exc.timestamp_start).getTime(),
      endTime: new Date(exc.timestamp_end).getTime()
    }));
  }, [exclusions]);

  // Fetch HANYA ketika user klik tombol "Tarik Data" - bukan auto-fetch
  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      toast.error('Pilih Start Date & End Date terlebih dahulu sebelum menarik data!');
      return;
    }
    if (selectedRoom === 'Pilih Ruangan') {
      toast.error('Pilih Ruangan terlebih dahulu!');
      return;
    }

    setIsLoadingData(true);
    setServerReadings([]);
    try {
      const res = await fetch('/api/report-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: selectedRoom,
          start_date: `${startDate.replace('T', ' ')}:00`,
          end_date: `${endDate.replace('T', ' ')}:00`
        })
      });
      const data = await res.json();
      const formatted = (Array.isArray(data) ? data : []).map(item => {
        const rawTime = item.jam_asli || item.timestamp || new Date().toISOString();
        let parsedTime = new Date();
        if (typeof rawTime === 'number' || !isNaN(Number(rawTime))) {
          const tsStr = String(rawTime);
          parsedTime = new Date(Number(rawTime) * (tsStr.length <= 10 ? 1000 : 1));
        } else {
          parsedTime = new Date(rawTime);
        }
        return { ...item, timestamp: parsedTime.toISOString() };
      });
      setServerReadings(formatted);
      if (formatted.length === 0) {
        toast.error('Tidak ada data ditemukan pada rentang waktu yang dipilih.');
      } else {
        toast.success(`${formatted.length} data berhasil ditarik!`);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      toast.error('Gagal mengambil data dari server.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const dateFilteredReadings = serverReadings;

  // 2. Separate data based on exclusions
  const { validReadings, excludedReadings } = useMemo(() => {
    const valid: any[] = [];
    const excluded: any[] = [];

    for (const r of dateFilteredReadings) {
      const readingTime = new Date(r.timestamp).getTime();
      let isExc = false;

      for (const exc of parsedExclusions) {
        if ((exc.unit_id || '').trim() !== 'All Units' && (exc.unit_id || '').trim() !== (r.unit_id || '').trim()) continue;
        if (readingTime >= exc.startTime && readingTime <= exc.endTime) {
          isExc = true;
          break;
        }
      }

      if (isExc) {
        excluded.push(r);
      } else {
        valid.push(r);
      }
    }
    return { validReadings: valid, excludedReadings: excluded };
  }, [dateFilteredReadings, parsedExclusions]);

  // Determine which dataset is the "main" one for the summary
  const summaryData = reportType === 'Fumigasi' ? excludedReadings : validReadings;

  // Compute Min/Max for Summary Data
  const stats = useMemo(() => {
    if (summaryData.length === 0) return { minTemp: 0, maxTemp: 0, minRH: 0, maxRH: 0, minDP: 0, maxDP: 0 };

    let minT = Infinity, maxT = -Infinity;
    let minR = Infinity, maxR = -Infinity;
    let minD = Infinity, maxD = -Infinity;

    for (const r of summaryData) {
      if (r.temperature < minT) minT = r.temperature;
      if (r.temperature > maxT) maxT = r.temperature;
      if (r.relative_humidity < minR) minR = r.relative_humidity;
      if (r.relative_humidity > maxR) maxR = r.relative_humidity;
      if (r.differential_pressure < minD) minD = r.differential_pressure;
      if (r.differential_pressure > maxD) maxD = r.differential_pressure;
    }

    return {
      minTemp: minT === Infinity ? 0 : minT,
      maxTemp: maxT === -Infinity ? 0 : maxT,
      minRH: minR === Infinity ? 0 : minR,
      maxRH: maxR === -Infinity ? 0 : maxR,
      minDP: minD === Infinity ? 0 : minD,
      maxDP: maxD === -Infinity ? 0 : maxD,
    };
  }, [summaryData]);

  const { minTemp, maxTemp, minRH, maxRH, minDP, maxDP } = stats;

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      // HEADER
      pdf.setFontSize(20);
      pdf.setTextColor(40);
      pdf.text('Central AC Monitoring Report', 14, 22);

      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 28);
      pdf.text(`Report Type: ${reportType}`, 14, 34);
      pdf.text(`Ruangan: ${selectedRoom}`, 14, 40);

      const dateRangeText = startDate || endDate
        ? `Period: ${startDate ? format(new Date(startDate), 'PPP p') : 'Start'} to ${endDate ? format(new Date(endDate), 'PPP p') : 'Now'}`
        : 'Period: All Time';
      pdf.text(dateRangeText, 14, 46);

      let finalY = 52;

      // CHART
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, { backgroundColor: '#0f172a', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pageWidth - 28;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 14, finalY, pdfWidth, pdfHeight);
        finalY = finalY + pdfHeight + 15;
      }

      // VALID DATA TABLE (Only for 'Semua Data' or 'Non-Fumigasi')
      if (reportType !== 'Fumigasi' && validReadings.length > 0) {
        if (finalY > 250) { pdf.addPage(); finalY = 20; }

        pdf.setFontSize(14);
        pdf.setTextColor(40);
        pdf.text('Valid Sensor Readings (Non-Fumigasi)', 14, finalY);
        finalY += 5;

        const validRows = validReadings.map(r => [
          format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          r.unit_id,
          r.temperature.toFixed(2),
          r.relative_humidity.toFixed(2),
          r.differential_pressure.toFixed(2),
          r.status
        ]);

        autoTable(pdf, {
          startY: finalY,
          head: [['Timestamp', 'Unit ID', 'Temp (°C)', 'RH (%)', 'DP (Pa)', 'Status']],
          body: validRows,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        });

        finalY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // EXCLUDED DATA TABLE (Only for 'Semua Data' or 'Fumigasi')
      if (reportType !== 'Non-Fumigasi' && excludedReadings.length > 0) {
        if (finalY > 250) { pdf.addPage(); finalY = 20; }

        pdf.setFontSize(14);
        pdf.setTextColor(40);
        pdf.text('Excluded Sensor Readings (Fumigasi / Anomalies)', 14, finalY);
        finalY += 5;

        const excludedRows = excludedReadings.map(r => [
          format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          r.unit_id,
          r.temperature.toFixed(2),
          r.relative_humidity.toFixed(2),
          r.differential_pressure.toFixed(2),
          r.status
        ]);

        autoTable(pdf, {
          startY: finalY,
          head: [['Timestamp', 'Unit ID', 'Temp (°C)', 'RH (%)', 'DP (Pa)', 'Status']],
          body: excludedRows,
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
        });

        finalY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Ensure summary doesn't get cut off at the bottom
      if (finalY > 200) {
        pdf.addPage();
        finalY = 20;
      }

      // SUMMARY MIN MAX & FORMULAS
      pdf.setFontSize(14);
      pdf.setTextColor(40);
      pdf.text('Data Summary & Parameter Limits', 14, finalY);
      finalY += 8;

      const summaryTitle = reportType === 'Fumigasi' ? 'Excluded Data (Fumigasi)' : 'Valid Data (Non-Fumigasi)';

      pdf.setFontSize(10);
      pdf.setTextColor(60);
      pdf.text(`1. ${summaryTitle} - Temperature (TT): Min = ${minTemp.toFixed(2)} °C | Max = ${maxTemp.toFixed(2)} °C`, 14, finalY);
      finalY += 6;
      pdf.text(`2. ${summaryTitle} - Relative Humidity (RH): Min = ${minRH.toFixed(2)} % | Max = ${maxRH.toFixed(2)} %`, 14, finalY);
      finalY += 6;
      pdf.text(`3. ${summaryTitle} - Differential Pressure (DP): Min = ${minDP.toFixed(2)} Pa | Max = ${maxDP.toFixed(2)} Pa`, 14, finalY);
      finalY += 10;

      // Limit Formulas
      const limitTexts = [
        "Parameter DP, RH, TT",
        "",
        "TT (Temperature) =",
        "- Alert Limit = Maksimum 24 C / Maksimum 22 C (Area Kemas kelas D NBL Sterile 39)",
        "- Action Limit = Maksimum 25 C",
        "",
        "RH (Relative Humidity) =",
        "- Alert Limit = Maksimum 65 % / Maksimum 59 % (untuk kelas D Cepha, EyeDrop, dan NBL Steril (37,39,RTF))",
        "  / Maksimum 53% (Area Kemas Kelas D NBL Sterile 39)",
        "- Action Limit = Maksimum 70 % / Maksimum 60 % (untuk kelas D Cepha, EyeDrop, dan NBL Steril (37,39,RTF))",
        "",
        "DP (Differential Pressure) =",
        "- Satu Grade: Alert 6 Pa; Action: 5 Pa (Coret salah satu) / Alert 8 Pa;",
        "  Action 5 Pa (Area Kemas kelas D NBL Sterile 39)",
        "- Beda 1 Grade: Alert: 11 Pa; Action: 10 Pa (Coret salah satu)",
        "- Beda 2 Grade atau lebih: Alert: 21 Pa; Action: 20 Pa (Coret salah satu)"
      ];

      pdf.setFontSize(9);
      pdf.setTextColor(80);
      limitTexts.forEach(line => {
        if (finalY > 280) {
          pdf.addPage();
          finalY = 20;
        }
        pdf.text(line, 14, finalY);
        finalY += 5;
      });

      pdf.save(`AC-Report-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* FILTER CONTROLS */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-blue-500" />
          Filter Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Ruangan (Unit)</label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="Pilih Ruangan">-- Pilih Ruangan --</option>
              {uniqueRooms.map(r => (
                <option key={r as string} value={r as string}>{r as string}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Start Date & Time</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">End Date & Time</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Report Data Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="Semua Data">Semua Data</option>
              <option value="Non-Fumigasi">Non-Fumigasi (Valid Only)</option>
              <option value="Fumigasi">Fumigasi (Excluded Only)</option>
            </select>
          </div>
        </div>

        {/* Tombol Tarik Data */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={fetchReportData}
            disabled={isLoadingData}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm whitespace-nowrap"
          >
            {isLoadingData ? (
              <span className="animate-pulse">Mengambil Data...</span>
            ) : (
              <>
                <span>🔍</span>
                Tarik Data
              </>
            )}
          </button>
          {serverReadings.length > 0 && (
            <span className="text-xs text-emerald-400 font-medium">{serverReadings.length} data berhasil dimuat</span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-emerald-500" />
            PDF Export
          </h2>
          <p className="text-slate-400 mt-1 text-sm">Download the comprehensive report based on your selected filters.</p>
        </div>
        <button
          onClick={handleGeneratePDF}
          disabled={isGenerating || dateFilteredReadings.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] whitespace-nowrap"
        >
          {isGenerating ? (
            <span className="animate-pulse">Rendering PDF...</span>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download Report
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Filtered Records</p>
          <p className="text-4xl font-bold text-slate-100 mt-2">{dateFilteredReadings.length}</p>
        </div>
        <div className={`p-6 rounded-2xl shadow-md border ${reportType === 'Fumigasi' ? 'bg-slate-900/50 border-emerald-900/20 opacity-50' : 'bg-slate-900 border-emerald-900/50'}`}>
          <p className="text-sm font-medium text-emerald-500 uppercase tracking-wider">Valid Data</p>
          <p className="text-4xl font-bold text-emerald-400 mt-2">{validReadings.length}</p>
        </div>
        <div className={`p-6 rounded-2xl shadow-md border ${reportType === 'Non-Fumigasi' ? 'bg-slate-900/50 border-rose-900/20 opacity-50' : 'bg-slate-900 border-rose-900/50'}`}>
          <p className="text-sm font-medium text-rose-500 uppercase tracking-wider">Fumigasi / Excluded</p>
          <p className="text-4xl font-bold text-rose-400 mt-2">{excludedReadings.length}</p>
        </div>
      </div>

      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
          Visual Preview
          <span className="text-xs font-normal text-slate-500 bg-slate-950 px-2 py-1 rounded-md">Will be included in PDF</span>
        </h3>

        {/* We wrap it in a ref so html2canvas can capture it */}
        <div ref={chartRef} className="p-6 bg-[#0f172a] rounded-xl border border-slate-800">
          {selectedRoom === 'Pilih Ruangan' ? (
            <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-500">
              <Filter className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-xl font-medium text-slate-400">Pilih Ruangan Dulu</p>
              <p className="text-sm mt-2">Silakan pilih ruangan di filter untuk melihat preview grafik.</p>
            </div>
          ) : dateFilteredReadings.length === 0 ? (
            <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-500">
              <FileText className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-xl font-medium text-slate-400">Belum Ada Data</p>
              <p className="text-sm mt-2">Isi filter lalu klik &ldquo;🔍 Tarik Data&rdquo; untuk memuat grafik.</p>
            </div>
          ) : (
            <ReportChart readings={dateFilteredReadings} exclusions={parsedExclusions} />
          )}
        </div>
      </div>
    </div>
  );
}
