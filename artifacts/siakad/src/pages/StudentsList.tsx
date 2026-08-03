"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, GraduationCap, Calendar, Search, UserCheck, School, CheckCircle2, Share2, Award, Printer, ArrowLeft, BookOpen, Sparkles, ChevronDown, UserX, Layers, AlertTriangle, FileSpreadsheet, Download, Compass, PieChart, Table as TableIcon } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { showSuccess } from '@/utils/toast';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { getStudentRombelForYear } from '@/utils/studentRombelHistory';

interface Student {
  id: string;
  name: string;
  nisn: string;
  nik?: string;
  class_id: string;
  gender: 'Laki-laki' | 'Perempuan';
  status: 'active' | 'graduated' | 'moved';
  photo_url?: string;
  phone?: string;
  tahun_lulus?: string;
}

interface Kelas {
  id: string;
  nama_kelas: string;
  wali_kelas: string | null;
  foto_wali_kelas?: string;
  nip_wali_kelas?: string;
  golongan_wali_kelas?: string;
  nuptk_wali_kelas?: string;
  nrg_wali_kelas?: string;
  tempat_lahir_wali_kelas?: string;
  tanggal_lahir_wali_kelas?: string;
  tingkat: string;
  kapasitas: number;
}

const DEFAULT_FALLBACK_CLASSES: Kelas[] = [
  { id: 'k1', nama_kelas: 'Kelas 1', wali_kelas: 'Ahmad Syafi\'i, S.Pd.I', foto_wali_kelas: '', nip_wali_kelas: '198205122010011005', golongan_wali_kelas: 'III/c - Penata', nuptk_wali_kelas: '4538760662200003', nrg_wali_kelas: '120984756', tempat_lahir_wali_kelas: 'Bandung', tanggal_lahir_wali_kelas: '1982-05-12', tingkat: '1', kapasitas: 28 },
  { id: 'k2', nama_kelas: 'Kelas 2', wali_kelas: 'Siti Nurhaliza, M.Pd', foto_wali_kelas: '', nip_wali_kelas: '198503152011012008', golongan_wali_kelas: 'III/b - Penata Muda Tk. I', nuptk_wali_kelas: '7829761663200012', nrg_wali_kelas: '120984757', tempat_lahir_wali_kelas: 'Surakarta', tanggal_lahir_wali_kelas: '1985-03-15', tingkat: '2', kapasitas: 28 },
  { id: 'k3', nama_kelas: 'Kelas 3', wali_kelas: 'Drs. Moh. Hatta', foto_wali_kelas: '', nip_wali_kelas: '197911202008011004', golongan_wali_kelas: 'III/d - Penata Tk. I', nuptk_wali_kelas: '1234760662200009', nrg_wali_kelas: '120984758', tempat_lahir_wali_kelas: 'Semarang', tanggal_lahir_wali_kelas: '1979-11-20', tingkat: '3', kapasitas: 28 },
  { id: 'k4', nama_kelas: 'Kelas 4', wali_kelas: 'Fatimah Az-Zahra, S.Si', foto_wali_kelas: '', nip_wali_kelas: '199008042018022001', golongan_wali_kelas: 'IX - Ahli Pertama (P3K)', nuptk_wali_kelas: '8912760662200045', nrg_wali_kelas: '120984759', tempat_lahir_wali_kelas: 'Ciamis', tanggal_lahir_wali_kelas: '1990-08-04', tingkat: '4', kapasitas: 28 },
  { id: 'k5', nama_kelas: 'Kelas 5', wali_kelas: 'Usman Abdul Qodir, S.Ag', foto_wali_kelas: '', nip_wali_kelas: '198701012014031002', golongan_wali_kelas: 'III/a - Penata Muda', nuptk_wali_kelas: '3456760662200088', nrg_wali_kelas: '120984760', tempat_lahir_wali_kelas: 'Majalengka', tanggal_lahir_wali_kelas: '1987-01-01', tingkat: '5', kapasitas: 28 },
  { id: 'k6', nama_kelas: 'Kelas 6', wali_kelas: 'Khadijah, S.Pd', foto_wali_kelas: '', nip_wali_kelas: '198409102009022003', golongan_wali_kelas: 'IV/a - Pembina', nuptk_wali_kelas: '5678760662200099', nrg_wali_kelas: '120984761', tempat_lahir_wali_kelas: 'Cirebon', tanggal_lahir_wali_kelas: '1984-09-10', tingkat: '6', kapasitas: 28 },
];

const DEFAULT_FALLBACK_STUDENTS: Student[] = [
  { id: 's1', name: 'Abdullah Al-Fatih', nisn: '0123456789', nik: '3201123456780001', class_id: 'k1', gender: 'Laki-laki', status: 'active' },
  { id: 's2', name: 'Aisyah Humaira', nisn: '0123456790', nik: '3201123456780002', class_id: 'k1', gender: 'Perempuan', status: 'active' },
  { id: 's3', name: 'Bilal Bin Rabah', nisn: '0123456791', nik: '3201123456780003', class_id: 'k2', gender: 'Laki-laki', status: 'active' },
  { id: 's4', name: 'Zahra Annisa', nisn: '0123456792', nik: '3201123456780004', class_id: 'k2', gender: 'Perempuan', status: 'active' },
  { id: 's5', name: 'Muhammad Al-Ghazali', nisn: '0123456793', nik: '3201123456780005', class_id: 'k3', gender: 'Laki-laki', status: 'active' },
  { id: 's6', name: 'Khansa Maryam', nisn: '0123456794', nik: '3201123456780006', class_id: 'k3', gender: 'Perempuan', status: 'active' },
  { id: 's7', name: 'Umar Al-Faruq', nisn: '0123456795', nik: '3201123456780007', class_id: 'k4', gender: 'Laki-laki', status: 'active' },
  { id: 's8', name: 'Nabila Azzahra', nisn: '0123456796', nik: '3201123456780008', class_id: 'k4', gender: 'Perempuan', status: 'active' },
  { id: 's9', name: 'Hasan Al-Banna', nisn: '0123456799', nik: '3201123456780009', class_id: 'k5', gender: 'Laki-laki', status: 'active' },
  { id: 's10', name: 'Siti Safira', nisn: '0123456798', nik: '3201123456780010', class_id: 'k5', gender: 'Perempuan', status: 'active' },
  { id: 's11', name: 'Hamzah Saifullah', nisn: '0123456799', nik: '3201123456780011', class_id: 'k6', gender: 'Laki-laki', status: 'active' },
  { id: 's12', name: 'Salma Salsabila', nisn: '0123456800', nik: '3201123456780012', class_id: 'k6', gender: 'Perempuan', status: 'active' },
  // Sample Alumni
  { id: 'sa1', name: 'Rizky Ramadhan, S.T.', nisn: '0112233445', nik: '3201123456780099', class_id: 'k6', gender: 'Laki-laki', status: 'graduated', tahun_lulus: '2023/2024' },
  { id: 'sa2', name: 'Nurul Hidayah, S.Ked', nisn: '0112233446', nik: '3201123456780100', class_id: 'k6', gender: 'Perempuan', status: 'graduated', tahun_lulus: '2023/2024' },
  { id: 'sa3', name: 'Ahmad Fauzi, S.Kom', nisn: '0112233447', nik: '3201123456780101', class_id: 'k6', gender: 'Laki-laki', status: 'graduated', tahun_lulus: '2022/2023' },
  { id: 'sa4', name: 'Siti Rahmawati, M.Pd', nisn: '0112233448', nik: '3201123456780102', class_id: 'k6', gender: 'Perempuan', status: 'graduated', tahun_lulus: '2022/2023' },
];

