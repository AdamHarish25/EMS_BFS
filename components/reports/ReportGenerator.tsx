"use client";
import React, { useState, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Download, FileText, FileBarChart, Calendar, Filter } from 'lucide-react';
import ReportChart from './ReportChart';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReportGenerator({ readings, exclusions }: { readings: any[], exclusions: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('Semua Data');
  const [selectedRoom, setSelectedRoom] = useState('Pilih Ruangan');
  const [dataInterval, setDataInterval] = useState('raw');
  const [serverReadings, setServerReadings] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const uniqueRooms = React.useMemo(() => {
    const allRooms = [
      ...readings.map(r => {
        let room = (r.unit_id || '').trim();
        if (room.endsWith('- DP 1')) return room.replace(' - DP 1', '');
        if (room.endsWith('- DP 2')) return room.replace(' - DP 2', '');
        return room;
      }),
      ...exclusions.map(e => {
        let room = (e.unit_id || '').trim();
        if (room.endsWith('- DP 1')) return room.replace(' - DP 1', '');
        if (room.endsWith('- DP 2')) return room.replace(' - DP 2', '');
        return room;
      })
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


  const toNumeric = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim();
      if (!normalized) return null;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Fetch HANYA ketika user klik tombol "Tarik Data" - bukan auto-fetch
  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      toast.error('Pilih Start Date & End Date terlebih dahulu!');
      return;
    }
    if (selectedRoom === 'Pilih Ruangan') {
      toast.error('Pilih Ruangan terlebih dahulu!');
      return;
    }

    setIsLoadingData(true);
    setServerReadings([]);

    // Trik UI: Beri napas 50ms agar browser sempat me-render tulisan "Loading..." sebelum CPU terkunci
    await new Promise(resolve => setTimeout(resolve, 50));

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

      // OPTIMASI: Parse tanggal dan angka SATU KALI SAJA di sini
      const formatted = (Array.isArray(data) ? data : []).map(item => {
        const rawTime = item.jam_asli || item.timestamp || new Date().toISOString();
        let timestampValue;
        if (typeof rawTime === 'number' || !isNaN(Number(rawTime))) {
          const tsStr = String(rawTime);
          timestampValue = Number(rawTime) * (tsStr.length <= 10 ? 1000 : 1);
        } else {
          timestampValue = new Date(rawTime).getTime();
        }

        return {
          ...item,
          timestamp: new Date(timestampValue).toISOString(),
          timestampValue, // Simpan mentahannya agar tidak perlu new Date() lagi
          numTemp: toNumeric(item.temperature),
          numRH: toNumeric(item.relative_humidity),
          numDP: toNumeric(item.differential_pressure)
        };
      });

      // PASTIKAN MENGHAPUS: setServerReadings(formatted); 
      // DAN GANTI DENGAN KODE DI BAWAH INI:

      // Pastikan urut waktu dari terlama ke terbaru
      formatted.sort((a, b) => a.timestampValue - b.timestampValue);

      const groupReadings = (raw: any[]) => {
        const map = new Map<string, any>();
        const results: any[] = [];
        for (let i = 0; i < raw.length; i++) {
          const r = raw[i];
          const rawUnit = (r.unit_id || '').trim();
          let baseUnit = rawUnit;
          let isDp1 = false;
          let isDp2 = false;

          if (rawUnit.endsWith('- DP 1')) {
            baseUnit = rawUnit.replace(' - DP 1', '');
            isDp1 = true;
          } else if (rawUnit.endsWith('- DP 2')) {
            baseUnit = rawUnit.replace(' - DP 2', '');
            isDp2 = true;
          }

          const key = `${r.timestampValue}_${baseUnit}`;
          let existing = map.get(key);
          if (!existing) {
            existing = { ...r, unit_id: baseUnit, dp1: null, dp2: null };
            if (isDp1 || isDp2) {
              existing.numTemp = null;
              existing.numRH = null;
              existing.numDP = null;
              existing.temperature = null;
              existing.relative_humidity = null;
              existing.differential_pressure = null;
            }
            map.set(key, existing);
            results.push(existing);
          }

          if (isDp1) {
            existing.dp1 = r.numDP ?? toNumeric(r.differential_pressure);
            if (r.status !== 'normal' && existing.status === 'normal') existing.status = r.status;
          } else if (isDp2) {
            existing.dp2 = r.numDP ?? toNumeric(r.differential_pressure);
            if (r.status !== 'normal' && existing.status === 'normal') existing.status = r.status;
          } else {
            existing.numTemp = r.numTemp;
            existing.numRH = r.numRH;
            existing.numDP = r.numDP;
            existing.temperature = r.temperature;
            existing.relative_humidity = r.relative_humidity;
            existing.differential_pressure = r.differential_pressure;
            if (r.status !== 'normal' || !existing.status) existing.status = r.status;
          }
        }
        return results;
      };

      const groupedData = groupReadings(formatted);

      let finalData = groupedData;
      if (dataInterval === '5m') {
        finalData = [];
        let lastTime = 0;
        for (let i = 0; i < groupedData.length; i++) {
          if (groupedData[i].timestampValue - lastTime >= 5 * 60 * 1000) {
            finalData.push(groupedData[i]);
            lastTime = groupedData[i].timestampValue;
          }
        }
      } else if (dataInterval === '1h') {
        finalData = [];
        let lastTime = 0;
        for (let i = 0; i < groupedData.length; i++) {
          if (groupedData[i].timestampValue - lastTime >= 60 * 60 * 1000) {
            finalData.push(groupedData[i]);
            lastTime = groupedData[i].timestampValue;
          }
        }
      }

      setServerReadings(finalData);

      if (finalData.length === 0) {
        toast.error('Tidak ada data ditemukan pada rentang waktu yang dipilih.');
      } else {
        toast.success(`${finalData.length} data berhasil ditarik (setelah difilter interval)!`);
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

    for (let i = 0; i < dateFilteredReadings.length; i++) {
      const r = dateFilteredReadings[i];
      // BACA LANGSUNG ANGKA MENTAH! 99% lebih ringan tanpa new Date()
      const readingTime = r.timestampValue;
      let isExc = false;

      for (let j = 0; j < parsedExclusions.length; j++) {
        const exc = parsedExclusions[j];
        if ((exc.unit_id || '').trim() !== 'All Units' && (exc.unit_id || '').trim() !== (r.unit_id || '').trim()) continue;
        if (readingTime >= exc.startTime && readingTime <= exc.endTime) {
          const reasonStr = exc.reason || '';
          if (reasonStr.includes('[TAG:Warning/Critical]') && (r.status === 'normal' || !r.status)) {
            continue;
          }
          isExc = true;
          break;
        }
      }

      if (isExc) excluded.push(r);
      else valid.push(r);
    }
    return { validReadings: valid, excludedReadings: excluded };
  }, [dateFilteredReadings, parsedExclusions]);

  const includeValidTable = reportType !== 'Fumigasi';
  const includeExcludedTable = reportType !== 'Non-Fumigasi';

  const formatCellNumber = (value: any) => {
    const numeric = toNumeric(value);
    return numeric === null ? '-' : numeric.toFixed(2);
  };

  const formatSummaryNumber = (value: number | null, unit: string) => {
    return value === null ? '-' : `${value.toFixed(2)} ${unit}`;
  };

  const calculateStats = (dataset: any[]) => {
    if (dataset.length === 0) return { minTemp: null, maxTemp: null, minRH: null, maxRH: null, minDP: null, maxDP: null, minDP1: null, maxDP1: null, minDP2: null, maxDP2: null, hasDp1: false, hasDp2: false };

    let minT: number | null = null, maxT: number | null = null;
    let minR: number | null = null, maxR: number | null = null;
    let minD: number | null = null, maxD: number | null = null;
    let minD1: number | null = null, maxD1: number | null = null;
    let minD2: number | null = null, maxD2: number | null = null;
    let hasDp1 = false;
    let hasDp2 = false;

    for (let i = 0; i < dataset.length; i++) {
      const r = dataset[i];
      // LANGSUNG AMBIL VARIABLE PRE-CALCULATED, tanpa eksekusi toNumeric() berulang kali
      const temp = r.numTemp;
      const rh = r.numRH;
      const dp = r.numDP;

      if (temp !== null) {
        minT = minT === null ? temp : Math.min(minT, temp);
        maxT = maxT === null ? temp : Math.max(maxT, temp);
      }
      if (rh !== null) {
        minR = minR === null ? rh : Math.min(minR, rh);
        maxR = maxR === null ? rh : Math.max(maxR, rh);
      }

      const hasSubDp = (r.dp1 !== undefined && r.dp1 !== null) || (r.dp2 !== undefined && r.dp2 !== null);
      
      if (hasSubDp) {
        if (r.dp1 !== undefined && r.dp1 !== null) {
          minD1 = minD1 === null ? r.dp1 : Math.min(minD1, r.dp1);
          maxD1 = maxD1 === null ? r.dp1 : Math.max(maxD1, r.dp1);
          hasDp1 = true;
        }
        if (r.dp2 !== undefined && r.dp2 !== null) {
          minD2 = minD2 === null ? r.dp2 : Math.min(minD2, r.dp2);
          maxD2 = maxD2 === null ? r.dp2 : Math.max(maxD2, r.dp2);
          hasDp2 = true;
        }
      } else if (dp !== null) {
        minD = minD === null ? dp : Math.min(minD, dp);
        maxD = maxD === null ? dp : Math.max(maxD, dp);
      }
    }

    return { minTemp: minT, maxTemp: maxT, minRH: minR, maxRH: maxR, minDP: minD, maxDP: maxD, minDP1: minD1, maxDP1: maxD1, minDP2: minD2, maxDP2: maxD2, hasDp1, hasDp2 };
  };


  const validStats = useMemo(() => calculateStats(validReadings), [validReadings]);
  const excludedStats = useMemo(() => calculateStats(excludedReadings), [excludedReadings]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      // HEADER
      pdf.setFontSize(20);
      pdf.setTextColor(40);
      pdf.text('Laporan Pemantauan Central AC', 14, 22);

      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Dibuat pada: ${format(new Date(), 'PPP p')}`, 14, 28);
      pdf.text(`Tipe Laporan: ${reportType}`, 14, 34);
      pdf.text(`Ruangan: ${selectedRoom}`, 14, 40);

      const dateRangeText = startDate || endDate
        ? `Periode: ${startDate ? format(new Date(startDate), 'PPP p') : 'Awal'} sampai ${endDate ? format(new Date(endDate), 'PPP p') : 'Sekarang'}`
        : 'Periode: Semua Waktu';
      pdf.text(dateRangeText, 14, 46);

      let finalY = 52;

      // CHART
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pageWidth - 28;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 14, finalY, pdfWidth, pdfHeight);
        finalY = finalY + pdfHeight + 15;
      }

      // VALID DATA TABLE (Only for 'Semua Data' or 'Non-Fumigasi')
      if (includeValidTable && validReadings.length > 0) {
        if (finalY > 250) { pdf.addPage(); finalY = 20; }

        pdf.setFontSize(14);
        pdf.setTextColor(40);
        pdf.text('Pembacaan Sensor Valid (Non-Fumigasi)', 14, finalY);
        finalY += 5;

        const validRows = validReadings.map(r => [
          format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          r.unit_id,
          formatCellNumber(r.temperature),
          formatCellNumber(r.relative_humidity),
          (r.dp1 != null || r.dp2 != null) ? (r.dp1 != null ? formatCellNumber(r.dp1) : '-') : formatCellNumber(r.differential_pressure),
          r.dp2 != null ? formatCellNumber(r.dp2) : '-',
          'Recorded'
        ]);

        autoTable(pdf, {
          startY: finalY,
          head: [['Timestamp', 'Unit ID', 'Temp (°C)', 'RH (%)', 'DP 1 / DP', 'DP 2 (Pa)', 'Status']],
          body: validRows,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
          didParseCell: (data) => {
            if (data.section === 'body') {
              const rowIndex = data.row.index;
              const r = validReadings[rowIndex];
              const temp = Number(r.temperature);
              const rh = Number(r.relative_humidity);
              const dp = r.dp1 != null ? Number(r.dp1) : Number(r.differential_pressure);
              const dp2 = r.dp2 != null ? Number(r.dp2) : null;
              
              const applyWarning = () => {
                data.cell.styles.fillColor = [254, 243, 199]; // amber-100
                data.cell.styles.textColor = [180, 83, 9];    // amber-700
                data.cell.styles.fontStyle = 'bold';
              };

              const applyCritical = () => {
                data.cell.styles.fillColor = [254, 226, 226]; // red-100
                data.cell.styles.textColor = [153, 27, 27];   // red-800
                data.cell.styles.fontStyle = 'bold';
              };

              if (data.column.index === 2) {
                if (temp > 25) applyCritical();
                else if (temp > 24) applyWarning();
              }
              if (data.column.index === 3) {
                if (rh > 60) applyCritical();
                else if (rh > 59) applyWarning();
              }
              if (data.column.index === 4) {
                if (dp <= 5) applyCritical();
                else if (dp <= 8) applyWarning();
              }
              if (data.column.index === 5 && dp2 != null) {
                if (dp2 <= 5) applyCritical();
                else if (dp2 <= 8) applyWarning();
              }
            }
          }
        });

        finalY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // EXCLUDED DATA TABLE (Only for 'Semua Data' or 'Fumigasi')
      if (includeExcludedTable && excludedReadings.length > 0) {
        if (finalY > 250) { pdf.addPage(); finalY = 20; }

        pdf.setFontSize(14);
        pdf.setTextColor(40);
        pdf.text('Pembacaan Sensor Dikecualikan (Fumigasi / Anomali)', 14, finalY);
        finalY += 5;

        const excludedRows = excludedReadings.map(r => [
          format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          r.unit_id,
          formatCellNumber(r.temperature),
          formatCellNumber(r.relative_humidity),
          (r.dp1 != null || r.dp2 != null) ? (r.dp1 != null ? formatCellNumber(r.dp1) : '-') : formatCellNumber(r.differential_pressure),
          r.dp2 != null ? formatCellNumber(r.dp2) : '-',
          'Excluded'
        ]);

        autoTable(pdf, {
          startY: finalY,
          head: [['Timestamp', 'Unit ID', 'Temp (°C)', 'RH (%)', 'DP 1 / DP', 'DP 2 (Pa)', 'Status']],
          body: excludedRows,
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
          didParseCell: (data) => {
            if (data.section === 'body') {
              const rowIndex = data.row.index;
              const r = excludedReadings[rowIndex];
              const temp = Number(r.temperature);
              const rh = Number(r.relative_humidity);
              const dp = r.dp1 != null ? Number(r.dp1) : Number(r.differential_pressure);
              const dp2 = r.dp2 != null ? Number(r.dp2) : null;

              const applyWarning = () => {
                data.cell.styles.fillColor = [254, 243, 199]; // amber-100
                data.cell.styles.textColor = [180, 83, 9];    // amber-700
                data.cell.styles.fontStyle = 'bold';
              };

              const applyCritical = () => {
                data.cell.styles.fillColor = [254, 226, 226]; // red-100
                data.cell.styles.textColor = [153, 27, 27];   // red-800
                data.cell.styles.fontStyle = 'bold';
              };

              if (data.column.index === 2) {
                if (temp > 25) applyCritical();
                else if (temp > 24) applyWarning();
              }
              if (data.column.index === 3) {
                if (rh > 60) applyCritical();
                else if (rh > 59) applyWarning();
              }
              if (data.column.index === 4) {
                if (dp <= 5) applyCritical();
                else if (dp <= 8) applyWarning();
              }
              if (data.column.index === 5 && dp2 != null) {
                if (dp2 <= 5) applyCritical();
                else if (dp2 <= 8) applyWarning();
              }
            }
          }
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
      pdf.text('Ringkasan Data & Batas Parameter', 14, finalY);
      finalY += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(60);
      if (includeValidTable) {
        if (validReadings.length > 0) {
          pdf.text(`Non-Fumigasi - Temperature (TT): Min = ${formatSummaryNumber(validStats.minTemp, '°C')} | Max = ${formatSummaryNumber(validStats.maxTemp, '°C')}`, 14, finalY);
          finalY += 6;
          pdf.text(`Non-Fumigasi - Relative Humidity (RH): Min = ${formatSummaryNumber(validStats.minRH, '%')} | Max = ${formatSummaryNumber(validStats.maxRH, '%')}`, 14, finalY);
          finalY += 6;
          
          if (validStats.hasDp1 || validStats.hasDp2) {
            if (validStats.hasDp1) {
              pdf.text(`Non-Fumigasi - DP 1: Min = ${formatSummaryNumber(validStats.minDP1, 'Pa')} | Max = ${formatSummaryNumber(validStats.maxDP1, 'Pa')}`, 14, finalY);
              finalY += 6;
            }
            if (validStats.hasDp2) {
              pdf.text(`Non-Fumigasi - DP 2: Min = ${formatSummaryNumber(validStats.minDP2, 'Pa')} | Max = ${formatSummaryNumber(validStats.maxDP2, 'Pa')}`, 14, finalY);
              finalY += 6;
            }
          } else {
            pdf.text(`Non-Fumigasi - Differential Pressure (DP): Min = ${formatSummaryNumber(validStats.minDP, 'Pa')} | Max = ${formatSummaryNumber(validStats.maxDP, 'Pa')}`, 14, finalY);
            finalY += 6;
          }
          finalY += 2;
        } else {
          pdf.text('Non-Fumigasi: Tidak ada data pada tabel.', 14, finalY);
          finalY += 8;
        }
      }
      if (includeExcludedTable) {
        if (excludedReadings.length > 0) {
          pdf.text(`Fumigasi - Temperature (TT): Min = ${formatSummaryNumber(excludedStats.minTemp, '°C')} | Max = ${formatSummaryNumber(excludedStats.maxTemp, '°C')}`, 14, finalY);
          finalY += 6;
          pdf.text(`Fumigasi - Relative Humidity (RH): Min = ${formatSummaryNumber(excludedStats.minRH, '%')} | Max = ${formatSummaryNumber(excludedStats.maxRH, '%')}`, 14, finalY);
          finalY += 6;
          
          if (excludedStats.hasDp1 || excludedStats.hasDp2) {
            if (excludedStats.hasDp1) {
              pdf.text(`Fumigasi - DP 1: Min = ${formatSummaryNumber(excludedStats.minDP1, 'Pa')} | Max = ${formatSummaryNumber(excludedStats.maxDP1, 'Pa')}`, 14, finalY);
              finalY += 6;
            }
            if (excludedStats.hasDp2) {
              pdf.text(`Fumigasi - DP 2: Min = ${formatSummaryNumber(excludedStats.minDP2, 'Pa')} | Max = ${formatSummaryNumber(excludedStats.maxDP2, 'Pa')}`, 14, finalY);
              finalY += 6;
            }
          } else {
            pdf.text(`Fumigasi - Differential Pressure (DP): Min = ${formatSummaryNumber(excludedStats.minDP, 'Pa')} | Max = ${formatSummaryNumber(excludedStats.maxDP, 'Pa')}`, 14, finalY);
            finalY += 6;
          }
          finalY += 2;
        } else {
          pdf.text('Fumigasi: Tidak ada data pada tabel.', 14, finalY);
          finalY += 8;
        }
      }
      finalY += 2;

      // Limit Formulas
      // const limitTexts = [
      //   "Parameter DP, RH, TT",
      //   "",
      //   "TT (Temperature) =",
      //   "- Alert Limit = Maksimum 24 C / Maksimum 22 C (Area Kemas kelas D NBL Sterile 39)",
      //   "- Action Limit = Maksimum 25 C",
      //   "",
      //   "RH (Relative Humidity) =",
      //   "- Alert Limit = Maksimum 65 % / Maksimum 59 % (untuk kelas D Cepha, EyeDrop, dan NBL Steril (37,39,RTF))",
      //   "  / Maksimum 53% (Area Kemas Kelas D NBL Sterile 39)",
      //   "- Action Limit = Maksimum 70 % / Maksimum 60 % (untuk kelas D Cepha, EyeDrop, dan NBL Steril (37,39,RTF))",
      //   "",
      //   "DP (Differential Pressure) =",
      //   "- Satu Grade: Alert 6 Pa; Action: 5 Pa (Coret salah satu) / Alert 8 Pa;",
      //   "  Action 5 Pa (Area Kemas kelas D NBL Sterile 39)",
      //   "- Beda 1 Grade: Alert: 11 Pa; Action: 10 Pa (Coret salah satu)",
      //   "- Beda 2 Grade atau lebih: Alert: 21 Pa; Action: 20 Pa (Coret salah satu)"
      // ];

      pdf.setFontSize(9);
      pdf.setTextColor(80);
      // limitTexts.forEach(line => {
      //   if (finalY > 280) {
      //     pdf.addPage();
      //     finalY = 20;
      //   }
      //   pdf.text(line, 14, finalY);
      //   finalY += 5;
      // });

      pdf.save(`AC-Report-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fungsi untuk memadatkan (downsample) data khusus untuk chart
  // Agar maksimal titik yang digambar chart tidak lebih dari 200 titik
  const downsampleData = (data: any[], maxPoints: number = 200) => {
    if (!data || data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  };


  return (
    <div className="space-y-6">

      {/* FILTER CONTROLS */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-blue-500" />
          {t("Filter Config")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t("Room")}</label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="Pilih Ruangan">{t("Select Room 2")}</option>
              {uniqueRooms.map(r => (
                <option key={r as string} value={r as string}>{r as string}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t("Start Date")}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t("End Date")}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>
          {/* Tambahan Kolom Interval */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Interval Data</label>
            <select
              value={dataInterval}
              onChange={(e) => setDataInterval(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="raw">Semua Data (Raw)</option>
              <option value="5m">Per 5 Menit</option>
              <option value="1h">Per 1 Jam</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t("Report Type")}</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="Semua Data">{t("All Data")}</option>
              <option value="Non-Fumigasi">{t("Valid Only")}</option>
              <option value="Fumigasi">{t("Excluded Only")}</option>
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
              <span className="animate-pulse">{t("Fetching Data")}</span>
            ) : (
              <>
                <span>🔍</span>
                {t("Pull Data")}
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
            {t("PDF Export")}
          </h2>
          <p className="text-slate-400 mt-1 text-sm">{t("Download Report Desc")}</p>
        </div>
        <button
          onClick={handleGeneratePDF}
          disabled={isGenerating || dateFilteredReadings.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] whitespace-nowrap"
        >
          {isGenerating ? (
            <span className="animate-pulse">{t("Rendering PDF")}</span>
          ) : (
            <>
              <Download className="w-5 h-5" />
              {t("Download")}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t("Filtered Records")}</p>
          <p className="text-4xl font-bold text-slate-100 mt-2">{dateFilteredReadings.length}</p>
        </div>
        <div className={`p-6 rounded-2xl shadow-md border ${reportType === 'Fumigasi' ? 'bg-slate-900/50 border-emerald-900/20 opacity-50' : 'bg-slate-900 border-emerald-900/50'}`}>
          <p className="text-sm font-medium text-emerald-500 uppercase tracking-wider">{t("Valid Data")}</p>
          <p className="text-4xl font-bold text-emerald-400 mt-2">{validReadings.length}</p>
        </div>
        <div className={`p-6 rounded-2xl shadow-md border ${reportType === 'Non-Fumigasi' ? 'bg-slate-900/50 border-rose-900/20 opacity-50' : 'bg-slate-900 border-rose-900/50'}`}>
          <p className="text-sm font-medium text-rose-500 uppercase tracking-wider">{t("Excluded Fumigasi")}</p>
          <p className="text-4xl font-bold text-rose-400 mt-2">{excludedReadings.length}</p>
        </div>
      </div>

      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h3 className="text-lg font-medium text-slate-200 mb-6 flex items-center gap-2">
          {t("Visual Preview")}
          <span className="text-xs font-normal text-slate-500 bg-slate-950 px-2 py-1 rounded-md">{t("Included in PDF")}</span>
        </h3>

        {/* We wrap it in a ref so html2canvas can capture it */}
        <div ref={chartRef} className="p-6 bg-white rounded-xl border border-slate-200">
          {selectedRoom === 'Pilih Ruangan' ? (
            <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-500">
              <Filter className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-xl font-medium text-slate-400">{t("Select Room First")}</p>
              <p className="text-sm mt-2">{t("Choose Room PDF")}</p>
            </div>
          ) : dateFilteredReadings.length === 0 ? (
            <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-500">
              <FileText className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-xl font-medium text-slate-400">{t("No Data")}</p>
              <p className="text-sm mt-2">{t("Fill Filter PDF")}</p>
            </div>
          ) : (
            <ReportChart validReadings={downsampleData(validReadings, 200)} excludedReadings={downsampleData(excludedReadings, 200)} />
          )}
        </div>
      </div>
    </div>
  );
}
