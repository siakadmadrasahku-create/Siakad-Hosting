"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  GraduationCap, Plus, Pencil, Trash2, Search, Printer, FileSpreadsheet,
  Save, School, ArrowLeft, CheckCircle2, TrendingUp, Users, Filter,
  RefreshCw, Database, Info, Sparkles, RotateCcw
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import * as XLSX from 'xlsx';

export interface TamatanItem {
  id: string;
  tahun_pelajaran: string;
  lulus_l: number;
  lulus_p: number;
  lulus_total: number;
  melanjutkan_mts: number;
  melanjutkan_smp: number;
  melanjutkan_ponpes?: number;
  tidak_melanjutkan: number;
  keterangan?: string;
  source?: 'auto_alumni' | 'auto_projection' | 'manual';
  db_alumni_count?: number;
}

const parseAcademicYearStart = (academicYear?: string) => {
  const match = academicYear?.trim().match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (!match) return null;
  return {
    start: Number(match[1]),
    end: Number(match[2]),
  };
};

const getNextAcademicYear = (academicYear?: string) => {
  const parsed = parseAcademicYearStart(academicYear);
  if (!parsed) return '';
  return `${parsed.start + 1}/${parsed.end + 1}`;
};

const isGraduatedStudent = (student: any) => {
  const status = (student?.status || '').toLowerCase().trim();
  const rombel = (student?.rombel || student?.kelas || '').toLowerCase().trim();
  return status === 'graduated' || status === 'lulus' || status === 'alumni' || rombel.includes('alumni') || rombel.includes('lulus');
};

const isStudentInTargetClass = (student: any, targetClass: any) => {
  const studentClass = String(student?.class_id || '').trim().toLowerCase();
  const targetId = String(targetClass?.id || '').trim().toLowerCase();
  const targetName = String(targetClass?.nama_kelas || '').trim().toLowerCase();

  if (!studentClass || (!targetId && !targetName)) return false;
  return studentClass === targetId || studentClass === targetName;
};

const defaultTamatanList: TamatanItem[] = [
  {
    id: '1',
    tahun_pelajaran: '2023/2024',
    lulus_l: 25,
    lulus_p: 27,
    lulus_total: 52,
    melanjutkan_mts: 38,
    melanjutkan_smp: 14,
    melanjutkan_ponpes: 12,
    tidak_melanjutkan: 0,
    keterangan: 'Terdata Lengkap',
    source: 'manual'
  },
  {
    id: '2',
    tahun_pelajaran: '2022/2023',
    lulus_l: 22,
    lulus_p: 26,
    lulus_total: 48,
    melanjutkan_mts: 35,
    melanjutkan_smp: 13,
    melanjutkan_ponpes: 10,
    tidak_melanjutkan: 0,
    keterangan: 'Lulus 100%',
    source: 'manual'
  },
  {
    id: '3',
    tahun_pelajaran: '2021/2022',
    lulus_l: 20,
    lulus_p: 24,
    lulus_total: 44,
    melanjutkan_mts: 30,
    melanjutkan_smp: 14,
    melanjutkan_ponpes: 8,
    tidak_melanjutkan: 0,
    keterangan: 'Lulus 100%',
    source: 'manual'
  }
];