const StudentsList = () => {
  const { settings } = useSiteSettings();
  const { activeMadrasahId, getScopedKey } = useMadrasah();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'active' | 'rekapitulasi' | 'alumni'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [alumniYearFilter, setAlumniYearFilter] = useState<string>('all');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printMode, setPrintMode] = useState<'active' | 'alumni' | 'rekapitulasi'>('active');
  const [printClassId, setPrintClassId] = useState<string>('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => settings.tahun_pelajaran?.active_year || '2026/2027');
  const [academicArchives, setAcademicArchives] = useState<any[]>([]);

  useEffect(() => {
    if (location.pathname.includes('rekap')) {
      setActiveTab('rekapitulasi');
    } else if (location.pathname.includes('alumni')) {
      setActiveTab('alumni');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (settings.tahun_pelajaran?.active_year) {
      setSelectedAcademicYear(settings.tahun_pelajaran.active_year);
    }
  }, [settings.tahun_pelajaran?.active_year]);

  const [rekapOverrides, setRekapOverrides] = useState<{
    threeYears?: { 
      [year: string]: { 
        male: number; 
        female: number; 
        label?: string; 
        kelas?: string;
        byClass?: { [classId: string]: { male: number; female: number } };
      } 
    };
    classes?: { [classId: string]: { male: number; female: number } };
  }>(() => {
    try {
      const saved = localStorage.getItem('madrasah_rekap_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('madrasah_rekap_overrides');
        if (saved) setRekapOverrides(JSON.parse(saved));
        else setRekapOverrides({});
      } catch {
        setRekapOverrides({});
      }
      fetchData(true);
    };

    window.addEventListener('rekapitulasi_updated', handleUpdate);
    window.addEventListener('students_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleUpdate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling interval (5s) to guarantee real-time updates even if WebSockets are blocked on EdgeOne/CDNs
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5000);

    const subscription = supabase
      .channel('public:site_settings:students_rekap')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload?.new && (
          payload.new.id?.includes('student') ||
          payload.new.id?.includes('kelas') ||
          payload.new.id?.includes('rekap') ||
          payload.new.id?.includes('archive') ||
          payload.new.id?.includes('tahun_pelajaran')
        )) {
          handleUpdate();
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('rekapitulasi_updated', handleUpdate);
      window.removeEventListener('students_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      supabase.removeChannel(subscription);
    };
  }, []);

  const availableAcademicYears = useMemo(() => {
    const years = new Set<string>();
    if (settings.tahun_pelajaran?.active_year) years.add(settings.tahun_pelajaran.active_year);
    if (Array.isArray(settings.tahun_pelajaran?.available_years)) {
      settings.tahun_pelajaran.available_years.forEach((y: string) => years.add(y));
    }
    ['2025/2026', '2024/2025', '2023/2024', '2022/2023'].forEach(y => years.add(y));

    if (Array.isArray(academicArchives)) {
      academicArchives.forEach(arch => {
        if (arch.academic_year) years.add(arch.academic_year);
      });
    }

    if (Array.isArray(allStudents)) {
      allStudents.forEach(s => {
        if ((s as any).tahun_pelajaran) years.add((s as any).tahun_pelajaran);
        if ((s as any).tahun_masuk) years.add((s as any).tahun_masuk);
      });
    }

    return Array.from(years).sort().reverse();
  }, [settings.tahun_pelajaran, academicArchives, allStudents]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const schoolName = settings.general?.school_name || 'Si@Kad Madrasah';
      const sheetData1 = [
        ["REKAPITULASI JUMLAH SISWA PER TAHUN PELAJARAN"],
        [`Madrasah: ${schoolName}`],
        [`Tahun Pelajaran: ${selectedAcademicYear}`],
        [],
        ["No", "Nama Kelas / Rombongan Belajar", "Tingkat", "Laki-laki (L)", "Perempuan (P)", "Jumlah Siswa"],
        ...rekapitulasiData.rows.map((r, i) => [
          i + 1,
          r.nama_kelas,
          r.tingkat !== '-' ? `Tingkat ${r.tingkat}` : '-',
          r.male,
          r.female,
          r.total
        ]),
        ["", "TOTAL KESELURUHAN", "", rekapitulasiData.grandMale, rekapitulasiData.grandFemale, rekapitulasiData.grandTotal]
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(sheetData1);
      XLSX.utils.book_append_sheet(wb, ws1, `Rekap Rombel ${selectedAcademicYear.replace('/', '-')}`);

      const sheetData2 = [
        ["REKAPITULASI OTOMATIS PERKEMBANGAN SISWA PER 3 TAHUN PELAJARAN"],
        [`Madrasah: ${schoolName}`],
        [],
        ["No", "Tahun Pelajaran", ...sortedClassesList.flatMap(c => [`${c.nama_kelas} (L)`, `${c.nama_kelas} (P)`]), "Total L", "Total P", "Total Jml", "Keterangan"],
        ...threeYearSummary.map((r, i) => [
          i + 1,
          r.year,
          ...sortedClassesList.flatMap(c => [
            r.byClass[c.id]?.male || 0,
            r.byClass[c.id]?.female || 0
          ]),
          r.male,
          r.female,
          r.total,
          r.label
        ])
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(sheetData2);
      XLSX.utils.book_append_sheet(wb, ws2, "Rekap 3 Tahun");

      const cleanYr = selectedAcademicYear.replace(/[/\\?%*:|"<>]/g, '-');
      XLSX.writeFile(wb, `Rekapitulasi_Siswa_${cleanYr}.xlsx`);
      showSuccess('Data Rekapitulasi Siswa berhasil diekspor ke Excel!');
    } catch (err) {
      console.error('Export Excel error:', err);
    }
  };

  const activeStudents = useMemo(() => {
    const normYear = (selectedAcademicYear || '').trim();
    const activeYear = (settings.tahun_pelajaran?.active_year || '2026/2027').trim();

    // 1. Check if frozen archive snapshot exists for selectedAcademicYear ONLY IF selectedAcademicYear is NOT activeYear
    if (normYear && normYear !== activeYear) {
      const matchingArchive = academicArchives.find(a =>
        (a.academic_year || '').toString().trim() === normYear
      );

      if (matchingArchive) {
        const archStudents = matchingArchive.data?.students || matchingArchive.students || [];
        return archStudents;
      }
    }

    const parseYearStart = (yStr: string) => {
      const m = yStr.match(/(\d{4})/);
      return m ? parseInt(m[1], 10) : 0;
    };

    const selectedStart = parseYearStart(normYear);

    return allStudents.filter((s: any) => {
      const sStatus = (s.status || '').toLowerCase().trim();
      if (sStatus === 'graduated' || sStatus === 'lulus' || sStatus === 'moved' || sStatus === 'pindah') {
        return false;
      }

      const sTahunPel = (s.tahun_pelajaran || '').toString().trim();
      const sTahunMasuk = (s.tahun_masuk || '').toString().trim();

      const pelStart = parseYearStart(sTahunPel);
      const masukStart = parseYearStart(sTahunMasuk);

      // Exclude students belonging to a future academic year
      if (selectedStart > 0) {
        if (pelStart > selectedStart) return false;
        if (masukStart > selectedStart) return false;
      }

      return sStatus === 'active' || !sStatus || sStatus === 'aktif';
    });
  }, [selectedAcademicYear, settings.tahun_pelajaran?.active_year, academicArchives, allStudents]);

  const alumniStudents = useMemo(() => {
    return allStudents.filter(s => {
      const st = (s.status || '').toLowerCase().trim();
      return st === 'graduated' || st === 'lulus';
    });
  }, [allStudents]);

  const availableGradYears = useMemo(() => {
    const years = new Set<string>();
    alumniStudents.forEach(s => {
      if (s.tahun_lulus) years.add(s.tahun_lulus);
    });
    if (settings.tahun_pelajaran?.available_years) {
      settings.tahun_pelajaran.available_years.forEach((y: string) => years.add(y));
    }
    return Array.from(years).sort().reverse();
  }, [alumniStudents, settings.tahun_pelajaran]);

  const activeYearClasses = useMemo(() => {
    const normYear = (selectedAcademicYear || settings.tahun_pelajaran?.active_year || '2026/2027').trim();
    
    // First match strictly by tahun_pelajaran
    let yearClasses = classes.filter(c => c.tahun_pelajaran === normYear);
    
    // If no classes match, fallback to classes without specified tahun_pelajaran
    if (yearClasses.length === 0) {
      yearClasses = classes.filter(c => !c.tahun_pelajaran);
    }
    
    const source = yearClasses.length > 0 ? yearClasses : classes;

    const uniqueMap = new Map<string, Kelas>();
    source.forEach(c => {
      const key = (c.nama_kelas || '').trim().toLowerCase();
      if (!uniqueMap.has(key) || c.tahun_pelajaran === normYear) {
        uniqueMap.set(key, c);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => parseInt(a.tingkat || '0') - parseInt(b.tingkat || '0'));
  }, [classes, selectedAcademicYear, settings.tahun_pelajaran?.active_year]);

  const sortedClassesList = useMemo(() => {
    const source = activeYearClasses.length > 0 ? activeYearClasses : DEFAULT_FALLBACK_CLASSES;
    return [...source].sort((a, b) => parseInt(a.tingkat || '0') - parseInt(b.tingkat || '0'));
  }, [activeYearClasses]);

  const rekapitulasiData = useMemo(() => {
    const sortedClasses = [...sortedClassesList].sort((a, b) => parseInt(a.tingkat || '0') - parseInt(b.tingkat || '0'));

    const classRows = sortedClasses.map((c) => {
      const classStuds = activeStudents.filter((s) => {
        const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);
        const sRombelNorm = (sRombel || s.kelas || s.rombel || '').toString().toLowerCase().trim();
        const sClassIdNorm = (sClassId || s.class_id || '').toString().toLowerCase().trim();
        const cId = (c.id || '').toString().toLowerCase().trim();
        const cName = (c.nama_kelas || '').toString().toLowerCase().trim();
        const cTingkat = (c.tingkat || '').toString().toLowerCase().trim();

        return (
          sClassIdNorm === cId ||
          sRombelNorm === cName ||
          sRombelNorm === cTingkat ||
          sRombelNorm === `kelas ${cTingkat}`
        );
      });

      let male = classStuds.filter((s) => s.gender === 'Laki-laki' || s.gender === 'L').length;
      let female = classStuds.filter((s) => s.gender === 'Perempuan' || s.gender === 'P').length;

      const classOverride = rekapOverrides.classes?.[c.id] || rekapOverrides.classes?.[c.nama_kelas];
      if (classOverride) {
        if (typeof classOverride.male === 'number') male = classOverride.male;
        if (typeof classOverride.female === 'number') female = classOverride.female;
      }

      return {
        class_id: c.id,
        nama_kelas: c.nama_kelas,
        tingkat: c.tingkat,
        male,
        female,
        total: male + female,
        kapasitas: c.kapasitas || 0,
      };
    });

    const unassigned = activeStudents.filter((s) => {
      const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);
      const sRombelNorm = (sRombel || s.kelas || s.rombel || '').toString().toLowerCase().trim();
      const sClassIdNorm = (sClassId || s.class_id || '').toString().toLowerCase().trim();

      return !sortedClasses.some((c) => {
        const cId = (c.id || '').toString().toLowerCase().trim();
        const cName = (c.nama_kelas || '').toString().toLowerCase().trim();
        const cTingkat = (c.tingkat || '').toString().toLowerCase().trim();
        return (
          sClassIdNorm === cId ||
          sRombelNorm === cName ||
          sRombelNorm === cTingkat ||
          sRombelNorm === `kelas ${cTingkat}`
        );
      });
    });

    if (unassigned.length > 0) {
      let male = unassigned.filter((s) => s.gender === 'Laki-laki' || s.gender === 'L').length;
      let female = unassigned.filter((s) => s.gender === 'Perempuan' || s.gender === 'P').length;

      const unassignedOverride = rekapOverrides.classes?.['unassigned'];
      if (unassignedOverride) {
        if (typeof unassignedOverride.male === 'number') male = unassignedOverride.male;
        if (typeof unassignedOverride.female === 'number') female = unassignedOverride.female;
      }

      classRows.push({
        class_id: 'unassigned',
        nama_kelas: 'Siswa Tanpa Kelas / Belum Ditentukan',
        tingkat: '-',
        male,
        female,
        total: male + female,
        kapasitas: 0,
      });
    }

    const grandMale = classRows.reduce((acc, r) => acc + r.male, 0);
    const grandFemale = classRows.reduce((acc, r) => acc + r.female, 0);
    const grandTotal = grandMale + grandFemale;

    return {
      rows: classRows,
      grandMale,
      grandFemale,
      grandTotal,
    };
  }, [sortedClassesList, activeStudents, selectedAcademicYear, rekapOverrides]);

  const threeYearSummary = useMemo(() => {
    const activeYearStr = selectedAcademicYear || settings.tahun_pelajaran?.active_year || '2024/2025';
    const match = activeYearStr.match(/(\d{4})\/(\d{4})/);
    
    let startYr = 2024;
    let endYr = 2025;
    if (match) {
      startYr = parseInt(match[1]);
      endYr = parseInt(match[2]);
    }

    const y1 = `${startYr - 2}/${endYr - 2}`;
    const y2 = `${startYr - 1}/${endYr - 1}`;
    const y3 = activeYearStr;

    const defaultClassesStr = sortedClassesList.map(c => c.nama_kelas).filter(Boolean).join(', ') || 'Kelas I, II, III, IV, V, VI';

    const yearsInfo = [
      { year: y1, defaultLabel: 'Tahun Pelajaran Lalu (-2 TH)' },
      { year: y2, defaultLabel: 'Tahun Pelajaran Lalu (-1 TH)' },
      { year: y3, defaultLabel: 'Tahun Pelajaran Aktif' },
    ];

    return yearsInfo.map(({ year, defaultLabel }) => {
      const normYear = (year || '').trim();
      const normActiveYear = (activeYearStr || '').trim();

      // 1. Check if frozen academic archive snapshot exists for this year (only for non-active years)
      const matchingArchive = normYear !== normActiveYear ? academicArchives.find(a =>
        (a.academic_year || '').toString().trim() === normYear
      ) : null;

      if (matchingArchive) {
        const archStudents = matchingArchive.data?.students || matchingArchive.students || [];
        const byClass: { [classId: string]: { male: number; female: number; total: number } } = {};

        sortedClassesList.forEach((c) => {
          const cId = (c.id || '').toString().toLowerCase().trim();
          const cName = (c.nama_kelas || '').toString().toLowerCase().trim();
          const cTingkat = (c.tingkat || '').toString().toLowerCase().trim();

          const studs = archStudents.filter((s: any) => {
            const sStatus = (s.status || '').toLowerCase().trim();
            if (sStatus === 'graduated' || sStatus === 'lulus' || sStatus === 'moved' || sStatus === 'pindah') return false;

            const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, year);
            const sRombelNorm = (sRombel || s.kelas || s.rombel || '').toString().toLowerCase().trim();
            const sClassIdNorm = (sClassId || s.class_id || '').toString().toLowerCase().trim();

            if (sClassIdNorm === cId || sRombelNorm === cName || sRombelNorm === cTingkat || sRombelNorm === `kelas ${cTingkat}`) {
              return true;
            }

            const sDigits = (sRombelNorm || sClassIdNorm).replace(/[^0-9]/g, '');
            const cDigits = cTingkat || cName.replace(/[^0-9]/g, '');
            if (sDigits && cDigits && sDigits === cDigits && !sRombelNorm.includes('alumni') && !sRombelNorm.includes('lulus')) {
              return true;
            }
            return false;
          });
          const m = studs.filter((s: any) => s.gender === 'Laki-laki' || s.gender === 'L').length;
          const f = studs.filter((s: any) => s.gender === 'Perempuan' || s.gender === 'P').length;
          byClass[c.id] = { male: m, female: f, total: m + f };
        });

        const totM = Object.values(byClass).reduce((a, b) => a + b.male, 0);
        const totF = Object.values(byClass).reduce((a, b) => a + b.female, 0);

        return {
          year,
          male: totM,
          female: totF,
          total: totM + totF,
          label: matchingArchive.note || defaultLabel,
          kelas: defaultClassesStr,
          byClass,
          isArchived: true,
        };
      }

      // 2. Filter students specifically for year
      const parseYearStart = (yStr: string) => {
        const m = yStr.match(/(\d{4})/);
        return m ? parseInt(m[1], 10) : 0;
      };
      const yearStart = parseYearStart(normYear);
      const activeStart = parseYearStart(normActiveYear);

      const yearStudents = allStudents.filter((s: any) => {
        const sStatus = (s.status || '').toLowerCase().trim();
        const sTahunPel = (s.tahun_pelajaran || '').toString().trim();
        const sTahunMasuk = (s.tahun_masuk || '').toString().trim();
        const sTahunLulus = (s.tahun_lulus || '').toString().trim();

        const pelStart = parseYearStart(sTahunPel);
        const masukStart = parseYearStart(sTahunMasuk);
        const lulusStart = parseYearStart(sTahunLulus);

        if (yearStart > 0) {
          if (pelStart > yearStart) return false;
          if (masukStart > yearStart) return false;
        }

        if (sTahunPel === normYear || sTahunMasuk === normYear) {
          if (sStatus === 'graduated' || sStatus === 'lulus') return sTahunLulus === normYear;
          return sStatus === 'active' || sStatus === 'aktif' || !sStatus;
        }

        if (sStatus === 'graduated' || sStatus === 'lulus') {
          if (sTahunLulus === normYear) return true;
          if (lulusStart > yearStart && yearStart > 0) {
            return masukStart === 0 || masukStart <= yearStart;
          }
          return false;
        }

        if (sStatus === 'active' || sStatus === 'aktif' || !sStatus) {
          if (yearStart > 0) {
            if (masukStart > 0 && masukStart > yearStart) return false;
            if (pelStart > 0 && pelStart > yearStart) return false;
          }
          return true;
        }
        return false;
      });

      const byClass: { [classId: string]: { male: number; female: number; total: number } } = {};
      let yearM = 0;
      let yearF = 0;

      sortedClassesList.forEach((c) => {
        const overrideVal = rekapOverrides.threeYears?.[year]?.byClass?.[c.id] || rekapOverrides.threeYears?.[year]?.byClass?.[c.nama_kelas];

        let m = 0;
        let f = 0;

        if (overrideVal && typeof overrideVal.male === 'number' && typeof overrideVal.female === 'number') {
          m = overrideVal.male;
          f = overrideVal.female;
        } else {
          const cId = (c.id || '').toString().toLowerCase().trim();
          const cName = (c.nama_kelas || '').toString().toLowerCase().trim();
          const cTingkat = (c.tingkat || '').toString().toLowerCase().trim();

          const classStuds = yearStudents.filter((s) => {
            const sStatus = (s.status || '').toLowerCase().trim();
            if (sStatus === 'graduated' || sStatus === 'lulus' || sStatus === 'moved' || sStatus === 'pindah') return false;

            const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, year);
            const sRombelNorm = (sRombel || s.kelas || s.rombel || '').toString().toLowerCase().trim();
            const sClassIdNorm = (sClassId || s.class_id || '').toString().toLowerCase().trim();

            if (sClassIdNorm === cId || sRombelNorm === cName || sRombelNorm === cTingkat || sRombelNorm === `kelas ${cTingkat}`) {
              return true;
            }

            const sDigits = (sRombelNorm || sClassIdNorm).replace(/[^0-9]/g, '');
            const cDigits = cTingkat || cName.replace(/[^0-9]/g, '');
            if (sDigits && cDigits && sDigits === cDigits && !sRombelNorm.includes('alumni') && !sRombelNorm.includes('lulus')) {
              return true;
            }
            return false;
          });
          m = classStuds.filter((s) => s.gender === 'Laki-laki' || s.gender === 'L').length;
          f = classStuds.filter((s) => s.gender === 'Perempuan' || s.gender === 'P').length;

          if (normYear === normActiveYear) {
            const classOverride = rekapOverrides.classes?.[c.id] || rekapOverrides.classes?.[c.nama_kelas];
            if (classOverride) {
              if (typeof classOverride.male === 'number') m = classOverride.male;
              if (typeof classOverride.female === 'number') f = classOverride.female;
            }
          }
        }

        byClass[c.id] = { male: m, female: f, total: m + f };
        yearM += m;
        yearF += f;
      });

      const finalMale = rekapOverrides.threeYears?.[year]?.male !== undefined ? rekapOverrides.threeYears[year].male : yearM;
      const finalFemale = rekapOverrides.threeYears?.[year]?.female !== undefined ? rekapOverrides.threeYears[year].female : yearF;

      return {
        year,
        male: finalMale,
        female: finalFemale,
        total: finalMale + finalFemale,
        label: rekapOverrides.threeYears?.[year]?.label || defaultLabel,
        kelas: rekapOverrides.threeYears?.[year]?.kelas || defaultClassesStr,
        byClass,
        isArchived: false,
      };
    });
  }, [selectedAcademicYear, settings.tahun_pelajaran?.active_year, academicArchives, allStudents, rekapOverrides, sortedClassesList]);

  useEffect(() => {
    fetchData();
  }, [activeMadrasahId]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    let loadedClasses: Kelas[] = [];
    let loadedStudents: Student[] = [];

    try {
      const { data: res, error } = await supabase.from('site_settings').select('id, value');

      if (!error && res && res.length > 0) {
        const scopedStudentsKey = getScopedKey ? getScopedKey('students_list') : `students_list_${activeMadrasahId || 'madrasah_default'}`;
        const scopedClassesKey = getScopedKey ? getScopedKey('kelas_list') : `kelas_list_${activeMadrasahId || 'madrasah_default'}`;
        const scopedArchivesKey = getScopedKey ? getScopedKey('academic_archives') : `academic_archives_${activeMadrasahId || 'madrasah_default'}`;
        const scopedRekapKey = getScopedKey ? getScopedKey('rekap_overrides') : `rekap_overrides_${activeMadrasahId || 'madrasah_default'}`;

        const ALL_STUDENT_KEYS = Array.from(new Set([
          scopedStudentsKey,
          `students_list_${activeMadrasahId || 'madrasah_default'}`,
          'students_list_madrasah_default',
          'students_list',
          'siakad_students_data',
          'app_students_v2',
          'students_data',
          'madrasah_students'
        ]));

        const ALL_CLASS_KEYS = Array.from(new Set([
          scopedClassesKey,
          `kelas_list_${activeMadrasahId || 'madrasah_default'}`,
          'kelas_list_madrasah_default',
          'kelas_list',
          'classes_list',
          'app_classes',
          'siakad_classes_data',
          'site_classes',
          'classes_data',
          'siakad_rombel_classes',
          'madrasah_classes'
        ]));

        for (const k of ALL_STUDENT_KEYS) {
          const found = res.find(s => s.id === k);
          if (found && Array.isArray(found.value) && found.value.length > 0) {
            loadedStudents = found.value;
            break;
          }
        }

        for (const k of ALL_CLASS_KEYS) {
          const found = res.find(s => s.id === k);
          if (found && Array.isArray(found.value) && found.value.length > 0) {
            loadedClasses = found.value;
            break;
          }
        }

        const archivesData = res.find(s => s.id === scopedArchivesKey)?.value || res.find(s => s.id === 'academic_archives')?.value || [];
        const rekapData = res.find(s => s.id === scopedRekapKey)?.value || res.find(s => s.id === 'rekap_overrides')?.value;

        if (Array.isArray(archivesData)) {
          setAcademicArchives(archivesData);
        }

        if (rekapData && typeof rekapData === 'object' && Object.keys(rekapData).length > 0) {
          setRekapOverrides(rekapData);
          localStorage.setItem('madrasah_rekap_overrides', JSON.stringify(rekapData));
        } else if (rekapData && typeof rekapData === 'object' && Object.keys(rekapData).length === 0) {
          setRekapOverrides({});
          localStorage.removeItem('madrasah_rekap_overrides');
        }
      }
    } catch (err) {
      console.warn('Supabase fetch error or 403, switching to local cache:', err);
    }

    if (loadedClasses.length === 0 && settings.kelas_list && Array.isArray(settings.kelas_list) && settings.kelas_list.length > 0) {
      loadedClasses = settings.kelas_list;
    }
    if (loadedStudents.length === 0 && settings.students_list && Array.isArray(settings.students_list) && settings.students_list.length > 0) {
      loadedStudents = settings.students_list;
    }

    if (loadedClasses.length === 0 || loadedStudents.length === 0) {
      try {
        const studentCache = localStorage.getItem('students_list') ||
          localStorage.getItem('students_list_madrasah_default') ||
          localStorage.getItem('siakad_students_data') ||
          localStorage.getItem('siakad_site_settings');

        if (loadedStudents.length === 0 && studentCache) {
          const parsed = JSON.parse(studentCache);
          loadedStudents = Array.isArray(parsed) ? parsed : (parsed.students_list || []);
        }

        const classCache = localStorage.getItem('kelas_list') ||
          localStorage.getItem('kelas_list_madrasah_default') ||
          localStorage.getItem('siakad_classes_data');

        if (loadedClasses.length === 0 && classCache) {
          const parsed = JSON.parse(classCache);
          loadedClasses = Array.isArray(parsed) ? parsed : (parsed.kelas_list || []);
        }
      } catch (e) {
        console.warn('LocalStorage fallback parse error:', e);
      }
    }

    if (loadedClasses.length === 0) loadedClasses = DEFAULT_FALLBACK_CLASSES;
    if (loadedStudents.length === 0) loadedStudents = DEFAULT_FALLBACK_STUDENTS;

    setClasses(loadedClasses);
    setAllStudents(loadedStudents);
    if (!isSilent) setLoading(false);
  };

  const filteredAlumni = useMemo(() => {
    return alumniStudents.filter(s => {
      const matchYear = alumniYearFilter === 'all' || s.tahun_lulus === alumniYearFilter;
      const matchSearch = searchQuery === '' || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.nisn?.includes(searchQuery) ||
        s.nik?.includes(searchQuery);
      return matchYear && matchSearch;
    });
  }, [alumniStudents, alumniYearFilter, searchQuery]);

  const unassignedStudents = useMemo(() => {
    return activeStudents.filter(s => {
      const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);
      const sRombelNorm = (sRombel || s.kelas || s.rombel || '').toString().toLowerCase().trim();
      const sClassIdNorm = (sClassId || s.class_id || '').toString().toLowerCase().trim();

      if (!sClassIdNorm || sClassIdNorm === 'unassigned' || sClassIdNorm === 'tanpa_rombel' || sClassIdNorm === '-') return true;

      const exists = sortedClassesList.some(c => {
        const cId = (c.id || '').toString().toLowerCase().trim();
        const cName = (c.nama_kelas || '').toString().toLowerCase().trim();
        return cId === sClassIdNorm || cName === sRombelNorm;
      });
      return !exists;
    });
  }, [activeStudents, sortedClassesList, selectedAcademicYear]);

  const filteredUnassignedStudents = useMemo(() => {
    return unassignedStudents.filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.nisn?.includes(q) || s.nik?.includes(q);
    });
  }, [unassignedStudents, searchQuery]);

  const levels = useMemo(() => {
    const levelSet = new Set(sortedClassesList.map(c => c.tingkat));
    return Array.from(levelSet).sort((a, b) => parseInt(a) - parseInt(b));
  }, [sortedClassesList]);

  const filteredClasses = useMemo(() => {
    return sortedClassesList
      .filter(c => {
        if (selectedLevel !== 'all' && c.tingkat !== selectedLevel) return false;
        if (selectedClassId !== 'all' && c.id !== selectedClassId) return false;
        return true;
      })
      .sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat));
  }, [sortedClassesList, selectedLevel, selectedClassId]);

  const getStudentsByClass = (classId: string) => {
    const targetClass = sortedClassesList.find(c => c.id === classId || c.nama_kelas === classId);
    return activeStudents.filter(s => {
      const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);

      const sRombelNorm = (sRombel || s.kelas || s.rombel || '').toString().toLowerCase().trim();
      const sClassIdNorm = (sClassId || s.class_id || '').toString().toLowerCase().trim();

      const cId = (classId || '').toString().toLowerCase().trim();
      const cName = (targetClass?.nama_kelas || '').toString().toLowerCase().trim();
      const cTingkat = (targetClass?.tingkat || '').toString().toLowerCase().trim();

      const matchClass =
        sClassIdNorm === cId ||
        sRombelNorm === cId ||
        sRombelNorm === cName ||
        sRombelNorm === cTingkat ||
        sRombelNorm === `kelas ${cTingkat}`;

      const matchSearch = searchQuery === '' || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s.nisn && s.nisn.includes(searchQuery));
      return matchClass && matchSearch;
    });
  };

  const getClassName = (classId: string) => {
    const found = sortedClassesList.find(c => c.id === classId || c.nama_kelas === classId);
    return found ? found.nama_kelas : 'Alumni / Lulus';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600 font-bold text-sm">Memuat data kelas, siswa & alumni...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isPrinting) {
    if (printMode === 'rekapitulasi') {
      return (
        <div className="min-h-screen bg-white p-0">
          <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
            <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Mode Dokumen Resmi: Rekapitulasi Jumlah Siswa
              </span>
              <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold shadow-lg">
                <Printer className="w-4 h-4 mr-2" /> Cetak Rekapitulasi
              </Button>
            </div>
          </div>

          <div 
            className="mx-auto print:w-full flex flex-col font-serif p-8"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              boxSizing: 'border-box'
            }}
          >
            <KopSurat />
            <div className="text-center my-6">
              <h2 className="text-xl font-bold underline uppercase">REKAPITULASI JUMLAH SISWA PER TAHUN PELAJARAN</h2>
              <p className="mt-1 text-sm font-bold">TAHUN PELAJARAN {selectedAcademicYear}</p>
            </div>

            <div className="mb-2">
              <h3 className="font-bold text-xs uppercase mb-2">I. REKAPITULASI SISWA PER ROMBONGAN BELAJAR (KELAS)</h3>
              <table className="w-full border-collapse border border-black text-[9.5pt]">
                <thead>
                  <tr className="bg-gray-100 font-bold text-center">
                    <th rowSpan={2} className="border border-black p-2 w-12 align-middle">No</th>
                    <th rowSpan={2} className="border border-black p-2 text-left align-middle">Nama Kelas / Rombongan Belajar</th>
                    <th colSpan={2} className="border border-black p-1 text-center">Jenis Kelamin</th>
                    <th rowSpan={2} className="border border-black p-2 w-36 align-middle">Jumlah Siswa</th>
                  </tr>
                  <tr className="bg-gray-100 font-bold text-center">
                    <th className="border border-black p-1.5 w-28">Laki-laki (L)</th>
                    <th className="border border-black p-1.5 w-28">Perempuan (P)</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapitulasiData.rows.map((row, idx) => (
                    <tr key={row.class_id}>
                      <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-2 font-bold uppercase">{row.nama_kelas}</td>
                      <td className="border border-black p-2 text-center font-mono font-bold">{row.male}</td>
                      <td className="border border-black p-2 text-center font-mono font-bold">{row.female}</td>
                      <td className="border border-black p-2 text-center font-mono font-black">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-200 font-black text-center text-[10pt]">
                    <td colSpan={2} className="border border-black p-2 text-right uppercase">JUMLAH KESELURUHAN SISWA</td>
                    <td className="border border-black p-2 font-mono">{rekapitulasiData.grandMale}</td>
                    <td className="border border-black p-2 font-mono">{rekapitulasiData.grandFemale}</td>
                    <td className="border border-black p-2 font-mono text-base">{rekapitulasiData.grandTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-xs uppercase mb-2">II. REKAPITULASI OTOMATIS PERKEMBANGAN JUMLAH SISWA (3 TAHUN PELAJARAN)</h3>
              <table className="w-full border-collapse border border-black text-[8pt]">
                <thead>
                  <tr className="bg-gray-100 font-bold text-center">
                    <th rowSpan={3} className="border border-black p-1 w-8 align-middle">No</th>
                    <th rowSpan={3} className="border border-black p-1 text-center align-middle min-w-[100px]">Tahun Pelajaran</th>
                    <th colSpan={sortedClassesList.length * 2 + 3} className="border border-black p-1 text-center uppercase tracking-wider font-extrabold">JUMLAH SISWA</th>
                    <th rowSpan={3} className="border border-black p-1 text-left align-middle min-w-[110px]">Keterangan / Status</th>
                  </tr>
                  <tr className="bg-gray-100 font-bold text-center text-[7.5pt]">
                    {sortedClassesList.map((c) => (
                      <th key={c.id} colSpan={2} className="border border-black p-1 text-center">
                        {c.nama_kelas}
                      </th>
                    ))}
                    <th colSpan={3} className="border border-black p-1 text-center bg-gray-200">
                      TOTAL
                    </th>
                  </tr>
                  <tr className="bg-gray-100 font-bold text-center text-[7pt]">
                    {sortedClassesList.map((c) => (
                      <React.Fragment key={`sub-p-${c.id}`}>
                        <th className="border border-black p-0.5 w-6">L</th>
                        <th className="border border-black p-0.5 w-6">P</th>
                      </React.Fragment>
                    ))}
                    <th className="border border-black p-0.5 w-7 bg-gray-200">L</th>
                    <th className="border border-black p-0.5 w-7 bg-gray-200">P</th>
                    <th className="border border-black p-0.5 w-8 bg-gray-300 font-black">JML</th>
                  </tr>
                </thead>
                <tbody>
                  {threeYearSummary.map((row, idx) => (
                    <tr key={row.year} className={`text-center ${row.year === selectedAcademicYear ? 'font-bold bg-gray-50' : ''}`}>
                      <td className="border border-black p-1 font-bold">{idx + 1}</td>
                      <td className="border border-black p-1 font-mono font-bold text-left">{row.year}</td>
                      {sortedClassesList.map((c) => {
                        const classData = row.byClass[c.id] || { male: 0, female: 0 };
                        return (
                          <React.Fragment key={`pval-${row.year}-${c.id}`}>
                            <td className="border border-black p-1 font-mono text-[8.5pt]">{classData.male}</td>
                            <td className="border border-black p-1 font-mono text-[8.5pt]">{classData.female}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className="border border-black p-1 font-mono font-bold bg-gray-50">{row.male}</td>
                      <td className="border border-black p-1 font-mono font-bold bg-gray-50">{row.female}</td>
                      <td className="border border-black p-1 font-mono font-black text-sm bg-gray-100">{row.total}</td>
                      <td className="border border-black p-1 text-left text-[7.5pt]">{row.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              <PenandatanganDokumen showGuru={false} />
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
        </div>
      );
    }

    if (printMode === 'alumni') {
      return (
        <div className="min-h-screen bg-white p-0">
          <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
            <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Mode Dokumen Resmi: Daftar Alumni
              </span>
              <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold shadow-lg">
                <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
              </Button>
            </div>
          </div>

          <div 
            className="mx-auto print:w-full flex flex-col font-serif p-8"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              boxSizing: 'border-box'
            }}
          >
            <KopSurat />
            <div className="text-center my-6">
              <h2 className="text-xl font-bold underline uppercase">DAFTAR DATA ALUMNI & LULUSAN MADRASAH</h2>
              <p className="mt-1 text-sm font-semibold">
                {alumniYearFilter === 'all' ? 'Semua Tahun Kelulusan' : `Tahun Kelulusan ${alumniYearFilter}`}
              </p>
              <p className="text-xs mt-1">
                Total Alumni Dicetak: <strong className="font-mono">{filteredAlumni.length} Orang</strong> (Laki-laki: {filteredAlumni.filter(s => s.gender === 'Laki-laki').length}, Perempuan: {filteredAlumni.filter(s => s.gender === 'Perempuan').length})
              </p>
            </div>

            <table className="w-full border-collapse border border-black text-[9pt]">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black p-2 w-10 text-center">No</th>
                  <th className="border border-black p-2 text-left">Nama Lengkap Alumni</th>
                  <th className="border border-black p-2 text-center w-28">NISN / NIK</th>
                  <th className="border border-black p-2 text-center w-12">L/P</th>
                  <th className="border border-black p-2 text-center w-28">Tahun Lulus</th>
                  <th className="border border-black p-2 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumni.map((s, sIdx) => (
                  <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-black p-2 text-center">{sIdx + 1}</td>
                    <td className="border border-black p-2 font-bold uppercase">{s.name}</td>
                    <td className="border border-black p-2 text-center font-mono">{s.nisn || s.nik || '-'}</td>
                    <td className="border border-black p-2 text-center font-bold">{s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td className="border border-black p-2 text-center font-bold">{s.tahun_lulus || '-'}</td>
                    <td className="border border-black p-2 text-center uppercase text-[8pt] font-semibold">Lulus</td>
                  </tr>
                ))}
                {filteredAlumni.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border border-black p-4 text-center italic text-gray-500">
                      Tidak ada data alumni untuk kriteria filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-8">
              <PenandatanganDokumen showGuru={false} />
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
        </div>
      );
    }

    // Active Students Print Mode
    const classesToPrint = printClassId === 'all' 
      ? sortedClassesList
      : sortedClassesList.filter(k => k.id === printClassId);

    return (
      <div className="min-h-screen bg-white p-0">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
          </Button>
        </div>

        <div 
          className="mx-auto print:w-full flex flex-col font-serif p-8"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            boxSizing: 'border-box'
          }}
        >
          <KopSurat />
          <div className="text-center my-6">
            <h2 className="text-xl font-bold underline uppercase">DAFTAR KELAS, WALI KELAS & SISWA AKTIF</h2>
            <p className="mt-1 text-sm font-semibold">Tahun Pelajaran {settings.tahun_pelajaran?.active_year || '2024/2025'}</p>
          </div>

          <div className="space-y-8">
            {classesToPrint.map((item) => {
              const classStuds = activeStudents.filter(s => {
                const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);
                const sRombelNorm = (sRombel || s.kelas || s.rombel || '').toString().toLowerCase().trim();
                const sClassIdNorm = (sClassId || s.class_id || '').toString().toLowerCase().trim();
                const cId = (item.id || '').toString().toLowerCase().trim();
                const cName = (item.nama_kelas || '').toString().toLowerCase().trim();
                return sClassIdNorm === cId || sRombelNorm === cName;
              });
              const maleCount = classStuds.filter(s => s.gender === 'Laki-laki').length;
              const femaleCount = classStuds.filter(s => s.gender === 'Perempuan').length;

              return (
                <div key={item.id} className="border border-black p-4 rounded-none break-inside-avoid mb-6">
                  <div className="flex justify-between items-start border-b border-black pb-3 mb-3">
                    <div>
                      <h3 className="text-base font-bold uppercase">{item.nama_kelas} (Tingkat {item.tingkat})</h3>
                      <p className="text-xs">Kapasitas: {item.kapasitas} Siswa | Terisi: {classStuds.length} Siswa (L: {maleCount}, P: {femaleCount})</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-bold">Wali Kelas: {item.wali_kelas || '-'}</p>
                      {item.nip_wali_kelas && <p className="font-mono">NIP: {item.nip_wali_kelas}</p>}
                      {item.golongan_wali_kelas && <p>Gol: {item.golongan_wali_kelas}</p>}
                      {item.nuptk_wali_kelas && <p className="font-mono">NUPTK: {item.nuptk_wali_kelas}</p>}
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-black text-[8.5pt]">
                    <thead>
                      <tr className="bg-gray-100 font-bold">
                        <th className="border border-black p-1.5 w-8 text-center">No</th>
                        <th className="border border-black p-1.5 text-left">Nama Lengkap Siswa</th>
                        <th className="border border-black p-1.5 text-center w-28">NISN</th>
                        <th className="border border-black p-1.5 text-center w-12">L/P</th>
                        <th className="border border-black p-1.5 text-center w-16">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStuds.map((s, sIdx) => (
                        <tr key={s.id}>
                          <td className="border border-black p-1.5 text-center">{sIdx + 1}</td>
                          <td className="border border-black p-1.5 font-bold uppercase">{s.name}</td>
                          <td className="border border-black p-1.5 text-center font-mono">{s.nisn || '-'}</td>
                          <td className="border border-black p-1.5 text-center font-bold">{s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                          <td className="border border-black p-1.5 text-center uppercase font-semibold">Aktif</td>
                        </tr>
                      ))}
                      {classStuds.length === 0 && (
                        <tr>
                          <td colSpan={5} className="border border-black p-3 text-center italic text-gray-500">
                            Belum ada siswa terdaftar di {item.nama_kelas}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <PenandatanganDokumen showGuru={false} />
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60">
      <Navbar />
      <main className="flex-1 pb-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white pt-28 pb-16 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-400/30 mb-4 shadow-inner">
              <School className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-extrabold uppercase tracking-widest">
                {activeTab === 'active' 
                  ? 'Direktori Siswa & Rombel Aktif' 
                  : activeTab === 'rekapitulasi'
                    ? 'Laporan Rekapitulasi Siswa Per TP'
                    : 'Pusat Data Alumni & Lulusan'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 tracking-tight">
              {activeTab === 'active' 
                ? 'Daftar Kelas, Wali Kelas & Siswa' 
                : activeTab === 'rekapitulasi'
                  ? 'Rekapitulasi Data Siswa Per Tahun Pelajaran'
                  : 'Daftar Alumni & Lulusan Madrasah'}
            </h1>
            <p className="text-emerald-100/80 max-w-2xl mx-auto text-sm sm:text-base font-medium leading-relaxed">
              {activeTab === 'active'
                ? 'Direktori resmi rombongan belajar madrasah yang dilengkapi dengan foto wali kelas serta daftar seluruh siswa aktif di setiap kelas.'
                : activeTab === 'rekapitulasi'
                  ? 'Rekapitulasi resmi jumlah siswa per kelas, rincian jenis kelamin (L/P), dan rekapitulasi perkembangan siswa 3 tahun pelajaran.'
                  : 'Direktori resmi rekapitulasi data alumni dan lulusan madrasah lengkap per tahun kelulusan serta siap dicetak sebagai dokumen resmi.'
              }
            </p>

            {/* Main Mode Toggle Tabs - 3 Horizontal Iconic Buttons */}
            <div className="flex items-center justify-center mt-6">
              <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-emerald-500/30 shadow-2xl flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 ${
                    activeTab === 'active' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 ring-2 ring-emerald-300' 
                      : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${activeTab === 'active' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <span>Data Siswa ({activeStudents.length})</span>
                </button>

                <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

                <button
                  onClick={() => setActiveTab('rekapitulasi')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 ${
                    activeTab === 'rekapitulasi' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 ring-2 ring-emerald-300' 
                      : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${activeTab === 'rekapitulasi' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    <PieChart className="w-4 h-4" />
                  </div>
                  <span>Rekapitulasi TP ({selectedAcademicYear})</span>
                </button>

                <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

                <button
                  onClick={() => setActiveTab('alumni')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 ${
                    activeTab === 'alumni' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 ring-2 ring-emerald-300' 
                      : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${activeTab === 'alumni' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span>Data Alumni ({alumniStudents.length})</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-black/20 px-4 py-1.5 rounded-full border border-white/10">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'alumni' 
                    ? (alumniYearFilter === 'all' ? 'Semua Tahun Lulus' : `Tahun Lulus ${alumniYearFilter}`)
                    : `Tahun Pelajaran ${selectedAcademicYear}`
                  }
                </span>
              </div>

              <Button
                onClick={handleExportExcel}
                className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-full h-8 px-4 gap-1.5 shadow-md"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Excel
              </Button>

              <Button
                onClick={() => {
                  setPrintMode('rekapitulasi');
                  setIsPrinting(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-full h-8 px-4 gap-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Rekapitulasi Siswa
              </Button>

              <Button
                onClick={() => {
                  setPrintMode(activeTab === 'rekapitulasi' ? 'rekapitulasi' : activeTab);
                  if (activeTab === 'active') setPrintClassId('all');
                  setIsPrinting(true);
                }}
                className="bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs rounded-full h-8 px-4 gap-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                Cetak {activeTab === 'active' ? 'Daftar Kelas & Siswa' : activeTab === 'rekapitulasi' ? 'Rekapitulasi Dokumen' : 'Daftar Alumni'}
              </Button>

              <Button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showSuccess('Link Halaman berhasil disalin!');
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-full h-8 px-4 gap-1.5 shadow-md"
              >
                <Share2 className="w-3.5 h-3.5" />
                Bagikan Halaman
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
          {activeTab === 'active' ? (
            <>
              {/* Header Stats Active Students */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <School className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{classes.length}</div>
                    <p className="text-xs font-semibold text-slate-500">Total Kelas</p>
                  </div>
                </Card>

                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{activeStudents.length}</div>
                    <p className="text-xs font-semibold text-slate-500">Total Siswa Aktif</p>
                  </div>
                </Card>

                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      {activeStudents.filter(s => s.gender === 'Laki-laki').length}
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Laki-laki (👦)</p>
                  </div>
                </Card>

                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      {activeStudents.filter(s => s.gender === 'Perempuan').length}
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Perempuan (👧)</p>
                  </div>
                </Card>
              </div>

              {/* Filter Bar Active Students */}
              <Card className="border-0 shadow-xl rounded-3xl bg-white p-5 mb-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input 
                      placeholder="Cari nama siswa atau NISN..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-2xl border-slate-200 bg-slate-50/50 text-sm font-medium h-11"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Button 
                      variant={selectedLevel === 'all' && selectedClassId === 'all' ? 'default' : 'outline'}
                      onClick={() => { setSelectedLevel('all'); setSelectedClassId('all'); }}
                      className={`rounded-xl text-xs font-bold h-9 px-4 ${selectedLevel === 'all' && selectedClassId === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                    >
                      Semua Kelas
                    </Button>

                    {levels.map(lvl => (
                      <Button 
                        key={lvl}
                        variant={selectedLevel === lvl ? 'default' : 'outline'}
                        onClick={() => { setSelectedLevel(lvl); setSelectedClassId('all'); }}
                        className={`rounded-xl text-xs font-bold h-9 px-3 ${selectedLevel === lvl ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                      >
                        Tingkat {lvl}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* List Kelas Cards */}
              <div className="space-y-10">
                {filteredClasses.map(item => {
                  const classStudents = getStudentsByClass(item.id);
                  const maleCount = classStudents.filter(s => s.gender === 'Laki-laki').length;
                  const femaleCount = classStudents.filter(s => s.gender === 'Perempuan').length;

                  return (
                    <Card key={item.id} className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-white shrink-0">
                            <School className="w-8 h-8 text-emerald-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-extrabold text-[10px] tracking-wider uppercase">
                                Tingkat {item.tingkat}
                              </Badge>
                              <span className="text-xs text-emerald-200/80 font-bold">Kapasitas: {item.kapasitas} Siswa</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">{item.nama_kelas}</h2>
                          </div>
                        </div>

                        {/* Wali Kelas Photo & Details */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-start gap-4 w-full md:max-w-md shadow-inner">
                          <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/20 border-2 border-white/30 shrink-0 shadow-md flex items-center justify-center">
                            {item.foto_wali_kelas ? (
                              <img src={item.foto_wali_kelas} alt={item.wali_kelas || 'Wali Kelas'} className="w-full h-full object-cover" />
                            ) : (
                              <UserCheck className="w-8 h-8 text-emerald-200" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1 text-xs">
                            <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">Wali Kelas (Guru):</span>
                            <h3 className="font-extrabold text-white text-base leading-snug truncate">{item.wali_kelas && item.wali_kelas !== '-' ? item.wali_kelas : 'Belum Ditentukan'}</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-emerald-100/90 font-medium text-[11px] pt-1 border-t border-white/10">
                              {item.nip_wali_kelas && (
                                <div className="truncate"><span className="text-emerald-300">NIP:</span> <span className="font-mono">{item.nip_wali_kelas}</span></div>
                              )}
                              {item.golongan_wali_kelas && (
                                <div className="truncate"><span className="text-emerald-300">Gol:</span> {item.golongan_wali_kelas}</div>
                              )}
                              {item.nuptk_wali_kelas && (
                                <div className="truncate"><span className="text-emerald-300">NUPTK:</span> <span className="font-mono">{item.nuptk_wali_kelas}</span></div>
                              )}
                              {item.nrg_wali_kelas && (
                                <div className="truncate"><span className="text-emerald-300">NRG:</span> <span className="font-mono">{item.nrg_wali_kelas}</span></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-6 sm:p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                              <Users className="w-4 h-4 text-emerald-600" /> Daftar Siswa ({classStudents.length} Orang)
                            </span>
                            <div className="flex items-center gap-2 text-xs font-bold">
                              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">👦 {maleCount} Laki-laki</span>
                              <span className="bg-pink-50 text-pink-700 px-2.5 py-1 rounded-lg border border-pink-200">👧 {femaleCount} Perempuan</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setPrintMode('active');
                              setPrintClassId(item.id);
                              setIsPrinting(true);
                            }}
                            className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs h-8 px-3 gap-1.5 shrink-0"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            Cetak Rombel Ini
                          </Button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3 text-center w-12">No</th>
                                <th className="px-4 py-3">Nama Lengkap Siswa</th>
                                <th className="px-4 py-3 text-center">NISN</th>
                                <th className="px-4 py-3 text-center">Jenis Kelamin</th>
                                <th className="px-4 py-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {classStudents.map((s, idx) => (
                                <tr key={s.id} className="hover:bg-emerald-50/40 transition-colors">
                                  <td className="px-4 py-3 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                                  <td className="px-4 py-3 font-bold text-slate-900">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-9 h-11 rounded-xl overflow-hidden shrink-0 border-2 flex items-center justify-center font-black text-xs ${s.gender === 'Laki-laki' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'}`}>
                                        {s.photo_url ? (
                                          <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                                        ) : (
                                          s.name.charAt(0)
                                        )}
                                      </div>
                                      <span className="text-sm">{s.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono text-slate-600 text-xs">{s.nisn || '-'}</td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge className={s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-pink-100 text-pink-800 hover:bg-pink-100'}>
                                      {s.gender}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aktif
                                    </span>
                                  </td>
                                </tr>
                              ))}

                              {classStudents.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                                    {searchQuery ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Belum ada data siswa untuk kelas ini.'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredClasses.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                    <School className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Kelas Tidak Ditemukan</h3>
                    <p className="text-slate-500 text-sm">Tidak ada kelas yang sesuai dengan filter yang Anda pilih.</p>
                  </div>
                )}
              </div>

              {/* REKAPITULASI JUMLAH SISWA */}
              <Card className="border-0 shadow-xl rounded-3xl bg-white p-6 sm:p-7 mt-10 mb-8 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-sm shrink-0">
                    <School className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full">
                        Fitur Rekapitulasi Modul
                      </Badge>
                      <span className="text-xs text-slate-500 font-semibold">Menyesuaikan Tahun Pelajaran Aktif</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      Rekapitulasi Jumlah Siswa Per Tahun Pelajaran
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Rincian rekapitulasi siswa per rombel/kelas, jenis kelamin (L/P), dan total jumlah siswa.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Tahun Pelajaran:</span>
                    <Select 
                      value={selectedAcademicYear} 
                      onValueChange={(val) => setSelectedAcademicYear(val)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs font-bold rounded-lg border-slate-300 bg-white">
                        <SelectValue placeholder="Pilih Tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAcademicYears.map((yr) => (
                          <SelectItem key={yr} value={yr} className="text-xs font-bold">
                            {yr} {yr === settings.tahun_pelajaran?.active_year ? '(Aktif)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => {
                      setPrintMode('rekapitulasi');
                      setIsPrinting(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Rekapitulasi
                  </Button>
                </div>
              </div>

              {/* Table Rekapitulasi Per Rombel */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <School className="w-4 h-4 text-emerald-600" />
                  I. Rekapitulasi Jumlah Siswa Per Rombongan Belajar (Kelas)
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner bg-slate-50/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-center">
                        <th rowSpan={2} className="p-3.5 w-12 border-r border-slate-800 align-middle">No</th>
                        <th rowSpan={2} className="p-3.5 text-left border-r border-slate-800 align-middle">Nama Kelas / Rombongan Belajar</th>
                        <th colSpan={2} className="p-2 border-b border-r border-slate-800 bg-slate-800 text-center">Jenis Kelamin</th>
                        <th rowSpan={2} className="p-3.5 w-36 bg-emerald-900/90 align-middle">Jumlah Siswa</th>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold text-center">
                        <th className="p-2.5 w-32 bg-blue-900/80 border-r border-slate-800">Laki-laki (L)</th>
                        <th className="p-2.5 w-32 bg-pink-900/80 border-r border-slate-800">Perempuan (P)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 bg-white font-medium">
                      {rekapitulasiData.rows.map((row, idx) => (
                        <tr key={row.class_id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-3.5 font-bold text-slate-900 border-r border-slate-200">
                            <div className="flex items-center justify-between">
                              <span>{row.nama_kelas}</span>
                              {row.tingkat !== '-' && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                                  Tingkat {row.tingkat}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-blue-700 bg-blue-50/20 border-r border-slate-200 text-sm">
                            {row.male}
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-pink-700 bg-pink-50/20 border-r border-slate-200 text-sm">
                            {row.female}
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-emerald-800 bg-emerald-50/40 text-base">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                      {rekapitulasiData.rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center italic text-slate-500">
                            Belum ada data rombel / kelas yang terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black text-center text-xs">
                        <td colSpan={2} className="p-4 text-right uppercase tracking-wider border-r border-slate-800 text-slate-200">
                          TOTAL KESELURUHAN SISWA ({selectedAcademicYear})
                        </td>
                        <td className="p-4 font-mono border-r border-slate-800 text-blue-300 text-base">
                          {rekapitulasiData.grandMale}
                        </td>
                        <td className="p-4 font-mono border-r border-slate-800 text-pink-300 text-base">
                          {rekapitulasiData.grandFemale}
                        </td>
                        <td className="p-4 font-mono text-emerald-300 text-lg">
                          {rekapitulasiData.grandTotal}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Table Rekapitulasi 3 Tahun Pelajaran */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  II. Rekapitulasi Otomatis Perkembangan Siswa Per 3 Tahun Pelajaran
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner bg-slate-50/50">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                        <th rowSpan={3} className="p-3 w-10 border-r border-slate-800 align-middle">
                          NO
                        </th>
                        <th rowSpan={3} className="p-3 text-center border-r border-slate-800 align-middle min-w-[120px]">
                          TAHUN PELAJARAN
                        </th>
                        <th colSpan={sortedClassesList.length * 2 + 3} className="p-2.5 border-b border-r border-slate-800 bg-emerald-950 text-center uppercase tracking-wider text-xs font-black">
                          JUMLAH SISWA
                        </th>
                        <th rowSpan={3} className="p-3 text-left border-l border-slate-800 align-middle min-w-[130px]">
                          KETERANGAN / STATUS
                        </th>
                      </tr>

                      <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                        {sortedClassesList.map((c) => (
                          <th key={c.id} colSpan={2} className="p-2 border-r border-slate-800 bg-slate-800 text-center text-xs font-extrabold min-w-[70px]">
                            {c.nama_kelas}
                          </th>
                        ))}
                        <th colSpan={3} className="p-2 border-r border-slate-800 bg-emerald-900 text-center text-xs font-black min-w-[140px]">
                          TOTAL KESELURUHAN
                        </th>
                      </tr>

                      <tr className="bg-slate-900 text-white font-bold text-center border-b border-slate-800 text-[11px]">
                        {sortedClassesList.map((c) => (
                          <React.Fragment key={`sub-${c.id}`}>
                            <th className="p-1.5 w-9 bg-blue-900/80 border-r border-slate-800 font-mono text-blue-200">L</th>
                            <th className="p-1.5 w-9 bg-pink-900/80 border-r border-slate-800 font-mono text-pink-200">P</th>
                          </React.Fragment>
                        ))}
                        <th className="p-1.5 w-11 bg-blue-900/90 border-r border-slate-800 font-mono text-blue-200">L</th>
                        <th className="p-1.5 w-11 bg-pink-900/90 border-r border-slate-800 font-mono text-pink-200">P</th>
                        <th className="p-1.5 w-12 bg-emerald-900 border-r border-slate-800 font-mono text-emerald-200 font-black">JML</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 text-slate-700 bg-white font-medium">
                      {threeYearSummary.map((row, idx) => (
                        <tr
                          key={row.year}
                          className={`hover:bg-emerald-50/40 transition-colors ${
                            row.year === selectedAcademicYear
                              ? 'bg-emerald-50/60 font-bold'
                              : ''
                          }`}
                        >
                          <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-3 text-center font-bold text-slate-900 border-r border-slate-200 font-mono text-xs">
                            {row.year}
                          </td>

                          {sortedClassesList.map((c) => {
                            const classData = row.byClass[c.id] || { male: 0, female: 0 };
                            return (
                              <React.Fragment key={`val-${row.year}-${c.id}`}>
                                <td className="p-2 text-center font-mono font-bold text-blue-700 bg-blue-50/20 border-r border-slate-200 text-xs">
                                  {classData.male}
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-pink-700 bg-pink-50/20 border-r border-slate-200 text-xs">
                                  {classData.female}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          <td className="p-2 text-center font-mono font-bold text-blue-800 bg-blue-100/40 border-r border-slate-200 text-xs">
                            {row.male}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-pink-800 bg-pink-100/40 border-r border-slate-200 text-xs">
                            {row.female}
                          </td>
                          <td className="p-2 text-center font-mono font-black text-emerald-900 bg-emerald-100/60 text-sm border-r border-slate-200">
                            {row.total}
                          </td>

                          <td className="p-3 text-left border-l border-slate-200">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                row.year === selectedAcademicYear
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {row.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {unassignedStudents.length > 0 && (
              <Card className="border-0 shadow-lg rounded-3xl bg-amber-50/80 border border-amber-200 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                    <UserX className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-900 text-base">Perhatian: {unassignedStudents.length} Siswa Belum Punya Rombel</h4>
                    <p className="text-xs font-medium text-amber-700">Terdapat data siswa aktif yang belum dimasukkan ke rombongan belajar (kelas). Silakan atur di menu Admin Siswa.</p>
                  </div>
                </div>
              </Card>
            )}
          </>
        ) : activeTab === 'rekapitulasi' ? (
          <div className="space-y-8 mb-12">
            {/* Header Stats Rekapitulasi TP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{rekapitulasiData.grandTotal}</div>
                  <p className="text-xs font-semibold text-slate-500">Total Siswa ({selectedAcademicYear})</p>
                </div>
              </Card>

              <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{rekapitulasiData.grandMale}</div>
                  <p className="text-xs font-semibold text-slate-500">Laki-laki (👦)</p>
                </div>
              </Card>

              <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{rekapitulasiData.grandFemale}</div>
                  <p className="text-xs font-semibold text-slate-500">Perempuan (👧)</p>
                </div>
              </Card>

              <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{rekapitulasiData.rows.length}</div>
                  <p className="text-xs font-semibold text-slate-500">Jumlah Rombel</p>
                </div>
              </Card>
            </div>

            {/* Main Rekapitulasi Card */}
            <Card className="border-0 shadow-xl rounded-3xl bg-white p-6 sm:p-8 overflow-hidden">
              {/* Card Header & Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                    <PieChart className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full">
                        Pusat Rekapitulasi Publik
                      </Badge>
                      <span className="text-xs text-slate-500 font-semibold">Live Data Database</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                      Rekapitulasi Siswa Per Tahun Pelajaran
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Menampilkan data rekapitulasi resmi siswa per rombel, jenis kelamin, dan perbandingan 3 tahun pelajaran.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 ml-2">Pilih Tahun Pelajaran:</span>
                    <Select 
                      value={selectedAcademicYear} 
                      onValueChange={(val) => setSelectedAcademicYear(val)}
                    >
                      <SelectTrigger className="w-[150px] h-9 text-xs font-black rounded-xl border-slate-300 bg-white shadow-sm">
                        <SelectValue placeholder="Pilih Tahun" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableAcademicYears.map((yr) => (
                          <SelectItem key={yr} value={yr} className="text-xs font-bold cursor-pointer">
                            {yr} {yr === settings.tahun_pelajaran?.active_year ? '(TP Aktif)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleExportExcel}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl h-10 px-4 gap-2 shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export Excel (.xlsx)
                  </Button>

                  <Button
                    onClick={() => {
                      setPrintMode('rekapitulasi');
                      setIsPrinting(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl h-10 px-4 gap-2 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Dokumen A4
                  </Button>
                </div>
              </div>

              {/* Table I: Rekapitulasi Per Rombel */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <School className="w-5 h-5 text-emerald-600" />
                    I. Rekapitulasi Jumlah Siswa Per Rombongan Belajar ({selectedAcademicYear})
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">Total: {rekapitulasiData.grandTotal} Siswa</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner bg-slate-50/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-center">
                        <th rowSpan={2} className="p-3.5 w-12 border-r border-slate-800 align-middle">No</th>
                        <th rowSpan={2} className="p-3.5 text-left border-r border-slate-800 align-middle">Nama Kelas / Rombongan Belajar</th>
                        <th colSpan={2} className="p-2 border-b border-r border-slate-800 bg-slate-800 text-center">Jenis Kelamin</th>
                        <th rowSpan={2} className="p-3.5 w-36 bg-emerald-900/90 align-middle">Jumlah Siswa</th>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold text-center">
                        <th className="p-2.5 w-32 bg-blue-900/80 border-r border-slate-800">Laki-laki (L)</th>
                        <th className="p-2.5 w-32 bg-pink-900/80 border-r border-slate-800">Perempuan (P)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 bg-white font-medium">
                      {rekapitulasiData.rows.map((row, idx) => (
                        <tr key={row.class_id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-3.5 font-bold text-slate-900 border-r border-slate-200">
                            <div className="flex items-center justify-between">
                              <span>{row.nama_kelas}</span>
                              {row.tingkat !== '-' && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                                  Tingkat {row.tingkat}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-blue-700 bg-blue-50/20 border-r border-slate-200 text-sm">
                            {row.male}
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-pink-700 bg-pink-50/20 border-r border-slate-200 text-sm">
                            {row.female}
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-emerald-800 bg-emerald-50/40 text-base">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                      {rekapitulasiData.rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center italic text-slate-500">
                            Belum ada data rombel / kelas yang terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black text-center text-xs">
                        <td colSpan={2} className="p-4 text-right uppercase tracking-wider border-r border-slate-800 text-slate-200">
                          TOTAL KESELURUHAN SISWA ({selectedAcademicYear})
                        </td>
                        <td className="p-4 font-mono border-r border-slate-800 text-blue-300 text-base">
                          {rekapitulasiData.grandMale}
                        </td>
                        <td className="p-4 font-mono border-r border-slate-800 text-pink-300 text-base">
                          {rekapitulasiData.grandFemale}
                        </td>
                        <td className="p-4 font-mono text-emerald-300 text-lg">
                          {rekapitulasiData.grandTotal}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Table II: Rekapitulasi 3 Tahun Pelajaran */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    II. Rekapitulasi Otomatis Perkembangan Siswa Per 3 Tahun Pelajaran
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">Perbandingan Tren Multi-Tahun</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner bg-slate-50/50">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                        <th rowSpan={3} className="p-3 w-10 border-r border-slate-800 align-middle">NO</th>
                        <th rowSpan={3} className="p-3 text-center border-r border-slate-800 align-middle min-w-[120px]">TAHUN PELAJARAN</th>
                        <th colSpan={sortedClassesList.length * 2 + 3} className="p-2.5 border-b border-r border-slate-800 bg-emerald-950 text-center uppercase tracking-wider text-xs font-black">JUMLAH SISWA</th>
                        <th rowSpan={3} className="p-3 text-left border-l border-slate-800 align-middle min-w-[130px]">KETERANGAN / STATUS</th>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                        {sortedClassesList.map((c) => (
                          <th key={c.id} colSpan={2} className="p-2 border-r border-slate-800 bg-slate-800 text-center text-xs font-extrabold min-w-[70px]">
                            {c.nama_kelas}
                          </th>
                        ))}
                        <th colSpan={3} className="p-2 border-r border-slate-800 bg-emerald-900 text-center text-xs font-black min-w-[140px]">
                          TOTAL KESELURUHAN
                        </th>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold text-center border-b border-slate-800 text-[11px]">
                        {sortedClassesList.map((c) => (
                          <React.Fragment key={`sub-${c.id}`}>
                            <th className="p-1.5 w-9 bg-blue-900/80 border-r border-slate-800 font-mono text-blue-200">L</th>
                            <th className="p-1.5 w-9 bg-pink-900/80 border-r border-slate-800 font-mono text-pink-200">P</th>
                          </React.Fragment>
                        ))}
                        <th className="p-1.5 w-11 bg-blue-900/90 border-r border-slate-800 font-mono text-blue-200">L</th>
                        <th className="p-1.5 w-11 bg-pink-900/90 border-r border-slate-800 font-mono text-pink-200">P</th>
                        <th className="p-1.5 w-12 bg-emerald-900 border-r border-slate-800 font-mono text-emerald-200 font-black">JML</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 bg-white font-medium">
                      {threeYearSummary.map((row, idx) => (
                        <tr
                          key={row.year}
                          className={`hover:bg-emerald-50/40 transition-colors ${
                            row.year === selectedAcademicYear
                              ? 'bg-emerald-50/60 font-bold'
                              : ''
                          }`}
                        >
                          <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-3 text-center font-bold text-slate-900 border-r border-slate-200 font-mono text-xs">
                            {row.year}
                          </td>

                          {sortedClassesList.map((c) => {
                            const classData = row.byClass[c.id] || { male: 0, female: 0 };
                            return (
                              <React.Fragment key={`val-${row.year}-${c.id}`}>
                                <td className="p-2 text-center font-mono font-bold text-blue-700 bg-blue-50/20 border-r border-slate-200 text-xs">
                                  {classData.male}
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-pink-700 bg-pink-50/20 border-r border-slate-200 text-xs">
                                  {classData.female}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          <td className="p-2 text-center font-mono font-bold text-blue-800 bg-blue-100/40 border-r border-slate-200 text-xs">
                            {row.male}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-pink-800 bg-pink-100/40 border-r border-slate-200 text-xs">
                            {row.female}
                          </td>
                          <td className="p-2 text-center font-mono font-black text-emerald-900 bg-emerald-100/60 text-sm border-r border-slate-200">
                            {row.total}
                          </td>

                          <td className="p-3 text-left border-l border-slate-200">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                row.year === selectedAcademicYear
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {row.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* DATA ALUMNI DAN LULUSAN */}
              {/* Header Stats Alumni */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{alumniStudents.length}</div>
                    <p className="text-xs font-semibold text-slate-500">Total Alumni</p>
                  </div>
                </Card>

                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      {alumniStudents.filter(s => s.gender === 'Laki-laki').length}
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Laki-laki (👨)</p>
                  </div>
                </Card>

                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      {alumniStudents.filter(s => s.gender === 'Perempuan').length}
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Perempuan (👩)</p>
                  </div>
                </Card>

                <Card className="border-0 shadow-lg rounded-2xl bg-white p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{availableGradYears.length}</div>
                    <p className="text-xs font-semibold text-slate-500">Angkatan / Thn Lulus</p>
                  </div>
                </Card>
              </div>

              {/* Alumni Filter Bar */}
              <Card className="border-0 shadow-xl rounded-3xl bg-white p-5 mb-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="relative w-full lg:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input 
                      placeholder="Cari nama alumni, NISN, atau NIK..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-2xl border-slate-200 bg-slate-50/50 text-sm font-medium h-11"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Kategori Alumni:</span>
                    <Button 
                      variant={alumniYearFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setAlumniYearFilter('all')}
                      className={`rounded-xl text-xs font-bold h-9 px-4 ${alumniYearFilter === 'all' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                    >
                      Kolektif (Semua Tahun)
                    </Button>

                    {availableGradYears.map(year => (
                      <Button 
                        key={year}
                        variant={alumniYearFilter === year ? 'default' : 'outline'}
                        onClick={() => setAlumniYearFilter(year)}
                        className={`rounded-xl text-xs font-bold h-9 px-3 ${alumniYearFilter === year ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                      >
                        Thn {year}
                      </Button>
                    ))}

                    <Button
                      onClick={() => {
                        setPrintMode('alumni');
                        setIsPrinting(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl h-9 px-4 shadow-md flex items-center gap-1.5 ml-auto"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak {alumniYearFilter === 'all' ? 'Kolektif' : `Alumni ${alumniYearFilter}`}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Alumni Table Card */}
              <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-white shrink-0">
                      <GraduationCap className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-amber-500/30 text-amber-200 border border-amber-400/30 font-extrabold text-[10px] tracking-wider uppercase">
                          Direktori Lulusan
                        </Badge>
                        <span className="text-xs text-amber-200/80 font-bold">
                          {alumniYearFilter === 'all' ? 'Seluruh Angkatan Lulusan' : `Tahun Kelulusan ${alumniYearFilter}`}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">Daftar Rekapitulasi Alumni</h2>
                    </div>
                  </div>

                  <div className="text-right text-xs text-amber-200/90 font-medium">
                    Terdaftar {filteredAlumni.length} alumni dari {alumniStudents.length} total
                  </div>
                </div>

                <CardContent className="p-6 sm:p-8">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3.5 text-center w-12">No</th>
                          <th className="px-4 py-3.5">Nama Lengkap Alumni</th>
                          <th className="px-4 py-3.5 text-center">NISN / NIK</th>
                          <th className="px-4 py-3.5 text-center">Jenis Kelamin</th>
                          <th className="px-4 py-3.5 text-center">Tahun Lulus</th>
                          <th className="px-4 py-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredAlumni.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="px-4 py-3.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-11 rounded-xl overflow-hidden shrink-0 border-2 flex items-center justify-center font-black text-xs ${s.gender === 'Laki-laki' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'}`}>
                                  {s.photo_url ? (
                                    <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                                  ) : (
                                    s.name.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <span className="text-sm font-black text-slate-900">{s.name}</span>
                                  {s.phone && (
                                    <span className="block text-[11px] font-mono text-slate-500">HP: {s.phone}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-slate-600 text-xs">
                              {s.nisn || s.nik || '-'}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <Badge className={s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-pink-100 text-pink-800 hover:bg-pink-100'}>
                                {s.gender}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs">
                                {s.tahun_lulus || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Award className="w-3.5 h-3.5 text-emerald-600" /> Lulus
                              </span>
                            </td>
                          </tr>
                        ))}

                        {filteredAlumni.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                              <p className="font-bold text-slate-600">Belum Ada Data Alumni</p>
                              <p className="text-xs">Tidak ada data alumni yang cocok dengan filter atau pencarian Anda.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentsList;
