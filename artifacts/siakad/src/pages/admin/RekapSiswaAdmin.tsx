"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Printer, FileSpreadsheet, RefreshCw, Loader2,
  ShieldCheck, ArrowRight, School, UserCheck, Calendar, Archive, Clock, Sparkles, Filter,
  Lock, Unlock, Trash2, Plus, Info, CheckCircle2, FolderArchive, RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Link } from 'react-router-dom';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { getStudentRombelForYear } from '@/utils/studentRombelHistory';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  gender: 'Laki-laki' | 'Perempuan' | string;
  status: 'active' | 'graduated' | 'moved' | string;
  class_id: string;
  tahun_pelajaran?: string;
  tahun_masuk?: string;
}

interface ClassRoom {
  id: string;
  nama_kelas: string;
  tingkat: string;
}

interface AcademicArchive {
  id: string;
  academic_year: string;
  semester: string;
  archived_at: string;
  archived_by?: string;
  note?: string;
  summary?: any;
  data?: {
    students?: Student[];
    classes?: ClassRoom[];
  };
}

const DEFAULT_FALLBACK_CLASSES: ClassRoom[] = [
  { id: 'k1', nama_kelas: 'Kelas 1', tingkat: '1' },
  { id: 'k2', nama_kelas: 'Kelas 2', tingkat: '2' },
  { id: 'k3', nama_kelas: 'Kelas 3', tingkat: '3' },
  { id: 'k4', nama_kelas: 'Kelas 4', tingkat: '4' },
  { id: 'k5', nama_kelas: 'Kelas 5', tingkat: '5' },
  { id: 'k6', nama_kelas: 'Kelas 6', tingkat: '6' },
];

const DEFAULT_YEARS = ['2025/2026', '2024/2025', '2023/2024', '2022/2023'];

