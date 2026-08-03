"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Printer, ArrowLeft, FileBadge, User, School, 
  Search, Loader2, CheckCircle2, Download, Layout, Users
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Badge } from '@/components/ui/badge';

const CetakRapor = () => {
  const { settings } = useSiteSettings();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [nilaiList, setNilaiList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 11, show_kop: true, show_signature: true
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      setStudents(res?.find(s => s.id === 'students_list')?.value || []);
      setClasses(res?.find(s => s.id === 'kelas_list')?.value || []);
      setMapels(res?.find(s => s.id === 'mata_pelajaran_list')?.value || []);
      setNilaiList(res?.find(s => s.id === 'nilai_siswa_list')?.value || []);
    } catch (err) {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const studentClass = useMemo(() => {
    return classes.find(c => c.id === selectedStudent?.class_id);
  }, [classes, selectedStudent]);

  const studentGrades = useMemo(() => {
    if (!selectedStudentId) return [];
    
    return mapels.map(mapel => {
      const nilai = nilaiList.find(n => n.student_id === selectedStudentId && n.mapel_id === mapel.id);
      
      // Hitung rata-rata TP
      const tpScores = nilai?.tp_scores ? Object.values(nilai.tp_scores) as number[] : [];
      const avgTP = tpScores.length > 0 ? tpScores.reduce((a, b) => a + b, 0) / tpScores.length : 0;
      
      // Nilai Akhir (Rata-rata TP and SAS)
      const finalGrade = nilai?.sas_score ? (avgTP + nilai.sas_score) / 2 : avgTP;

      return {
        ...mapel,
        nilai_akhir: Math.round(finalGrade) || 0,
        deskripsi: nilai?.description || "Belum ada deskripsi capaian kompetensi."
      };
    });
  }, [mapels, nilaiList, selectedStudentId]);

  if (isPreviewing && selectedStudent) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPreviewing(false)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Rapor
          </Button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto print:p-0">
          <div id="rapor-print-area" className="mx-auto print:w-full">
            <div 
              className="bg-white mx-auto shadow-2xl print:shadow-none print:m-0 print:p-0 print:w-full flex flex-col"
              style={{ 
                width: '210mm', 
                minHeight: '297mm',
                padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
                boxSizing: 'border-box'
              }}
            >
              {printConfig.show_kop && <KopSurat />}
              
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold uppercase">LAPORAN HASIL BELAJAR (RAPOR)</h2>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8 text-[10pt] font-serif">
                <table className="w-full">
                  <tbody>
                    <tr><td className="w-32 py-1">Nama Siswa</td><td className="w-4">:</td><td className="font-bold uppercase">{selectedStudent.name}</td></tr>
                    <tr><td className="py-1">NISN / NIK</td><td>:</td><td>{selectedStudent.nisn || '-'} / {selectedStudent.nik}</td></tr>
                    <tr><td className="py-1">Sekolah</td><td>:</td><td>{settings.identitas_madrasah?.nama_madrasah || 'Si@Kad Madrasah'}</td></tr>
                  </tbody>
                </table>
                <table className="w-full">
                  <tbody>
                    <tr><td className="w-32 py-1">Kelas</td><td className="w-4">:</td><td>{studentClass?.nama_kelas || '-'}</td></tr>
                    <tr><td className="py-1">Fase</td><td>:</td><td>{studentClass?.tingkat === '1' || studentClass?.tingkat === '2' ? 'A' : 'B'}</td></tr>
                    <tr><td className="py-1">Semester</td><td>:</td><td>{settings.tahun_pelajaran?.semester || 'Ganjil'}</td></tr>
                    <tr><td className="py-1">Tahun Pelajaran</td><td>:</td><td>{settings.tahun_pelajaran?.active_year || '2024/2025'}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="flex-1">
                <table className="w-full border-collapse border border-black text-[10pt] font-serif">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 w-10">No</th>
                      <th className="border border-black p-2 text-left">Mata Pelajaran</th>
                      <th className="border border-black p-2 w-20">Nilai Akhir</th>
                      <th className="border border-black p-2 text-left">Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentGrades.map((grade, idx) => (
                      <tr key={grade.id}>
                        <td className="border border-black p-2 text-center">{idx + 1}</td>
                        <td className="border border-black p-2 font-bold">{grade.nama}</td>
                        <td className="border border-black p-2 text-center font-bold text-lg">{grade.nilai_akhir}</td>
                        <td className="border border-black p-2 text-justify leading-tight" style={{ fontSize: '9pt' }}>{grade.deskripsi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {printConfig.show_signature && (
                <div className="mt-12">
                  <PenandatanganDokumen targetKelas={studentClass?.nama_kelas} />
                </div>
              )}
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 0 !important; }
            body { background: white !important; }
            .print\\:hidden { display: none !important; }
            #rapor-print-area { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          }
        ` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Cetak Rapor Digital">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            <FileBadge className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Pusat Pencetakan Rapor</h2>
          <p className="text-gray-500">Pilih siswa untuk melihat and mencetak hasil belajar Kurikulum Merdeka.</p>
        </div>

        <Card className="border-0 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-10 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> Pilih Siswa
                </label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50">
                    <SelectValue placeholder="Cari nama siswa..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({classes.find(c => c.id === s.class_id)?.nama_kelas || 'Tanpa Kelas'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={() => setIsPreviewing(true)} 
                  disabled={!selectedStudentId}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold shadow-xl shadow-emerald-100 transition-all hover:scale-[1.02]"
                >
                  <Layout className="w-5 h-5 mr-2" />
                  Buka Preview Rapor
                </Button>
              </div>
            </div>

            {selectedStudent && (
              <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                    <User className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-gray-900 uppercase">{selectedStudent.name}</h3>
                    <p className="text-emerald-700 font-bold">NISN: {selectedStudent.nisn || '-'}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-white text-emerald-700 border-emerald-200">{studentClass?.nama_kelas}</Badge>
                      <Badge className="bg-white text-emerald-700 border-emerald-200">Semester {settings.tahun_pelajaran?.semester}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-3xl shadow-md border border-gray-50 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><CheckCircle2 className="w-6 h-6" /></div>
            <h4 className="font-bold text-gray-900">Otomatisasi Deskripsi</h4>
            <p className="text-xs text-gray-500">Deskripsi rapor disusun otomatis oleh sistem berdasarkan capaian TP.</p>
          </div>
          <div className="p-6 bg-white rounded-3xl shadow-md border border-gray-50 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600"><Printer className="w-6 h-6" /></div>
            <h4 className="font-bold text-gray-900">Siap Cetak A4</h4>
            <p className="text-xs text-gray-500">Layout presisi sesuai standar Dapodik and Kurikulum Merdeka.</p>
          </div>
          <div className="p-6 bg-white rounded-3xl shadow-md border border-gray-50 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><Download className="w-6 h-6" /></div>
            <h4 className="font-bold text-gray-900">Arsip Digital</h4>
            <p className="text-xs text-gray-500">Simpan rapor sebagai PDF untuk cadangan administrasi sekolah.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CetakRapor;