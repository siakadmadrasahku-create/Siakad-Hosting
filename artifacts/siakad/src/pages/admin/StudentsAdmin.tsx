"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Pencil, Trash2, Search, Loader2, Save,
  User, Users, GraduationCap, Filter, Download,
  Printer, ArrowLeft, School, Phone, MapPin, X, RefreshCw, Info, Upload, FileSpreadsheet, FileDown,
  Camera, Image as ImageIcon, AlertTriangle, CheckSquare, Square, Calendar, RotateCcw, Sparkles, FolderArchive, ArrowLeftRight
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { setStudentRombelForYear, getStudentRombelForYear, promoteStudentToYear } from '@/utils/studentRombelHistory';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import * as XLSX from 'xlsx';
import { compressImage } from '@/utils/imageCompression';

interface Student {
  id: string;
  name: string;
  nisn: string;
  nik: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  class_id: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
  phone: string;
  status: 'active' | 'graduated' | 'moved';
  tahun_lulus?: string;
  kebutuhan_khusus: string;
  disabilitas: string;
  nomor_kip_pip: string;
  nama_ayah: string;
  nama_ibu: string;
  nama_wali: string;
  photo_url?: string;
  created_at: string;
}

const DEFAULT_FALLBACK_CLASSES = [
  { id: 'k1', nama_kelas: 'Kelas 1', tingkat: '1' },
  { id: 'k2', nama_kelas: 'Kelas 2', tingkat: '2' },
  { id: 'k3', nama_kelas: 'Kelas 3', tingkat: '3' },
  { id: 'k4', nama_kelas: 'Kelas 4', tingkat: '4' },
  { id: 'k5', nama_kelas: 'Kelas 5', tingkat: '5' },
  { id: 'k6', nama_kelas: 'Kelas 6', tingkat: '6' },
];