const RekapSiswaAdmin = () => {
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const { settings } = useSiteSettings();
  const studentsKey = getScopedKey('students_list');
  const classesKey = getScopedKey('kelas_list');
  const archivesKey = getScopedKey('academic_archives');
  const rekapOverridesKey = getScopedKey('rekap_overrides');
  const rekapOverridesStorageKey = `siakad_${getScopedKey('rekap_overrides_cache')}`;
  const legacyStudentsKey = 'students_list';
  const legacyClassesKey = 'kelas_list';
  const legacyArchivesKey = 'academic_archives';
  const legacyRekapOverridesKey = 'rekap_overrides';
  const [loading, setLoading] = useState(true);

  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [academicArchives, setAcademicArchives] = useState<AcademicArchive[]>([]);

  // Dialog & Archive States
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveListOpen, setArchiveListOpen] = useState(false);
  const [archiveNote, setArchiveNote] = useState('');
  const [savingArchive, setSavingArchive] = useState(false);

  const [rekapOverrides, setRekapOverrides] = useState<any>({});

  // Active year from settings or fallback
  const activeYear = settings.tahun_pelajaran?.active_year || '2024/2025';
  const [selectedYear, setSelectedYear] = useState<string>(activeYear);

  useEffect(() => {
    if (settings.tahun_pelajaran?.active_year) {
      setSelectedYear(settings.tahun_pelajaran.active_year);
    }
  }, [settings.tahun_pelajaran?.active_year]);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime database changes for site_settings
    const channel = supabase
      .channel('public:site_settings:rekap_siswa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMadrasah.id, studentsKey, classesKey, archivesKey, rekapOverridesKey, rekapOverridesStorageKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch site_settings where students_list, kelas_list, academic_archives, and rekap_overrides are stored
      const { data: res, error: resErr } = await supabase
        .from('site_settings')
        .select('id, value');

      if (resErr) {
        console.warn('Warning fetching site_settings in RekapSiswaAdmin:', resErr);
      }

      const classData = res?.find((s: any) => s.id === classesKey)?.value
        || res?.find((s: any) => s.id === legacyClassesKey)?.value;
      const studentData = res?.find((s: any) => s.id === studentsKey)?.value
        || res?.find((s: any) => s.id === legacyStudentsKey)?.value;
      const archivesData = res?.find((s: any) => s.id === archivesKey)?.value
        || res?.find((s: any) => s.id === legacyArchivesKey)?.value;
      const rekapData = res?.find((s: any) => s.id === rekapOverridesKey)?.value
        || res?.find((s: any) => s.id === legacyRekapOverridesKey)?.value;

      let loadedClasses = Array.isArray(classData) && classData.length > 0 ? classData : [];
      let loadedStudents = Array.isArray(studentData) && studentData.length > 0 ? studentData : [];

      if (rekapData && typeof rekapData === 'object') {
        setRekapOverrides(rekapData);
        if (Object.keys(rekapData).length > 0) {
          localStorage.setItem(rekapOverridesStorageKey, JSON.stringify(rekapData));
        } else {
          localStorage.removeItem(rekapOverridesStorageKey);
        }
      }

      // Fallback 1: Context settings
      if (loadedClasses.length === 0 && settings.kelas_list && Array.isArray(settings.kelas_list) && settings.kelas_list.length > 0) {
        loadedClasses = settings.kelas_list;
      }
      if (loadedStudents.length === 0 && settings.students_list && Array.isArray(settings.students_list) && settings.students_list.length > 0) {
        loadedStudents = settings.students_list;
      }

      // Fallback 2: LocalStorage cache
      if (loadedClasses.length === 0 || loadedStudents.length === 0) {
        try {
          const cachedStr = localStorage.getItem('siakad_site_settings');
          if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (loadedStudents.length === 0 && cached[studentsKey]) {
              loadedStudents = cached[studentsKey];
            }
            if (loadedClasses.length === 0 && cached[classesKey]) {
              loadedClasses = cached[classesKey];
            }
          }
        } catch (e) {
          console.warn('LocalStorage parse error:', e);
        }
      }

      // Fallback 3: Defaults
      if (loadedClasses.length === 0) loadedClasses = DEFAULT_FALLBACK_CLASSES;
      if (loadedStudents.length === 0) loadedStudents = DEFAULT_FALLBACK_STUDENTS;

      setClasses(loadedClasses);
      setRawStudents(loadedStudents);

      if (Array.isArray(archivesData)) {
        setAcademicArchives(archivesData);
      }
    } catch (err: any) {
      console.error('Error in RekapSiswaAdmin:', err);
    } finally {
      setLoading(false);
    }
  };

  // Available Academic Years for Selection
  const availableYears = useMemo(() => {
    const setYears = new Set<string>();

    if (activeYear) setYears.add(activeYear);

    const settingsYears = settings.tahun_pelajaran?.available_years;
    if (Array.isArray(settingsYears)) {
      settingsYears.forEach((y: string) => setYears.add(y));
    }

    DEFAULT_YEARS.forEach(y => setYears.add(y));

    academicArchives.forEach(arch => {
      if (arch.academic_year) setYears.add(arch.academic_year);
    });

    rawStudents.forEach(s => {
      if (s.tahun_pelajaran) setYears.add(s.tahun_pelajaran);
      if (s.tahun_masuk) setYears.add(s.tahun_masuk);
    });

    return Array.from(setYears).sort().reverse();
  }, [activeYear, settings.tahun_pelajaran, academicArchives, rawStudents]);

  // Determine current effective students and classes for the selected academic year
  const { effectiveStudents, effectiveClasses, isArchivedView, archiveInfo } = useMemo(() => {
    const normSelectedYear = (selectedYear || '').trim();
    const normActiveYear = (activeYear || '').trim();

    // 1. Check if there is a frozen archive snapshot matching selectedYear (only for non-active years)
    const matchingArchive = normSelectedYear !== normActiveYear ? academicArchives.find(a =>
      (a.academic_year || '').toString().trim() === normSelectedYear
    ) : null;

    if (matchingArchive) {
      const archStudents = matchingArchive.data?.students || matchingArchive.students || [];
      const archClasses = (matchingArchive.data?.classes && matchingArchive.data.classes.length > 0)
        ? matchingArchive.data.classes
        : classes;

      return {
        effectiveStudents: archStudents,
        effectiveClasses: archClasses,
        isArchivedView: true,
        archiveInfo: matchingArchive
      };
    }

    // 2. If no archive snapshot exists yet, filter students for selectedYear intelligently
    const parseYearStart = (yStr: string) => {
      const m = yStr.match(/(\d{4})/);
      return m ? parseInt(m[1], 10) : 0;
    };

    const selectedStart = parseYearStart(normSelectedYear);
    const activeStart = parseYearStart(normActiveYear);

    const filteredStudents = rawStudents.filter((s: any) => {
      const sStatus = (s.status || '').toLowerCase().trim();
      const sTahunPel = (s.tahun_pelajaran || '').toString().trim();
      const sTahunMasuk = (s.tahun_masuk || '').toString().trim();
      const sTahunLulus = (s.tahun_lulus || '').toString().trim();

      if (sStatus === 'graduated' || sStatus === 'lulus' || sStatus === 'moved' || sStatus === 'pindah') {
        if (normSelectedYear === normActiveYear || !normSelectedYear) {
          return false;
        }
      }

      const pelStart = parseYearStart(sTahunPel);
      const masukStart = parseYearStart(sTahunMasuk);
      const lulusStart = parseYearStart(sTahunLulus);

      // Exclude students belonging to a future academic year
      if (selectedStart > 0) {
        if (pelStart > selectedStart) return false;
        if (masukStart > selectedStart) return false;
      }

      // Direct field match on student record
      if (sTahunPel === normSelectedYear) {
        if (sStatus === 'graduated' || sStatus === 'lulus') return sTahunLulus === normSelectedYear;
        return sStatus === 'active' || sStatus === 'aktif' || !sStatus;
      }

      if (sTahunMasuk === normSelectedYear) {
        if (sStatus === 'graduated' || sStatus === 'lulus') return sTahunLulus === normSelectedYear;
        return sStatus === 'active' || sStatus === 'aktif' || !sStatus;
      }

      // For graduated / alumni students
      if (sStatus === 'graduated' || sStatus === 'lulus') {
        if (sTahunLulus === normSelectedYear) return true;
        if (lulusStart > selectedStart && selectedStart > 0) {
          if (masukStart === 0 || masukStart <= selectedStart) {
            return true;
          }
        }
        return false;
      }

      // For currently active students
      if (sStatus === 'active' || sStatus === 'aktif' || !sStatus) {
        if (selectedStart > 0) {
          if (masukStart > 0 && masukStart > selectedStart) return false;
          if (pelStart > 0 && pelStart > selectedStart) return false;
        }
        return true;
      }

      return false;
    });

    const targetYear = normSelectedYear || normActiveYear || '2026/2027';
    let filteredClasses = classes.filter(c => c.tahun_pelajaran === targetYear);
    if (filteredClasses.length === 0) {
      filteredClasses = classes.filter(c => !c.tahun_pelajaran);
    }
    if (filteredClasses.length === 0) {
      const map = new Map<string, any>();
      classes.forEach(c => {
        const key = (c.tingkat || c.nama_kelas || '').toString().toLowerCase().trim();
        if (!map.has(key)) map.set(key, c);
      });
      filteredClasses = Array.from(map.values());
    }
    const uniqueClassesMap = new Map<string, any>();
    filteredClasses.forEach(c => {
      const key = (c.tingkat || c.nama_kelas || '').toString().toLowerCase().trim();
      if (!uniqueClassesMap.has(key)) uniqueClassesMap.set(key, c);
    });
    const sortedEffectiveClasses = Array.from(uniqueClassesMap.values()).sort((a, b) => parseInt(a.tingkat || '0') - parseInt(b.tingkat || '0'));

    return {
      effectiveStudents: filteredStudents,
      effectiveClasses: sortedEffectiveClasses,
      isArchivedView: false,
      archiveInfo: null
    };
  }, [selectedYear, activeYear, academicArchives, rawStudents, classes]);

  // Compute rekap per class for the selected academic year
  const classSummary = useMemo(() => {
    const classRows = effectiveClasses.map((c) => {
      const cId = (c.id || '').toString().toLowerCase().trim();
      const cName = (c.nama_kelas || '').toString().toLowerCase().trim();
      const cTingkat = (c.tingkat || '').toString().toLowerCase().trim();

      const classStudents = effectiveStudents.filter((s: any) => {
        const sStatus = (s.status || '').toLowerCase().trim();
        if (sStatus === 'graduated' || sStatus === 'lulus' || sStatus === 'moved' || sStatus === 'pindah') return false;

        if (!isArchivedView) {
          const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedYear || activeYear);
          const r1 = (sClassId || '').toString().toLowerCase().trim();
          const r2 = (sRombel || '').toString().toLowerCase().trim();
          if (r1 === cId || r2 === cName || r2 === cTingkat || r2 === `kelas ${cTingkat}`) return true;

          const sDigits = (r2 || r1).replace(/[^0-9]/g, '');
          const cDigits = cTingkat || cName.replace(/[^0-9]/g, '');
          if (sDigits && cDigits && sDigits === cDigits && !r2.includes('alumni') && !r2.includes('lulus')) return true;

          return false;
        }

        const sClass = (s.class_id || s.kelas || s.rombel || '').toString().toLowerCase().trim();
        if (sClass === cId || sClass === cName || sClass === cTingkat || sClass === `kelas ${cTingkat}`) return true;

        const sDigits = sClass.replace(/[^0-9]/g, '');
        const cDigits = cTingkat || cName.replace(/[^0-9]/g, '');
        if (sDigits && cDigits && sDigits === cDigits && !sClass.includes('alumni') && !sClass.includes('lulus')) return true;

        return false;
      });

      let male = classStudents.filter((s) => s.gender === 'Laki-laki' || s.gender === 'L').length;
      let female = classStudents.filter((s) => s.gender === 'Perempuan' || s.gender === 'P').length;

      // Apply override if configured in site_settings/localStorage rekap_overrides
      if (!isArchivedView && rekapOverrides) {
        const threeYearClassOverride = rekapOverrides.threeYears?.[selectedYear]?.byClass?.[c.id] ||
                                        rekapOverrides.threeYears?.[selectedYear]?.byClass?.[c.nama_kelas];
        const globalClassOverride = rekapOverrides.classes?.[c.id] || rekapOverrides.classes?.[c.nama_kelas];
        const overrideVal = threeYearClassOverride || (selectedYear === activeYear ? globalClassOverride : null);

        if (overrideVal) {
          if (typeof overrideVal.male === 'number') male = overrideVal.male;
          if (typeof overrideVal.female === 'number') female = overrideVal.female;
        }
      }

      return {
        id: c.id,
        nama_kelas: c.nama_kelas,
        tingkat: c.tingkat,
        male,
        female,
        total: male + female,
      };
    });

    // Check for students without matched class
    const unassigned = effectiveStudents.filter((s: any) => {
      const sClass = (s.class_id || s.kelas || '').toString().toLowerCase().trim();
      if (!sClass || sClass === 'unassigned' || sClass === 'tanpa_rombel' || sClass === '-') return true;
      return !effectiveClasses.some((c) => {
        const cId = (c.id || '').toString().toLowerCase().trim();
        const cName = (c.nama_kelas || '').toString().toLowerCase().trim();
        return sClass === cId || sClass === cName;
      });
    });

    if (unassigned.length > 0) {
      const male = unassigned.filter((s) => s.gender === 'Laki-laki' || s.gender === 'L').length;
      const female = unassigned.filter((s) => s.gender === 'Perempuan' || s.gender === 'P').length;
      classRows.push({
        id: 'unassigned',
        nama_kelas: 'Siswa Belum Ada Kelas',
        tingkat: '-',
        male,
        female,
        total: male + female,
      });
    }

    let totalMale = classRows.reduce((acc, r) => acc + r.male, 0);
    let totalFemale = classRows.reduce((acc, r) => acc + r.female, 0);

    // If there is an overall male/female override for this year in rekapOverrides.threeYears
    if (!isArchivedView && rekapOverrides?.threeYears?.[selectedYear]) {
      const yrOv = rekapOverrides.threeYears[selectedYear];
      if (typeof yrOv.male === 'number' && typeof yrOv.female === 'number' && !yrOv.byClass) {
        totalMale = yrOv.male;
        totalFemale = yrOv.female;
      }
    }

    const totalAll = totalMale + totalFemale;

    return {
      rows: classRows,
      totalMale,
      totalFemale,
      totalAll,
    };
  }, [effectiveClasses, effectiveStudents, isArchivedView, rekapOverrides, selectedYear, activeYear]);

  const sortedClassesList = useMemo(() => {
    const targetYear = (selectedYear || activeYear || '2026/2027').trim();
    let yearClasses = classes.filter(c => c.tahun_pelajaran === targetYear);
    if (yearClasses.length === 0) {
      yearClasses = classes.filter(c => !c.tahun_pelajaran);
    }
    if (yearClasses.length === 0) {
      const map = new Map<string, any>();
      classes.forEach(c => {
        const key = (c.tingkat || c.nama_kelas || '').toString().toLowerCase().trim();
        if (!map.has(key)) map.set(key, c);
      });
      yearClasses = Array.from(map.values());
    }
    const uniqueMap = new Map<string, any>();
    yearClasses.forEach(c => {
      const key = (c.tingkat || c.nama_kelas || '').toString().toLowerCase().trim();
      if (!uniqueMap.has(key)) uniqueMap.set(key, c);
    });
    return Array.from(uniqueMap.values()).sort((a, b) => parseInt(a.tingkat || '0') - parseInt(b.tingkat || '0'));
  }, [classes, selectedYear, activeYear]);

  const threeYearSummary = useMemo(() => {
    const activeYearStr = selectedYear || activeYear || '2024/2025';
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
      { year: y3, defaultLabel: 'Tahun Pelajaran (Terpilih/Aktif)' },
    ];

    return yearsInfo.map(({ year, defaultLabel }) => {
      const normYear = (year || '').trim();
      const normActiveYear = (activeYear || '').trim();

      // 1. Check if frozen academic archive snapshot exists (only for non-active years)
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

      const yearStudents = rawStudents.filter((s: any) => {
        const sStatus = (s.status || '').toLowerCase().trim();
        const sTahunPel = (s.tahun_pelajaran || '').toString().trim();
        const sTahunMasuk = (s.tahun_masuk || '').toString().trim();
        const sTahunLulus = (s.tahun_lulus || '').toString().trim();

        if (normYear === normActiveYear) {
          return sStatus === 'active' || sStatus === 'aktif' || !sStatus;
        }

        if (sTahunPel === normYear || sTahunMasuk === normYear) return true;

        const lulusStart = parseYearStart(sTahunLulus);
        const masukStart = parseYearStart(sTahunMasuk);

        if (sStatus === 'graduated' || sStatus === 'lulus') {
          if (sTahunLulus === normYear) return true;
          if (lulusStart > 0 && yearStart > 0) {
            return lulusStart >= yearStart && (masukStart === 0 || masukStart <= yearStart);
          }
          return false;
        }

        if (sStatus === 'active' || sStatus === 'aktif' || !sStatus) {
          if (yearStart > 0 && activeStart > 0 && yearStart < activeStart) {
            if (masukStart > 0 && masukStart > yearStart) return false;
            return true;
          }
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
  }, [selectedYear, activeYear, academicArchives, rawStudents, rekapOverrides, sortedClassesList]);

  const hasActiveOverride = useMemo(() => {
    if (!rekapOverrides || isArchivedView) return false;
    if (rekapOverrides.classes && Object.keys(rekapOverrides.classes).length > 0) return true;
    if (rekapOverrides.threeYears && Object.keys(rekapOverrides.threeYears).length > 0) return true;
    return false;
  }, [rekapOverrides, isArchivedView]);

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
    showSuccess('Data rekapitulasi berhasil dikembalikan ke hitungan otomatis dari data Rombel!');
  };

  const handleSaveArchive = async () => {
    setSavingArchive(true);
    try {
      const newArchiveItem: AcademicArchive = {
        id: `arch_${selectedYear.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        academic_year: selectedYear,
        semester: 'Genap',
        archived_at: new Date().toISOString(),
        archived_by: 'Administrator Madrasah',
        note: archiveNote.trim() || 'Arsip resmi bekuan rekapitulasi siswa tahun pelajaran',
        summary: {
          totalAll: classSummary.totalAll,
          totalMale: classSummary.totalMale,
          totalFemale: classSummary.totalFemale,
          totalClasses: classSummary.rows.length,
        },
        data: {
          students: effectiveStudents,
          classes: effectiveClasses,
        }
      };

      const updatedArchives = academicArchives.filter(a => a.academic_year !== selectedYear);
      updatedArchives.push(newArchiveItem);

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: archivesKey,
          value: updatedArchives,
        });

      if (error) throw error;

      setAcademicArchives(updatedArchives);
      setArchiveDialogOpen(false);
      setArchiveNote('');
      showSuccess(`Data rekapitulasi siswa TP ${selectedYear} berhasil dibekukan dan diarsipkan!`);
    } catch (err: any) {
      console.error('Error saving archive:', err);
      showError(err?.message || 'Gagal menyimpan arsip rekapitulasi.');
    } finally {
      setSavingArchive(false);
    }
  };

  const handleDeleteArchive = async (yearToDelete: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin membuka/menghapus kuncian arsip rekap TP ${yearToDelete}? Data akan kembali dihitung live dari database.`)) {
      return;
    }

    try {
      const updatedArchives = academicArchives.filter(a => a.academic_year !== yearToDelete);

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: archivesKey,
          value: updatedArchives,
        });

      if (error) throw error;

      setAcademicArchives(updatedArchives);
      showSuccess(`Kuncian arsip rekap TP ${yearToDelete} berhasil dibuka/dihapus.`);
    } catch (err: any) {
      console.error('Error deleting archive:', err);
      showError('Gagal membuka/menghapus kuncian arsip.');
    }
  };

  const exportExcel = () => {
    const exportData = classSummary.rows.map((r, idx) => ({
      No: idx + 1,
      'Rombel / Kelas': r.nama_kelas,
      'Laki-Laki (L)': r.male,
      'Perempuan (P)': r.female,
      'Total Siswa': r.total,
    }));

    exportData.push({
      No: 'TOTAL',
      'Rombel / Kelas': 'JUMLAH KESELURUHAN SISWA',
      'Laki-Laki (L)': classSummary.totalMale,
      'Perempuan (P)': classSummary.totalFemale,
      'Total Siswa': classSummary.totalAll,
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap Siswa ${selectedYear.replace('/', '-')}`);
    XLSX.writeFile(wb, `Rekapitulasi_Siswa_TP_${selectedYear.replace('/', '-')}_${activeMadrasah.nama_madrasah || 'Madrasah'}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Printable Header */}
        <div className="hidden print:block mb-6">
          <KopSurat />
          <div className="text-center my-4">
            <h2 className="text-base font-bold uppercase underline">REKAPITULASI JUMLAH SISWA PER ROMBEL</h2>
            <p className="text-xs font-bold mt-1">Tahun Pelajaran: {selectedYear}</p>
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden print:hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-emerald-700/60 backdrop-blur-md px-3 py-1 rounded-full text-emerald-200 text-xs font-semibold border border-emerald-500/30">
                <Users className="w-4 h-4 text-emerald-300" />
                Arsip &amp; Rekapitulasi Berdasarkan Tahun Pelajaran
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Arsip Rekapitulasi Siswa Madrasah
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl">
                Laporan rekapitulasi keadaan jumlah siswa aktif per rombel kelas yang difilter khusus berdasarkan tahun pelajaran aktif dan arsip historical.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => setArchiveListOpen(true)}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <FolderArchive className="w-4 h-4 text-emerald-300" /> Riwayat Arsip TP ({academicArchives.length})
              </Button>
              {isArchivedView ? (
                <Button
                  type="button"
                  onClick={() => handleDeleteArchive(selectedYear)}
                  variant="outline"
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border-amber-400/40 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
                >
                  <Unlock className="w-4 h-4 text-amber-300" /> Buka Kuncian Arsip
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setArchiveDialogOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs gap-2 px-4 py-6 shadow-lg shadow-emerald-950/20"
                >
                  <Lock className="w-4 h-4" /> Bekukan Arsip TP Ini
                </Button>
              )}
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
                className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold rounded-2xl text-xs gap-2 px-5 py-6 shadow-lg shadow-slate-950/20"
              >
                <Printer className="w-4 h-4 text-emerald-700" /> Cetak
              </Button>
            </div>
          </div>
        </div>

        {/* Academic Year Selection Bar */}
        <Card className="border-0 shadow-md rounded-2xl bg-white p-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span>PILIH TAHUN PELAJARAN</span>
                  <Badge variant="outline" className="text-[10px] bg-slate-100 border-slate-300">
                    {selectedYear === activeYear ? 'Tahun Aktif' : 'Arsip TP'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pilih tahun pelajaran untuk melihat rekapitulasi siswa periode tersebut.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="rounded-xl text-xs font-bold bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Pilih Tahun Pelajaran" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    {availableYears.map((yr) => (
                      <SelectItem key={yr} value={yr} className="font-bold text-xs">
                        Tahun Pelajaran {yr} {yr === activeYear ? '(Aktif)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Filter Pills */}
              <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {availableYears.slice(0, 4).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      selectedYear === yr
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Status Notification Banner */}
        {isArchivedView ? (
          <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-start gap-3">
              <Archive className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950 space-y-1">
                <div className="font-extrabold flex items-center gap-2">
                  <span>Data Arsip Terkunci - Tahun Pelajaran {selectedYear}</span>
                  <Badge className="bg-indigo-100 text-indigo-800 border-0 font-bold text-[10px]">Snapshot Akademik</Badge>
                </div>
                <p className="text-indigo-800">
                  Rekapitulasi ini diambil dari dokumen arsip resmi yang dibekukan pada tanggal{' '}
                  <strong>{archiveInfo?.archived_at ? new Date(archiveInfo.archived_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</strong>.
                  {archiveInfo?.note && <span> Catatan: {archiveInfo.note}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => setArchiveDialogOpen(true)}
                variant="outline"
                className="bg-white border-indigo-200 text-indigo-800 hover:bg-indigo-100 text-xs font-bold rounded-xl"
              >
                Perbarui Snapshot
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleDeleteArchive(selectedYear)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" /> Buka Kuncian
              </Button>
            </div>
          </div>
        ) : hasActiveOverride ? (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 space-y-1">
                <div className="font-extrabold flex items-center gap-2">
                  <span>Data Rekap Manual Override - Tahun Pelajaran {selectedYear}</span>
                  <Badge className="bg-amber-100 text-amber-800 border-0 font-bold text-[10px]">Override Disimpan</Badge>
                </div>
                <p className="text-amber-800">
                  Data rekapitulasi saat ini sedang di-override/disesuaikan secara manual. Klik tombol "Kembalikan ke Otomatis" untuk mereset dan menghitung ulang angka secara otomatis dari database Rombel.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={handleResetRekap}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Kembalikan ke Otomatis
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setArchiveDialogOpen(true)}
                variant="outline"
                className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold rounded-xl"
              >
                <Lock className="w-3.5 h-3.5" /> Bekukan Rekap
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 space-y-1">
                <div className="font-extrabold flex items-center gap-2">
                  <span>Data Live Hitungan Otomatis - Tahun Pelajaran {selectedYear}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 font-bold text-[10px]">
                    {selectedYear === activeYear ? 'Sedang Berjalan' : 'Filtered Database'}
                  </Badge>
                </div>
                <p className="text-emerald-800">
                  Data siswa pada tabel ini dihitung secara langsung &amp; otomatis dari daftar siswa aktif di database kesiswaan madrasah.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleResetRekap}
                className="bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs font-bold rounded-xl gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-700" /> Kembalikan ke Otomatis
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setArchiveDialogOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl shrink-0 gap-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" /> Bekukan Data Rekap TP Ini
              </Button>
            </div>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <Card className="border-0 shadow-md rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Siswa TP {selectedYear}</p>
                <p className="text-3xl font-black text-emerald-950 mt-1">{classSummary.totalAll} Siswa</p>
                <p className="text-[11px] text-emerald-700 mt-1">Terdaftar di Periode {selectedYear}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-blue-50/60 border border-blue-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Laki-Laki (L)</p>
                <p className="text-3xl font-black text-blue-950 mt-1">{classSummary.totalMale} Siswa</p>
                <p className="text-[11px] text-blue-700 mt-1">
                  {classSummary.totalAll > 0 ? Math.round((classSummary.totalMale / classSummary.totalAll) * 100) : 0}% Dari Total Siswa
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <UserCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-pink-50/60 border border-pink-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-pink-800 uppercase tracking-wider">Perempuan (P)</p>
                <p className="text-3xl font-black text-pink-950 mt-1">{classSummary.totalFemale} Siswa</p>
                <p className="text-[11px] text-pink-700 mt-1">
                  {classSummary.totalAll > 0 ? Math.round((classSummary.totalFemale / classSummary.totalAll) * 100) : 0}% Dari Total Siswa
                </p>
              </div>
              <div className="w-12 h-12 bg-pink-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <UserCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real Data Table Card */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <School className="w-5 h-5 text-emerald-600" /> Tabel Rekapitulasi Rombel (TP {selectedYear})
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian keadaan jumlah siswa per kelas rombel untuk Tahun Pelajaran {selectedYear}.
              </CardDescription>
            </div>

            <Link to="/admin/students">
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs gap-2 shadow-md shadow-emerald-600/20"
              >
                Kelola Detail Data Siswa <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-xs font-bold text-slate-500">Memuat data rekapitulasi siswa TP {selectedYear}...</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Table className="w-full text-xs text-left border-collapse">
                  <TableHeader>
                    <TableRow className="bg-slate-100/90 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <TableHead className="p-3 text-center w-12 border-r border-slate-200">No</TableHead>
                      <TableHead className="p-3 border-r border-slate-200">Tingkat / Kelas Rombel</TableHead>
                      <TableHead className="p-3 text-center border-r border-slate-200 bg-blue-50/60 text-blue-900">Laki-Laki (L)</TableHead>
                      <TableHead className="p-3 text-center border-r border-slate-200 bg-pink-50/60 text-pink-900">Perempuan (P)</TableHead>
                      <TableHead className="p-3 text-center border-r border-slate-200 bg-emerald-50 text-emerald-950 font-extrabold">Total Siswa</TableHead>
                      <TableHead className="p-3 border-r border-slate-200">Status Rombel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-200">
                    {classSummary.rows.map((row, idx) => (
                      <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="p-3 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</TableCell>
                        <TableCell className="p-3 font-bold text-slate-800 border-r border-slate-200">{row.nama_kelas}</TableCell>
                        <TableCell className="p-3 text-center font-bold text-blue-700 border-r border-slate-200">{row.male}</TableCell>
                        <TableCell className="p-3 text-center font-bold text-pink-700 border-r border-slate-200">{row.female}</TableCell>
                        <TableCell className="p-3 text-center font-extrabold text-emerald-900 bg-emerald-50/40 border-r border-slate-200 font-mono text-xs">
                          {row.total}
                        </TableCell>
                        <TableCell className="p-3 text-slate-600 border-r border-slate-200">
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 font-bold text-[10px]">
                            {row.total > 0 ? `${row.total} Siswa Terdaftar` : 'Rombel Kosong'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                      <TableCell className="p-3 text-center border-r border-slate-200" colSpan={2}>
                        JUMLAH KESELURUHAN SISWA MADRASAH (TP {selectedYear})
                      </TableCell>
                      <TableCell className="p-3 text-center text-blue-900 border-r border-slate-200 font-mono text-xs">
                        {classSummary.totalMale}
                      </TableCell>
                      <TableCell className="p-3 text-center text-pink-900 border-r border-slate-200 font-mono text-xs">
                        {classSummary.totalFemale}
                      </TableCell>
                      <TableCell className="p-3 text-center text-emerald-950 font-black bg-emerald-200/80 border-r border-slate-200 font-mono text-sm">
                        {classSummary.totalAll}
                      </TableCell>
                      <TableCell className="p-3 border-r border-slate-200 text-emerald-800">
                        Total {classSummary.rows.length} Rombel
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            )}

            {/* Section II: Rekapitulasi Perkembangan Siswa Per 3 Tahun Pelajaran */}
            <div className="pt-6 border-t border-slate-200 mt-8">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  II. Rekapitulasi Otomatis Perkembangan Siswa Per 3 Tahun Pelajaran
                </span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  (Terkoneksi Otomatis dengan Arsip Kebijakan Bekuan TP)
                </span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                <Table className="w-full text-center text-xs border-collapse">
                  <TableHeader>
                    <TableRow className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      <TableHead rowSpan={3} className="p-3 w-10 border-r border-slate-800 align-middle text-center text-white">
                        NO
                      </TableHead>
                      <TableHead rowSpan={3} className="p-3 text-center border-r border-slate-800 align-middle min-w-[120px] text-white">
                        TAHUN PELAJARAN
                      </TableHead>
                      <TableHead colSpan={sortedClassesList.length * 2 + 3} className="p-2.5 border-b border-r border-slate-800 bg-emerald-950 text-center uppercase tracking-wider text-xs font-black text-emerald-200">
                        JUMLAH SISWA PER ROMBEL
                      </TableHead>
                      <TableHead rowSpan={3} className="p-3 text-left border-l border-slate-800 align-middle min-w-[130px] text-white">
                        KETERANGAN / STATUS ARSIP
                      </TableHead>
                    </TableRow>

                    <TableRow className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      {sortedClassesList.map((c) => (
                        <TableHead key={c.id} colSpan={2} className="p-2 border-r border-slate-800 bg-slate-800 text-center text-xs font-extrabold min-w-[65px] text-slate-200">
                          {c.nama_kelas}
                        </TableHead>
                      ))}
                      <TableHead colSpan={3} className="p-2 border-r border-slate-800 bg-emerald-900 text-center text-xs font-black min-w-[140px] text-emerald-100">
                        TOTAL KESELURUHAN
                      </TableHead>
                    </TableRow>

                    <TableRow className="bg-slate-900 text-white font-bold text-center border-b border-slate-800 text-[11px]">
                      {sortedClassesList.map((c) => (
                        <React.Fragment key={`sub-${c.id}`}>
                          <TableHead className="p-1.5 w-9 bg-blue-900/80 border-r border-slate-800 font-mono text-blue-200 text-center">L</TableHead>
                          <TableHead className="p-1.5 w-9 bg-pink-900/80 border-r border-slate-800 font-mono text-pink-200 text-center">P</TableHead>
                        </React.Fragment>
                      ))}
                      <TableHead className="p-1.5 w-11 bg-blue-900/90 border-r border-slate-800 font-mono text-blue-200 text-center">L</TableHead>
                      <TableHead className="p-1.5 w-11 bg-pink-900/90 border-r border-slate-800 font-mono text-pink-200 text-center">P</TableHead>
                      <TableHead className="p-1.5 w-12 bg-emerald-900 border-r border-slate-800 font-mono text-emerald-200 font-black text-center">JML</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="divide-y divide-slate-200 text-slate-700 bg-white font-medium">
                    {threeYearSummary.map((row, idx) => (
                      <TableRow
                        key={row.year}
                        className={`hover:bg-emerald-50/40 transition-colors ${
                          row.year === selectedYear ? 'bg-emerald-50/60 font-bold' : ''
                        }`}
                      >
                        <TableCell className="p-3 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</TableCell>
                        <TableCell className="p-3 text-center font-bold text-slate-900 border-r border-slate-200 font-mono text-xs">
                          {row.year}
                        </TableCell>

                        {sortedClassesList.map((c) => {
                          const classData = row.byClass[c.id] || { male: 0, female: 0 };
                          return (
                            <React.Fragment key={`val-${row.year}-${c.id}`}>
                              <TableCell className="p-2 text-center font-mono font-bold text-blue-700 bg-blue-50/20 border-r border-slate-200 text-xs">
                                {classData.male}
                              </TableCell>
                              <TableCell className="p-2 text-center font-mono font-bold text-pink-700 bg-pink-50/20 border-r border-slate-200 text-xs">
                                {classData.female}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}

                        <TableCell className="p-2 text-center font-mono font-bold text-blue-800 bg-blue-100/40 border-r border-slate-200 text-xs">
                          {row.male}
                        </TableCell>
                        <TableCell className="p-2 text-center font-mono font-bold text-pink-800 bg-pink-100/40 border-r border-slate-200 text-xs">
                          {row.female}
                        </TableCell>
                        <TableCell className="p-2 text-center font-mono font-black text-emerald-900 bg-emerald-100/60 text-sm border-r border-slate-200">
                          {row.total}
                        </TableCell>

                        <TableCell className="p-3 text-left border-slate-200">
                          {row.isArchived ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] gap-1">
                              <Lock className="w-3 h-3 text-emerald-700" />
                              Arsip Bekuan Resmi
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[10px] gap-1">
                              <RefreshCw className="w-3 h-3 text-slate-500" />
                              Hitungan Live DB
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Printable Signature */}
        <div className="hidden print:block mt-12">
          <PenandatanganDokumen />
        </div>

        {/* Modal Bekukan / Simpan Arsip TP */}
        <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Lock className="w-5 h-5 text-emerald-600" />
                Bekukan &amp; Arsipkan Rekap TP {selectedYear}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Langkah ini akan mengambil snapshot permanen rekapitulasi siswa tahun pelajaran {selectedYear} dan menguncinya dari perubahan data otomatis di masa mendatang.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                <p className="font-extrabold text-emerald-950">Ringkasan Rekap yang Akan Dibekukan:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-900 pt-1">
                  <div>• Total Siswa: <strong>{classSummary.totalAll} orang</strong></div>
                  <div>• Laki-laki: <strong>{classSummary.totalMale} orang</strong></div>
                  <div>• Perempuan: <strong>{classSummary.totalFemale} orang</strong></div>
                  <div>• Rombel: <strong>{classSummary.rows.length} kelas</strong></div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Catatan Arsip (Opsional)</label>
                <Textarea
                  value={archiveNote}
                  onChange={(e) => setArchiveNote(e.target.value)}
                  placeholder="Contoh: Bekuan resmi setelah rapat pleno akhir tahun ajaran"
                  className="text-xs rounded-xl border-slate-200"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveDialogOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSaveArchive}
                disabled={savingArchive}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold gap-2"
              >
                {savingArchive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Simpan &amp; Bekukan Arsip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Riwayat Daftar Arsip TP */}
        <Dialog open={archiveListOpen} onOpenChange={setArchiveListOpen}>
          <DialogContent className="sm:max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <FolderArchive className="w-5 h-5 text-emerald-600" />
                Daftar Arsip Rekapitulasi Siswa Per Tahun Pelajaran
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Daftar snapshot bekuan rekapitulasi siswa yang telah disimpan secara permanen di database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 py-2">
              {academicArchives.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Archive className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Belum Ada Rekap yang Dibekukan / Diarsipkan</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Anda dapat membekukan rekapitulasi siswa tahun pelajaran tertentu dengan mengeklik tombol "Bekukan Data Rekap TP Ini".
                  </p>
                </div>
              ) : (
                academicArchives.map((arch) => (
                  <div
                    key={arch.id || arch.academic_year}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      selectedYear === arch.academic_year
                        ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">
                          Tahun Pelajaran {arch.academic_year}
                        </span>
                        <Badge className="bg-indigo-100 text-indigo-800 border-0 text-[10px] font-bold">
                          Snapshot
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Dibekukan: {arch.archived_at ? new Date(arch.archived_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                      {arch.note && (
                        <p className="text-[11px] text-slate-600 italic">"{arch.note}"</p>
                      )}
                      {arch.summary && (
                        <div className="text-[11px] font-bold text-emerald-800 pt-0.5">
                          Total: {arch.summary.totalAll} Siswa (L: {arch.summary.totalMale}, P: {arch.summary.totalFemale})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedYear(arch.academic_year);
                          setArchiveListOpen(false);
                        }}
                        className={`text-xs rounded-xl font-bold ${
                          selectedYear === arch.academic_year
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-800 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {selectedYear === arch.academic_year ? 'Sedang Dilihat' : 'Lihat Rekap'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteArchive(arch.academic_year)}
                        className="text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveListOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default RekapSiswaAdmin;
