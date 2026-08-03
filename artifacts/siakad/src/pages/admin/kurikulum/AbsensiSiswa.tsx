"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Save, Loader2, Search, UserCheck2, Calendar, 
  CheckCircle2, Info, RefreshCw, Users, Filter, Printer, ArrowLeft,
  Pencil, History, Trash2
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface AttendanceRecord {
  student_id: string;
  status: 'H' | 'I' | 'S' | 'A'; // Hadir, Izin, Sakit, Alpa
}

interface DailyAttendance {
  date: string;
  class_id: string;
  records: AttendanceRecord[];
}

const AbsensiSiswa = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<DailyAttendance[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentRecords, setCurrentRecords] = useState<AttendanceRecord[]>([]);

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

  const currentClassStudents = useMemo(() => {
    return students.filter(s => s.class_id === selectedClass);
  }, [students, selectedClass]);

  const hasExistingData = useMemo(() => {
    return attendanceList.some(a => a.date === selectedDate && a.class_id === selectedClass);
  }, [selectedDate, selectedClass, attendanceList]);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      const existing = attendanceList.find(a => a.date === selectedDate && a.class_id === selectedClass);
      if (existing) {
        setCurrentRecords(existing.records);
      } else {
        setCurrentRecords(currentClassStudents.map(s => ({ student_id: s.id, status: 'H' })));
      }
    }
  }, [selectedClass, selectedDate, attendanceList, currentClassStudents]);

  const handleStatusChange = (studentId: string, status: 'H' | 'I' | 'S' | 'A') => {
    setCurrentRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, status } : r));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setIsSaving(true);
    try {
      const newEntry: DailyAttendance = {
        date: selectedDate,
        class_id: selectedClass,
        records: currentRecords
      };

      const filteredList = attendanceList.filter(a => !(a.date === selectedDate && a.class_id === selectedClass));
      const newList = [newEntry, ...filteredList];

      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'attendance_data_list', 
          value: newList, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      setAttendanceList(newList);
      await refreshSettings();
      showSuccess(hasExistingData ? 'Absensi berhasil diperbarui!' : 'Absensi berhasil disimpan!');
    } catch (err) {
      showError('Gagal menyimpan absensi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (date: string, classId: string) => {
    if (!confirm('Hapus data absensi ini?')) return;
    try {
      const newList = attendanceList.filter(a => !(a.date === date && a.class_id === classId));
      await supabase.from('site_settings').upsert({ id: 'attendance_data_list', value: newList });
      setAttendanceList(newList);
      showSuccess('Data absensi dihapus');
    } catch (err) {
      showError('Gagal menghapus');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  if (isPrinting && selectedClass) {
    const className = classes.find(c => c.id === selectedClass)?.nama_kelas;
    return (
      <div className="min-h-screen bg-white p-0">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
          </Button>
        </div>

        <div 
          className="mx-auto print:w-full flex flex-col font-serif"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
            boxSizing: 'border-box'
          }}
        >
          {printConfig.show_kop && <KopSurat />}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold underline uppercase">DAFTAR HADIR HARIAN SISWA</h2>
            <p className="mt-1">Hari/Tanggal: {formatDate(selectedDate)} | Kelas: {className}</p>
          </div>

          <table className="w-full border-collapse border border-black text-[10pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2 text-left">Nama Siswa</th>
                <th className="border border-black p-2 text-center w-16">H</th>
                <th className="border border-black p-2 text-center w-16">I</th>
                <th className="border border-black p-2 text-center w-16">S</th>
                <th className="border border-black p-2 text-center w-16">A</th>
                <th className="border border-black p-2 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {currentClassStudents.map((student, idx) => {
                const record = currentRecords.find(r => r.student_id === student.id);
                return (
                  <tr key={student.id}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2 font-bold uppercase">{student.name}</td>
                    <td className="border border-black p-2 text-center font-bold">{record?.status === 'H' ? '✓' : ''}</td>
                    <td className="border border-black p-2 text-center font-bold">{record?.status === 'I' ? '✓' : ''}</td>
                    <td className="border border-black p-2 text-center font-bold">{record?.status === 'S' ? '✓' : ''}</td>
                    <td className="border border-black p-2 text-center font-bold">{record?.status === 'A' ? '✓' : ''}</td>
                    <td className="border border-black p-2"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {printConfig.show_signature && (
            <div className="mt-12">
              <PenandatanganDokumen targetKelas={className} />
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Absensi Harian Siswa">
      <div className="space-y-6">
        <Card className="border-0 shadow-lg bg-emerald-600 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <UserCheck2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Pencatatan Kehadiran</h2>
                  <p className="text-emerald-100 text-sm">Pilih kelas and tanggal untuk memulai absensi.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="flex-1 md:flex-none">
                  <label className="text-[10px] font-bold uppercase text-emerald-200 mb-1 block">Tanggal</label>
                  <Input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white/10 border-white/20 text-white rounded-xl h-12"
                  />
                </div>
                <div className="flex-1 md:flex-none">
                  <label className="text-[10px] font-bold uppercase text-emerald-200 mb-1 block">Pilih Kelas</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white rounded-xl h-12">
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nama_kelas}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedClass ? (
          <div className="space-y-8">
            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed">
              <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Silakan pilih Kelas terlebih dahulu.</p>
            </div>

            {/* Riwayat Absensi Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" /> Riwayat Absensi Terbaru
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {attendanceList.slice(0, 6).map((item, idx) => (
                  <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-all group">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-0">{classes.find(c => c.id === item.class_id)?.nama_kelas}</Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedClass(item.class_id); setSelectedDate(item.date); }} className="h-8 w-8 p-0 text-blue-600"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.date, item.class_id)} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">{formatDate(item.date)}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.records.length} Siswa Tercatat</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-3 items-center">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 px-4 py-1.5 rounded-full font-bold">
                  {currentClassStudents.length} Siswa
                </Badge>
                {hasExistingData && (
                  <Badge className="bg-blue-100 text-blue-700 border-0 px-4 py-1.5 rounded-full font-bold flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> MODE EDIT
                  </Badge>
                )}
                <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Hadir</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Izin</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Sakit</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Alpa</span>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={() => setIsPrinting(true)} variant="outline" className="flex-1 sm:flex-none rounded-xl font-bold h-12">
                  <Printer className="w-4 h-4 mr-2" /> Cetak
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-12 shadow-lg">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {hasExistingData ? 'Update Absensi' : 'Simpan Absensi'}
                </Button>
              </div>
            </div>

            <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[50px] text-center font-bold">No</TableHead>
                      <TableHead className="min-w-[200px] font-bold">Nama Siswa</TableHead>
                      <TableHead className="text-center font-bold">Status Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentClassStudents.map((student, idx) => {
                      const record = currentRecords.find(r => r.student_id === student.id);
                      return (
                        <TableRow key={student.id} className="hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="text-center font-medium text-gray-400">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-gray-900">{student.name}</div>
                            <div className="text-[10px] text-gray-400 uppercase">NISN: {student.nisn || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <RadioGroup 
                              value={record?.status || 'H'} 
                              onValueChange={(v: any) => handleStatusChange(student.id, v)}
                              className="flex justify-center gap-3 sm:gap-6"
                            >
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <RadioGroupItem value="H" id={`h-${student.id}`} className="text-emerald-600 border-emerald-200" />
                                <Label htmlFor={`h-${student.id}`} className="text-[10px] sm:text-xs font-bold text-emerald-700 cursor-pointer">H</Label>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <RadioGroupItem value="I" id={`i-${student.id}`} className="text-blue-600 border-blue-200" />
                                <Label htmlFor={`i-${student.id}`} className="text-[10px] sm:text-xs font-bold text-blue-700 cursor-pointer">I</Label>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <RadioGroupItem value="S" id={`s-${student.id}`} className="text-amber-600 border-amber-200" />
                                <Label htmlFor={`s-${student.id}`} className="text-[10px] sm:text-xs font-bold text-amber-700 cursor-pointer">S</Label>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <RadioGroupItem value="A" id={`a-${student.id}`} className="text-red-600 border-red-200" />
                                <Label htmlFor={`a-${student.id}`} className="text-[10px] sm:text-xs font-bold text-red-700 cursor-pointer">A</Label>
                              </div>
                            </RadioGroup>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AbsensiSiswa;