const StudentsAdmin = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const studentsKey = getScopedKey('students_list');
  const classesKey = getScopedKey('kelas_list');
  const archivesKey = getScopedKey('academic_archives');
  const rekapOverridesKey = getScopedKey('rekap_overrides');
  const rekapOverridesStorageKey = `siakad_${getScopedKey('rekap_overrides_cache')}`;
  const legacyStudentsKey = 'students_list';
  const legacyClassesKey = 'kelas_list';
  const legacyArchivesKey = 'academic_archives';
  const legacyRekapOverridesKey = 'rekap_overrides';
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [singleStudentToPrint, setSingleStudentToPrint] = useState<Student | null>(null);
  const [printLayout, setPrintLayout] = useState<'landscape_full' | 'portrait_compact'>('landscape_full');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showUnassignedStudents, setShowUnassignedStudents] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'alumni' | 'unassigned' | 'rekapitulasi'>('active');
  const [alumniYearFilter, setAlumniYearFilter] = useState('all');

  // Rekapitulasi Overrides State
  const [academicArchives, setAcademicArchives] = useState<any[]>([]);
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
      const saved = localStorage.getItem(rekapOverridesStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isEditRekapModalOpen, setIsEditRekapModalOpen] = useState(false);
  const [tempRekapForm, setTempRekapForm] = useState<{
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
  }>({});

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(rekapOverridesStorageKey);
        if (saved) setRekapOverrides(JSON.parse(saved));
        else setRekapOverrides({});
      } catch {
        setRekapOverrides({});
      }
    };
    window.addEventListener('rekapitulasi_updated', handleUpdate);
    return () => window.removeEventListener('rekapitulasi_updated', handleUpdate);
  }, [rekapOverridesStorageKey]);

  const isStudentActive = useCallback((s: Student) => {
    if (!s) return false;
    const st = (s.status || '').toLowerCase().trim();
    if (st === 'graduated' || st === 'lulus' || st === 'moved' || st === 'pindah') {
      return false;
    }
    return st === 'active' || st === 'aktif' || !st;
  }, []);

  const isStudentInClass = useCallback((s: Student, classIdOrName: string) => {
    if (!s || !classIdOrName) return false;
    
    const targetClass = classes.find(c => 
      c.id === classIdOrName || 
      c.nama_kelas === classIdOrName || 
      c.nama_kelas?.toLowerCase() === classIdOrName.toLowerCase() ||
      (c.tingkat && (classIdOrName === c.tingkat || classIdOrName === `Kelas ${c.tingkat}` || classIdOrName === `kelas ${c.tingkat}`))
    );

    const sClassRaw = (s.class_id || (s as any).kelas || '').toString().trim();
    if (!sClassRaw) return false;

    const sClassLower = sClassRaw.toLowerCase();
    const classIdLower = classIdOrName.toString().trim().toLowerCase();

    if (sClassLower === classIdLower) return true;

    if (targetClass) {
      const targetId = (targetClass.id || '').toString().trim().toLowerCase();
      const targetName = (targetClass.nama_kelas || '').toString().trim().toLowerCase();
      const targetTingkat = (targetClass.tingkat || '').toString().trim().toLowerCase();

      if (sClassLower === targetId) return true;
      if (sClassLower === targetName) return true;
      if (targetTingkat && (sClassLower === targetTingkat || sClassLower === `kelas ${targetTingkat}`)) return true;

      const normStr = (str: string) => str
        .toLowerCase()
        .replace(/^kelas\s+/i, '')
        .replace(/^rombel\s+/i, '')
        .replace(/^vi$/i, '6')
        .replace(/^v$/i, '5')
        .replace(/^iv$/i, '4')
        .replace(/^iii$/i, '3')
        .replace(/^ii$/i, '2')
        .replace(/^i$/i, '1')
        .trim();

      const normS = normStr(sClassRaw);
      const normName = normStr(targetClass.nama_kelas || '');
      const normTingkat = targetTingkat ? normStr(targetClass.tingkat) : '';

      if (normS && normName && normS === normName) return true;
      if (normS && normTingkat && normS === normTingkat) return true;
    }

    return false;
  }, [classes]);

  const activeStudents = useMemo(() => {
    const normYear = (selectedYear || '').trim();
    const activeYearStr = (settings.tahun_pelajaran?.active_year || '2026/2027').trim();

    // 1. Check if frozen archive snapshot exists for selectedYear ONLY IF selectedYear is NOT activeYearStr
    if (normYear && normYear !== activeYearStr) {
      const matchingArchive = academicArchives.find(a =>
        (a.academic_year || '').toString().trim() === normYear
      );

      if (matchingArchive) {
        const archStudents = matchingArchive.data?.students || matchingArchive.students || [];
        return archStudents.filter((s: any) => isStudentActive(s));
      }
    }

    const parseYearStart = (yStr: string) => {
      const m = yStr.match(/(\d{4})/);
      return m ? parseInt(m[1], 10) : 0;
    };

    const selectedStart = parseYearStart(normYear);

    return students.filter((s: any) => {
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

      return isStudentActive(s);
    });
  }, [selectedYear, settings.tahun_pelajaran?.active_year, academicArchives, students, isStudentActive]);

  const sortedClassesList = useMemo(() => {
    const targetYear = (selectedYear || settings.tahun_pelajaran?.active_year || '2026/2027').trim();
    let yearClasses = classes.filter(c => c.tahun_pelajaran === targetYear);
    if (yearClasses.length === 0) {
      yearClasses = classes.filter(c => !c.tahun_pelajaran);
    }
    if (yearClasses.length === 0) {
      const map = new Map<string, Kelas>();
      classes.forEach(c => {
        const key = (c.tingkat || c.nama_kelas || '').toString().toLowerCase().trim();
        if (!map.has(key)) map.set(key, c);
      });
      yearClasses = Array.from(map.values());
    }
    const source = yearClasses.length > 0 ? yearClasses : DEFAULT_FALLBACK_CLASSES;
    const uniqueMap = new Map<string, Kelas>();
    source.forEach(c => {
      const key = (c.tingkat || c.nama_kelas || '').toString().toLowerCase().trim();
      if (!uniqueMap.has(key)) uniqueMap.set(key, c);
    });
    return Array.from(uniqueMap.values()).sort((a, b) => parseInt(a.tingkat || '0') - parseInt(b.tingkat || '0'));
  }, [classes, selectedYear, settings.tahun_pelajaran?.active_year]);

  const rekapitulasiData = useMemo(() => {
    const classRows = sortedClassesList.map((c) => {
      const classStuds = activeStudents.filter((s) => isStudentInClass(s, c.id));
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

    const unassigned = activeStudents.filter(
      (s) => !sortedClassesList.some((c) => isStudentInClass(s, c.id))
    );

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
        nama_kelas: 'Siswa Tanpa Kelas / Unassigned',
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
  }, [sortedClassesList, activeStudents, rekapOverrides, isStudentInClass]);

  const hasActiveOverride = useMemo(() => {
    const hasClassOverrides = rekapOverrides.classes && Object.keys(rekapOverrides.classes).length > 0;
    const hasThreeYearOverrides = rekapOverrides.threeYears && Object.keys(rekapOverrides.threeYears).length > 0;
    return Boolean(hasClassOverrides || hasThreeYearOverrides);
  }, [rekapOverrides]);

  const threeYearSummary = useMemo(() => {
    const activeYearStr = settings.tahun_pelajaran?.active_year || '2024/2025';
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

      const yearStudents = students.filter((s: any) => {
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
  }, [settings.tahun_pelajaran?.active_year, academicArchives, students, rekapOverrides, sortedClassesList]);

  const handleOpenEditRekap = () => {
    const form: {
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
    } = {
      threeYears: {},
      classes: { ...(rekapOverrides.classes || {}) },
    };

    threeYearSummary.forEach(r => {
      const byClassObj: { [classId: string]: { male: number; female: number } } = {};
      sortedClassesList.forEach(c => {
        byClassObj[c.id] = {
          male: r.byClass[c.id]?.male || 0,
          female: r.byClass[c.id]?.female || 0,
        };
      });

      form.threeYears![r.year] = {
        male: r.male,
        female: r.female,
        label: r.label,
        kelas: r.kelas,
        byClass: byClassObj,
      };
    });

    rekapitulasiData.rows.forEach(r => {
      if (!form.classes![r.class_id]) {
        form.classes![r.class_id] = { male: r.male, female: r.female };
      }
    });

    setTempRekapForm(form);
    setIsEditRekapModalOpen(true);
  };

  const handleSyncFromDatabase = () => {
    const activeYearStr = settings.tahun_pelajaran?.active_year || '2024/2025';
    const newClassesOverride: { [classId: string]: { male: number; female: number } } = {};

    sortedClassesList.forEach(c => {
      const classStuds = activeStudents.filter(
        (s) => s.class_id === c.id || s.class_id === c.nama_kelas || s.class_id?.toLowerCase() === c.nama_kelas?.toLowerCase()
      );
      const m = classStuds.filter((s) => s.gender === 'Laki-laki').length;
      const f = classStuds.filter((s) => s.gender === 'Perempuan').length;
      newClassesOverride[c.id] = { male: m, female: f };
    });

    setTempRekapForm(prev => {
      const updatedThreeYears = { ...(prev.threeYears || {}) };
      if (updatedThreeYears[activeYearStr]) {
        const activeByClass: { [classId: string]: { male: number; female: number } } = {};
        let totalM = 0;
        let totalF = 0;
        sortedClassesList.forEach(c => {
          const counts = newClassesOverride[c.id] || { male: 0, female: 0 };
          activeByClass[c.id] = counts;
          totalM += counts.male;
          totalF += counts.female;
        });
        updatedThreeYears[activeYearStr] = {
          ...updatedThreeYears[activeYearStr],
          male: totalM,
          female: totalF,
          byClass: activeByClass,
        };
      }

      return {
        ...prev,
        classes: newClassesOverride,
        threeYears: updatedThreeYears,
      };
    });

    showSuccess('Berhasil menyinkronkan & mengisi angka rekapitulasi dari data siswa aktif di Rombel!');
  };

  const handleSaveRekap = async () => {
    localStorage.setItem(rekapOverridesStorageKey, JSON.stringify(tempRekapForm));
    setRekapOverrides(tempRekapForm);

    try {
      await supabase.from('site_settings').upsert({
        id: rekapOverridesKey,
        value: tempRekapForm,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Gagal menyimpan rekap_overrides ke database:', e);
    }

    window.dispatchEvent(new Event('rekapitulasi_updated'));
    showSuccess('Data Rekapitulasi & Perkembangan Siswa berhasil diperbarui!');
    setIsEditRekapModalOpen(false);
  };

  const handleResetRekap = async () => {
    localStorage.removeItem(rekapOverridesStorageKey);
    setRekapOverrides({});

    try {
      await supabase.from('site_settings').upsert({
        id: rekapOverridesKey,
        value: {},
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Gagal reset rekap_overrides di database:', e);
    }

    window.dispatchEvent(new Event('rekapitulasi_updated'));
    showSuccess('Data Rekapitulasi dikembalikan ke hitungan otomatis!');
    setIsEditRekapModalOpen(false);
  };
  
  // Hapus Siswa Tanpa Rombel Modal States
  const [isDeleteUnassignedModalOpen, setIsDeleteUnassignedModalOpen] = useState(false);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<string[]>([]);
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');

  // Naik Kelas & Kelulusan Modal States
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [promotionSourceClass, setPromotionSourceClass] = useState('');
  const [promotionAction, setPromotionAction] = useState<'promote' | 'graduate'>('promote');
  const [promotionTargetClass, setPromotionTargetClass] = useState('');
  const [promotionGradYear, setPromotionGradYear] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isProcessingPromotion, setIsProcessingPromotion] = useState(false);

  // Pindah Rombel Massal States
  const [isMassMoveModalOpen, setIsMassMoveModalOpen] = useState(false);
  const [massMoveTargetClass, setMassMoveTargetClass] = useState('');
  const [massMoveStatus, setMassMoveStatus] = useState<'active' | 'graduated' | 'moved' | 'keep'>('keep');
  const [isMovingMass, setIsMovingMass] = useState(false);

  // Kelulusan Massal Siswa Terpilih States
  const [isGraduateModalOpen, setIsGraduateModalOpen] = useState(false);
  const [graduateYear, setGraduateYear] = useState('');
  const [isGraduatingMass, setIsGraduatingMass] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Delete Confirmation State
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    isOpen: boolean;
    targetIds: string[];
    title: string;
    description: string;
  }>({
    isOpen: false,
    targetIds: [],
    title: '',
    description: '',
  });

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 11, show_kop: true, show_signature: true
  };

  const [formData, setFormData] = useState<Omit<Student, 'id' | 'created_at'>>({
    name: '',
    nisn: '',
    nik: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    class_id: '',
    gender: 'Laki-laki',
    address: '',
    phone: '',
    status: 'active',
    kebutuhan_khusus: '',
    disabilitas: '',
    nomor_kip_pip: '',
    nama_ayah: '',
    nama_ibu: '',
    nama_wali: '',
    photo_url: ''
  });

  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = dialogOpen || isSaving || isEditRekapModalOpen || isDeleteUnassignedModalOpen || isMassMoveModalOpen || isGraduateModalOpen || confirmDeleteState.isOpen || editingItem !== null || isProcessingPromotion || isMovingMass || isGraduatingMass;
  }, [dialogOpen, isSaving, isEditRekapModalOpen, isDeleteUnassignedModalOpen, isMassMoveModalOpen, isGraduateModalOpen, confirmDeleteState.isOpen, editingItem, isProcessingPromotion, isMovingMass, isGraduatingMass]);

  useEffect(() => {
    fetchData();

    const handleSync = () => {
      fetchData(true);
    };

    window.addEventListener('students_data_updated', handleSync);
    window.addEventListener('rekapitulasi_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleSync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const subscription = supabase
      .channel('public:site_settings:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload?.new && [studentsKey, classesKey, archivesKey, rekapOverridesKey, legacyStudentsKey, legacyClassesKey, legacyArchivesKey, legacyRekapOverridesKey].includes(payload.new.id)) {
          fetchData(true);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('students_data_updated', handleSync);
      window.removeEventListener('rekapitulasi_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(subscription);
    };
  }, [activeMadrasah.id, studentsKey, classesKey, archivesKey, rekapOverridesKey]);

  const notifyAndSyncStudentData = async (newList: Student[], showToast = false) => {
    const activeStuds = newList.filter(s => s.status === 'active' || s.status === 'aktif');
    const maleActive = activeStuds.filter(s => s.gender === 'Laki-laki').length;
    const femaleActive = activeStuds.filter(s => s.gender === 'Perempuan').length;
    const totalActive = activeStuds.length;

    try {
      const payload = [
        { id: studentsKey, value: newList, updated_at: new Date().toISOString() }
      ];
      if (studentsKey !== legacyStudentsKey) {
        payload.push({ id: legacyStudentsKey, value: newList, updated_at: new Date().toISOString() });
      }

      await supabase
        .from('site_settings')
        .upsert(payload);
    } catch (e) {
      console.warn(`Failed to upsert students:`, e);
    }

    try {
      const cachedStr = localStorage.getItem('siakad_site_settings');
      const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
      settingsObj[studentsKey] = newList;
      if (studentsKey !== legacyStudentsKey) {
        settingsObj[legacyStudentsKey] = newList;
      }
      try { localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj)); } catch (err) { void err; }
      try { localStorage.setItem('students_list', JSON.stringify(newList)); } catch (err) { void err; }
    } catch (err) { void err; }

    window.dispatchEvent(new CustomEvent('students_data_updated', { 
      detail: { 
        students: newList, 
        activeCount: totalActive,
        maleCount: maleActive,
        femaleCount: femaleActive 
      } 
    }));
    window.dispatchEvent(new Event('rekapitulasi_updated'));
    window.dispatchEvent(new Event('storage'));

    if (showToast) {
      showSuccess(`Sync Otomatis Berhasil! Data Siswa Aktif: ${totalActive} orang (${maleActive} L, ${femaleActive} P)`);
    }
  };

  const handleManualSync = async () => {
    setIsSaving(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      const studentData = res?.find(s => s.id === studentsKey)?.value
        || res?.find(s => s.id === legacyStudentsKey)?.value
        || students;
      const currentList = Array.isArray(studentData) ? studentData : students;
      setStudents(currentList);
      await notifyAndSyncStudentData(currentList, true);
    } catch (err) {
      showError('Gagal sinkronisasi data siswa');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (settings.tahun_pelajaran?.active_year) {
      setSelectedYear(settings.tahun_pelajaran.active_year);
      setPromotionGradYear(settings.tahun_pelajaran.active_year);
    } else {
      setPromotionGradYear('2024/2025');
    }
  }, [settings.tahun_pelajaran?.active_year]);

  const fetchData = async (isSilent = false) => {
    if (isEditingRef.current && isSilent) return;
    if (!isSilent) setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      
      let studentData = res?.find(s => s.id === studentsKey)?.value
        || res?.find(s => s.id === legacyStudentsKey)?.value;

      if (!studentData || !Array.isArray(studentData) || studentData.length === 0) {
        try {
          const cachedStr = localStorage.getItem('siakad_site_settings');
          if (cachedStr) {
            const parsedCache = JSON.parse(cachedStr);
            if (parsedCache[studentsKey] && Array.isArray(parsedCache[studentsKey]) && parsedCache[studentsKey].length > 0) {
              studentData = parsedCache[studentsKey];
            } else if (parsedCache[legacyStudentsKey] && Array.isArray(parsedCache[legacyStudentsKey]) && parsedCache[legacyStudentsKey].length > 0) {
              studentData = parsedCache[legacyStudentsKey];
            }
          }
          if (!studentData || !Array.isArray(studentData) || studentData.length === 0) {
            const lsList = localStorage.getItem('students_list');
            if (lsList) {
              const parsedLs = JSON.parse(lsList);
              if (Array.isArray(parsedLs) && parsedLs.length > 0) {
                studentData = parsedLs;
              }
            }
          }
        } catch (e) {
          console.warn('LocalStorage fallback error for students in StudentsAdmin:', e);
        }
      }
      if (!studentData) studentData = [];
      const classData = res?.find(s => s.id === classesKey)?.value
        || res?.find(s => s.id === legacyClassesKey)?.value
        || [];
      const archivesData = res?.find(s => s.id === archivesKey)?.value
        || res?.find(s => s.id === legacyArchivesKey)?.value
        || [];
      const rekapData = res?.find(s => s.id === rekapOverridesKey)?.value
        || res?.find(s => s.id === legacyRekapOverridesKey)?.value;

      if (Array.isArray(archivesData)) {
        setAcademicArchives(archivesData);
      }

      if (!isEditingRef.current) {
        if (Array.isArray(studentData)) {
          setStudents(studentData as Student[]);
        }
        if (Array.isArray(classData)) {
          setClasses(classData as any[]);
        }
        if (rekapData && typeof rekapData === 'object' && Object.keys(rekapData).length > 0) {
          setRekapOverrides(rekapData);
          localStorage.setItem(rekapOverridesStorageKey, JSON.stringify(rekapData));
        } else if (rekapData && typeof rekapData === 'object' && Object.keys(rekapData).length === 0) {
          setRekapOverrides({});
          localStorage.removeItem(rekapOverridesStorageKey);
        }
      }
    } catch (err) {
      if (!isSilent) showError('Gagal memuat data');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Auto-select students when promotion source class changes
  useEffect(() => {
    if (promotionSourceClass) {
      const sourceStudents = students.filter(s => isStudentActive(s) && isStudentInClass(s, promotionSourceClass));
      setSelectedStudentIds(sourceStudents.map(s => String(s.id)));
    } else {
      setSelectedStudentIds([]);
    }
  }, [promotionSourceClass, students, isStudentActive, isStudentInClass]);

  const handleExecutePromotion = async () => {
    if (selectedStudentIds.length === 0) {
      showError('Pilih setidaknya satu siswa untuk diproses!');
      return;
    }

    if (promotionAction === 'promote' && !promotionTargetClass) {
      showError('Pilih kelas tujuan untuk kenaikan kelas!');
      return;
    }

    setIsProcessingPromotion(true);
    try {
      const gradYear = promotionGradYear || settings.tahun_pelajaran?.active_year || selectedYear || '2025/2026';
      const selectedSet = new Set(selectedStudentIds.map(id => String(id)));

      const newList = students.map(s => {
        if (selectedSet.has(String(s.id))) {
          if (promotionAction === 'promote') {
            const targetClassObj = classes.find(c => c.id === promotionTargetClass);
            const targetClassName = targetClassObj?.nama_kelas || '';
            const sourceYear = s.tahun_pelajaran || selectedYear || settings.tahun_pelajaran?.active_year || '2025/2026';
            const activeSysYear = settings.tahun_pelajaran?.active_year || '2025/2026';
            const targetYear = targetClassObj?.tahun_pelajaran || promotionGradYear || activeSysYear || '2026/2027';
            return promoteStudentToYear(
              s,
              sourceYear,
              targetYear,
              targetClassName,
              promotionTargetClass,
              'active',
              targetYear === activeSysYear || targetYear > sourceYear
            ) as Student;
          } else {
            return { ...s, status: 'graduated' as const, tahun_lulus: gradYear, tahun_pelajaran: gradYear, class_id: '', rombel: 'Alumni / Lulus', kelas: 'Alumni / Lulus' };
          }
        }
        return s;
      });

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: studentsKey, value: newList, updated_at: new Date().toISOString() });

      try {
        const cachedStr = localStorage.getItem('siakad_site_settings');
        const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
        settingsObj[studentsKey] = newList;
        localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
      } catch (e) {
        console.warn('Failed to update localStorage cache:', e);
      }

      setStudents(newList);
      await notifyAndSyncStudentData(newList, false);
      if (promotionAction === 'promote') {
        const targetClassName = classes.find(c => c.id === promotionTargetClass)?.nama_kelas || 'Kelas Baru';
        showSuccess(`Berhasil menaikkan ${selectedStudentIds.length} siswa ke ${targetClassName}!`);
      } else {
        showSuccess(`Berhasil meluluskan ${selectedStudentIds.length} siswa ke Data Alumni (${gradYear})!`);
      }

      setPromotionModalOpen(false);
      setSelectedStudentIds([]);
    } catch (err: any) {
      showError('Gagal memproses: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsProcessingPromotion(false);
    }
  };

  // Selection & Mass Move Handlers
  const handleToggleSelectAll = () => {
    const visibleIds = filteredStudents.map(s => String(s.id));
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    const sId = String(id);
    setSelectedStudentIds(prev => 
      prev.includes(sId) ? prev.filter(item => item !== sId) : [...prev, sId]
    );
  };

  const handleOpenMassMoveModal = () => {
    if (selectedStudentIds.length === 0) {
      showError('Pilih minimal satu siswa untuk dipindahkan rombel!');
      return;
    }
    setMassMoveTargetClass(selectedClass && selectedClass !== 'all_classes' ? selectedClass : (classes[0]?.id || ''));
    setMassMoveStatus('keep');
    setIsMassMoveModalOpen(true);
  };

  const handleExecuteMassMove = async () => {
    if (selectedStudentIds.length === 0) {
      showError('Tidak ada siswa yang dipilih!');
      return;
    }
    if (!massMoveTargetClass) {
      showError('Pilih Rombel / Kelas tujuan!');
      return;
    }

    setIsMovingMass(true);
    try {
      const selectedSet = new Set(selectedStudentIds.map(id => String(id)));
      const targetClassObj = classes.find(c => c.id === massMoveTargetClass);
      const isGrad = massMoveStatus === 'graduated';
      const targetClassName = isGrad
        ? 'Alumni (Lulus)'
        : (massMoveTargetClass === 'unassigned'
          ? 'Siswa Tanpa Kelas / Unassigned'
          : (targetClassObj?.nama_kelas || massMoveTargetClass));

      const activeYr = settings.tahun_pelajaran?.active_year || selectedYear || '2025/2026';
      const updatedList = students.map(s => {
        if (selectedSet.has(String(s.id))) {
          if (isGrad) {
            const gYr = s.tahun_lulus || activeYr;
            const gradStudent = {
              ...s,
              status: 'graduated' as const,
              tahun_lulus: gYr,
              tahun_pelajaran: gYr,
              class_id: '',
              kelas: 'Alumni / Lulus',
              rombel: 'Alumni / Lulus',
            };
            return setStudentRombelForYear(gradStudent as any, gYr, 'Alumni / Lulus', '', 'graduated', true) as Student;
          }
          const targetId = massMoveTargetClass === 'unassigned' ? '' : massMoveTargetClass;
          const realClassName = targetClassObj?.nama_kelas || (massMoveTargetClass === 'unassigned' ? '' : massMoveTargetClass);
          const newStatus = targetId === '' 
            ? (massMoveStatus === 'keep' ? (s.status || 'unassigned') : massMoveStatus)
            : (massMoveStatus === 'keep' || massMoveStatus === 'active' || !s.status || s.status === 'unassigned' ? 'active' : massMoveStatus);

          const baseUpdated = {
            ...s,
            class_id: targetId,
            kelas: realClassName,
            rombel: realClassName,
            tingkat_rombel: realClassName,
            status: newStatus as any,
            tahun_pelajaran: s.tahun_pelajaran || activeYr
          };

          return setStudentRombelForYear(
            baseUpdated as any,
            activeYr,
            realClassName,
            targetId,
            newStatus,
            true
          ) as Student;
        }
        return s;
      });

      setStudents(updatedList);
      await notifyAndSyncStudentData(updatedList, false);

      showSuccess(`Berhasil memindahkan ${selectedStudentIds.length} siswa ke ${targetClassName}!`);
      setSelectedStudentIds([]);
      setIsMassMoveModalOpen(false);
    } catch (err: any) {
      showError('Gagal memindahkan rombel: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsMovingMass(false);
    }
  };

  const handleOpenGraduateModal = () => {
    if (selectedStudentIds.length === 0) {
      showError('Pilih minimal satu siswa untuk diluluskan!');
      return;
    }
    setGraduateYear(settings.tahun_pelajaran?.active_year || selectedYear || '2025/2026');
    setIsGraduateModalOpen(true);
  };

  const handleExecuteMassGraduate = async () => {
    if (selectedStudentIds.length === 0) {
      showError('Tidak ada siswa yang dipilih!');
      return;
    }
    if (!graduateYear || !graduateYear.trim()) {
      showError('Masukkan tahun kelulusan / angkatan alumni!');
      return;
    }

    setIsGraduatingMass(true);
    try {
      const selectedSet = new Set(selectedStudentIds.map(id => String(id)));
      const yr = graduateYear.trim();

      const updatedList = students.map(s => {
        if (selectedSet.has(String(s.id))) {
          return {
            ...s,
            status: 'graduated' as const,
            tahun_lulus: yr,
            tahun_pelajaran: yr,
            class_id: '',
            kelas: 'Alumni / Lulus',
            rombel: 'Alumni / Lulus',
          };
        }
        return s;
      });

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: studentsKey, value: updatedList, updated_at: new Date().toISOString() });

      if (error) throw error;

      try {
        const cachedStr = localStorage.getItem('siakad_site_settings');
        const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
        settingsObj[studentsKey] = updatedList;
        localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
      } catch (e) {
        console.warn('Failed to update localStorage cache:', e);
      }

      setStudents(updatedList);
      await notifyAndSyncStudentData(updatedList, false);

      showSuccess(`Berhasil meluluskan ${selectedStudentIds.length} siswa ke Data Alumni (${yr})!`);
      setSelectedStudentIds([]);
      setIsGraduateModalOpen(false);
    } catch (err: any) {
      showError('Gagal memproses kelulusan: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsGraduatingMass(false);
    }
  };

  const handleRestoreStudent = async (studentId: string, targetClassId: string) => {
    try {
      const newList = students.map(s => s.id === studentId ? { ...s, status: 'active' as const, class_id: targetClassId } : s);
      await supabase.from('site_settings').upsert({ id: studentsKey, value: newList, updated_at: new Date().toISOString() });
      try {
        const cachedStr = localStorage.getItem('siakad_site_settings');
        const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
        settingsObj[studentsKey] = newList;
        localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
      } catch (e) {
        console.warn('Failed to update localStorage cache:', e);
      }
      setStudents(newList);
      await notifyAndSyncStudentData(newList, false);
      showSuccess('Siswa berhasil dikembalikan ke status Aktif!');
    } catch (e) {
      showError('Gagal mengembalikan data siswa');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      // 1. Compress image
      const compressed = await compressImage(file, { maxWidth: 300, quality: 0.7 });
      
      // 2. Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, photo_url: base64String }));
        setIsUploadingPhoto(false);
        showSuccess('Foto berhasil diproses');
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      showError('Gagal memproses foto');
      setIsUploadingPhoto(false);
    }
  };
  const handleSave = async () => {
    if (!formData.name) {
      showError('Nama wajib diisi!');
      return;
    }

    // Only require class_id if not editing an unassigned student
    if (!editingItem && !showUnassignedStudents && !formData.class_id) {
      showError('Kelas wajib diisi untuk siswa baru!');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = { ...formData };
      if (dataToSave.status === 'graduated') {
        if (!dataToSave.tahun_lulus) {
          dataToSave.tahun_lulus = settings.tahun_pelajaran?.active_year || selectedYear || '2024/2025';
        }
        dataToSave.class_id = '';
      }

      const targetClassObj = classes.find(c => c.id === dataToSave.class_id || c.nama_kelas === dataToSave.class_id || c.nama_kelas?.toLowerCase() === dataToSave.class_id?.toLowerCase());

      let newList: Student[];
      if (editingItem) {
        newList = students.map(s => s.id === editingItem.id ? { 
          ...dataToSave, 
          tingkat_rombel: targetClassObj?.nama_kelas || dataToSave.tingkat_rombel || (s as any).tingkat_rombel || '',
          kelas: targetClassObj?.nama_kelas || dataToSave.kelas || (s as any).kelas || '',
          rombel: targetClassObj?.nama_kelas || dataToSave.rombel || (s as any).rombel || '',
          tahun_pelajaran: dataToSave.tahun_pelajaran || targetClassObj?.tahun_pelajaran || settings.tahun_pelajaran?.active_year || selectedYear || '2024/2025',
          id: s.id, 
          created_at: s.created_at 
        } : s);
      } else {
        const newItem: Student = { 
          ...dataToSave, 
          tingkat_rombel: targetClassObj?.nama_kelas || dataToSave.tingkat_rombel || '',
          kelas: targetClassObj?.nama_kelas || dataToSave.kelas || '',
          rombel: targetClassObj?.nama_kelas || dataToSave.rombel || '',
          tahun_pelajaran: dataToSave.tahun_pelajaran || targetClassObj?.tahun_pelajaran || settings.tahun_pelajaran?.active_year || selectedYear || '2024/2025',
          id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, 
          created_at: new Date().toISOString() 
        } as Student;
        newList = [newItem, ...students];
      }

      setStudents(newList);
      await notifyAndSyncStudentData(newList, true);
      showSuccess(editingItem ? 'Data siswa berhasil diperbarui' : 'Data siswa baru berhasil ditambahkan');
      setDialogOpen(false);
    } catch (err) {
      console.error('Error saving student:', err);
      showError('Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditStudent = (s: Student) => {
    setEditingItem(s);
    const targetClass = classes.find(c => c.id === s.class_id || c.nama_kelas === s.class_id || c.nama_kelas?.toLowerCase() === s.class_id?.toLowerCase());
    const resolvedClassId = targetClass ? targetClass.id : (s.class_id || '');
    const st = (s.status || '').toLowerCase().trim();
    const resolvedStatus = (st === 'graduated' || st === 'lulus') ? 'graduated' : ((st === 'moved' || st === 'pindah') ? 'moved' : 'active');
    setFormData({
      ...s,
      class_id: resolvedClassId,
      status: resolvedStatus,
      tahun_lulus: s.tahun_lulus || settings.tahun_pelajaran?.active_year || selectedYear || '2025/2026'
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, name?: string) => {
    const student = students.find(s => String(s.id) === String(id));
    const studentName = name || student?.name || 'Siswa';
    setConfirmDeleteState({
      isOpen: true,
      targetIds: [String(id)],
      title: `Hapus Data Siswa: ${studentName}`,
      description: `Apakah Anda yakin ingin MENGHAPUS PERMANEN data siswa "${studentName}"? Tindakan ini tidak dapat dibatalkan.`
    });
  };

  const unassignedStudents = useMemo(() => {
    return students.filter(s => {
      const st = (s.status || '').toLowerCase().trim();
      if (st === 'graduated' || st === 'lulus' || st === 'moved' || st === 'pindah') return false;
      const noClass = !s.class_id || s.class_id === '' || s.class_id === 'tanpa_kelas' || s.class_id === '-';
      const validClass = classes.some(c => c.id === s.class_id || c.nama_kelas === s.class_id || c.nama_kelas?.toLowerCase() === s.class_id?.toLowerCase());
      return noClass || !validClass;
    });
  }, [students, classes]);

  const openDeleteUnassignedModal = () => {
    if (unassignedStudents.length === 0) {
      showError('Tidak ada siswa tanpa rombel (bukan alumni) yang dapat dihapus.');
      return;
    }
    setSelectedUnassignedIds(unassignedStudents.map(s => String(s.id)));
    setUnassignedSearchQuery('');
    setIsDeleteUnassignedModalOpen(true);
  };

  const promptDeleteUnassignedSelected = () => {
    if (selectedUnassignedIds.length === 0) {
      showError('Pilih minimal 1 siswa tanpa rombel yang ingin dihapus.');
      return;
    }
    setConfirmDeleteState({
      isOpen: true,
      targetIds: selectedUnassignedIds,
      title: `Hapus ${selectedUnassignedIds.length} Siswa Tanpa Rombel Terpilih`,
      description: `Apakah Anda yakin ingin MENGHAPUS PERMANEN ${selectedUnassignedIds.length} data siswa tanpa rombel yang terpilih? Tindakan ini tidak dapat dibatalkan.`
    });
  };

  const promptDeleteUnassignedAll = () => {
    if (unassignedStudents.length === 0) {
      showError('Tidak ada siswa tanpa rombel yang dapat dihapus.');
      return;
    }
    const allIds = unassignedStudents.map(s => String(s.id));
    setConfirmDeleteState({
      isOpen: true,
      targetIds: allIds,
      title: `Hapus SEMUA (${unassignedStudents.length}) Siswa Tanpa Rombel`,
      description: `Apakah Anda yakin ingin MENGHAPUS PERMANEN SEMUA (${unassignedStudents.length}) data siswa tanpa rombel (bukan alumni)? Tindakan ini tidak dapat dibatalkan.`
    });
  };

  const executeDeleteStudents = async () => {
    const targetIds = confirmDeleteState.targetIds;
    if (!targetIds || targetIds.length === 0) return;

    setIsSaving(true);
    try {
      const deleteSet = new Set(targetIds.map(id => String(id)));
      const newList = students.filter(s => !deleteSet.has(String(s.id)));

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: studentsKey, value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;

      try {
        const cachedStr = localStorage.getItem('siakad_site_settings');
        const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
        settingsObj[studentsKey] = newList;
        localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
      } catch (e) {
        console.warn('Failed to update localStorage cache:', e);
      }

      setStudents(newList);
      await notifyAndSyncStudentData(newList, false);
      setSelectedUnassignedIds(prev => prev.filter(id => !deleteSet.has(id)));
      setConfirmDeleteState(prev => ({ ...prev, isOpen: false }));

      const remainingUnassigned = newList.filter(s => {
        if (s.status === 'graduated') return false;
        const noClass = !s.class_id || s.class_id === '' || s.class_id === 'tanpa_kelas' || s.class_id === '-';
        const validClass = classes.some(c => c.id === s.class_id || c.nama_kelas === s.class_id || c.nama_kelas?.toLowerCase() === s.class_id?.toLowerCase());
        return noClass || !validClass;
      });

      if (remainingUnassigned.length === 0) {
        setIsDeleteUnassignedModalOpen(false);
      }

      showSuccess(`Berhasil menghapus ${targetIds.length} data siswa!`);
    } catch (err: any) {
      showError('Gagal menghapus: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const downloadTemplate = () => {
    const headers = [
      ["No", "Nama Siswa", "NISN", "NIK", "Tempat Lahir", "Tanggal Lahir", "Tingkat - Rombel", "Umur", "Status", "Jenis Kelamin", "Alamat", "No Telepon", "Kebutuhan Khusus", "Disabilitas", "No KIP/PIP", "Nama Ayah Kandung", "Nama Ibu Kandung", "Nama Wali"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 1. Try Object-based Sheet Parsing (Flexible Header Names)
        const objectRows = XLSX.utils.sheet_to_json(worksheet) as any[];
        // 2. Try Array-based Sheet Parsing (Fallback for Headerless / Fixed Column Files)
        const arrayRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (objectRows.length === 0 && arrayRows.length <= 1) {
          showError('File Excel kosong atau tidak berisi data valid');
          return;
        }

        const normStr = (str: string) => (str || '')
          .toString()
          .toLowerCase()
          .replace(/^kelas\s+/i, '')
          .replace(/^rombel\s+/i, '')
          .replace(/^tingkat\s+/i, '')
          .replace(/\bvi\b/gi, '6')
          .replace(/\bv\b/gi, '5')
          .replace(/\biv\b/gi, '4')
          .replace(/\biii\b/gi, '3')
          .replace(/\bii\b/gi, '2')
          .replace(/\bi\b/gi, '1')
          .replace(/[^a-z0-9]/g, '')
          .trim();

        const currentClassesList = [...classes];
        const newlyCreatedClasses: Class[] = [];

        const getOrMatchClassId = (rombelStr: string): string => {
          if (!rombelStr || !rombelStr.trim()) {
            if (selectedClass && selectedClass !== 'all_classes') {
              return selectedClass;
            }
            return '';
          }

          const raw = rombelStr.trim();
          const rawLower = raw.toLowerCase();

          // 1. Direct match on class ID, nama_kelas, or "tingkat - nama_kelas"
          for (const c of currentClassesList) {
            if (!c) continue;
            const cId = (c.id || '').trim().toLowerCase();
            const cName = (c.nama_kelas || '').trim().toLowerCase();
            const cTingkat = (c.tingkat || '').trim().toLowerCase();

            if (
              cId === rawLower ||
              cName === rawLower ||
              `${cTingkat} - ${cName}` === rawLower ||
              `${cTingkat} ${cName}` === rawLower
            ) {
              return c.id;
            }
          }

          const cleanRombel = normStr(rombelStr);

          // 2. Normalized match against existing classes
          if (cleanRombel) {
            for (const c of currentClassesList) {
              if (!c) continue;
              const cleanCName = normStr(c.nama_kelas);
              const cleanCFull = normStr(`${c.tingkat}${c.nama_kelas}`);
              const cleanTingkat = normStr(c.tingkat || '');

              if (
                cleanRombel === cleanCName ||
                cleanRombel === cleanCFull ||
                (cleanTingkat && cleanRombel === cleanTingkat)
              ) {
                return c.id;
              }
            }

            // 3. Substring matching (e.g. "1A" in "Kelas 1A")
            for (const c of currentClassesList) {
              if (!c) continue;
              const cleanCName = normStr(c.nama_kelas);
              if (cleanRombel.length > 0 && cleanCName.length > 0) {
                if (cleanRombel === cleanCName || cleanCName.includes(cleanRombel) || cleanRombel.includes(cleanCName)) {
                  return c.id;
                }
              }
            }
          }

          // 4. Auto-create new Rombel if Excel contains a rombel name that isn't in system yet
          if (raw) {
            const levelMatch = raw.match(/([1-6]|I{1,3}|IV|V|VI)/i);
            let tingkat = '1';
            if (levelMatch) {
              const m = levelMatch[1].toUpperCase();
              const rMap: Record<string, string> = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6' };
              tingkat = rMap[m] || m;
            }

            const formattedName = raw.toLowerCase().startsWith('kelas') ? raw : `Kelas ${raw}`;
            const newClassId = `k_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newClassObj: Class = {
              id: newClassId,
              nama_kelas: formattedName,
              tingkat: tingkat,
              kapasitas: 30,
              wali_kelas: '',
              created_at: new Date().toISOString()
            };

            currentClassesList.push(newClassObj);
            newlyCreatedClasses.push(newClassObj);
            return newClassId;
          }

          if (selectedClass && selectedClass !== 'all_classes') {
            return selectedClass;
          }

          return '';
        };

        const currentStudentsList = [...students];
        const timestamp = Date.now();
        let insertedCount = 0;
        let skippedCount = 0;
        const processedStudents: Student[] = [];

        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          showError('File Excel kosong atau format tidak sesuai!');
          setUploadingExcel(false);
          return;
        }

        // Helper to format numeric strings (like NISN / NIK) without scientific notation
        const cleanNumberStr = (val: any): string => {
          if (val === undefined || val === null) return '';
          if (typeof val === 'number') {
            return val.toLocaleString('fullwide', { useGrouping: false });
          }
          return val.toString().trim();
        };

        // Helper to format date cells (e.g. XLSX date numbers or strings)
        const cleanDateStr = (val: any): string => {
          if (!val) return '';
          if (typeof val === 'number' && val > 10000 && val < 60000) {
            const dateObj = new Date((val - (25567 + 2)) * 86400 * 1000);
            if (!isNaN(dateObj.getTime())) {
              const yyyy = dateObj.getFullYear();
              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
              const dd = String(dateObj.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            }
          }
          return val.toString().trim();
        };

        // Scan first 25 rows to detect header row
        let headerRowIndex = -1;
        let bestScore = -1;

        for (let r = 0; r < Math.min(25, rawRows.length); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;

          let score = 0;
          row.forEach(cell => {
            if (!cell) return;
            const cStr = cell.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (['nama', 'namasiswa', 'namalengkap', 'pesertadidik', 'siswa', 'student', 'santri'].some(k => cStr.includes(k))) score += 5;
            if (cStr.includes('nisn')) score += 4;
            if (cStr.includes('nik')) score += 3;
            if (cStr.includes('rombel') || cStr.includes('kelas') || cStr.includes('tingkat')) score += 3;
            if (cStr.includes('jk') || cStr.includes('lp') || cStr.includes('kelamin') || cStr.includes('gender')) score += 2;
            if (cStr.includes('tempat') || cStr.includes('tgl') || cStr.includes('lahir')) score += 2;
          });

          if (score > bestScore && score >= 3) {
            bestScore = score;
            headerRowIndex = r;
          }
        }

        // Column map mapping field name -> column index
        const colMap: Record<string, number> = {};

        if (headerRowIndex !== -1) {
          const headerRow = rawRows[headerRowIndex];
          headerRow.forEach((cVal: any, cIdx: number) => {
            if (!cVal) return;
            const cv = cVal.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

            if (
              (cv.includes('nama') || cv.includes('siswa') || cv.includes('santri') || cv.includes('peserta') || cv.includes('pd') || cv.includes('student')) &&
              !cv.includes('ayah') && !cv.includes('ibu') && !cv.includes('wali') && !cv.includes('guru') && !cv.includes('sekolah') && !cv.includes('madrasah') && !cv.includes('lembaga')
            ) {
              if (colMap.name === undefined || cv.includes('siswa') || cv.includes('lengkap') || cv.includes('peserta') || cv.includes('pd') || cv.includes('santri')) {
                colMap.name = cIdx;
              }
            } else if (cv.includes('nisn')) {
              colMap.nisn = cIdx;
            } else if (cv.includes('nik')) {
              colMap.nik = cIdx;
            } else if (cv.includes('tempat') || cv.includes('tmpt') || cv.includes('tpt')) {
              colMap.tempat_lahir = cIdx;
            } else if (cv.includes('tgl') || cv.includes('tanggal') || cv.includes('tgllhr') || (cv.includes('lahir') && !cv.includes('tempat'))) {
              colMap.tanggal_lahir = cIdx;
            } else if (cv.includes('rombel') || cv.includes('kelas') || cv.includes('tingkat') || cv.includes('rombongan') || cv.includes('subkelas')) {
              colMap.tingkat_rombel = cIdx;
            } else if (cv.includes('umur') || cv.includes('usia')) {
              colMap.umur = cIdx;
            } else if (cv.includes('status') || cv.includes('keberadaan')) {
              colMap.status = cIdx;
            } else if (cv.includes('jk') || cv.includes('lp') || cv.includes('kelamin') || cv.includes('gender')) {
              colMap.gender = cIdx;
            } else if (cv.includes('alamat') || cv.includes('domisili') || cv.includes('address')) {
              colMap.alamat = cIdx;
            } else if (cv.includes('hp') || cv.includes('telepon') || cv.includes('phone') || cv.includes('wa') || cv.includes('nohp') || cv.includes('notelp')) {
              colMap.phone = cIdx;
            } else if (cv.includes('kebutuhan')) {
              colMap.kebutuhan_khusus = cIdx;
            } else if (cv.includes('disabilitas')) {
              colMap.disabilitas = cIdx;
            } else if (cv.includes('kip') || cv.includes('pip')) {
              colMap.nomor_kip_pip = cIdx;
            } else if (cv.includes('ayah')) {
              colMap.nama_ayah = cIdx;
            } else if (cv.includes('ibu')) {
              colMap.nama_ibu = cIdx;
            } else if (cv.includes('wali')) {
              colMap.nama_wali = cIdx;
            }
          });
        }

        const getCol = (field: string, fallbackIdx: number, row: any[]) => {
          const idx = colMap[field] !== undefined ? colMap[field] : fallbackIdx;
          if (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) {
            return row[idx];
          }
          return '';
        };

        const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

        for (let r = startRow; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          const rawName = getCol('name', colMap.name !== undefined ? colMap.name : (colMap.nisn === 1 || colMap.nik === 1 ? 2 : 1), row);
          let nameStr = cleanNumberStr(rawName);

          if (!nameStr) continue;

          const lowerName = nameStr.toLowerCase();
          if (
            lowerName.includes('nama siswa') || 
            lowerName.includes('daftar siswa') || 
            lowerName.includes('peserta didik') ||
            lowerName.includes('kementerian') || 
            lowerName.includes('madrasah') || 
            lowerName.includes('rekapitulasi') ||
            lowerName.includes('jumlah') || 
            lowerName.includes('total') || 
            lowerName.includes('halaman') ||
            lowerName === 'nama' ||
            lowerName === 'no' ||
            lowerName === 'no.'
          ) {
            continue;
          }

          if (/^\d+$/.test(nameStr) && nameStr.length < 4) {
            const nextColVal = cleanNumberStr(row[(colMap.name !== undefined ? colMap.name : 1) + 1]);
            if (nextColVal && !/^\d+$/.test(nextColVal)) {
              nameStr = nextColVal;
            } else {
              continue;
            }
          }

          const nisn = cleanNumberStr(getCol('nisn', 2, row));
          const nik = cleanNumberStr(getCol('nik', 3, row));
          const tempat_lahir = cleanNumberStr(getCol('tempat_lahir', 4, row));
          const tanggal_lahir = cleanDateStr(getCol('tanggal_lahir', 5, row));
          const tingkat_rombel = cleanNumberStr(getCol('tingkat_rombel', 6, row));
          const statusRaw = cleanNumberStr(getCol('status', 8, row));
          const genderRaw = cleanNumberStr(getCol('gender', 9, row));
          const address = cleanNumberStr(getCol('alamat', 10, row));
          const phone = cleanNumberStr(getCol('phone', 11, row));
          const kebutuhan_khusus = cleanNumberStr(getCol('kebutuhan_khusus', 12, row));
          const disabilitas = cleanNumberStr(getCol('disabilitas', 13, row));
          const nomor_kip_pip = cleanNumberStr(getCol('nomor_kip_pip', 14, row));
          const nama_ayah = cleanNumberStr(getCol('nama_ayah', 15, row));
          const nama_ibu = cleanNumberStr(getCol('nama_ibu', 16, row));
          const nama_wali = cleanNumberStr(getCol('nama_wali', 17, row));

          const matchedClassIdFromExcel = getOrMatchClassId(tingkat_rombel);
          const finalClassId = matchedClassIdFromExcel || (selectedClass && selectedClass !== 'all_classes' ? selectedClass : '');
          const matchedClass = currentClassesList.find(c => c.id === finalClassId);
          const matchedClassName = matchedClass ? matchedClass.nama_kelas : (tingkat_rombel || '');

          const resolvedGender: 'Laki-laki' | 'Perempuan' =
            (genderRaw && (genderRaw.toLowerCase().startsWith('p') || genderRaw.toLowerCase().includes('perempuan') || genderRaw.toLowerCase() === 'female' || genderRaw === '2'))
              ? 'Perempuan' : 'Laki-laki';

          let resolvedStatus: 'active' | 'graduated' | 'moved' = 'active';
          if (statusRaw) {
            const stLower = statusRaw.toLowerCase();
            if (stLower.includes('lulus') || stLower === 'graduated') resolvedStatus = 'graduated';
            else if (stLower.includes('pindah') || stLower.includes('keluar') || stLower === 'moved') resolvedStatus = 'moved';
          }

          const existingIndex = currentStudentsList.findIndex(s => {
            if (nisn && s.nisn && s.nisn.trim().toLowerCase() === nisn.toLowerCase()) return true;
            if (nik && s.nik && s.nik.trim().toLowerCase() === nik.toLowerCase()) return true;
            if (nameStr && s.name && s.name.trim().toLowerCase() === nameStr.toLowerCase()) {
              if (tanggal_lahir && s.tanggal_lahir && s.tanggal_lahir !== '2016-01-01' && tanggal_lahir !== '2016-01-01') {
                return s.tanggal_lahir === tanggal_lahir;
              }
              return true;
            }
            return false;
          });

          if (existingIndex !== -1) {
            skippedCount++;
            // JANGAN DITIMPA JIKA SISWA SUDAH ADA
          } else {
            const targetClassObj = currentClassesList.find(c => c.id === finalClassId);
            const classNameToSet = targetClassObj ? targetClassObj.nama_kelas : (matchedClassName || '');

            const newStudent: Student = {
              id: `imp-${timestamp}-${r}`,
              name: nameStr,
              nisn: nisn || '',
              nik: nik || '',
              tempat_lahir: tempat_lahir || '',
              tanggal_lahir: tanggal_lahir || '',
              class_id: finalClassId,
              tingkat_rombel: classNameToSet,
              kelas: classNameToSet,
              rombel: classNameToSet,
              gender: resolvedGender,
              address: address || '',
              phone: phone || '',
              status: statusRaw ? resolvedStatus : 'active',
              kebutuhan_khusus: kebutuhan_khusus || '',
              disabilitas: disabilitas || '',
              nomor_kip_pip: nomor_kip_pip || '',
              nama_ayah: nama_ayah || '',
              nama_ibu: nama_ibu || '',
              nama_wali: nama_wali || '',
              created_at: new Date().toISOString()
            };
            currentStudentsList.push(newStudent);
            processedStudents.push(newStudent);
            insertedCount++;
          }
        }

        // Save newly created classes if auto-created
        if (newlyCreatedClasses.length > 0) {
          setClasses(currentClassesList);
          try {
            await supabase.from('site_settings').upsert({
              id: kelasKey,
              value: currentClassesList,
              updated_at: new Date().toISOString()
            });
            const cachedStr = localStorage.getItem('siakad_site_settings');
            const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
            settingsObj[kelasKey] = currentClassesList;
            localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
            localStorage.setItem('kelas_list', JSON.stringify(currentClassesList));
          } catch (err) {
            console.warn('Failed to save newly created classes:', err);
          }
        }

        if (processedStudents.length > 0) {
          const newList = [...currentStudentsList];
          
          const { error } = await supabase
            .from('site_settings')
            .upsert({
              id: studentsKey,
              value: newList,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.warn('Supabase upsert warning for students:', error.message);
          }

          try {
            const cachedStr = localStorage.getItem('siakad_site_settings');
            const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
            settingsObj[studentsKey] = newList;
            localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
            localStorage.setItem('students_list', JSON.stringify(newList));
          } catch (e) {
            console.warn('Failed to update localStorage cache:', e);
          }
          
          setStudents(newList);
          await notifyAndSyncStudentData(newList, true);

          let message = `${insertedCount} siswa baru berhasil ditambahkan.`;
          if (skippedCount > 0) {
            message += ` (${skippedCount} siswa sudah ada & tidak ditimpa).`;
          }
          if (newlyCreatedClasses.length > 0) {
            message += ` Auto-membuat ${newlyCreatedClasses.length} Rombel/Kelas baru (${newlyCreatedClasses.map(c => c.nama_kelas).join(', ')}).`;
          }
          showSuccess(message);
          setImportModalOpen(false);
          
          const unmatchedStudents = processedStudents.filter(s => !s.class_id);
          if (unmatchedStudents.length > 0 && importRombelOption === 'auto') {
            const unmatchedNames = unmatchedStudents.map(s => s.name).slice(0, 5).join(', ');
            showError(`${unmatchedStudents.length} siswa ditempatkan di "Siswa Tanpa Rombel" karena nama kelas di Excel tidak cocok (${unmatchedNames}...). Anda dapat memindahkan siswa ini ke kelas yang sesuai kapan saja.`);
          }
        } else {
          showError('Tidak ada data siswa valid yang berhasil dibaca dari file Excel.');
        }
      } catch (err: any) {
        console.error(err);
        showError('Gagal memproses file: ' + (err.message || 'Format file salah'));
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredStudents = useMemo(() => {
    if (viewMode === 'alumni') {
      return students.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.nisn && s.nisn.includes(searchQuery)) ||
                            (s.nik && s.nik.includes(searchQuery));
        const st = (s.status || '').toLowerCase().trim();
        const matchGrad = st === 'graduated' || st === 'lulus';
        const matchYear = alumniYearFilter === 'all' || s.tahun_lulus === alumniYearFilter;
        return matchSearch && matchGrad && matchYear;
      });
    } else if (viewMode === 'unassigned' || showUnassignedStudents) {
      return unassignedStudents.filter(s => {
        const query = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(query) ||
               (s.nisn && s.nisn.includes(query)) ||
               (s.nik && s.nik.includes(query));
      });
    } else if (!selectedClass) {
      return [];
    } else {
      return activeStudents.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.nisn && s.nisn.includes(searchQuery)) ||
                            (s.nik && s.nik.includes(searchQuery));
        const selectedClassObj = classes.find(c => c.id === selectedClass);
        const matchClass = selectedClass === 'all_classes' || 
                           s.class_id === selectedClass ||
                           (selectedClassObj && s.class_id === selectedClassObj.nama_kelas) ||
                           (selectedClassObj && s.class_id?.toLowerCase() === selectedClassObj.nama_kelas?.toLowerCase());
        return matchSearch && matchClass;
      });
    }
  }, [students, activeStudents, classes, searchQuery, selectedClass, showUnassignedStudents, viewMode, alumniYearFilter, unassignedStudents]);

  const availableGradYears = useMemo(() => {
    const years = new Set<string>();
    students.forEach(s => {
      const st = (s.status || '').toLowerCase().trim();
      if ((st === 'graduated' || st === 'lulus') && s.tahun_lulus) {
        years.add(s.tahun_lulus);
      }
    });
    if (settings.tahun_pelajaran?.available_years) {
      settings.tahun_pelajaran.available_years.forEach((y: string) => years.add(y));
    }
    return Array.from(years);
  }, [students, settings.tahun_pelajaran]);

  const alumniStats = useMemo(() => {
    const alumniList = students.filter(s => {
      const st = (s.status || '').toLowerCase().trim();
      return st === 'graduated' || st === 'lulus';
    });
    return {
      total: alumniList.length,
      male: alumniList.filter(s => s.gender === 'Laki-laki' || s.gender === 'L').length,
      female: alumniList.filter(s => s.gender === 'Perempuan' || s.gender === 'P').length,
    };
  }, [students]);

  const getClassName = (id: string) => {
    return classes.find(c => c.id === id)?.nama_kelas || 'Tanpa Kelas';
  };

  if (isPrinting) {
    if (viewMode === 'rekapitulasi') {
      return (
        <div className="min-h-screen bg-white p-0">
          <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
            <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Mode Dokumen Resmi: Rekapitulasi Jumlah Siswa
              </span>
              <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-bold shadow-lg">
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
            {printConfig.show_kop && <KopSurat />}
            <div className="text-center my-6">
              <h2 className="text-xl font-bold underline uppercase">REKAPITULASI JUMLAH SISWA PER TAHUN PELAJARAN</h2>
              <p className="mt-1 text-sm font-bold">TAHUN PELAJARAN {settings.tahun_pelajaran?.active_year || '2024/2025'}</p>
            </div>

            <div className="mb-4">
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
              <table className="w-full border-collapse border border-black text-center text-[9pt] font-serif">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b border-black">
                    <th rowSpan={3} className="border border-black p-2 w-8 align-middle">NO</th>
                    <th rowSpan={3} className="border border-black p-2 text-center align-middle min-w-[90px]">TAHUN PELAJARAN</th>
                    <th colSpan={sortedClassesList.length * 2 + 3} className="border border-black p-1.5 uppercase font-black text-center bg-gray-200">
                      JUMLAH SISWA
                    </th>
                    <th rowSpan={3} className="border border-black p-2 text-left align-middle min-w-[110px]">KETERANGAN</th>
                  </tr>

                  <tr className="bg-gray-100 font-bold border-b border-black">
                    {sortedClassesList.map((c) => (
                      <th key={c.id} colSpan={2} className="border border-black p-1 text-center font-bold">
                        {c.nama_kelas}
                      </th>
                    ))}
                    <th colSpan={3} className="border border-black p-1 text-center font-black bg-gray-200">
                      TOTAL KESELURUHAN
                    </th>
                  </tr>

                  <tr className="bg-gray-50 font-bold border-b border-black text-[8.5pt]">
                    {sortedClassesList.map((c) => (
                      <React.Fragment key={`p-sub-${c.id}`}>
                        <th className="border border-black p-1 w-7 font-mono">L</th>
                        <th className="border border-black p-1 w-7 font-mono">P</th>
                      </React.Fragment>
                    ))}
                    <th className="border border-black p-1 w-9 font-mono font-bold bg-gray-100">L</th>
                    <th className="border border-black p-1 w-9 font-mono font-bold bg-gray-100">P</th>
                    <th className="border border-black p-1 w-11 font-mono font-black bg-gray-200">JML</th>
                  </tr>
                </thead>

                <tbody>
                  {threeYearSummary.map((row, idx) => (
                    <tr
                      key={row.year}
                      className={`text-center border-b border-black ${
                        row.year === (settings.tahun_pelajaran?.active_year || '2024/2025')
                          ? 'font-bold bg-gray-50'
                          : ''
                      }`}
                    >
                      <td className="border border-black p-1.5 font-bold">{idx + 1}</td>
                      <td className="border border-black p-1.5 font-mono font-bold">{row.year}</td>

                      {sortedClassesList.map((c) => {
                        const classData = row.byClass[c.id] || { male: 0, female: 0 };
                        return (
                          <React.Fragment key={`p-val-${row.year}-${c.id}`}>
                            <td className="border border-black p-1 font-mono">{classData.male}</td>
                            <td className="border border-black p-1 font-mono">{classData.female}</td>
                          </React.Fragment>
                        );
                      })}

                      <td className="border border-black p-1 font-mono font-bold">{row.male}</td>
                      <td className="border border-black p-1 font-mono font-bold">{row.female}</td>
                      <td className="border border-black p-1 font-mono font-black text-sm bg-gray-100">{row.total}</td>

                      <td className="border border-black p-1.5 text-left text-[8.5pt]">{row.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              {printConfig.show_signature && <PenandatanganDokumen showGuru={false} />}
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
        </div>
      );
    }

    const activeClassName = showUnassignedStudents 
      ? 'Siswa Tanpa Kelas' 
      : selectedClass 
      ? getClassName(selectedClass) 
      : 'Semua Siswa Aktif';
    const currentClassObj = classes.find(c => c.id === selectedClass);

    // Single student biodata print
    if (singleStudentToPrint) {
      return (
        <div className="min-h-screen bg-white p-0">
          <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
            <Button variant="ghost" onClick={() => { setIsPrinting(false); setSingleStudentToPrint(null); }} className="font-bold text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Mode: Lembar Biodata Siswa Lengkap
              </span>
              <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold shadow-lg">
                <Printer className="w-4 h-4 mr-2" /> Cetak Biodata
              </Button>
            </div>
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
            
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold underline uppercase">LEMBAR BIODATA SISWA LENGKAP</h2>
              <p className="mt-1 font-semibold text-xs">TAHUN PELAJARAN {settings.tahun_pelajaran?.active_year || '2024/2025'}</p>
            </div>

            <div className="border border-black p-4 space-y-5 text-xs leading-relaxed">
              {/* I. IDENTITAS SISWA */}
              <div>
                <div className="flex justify-between items-start border-b border-black pb-1.5 mb-3">
                  <h3 className="font-bold text-sm uppercase">I. INFORMASI IDENTITAS SISWA</h3>
                  <span className="font-mono text-[10px] bg-gray-100 px-2 py-0.5 border border-black font-bold">
                    NISN: {singleStudentToPrint.nisn || '-'}
                  </span>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">Nama Lengkap</div>
                      <div className="col-span-8 font-bold uppercase">: {singleStudentToPrint.name}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">NISN</div>
                      <div className="col-span-8 font-mono">: {singleStudentToPrint.nisn || '-'}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">NIK</div>
                      <div className="col-span-8 font-mono">: {singleStudentToPrint.nik || '-'}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">Tempat, Tanggal Lahir</div>
                      <div className="col-span-8">: {singleStudentToPrint.tempat_lahir ? `${singleStudentToPrint.tempat_lahir}, ` : ''}{singleStudentToPrint.tanggal_lahir || '-'} ({calculateAge(singleStudentToPrint.tanggal_lahir)} Tahun)</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">Jenis Kelamin</div>
                      <div className="col-span-8">: {singleStudentToPrint.gender}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">Kelas / Rombel</div>
                      <div className="col-span-8 font-bold">: {getClassName(singleStudentToPrint.class_id)}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">Status Siswa</div>
                      <div className="col-span-8 uppercase">: {singleStudentToPrint.status === 'active' ? 'Aktif' : singleStudentToPrint.status === 'graduated' ? 'Lulus / Alumni' : 'Pindah'}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">Alamat Lengkap</div>
                      <div className="col-span-8">: {singleStudentToPrint.address || '-'}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 font-semibold">No. HP / Telepon</div>
                      <div className="col-span-8 font-mono">: {singleStudentToPrint.phone || '-'}</div>
                    </div>
                  </div>

                  {/* Photo Box */}
                  <div className="w-28 h-36 border border-black p-1 flex flex-col items-center justify-center shrink-0 bg-gray-50 text-center">
                    {singleStudentToPrint.photo_url ? (
                      <img src={singleStudentToPrint.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[9px] text-gray-500 font-bold uppercase">
                        Pas Foto<br />3 x 4
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* II. DATA BANTUAN & KEBUTUHAN KHUSUS */}
              <div>
                <h3 className="font-bold text-sm uppercase border-b border-black pb-1.5 mb-2.5">II. BANTUAN SOSIAL & KEBUTUHAN KHUSUS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="grid grid-cols-12">
                    <div className="col-span-5 font-semibold">No. KIP / PIP</div>
                    <div className="col-span-7 font-mono">: {singleStudentToPrint.nomor_kip_pip || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-5 font-semibold">Kebutuhan Khusus</div>
                    <div className="col-span-7">: {singleStudentToPrint.kebutuhan_khusus || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-5 font-semibold">Disabilitas</div>
                    <div className="col-span-7">: {singleStudentToPrint.disabilitas || '-'}</div>
                  </div>
                </div>
              </div>

              {/* III. INFORMASI ORANG TUA / WALI */}
              <div>
                <h3 className="font-bold text-sm uppercase border-b border-black pb-1.5 mb-2.5">III. DATA ORANG TUA / WALI SISWA</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 font-semibold">Nama Ayah Kandung</div>
                    <div className="col-span-8 font-bold uppercase">: {singleStudentToPrint.nama_ayah || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 font-semibold">Nama Ibu Kandung</div>
                    <div className="col-span-8 font-bold uppercase">: {singleStudentToPrint.nama_ibu || '-'}</div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 font-semibold">Nama Wali Siswa</div>
                    <div className="col-span-8 font-bold uppercase">: {singleStudentToPrint.nama_wali || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 text-center text-xs gap-8">
              <div>
                <p className="mb-16">Orang Tua / Wali Siswa,</p>
                <p className="font-bold underline uppercase">{singleStudentToPrint.nama_ayah || singleStudentToPrint.nama_ibu || singleStudentToPrint.nama_wali || '(................................................)'}</p>
              </div>
              <div>
                {printConfig.show_signature ? (
                  <PenandatanganDokumen targetKelas={getClassName(singleStudentToPrint.class_id)} />
                ) : (
                  <div>
                    <p className="mb-16">Kepala Sekolah / Wali Kelas,</p>
                    <p className="font-bold underline uppercase">(................................................)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-[8pt] text-gray-500 flex justify-between">
              <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p>Dokumen Resmi Sekolah / Madrasah</p>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4 portrait; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
        </div>
      );
    }

    // Full table printing
    const isLandscape = printLayout === 'landscape_full';

    return (
      <div className="min-h-screen bg-white p-0">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex flex-wrap justify-between items-center print:hidden shadow-md gap-3">
          <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Format Cetak:</span>
            <Button
              size="sm"
              variant={printLayout === 'landscape_full' ? 'default' : 'outline'}
              onClick={() => setPrintLayout('landscape_full')}
              className={printLayout === 'landscape_full' ? 'bg-emerald-600 text-white font-bold' : 'font-bold'}
            >
              Format Lengkap Template (Landscape)
            </Button>
            <Button
              size="sm"
              variant={printLayout === 'portrait_compact' ? 'default' : 'outline'}
              onClick={() => setPrintLayout('portrait_compact')}
              className={printLayout === 'portrait_compact' ? 'bg-emerald-600 text-white font-bold' : 'font-bold'}
            >
              Format Ringkas (Portrait)
            </Button>
          </div>

          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
          </Button>
        </div>

        <div 
          className="mx-auto print:w-full flex flex-col font-serif"
          style={{ 
            width: isLandscape ? '297mm' : '210mm', 
            minHeight: isLandscape ? '210mm' : '297mm',
            padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
            boxSizing: 'border-box'
          }}
        >
          {printConfig.show_kop && <KopSurat />}
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold underline uppercase">
              {viewMode === 'alumni' ? 'DAFTAR DATA ALUMNI & LULUSAN MADRASAH' : 'DAFTAR DATA SISWA AKTIF & ROMBONGAN BELAJAR'}
            </h2>
            <p className="mt-1 font-semibold text-xs">
              {viewMode === 'alumni' 
                ? (alumniYearFilter === 'all' ? 'Semua Tahun Lulus' : `Tahun Lulus ${alumniYearFilter}`)
                : `${activeClassName} | Tahun Pelajaran ${settings.tahun_pelajaran?.active_year || '2024/2025'}`
              }
            </p>
            <div className="mt-1.5 text-xs">
              <p>Total {viewMode === 'alumni' ? 'Alumni' : 'Siswa'}: <span className="font-bold">{filteredStudents.length} orang</span> (Laki-laki: {filteredStudents.filter(s => s.gender === 'Laki-laki').length}, Perempuan: {filteredStudents.filter(s => s.gender === 'Perempuan').length})</p>
            </div>
          </div>

          {currentClassObj && (
            <div className="mb-4 text-xs font-semibold flex justify-between items-start border border-black p-2.5 bg-gray-50">
              <div>
                <p className="font-bold uppercase text-sm">{currentClassObj.nama_kelas} (Tingkat {currentClassObj.tingkat})</p>
                <p>Kapasitas: {currentClassObj.kapasitas} Siswa | Terisi: {filteredStudents.length} Siswa</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold">Wali Kelas:</span> {currentClassObj.wali_kelas || '-'}</p>
                {currentClassObj.nip_wali_kelas && <p className="font-mono">NIP: {currentClassObj.nip_wali_kelas}</p>}
                {currentClassObj.golongan_wali_kelas && <p>Gol: {currentClassObj.golongan_wali_kelas}</p>}
                {currentClassObj.nuptk_wali_kelas && <p className="font-mono">NUPTK: {currentClassObj.nuptk_wali_kelas}</p>}
              </div>
            </div>
          )}

          {isLandscape ? (
            /* FULL TEMPLATE LANDSCAPE TABLE */
            <table className="w-full border-collapse border border-black text-[6.5pt]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 w-5 text-center">No</th>
                  <th className="border border-black p-1 text-left min-w-[110px]">Nama Lengkap</th>
                  <th className="border border-black p-1 text-center w-14">NISN</th>
                  <th className="border border-black p-1 text-center w-16">NIK</th>
                  <th className="border border-black p-1 text-center min-w-[70px]">Tempat Lahir</th>
                  <th className="border border-black p-1 text-center w-14">Tgl Lahir</th>
                  <th className="border border-black p-1 text-center w-6">L/P</th>
                  <th className="border border-black p-1 text-center min-w-[60px]">Kelas</th>
                  <th className="border border-black p-1 text-left min-w-[100px]">Alamat</th>
                  <th className="border border-black p-1 text-center w-14">No HP</th>
                  <th className="border border-black p-1 text-center min-w-[70px]">Kip/Pip</th>
                  <th className="border border-black p-1 text-center min-w-[70px]">Disabilitas / Khusus</th>
                  <th className="border border-black p-1 text-left min-w-[75px]">Nama Ayah</th>
                  <th className="border border-black p-1 text-left min-w-[75px]">Nama Ibu</th>
                  <th className="border border-black p-1 text-left min-w-[75px]">Nama Wali</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="odd:bg-white even:bg-slate-50/50">
                    <td className="border border-black p-1 text-center font-medium">{idx + 1}</td>
                    <td className="border border-black p-1 font-bold uppercase">{s.name}</td>
                    <td className="border border-black p-1 text-center font-mono">{s.nisn || '-'}</td>
                    <td className="border border-black p-1 text-center font-mono">{s.nik || '-'}</td>
                    <td className="border border-black p-1 text-center">{s.tempat_lahir || '-'}</td>
                    <td className="border border-black p-1 text-center whitespace-nowrap">{s.tanggal_lahir || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td className="border border-black p-1 text-center font-semibold">{getClassName(s.class_id)}</td>
                    <td className="border border-black p-1">{s.address || '-'}</td>
                    <td className="border border-black p-1 text-center font-mono">{s.phone || '-'}</td>
                    <td className="border border-black p-1 text-center font-mono">{s.nomor_kip_pip || '-'}</td>
                    <td className="border border-black p-1 text-center">{s.disabilitas || s.kebutuhan_khusus || '-'}</td>
                    <td className="border border-black p-1 uppercase">{s.nama_ayah || '-'}</td>
                    <td className="border border-black p-1 uppercase">{s.nama_ibu || '-'}</td>
                    <td className="border border-black p-1 uppercase">{s.nama_wali || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* COMPACT PORTRAIT TABLE */
            <table className="w-full border-collapse border border-black text-[7pt]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 w-6">No</th>
                  <th className="border border-black p-1 text-left min-w-[120px]">Nama Lengkap</th>
                  <th className="border border-black p-1 text-center w-16">NISN</th>
                  <th className="border border-black p-1 text-center w-16">NIK</th>
                  <th className="border border-black p-1 text-center min-w-[80px]">TTL</th>
                  <th className="border border-black p-1 text-center w-8">Umur</th>
                  <th className="border border-black p-1 text-center w-6">L/P</th>
                  <th className="border border-black p-1 text-center w-10">Status</th>
                  <th className="border border-black p-1 text-left min-w-[100px]">Alamat</th>
                  <th className="border border-black p-1 text-center w-16">No. HP</th>
                  <th className="border border-black p-1 text-left min-w-[80px]">Ayah</th>
                  <th className="border border-black p-1 text-left min-w-[80px]">Ibu</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                    <td className="border border-black p-1 font-bold uppercase">{s.name}</td>
                    <td className="border border-black p-1 text-center">{s.nisn || '-'}</td>
                    <td className="border border-black p-1 text-center">{s.nik || '-'}</td>
                    <td className="border border-black p-1 text-center text-[6pt]">{s.tempat_lahir}, {s.tanggal_lahir}</td>
                    <td className="border border-black p-1 text-center">{calculateAge(s.tanggal_lahir)}</td>
                    <td className="border border-black p-1 text-center">{s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td className="border border-black p-1 text-center text-[6pt]">{s.status === 'active' ? 'Aktif' : s.status === 'graduated' ? 'Lulus' : 'Pindah'}</td>
                    <td className="border border-black p-1 text-[6pt]">{s.address || '-'}</td>
                    <td className="border border-black p-1 text-center text-[6pt]">{s.phone || '-'}</td>
                    <td className="border border-black p-1 text-[6pt]">{s.nama_ayah || '-'}</td>
                    <td className="border border-black p-1 text-[6pt]">{s.nama_ibu || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-5 text-[8pt] text-gray-600 flex justify-between items-center">
            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p className="font-bold">Total data siswa: {filteredStudents.length} orang</p>
          </div>

          {printConfig.show_signature && (
            <div className="mt-10">
              <PenandatanganDokumen targetKelas={activeClassName} />
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'}; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Manajemen Siswa & Alumni">
      <div className="space-y-6">
        {/* Navigation Tabs & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-md border border-slate-200/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl w-full lg:w-auto">
            <button
              onClick={() => { setViewMode('active'); setShowUnassignedStudents(false); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-black text-xs transition-all min-w-0 ${
                viewMode === 'active' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${viewMode === 'active' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="whitespace-nowrap font-bold">Data Siswa</span>
            </button>

            <button
              onClick={() => { setViewMode('rekapitulasi'); setShowUnassignedStudents(false); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-black text-xs transition-all min-w-0 whitespace-nowrap ${
                viewMode === 'rekapitulasi' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-indigo-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${viewMode === 'rekapitulasi' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>
                <School className="w-4 h-4" />
              </div>
              <span>Rekapitulasi</span>
            </button>

            <button
              onClick={() => { setViewMode('alumni'); setShowUnassignedStudents(false); }}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl font-black text-xs transition-all min-w-0 whitespace-nowrap ${
                viewMode === 'alumni' 
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${viewMode === 'alumni' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span>Data Alumni</span>
              </div>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black shrink-0 ${viewMode === 'alumni' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {alumniStats.total}
              </Badge>
            </button>

            <button
              onClick={() => { setViewMode('unassigned'); setShowUnassignedStudents(true); setSelectedClass(''); }}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl font-black text-xs transition-all min-w-0 whitespace-nowrap ${
                viewMode === 'unassigned' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${viewMode === 'unassigned' ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>
                  <User className="w-4 h-4" />
                </div>
                <span>Tanpa Kelas</span>
              </div>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black shrink-0 ${viewMode === 'unassigned' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>
                {unassignedStudents.length}
              </Badge>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleManualSync}
              variant="outline"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300/80 rounded-2xl font-black text-xs h-11 px-4 gap-2 shrink-0 shadow-sm"
              title="Sinkronkan data jumlah siswa aktif secara manual"
            >
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <span>Sync Data Siswa</span>
              <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] ml-1 border-0">
                {activeStudents.length} Aktif
              </Badge>
            </Button>

            {unassignedStudents.length > 0 && (
              <Button
                onClick={openDeleteUnassignedModal}
                className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-600/20 h-11 px-4 gap-2 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Siswa Tanpa Rombel ({unassignedStudents.length})
              </Button>
            )}
            <Button
              onClick={() => {
                setPromotionModalOpen(true);
                if (selectedClass) setPromotionSourceClass(selectedClass);
              }}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 h-11 px-5 gap-2 shrink-0"
            >
              <GraduationCap className="w-4 h-4" />
              Proses Naik Kelas & Kelulusan Massal
            </Button>
          </div>
        </div>

        {/* REKAPITULASI JUMLAH SISWA PER TAHUN PELAJARAN */}
        {viewMode === 'rekapitulasi' && (
          <Card className="border-0 shadow-xl rounded-3xl bg-white p-6 sm:p-7 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold shadow-sm shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-indigo-600 text-white font-extrabold text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full">
                      Tahun Pelajaran {settings.tahun_pelajaran?.active_year || '2024/2025'} (Aktif)
                    </Badge>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    Rekapitulasi Jumlah Daftar Siswa
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Jumlah siswa aktif per kelas/rombel dan per jenis kelamin (Laki-laki/Perempuan) pada Tahun Pelajaran aktif.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => navigate('/admin/rekap-siswa')}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl h-9 px-4 gap-2 shadow-sm border border-teal-600"
                  title="Lihat & Bekukan Arsip Rekapitulasi Berdasarkan Tahun Pelajaran"
                >
                  <FolderArchive className="w-4 h-4 text-teal-200" />
                  Arsip &amp; History Rekap TP
                </Button>

                {hasActiveOverride && (
                  <Button
                    onClick={handleResetRekap}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2 shadow-sm"
                    title="Kembalikan ke hitungan otomatis"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset ke Otomatis
                  </Button>
                )}

                <Button
                  onClick={handleOpenEditRekap}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2 shadow-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Rekapitulasi
                </Button>

                <Button
                  onClick={() => setIsPrinting(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Rekapitulasi
                </Button>

                <Button
                  onClick={() => {
                    const classHeaders = sortedClassesList.flatMap(c => [`${c.nama_kelas} (L)`, `${c.nama_kelas} (P)`]);
                    const wsData = [
                      ['REKAPITULASI JUMLAH SISWA PER TAHUN PELAJARAN'],
                      [`Tahun Pelajaran: ${settings.tahun_pelajaran?.active_year || '2024/2025'}`],
                      [''],
                      ['I. REKAPITULASI PER ROMBONGAN BELAJAR (KELAS)'],
                      ['No', 'Nama Kelas / Rombel', 'Laki-laki (L)', 'Perempuan (P)', 'Jumlah Siswa'],
                      ...rekapitulasiData.rows.map((r, i) => [
                        i + 1,
                        r.nama_kelas,
                        r.male,
                        r.female,
                        r.total
                      ]),
                      ['', 'TOTAL KESELURUHAN', rekapitulasiData.grandMale, rekapitulasiData.grandFemale, rekapitulasiData.grandTotal],
                      [''],
                      ['II. REKAPITULASI PERKEMBANGAN JUMLAH SISWA (3 TAHUN PELAJARAN)'],
                      ['No', 'Tahun Pelajaran', ...classHeaders, 'Total (L)', 'Total (P)', 'Total Siswa', 'Keterangan'],
                      ...threeYearSummary.map((r, i) => [
                        i + 1,
                        r.year,
                        ...sortedClassesList.flatMap(c => [r.byClass[c.id]?.male || 0, r.byClass[c.id]?.female || 0]),
                        r.male,
                        r.female,
                        r.total,
                        r.label
                      ])
                    ];
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi Siswa');
                    XLSX.writeFile(wb, `Rekapitulasi_Siswa_${(settings.tahun_pelajaran?.active_year || '2024_2025').replace('/', '_')}.xlsx`);
                    showSuccess('File Excel Rekapitulasi Siswa (Termasuk 3 TP) berhasil diunduh!');
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel Rekapitulasi
                </Button>
              </div>
            </div>

            {/* Banner Override Warning */}
            {hasActiveOverride && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-800 text-xs shadow-sm">
                <div className="flex items-center gap-2 font-medium">
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-bold uppercase text-[10px] shrink-0">Manual Override</span>
                  <span>Data rekapitulasi saat ini di-override manual. Penambahan siswa baru tidak akan mengubah angka ini secara otomatis.</span>
                </div>
                <Button
                  onClick={handleResetRekap}
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-[11px] h-8 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Kembalikan ke Otomatis
                </Button>
              </div>
            )}

            {/* Table Rekapitulasi Per Rombel */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                <School className="w-4 h-4 text-indigo-600" />
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
                      <tr key={row.class_id} className="hover:bg-slate-50 transition-colors">
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
                        TOTAL KESELURUHAN SISWA ({settings.tahun_pelajaran?.active_year || '2024/2025'})
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
                <Calendar className="w-4 h-4 text-indigo-600" />
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
                          row.year === (settings.tahun_pelajaran?.active_year || '2024/2025')
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
                              row.year === (settings.tahun_pelajaran?.active_year || '2024/2025')
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
        )}

        {/* ALUMNI VIEW SUMMARY STATS */}
        {viewMode === 'alumni' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">Total Alumni / Lulusan</p>
                  <h3 className="text-3xl font-black mt-1">{alumniStats.total} <span className="text-sm font-normal">Siswa</span></h3>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Alumni Laki-Laki</p>
                  <h3 className="text-3xl font-black mt-1">{alumniStats.male} <span className="text-sm font-normal">Siswa</span></h3>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <User className="w-6 h-6 text-white" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-3xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-xs font-bold uppercase tracking-wider">Alumni Perempuan</p>
                  <h3 className="text-3xl font-black mt-1">{alumniStats.female} <span className="text-sm font-normal">Siswa</span></h3>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <User className="w-6 h-6 text-white" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* UNASSIGNED STUDENTS ACTION CARD */}
        {viewMode === 'unassigned' && (
          <Card className="border border-rose-200 bg-rose-50/90 shadow-md rounded-3xl p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-rose-950 flex items-center gap-2">
                    Manajemen Siswa Tanpa Rombel
                    <Badge className="bg-rose-600 text-white font-black text-[11px] px-2 py-0.5 rounded-full border-0">
                      {unassignedStudents.length} Siswa
                    </Badge>
                  </h3>
                  <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                    Siswa di daftar ini belum dimasukkan ke kelas manapun dan bukan status alumni. Gunakan fitur hapus untuk membuang data yang tidak valid.
                  </p>
                </div>
              </div>
              {unassignedStudents.length > 0 && (
                <Button
                  onClick={openDeleteUnassignedModal}
                  className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs h-11 px-5 rounded-2xl shadow-lg shadow-rose-600/20 shrink-0 gap-2 w-full md:w-auto"
                >
                  <Trash2 className="w-4 h-4" /> Kelola & Hapus ({unassignedStudents.length}) Siswa
                </Button>
              )}
            </div>
          </Card>
        )}

        <Card className={`border-0 shadow-lg text-white overflow-hidden transition-all ${
          viewMode === 'alumni' ? 'bg-amber-600' : viewMode === 'unassigned' ? 'bg-blue-600' : 'bg-emerald-600'
        }`}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  {viewMode === 'alumni' ? <GraduationCap className="w-8 h-8" /> : <Users className="w-8 h-8" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {viewMode === 'alumni' 
                      ? 'Direktori Data Alumni / Lulusan' 
                      : viewMode === 'unassigned' 
                      ? 'Siswa Tanpa Kelas / Belum Ditempatkan' 
                      : 'Database Siswa Aktif per Rombel'}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {viewMode === 'alumni' 
                      ? 'Rekapitulasi lengkap seluruh alumni dan kelulusan siswa.' 
                      : viewMode === 'unassigned' 
                      ? 'Kelola siswa yang belum dimasukkan ke rombel kelas.' 
                      : 'Pilih rombel kelas untuk mengelola siswa aktif.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="flex gap-3 flex-wrap w-full">
                  {viewMode === 'alumni' ? (
                    <Select value={alumniYearFilter} onValueChange={setAlumniYearFilter}>
                      <SelectTrigger className="w-full md:w-56 bg-white/10 border-white/20 text-white rounded-xl h-12">
                        <SelectValue placeholder="Tahun Kelulusan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Tahun Lulus</SelectItem>
                        {availableGradYears.map((year: string) => (
                          <SelectItem key={year} value={year}>Tahun Lulus {year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full md:w-44 bg-white/10 border-white/20 text-white rounded-xl h-12">
                          <SelectValue placeholder="Tahun Pelajaran" />
                        </SelectTrigger>
                        <SelectContent>
                          {(settings.tahun_pelajaran?.available_years || [selectedYear]).map((year: string) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {viewMode === 'active' && (
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                          <SelectTrigger className="w-full md:w-56 bg-white/10 border-white/20 text-white rounded-xl h-12">
                            <SelectValue placeholder="Pilih Kelas / Rombel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_classes">-- Semua Kelas / Rombel --</SelectItem>
                            {classes.sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat)).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nama_kelas} (Tingkat {c.tingkat})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                  />
                  <Button 
                    variant="outline" 
                    onClick={downloadTemplate}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl font-bold h-12"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Template Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl font-bold h-12"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Import Excel
                  </Button>
                  <Button onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      name: '', nisn: '', nik: '', tempat_lahir: '', tanggal_lahir: '', 
                      class_id: viewMode === 'unassigned' ? '' : selectedClass, gender: 'Laki-laki', address: '', phone: '', 
                      status: viewMode === 'alumni' ? 'graduated' : 'active', kebutuhan_khusus: '', disabilitas: '', 
                      nomor_kip_pip: '', nama_ayah: '', nama_ibu: '', nama_wali: '', photo_url: ''
                    });
                    setDialogOpen(true);
                  }} className="bg-white text-slate-800 hover:bg-slate-50 rounded-xl font-extrabold h-12">
                    <Plus className="w-4 h-4 mr-2 text-emerald-600" /> {viewMode === 'alumni' ? 'Tambah Data Alumni' : 'Tambah Siswa'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === 'active' && !selectedClass ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <School className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Pilih Rombel Kelas</h3>
            <p className="text-slate-500 font-medium text-sm mt-1">Silakan pilih Kelas pada dropdown di atas untuk mengelola data siswa aktif.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder={viewMode === 'alumni' ? "Cari nama alumni, NISN, NIK..." : "Cari nama siswa, NISN, NIK..."} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10 rounded-xl" 
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto flex-wrap">
                {unassignedStudents.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={openDeleteUnassignedModal} 
                    className="flex-1 md:flex-none rounded-xl font-bold h-11 bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-md"
                  >
                    <Trash2 className="w-4 h-4" /> Hapus Siswa Tanpa Rombel ({unassignedStudents.length})
                  </Button>
                )}
                <Button
                  onClick={handleOpenMassMoveModal}
                  disabled={selectedStudentIds.length === 0}
                  className="flex-1 md:flex-none rounded-xl font-bold h-11 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md disabled:opacity-50"
                >
                  <ArrowLeftRight className="w-4 h-4" /> Pindah Rombel Massal {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                </Button>
                <Button
                  onClick={handleOpenGraduateModal}
                  disabled={selectedStudentIds.length === 0}
                  className="flex-1 md:flex-none rounded-xl font-bold h-11 bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md disabled:opacity-50"
                >
                  <GraduationCap className="w-4 h-4" /> Luluskan Terpilih {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                </Button>
                <Button variant="outline" onClick={() => { setSingleStudentToPrint(null); setIsPrinting(true); }} className="flex-1 md:flex-none rounded-xl font-bold h-11 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                  <Printer className="w-4 h-4 mr-2" /> Cetak Data Siswa
                </Button>
                <Button variant="outline" onClick={fetchData} disabled={loading} className="flex-1 md:flex-none rounded-xl h-11">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>

            {/* Sticky/Floating Selection Action Banner */}
            {selectedStudentIds.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-indigo-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>{selectedStudentIds.length} Siswa Terpilih</span>
                      <Badge className="bg-indigo-500 text-white font-mono text-[10px] px-2 py-0.5 rounded-full border-0">
                        {selectedStudentIds.length} / {filteredStudents.length}
                      </Badge>
                    </h4>
                    <p className="text-indigo-200 text-xs">
                      Siap dipindahkan ke rombel kelas lain secara bersamaan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
                  <Button
                    onClick={handleOpenMassMoveModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-10 px-4 rounded-xl shadow-lg gap-2"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Pindah Rombel ({selectedStudentIds.length})
                  </Button>
                  <Button
                    onClick={handleOpenGraduateModal}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs h-10 px-4 rounded-xl shadow-lg gap-2"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Luluskan ({selectedStudentIds.length})
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmDeleteState({
                        isOpen: true,
                        targetIds: selectedStudentIds,
                        title: `Hapus ${selectedStudentIds.length} Siswa Terpilih`,
                        description: `Apakah Anda yakin ingin MENGHAPUS PERMANEN ${selectedStudentIds.length} data siswa terpilih? Tindakan ini tidak dapat dibatalkan.`
                      });
                    }}
                    variant="destructive"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus ({selectedStudentIds.length})
                  </Button>
                  <Button
                    onClick={() => setSelectedStudentIds([])}
                    variant="outline"
                    className="bg-indigo-950/60 text-indigo-200 border-indigo-400/30 hover:bg-indigo-900 text-xs h-10 px-3 rounded-xl"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Batal Pilih
                  </Button>
                </div>
              </div>
            )}

            <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/80">
                    <TableRow>
                      <TableHead className="w-[45px] text-center font-extrabold">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(String(s.id)))}
                          onChange={handleToggleSelectAll}
                          title="Pilih / Batal Pilih Semua Siswa"
                        />
                      </TableHead>
                      <TableHead className="w-[50px] text-center font-extrabold">No</TableHead>
                      <TableHead className="min-w-[200px] font-extrabold">Nama Lengkap</TableHead>
                      <TableHead className="font-extrabold">NISN / NIK</TableHead>
                      <TableHead className="font-extrabold">TTL / Umur</TableHead>
                      <TableHead className="font-extrabold">Orang Tua / Wali</TableHead>
                      <TableHead className="text-center font-extrabold">
                        {viewMode === 'alumni' ? 'Tahun Lulus' : 'Status / Kelas'}
                      </TableHead>
                      <TableHead className="w-[140px] text-center font-extrabold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="h-32 text-center text-gray-500">
                        {viewMode === 'alumni' 
                          ? 'Belum ada data alumni / lulusan yang sesuai.' 
                          : viewMode === 'unassigned'
                          ? 'Tidak ada siswa tanpa kelas.'
                          : 'Data siswa tidak ditemukan di kelas ini.'
                        }
                      </TableCell></TableRow>
                    ) : (
                      filteredStudents.map((s, idx) => {
                        const isSelected = selectedStudentIds.includes(String(s.id));
                        return (
                          <TableRow key={s.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/80 hover:bg-indigo-100/80' : 'hover:bg-slate-50/80'}`}>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                checked={isSelected}
                                onChange={() => handleToggleSelectStudent(String(s.id))}
                              />
                            </TableCell>
                            <TableCell className="text-center font-medium text-gray-400">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-12 rounded-lg overflow-hidden border flex items-center justify-center text-[10px] font-bold shrink-0 ${s.gender === 'Laki-laki' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                  {s.photo_url ? (
                                    <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    s.name.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 leading-snug">{s.name}</div>
                                  <div className="text-[11px] text-slate-500">{s.gender}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-mono font-bold text-slate-700">{s.nisn || '-'}</div>
                              <div className="text-[10px] text-gray-400">NIK: {s.nik || '-'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium">{s.tempat_lahir ? `${s.tempat_lahir}, ` : ''}{s.tanggal_lahir || '-'}</div>
                              <div className="text-[10px] text-gray-400">{calculateAge(s.tanggal_lahir)} Tahun</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium">A: {s.nama_ayah || '-'}</div>
                              <div className="text-xs font-medium">I: {s.nama_ibu || '-'}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              {viewMode === 'alumni' ? (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold">
                                  🎓 Lulus {s.tahun_lulus || 'Alumni'}
                                </Badge>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                    AKTIF
                                  </Badge>
                                  <span className="text-[10px] text-slate-500 font-bold">
                                    {getClassName(s.class_id)}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center items-center gap-1">
                                {viewMode === 'alumni' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    title="Kembalikan ke Siswa Aktif"
                                    onClick={() => {
                                      const targetClass = prompt('Masukkan ID / Pilih Kelas Baru untuk mengaktifkan siswa ini:', classes[0]?.id || '');
                                      if (targetClass) {
                                        handleRestoreStudent(s.id, targetClass);
                                      }
                                    }} 
                                    className="h-8 px-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[10px] font-bold"
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" /> Restore
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Cetak Lembar Biodata Siswa"
                                  onClick={() => {
                                    setSingleStudentToPrint(s);
                                    setIsPrinting(true);
                                  }} 
                                  className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleStartEditStudent(s)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <User className="w-6 h-6 text-emerald-600" />
              {editingItem ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative group">
                <div className="w-32 h-40 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-500">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Foto Siswa" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Pas Foto</p>
                    </div>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  hidden 
                  ref={photoInputRef} 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                />
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <Button 
                    size="icon" 
                    variant="secondary"
                    className="w-10 h-10 rounded-full shadow-lg border-2 border-white bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  {formData.photo_url && (
                    <Button 
                      size="icon" 
                      variant="destructive"
                      className="w-10 h-10 rounded-full shadow-lg border-2 border-white"
                      onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Format: JPG/PNG, Maks 2MB</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Nama Lengkap</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Jenis Kelamin</label>
                <Select value={formData.gender} onValueChange={(v: any) => setFormData({...formData, gender: v})}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">NISN</label><Input value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} className="rounded-xl h-12" /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">NIK</label><Input value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} className="rounded-xl h-12" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Tempat Lahir</label><Input value={formData.tempat_lahir} onChange={e => setFormData({...formData, tempat_lahir: e.target.value})} className="rounded-xl h-12" /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Tanggal Lahir</label><Input type="date" value={formData.tanggal_lahir} onChange={e => setFormData({...formData, tanggal_lahir: e.target.value})} className="rounded-xl h-12" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-600 uppercase">Penempatan Kelas</label>
                <Select value={formData.class_id} onValueChange={(v) => setFormData({...formData, class_id: v})}>
                  <SelectTrigger className="rounded-xl h-12 border-emerald-200 bg-emerald-50/30"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>
                    {classes.sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nama_kelas} (Tingkat {c.tingkat})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Status Siswa</label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="graduated">Lulus (Alumni)</SelectItem>
                    <SelectItem value="moved">Pindah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === 'graduated' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
                  Tahun Kelulusan / Alumni
                </label>
                <Input
                  value={formData.tahun_lulus || settings.tahun_pelajaran?.active_year || '2024/2025'}
                  onChange={e => setFormData({ ...formData, tahun_lulus: e.target.value })}
                  placeholder="Misal: 2023/2024"
                  className="rounded-xl h-12 bg-white"
                />
                <p className="text-[11px] text-amber-700">
                  Siswa yang diluluskan akan otomatis dilepas dari rombel/kelas aktif dan dipindahkan ke daftar Alumni.
                </p>
              </div>
            )}

            <div className="space-y-4 border-t pt-6">
              <h4 className="font-bold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4" /> Data Orang Tua & Kontak</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Nama Ayah Kandung</label><Input value={formData.nama_ayah} onChange={e => setFormData({...formData, nama_ayah: e.target.value})} className="rounded-xl h-12" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Nama Ibu Kandung</label><Input value={formData.nama_ibu} onChange={e => setFormData({...formData, nama_ibu: e.target.value})} className="rounded-xl h-12" /></div>
              </div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Nama Wali</label><Input value={formData.nama_wali} onChange={e => setFormData({...formData, nama_wali: e.target.value})} className="rounded-xl h-12" /></div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">No. HP / WhatsApp</label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl h-12" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Nomor KIP/PIP</label><Input value={formData.nomor_kip_pip} onChange={e => setFormData({...formData, nomor_kip_pip: e.target.value})} className="rounded-xl h-12" /></div>
              </div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Alamat Lengkap</label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="rounded-xl" /></div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h4 className="font-bold text-gray-700 flex items-center gap-2"><Info className="w-4 h-4" /> Kebutuhan Khusus & Disabilitas</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Kebutuhan Khusus</label><Input value={formData.kebutuhan_khusus} onChange={e => setFormData({...formData, kebutuhan_khusus: e.target.value})} className="rounded-xl h-12" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase">Disabilitas</label><Input value={formData.disabilitas} onChange={e => setFormData({...formData, disabilitas: e.target.value})} className="rounded-xl h-12" /></div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-gray-500">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold shadow-xl">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Data Siswa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Modal Naik Kelas & Kelulusan Massal */}
      <Dialog open={promotionModalOpen} onOpenChange={setPromotionModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] rounded-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="sticky top-0 bg-amber-600 text-white z-20 px-6 pt-5 pb-4 shadow-md shrink-0">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-amber-200" />
              Proses Naik Kelas & Kelulusan Massal
            </DialogTitle>
            <p className="text-amber-100 text-xs mt-1">
              Pindahkan siswa ke tingkat rombel berikutnya atau luluskan siswa ke Data Alumni.
            </p>
          </DialogHeader>

          <div className="space-y-5 p-6 overflow-y-auto">
            {/* Step 1: Pilih Kelas Asal */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Pilih Rombel Kelas Asal:
              </label>
              <Select value={promotionSourceClass} onValueChange={setPromotionSourceClass}>
                <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-300 font-bold">
                  <SelectValue placeholder="Pilih Rombel Asal..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat)).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nama_kelas} (Tingkat {c.tingkat}) - {students.filter(s => isStudentActive(s) && isStudentInClass(s, c.id)).length} Siswa Aktif
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Pilih Aksi (Naik Kelas / Kelulusan) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Pilih Jenis Proses:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPromotionAction('promote')}
                  className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-1 transition-all ${
                    promotionAction === 'promote'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="font-extrabold text-sm flex items-center gap-2">
                    <School className="w-4 h-4 text-emerald-600" /> Naik Kelas Massal
                  </span>
                  <span className="text-[11px] text-slate-500">Pindahkan siswa ke kelas tingkat berikutnya.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPromotionAction('graduate')}
                  className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-1 transition-all ${
                    promotionAction === 'graduate'
                      ? 'border-amber-500 bg-amber-50/60 text-amber-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="font-extrabold text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-600" /> Proses Kelulusan (Alumni)
                  </span>
                  <span className="text-[11px] text-slate-500">Luluskan siswa & masukkan ke Data Alumni.</span>
                </button>
              </div>
            </div>

            {/* Step 3: Target Class or Graduation Year */}
            {promotionAction === 'promote' ? (
              <div className="space-y-2 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                  3. Pilih Rombel Kelas Tujuan:
                </label>
                <Select value={promotionTargetClass} onValueChange={setPromotionTargetClass}>
                  <SelectTrigger className="rounded-xl h-12 bg-white border-emerald-300 font-bold">
                    <SelectValue placeholder="Pilih Kelas Tujuan Kenaikan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter(c => c.id !== promotionSourceClass)
                      .sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat))
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nama_kelas} (Tingkat {c.tingkat})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                  3. Tahun Kelulusan (Tahun Lulus):
                </label>
                <Input
                  value={promotionGradYear}
                  onChange={(e) => setPromotionGradYear(e.target.value)}
                  placeholder="Contoh: 2024/2025"
                  className="rounded-xl h-12 bg-white border-amber-300 font-bold"
                />
              </div>
            )}

            {/* Step 4: Pilih Siswa yang akan diproses */}
            {promotionSourceClass && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Siswa Rombel ({students.filter(s => isStudentActive(s) && isStudentInClass(s, promotionSourceClass)).length} Siswa):
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allIds = students.filter(s => isStudentActive(s) && isStudentInClass(s, promotionSourceClass)).map(s => s.id);
                      if (selectedStudentIds.length === allIds.length) {
                        setSelectedStudentIds([]);
                      } else {
                        setSelectedStudentIds(allIds);
                      }
                    }}
                    className="text-xs text-emerald-700 font-bold hover:bg-emerald-50 h-8"
                  >
                    {selectedStudentIds.length === students.filter(s => isStudentActive(s) && isStudentInClass(s, promotionSourceClass)).length
                      ? 'Batal Pilih Semua'
                      : 'Pilih Semua Siswa'}
                  </Button>
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-2xl divide-y bg-slate-50">
                  {students
                    .filter(s => isStudentActive(s) && isStudentInClass(s, promotionSourceClass))
                    .map(s => {
                      const isChecked = selectedStudentIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                            isChecked ? 'bg-emerald-50/80 font-bold text-emerald-950' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds(prev => [...prev, s.id]);
                                } else {
                                  setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs">{s.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">NISN: {s.nisn || '-'}</span>
                        </label>
                      );
                    })}
                  {students.filter(s => isStudentActive(s) && isStudentInClass(s, promotionSourceClass)).length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs italic">
                      Tidak ada siswa aktif di kelas asal ini.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-100 border-t flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs font-bold text-slate-600 pl-2">
              Terpilih: <span className="text-emerald-700 font-extrabold">{selectedStudentIds.length} Siswa</span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setPromotionModalOpen(false)}
                className="rounded-xl font-bold text-slate-500"
              >
                Batal
              </Button>
              <Button
                onClick={handleExecutePromotion}
                disabled={isProcessingPromotion || selectedStudentIds.length === 0}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black px-6 shadow-md gap-2"
              >
                {isProcessingPromotion ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GraduationCap className="w-4 h-4" />
                )}
                {promotionAction === 'promote' ? 'Terapkan Naik Kelas' : 'Terapkan Kelulusan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog Konfirmasi Hapus Siswa Tanpa Rombel */}
      <Dialog open={isDeleteUnassignedModalOpen} onOpenChange={setIsDeleteUnassignedModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-gradient-to-r from-rose-600 to-red-700 text-white shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-200" />
              </div>
              Hapus Siswa Tanpa Rombel (Bukan Alumni)
            </DialogTitle>
            <p className="text-rose-100 text-xs mt-1">
              Data siswa yang tidak memiliki rombel/kelas dan bukan status alumni akan dihapus dari sistem secara permanen.
            </p>
          </DialogHeader>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Total Tanpa Rombel</span>
                <span className="text-xl font-black text-rose-900">{unassignedStudents.length} <span className="text-xs font-normal">Siswa</span></span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Laki-Laki</span>
                <span className="text-xl font-black text-blue-900">{unassignedStudents.filter(s => s.gender === 'Laki-laki').length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-pink-50 border border-pink-200 text-center">
                <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">Perempuan</span>
                <span className="text-xl font-black text-pink-900">{unassignedStudents.filter(s => s.gender === 'Perempuan').length}</span>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Informasi Keamanan Data:</p>
                <p className="text-amber-800 text-[11px]">Siswa dengan status <span className="font-extrabold text-amber-950">Alumni (Lulus)</span> tidak akan ikut terhapus. Anda dapat memilih siswa tertentu atau menghapus seluruh siswa tanpa rombel sekaligus.</p>
              </div>
            </div>

            {/* Search and Select All Toolbar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cari siswa tanpa rombel..."
                    value={unassignedSearchQuery}
                    onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const filteredIds = unassignedStudents
                      .filter(s => {
                        const q = unassignedSearchQuery.toLowerCase();
                        return s.name.toLowerCase().includes(q) || (s.nisn && s.nisn.includes(q));
                      })
                      .map(s => String(s.id));

                    if (selectedUnassignedIds.length === filteredIds.length) {
                      setSelectedUnassignedIds([]);
                    } else {
                      setSelectedUnassignedIds(filteredIds);
                    }
                  }}
                  className="rounded-xl font-bold text-xs h-9 px-3 shrink-0"
                >
                  {selectedUnassignedIds.length === unassignedStudents.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </Button>
              </div>

              {/* List Student Items */}
              <div className="max-h-56 overflow-y-auto border rounded-2xl divide-y bg-slate-50">
                {unassignedStudents
                  .filter(s => {
                    const q = unassignedSearchQuery.toLowerCase();
                    return s.name.toLowerCase().includes(q) || (s.nisn && s.nisn.includes(q)) || (s.nik && s.nik.includes(q));
                  })
                  .map(s => {
                    const studentIdStr = String(s.id);
                    const isChecked = selectedUnassignedIds.includes(studentIdStr);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-3 transition-colors ${
                          isChecked ? 'bg-rose-50/80 font-bold text-rose-950' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <label className="flex items-center gap-3 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUnassignedIds(prev => [...prev, studentIdStr]);
                              } else {
                                setSelectedUnassignedIds(prev => prev.filter(id => id !== studentIdStr));
                              }
                            }}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <div>
                            <span className="text-xs block leading-tight">{s.name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">{s.gender}</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-500 block">NISN: {s.nisn || '-'}</span>
                            <span className="text-[9px] text-rose-600 font-bold bg-rose-100 px-1.5 py-0.5 rounded">Tanpa Rombel</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Hapus Siswa Ini"
                            onClick={() => handleDelete(s.id, s.name)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-rose-100 rounded-lg shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                {unassignedStudents.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    Tidak ada siswa tanpa rombel.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-100 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <span className="text-xs font-bold text-slate-600 w-full sm:w-auto text-center sm:text-left">
              Terpilih: <span className="text-rose-700 font-extrabold">{selectedUnassignedIds.length}</span> dari {unassignedStudents.length} Siswa
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteUnassignedModalOpen(false)}
                className="rounded-xl font-bold text-slate-500 text-xs h-10 px-3"
              >
                Batal
              </Button>
              <Button
                onClick={promptDeleteUnassignedSelected}
                disabled={isSaving || selectedUnassignedIds.length === 0}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs h-10 px-3.5 shadow-md gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Hapus Terpilih ({selectedUnassignedIds.length})
              </Button>
              <Button
                onClick={promptDeleteUnassignedAll}
                disabled={isSaving || unassignedStudents.length === 0}
                className="bg-red-800 hover:bg-red-900 text-white rounded-xl font-black text-xs h-10 px-3.5 shadow-md gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                )}
                Hapus SEMUA ({unassignedStudents.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Data (Replaces native window.confirm) */}
      <Dialog open={confirmDeleteState.isOpen} onOpenChange={(open) => setConfirmDeleteState(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold flex items-center gap-2.5 text-rose-700">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              {confirmDeleteState.title || 'Konfirmasi Hapus Data'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 text-sm text-slate-600 leading-relaxed">
            {confirmDeleteState.description}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteState(prev => ({ ...prev, isOpen: false }))}
              disabled={isSaving}
              className="rounded-xl font-bold text-slate-600 text-xs h-10"
            >
              Batal
            </Button>
            <Button
              onClick={executeDeleteStudents}
              disabled={isSaving}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs h-10 px-5 shadow-lg shadow-rose-600/20 gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Ya, Hapus Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT REKAPITULASI & PERKEMBANGAN 3 TAHUN PELAJARAN */}
      <Dialog open={isEditRekapModalOpen} onOpenChange={setIsEditRekapModalOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <span>Edit Rekapitulasi & Perkembangan Siswa</span>
                <p className="text-xs font-normal text-slate-500 mt-0.5">
                  Sesuaikan manual data jumlah siswa per jenis kelamin untuk 3 tahun pelajaran maupun per kelas.
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Top Toolbar: Hybrid mode explanation and Sync Button */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div className="space-y-1">
                <div className="font-extrabold text-emerald-900 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sistem Rekapitulasi Hybrid (Otomatis & Manual)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Angka rekapitulasi dapat diambil <strong>secara otomatis dari data Rombel saat ini</strong>, dan Anda juga tetap bisa mengubah atau menyesuaikan nilainya secara manual di bawah ini.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSyncFromDatabase}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0 gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Isi / Sinkronkan dari DB Rombel
              </Button>
            </div>

            {/* Bagian 1: 3 Tahun Pelajaran */}
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/60">
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                I. Data Perkembangan 3 Tahun Pelajaran
              </h3>
              <div className="space-y-4">
                {Object.keys(tempRekapForm.threeYears || {}).map((yrKey) => {
                  const item = tempRekapForm.threeYears![yrKey];
                  return (
                    <div key={yrKey} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-emerald-900 font-mono bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 shrink-0">
                            Tahun Pelajaran: {yrKey}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const activeByClass: { [classId: string]: { male: number; female: number } } = {};
                              let totalM = 0;
                              let totalF = 0;
                              sortedClassesList.forEach(c => {
                                const classStuds = activeStudents.filter(
                                  (s) => s.class_id === c.id || s.class_id === c.nama_kelas || s.class_id?.toLowerCase() === c.nama_kelas?.toLowerCase()
                                );
                                const m = classStuds.filter((s) => s.gender === 'Laki-laki').length;
                                const f = classStuds.filter((s) => s.gender === 'Perempuan').length;
                                activeByClass[c.id] = { male: m, female: f };
                                totalM += m;
                                totalF += f;
                              });

                              setTempRekapForm(prev => ({
                                ...prev,
                                threeYears: {
                                  ...prev.threeYears,
                                  [yrKey]: {
                                    ...prev.threeYears![yrKey],
                                    male: totalM,
                                    female: totalF,
                                    byClass: activeByClass,
                                  }
                                }
                              }));
                              showSuccess(`Jumlah siswa ${yrKey} disinkronkan dengan data DB Rombel saat ini!`);
                            }}
                            className="h-7 text-[10px] font-bold text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 rounded-lg gap-1 shrink-0"
                          >
                            <RefreshCw className="w-3 h-3 text-emerald-600" /> Ambil DB Rombel
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">Keterangan:</span>
                          <Input
                            value={item.label || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTempRekapForm(prev => ({
                                ...prev,
                                threeYears: {
                                  ...prev.threeYears,
                                  [yrKey]: { ...prev.threeYears![yrKey], label: val }
                                }
                              }));
                            }}
                            placeholder="cth: Tahun Pelajaran Lalu"
                            className="h-8 text-xs font-semibold w-52 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                          Rincian Jumlah Siswa Per Rombongan Belajar (Kelas)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {sortedClassesList.map(c => {
                            const classVal = item.byClass?.[c.id] || { male: 0, female: 0 };
                            return (
                              <div key={c.id} className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                                <span className="font-extrabold text-[11px] text-slate-800 block text-center truncate">{c.nama_kelas}</span>
                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <span className="text-[9px] font-bold text-blue-700 block text-center">L</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={classVal.male}
                                      onChange={(e) => {
                                        const mVal = Math.max(0, parseInt(e.target.value) || 0);
                                        setTempRekapForm(prev => {
                                          const currentYr = prev.threeYears![yrKey];
                                          const currentByClass = { ...(currentYr.byClass || {}) };
                                          currentByClass[c.id] = { male: mVal, female: classVal.female };
                                          
                                          let sumM = 0;
                                          let sumF = 0;
                                          sortedClassesList.forEach(cls => {
                                            const val = cls.id === c.id ? { male: mVal, female: classVal.female } : (currentByClass[cls.id] || { male: 0, female: 0 });
                                            sumM += val.male;
                                            sumF += val.female;
                                          });

                                          return {
                                            ...prev,
                                            threeYears: {
                                              ...prev.threeYears,
                                              [yrKey]: {
                                                ...currentYr,
                                                male: sumM,
                                                female: sumF,
                                                byClass: currentByClass
                                              }
                                            }
                                          };
                                        });
                                      }}
                                      className="h-7 text-xs font-mono font-bold text-center text-blue-700 bg-white px-1"
                                    />
                                  </div>

                                  <div>
                                    <span className="text-[9px] font-bold text-pink-700 block text-center">P</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={classVal.female}
                                      onChange={(e) => {
                                        const fVal = Math.max(0, parseInt(e.target.value) || 0);
                                        setTempRekapForm(prev => {
                                          const currentYr = prev.threeYears![yrKey];
                                          const currentByClass = { ...(currentYr.byClass || {}) };
                                          currentByClass[c.id] = { male: classVal.male, female: fVal };

                                          let sumM = 0;
                                          let sumF = 0;
                                          sortedClassesList.forEach(cls => {
                                            const val = cls.id === c.id ? { male: classVal.male, female: fVal } : (currentByClass[cls.id] || { male: 0, female: 0 });
                                            sumM += val.male;
                                            sumF += val.female;
                                          });

                                          return {
                                            ...prev,
                                            threeYears: {
                                              ...prev.threeYears,
                                              [yrKey]: {
                                                ...currentYr,
                                                male: sumM,
                                                female: sumF,
                                                byClass: currentByClass
                                              }
                                            }
                                          };
                                        });
                                      }}
                                      className="h-7 text-xs font-mono font-bold text-center text-pink-700 bg-white px-1"
                                    />
                                  </div>
                                </div>
                                <div className="text-[10px] text-center font-bold text-emerald-800 bg-emerald-100/50 py-0.5 rounded">
                                  Total: {classVal.male + classVal.female}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs font-bold">
                        <span className="text-emerald-900">Total Keseluruhan ({yrKey}):</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-blue-700">L: {item.male}</span>
                          <span className="text-pink-700">P: {item.female}</span>
                          <span className="text-emerald-950 font-black text-sm bg-emerald-200/80 px-2 py-0.5 rounded-md">
                            JML: {item.male + item.female}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bagian 2: Override Jumlah Siswa Per Kelas */}
            <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <School className="w-4 h-4 text-indigo-600" />
                II. Override Rekapitulasi Per Rombongan Belajar (Kelas Aktif)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3">Nama Kelas / Rombel</th>
                      <th className="p-3 w-32 text-center">Laki-laki (L)</th>
                      <th className="p-3 w-32 text-center">Perempuan (P)</th>
                      <th className="p-3 w-32 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rekapitulasiData.rows.map((row) => {
                      const curClassForm = tempRekapForm.classes?.[row.class_id] || { male: row.male, female: row.female };
                      const classStuds = activeStudents.filter(
                        (s) => s.class_id === row.class_id || s.class_id === row.nama_kelas || s.class_id?.toLowerCase() === row.nama_kelas?.toLowerCase()
                      );
                      const autoM = classStuds.filter((s) => s.gender === 'Laki-laki').length;
                      const autoF = classStuds.filter((s) => s.gender === 'Perempuan').length;

                      return (
                        <tr key={row.class_id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-800 uppercase text-xs">{row.nama_kelas}</div>
                            <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1.5 mt-0.5">
                              <span>Hitungan DB: <strong className="text-blue-700">L:{autoM}</strong> <strong className="text-pink-700">P:{autoF}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempRekapForm(prev => ({
                                    ...prev,
                                    classes: {
                                      ...prev.classes,
                                      [row.class_id]: { male: autoM, female: autoF }
                                    }
                                  }));
                                }}
                                className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                              >
                                ⚡ Salin DB
                              </button>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min={0}
                              value={curClassForm.male}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setTempRekapForm(prev => ({
                                  ...prev,
                                  classes: {
                                    ...prev.classes,
                                    [row.class_id]: {
                                      ...(prev.classes?.[row.class_id] || { male: row.male, female: row.female }),
                                      male: val
                                    }
                                  }
                                }));
                              }}
                              className="h-8 font-mono font-bold text-center text-blue-700 bg-blue-50/40 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min={0}
                              value={curClassForm.female}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setTempRekapForm(prev => ({
                                  ...prev,
                                  classes: {
                                    ...prev.classes,
                                    [row.class_id]: {
                                      ...(prev.classes?.[row.class_id] || { male: row.male, female: row.female }),
                                      female: val
                                    }
                                  }
                                }));
                              }}
                              className="h-8 font-mono font-bold text-center text-pink-700 bg-pink-50/40 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-800 text-sm">
                            {curClassForm.male + curClassForm.female}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetRekap}
              className="w-full sm:w-auto text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs rounded-xl h-10 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset ke Hitungan Otomatis
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditRekapModalOpen(false)}
                className="font-bold text-xs rounded-xl h-10 px-4 text-slate-600"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSaveRekap}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl h-10 px-6 gap-2 shadow-lg shadow-amber-600/20"
              >
                <Save className="w-4 h-4" />
                Simpan Data Rekapitulasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Pindah Rombel Massal */}
      <Dialog open={isMassMoveModalOpen} onOpenChange={setIsMassMoveModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 border-0 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-700 mb-2">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Pindah Rombel Massal ({selectedStudentIds.length} Siswa)
            </DialogTitle>
            <p className="text-slate-500 text-xs">
              Pindahkan seluruh siswa yang dipilih ke Rombongan Belajar / Kelas lain secara bersamaan.
            </p>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Selected students summary & preview */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Siswa Terpilih ({selectedStudentIds.length}):</span>
                <span className="text-indigo-600 text-[11px]">
                  {students.filter(s => selectedStudentIds.includes(String(s.id)) && s.gender === 'Laki-laki').length} Laki-laki | {' '}
                  {students.filter(s => selectedStudentIds.includes(String(s.id)) && s.gender === 'Perempuan').length} Perempuan
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200">
                {students.filter(s => selectedStudentIds.includes(String(s.id))).map(s => (
                  <Badge key={s.id} variant="secondary" className="bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-200 py-0.5">
                    {s.name} ({getClassName(s.class_id)})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Target Class Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                Pilih Rombel / Kelas Tujuan <span className="text-rose-500">*</span>
              </label>
              <Select value={massMoveTargetClass} onValueChange={setMassMoveTargetClass}>
                <SelectTrigger className="rounded-xl h-12 bg-white border-slate-300 font-bold text-sm">
                  <SelectValue placeholder="-- Pilih Kelas Tujuan --" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {classes.sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat)).map(c => (
                    <SelectItem key={c.id} value={c.id} className="font-medium text-xs">
                      {c.nama_kelas} (Tingkat {c.tingkat}) - Kapasitas: {c.kapasitas || 30}
                    </SelectItem>
                  ))}
                  <SelectItem value="unassigned" className="font-bold text-rose-600 text-xs">
                    Siswa Tanpa Kelas / Unassigned
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Status Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                Status Siswa
              </label>
              <Select value={massMoveStatus} onValueChange={(v: any) => setMassMoveStatus(v)}>
                <SelectTrigger className="rounded-xl h-11 bg-white border-slate-300 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="keep">Tetap Sesuai Status Sekarang</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="moved">Pindah / Keluar</SelectItem>
                  <SelectItem value="graduated">Lulus (Alumni)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsMassMoveModalOpen(false)}
              disabled={isMovingMass}
              className="rounded-xl font-bold text-xs h-11"
            >
              Batal
            </Button>
            <Button
              onClick={handleExecuteMassMove}
              disabled={isMovingMass || !massMoveTargetClass}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-11 px-6 rounded-xl shadow-lg gap-2"
            >
              {isMovingMass ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memindahkan...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4" />
                  Pindahkan {selectedStudentIds.length} Siswa Sekarang
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Kelulusan Massal Siswa Terpilih */}
      <Dialog open={isGraduateModalOpen} onOpenChange={setIsGraduateModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 border-0 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 mb-2">
              <GraduationCap className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Proses Kelulusan ({selectedStudentIds.length} Siswa Terpilih)
            </DialogTitle>
            <p className="text-slate-500 text-xs">
              Siswa yang terpilih akan diubah statusnya menjadi <span className="font-bold text-amber-800">Lulus (Alumni)</span> dan dipindahkan ke Data Alumni.
            </p>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Selected students summary & preview */}
            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>Rincian Siswa Terpilih ({selectedStudentIds.length}):</span>
                <span className="text-amber-800 text-[11px]">
                  {students.filter(s => selectedStudentIds.includes(String(s.id)) && s.gender === 'Laki-laki').length} Laki-laki | {' '}
                  {students.filter(s => selectedStudentIds.includes(String(s.id)) && s.gender === 'Perempuan').length} Perempuan
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-amber-200/60">
                {students.filter(s => selectedStudentIds.includes(String(s.id))).map(s => (
                  <Badge key={s.id} variant="secondary" className="bg-amber-100/70 text-amber-950 text-[10px] font-semibold border border-amber-300/60 py-0.5">
                    🎓 {s.name} ({getClassName(s.class_id)})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Target Graduation Year */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                Tahun Kelulusan / Angkatan Alumni <span className="text-rose-500">*</span>
              </label>
              <Input
                value={graduateYear}
                onChange={(e) => setGraduateYear(e.target.value)}
                placeholder="cth: 2024/2025"
                className="rounded-xl h-11 bg-white border-slate-300 font-bold text-sm"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold">Pilih Cepat:</span>
                {['2024/2025', '2023/2024', '2025/2026'].map(yr => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setGraduateYear(yr)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                      graduateYear === yr
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                Catatan penting:
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-500">
                <li>Siswa yang lulus dapat dipantau di tab <strong>Data Alumni</strong>.</li>
                <li>Jika terjadi kesalahan, Anda dapat melakukan <em>Restore</em> siswa dari menu Data Alumni.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsGraduateModalOpen(false)}
              disabled={isGraduatingMass}
              className="rounded-xl font-bold text-xs h-11"
            >
              Batal
            </Button>
            <Button
              onClick={handleExecuteMassGraduate}
              disabled={isGraduatingMass || !graduateYear.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs h-11 px-6 rounded-xl shadow-lg gap-2"
            >
              {isGraduatingMass ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses Kelulusan...
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  Luluskan {selectedStudentIds.length} Siswa Sekarang
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default StudentsAdmin;
