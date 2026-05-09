"use client";
import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Download, FileText, FileBarChart, Calendar, Filter } from 'lucide-react';
import ReportChart from './ReportChart';
import { format } from 'date-fns';

export default function ReportGenerator({ readings, exclusions }: { readings: any[], exclusions: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('Semua Data'); // Semua Data, Fumigasi, Non-Fumigasi
  const [selectedRoom, setSelectedRoom] = useState('All Rooms');
  const ROOMS = ['All Rooms', 'Dispensing 1', 'Dispensing 2', 'Mixing', 'Filling', 'Transfer Plastic Mold', 'WIP'];

  const isExcluded = (reading: any) => {
    return exclusions.some(exc => {
      if (exc.unit_id !== 'All Units' && exc.unit_id !== reading.unit_id) return false;
      const readingTime = new Date(reading.timestamp).getTime();
      const start = new Date(exc.timestamp_start).getTime();
      const end = new Date(exc.timestamp_end).getTime();
      return readingTime >= start && readingTime <= end;
    });
  };

  // 1. Filtering
  const dateFilteredReadings = readings.filter(r => {
    // Room Filter
    if (selectedRoom !== 'All Rooms' && r.unit_id !== selectedRoom) return false;

    // Date Filter
    const time = new Date(r.timestamp).getTime();
    
    if (startDate) {
      const start = new Date(startDate);
      if (time < start.getTime()) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (time > end.getTime()) return false;
    }
    
    return true;
  });

  // 2. Separate data based on exclusions
  const validReadings = dateFilteredReadings.filter(r => !isExcluded(r));
  const excludedReadings = dateFilteredReadings.filter(r => isExcluded(r));

  // Determine which dataset is the "main" one for the summary
  const summaryData = reportType === 'Fumigasi' ? excludedReadings : validReadings;

  // Compute Min/Max for Summary Data
  const minTemp = summaryData.length > 0 ? Math.min(...summaryData.map(r => r.temperature)) : 0;
  const maxTemp = summaryData.length > 0 ? Math.max(...summaryData.map(r => r.temperature)) : 0;
  const minRH = summaryData.length > 0 ? Math.min(...summaryData.map(r => r.relative_humidity)) : 0;
  const maxRH = summaryData.length > 0 ? Math.max(...summaryData.map(r => r.relative_humidity)) : 0;
  const minDP = summaryData.length > 0 ? Math.min(...summaryData.map(r => r.differential_pressure)) : 0;
  const maxDP = summaryData.length > 0 ? Math.max(...summaryData.map(r => r.differential_pressure)) : 0;

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
              {ROOMS.map(r => (
                <option key={r} value={r}>{r}</option>
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
          <ReportChart readings={dateFilteredReadings} exclusions={exclusions} />
        </div>
      </div>
    </div>
  );
}