const DataTamatan = () => {
  const navigate = useNavigate();
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const { settings } = useSiteSettings();
  const studentsKey = getScopedKey('students_list');
  const classesKey = getScopedKey('kelas_list');
  const legacyStudentsKey = 'students_list';
  const legacyClassesKey = 'kelas_list';
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tamatanList, setTamatanList] = useState<TamatanItem[]>(defaultTamatanList);
  const [dbAlumniStats, setDbAlumniStats] = useState<Record<string, { male: number; female: number; total: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [tamatanModalOpen, setTamatanModalOpen] = useState(false);
  const [editingTamatan, setEditingTamatan] = useState<TamatanItem | null>(null);
  
  const [tamatanForm, setTamatanForm] = useState<Omit<TamatanItem, 'id'>>({
    tahun_pelajaran: '2024/2025',
    lulus_l: 0,
    lulus_p: 0,
    lulus_total: 0,
    melanjutkan_mts: 0,
    melanjutkan_smp: 0,
    melanjutkan_ponpes: 0,
    tidak_melanjutkan: 0,
    keterangan: 'Lulus 100%',
    source: 'manual'
  });

  const mergeTamatanData = useCallback((savedList: TamatanItem[], studentsList: any[], classesList: any[]) => {
    const alumniData = Array.isArray(studentsList)
      ? studentsList.filter((student: any) => isGraduatedStudent(student))
      : [];

    const alumniMap: Record<string, { male: number; female: number; total: number }> = {};

    alumniData.forEach((student: any) => {
      let yr = student.tahun_lulus?.trim();
      if (!yr) {
        yr = student.tahun_pelajaran?.trim();
      }
      if (!yr) {
        const year = new Date(student.created_at || Date.now()).getFullYear();
        yr = `${year - 1}/${year}`;
      }

      if (!alumniMap[yr]) {
        alumniMap[yr] = { male: 0, female: 0, total: 0 };
      }

      if (student.gender === 'Laki-laki' || student.gender === 'L') {
        alumniMap[yr].male += 1;
      } else {
        alumniMap[yr].female += 1;
      }
      alumniMap[yr].total += 1;
    });

    const mergedList = [...savedList];

    Object.keys(alumniMap).forEach((yr) => {
      const dbStats = alumniMap[yr];
      const existingIdx = mergedList.findIndex((item) => item.tahun_pelajaran === yr);

      if (existingIdx >= 0) {
        if (mergedList[existingIdx].source !== 'manual') {
          mergedList[existingIdx] = {
            ...mergedList[existingIdx],
            lulus_l: dbStats.male,
            lulus_p: dbStats.female,
            lulus_total: dbStats.total,
            source: 'auto_alumni' as const,
            db_alumni_count: dbStats.total,
            keterangan: 'Otomatis dari Database Alumni',
          };
        } else {
          mergedList[existingIdx].db_alumni_count = dbStats.total;
        }
      } else {
        mergedList.unshift({
          id: 'auto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          tahun_pelajaran: yr,
          lulus_l: dbStats.male,
          lulus_p: dbStats.female,
          lulus_total: dbStats.total,
          melanjutkan_mts: 0,
          melanjutkan_smp: 0,
          melanjutkan_ponpes: 0,
          tidak_melanjutkan: 0,
          keterangan: 'Otomatis dari Database Alumni',
          source: 'auto_alumni' as const,
          db_alumni_count: dbStats.total,
        });
      }
    });

    const numericClassLevels = (Array.isArray(classesList) ? classesList : [])
      .map((classItem: any) => Number(classItem?.tingkat))
      .filter((level) => Number.isFinite(level) && level > 0);

    const finalLevel = numericClassLevels.length > 0 ? Math.max(...numericClassLevels) : null;
    const projectedYear = getNextAcademicYear(settings.tahun_pelajaran?.active_year);

    if (finalLevel && projectedYear) {
      const finalClasses = classesList.filter((classItem: any) => Number(classItem?.tingkat) === finalLevel);
      const projectedStudents = Array.isArray(studentsList)
        ? studentsList.filter((student: any) => {
            const status = (student?.status || '').toLowerCase().trim();
            const rombel = (student?.rombel || student?.kelas || '').toLowerCase().trim();
            const isNonAlumni = status !== 'graduated' && status !== 'lulus' && status !== 'alumni' && !rombel.includes('alumni') && !rombel.includes('lulus') && status !== 'moved' && status !== 'pindah';
            return isNonAlumni && finalClasses.some((classItem: any) => isStudentInTargetClass(student, classItem));
          })
        : [];

      if (projectedStudents.length > 0 && !alumniMap[projectedYear]) {
        const projectionStats = projectedStudents.reduce(
          (acc, student: any) => {
            if (student.gender === 'Laki-laki' || student.gender === 'L') {
              acc.male += 1;
            } else {
              acc.female += 1;
            }
            acc.total += 1;
            return acc;
          },
          { male: 0, female: 0, total: 0 }
        );

        const existingIdx = mergedList.findIndex((item) => item.tahun_pelajaran === projectedYear);

        if (existingIdx >= 0) {
          if (mergedList[existingIdx].source !== 'manual') {
            mergedList[existingIdx] = {
              ...mergedList[existingIdx],
              lulus_l: projectionStats.male,
              lulus_p: projectionStats.female,
              lulus_total: projectionStats.total,
              source: 'auto_projection' as const,
              db_alumni_count: projectionStats.total,
              keterangan: `Proyeksi otomatis dari ${projectedStudents.length} siswa aktif kelas tingkat akhir`,
            };
          }
        } else {
          mergedList.unshift({
            id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            tahun_pelajaran: projectedYear,
            lulus_l: projectionStats.male,
            lulus_p: projectionStats.female,
            lulus_total: projectionStats.total,
            melanjutkan_mts: 0,
            melanjutkan_smp: 0,
            melanjutkan_ponpes: 0,
            tidak_melanjutkan: 0,
            keterangan: `Proyeksi otomatis dari ${projectedStudents.length} siswa aktif kelas tingkat akhir`,
            source: 'auto_projection' as const,
            db_alumni_count: projectionStats.total,
          });
        }
      }
    }

    mergedList.sort((a, b) => b.tahun_pelajaran.localeCompare(a.tahun_pelajaran));

    return {
      mergedList,
      alumniMap,
    };
  }, [settings.tahun_pelajaran?.active_year]);

  const fetchTamatan = useCallback(async () => {
    setLoading(true);
    try {
      // 0. Read local storage cache first
      let localStudents: any[] = [];
      let localClasses: any[] = [];
      try {
        const ls1 = localStorage.getItem('students_list');
        const ls2 = localStorage.getItem('siakad_students_data');
        const ls3 = localStorage.getItem('madrasah_students_list');
        if (ls1) localStudents = JSON.parse(ls1);
        else if (ls2) localStudents = JSON.parse(ls2);
        else if (ls3) localStudents = JSON.parse(ls3);

        const lc1 = localStorage.getItem('kelas_list');
        const lc2 = localStorage.getItem('madrasah_kelas_list');
        if (lc1) localClasses = JSON.parse(lc1);
        else if (lc2) localClasses = JSON.parse(lc2);
      } catch (e) {
        console.warn('Localstorage parse error in DataTamatan:', e);
      }

      // 1. Fetch site_settings where data siswa, kelas, dan tamatan madrasah tersimpan
      const tamatanKey = getScopedKey('tamatan_madrasah');
      const { data: resData, error: resErr } = await supabase
        .from('site_settings')
        .select('id, value');

      if (resErr) {
        console.warn('Warning fetching site_settings in DataTamatan:', resErr);
      }

      let studentsList = resData?.find((s: any) => s.id === studentsKey)?.value
        || resData?.find((s: any) => s.id === legacyStudentsKey)?.value;
      if (!studentsList || !Array.isArray(studentsList) || studentsList.length === 0) {
        studentsList = localStudents;
      }

      let classesList = resData?.find((s: any) => s.id === classesKey)?.value
        || resData?.find((s: any) => s.id === legacyClassesKey)?.value;
      if (!classesList || !Array.isArray(classesList) || classesList.length === 0) {
        classesList = localClasses;
      }

      const settingValue = resData?.find((s: any) => s.id === tamatanKey)?.value;

      let savedList: TamatanItem[] = defaultTamatanList;
      if (settingValue && Array.isArray(settingValue) && settingValue.length > 0) {
        savedList = settingValue;
      }
      const { mergedList, alumniMap } = mergeTamatanData(savedList, studentsList, classesList);
      setDbAlumniStats(alumniMap);
      setTamatanList(mergedList);
    } catch (err: any) {
      console.error('Error fetching data tamatan:', err);
    } finally {
      setLoading(false);
    }
  }, [getScopedKey, mergeTamatanData, studentsKey, classesKey]);

  useEffect(() => {
    fetchTamatan();
    const handleUpdate = () => fetchTamatan();
    window.addEventListener('siakad_direktori_updated', handleUpdate);
    window.addEventListener('siakad_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('siakad_direktori_updated', handleUpdate);
      window.removeEventListener('siakad_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchTamatan, activeMadrasah.id]);

  const handleSyncWithAlumni = async () => {
    setSyncing(true);
    try {
      let localStudents: any[] = [];
      let localClasses: any[] = [];
      try {
        const ls1 = localStorage.getItem('students_list');
        const ls2 = localStorage.getItem('siakad_students_data');
        const ls3 = localStorage.getItem('madrasah_students_list');
        if (ls1) localStudents = JSON.parse(ls1);
        else if (ls2) localStudents = JSON.parse(ls2);
        else if (ls3) localStudents = JSON.parse(ls3);

        const lc1 = localStorage.getItem('kelas_list');
        const lc2 = localStorage.getItem('madrasah_kelas_list');
        if (lc1) localClasses = JSON.parse(lc1);
        else if (lc2) localClasses = JSON.parse(lc2);
      } catch (e) {
        console.warn('Localstorage parse error in handleSyncWithAlumni:', e);
      }

      // Re-fetch graduated students from site_settings
      const { data: resData, error: resErr } = await supabase
        .from('site_settings')
        .select('id, value');

      if (resErr) console.warn(resErr);

      let studentsList = resData?.find((s: any) => s.id === studentsKey)?.value
        || resData?.find((s: any) => s.id === legacyStudentsKey)?.value;
      if (!studentsList || !Array.isArray(studentsList) || studentsList.length === 0) {
        studentsList = localStudents;
      }

      let classesList = resData?.find((s: any) => s.id === classesKey)?.value
        || resData?.find((s: any) => s.id === legacyClassesKey)?.value;
      if (!classesList || !Array.isArray(classesList) || classesList.length === 0) {
        classesList = localClasses;
      }

      const { mergedList: updatedList, alumniMap } = mergeTamatanData(tamatanList, studentsList, classesList);
      setDbAlumniStats(alumniMap);

      await handleSaveTamatanList(updatedList, false);
      showSuccess('Data tamatan berhasil disinkronkan dengan database alumni!');
    } catch (err: any) {
      showError('Gagal menyinkronkan data alumni: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveTamatanList = async (newList: TamatanItem[], notify = true) => {
    setTamatanList(newList);
    try {
      const tamatanKey = getScopedKey('tamatan_madrasah');
      await supabase
        .from('site_settings')
        .upsert({ id: tamatanKey, value: newList, updated_at: new Date().toISOString() });
      if (notify) showSuccess('Data tamatan siswa berhasil disimpan!');
    } catch (e: any) {
      showError('Gagal menyimpan data tamatan: ' + e.message);
    }
  };

  const handleOpenAdd = () => {
    setEditingTamatan(null);
    setTamatanForm({
      tahun_pelajaran: '2024/2025',
      lulus_l: 0,
      lulus_p: 0,
      lulus_total: 0,
      melanjutkan_mts: 0,
      melanjutkan_smp: 0,
      melanjutkan_ponpes: 0,
      tidak_melanjutkan: 0,
      keterangan: 'Lulus 100%',
      source: 'manual'
    });
    setTamatanModalOpen(true);
  };

  const handleOpenEdit = (item: TamatanItem) => {
    setEditingTamatan(item);
    setTamatanForm({
      tahun_pelajaran: item.tahun_pelajaran,
      lulus_l: item.lulus_l,
      lulus_p: item.lulus_p,
      lulus_total: item.lulus_total || (item.lulus_l + item.lulus_p),
      melanjutkan_mts: item.melanjutkan_mts,
      melanjutkan_smp: item.melanjutkan_smp,
      melanjutkan_ponpes: item.melanjutkan_ponpes || 0,
      tidak_melanjutkan: item.tidak_melanjutkan,
      keterangan: item.keterangan || '',
      source: item.source || 'manual'
    });
    setTamatanModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data tamatan tahun ini?')) {
      const updated = tamatanList.filter(item => item.id !== id);
      handleSaveTamatanList(updated);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(tamatanForm.lulus_l) + Number(tamatanForm.lulus_p);
    
    if (editingTamatan) {
      const updated = tamatanList.map(item =>
        item.id === editingTamatan.id
          ? { ...tamatanForm, id: editingTamatan.id, lulus_total: total, source: 'manual' as const }
          : item
      );
      handleSaveTamatanList(updated);
    } else {
      const newItem: TamatanItem = {
        ...tamatanForm,
        id: Date.now().toString(),
        lulus_total: total,
        source: 'manual'
      };
      handleSaveTamatanList([newItem, ...tamatanList]);
    }
    setTamatanModalOpen(false);
  };

  const filteredList = tamatanList.filter(item =>
    item.tahun_pelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics calculation
  const totalLulusAkumulasi = tamatanList.reduce((acc, curr) => acc + (curr.lulus_total || (curr.lulus_l + curr.lulus_p)), 0);
  const totalKeMts = tamatanList.reduce((acc, curr) => acc + (curr.melanjutkan_mts || 0), 0);
  const totalKeSmp = tamatanList.reduce((acc, curr) => acc + (curr.melanjutkan_smp || 0), 0);

  const exportExcel = () => {
    const exportData = tamatanList.map((t, idx) => ({
      No: idx + 1,
      'Tahun Pelajaran': t.tahun_pelajaran,
      'Lulus Laki-laki': t.lulus_l,
      'Lulus Perempuan': t.lulus_p,
      'Total Lulus': t.lulus_total || (t.lulus_l + t.lulus_p),
      'Ke MTs / MA': t.melanjutkan_mts,
      'Ke SMP / SMA': t.melanjutkan_smp,
      'Ke Pondok Pesantren': t.melanjutkan_ponpes || 0,
      'Tidak Melanjutkan': t.tidak_melanjutkan,
      'Sumber Data': t.source === 'auto_alumni'
        ? 'Otomatis Alumni DB'
        : t.source === 'auto_projection'
          ? 'Proyeksi Kelas Akhir'
          : 'Input Manual',
      'Keterangan': t.keterangan || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Tamatan");
    XLSX.writeFile(wb, `Data_Tamatan_Siswa_${activeMadrasah.nama_madrasah || 'Madrasah'}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Printable Header */}
        <div className="hidden print:block mb-6">
          <KopSurat />
          <div className="text-center my-4">
            <h2 className="text-base font-bold uppercase underline">REKAPITULASI DATA TAMATAN &amp; KELULUSAN SISWA</h2>
            <p className="text-xs">{activeMadrasah.nama_madrasah || 'Madrasah'}</p>
          </div>
        </div>

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden print:hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-emerald-700/60 backdrop-blur-md px-3 py-1 rounded-full text-emerald-200 text-xs font-semibold border border-emerald-500/30">
                <GraduationCap className="w-4 h-4 text-emerald-300" />
                Modul Data Lembaga Madrasah
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Data Tamatan &amp; Kelulusan Siswa
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl">
                Otomatis sinkron dengan database alumni 3 tahun pelajaran. Jumlah lulusan juga dapat diinputkan manual apabila data alumni belum diisi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={syncing}
                onClick={handleSyncWithAlumni}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-2xl text-xs gap-2 px-4 py-6 shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sinkron Alumni DB
              </Button>
              <Button
                type="button"
                onClick={handleOpenAdd}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs gap-2 px-5 py-6 shadow-lg"
              >
                <Plus className="w-4 h-4" /> Tambah Tamatan
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/admin/manajemen-siswa?status=graduated')}
                variant="outline"
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border-amber-400/40 rounded-2xl text-xs font-extrabold gap-2 px-4 py-6 shadow-md cursor-pointer"
                title="Kelola Siswa Lulus / Batalkan Status Lulus Siswa"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" /> Batalkan Kelulusan Siswa
              </Button>
              <Button
                type="button"
                onClick={exportExcel}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" /> Export Excel
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <Printer className="w-4 h-4 text-emerald-300" /> Cetak Data
              </Button>
            </div>
          </div>
        </div>

        {/* Integration Notification Banner */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 print:hidden">
          <Database className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 space-y-1">
            <div className="font-extrabold flex items-center gap-2">
              <span>Sistem Kelulusan &amp; Data Alumni Hybrid</span>
              <Badge className="bg-emerald-100 text-emerald-800 border-0 font-bold text-[10px]">Otomatis + Manual</Badge>
            </div>
            <p className="text-emerald-800">
              Jumlah siswa lulus per tahun pelajaran dihitung secara otomatis dari record data alumni di database (Kesiswaan &rarr; Alumni). Jika data alumni belum diinputkan, Anda tetap dapat memasukkan atau menyesuaikan angka tamatan secara manual tanpa mengganggu fungsi otomatisasi.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <Card className="border-0 shadow-md rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Lulus Akumulasi</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">{totalLulusAkumulasi} Siswa</p>
                <p className="text-[11px] text-emerald-700 mt-1">Tercatat dalam {tamatanList.length} Tahun Pelajaran</p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-blue-50/50 border border-blue-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Melanjutkan Ke MTs/MA</p>
                <p className="text-2xl font-black text-blue-950 mt-1">{totalKeMts} Siswa</p>
                <p className="text-[11px] text-blue-700 mt-1">
                  {totalLulusAkumulasi > 0 ? Math.round((totalKeMts / totalLulusAkumulasi) * 100) : 0}% Dari Total Tamatan
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <School className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-purple-50/50 border border-purple-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">Melanjutkan Ke SMP/SMA</p>
                <p className="text-2xl font-black text-purple-950 mt-1">{totalKeSmp} Siswa</p>
                <p className="text-[11px] text-purple-700 mt-1">
                  {totalLulusAkumulasi > 0 ? Math.round((totalKeSmp / totalLulusAkumulasi) * 100) : 0}% Dari Total Tamatan
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table Card */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <GraduationCap className="w-5 h-5 text-emerald-600" /> Daftar Riwayat Tamatan Siswa (3 Tahun Pelajaran)
              </CardTitle>
              <CardDescription className="text-xs">
                Tabel rekapitulasi data kelulusan dan statistik sekolah tujuan kelanjutan alumni.
              </CardDescription>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Cari tahun pelajaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl text-xs bg-white border-slate-200"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px]">
                    <TableHead className="w-12 text-center p-3">No</TableHead>
                    <TableHead className="p-3">Tahun Pelajaran</TableHead>
                    <TableHead className="text-center p-3 text-blue-800 bg-blue-50/50">Laki-Laki (L)</TableHead>
                    <TableHead className="text-center p-3 text-pink-800 bg-pink-50/50">Perempuan (P)</TableHead>
                    <TableHead className="text-center p-3 text-emerald-900 bg-emerald-50 font-extrabold">Total Lulus</TableHead>
                    <TableHead className="text-center p-3">Ke MTs/MA</TableHead>
                    <TableHead className="text-center p-3">Ke SMP/SMA</TableHead>
                    <TableHead className="text-center p-3">Ke Ponpes</TableHead>
                    <TableHead className="text-center p-3 text-rose-800">Tdk Lanjut</TableHead>
                    <TableHead className="p-3">Sumber / Keterangan</TableHead>
                    <TableHead className="w-24 text-center p-3 print:hidden">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-slate-400 font-medium">
                        Belum ada data tamatan siswa terdaftar. Klik "Tambah Tamatan" untuk membuat data baru.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((item, idx) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-bold text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-slate-900 font-mono text-xs">{item.tahun_pelajaran}</TableCell>
                        <TableCell className="text-center font-bold text-blue-700">{item.lulus_l}</TableCell>
                        <TableCell className="text-center font-bold text-pink-700">{item.lulus_p}</TableCell>
                        <TableCell className="text-center font-extrabold text-emerald-950 bg-emerald-50/60 font-mono text-xs">
                          {item.lulus_total || (item.lulus_l + item.lulus_p)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-blue-800">{item.melanjutkan_mts}</TableCell>
                        <TableCell className="text-center font-bold text-indigo-800">{item.melanjutkan_smp}</TableCell>
                        <TableCell className="text-center font-bold text-purple-800">{item.melanjutkan_ponpes || 0}</TableCell>
                        <TableCell className="text-center font-bold text-rose-600">{item.tidak_melanjutkan}</TableCell>
                        <TableCell className="text-slate-600 max-w-xs">
                          <div className="flex flex-col gap-1">
                            {item.source === 'auto_alumni' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 font-bold text-[10px] w-fit">
                                <Sparkles className="w-3 h-3 mr-1 text-emerald-600" /> Otomatis Alumni DB
                              </Badge>
                            ) : item.source === 'auto_projection' ? (
                              <Badge className="bg-sky-100 text-sky-800 border-0 font-bold text-[10px] w-fit">
                                <Sparkles className="w-3 h-3 mr-1 text-sky-600" /> Proyeksi Kelas Akhir
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-900 border-0 font-bold text-[10px] w-fit">
                                Manual Lembaga
                              </Badge>
                            )}
                            <span className="text-[11px] text-slate-500 truncate">{item.keterangan || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl"
                              title="Edit / Sesuaikan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Printable Signature */}
        <div className="hidden print:block mt-12">
          <PenandatanganDokumen />
        </div>

        {/* Modal Form Dialog */}
        <Dialog open={tamatanModalOpen} onOpenChange={setTamatanModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-800">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                {editingTamatan ? 'Edit / Sesuaikan Data Tamatan' : 'Tambah Data Tamatan Siswa'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Isi rincian jumlah kelulusan siswa dan statistik sekolah tujuan kelanjutan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveForm} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
                <Input
                  required
                  placeholder="Contoh: 2024/2025"
                  value={tamatanForm.tahun_pelajaran}
                  onChange={(e) => setTamatanForm({ ...tamatanForm, tahun_pelajaran: e.target.value })}
                  className="rounded-xl font-mono text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">Lulus Laki-laki (L)</label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={tamatanForm.lulus_l}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, lulus_l: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">Lulus Perempuan (P)</label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={tamatanForm.lulus_p}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, lulus_p: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div className="col-span-2 text-xs font-extrabold text-emerald-900 text-right pt-1">
                  Total Lulus: {Number(tamatanForm.lulus_l) + Number(tamatanForm.lulus_p)} Siswa
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">Ke MTs/MA</label>
                  <Input
                    type="number"
                    min="0"
                    value={tamatanForm.melanjutkan_mts}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, melanjutkan_mts: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">Ke SMP/SMA</label>
                  <Input
                    type="number"
                    min="0"
                    value={tamatanForm.melanjutkan_smp}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, melanjutkan_smp: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-900 mb-1">Ke Ponpes</label>
                  <Input
                    type="number"
                    min="0"
                    value={tamatanForm.melanjutkan_ponpes || 0}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, melanjutkan_ponpes: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 mb-1">Tdk Lanjut</label>
                  <Input
                    type="number"
                    min="0"
                    value={tamatanForm.tidak_melanjutkan}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, tidak_melanjutkan: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan (Opsional)</label>
                <Input
                  placeholder="Lulus 100%, Terdata Manual, dll"
                  value={tamatanForm.keterangan || ''}
                  onChange={(e) => setTamatanForm({ ...tamatanForm, keterangan: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTamatanModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Save className="w-4 h-4" /> Simpan Data
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default DataTamatan;
