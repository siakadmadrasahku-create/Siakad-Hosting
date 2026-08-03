"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Archive, 
  Printer, 
  Download, 
  Trash2, 
  Eye, 
  Plus, 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Wallet, 
  Megaphone, 
  Clock, 
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';

export interface AcademicArchive {
  id: string;
  academic_year: string;
  semester: string;
  archived_at: string;
  archived_by?: string;
  note?: string;
  summary: {
    student_count: number;
    class_count: number;
    mapel_count: number;
    nilai_count: number;
    spmb_count: number;
    financial_count: number;
  };
  data: {
    students?: any[];
    classes?: any[];
    schedules?: any[];
    mapels?: any[];
    nilai?: any[];
    absensi?: any[];
    spmb?: any[];
    finance?: any[];
    matrix?: any[];
    lckh?: any[];
    settings_snapshot?: any;
  };
}

const ArsipAkademik = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [archives, setArchives] = useState<AcademicArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Modal States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewModalArchive, setViewModalArchive] = useState<AcademicArchive | null>(null);
  const [printArchive, setPrintArchive] = useState<AcademicArchive | null>(null);
  const [printDocType, setPrintDocType] = useState<'ringkasan' | 'daftar_siswa_per_kelas'>('ringkasan');
  const [selectedClassForPrint, setSelectedClassForPrint] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'siswa' | 'kelas' | 'mapel' | 'spmb' | 'keuangan'>('ringkasan');
  const [searchTerm, setSearchTerm] = useState('');

  // Form create state
  const [selectedYear, setSelectedYear] = useState('2024/2025');
  const [selectedSemester, setSelectedSemester] = useState('Ganjil');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchArchives();
    if (settings.tahun_pelajaran) {
      setSelectedYear(settings.tahun_pelajaran.active_year || '2024/2025');
      setSelectedSemester(settings.tahun_pelajaran.semester || 'Ganjil');
    }
  }, [settings]);

  const fetchArchives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'academic_archives')
        .maybeSingle();

      if (error) throw error;
      if (data && Array.isArray(data.value)) {
        setArchives(data.value);
      } else {
        setArchives([]);
      }
    } catch (err: any) {
      console.error('Fetch archives error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArchive = async () => {
    setCreating(true);
    try {
      // 1. Fetch all datasets from site_settings & tables
      const { data: allSettings } = await supabase.from('site_settings').select('*');
      
      const getSettingVal = (id: string, fallback: any = []) => {
        const found = allSettings?.find(s => s.id === id);
        return found?.value ?? fallback;
      };

      const students = getSettingVal('students_list', []);
      const classes = getSettingVal('classes_list', []);
      const mapels = getSettingVal('mapel_list', []);
      const schedules = getSettingVal('schedules_list', []);
      const nilai = getSettingVal('nilai_list', []);
      const absensi = getSettingVal('absensi_list', []);
      const spmb = getSettingVal('pendaftaran_spmb_list', []);
      const finance = getSettingVal('spp_transactions', []);
      const matrix = getSettingVal('matrix_kurikulum', []);
      const lckh = getSettingVal('lckh_list', []);

      const newArchive: AcademicArchive = {
        id: `archive_${Date.now()}`,
        academic_year: selectedYear,
        semester: selectedSemester,
        archived_at: new Date().toISOString(),
        archived_by: localStorage.getItem('siakad_current_user_email') || 'Admin',
        note: note.trim() || `Arsip Data Akademik ${selectedYear} Semester ${selectedSemester}`,
        summary: {
          student_count: Array.isArray(students) ? students.length : 0,
          class_count: Array.isArray(classes) ? classes.length : 0,
          mapel_count: Array.isArray(mapels) ? mapels.length : 0,
          nilai_count: Array.isArray(nilai) ? nilai.length : 0,
          spmb_count: Array.isArray(spmb) ? spmb.length : 0,
          financial_count: Array.isArray(finance) ? finance.length : 0,
        },
        data: {
          students: Array.isArray(students) ? students : [],
          classes: Array.isArray(classes) ? classes : [],
          schedules: Array.isArray(schedules) ? schedules : [],
          mapels: Array.isArray(mapels) ? mapels : [],
          nilai: Array.isArray(nilai) ? nilai : [],
          absensi: Array.isArray(absensi) ? absensi : [],
          spmb: Array.isArray(spmb) ? spmb : [],
          finance: Array.isArray(finance) ? finance : [],
          matrix: Array.isArray(matrix) ? matrix : [],
          lckh: Array.isArray(lckh) ? lckh : [],
          settings_snapshot: {
            identitas: settings.identitas_madrasah,
            penandatangan: settings.penandatangan
          }
        }
      };

      // Filter existing archives to remove duplicate year+semester if overwriting, or append
      const updatedArchives = [
        newArchive,
        ...archives.filter(a => !(a.academic_year === selectedYear && a.semester === selectedSemester))
      ];

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 'academic_archives',
          value: updatedArchives,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setArchives(updatedArchives);
      showSuccess(`Berhasil menyimpan Arsip Akademik ${selectedYear} - Semester ${selectedSemester}!`);
      setCreateDialogOpen(false);
      setNote('');
    } catch (err: any) {
      showError('Gagal membuat arsip: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteArchive = async (archiveId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus arsip ini? Data yang terhapus tidak dapat dikembalikan.')) {
      return;
    }

    try {
      const updatedArchives = archives.filter(a => a.id !== archiveId);
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 'academic_archives',
          value: updatedArchives,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setArchives(updatedArchives);
      showSuccess('Arsip berhasil dihapus');
      if (viewModalArchive?.id === archiveId) setViewModalArchive(null);
    } catch (err: any) {
      showError('Gagal menghapus arsip: ' + err.message);
    }
  };

  const handleExportJson = (archive: AcademicArchive) => {
    const filename = `arsip-akademik-${archive.academic_year.replace('/', '-')}-${archive.semester.toLowerCase()}-${new Date(archive.archived_at).toISOString().split('T')[0]}.json`;
    const jsonStr = JSON.stringify(archive, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showSuccess('File JSON arsip berhasil diunduh');
  };

  const handleRestoreArchive = async (archive: AcademicArchive) => {
    const confirm = window.confirm(
      `PERINGATAN! Pemulihan akan menimpa data aktif saat ini dengan data dari Arsip Tahun ${archive.academic_year} Semester ${archive.semester}.\n\nLanjutkan pemulihan?`
    );
    if (!confirm) return;

    setRestoring(true);
    try {
      const d = archive.data;

      if (d.students) {
        await supabase.from('site_settings').upsert({ id: 'students_list', value: d.students });
      }
      if (d.classes) {
        await supabase.from('site_settings').upsert({ id: 'classes_list', value: d.classes });
      }
      if (d.mapels) {
        await supabase.from('site_settings').upsert({ id: 'mapel_list', value: d.mapels });
      }
      if (d.schedules) {
        await supabase.from('site_settings').upsert({ id: 'schedules_list', value: d.schedules });
      }
      if (d.nilai) {
        await supabase.from('site_settings').upsert({ id: 'nilai_list', value: d.nilai });
      }
      if (d.absensi) {
        await supabase.from('site_settings').upsert({ id: 'absensi_list', value: d.absensi });
      }
      if (d.spmb) {
        await supabase.from('site_settings').upsert({ id: 'pendaftaran_spmb_list', value: d.spmb });
      }
      if (d.finance) {
        await supabase.from('site_settings').upsert({ id: 'spp_transactions', value: d.finance });
      }

      await refreshSettings();
      showSuccess('Data berhasil dipulihkan dari arsip!');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showError('Gagal memulihkan arsip: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  // Full Screen Print View mode
  if (printArchive) {
    const d = printArchive.data;
    const students = d.students || [];
    const classes = d.classes || [];
    const mapels = d.mapels || [];

    const selectedClassObj = classes.find((c: any) => c.id === selectedClassForPrint || c.nama_kelas === selectedClassForPrint);

    const filteredStudentsForPrint = selectedClassForPrint === 'all'
      ? students
      : students.filter((s: any) => {
          if (selectedClassObj) {
            return s.class_id === selectedClassObj.id ||
                   s.class_id === selectedClassObj.nama_kelas ||
                   s.kelas === selectedClassObj.nama_kelas ||
                   (s.class_id && selectedClassObj.nama_kelas && String(s.class_id).toLowerCase() === String(selectedClassObj.nama_kelas).toLowerCase());
          }
          return s.class_id === selectedClassForPrint || s.kelas === selectedClassForPrint;
        });

    return (
      <div className="min-h-screen bg-slate-100 p-0 sm:p-6 print:p-0 print:bg-white text-slate-900 font-serif">
        {/* Top Control Action Bar */}
        <div className="sticky top-0 z-[100] bg-white border-b border-slate-200 p-4 shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden max-w-5xl mx-auto rounded-2xl mb-6 font-sans">
          <Button 
            variant="ghost" 
            onClick={() => setPrintArchive(null)} 
            className="font-bold text-slate-600 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Manajemen Arsip
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            {/* Choose Doc Type */}
            <Select value={printDocType} onValueChange={(v: 'ringkasan' | 'daftar_siswa_per_kelas') => setPrintDocType(v)}>
              <SelectTrigger className="w-60 h-10 rounded-xl text-xs font-bold border-slate-300">
                <SelectValue placeholder="Pilih Jenis Dokumen" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ringkasan" className="text-xs font-bold">1. Ringkasan Laporan Akademik</SelectItem>
                <SelectItem value="daftar_siswa_per_kelas" className="text-xs font-bold">2. Daftar Siswa Per Kelas (Siap Cetak)</SelectItem>
              </SelectContent>
            </Select>

            {/* Class Filter if student list mode */}
            {printDocType === 'daftar_siswa_per_kelas' && (
              <Select value={selectedClassForPrint} onValueChange={setSelectedClassForPrint}>
                <SelectTrigger className="w-52 h-10 rounded-xl text-xs font-bold border-emerald-300 bg-emerald-50 text-emerald-900">
                  <SelectValue placeholder="Pilih Rombel / Kelas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs font-bold">Semua Rombel/Kelas ({students.length} Siswa)</SelectItem>
                  {classes.map((c: any, i: number) => {
                    const cCount = students.filter((s: any) => s.class_id === c.id || s.class_id === c.nama_kelas || s.kelas === c.nama_kelas).length;
                    return (
                      <SelectItem key={c.id || i} value={c.id || c.nama_kelas} className="text-xs font-bold">
                        Kelas {c.nama_kelas} ({cCount} Siswa)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            <Button 
              onClick={() => window.print()} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-xl shadow-lg flex items-center gap-2 h-10"
            >
              <Printer className="w-4 h-4" /> Cetak Dokumen (A4)
            </Button>
          </div>
        </div>

        {/* Paper Container A4 */}
        <div 
          className="bg-white mx-auto shadow-xl p-[1.5cm] print:shadow-none print:p-0 flex flex-col justify-between"
          style={{ width: '210mm', minHeight: '297mm' }}
        >
          <div>
            <KopSurat />

            {printDocType === 'ringkasan' ? (
              <>
                <div className="text-center my-6 border-b border-slate-900 pb-4">
                  <h1 className="text-xl font-bold uppercase tracking-wide">
                    LAPORAN DOKUMEN ARSIP DATA AKADEMIK
                  </h1>
                  <p className="text-sm font-bold uppercase mt-1 text-slate-700">
                    TAHUN PELAJARAN {printArchive.academic_year} — SEMESTER {printArchive.semester}
                  </p>
                  <p className="text-xs italic text-slate-500 mt-0.5">
                    Tanggal Pengarsipan: {new Date(printArchive.archived_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} oleh {printArchive.archived_by || 'Admin'}
                  </p>
                </div>

                {/* Catatan Arsip */}
                {printArchive.note && (
                  <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans">
                    <span className="font-bold">Catatan Arsip:</span> {printArchive.note}
                  </div>
                )}

                {/* Summary Grid Table */}
                <div className="mb-6 font-sans text-xs">
                  <h3 className="font-serif font-bold text-sm mb-2 border-b border-slate-400 pb-1 uppercase">1. Ringkasan Statistik Data</h3>
                  <table className="w-full border-collapse border border-slate-900 text-left">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-900">
                        <th className="border border-slate-900 p-2">Indikator Data</th>
                        <th className="border border-slate-900 p-2 text-center">Jumlah Record</th>
                        <th className="border border-slate-900 p-2">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-900 p-2 font-medium">Data Siswa Terdaftar</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">{printArchive.summary.student_count}</td>
                        <td className="border border-slate-900 p-2">Siswa terdaftar aktif & alumni dalam arsip</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-900 p-2 font-medium">Rombongan Belajar / Kelas</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">{printArchive.summary.class_count}</td>
                        <td className="border border-slate-900 p-2">Kelas/Rombel aktif pada periode ini</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-900 p-2 font-medium">Mata Pelajaran (Kurikulum)</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">{printArchive.summary.mapel_count}</td>
                        <td className="border border-slate-900 p-2">Matpel terdaftar & diajarkan</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-900 p-2 font-medium">Total Input Nilai Siswa</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">{printArchive.summary.nilai_count}</td>
                        <td className="border border-slate-900 p-2">Rekap nilai mata pelajaran tersimpan</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-900 p-2 font-medium">Pendaftaran SPMB</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">{printArchive.summary.spmb_count}</td>
                        <td className="border border-slate-900 p-2">Pendaftar murid baru dalam periode</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-900 p-2 font-medium">Transaksi Keuangan SPP</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">{printArchive.summary.financial_count}</td>
                        <td className="border border-slate-900 p-2">Catatan pembayaran terarsipkan</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Rincian Kelas & Siswa */}
                <div className="mb-6 font-sans text-xs">
                  <h3 className="font-serif font-bold text-sm mb-2 border-b border-slate-400 pb-1 uppercase">2. Rekapitulasi Kelas & Jumlah Siswa</h3>
                  <table className="w-full border-collapse border border-slate-900 text-left">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-900">
                        <th className="border border-slate-900 p-2 w-10 text-center">No</th>
                        <th className="border border-slate-900 p-2">Nama Kelas</th>
                        <th className="border border-slate-900 p-2">Tingkat</th>
                        <th className="border border-slate-900 p-2 text-center">Jumlah Siswa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="border border-slate-900 p-3 text-center text-slate-500 italic">Tidak ada data kelas dalam arsip</td>
                        </tr>
                      ) : (
                        classes.map((c: any, i: number) => {
                          const count = students.filter((s: any) => s.class_id === c.id || s.kelas === c.nama_kelas).length;
                          return (
                            <tr key={c.id || i}>
                              <td className="border border-slate-900 p-1.5 text-center">{i + 1}</td>
                              <td className="border border-slate-900 p-1.5 font-bold">{c.nama_kelas}</td>
                              <td className="border border-slate-900 p-1.5">Tingkat {c.tingkat || '-'}</td>
                              <td className="border border-slate-900 p-1.5 text-center font-bold">{count} Siswa</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Daftar Mata Pelajaran */}
                {mapels.length > 0 && (
                  <div className="mb-6 font-sans text-xs">
                    <h3 className="font-serif font-bold text-sm mb-2 border-b border-slate-400 pb-1 uppercase">3. Daftar Mata Pelajaran Diajarkan</h3>
                    <table className="w-full border-collapse border border-slate-900 text-left">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-900">
                          <th className="border border-slate-900 p-2 w-10 text-center">No</th>
                          <th className="border border-slate-900 p-2">Mata Pelajaran</th>
                          <th className="border border-slate-900 p-2">Kelompok / Kategori</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mapels.slice(0, 15).map((m: any, i: number) => (
                          <tr key={m.id || i}>
                            <td className="border border-slate-900 p-1.5 text-center">{i + 1}</td>
                            <td className="border border-slate-900 p-1.5 font-bold">{m.nama || m.name}</td>
                            <td className="border border-slate-900 p-1.5">{m.kategori || m.kelompok || 'Umum'}</td>
                          </tr>
                        ))}
                        {mapels.length > 15 && (
                          <tr>
                            <td colSpan={3} className="border border-slate-900 p-1.5 text-center italic text-slate-600">
                              ... dan {mapels.length - 15} mata pelajaran lainnya.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              /* DAFTAR SISWA PER KELAS SIAP CETAK */
              <>
                <div className="text-center my-6 border-b border-slate-900 pb-4">
                  <h1 className="text-xl font-bold uppercase tracking-wide">
                    ARSIP DAFTAR SISWA PER ROMBONGAN BELAJAR
                  </h1>
                  <h2 className="text-base font-bold uppercase mt-1 text-slate-800">
                    {selectedClassObj ? `KELAS: ${selectedClassObj.nama_kelas} (TINGKAT ${selectedClassObj.tingkat || '-'})` : 'SEMUA KELAS / ROMBONGAN BELAJAR'}
                  </h2>
                  <p className="text-xs font-bold uppercase mt-1 text-slate-600">
                    TAHUN PELAJARAN {printArchive.academic_year} — SEMESTER {printArchive.semester}
                  </p>
                </div>

                {/* Class Metadata Header if specific class is selected */}
                {selectedClassObj && (
                  <div className="mb-4 p-3 border border-slate-900 bg-slate-50 flex justify-between items-center text-xs font-sans">
                    <div>
                      <p><span className="font-bold">Rombongan Belajar:</span> {selectedClassObj.nama_kelas}</p>
                      <p><span className="font-bold">Tingkat Kelas:</span> Tingkat {selectedClassObj.tingkat || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p><span className="font-bold">Wali Kelas:</span> {selectedClassObj.wali_kelas || '-'}</p>
                      {selectedClassObj.nip_wali_kelas && <p className="font-mono">NIP: {selectedClassObj.nip_wali_kelas}</p>}
                    </div>
                  </div>
                )}

                {/* Student Table */}
                <div className="mb-6 font-sans text-xs">
                  <table className="w-full border-collapse border border-slate-900 text-left">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-900">
                        <th className="border border-slate-900 p-2 w-8 text-center">No</th>
                        <th className="border border-slate-900 p-2 w-28 text-center">NIS / NISN</th>
                        <th className="border border-slate-900 p-2">Nama Lengkap Siswa</th>
                        <th className="border border-slate-900 p-2 w-10 text-center">L/P</th>
                        <th className="border border-slate-900 p-2">Tempat, Tgl Lahir</th>
                        <th className="border border-slate-900 p-2 w-24 text-center">Rombel</th>
                        <th className="border border-slate-900 p-2">Nama Orang Tua</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudentsForPrint.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-slate-900 p-4 text-center text-slate-500 italic">
                            Tidak ada siswa terdaftar dalam kelas/arsip ini.
                          </td>
                        </tr>
                      ) : (
                        filteredStudentsForPrint.map((s: any, idx: number) => (
                          <tr key={s.id || idx} className="odd:bg-white even:bg-slate-50/50">
                            <td className="border border-slate-900 p-1.5 text-center font-medium">{idx + 1}</td>
                            <td className="border border-slate-900 p-1.5 text-center font-mono font-bold">
                              {s.nisn || s.nis || '-'}
                            </td>
                            <td className="border border-slate-900 p-1.5 font-bold uppercase">
                              {s.nama || s.nama_lengkap || s.name}
                            </td>
                            <td className="border border-slate-900 p-1.5 text-center font-bold">
                              {(s.jenis_kelamin || s.gender) === 'Laki-laki' || (s.jenis_kelamin || s.gender) === 'L' ? 'L' : 'P'}
                            </td>
                            <td className="border border-slate-900 p-1.5">
                              {s.tempat_lahir ? `${s.tempat_lahir}, ${s.tanggal_lahir || ''}` : s.tanggal_lahir || '-'}
                            </td>
                            <td className="border border-slate-900 p-1.5 text-center font-bold">
                              {s.kelas || s.class_id || '-'}
                            </td>
                            <td className="border border-slate-900 p-1.5 uppercase">
                              {s.nama_ayah || s.nama_ibu || s.nama_orang_tua || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Summary Totals */}
                  <div className="mt-3 flex justify-between items-center text-xs font-bold font-sans border-t border-slate-300 pt-2">
                    <p>Total Siswa: {filteredStudentsForPrint.length} Siswa</p>
                    <p>
                      Laki-laki: {filteredStudentsForPrint.filter((s: any) => (s.jenis_kelamin || s.gender) === 'Laki-laki' || (s.jenis_kelamin || s.gender) === 'L').length} | 
                      Perempuan: {filteredStudentsForPrint.filter((s: any) => (s.jenis_kelamin || s.gender) === 'Perempuan' || (s.jenis_kelamin || s.gender) === 'P').length}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Signature Footer */}
          <div className="mt-8 pt-4">
            <PenandatanganDokumen showGuru={false} />
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 0; }
            body { background: white; margin: 0; padding: 0; }
            .print\\:hidden { display: none !important; }
          }
        ` }} />
      </div>
    );
  }

  const filteredArchives = archives.filter(a => 
    a.academic_year.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.semester.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.note && a.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout title="Pusat Arsip Data Akademik">
      <div className="max-w-6xl space-y-6">
        {/* Banner Info */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Pengarsipan Otomatis & Terstruktur
            </div>
            <h2 className="text-2xl font-black tracking-tight">Arsip Data Akademik Per Tahun & Semester</h2>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Simpan rekam jejak lengkap (Siswa, Kelas, Jadwal, Nilai, SPMB, Keuangan) saat pergantian tahun pelajaran. Data lama tersimpan aman, siap dipratinjau, dipulihkan, atau dicetak kapan saja.
            </p>
          </div>

          <div className="z-10 shrink-0">
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold h-12 px-6 rounded-2xl shadow-lg border-0 transition-transform active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-5 h-5 text-emerald-600" /> Simpan Arsip Baru
            </Button>
          </div>

          <Archive className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />
        </div>

        {/* Top Filter and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Cari tahun pelajaran atau semester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl text-xs h-10"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
            <Archive className="w-4 h-4 text-emerald-600" /> Total Arsip Tersimpan: <Badge className="bg-emerald-100 text-emerald-800 font-extrabold">{archives.length}</Badge>
          </div>
        </div>

        {/* List of Archives */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs font-bold text-slate-500">Memuat data arsip...</p>
          </div>
        ) : filteredArchives.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-white">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Archive className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Belum Ada Arsip Akademik Tersimpan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Saat tahun ajaran atau semester berakhir, klik tombol &quot;Simpan Arsip Baru&quot; untuk mengamankan rekapitulasi data akademik.
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6"
            >
              <Plus className="w-4 h-4 mr-2" /> Simpan Arsip Sekarang
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredArchives.map((archive) => (
              <Card key={archive.id} className="border-0 shadow-lg rounded-3xl overflow-hidden hover:shadow-xl transition-all group bg-white border-slate-100">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-5 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-lg">
                        {archive.academic_year}
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-bold text-xs px-2.5 py-0.5 rounded-lg">
                        Semester {archive.semester}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-black text-slate-800 pt-1">
                      {archive.note || `Arsip Data ${archive.academic_year}`}
                    </CardTitle>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {new Date(archive.archived_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <Archive className="w-5 h-5" />
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* Summary badges */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <div className="p-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Siswa</p>
                      <p className="text-base font-black text-emerald-700">{archive.summary.student_count}</p>
                    </div>
                    <div className="p-1 border-x border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Kelas</p>
                      <p className="text-base font-black text-blue-700">{archive.summary.class_count}</p>
                    </div>
                    <div className="p-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Nilai</p>
                      <p className="text-base font-black text-purple-700">{archive.summary.nilai_count}</p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewModalArchive(archive);
                        setActiveTab('ringkasan');
                      }}
                      className="flex-1 rounded-xl font-bold text-xs hover:bg-slate-100 text-slate-700 h-10"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Detail Arsip
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setPrintArchive(archive)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs px-3 h-10 shadow-md"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak (Siap Cetak)
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Unduh Backup JSON"
                      onClick={() => handleExportJson(archive)}
                      className="rounded-xl h-10 w-10 text-slate-500 hover:bg-slate-100"
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Pulihkan Data"
                      onClick={() => handleRestoreArchive(archive)}
                      className="rounded-xl h-10 w-10 text-amber-600 hover:bg-amber-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Hapus Arsip"
                      onClick={() => handleDeleteArchive(archive.id)}
                      className="rounded-xl h-10 w-10 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog Buat Arsip Baru */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-800">
                <Archive className="w-6 h-6 text-emerald-600" />
                Simpan Arsip Data Akademik Baru
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Proses Penyimpanan Instan
                </p>
                <p className="text-emerald-700">
                  Sistem akan mengambil foto snapshot seluruh data (Siswa, Kelas, Mapel, Jadwal, Nilai, SPMB, dan SPP) untuk periode yang Anda tentukan di bawah ini.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tahun Pelajaran</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="rounded-xl h-11 text-xs font-bold">
                      <SelectValue placeholder="Pilih Tahun" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(settings.tahun_pelajaran?.available_years || ['2024/2025', '2025/2026', '2026/2027']).map((y: string) => (
                        <SelectItem key={y} value={y} className="text-xs font-bold">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Semester</label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger className="rounded-xl h-11 text-xs font-bold">
                      <SelectValue placeholder="Pilih Semester" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Ganjil" className="text-xs font-bold">Ganjil</SelectItem>
                      <SelectItem value="Genap" className="text-xs font-bold">Genap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Catatan/Keterangan Arsip</label>
                <Textarea
                  placeholder="Contoh: Arsip Penutupan Semester Ganjil TA 2024/2025"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-2xl text-xs h-20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCreateDialogOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Batal
              </Button>
              <Button 
                onClick={handleCreateArchive}
                disabled={creating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs px-5"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                Simpan Arsip Sekarang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal View Detail Archive */}
        {viewModalArchive && (
          <Dialog open={!!viewModalArchive} onOpenChange={(open) => !open && setViewModalArchive(null)}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] rounded-3xl p-6 overflow-hidden flex flex-col">
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-600 text-white font-black">{viewModalArchive.academic_year}</Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-bold">Semester {viewModalArchive.semester}</Badge>
                    </div>
                    <DialogTitle className="text-xl font-black text-slate-800">
                      {viewModalArchive.note || 'Detail Snapshot Arsip'}
                    </DialogTitle>
                  </div>

                  <Button 
                    onClick={() => {
                      const arch = viewModalArchive;
                      setViewModalArchive(null);
                      setPrintArchive(arch);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs px-4 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Cetak (Siap Cetak)
                  </Button>
                </div>
              </DialogHeader>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto border-b py-2 text-xs font-bold scrollbar-hide">
                <button
                  onClick={() => setActiveTab('ringkasan')}
                  className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'ringkasan' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Ringkasan Data
                </button>
                <button
                  onClick={() => setActiveTab('siswa')}
                  className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'siswa' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Data Siswa ({viewModalArchive.data.students?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('kelas')}
                  className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'kelas' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Rombel / Kelas ({viewModalArchive.data.classes?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('mapel')}
                  className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'mapel' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Mata Pelajaran ({viewModalArchive.data.mapels?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('spmb')}
                  className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'spmb' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  SPMB ({viewModalArchive.data.spmb?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('keuangan')}
                  className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'keuangan' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Keuangan ({viewModalArchive.data.finance?.length || 0})
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto py-4 text-xs">
                {activeTab === 'ringkasan' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <Users className="w-5 h-5 text-emerald-600 mb-1" />
                        <p className="text-[10px] text-emerald-700 font-bold uppercase">Total Siswa</p>
                        <p className="text-xl font-black text-emerald-900">{viewModalArchive.summary.student_count}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <GraduationCap className="w-5 h-5 text-blue-600 mb-1" />
                        <p className="text-[10px] text-blue-700 font-bold uppercase">Rombel Kelas</p>
                        <p className="text-xl font-black text-blue-900">{viewModalArchive.summary.class_count}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                        <BookOpen className="w-5 h-5 text-purple-600 mb-1" />
                        <p className="text-[10px] text-purple-700 font-bold uppercase">Mata Pelajaran</p>
                        <p className="text-xl font-black text-purple-900">{viewModalArchive.summary.mapel_count}</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <FileSpreadsheet className="w-5 h-5 text-amber-600 mb-1" />
                        <p className="text-[10px] text-amber-700 font-bold uppercase">Input Nilai</p>
                        <p className="text-xl font-black text-amber-900">{viewModalArchive.summary.nilai_count}</p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <Megaphone className="w-5 h-5 text-rose-600 mb-1" />
                        <p className="text-[10px] text-rose-700 font-bold uppercase">Pendaftar SPMB</p>
                        <p className="text-xl font-black text-rose-900">{viewModalArchive.summary.spmb_count}</p>
                      </div>
                      <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                        <Wallet className="w-5 h-5 text-teal-600 mb-1" />
                        <p className="text-[10px] text-teal-700 font-bold uppercase">Transaksi SPP</p>
                        <p className="text-xl font-black text-teal-900">{viewModalArchive.summary.financial_count}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border text-slate-700 space-y-1">
                      <p className="font-bold text-slate-900">Informasi Metadata Arsip:</p>
                      <p>• ID Arsip: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">{viewModalArchive.id}</code></p>
                      <p>• Dibuat pada: {new Date(viewModalArchive.archived_at).toLocaleString('id-ID')}</p>
                      <p>• Oleh Pengarsip: {viewModalArchive.archived_by || 'Admin'}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'siswa' && (
                  <div className="space-y-3">
                    <div className="max-h-96 overflow-y-auto border rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 sticky top-0 font-bold">
                          <tr>
                            <th className="p-2.5 border-b">No</th>
                            <th className="p-2.5 border-b">NIS / NISN</th>
                            <th className="p-2.5 border-b">Nama Siswa</th>
                            <th className="p-2.5 border-b">Kelas</th>
                            <th className="p-2.5 border-b">L/P</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(viewModalArchive.data.students || []).map((s: any, idx: number) => (
                            <tr key={s.id || idx} className="hover:bg-slate-50 border-b">
                              <td className="p-2.5">{idx + 1}</td>
                              <td className="p-2.5 font-mono">{s.nis || s.nisn || '-'}</td>
                              <td className="p-2.5 font-bold">{s.nama || s.nama_lengkap}</td>
                              <td className="p-2.5">{s.kelas || s.class_id || '-'}</td>
                              <td className="p-2.5">{s.jenis_kelamin || s.gender || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'kelas' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(viewModalArchive.data.classes || []).map((c: any, idx: number) => {
                      const cCount = (viewModalArchive.data.students || []).filter((s: any) => s.class_id === c.id || s.class_id === c.nama_kelas || s.kelas === c.nama_kelas).length;
                      return (
                        <div key={c.id || idx} className="p-3.5 bg-slate-50 border rounded-2xl flex flex-col justify-between gap-2 hover:border-emerald-300 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-extrabold text-sm text-slate-800">Kelas {c.nama_kelas}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                {cCount} Siswa
                              </span>
                            </div>
                            <p className="text-slate-500">Tingkat: <span className="font-medium text-slate-700">{c.tingkat || '-'}</span></p>
                            <p className="text-slate-500">Wali Kelas: <span className="font-medium text-slate-700">{c.wali_kelas || '-'}</span></p>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPrintArchive(viewModalArchive);
                              setPrintDocType('daftar_siswa_per_kelas');
                              setSelectedClassForPrint(c.id || c.nama_kelas);
                              setViewModalArchive(null);
                            }}
                            className="w-full text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5 mt-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> Cetak Siswa Kelas Ini
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'mapel' && (
                  <div className="max-h-96 overflow-y-auto border rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2.5 border-b">Kode</th>
                          <th className="p-2.5 border-b">Mata Pelajaran</th>
                          <th className="p-2.5 border-b">Kategori</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewModalArchive.data.mapels || []).map((m: any, idx: number) => (
                          <tr key={m.id || idx} className="border-b">
                            <td className="p-2.5 font-mono">{m.kode || idx + 1}</td>
                            <td className="p-2.5 font-bold">{m.nama || m.name}</td>
                            <td className="p-2.5">{m.kategori || m.kelompok || 'Umum'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'spmb' && (
                  <div className="max-h-96 overflow-y-auto border rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2.5 border-b">No. Registrasi</th>
                          <th className="p-2.5 border-b">Nama Pendaftar</th>
                          <th className="p-2.5 border-b">Jalur</th>
                          <th className="p-2.5 border-b">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewModalArchive.data.spmb || []).map((p: any, idx: number) => (
                          <tr key={p.id || idx} className="border-b">
                            <td className="p-2.5 font-mono">{p.no_pendaftaran || idx + 1}</td>
                            <td className="p-2.5 font-bold">{p.nama_lengkap || p.nama}</td>
                            <td className="p-2.5">{p.jalur_pendaftaran || 'Reguler'}</td>
                            <td className="p-2.5 font-bold">{p.status || 'Diterima'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'keuangan' && (
                  <div className="max-h-96 overflow-y-auto border rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2.5 border-b">Tanggal</th>
                          <th className="p-2.5 border-b">Siswa</th>
                          <th className="p-2.5 border-b">Jumlah</th>
                          <th className="p-2.5 border-b">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewModalArchive.data.finance || []).map((f: any, idx: number) => (
                          <tr key={f.id || idx} className="border-b">
                            <td className="p-2.5">{f.tanggal || '-'}</td>
                            <td className="p-2.5 font-bold">{f.nama_siswa || f.siswa_id}</td>
                            <td className="p-2.5 font-bold text-emerald-700">Rp {(f.jumlah || f.nominal || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 font-bold">{f.status || 'Lunas'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
};

export default ArsipAkademik;
