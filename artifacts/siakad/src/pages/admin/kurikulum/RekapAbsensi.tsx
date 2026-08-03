"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ClipboardCheck, Loader2, Search, Calendar, 
  Printer, ArrowLeft, Download, Filter, Info,
  TrendingUp, Users, UserCheck, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import DocumentCover from '@/components/DocumentCover';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const MONTHS = [
  { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' }, { value: '04', label: 'April' },
  { value: '05', label: 'Mei' }, { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
];

const RekapAbsensi = () => {
  const { settings } = useSiteSettings();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [printMode, setPrintMode] = useState<'none' | 'rekap' | 'cover'>('none');

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 11, show_kop: true, show_signature: true
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      setStudents(res?.find(s => s.id === 'students_list')?.value || []);
      setClasses(res?.find(s => s.id === 'kelas_list')?.value || []);
      setAttendanceList(res?.find(s => s.id === 'attendance_data_list')?.value || []);
    } catch (err) {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Mendapatkan jumlah hari dalam bulan yang dipilih
  const daysInMonth = useMemo(() => {
    return new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
  }, [selectedMonth, selectedYear]);

  const rekapData = useMemo(() => {
    if (!selectedClass) return [];

    const classStudents = students.filter(s => s.class_id === selectedClass);
    const monthAttendance = attendanceList.filter(a => 
      a.class_id === selectedClass && 
      a.date.startsWith(`${selectedYear}-${selectedMonth}`)
    );

    return classStudents.map(student => {
      const dailyStatus: Record<number, string> = {};
      const stats = { H: 0, I: 0, S: 0, A: 0 };

      // Isi status per tanggal
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${selectedMonth}-${d.toString().padStart(2, '0')}`;
        const dayData = monthAttendance.find(a => a.date === dateStr);
        const record = dayData?.records.find((r: any) => r.student_id === student.id);
        
        if (record) {
          dailyStatus[d] = record.status;
          stats[record.status as keyof typeof stats]++;
        } else {
          dailyStatus[d] = '';
        }
      }

      const totalDays = monthAttendance.length;
      const percentage = totalDays > 0 ? Math.round((stats.H / totalDays) * 100) : 0;

      return {
        ...student,
        dailyStatus,
        ...stats,
        totalDays,
        percentage
      };
    });
  }, [students, attendanceList, selectedClass, selectedMonth, selectedYear, daysInMonth]);

  const totalStats = useMemo(() => {
    if (rekapData.length === 0) return { avgHadir: 0, totalSiswa: 0 };
    const sumHadir = rekapData.reduce((acc, curr) => acc + curr.percentage, 0);
    return {
      avgHadir: Math.round(sumHadir / rekapData.length),
      totalSiswa: rekapData.length
    };
  }, [rekapData]);

  if (printMode === 'cover' && selectedClass) {
    const className = classes.find(c => c.id === selectedClass)?.nama_kelas;
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label;
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setPrintMode('none')} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Cover
          </Button>
        </div>
        <div className="flex-1 p-0 sm:p-8 overflow-y-auto print:p-0 flex justify-center items-start">
          <DocumentCover 
            title={`REKAPITULASI ABSENSI SISWA`}
            subtitle={`Laporan Kehadiran Bulanan Peserta Didik`}
            category={`DOKUMEN KESISWAAN`}
            year={`BULAN ${monthLabel?.toUpperCase()} ${selectedYear}`}
            author={`Wali Kelas ${className}`}
            className="print:m-0 shadow-2xl print:shadow-none"
          />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              size: A4; 
              margin: 0 !important; 
            }
            html, body { 
              height: 297mm; 
              overflow: hidden !important;
              background: white !important; 
              margin: 0 !important; 
              padding: 0 !important;
            }
            .print\\:hidden { display: none !important; }
          }
        ` }} />
      </div>
    );
  }

  if (printMode === 'rekap' && selectedClass) {
    const className = classes.find(c => c.id === selectedClass)?.nama_kelas;
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label;

    return (
      <div className="min-h-screen bg-white p-0">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setPrintMode('none')} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Laporan
          </Button>
        </div>

        <div 
          className="mx-auto print:w-full flex flex-col font-serif"
          style={{ 
            width: printConfig.paper_size === 'F4' ? '330mm' : '297mm', 
            padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
            boxSizing: 'border-box'
          }}
        >
          {printConfig.show_kop && <KopSurat />}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold underline uppercase">REKAPITULASI ABSENSI SISWA PER TANGGAL</h2>
            <p className="mt-1">Bulan: {monthLabel} {selectedYear} | Kelas: {className}</p>
          </div>

          <table className="w-full border-collapse border border-black text-[8pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 w-6" rowSpan={2}>No</th>
                <th className="border border-black p-1 text-left min-w-[120px]" rowSpan={2}>Nama Siswa</th>
                <th className="border border-black p-1" colSpan={daysInMonth}>Tanggal</th>
                <th className="border border-black p-1" colSpan={4}>Total</th>
                <th className="border border-black p-1 w-10" rowSpan={2}>%</th>
              </tr>
              <tr className="bg-gray-50">
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="border border-black p-0.5 w-5 text-[7pt]">{i + 1}</th>
                ))}
                <th className="border border-black p-0.5 w-5 text-emerald-700">H</th>
                <th className="border border-black p-0.5 w-5 text-blue-700">I</th>
                <th className="border border-black p-0.5 w-5 text-amber-700">S</th>
                <th className="border border-black p-0.5 w-5 text-red-700">A</th>
              </tr>
            </thead>
            <tbody>
              {rekapData.map((s, idx) => (
                <tr key={s.id}>
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 font-bold uppercase truncate max-w-[150px]">{s.name}</td>
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const status = s.dailyStatus[i + 1];
                    return (
                      <td key={i} className={`border border-black p-0.5 text-center text-[7pt] font-bold ${
                        status === 'A' ? 'bg-red-50 text-red-600' : 
                        status === 'S' ? 'bg-amber-50 text-amber-600' : ''
                      }`}>
                        {status}
                      </td>
                    );
                  })}
                  <td className="border border-black p-0.5 text-center font-bold">{s.H}</td>
                  <td className="border border-black p-0.5 text-center">{s.I}</td>
                  <td className="border border-black p-0.5 text-center">{s.S}</td>
                  <td className="border border-black p-0.5 text-center text-red-600">{s.A}</td>
                  <td className="border border-black p-0.5 text-center font-bold">{s.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-between items-start text-[8pt]">
            <div className="p-3 border border-black bg-gray-50 w-fit">
              <p className="font-bold mb-1">Keterangan:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <p>H : Hadir</p>
                <p>I : Izin</p>
                <p>S : Sakit</p>
                <p>A : Alpa (Tanpa Keterangan)</p>
              </div>
            </div>
            <div className="text-right italic">
              Dicetak pada: {new Date().toLocaleString('id-ID')}
            </div>
          </div>

          {printConfig.show_signature && (
            <div className="mt-12">
              <PenandatanganDokumen targetKelas={className} />
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              size: ${printConfig.paper_size === 'F4' ? '330mm 215mm' : 'A4 landscape'}; 
              margin: 0 !important; 
            }
            body { background: white !important; }
            .print\\:hidden { display: none !important; }
            #rapor-print-area { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          }
        ` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Rekapitulasi Absensi Bulanan">
      <div className="space-y-6">
        {/* Filter Section */}
        <Card className="border-0 shadow-lg bg-white overflow-hidden">
          <div className="h-2 bg-emerald-600"></div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-widest">Pilih Kelas</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="rounded-xl h-12 border-gray-100 bg-gray-50/50">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {classes.sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nama_kelas}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-widest">Bulan</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="rounded-xl h-12 border-gray-100 bg-gray-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-32">
                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-widest">Tahun</label>
                <Input 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(e.target.value)} 
                  className="rounded-xl h-12 border-gray-100 bg-gray-50/50 font-bold" 
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={fetchData} variant="outline" className="h-12 rounded-xl px-4">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  onClick={() => setPrintMode('cover')} 
                  disabled={!selectedClass} 
                  variant="outline"
                  className="flex-1 md:flex-none border-emerald-200 text-emerald-700 rounded-xl h-12 font-bold px-6"
                >
                  <FileText className="w-4 h-4 mr-2" /> Cover
                </Button>
                <Button 
                  onClick={() => setPrintMode('rekap')} 
                  disabled={!selectedClass || rekapData.length === 0} 
                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold px-8 shadow-lg shadow-emerald-100"
                >
                  <Printer className="w-4 h-4 mr-2" /> Cetak Rekap
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedClass ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-emerald-600" />
            </div>
            <p className="text-gray-500 font-medium">Silakan pilih kelas untuk melihat rekapitulasi absensi.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md bg-white rounded-3xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rata-rata Kehadiran</p>
                    <h3 className="text-2xl font-black text-gray-900">{totalStats.avgHadir}%</h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-white rounded-3xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Siswa</p>
                    <h3 className="text-2xl font-black text-gray-900">{totalStats.totalSiswa} Orang</h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-white rounded-3xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Kelas</p>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold">AKTIF</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Table */}
            <Card className="border-0 shadow-xl overflow-hidden rounded-[2rem] bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[50px] text-center font-bold">No</TableHead>
                      <TableHead className="min-w-[200px] font-bold">Nama Siswa</TableHead>
                      <TableHead className="text-center font-bold text-emerald-600">H</TableHead>
                      <TableHead className="text-center font-bold text-blue-600">I</TableHead>
                      <TableHead className="text-center font-bold text-amber-600">S</TableHead>
                      <TableHead className="text-center font-bold text-red-600">A</TableHead>
                      <TableHead className="text-center font-bold">Total Hari</TableHead>
                      <TableHead className="text-center font-bold">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rekapData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-gray-400 italic">
                          Tidak ada data absensi untuk periode ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rekapData.map((s, idx) => (
                        <TableRow key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="text-center font-medium text-gray-400">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-gray-900 uppercase">{s.name}</div>
                            <div className="text-[10px] text-gray-400">NISN: {s.nisn || '-'}</div>
                          </TableCell>
                          <TableCell className="text-center font-bold">{s.H}</TableCell>
                          <TableCell className="text-center font-bold">{s.I}</TableCell>
                          <TableCell className="text-center font-bold">{s.S}</TableCell>
                          <TableCell className="text-center font-bold">{s.A}</TableCell>
                          <TableCell className="text-center text-gray-500 font-medium">{s.totalDays}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`font-bold px-3 py-1 rounded-full ${
                              s.percentage >= 90 ? 'bg-emerald-100 text-emerald-700' : 
                              s.percentage >= 75 ? 'bg-amber-100 text-amber-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              {s.percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex gap-4">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">Tips Rekapitulasi:</p>
                <p>Data di atas dihitung secara otomatis berdasarkan absensi harian yang telah diinput oleh guru kelas. Pastikan seluruh hari efektif telah diabsen agar persentase kehadiran akurat.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RekapAbsensi;