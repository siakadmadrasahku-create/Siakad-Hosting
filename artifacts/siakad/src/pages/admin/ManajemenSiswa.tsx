import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Sparkles,
  School,
  ArrowRightLeft,
  X,
  Building,
  Calendar,
  Phone,
  MapPin,
  HeartHandshake,
  ShieldCheck,
  CreditCard,
  GraduationCap,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Check,
  Award,
  FileText,
  UserCheck,
  BookOpen,
  Copy,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import AdminLayout from '../../components/admin/AdminLayout';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { useMadrasah } from '../../contexts/MadrasahContext';
import { getStudentRombelForYear, setStudentRombelForYear, promoteStudentToYear, RombelHistoryItem } from '../../utils/studentRombelHistory';
import * as XLSX from 'xlsx';

export interface Student {
  id: string;
  name: string;
  nisn: string;
  nik: string;
  gender: 'Laki-laki' | 'Perempuan';
  class_id?: string;
  tingkat_rombel?: string;
  kelas?: string;
  rombel?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  address?: string;
  phone?: string;
  status: 'active' | 'graduated' | 'moved' | 'dropped';
  tahun_pelajaran?: string;
  riwayat_rombel?: RombelHistoryItem[];
  tahun_lulus?: string;
  tanggal_lulus?: string;
  no_ijazah?: string;
  keterangan_lulus?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  nama_wali?: string;
  pekerjaan_ayah?: string;
  pekerjaan_ibu?: string;
  no_hp_ortu?: string;
  kebutuhan_khusus?: string;
  disabilitas?: string;
  nomor_kip_pip?: string;
  penerima_kip?: boolean;
  created_at?: string;
}

export interface RombelClass {
  id: string;
  nama_kelas: string;
  tingkat?: string;
  wali_kelas?: string;
  ruangan?: string;
  kapasitas?: number;
  tahun_pelajaran?: string;
}

const STORAGE_KEYS_STUDENTS = ['students_list', 'siakad_students_data', 'site_students', 'app_students_v2', 'students_data', 'madrasah_students'];
const STORAGE_KEYS_CLASSES = ['kelas_list', 'siakad_classes_data', 'siakad_rombel_classes', 'site_classes', 'app_classes', 'classes_data', 'madrasah_classes'];
const LOCAL_CACHE_STUDENTS = 'siakad_students_cache';
const LOCAL_CACHE_CLASSES = 'siakad_classes_cache';

const DEFAULT_CLASSES: RombelClass[] = [
  { id: 'c1', nama_kelas: '1A', tingkat: '1', wali_kelas: 'Ahmad Yani, S.Pd', kapasitas: 28 },
  { id: 'c2', nama_kelas: '1B', tingkat: '1', wali_kelas: 'Siti Aminah, S.Pd.I', kapasitas: 28 },
  { id: 'c3', nama_kelas: '2A', tingkat: '2', wali_kelas: 'Budi Santoso, M.Pd', kapasitas: 30 },
  { id: 'c4', nama_kelas: '3A', tingkat: '3', wali_kelas: 'Rina Wijaya, S.Ag', kapasitas: 30 },
  { id: 'c5', nama_kelas: '4A', tingkat: '4', wali_kelas: 'Dedi Kurniawan, S.Pd', kapasitas: 32 },
  { id: 'c6', nama_kelas: '5A', tingkat: '5', wali_kelas: 'Dewi Lestari, S.Pd', kapasitas: 32 },
  { id: 'c7', nama_kelas: '6A', tingkat: '6', wali_kelas: 'H. M. Syukri, M.Ag', kapasitas: 30 },
];

const INITIAL_STUDENT_FORM: Omit<Student, 'id'> = {
  name: '',
  nisn: '',
  nik: '',
  gender: 'Laki-laki',
  tingkat_rombel: '1',
  rombel: '1A',
  tempat_lahir: 'Jakarta',
  tanggal_lahir: '2016-01-01',
  address: '',
  phone: '',
  status: 'active',
  tahun_pelajaran: '',
  nama_ayah: '',
  nama_ibu: '',
  nama_wali: '',
  pekerjaan_ayah: '',
  pekerjaan_ibu: '',
  no_hp_ortu: '',
  kebutuhan_khusus: 'Tidak Ada',
  disabilitas: 'Tidak Ada',
  nomor_kip_pip: '',
  penerima_kip: false,
};

export default function ManajemenSiswa() {
  const { settings } = useSiteSettings();
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const activeMadrasahId = activeMadrasah?.id || 'default';
  const activeAcademicYear = settings.tahun_pelajaran?.active_year || '2024/2025';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<RombelClass[]>(DEFAULT_CLASSES);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const savingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'daftar' | 'tambah' | 'mutasi' | 'rekap' | 'import'>('daftar');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const statusParam = searchParams.get('status');

    if (statusParam === 'graduated' || statusParam === 'lulus' || statusParam === 'alumni') {
      setSelectedStatusFilter('graduated');
      setSelectedYearFilter('ALL');
      setActiveTab('daftar');
    } else if (statusParam) {
      setSelectedStatusFilter(statusParam);
    }

    if (tabParam === 'kelulusan' || tabParam === 'mutasi' || tabParam === 'alumni') {
      setActiveTab('mutasi');
    } else if (tabParam === 'rekap') {
      setActiveTab('rekap');
    } else if (tabParam === 'import') {
      setActiveTab('import');
    } else if (tabParam === 'daftar') {
      setActiveTab('daftar');
    }
  }, [searchParams]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRombelFilter, setSelectedRombelFilter] = useState<string>('ALL');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('active');
  const [selectedKipFilter, setSelectedKipFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(activeAcademicYear);

  useEffect(() => {
    if (settings.tahun_pelajaran?.active_year) {
      setSelectedYearFilter(settings.tahun_pelajaran.active_year);
    }
  }, [settings.tahun_pelajaran?.active_year]);

  const normalizeClassName = useCallback((value?: string) => (value || '').trim().toLowerCase(), []);

  const getEffectiveYear = useCallback(
    () => (selectedYearFilter !== 'ALL' ? selectedYearFilter : activeAcademicYear),
    [selectedYearFilter, activeAcademicYear]
  );

  const getStudentSnapshotForYear = useCallback((student: Student, year: string) => {
    const record = getStudentRombelForYear(student, year);
    return {
      year,
      rombel: record.rombel || '',
      classId: record.class_id || '',
      status: record.status || student.status || 'active',
      belongsToYear:
        Array.isArray(student.riwayat_rombel) && student.riwayat_rombel.some(item => item?.tahun_pelajaran === year)
          ? true
          : student.tahun_pelajaran === year || (!student.tahun_pelajaran && year === activeAcademicYear)
    };
  }, [activeAcademicYear]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    if (activeAcademicYear) yearsSet.add(activeAcademicYear);
    if (settings.tahun_pelajaran?.available_years) {
      settings.tahun_pelajaran.available_years.forEach((y: string) => yearsSet.add(y));
    }
    students.forEach(s => {
      if (s.tahun_pelajaran) yearsSet.add(s.tahun_pelajaran);
      if (Array.isArray(s.riwayat_rombel)) {
        s.riwayat_rombel.forEach(item => {
          if (item?.tahun_pelajaran) yearsSet.add(item.tahun_pelajaran);
        });
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [activeAcademicYear, settings.tahun_pelajaran?.available_years, students]);

  const effectiveYear = useMemo(() => getEffectiveYear(), [getEffectiveYear]);

  const yearClasses = useMemo(() => {
    const exact = classes.filter(cls => cls.tahun_pelajaran === effectiveYear);
    let baseList = exact;

    if (baseList.length === 0) {
      const generic = classes.filter(cls => !cls.tahun_pelajaran || cls.tahun_pelajaran === 'ALL');
      baseList = generic.length > 0 ? generic : classes;
    }

    const uniqueMap = new Map<string, RombelClass>();
    baseList.forEach(cls => {
      const key = normalizeClassName(cls.nama_kelas);
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...cls,
          tahun_pelajaran: cls.tahun_pelajaran || effectiveYear
        });
      }
    });

    return Array.from(uniqueMap.values());
  }, [classes, effectiveYear, normalizeClassName]);

  const studentsForSelectedYear = useMemo(() => {
    if (selectedYearFilter === 'ALL') {
      return students;
    }

    return students.filter(student => {
      const snapshot = getStudentSnapshotForYear(student, effectiveYear);
      if (snapshot.belongsToYear) return true;
      return false;
    });
  }, [students, selectedYearFilter, getStudentSnapshotForYear, effectiveYear]);

  // Batch Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchActionRombel, setBatchActionRombel] = useState<string>('');
  const [batchActionStatus, setBatchActionStatus] = useState<Student['status']>('active');

  // Duplicate Student Modal State
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    studentIds: string[];
    targetYear: string;
    targetRombel: string;
    targetStatus: Student['status'];
  }>({
    isOpen: false,
    studentIds: [],
    targetYear: '2025/2026',
    targetRombel: '',
    targetStatus: 'active',
  });

  const duplicateTargetClasses = useMemo(() => {
    const targetYear = duplicateModal.targetYear || effectiveYear;
    const exact = classes.filter(cls => cls.tahun_pelajaran === targetYear);
    let baseList = exact;

    if (baseList.length === 0) {
      const generic = classes.filter(cls => !cls.tahun_pelajaran || cls.tahun_pelajaran === 'ALL');
      baseList = generic.length > 0 ? generic : classes;
    }

    const uniqueMap = new Map<string, RombelClass>();
    baseList.forEach(cls => {
      const key = normalizeClassName(cls.nama_kelas);
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...cls,
          tahun_pelajaran: cls.tahun_pelajaran || targetYear
        });
      }
    });

    return Array.from(uniqueMap.values());
  }, [classes, duplicateModal.targetYear, effectiveYear, normalizeClassName]);

  // Graduate Student Modal State
  const [graduateModal, setGraduateModal] = useState<{
    isOpen: boolean;
    studentIds: string[];
    tahunLulus: string;
    tanggalLulus: string;
    noIjazahPrefix: string;
    keterangan: string;
  }>({
    isOpen: false,
    studentIds: [],
    tahunLulus: '2024/2025',
    tanggalLulus: new Date().toISOString().split('T')[0],
    noIjazahPrefix: '',
    keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
  });

  // Revert Graduation Modal State
  const [revertModal, setRevertModal] = useState<{
    isOpen: boolean;
    studentIds: string[];
    targetRombel: string;
  }>({
    isOpen: false,
    studentIds: [],
    targetRombel: '',
  });

  // Import Excel State
  const [importTargetRombel, setImportTargetRombel] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState<Omit<Student, 'id'>>(INITIAL_STUDENT_FORM);

  // Print Card Modal
  const [printingCardStudent, setPrintingCardStudent] = useState<Student | null>(null);

  // Toast Notice
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // -------------------------------------------------------------
  // Data Fetching & Sync Engine (Supabase + LocalStorage Fallback)
  // -------------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (savingRef.current) return;
    setLoading(true);
    try {
      // 1. Load Classes
      let loadedClasses: RombelClass[] = [];
      let classesFoundInDb = false;
      const scopedClassesKey = getScopedKey ? getScopedKey('kelas_list') : `kelas_list_${activeMadrasahId || 'madrasah_default'}`;
      const allClassKeys = Array.from(new Set([
        scopedClassesKey,
        'kelas_list',
        `kelas_list_${activeMadrasahId || 'madrasah_default'}`,
        ...STORAGE_KEYS_CLASSES
      ]));

      const { data: classRows } = await supabase
        .from('site_settings')
        .select('id, value, updated_at')
        .in('id', allClassKeys)
        .order('updated_at', { ascending: false });

      if (classRows && classRows.length > 0) {
        for (const r of classRows) {
          if (Array.isArray(r.value)) {
            loadedClasses = r.value;
            classesFoundInDb = true;
            break;
          }
        }
      }

      if (!classesFoundInDb) {
        for (const key of allClassKeys) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                loadedClasses = parsed;
                classesFoundInDb = true;
                break;
              }
            } catch (e) {
              console.warn('Failed parsing cached classes:', e);
            }
          }
        }
        if (!classesFoundInDb) {
          const cached = localStorage.getItem(LOCAL_CACHE_CLASSES);
          if (cached) {
            try { loadedClasses = JSON.parse(cached); } catch (e) { loadedClasses = DEFAULT_CLASSES; }
          } else {
            loadedClasses = DEFAULT_CLASSES;
          }
        }
      }
      setClasses(loadedClasses);

      // 2. Load Students
      const scopedStudentsKey = getScopedKey ? getScopedKey('students_list') : `students_list_${activeMadrasahId || 'madrasah_default'}`;
      const allStudentKeys = Array.from(new Set([
        scopedStudentsKey,
        'students_list',
        `students_list_${activeMadrasahId || 'madrasah_default'}`,
        ...STORAGE_KEYS_STUDENTS
      ]));

      let loadedStudents: Student[] = [];
      let studentsFoundInDb = false;

      // 2a. First check site_settings for latest JSON array of students
      const { data: studentRows } = await supabase
        .from('site_settings')
        .select('id, value, updated_at')
        .in('id', allStudentKeys)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (studentRows && studentRows.length > 0) {
        for (const r of studentRows) {
          if (Array.isArray(r.value) && r.value.length > 0) {
            loadedStudents = r.value;
            studentsFoundInDb = true;
            break;
          }
        }
      }

      // 2b. Fallback to students table if site_settings empty
      if (!studentsFoundInDb) {
        const { data: dbStudents } = await supabase.from('students').select('*').order('name');
        if (dbStudents && dbStudents.length > 0) {
          loadedStudents = dbStudents.map((s: any) => ({
            ...s,
            rombel: s.rombel || s.kelas || '1A',
            gender: s.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
            status: s.status || 'active',
          }));
          studentsFoundInDb = true;
        }
      }

      // 2c. Fallback to local storage
      if (!studentsFoundInDb) {
        for (const key of allStudentKeys) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedStudents = parsed;
                studentsFoundInDb = true;
                break;
              }
            } catch (err) {
              console.warn("Failed to parse local student key:", key);
            }
          }
        }
        if (!studentsFoundInDb) {
          const cached = localStorage.getItem(LOCAL_CACHE_STUDENTS);
          if (cached) {
            try { loadedStudents = JSON.parse(cached); } catch (e) { loadedStudents = []; }
          }
        }
      }

      if (loadedStudents.length > 0) {
        loadedStudents = loadedStudents.map(s => {
          const st = (s.status || '').toLowerCase().trim();
          const rb = (s.rombel || s.kelas || '').toLowerCase().trim();
          if (st === 'graduated' || st === 'lulus' || st === 'alumni' || rb.includes('alumni') || rb.includes('lulus')) {
            return {
              ...s,
              status: 'graduated' as const,
              class_id: '',
              rombel: 'Alumni / Lulus',
              kelas: 'Alumni / Lulus'
            };
          }
          return s;
        });
      }

      setStudents(loadedStudents);
      try {
        localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify(loadedStudents));
      } catch (err) { void err; }
    } catch (err) {
      console.error("Error loading student data:", err);
      showNotice("Menggunakan data lokal tersimpan", "info");
    } finally {
      setLoading(false);
    }
  }, [activeMadrasahId, getScopedKey]);

  useEffect(() => {
    fetchData();

    // Supabase Realtime Subscriptions
    const channel1 = supabase
      .channel('public_students_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchData();
      })
      .subscribe();

    const channel2 = supabase
      .channel('public_site_settings_students_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        fetchData();
      })
      .subscribe();

    const handleUpdate = () => fetchData();
    window.addEventListener('siakad_direktori_updated', handleUpdate);
    window.addEventListener('siakad_data_updated', handleUpdate);

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      window.removeEventListener('siakad_direktori_updated', handleUpdate);
      window.removeEventListener('siakad_data_updated', handleUpdate);
    };
  }, [fetchData]);

  // Sync state to local storage & Supabase
  const persistStudents = async (newStudents: Student[]) => {
    savingRef.current = true;
    setSaving(true);
    setStudents(newStudents);

    const scopedKey = getScopedKey ? getScopedKey('students_list') : `students_list_${activeMadrasahId || 'madrasah_default'}`;
    const allKeys = Array.from(new Set([
      scopedKey,
      'students_list',
      `students_list_${activeMadrasahId || 'madrasah_default'}`,
      ...STORAGE_KEYS_STUDENTS
    ]));

    const safeSetStorage = (k: string, val: string) => {
      try {
        localStorage.setItem(k, val);
      } catch (err) { void err; }
    };

    const studentJson = JSON.stringify(newStudents);
    safeSetStorage(LOCAL_CACHE_STUDENTS, studentJson);
    safeSetStorage('students_list', studentJson);
    safeSetStorage(scopedKey, studentJson);
    allKeys.forEach(key => {
      safeSetStorage(key, studentJson);
    });

    try {
      const cachedStr = localStorage.getItem('siakad_site_settings');
      const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
      allKeys.forEach(k => {
        settingsObj[k] = newStudents;
      });
      safeSetStorage('siakad_site_settings', JSON.stringify(settingsObj));
    } catch (err) { void err; }

    // Save to site_settings table in Supabase in a single batch call
    try {
      const now = new Date().toISOString();
      const payload = allKeys.map(k => ({ id: k, value: newStudents, updated_at: now }));
      await supabase.from('site_settings').upsert(payload);
    } catch (e) {
      console.error("Supabase site_settings students save error:", e);
    }

    // Dispatch custom events AFTER Supabase site_settings save completes
    window.dispatchEvent(new CustomEvent('siakad_direktori_updated'));
    window.dispatchEvent(new CustomEvent('siakad_data_updated'));

    // Try Supabase students table sync in background
    try {
      await supabase.from('students').upsert(
        newStudents.map(s => ({
          id: s.id,
          name: s.name,
          nisn: s.nisn,
          nik: s.nik,
          gender: s.gender,
          rombel: s.rombel,
          kelas: s.rombel,
          class_id: s.class_id || null,
          tingkat_rombel: s.tingkat_rombel || s.rombel,
          riwayat_rombel: s.riwayat_rombel || [],
          status: s.status,
          tempat_lahir: s.tempat_lahir,
          tanggal_lahir: s.tanggal_lahir,
          address: s.address,
          phone: s.phone,
          nama_ayah: s.nama_ayah,
          nama_ibu: s.nama_ibu,
          nomor_kip_pip: s.nomor_kip_pip,
          tahun_pelajaran: s.tahun_pelajaran,
          tahun_lulus: s.tahun_lulus,
          tanggal_lulus: s.tanggal_lulus,
          no_ijazah: s.no_ijazah,
          keterangan_lulus: s.keterangan_lulus
        }))
      );
    } catch (err) {
      console.warn("Supabase upsert background skipped/failed:", err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Filtered & Search Results
  // -------------------------------------------------------------
  const filteredStudents = useMemo(() => {
    const evalYear = effectiveYear;

    return studentsForSelectedYear.filter(student => {
      const { rombel: sRombel, status: sStatus } = getStudentSnapshotForYear(student, evalYear);

      const matchSearch =
        searchTerm === '' ||
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nisn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sRombel?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRombel = selectedRombelFilter === 'ALL' || sRombel === selectedRombelFilter;
      const matchGender = selectedGenderFilter === 'ALL' || student.gender === selectedGenderFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || sStatus === selectedStatusFilter;
      const matchKip =
        selectedKipFilter === 'ALL' ||
        (selectedKipFilter === 'KIP' && (student.penerima_kip || Boolean(student.nomor_kip_pip))) ||
        (selectedKipFilter === 'NON_KIP' && !student.penerima_kip && !student.nomor_kip_pip);

      let matchYear = true;
      if (selectedYearFilter !== 'ALL') {
        const st = sStatus.toLowerCase().trim();
        if ((st === 'graduated' || st === 'lulus' || st === 'alumni') && student.tahun_lulus && student.tahun_lulus !== selectedYearFilter) {
          matchYear = false;
        }
      }

      return matchSearch && matchRombel && matchGender && matchStatus && matchKip && matchYear;
    });
  }, [studentsForSelectedYear, searchTerm, selectedRombelFilter, selectedGenderFilter, selectedStatusFilter, selectedKipFilter, selectedYearFilter, effectiveYear, getStudentSnapshotForYear]);

  // Statistics
  const stats = useMemo(() => {
    const sourceList = studentsForSelectedYear;
    const total = sourceList.length;
    const active = sourceList.filter(s => getStudentSnapshotForYear(s, effectiveYear).status === 'active').length;
    const graduated = sourceList.filter(s => getStudentSnapshotForYear(s, effectiveYear).status === 'graduated').length;
    const moved = sourceList.filter(s => {
      const status = getStudentSnapshotForYear(s, effectiveYear).status;
      return status === 'moved' || status === 'dropped';
    }).length;
    const male = sourceList.filter(s => s.gender === 'Laki-laki' && getStudentSnapshotForYear(s, effectiveYear).status === 'active').length;
    const female = sourceList.filter(s => s.gender === 'Perempuan' && getStudentSnapshotForYear(s, effectiveYear).status === 'active').length;
    const kip = sourceList.filter(s => s.penerima_kip || Boolean(s.nomor_kip_pip)).length;
    return { total, active, graduated, moved, male, female, kip };
  }, [studentsForSelectedYear, effectiveYear, getStudentSnapshotForYear]);

  // -------------------------------------------------------------
  // CRUD Actions
  // -------------------------------------------------------------
  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setStudentForm({
      ...INITIAL_STUDENT_FORM,
      tahun_pelajaran: selectedYearFilter !== 'ALL' ? selectedYearFilter : activeAcademicYear
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (student: Student) => {
    const snapshot = getStudentSnapshotForYear(student, effectiveYear);
    setEditingStudent(student);
    setStudentForm({
      name: student.name || '',
      nisn: student.nisn || '',
      nik: student.nik || '',
      gender: student.gender || 'Laki-laki',
      tingkat_rombel: student.tingkat_rombel || '1',
      class_id: snapshot.classId || student.class_id || '',
      rombel: snapshot.rombel || student.rombel || student.kelas || '',
      tempat_lahir: student.tempat_lahir || 'Jakarta',
      tanggal_lahir: student.tanggal_lahir || '2016-01-01',
      address: student.address || '',
      phone: student.phone || '',
      status: snapshot.status as Student['status'],
      tahun_pelajaran: effectiveYear || student.tahun_pelajaran || activeAcademicYear,
      nama_ayah: student.nama_ayah || '',
      nama_ibu: student.nama_ibu || '',
      nama_wali: student.nama_wali || '',
      pekerjaan_ayah: student.pekerjaan_ayah || '',
      pekerjaan_ibu: student.pekerjaan_ibu || '',
      no_hp_ortu: student.no_hp_ortu || '',
      kebutuhan_khusus: student.kebutuhan_khusus || 'Tidak Ada',
      disabilitas: student.disabilitas || 'Tidak Ada',
      nomor_kip_pip: student.nomor_kip_pip || '',
      penerima_kip: student.penerima_kip || Boolean(student.nomor_kip_pip),
    });
    setShowAddModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim()) {
      showNotice("Nama siswa wajib diisi", "error");
      return;
    }

    setSaving(true);
    try {
      const targetYear = studentForm.tahun_pelajaran || activeAcademicYear;
      const isCurrentActiveYear = targetYear === activeAcademicYear;

      if (editingStudent) {
        // Update existing
        const merged: Student = {
          ...editingStudent,
          ...studentForm,
          kelas: studentForm.rombel,
        };
        const updatedStudent = setStudentRombelForYear(
          merged,
          targetYear,
          studentForm.rombel || '',
          studentForm.class_id || '',
          studentForm.status || 'active',
          isCurrentActiveYear
        ) as Student;
        const nextList = students.map(s => s.id === editingStudent.id ? updatedStudent : s);
        await persistStudents(nextList);
        showNotice("Data siswa berhasil diperbarui!", "success");
      } else {
        // Create new
        const newStudentBase: Student = {
          id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          ...studentForm,
          kelas: studentForm.rombel,
          created_at: new Date().toISOString(),
        };
        const newStudent = setStudentRombelForYear(
          newStudentBase,
          targetYear,
          studentForm.rombel || '',
          studentForm.class_id || '',
          studentForm.status || 'active',
          isCurrentActiveYear
        ) as Student;
        const nextList = [newStudent, ...students];
        await persistStudents(nextList);
        showNotice("Siswa baru berhasil ditambahkan!", "success");
      }
      setShowAddModal(false);
      setStudentForm(INITIAL_STUDENT_FORM);
    } catch (err) {
      console.error("Save error:", err);
      showNotice("Gagal menyimpan data siswa", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    try {
      const nextList = students.filter(s => s.id !== id);
      await persistStudents(nextList);
      
      // Try delete from Supabase
      try {
        await supabase.from('students').delete().eq('id', id);
      } catch (err) {
        console.warn("Supabase delete failed/skipped:", err);
      }

      showNotice(`Data siswa ${name} berhasil dihapus`, "success");
    } catch (err) {
      console.error("Delete error:", err);
      showNotice("Gagal menghapus siswa", "error");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedStudentIds.length === 0) {
      showNotice("Pilih minimal 1 siswa terlebih dahulu", "error");
      return;
    }

    setSaving(true);
    try {
      const nextList = students.filter(s => !selectedStudentIds.includes(s.id));
      await persistStudents(nextList);

      // Try delete from Supabase
      try {
        await supabase.from('students').delete().in('id', selectedStudentIds);
      } catch (err) {
        console.warn("Supabase batch delete error:", err);
      }

      const count = selectedStudentIds.length;
      setSelectedStudentIds([]);
      showNotice(`Berhasil menghapus ${count} data siswa`, "success");
    } catch (err) {
      console.error("Batch delete error:", err);
      showNotice("Gagal menghapus data siswa massal", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Batch Operations
  // -------------------------------------------------------------
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchMoveRombel = async () => {
    if (selectedStudentIds.length === 0) {
      showNotice("Pilih minimal 1 siswa terlebih dahulu", "error");
      return;
    }
    if (!batchActionRombel) {
      showNotice("Pilih rombel tujuan!", "error");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const matchedClass = classes.find(c =>
        c.nama_kelas === batchActionRombel || c.id === batchActionRombel
      ) || yearClasses.find(c =>
        c.nama_kelas === batchActionRombel || c.id === batchActionRombel
      );
      const targetClassName = matchedClass ? matchedClass.nama_kelas : batchActionRombel;
      const targetClassId = matchedClass ? matchedClass.id : undefined;

      const selectedSet = new Set(selectedStudentIds.map(String));
      const count = selectedStudentIds.length;
      const nextList = students.map(s => {
        if (selectedSet.has(String(s.id))) {
          const newStatus = (!s.status || s.status === 'unassigned') ? 'active' : (batchActionStatus || s.status || 'active');
          return setStudentRombelForYear(
            {
              ...s,
              status: newStatus
            },
            effectiveYear,
            targetClassName || '',
            targetClassId || '',
            newStatus,
            true
          ) as Student;
        }
        return s;
      });
      await persistStudents(nextList);
      setSelectedStudentIds([]);
      setBatchActionRombel('');
      showNotice(`Berhasil memindahkan ${count} siswa ke Rombel ${targetClassName}`, "success");
    } catch (err) {
      console.error("Error handleBatchMoveRombel:", err);
      showNotice("Gagal memindahkan rombel massal", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleBatchUpdateStatus = async () => {
    if (selectedStudentIds.length === 0) {
      showNotice("Pilih minimal 1 siswa terlebih dahulu", "error");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const selectedSet = new Set(selectedStudentIds.map(String));
      const nextList = students.map(s => {
        if (selectedSet.has(String(s.id))) {
          const snapshot = getStudentRombelForYear(s, effectiveYear);
          return setStudentRombelForYear(
            { ...s, status: batchActionStatus },
            effectiveYear,
            snapshot.rombel || s.rombel || s.kelas || '',
            snapshot.class_id || s.class_id || '',
            batchActionStatus,
            true
          ) as Student;
        }
        return s;
      });
      await persistStudents(nextList);
      setSelectedStudentIds([]);
      showNotice(`Berhasil mengubah status ${selectedStudentIds.length} siswa`, "success");
    } catch (err) {
      console.error("Error handleBatchUpdateStatus:", err);
      showNotice("Gagal update status massal", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleExecuteDuplicateStudents = async () => {
    if (duplicateModal.studentIds.length === 0) return;
    if (!duplicateModal.targetYear) {
      showNotice("Pilih Tahun Pelajaran tujuan!", "error");
      return;
    }

    setSaving(true);
    try {
      const targetSet = new Set(duplicateModal.studentIds.map(String));
      const targetStudents = students.filter(s => targetSet.has(String(s.id)));
      const matchedClass = duplicateTargetClasses.find(c => c.id === duplicateModal.targetRombel || c.nama_kelas === duplicateModal.targetRombel);
      const targetClassName = matchedClass ? matchedClass.nama_kelas : duplicateModal.targetRombel;
      const targetClassId = matchedClass ? matchedClass.id : undefined;

      const duplicatedRecords: Student[] = targetStudents.map(s => {
        const newId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const duplicatedBase: Student = {
          ...s,
          id: newId,
          status: duplicateModal.targetStatus,
          tahun_pelajaran: duplicateModal.targetYear,
          tahun_lulus: undefined,
          tanggal_lulus: undefined,
          no_ijazah: undefined,
          keterangan_lulus: undefined,
          riwayat_rombel: [],
          created_at: new Date().toISOString()
        };
        return setStudentRombelForYear(
          duplicatedBase,
          duplicateModal.targetYear,
          targetClassName || '',
          targetClassId || '',
          duplicateModal.targetStatus,
          duplicateModal.targetYear === activeAcademicYear
        ) as Student;
      });

      const nextList = [...students, ...duplicatedRecords];
      await persistStudents(nextList);

      showNotice(`Berhasil menduplikasi ${duplicatedRecords.length} siswa ke TP ${duplicateModal.targetYear} ${targetClassName ? `(Rombel ${targetClassName})` : ''}`, "success");
      setSelectedStudentIds([]);
      setDuplicateModal({
        isOpen: false,
        studentIds: [],
        targetYear: '2025/2026',
        targetRombel: '',
        targetStatus: 'active',
      });
    } catch (err) {
      showNotice("Gagal menduplikasi data siswa", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteGraduation = async () => {
    if (graduateModal.studentIds.length === 0) return;
    if (!graduateModal.tahunLulus) {
      showNotice("Pilih Tahun Kelulusan terlebih dahulu!", "error");
      return;
    }

    setSaving(true);
    try {
      const targetSet = new Set(graduateModal.studentIds.map(String));
      const updatedStudents = students.map((s, idx) => {
        if (targetSet.has(String(s.id))) {
          const gradStudent = {
            ...s,
            status: 'graduated' as const,
            tahun_lulus: graduateModal.tahunLulus,
            tahun_pelajaran: graduateModal.tahunLulus,
            tanggal_lulus: graduateModal.tanggalLulus,
            no_ijazah: graduateModal.noIjazahPrefix
              ? `${graduateModal.noIjazahPrefix}/${String(idx + 1).padStart(3, '0')}`
              : s.no_ijazah,
            keterangan_lulus: graduateModal.keterangan || 'Lulus Utama',
            rombel: 'Alumni / Lulus',
            kelas: 'Alumni / Lulus',
            class_id: ''
          };
          return setStudentRombelForYear(
            gradStudent as any,
            graduateModal.tahunLulus,
            'Alumni / Lulus',
            '',
            'graduated',
            true
          ) as Student;
        }
        return s;
      });

      await persistStudents(updatedStudents);
      showNotice(`Berhasil meluluskan ${graduateModal.studentIds.length} siswa!`, "success");
      setSelectedStudentIds([]);
      setGraduateModal({
        isOpen: false,
        studentIds: [],
        tahunLulus: '2024/2025',
        tanggalLulus: new Date().toISOString().split('T')[0],
        noIjazahPrefix: '',
        keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
      });
    } catch (err) {
      showNotice("Gagal memproses kelulusan siswa", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteRevertGraduation = async () => {
    if (revertModal.studentIds.length === 0) return;
    setSaving(true);
    try {
      const targetSet = new Set(revertModal.studentIds.map(String));
      const availableClassOptions = yearClasses.length > 0 ? yearClasses : (classes.length > 0 ? classes : DEFAULT_CLASSES);
      const targetClassName = revertModal.targetRombel || (availableClassOptions[0]?.nama_kelas || '6A');
      const matchedClass = availableClassOptions.find(c => c.nama_kelas === targetClassName || c.id === targetClassName);
      const targetClassId = matchedClass ? matchedClass.id : '';

      const nextList = students.map(s => {
        if (targetSet.has(String(s.id))) {
          const restoredStudent: Student = {
            ...s,
            status: 'active',
            rombel: targetClassName,
            kelas: targetClassName,
            class_id: targetClassId
          };
          delete restoredStudent.tahun_lulus;
          delete restoredStudent.tanggal_lulus;
          delete restoredStudent.no_ijazah;
          delete restoredStudent.keterangan_lulus;

          return setStudentRombelForYear(
            restoredStudent as any,
            activeAcademicYear,
            targetClassName,
            targetClassId,
            'active',
            true
          ) as Student;
        }
        return s;
      });

      await persistStudents(nextList);
      showNotice(`Berhasil membatalkan kelulusan & mengembalikan ${revertModal.studentIds.length} siswa ke Rombel ${targetClassName}!`, "success");
      setSelectedStudentIds([]);
      setRevertModal({ isOpen: false, studentIds: [], targetRombel: '' });
    } catch (err) {
      console.error("Revert graduation error:", err);
      showNotice("Gagal membatalkan kelulusan siswa", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Excel Export & Import
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      showNotice("Tidak ada data siswa untuk diexport", "error");
      return;
    }

    const dataToExport = filteredStudents.map((s, idx) => ({
      No: idx + 1,
      NISN: s.nisn || '-',
      NIK: s.nik || '-',
      'Nama Lengkap': s.name,
      'Jenis Kelamin': s.gender,
      Rombel: s.rombel || s.kelas || '-',
      Status: s.status === 'active' ? 'Aktif' : s.status === 'graduated' ? 'Lulus' : 'Mutasi/Keluar',
      'Tempat Lahir': s.tempat_lahir || '-',
      'Tanggal Lahir': s.tanggal_lahir || '-',
      Alamat: s.address || '-',
      'No HP': s.phone || '-',
      'Nama Ayah': s.nama_ayah || '-',
      'Nama Ibu': s.nama_ibu || '-',
      'Nomor KIP/PIP': s.nomor_kip_pip || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
    XLSX.writeFile(workbook, `Data_Siswa_Madrasah_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotice("File Excel berhasil diunduh!", "success");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (!Array.isArray(rawData) || rawData.length === 0) {
          showNotice("File Excel kosong atau format tidak sesuai", "error");
          return;
        }

        const newImportedStudents: Student[] = [];
        let skippedCount = 0;

        rawData.forEach((row: any, idx: number) => {
          const rawName = row['Nama Lengkap'] || row['Nama'] || row['nama'] || '';
          const name = String(rawName).trim();
          if (!name) return;

          const nisn = String(row['NISN'] || row['nisn'] || '').trim();
          const nik = String(row['NIK'] || row['nik'] || '').trim();
          const nis = String(row['NIS'] || row['nis'] || '').trim();
          const tglLahir = String(row['Tanggal Lahir'] || row['tgl_lahir'] || '').trim();

          // Cek apakah siswa sudah ada (berdasarkan NISN, NIK, NIS, atau Nama)
          const exists = students.some(s => {
            if (nisn && nisn !== '-' && s.nisn && s.nisn.trim() === nisn) return true;
            if (nik && nik !== '-' && s.nik && s.nik.trim() === nik) return true;
            if (nis && nis !== '-' && (s as any).nis && String((s as any).nis).trim() === nis) return true;
            if (s.name && s.name.trim().toLowerCase() === name.toLowerCase()) {
              if (tglLahir && s.tanggal_lahir && s.tanggal_lahir !== '2016-01-01' && tglLahir !== '2016-01-01') {
                return s.tanggal_lahir === tglLahir;
              }
              return true;
            }
            return false;
          });

          if (exists) {
            skippedCount++;
            return; // JANGAN DITIMPA JIKA SUDAH ADA
          }

          const genderStr = String(row['Jenis Kelamin'] || row['Gender'] || '').toLowerCase();
          const gender: 'Laki-laki' | 'Perempuan' = genderStr.includes('p') || genderStr.includes('perempuan') ? 'Perempuan' : 'Laki-laki';
          const excelRombel = String(row['Rombel'] || row['Kelas'] || '1A').trim();
          const finalRombel = importTargetRombel || excelRombel;

          newImportedStudents.push({
            id: `std_imp_${Date.now()}_${idx}`,
            name,
            nisn,
            nik,
            gender,
            rombel: finalRombel,
            kelas: finalRombel,
            tingkat_rombel: finalRombel,
            status: 'active',
            tempat_lahir: row['Tempat Lahir'] || 'Jakarta',
            tanggal_lahir: tglLahir || '2016-01-01',
            address: row['Alamat'] || '',
            phone: row['No HP'] || '',
            nama_ayah: row['Nama Ayah'] || '',
            nama_ibu: row['Nama Ibu'] || '',
            nomor_kip_pip: row['Nomor KIP/PIP'] || '',
            penerima_kip: Boolean(row['Nomor KIP/PIP']),
            created_at: new Date().toISOString()
          });
        });

        if (newImportedStudents.length === 0) {
          if (skippedCount > 0) {
            showNotice(`0 siswa baru ditambahkan. Semua (${skippedCount}) data siswa dalam file sudah ada di sistem dan tidak ditimpa.`, "info");
          } else {
            showNotice("File Excel tidak berisi data siswa yang valid.", "error");
          }
          return;
        }

        const mergedList = [...newImportedStudents, ...students];
        await persistStudents(mergedList);

        if (skippedCount > 0) {
          showNotice(`Berhasil mengimpor ${newImportedStudents.length} siswa baru! (${skippedCount} siswa sudah ada & tidak ditimpa)`, "success");
        } else {
          showNotice(`Berhasil mengimpor ${newImportedStudents.length} data siswa baru!`, "success");
        }
        setActiveTab('daftar');
      } catch (err) {
        console.error("Import error:", err);
        showNotice("Gagal membaca file Excel. Pastikan format kolom sesuai.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <AdminLayout title="Modul Manajemen Siswa Mandiri">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-medium animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-blue-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner Standalone Module */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider text-emerald-100 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Modul Independen Mandiri
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/30 backdrop-blur-md border border-emerald-400/40 rounded-full text-xs font-bold text-white shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                <span>TAPEL AKTIF: {activeAcademicYear}</span>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Manajemen Siswa & Rombongan Belajar
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Pusat pengelolaan identitas siswa, mutasi kelas, rekapitulasi demografi, pencatatan KIP/PIP, dan pencetakan dokumen siswa secara mandiri & terintegrasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium border border-white/20"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 text-sm border border-emerald-400/30"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 font-bold rounded-xl shadow-lg hover:shadow-yellow-400/20 transition-all flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa Baru</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <p className="text-emerald-200 text-xs font-medium">Total Siswa</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <p className="text-emerald-200 text-xs font-medium">Siswa Aktif</p>
            <p className="text-2xl font-bold text-yellow-300 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <p className="text-emerald-200 text-xs font-medium">Laki-Laki (L)</p>
            <p className="text-2xl font-bold text-blue-200 mt-1">{stats.male}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <p className="text-emerald-200 text-xs font-medium">Perempuan (P)</p>
            <p className="text-2xl font-bold text-pink-200 mt-1">{stats.female}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <p className="text-emerald-200 text-xs font-medium">Lulus / Mutasi</p>
            <p className="text-2xl font-bold text-slate-200 mt-1">{stats.graduated + stats.moved}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <p className="text-emerald-200 text-xs font-medium">Penerima KIP/PIP</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">{stats.kip}</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Modul - Modern Grid Non-slide */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 shadow-md mb-6">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Sub-Modul Manajemen Siswa</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('daftar')}
            className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all border cursor-pointer min-w-0 ${
              activeTab === 'daftar'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'daftar' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="whitespace-nowrap font-bold">Data Siswa</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeTab === 'daftar' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {filteredStudents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/manajemen-rombel')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all border bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80 cursor-pointer min-w-0 whitespace-nowrap"
          >
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <School className="w-4 h-4" />
            </div>
            <span>Kelola Rombel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mutasi')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all border cursor-pointer min-w-0 whitespace-nowrap ${
              activeTab === 'mutasi'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
            }`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'mutasi' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <span>Mutasi & Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/data-tamatan')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all border bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80 cursor-pointer min-w-0 whitespace-nowrap"
          >
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <span>Data Alumni</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/data-prestasi')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all border bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80 cursor-pointer min-w-0 whitespace-nowrap"
          >
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Data Prestasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all border cursor-pointer min-w-0 whitespace-nowrap ${
              activeTab === 'rekap'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
            }`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'rekap' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              <School className="w-4 h-4" />
            </div>
            <span>Rekapitulasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all border cursor-pointer min-w-0 whitespace-nowrap ${
              activeTab === 'import'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
            }`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'import' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span>Import Excel</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DAFTAR SISWA & SEARCH / BATCH ACTIONS */}
      {/* ========================================================= */}
      {activeTab === 'daftar' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search Field */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Cari nama, NISN, NIK, atau rombel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Tahun Pelajaran */}
              <div>
                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Tapel</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>
                      Tapel {y} {y === activeAcademicYear ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Rombel */}
              <div>
                <select
                  value={selectedRombelFilter}
                  onChange={(e) => setSelectedRombelFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Rombel</option>
                  {yearClasses.map(c => (
                    <option key={c.id} value={c.nama_kelas}>Kelas {c.nama_kelas}</option>
                  ))}
                </select>
              </div>

              {/* Filter Gender */}
              <div>
                <select
                  value={selectedGenderFilter}
                  onChange={(e) => setSelectedGenderFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Gender</option>
                  <option value="Laki-laki">Laki-Laki (L)</option>
                  <option value="Perempuan">Perempuan (P)</option>
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="active">Siswa Aktif</option>
                  <option value="graduated">🎓 Lulus / Alumni</option>
                  <option value="moved">Pindah / Mutasi</option>
                  <option value="dropped">Keluar / Non-Aktif</option>
                </select>
              </div>
            </div>

            {/* Quick Status Shortcut Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 mr-1">Filter Cepat Status:</span>
              <button
                type="button"
                onClick={() => { setSelectedStatusFilter('active'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Siswa Aktif ({stats.active})
              </button>
              
              <button
                type="button"
                onClick={() => { setSelectedStatusFilter('graduated'); setSelectedYearFilter('ALL'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedStatusFilter === 'graduated'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                🎓 Siswa Lulus / Alumni ({stats.graduated})
              </button>

              <button
                type="button"
                onClick={() => { setSelectedStatusFilter('moved'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedStatusFilter === 'moved'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                Mutasi / Keluar ({stats.moved})
              </button>

              <button
                type="button"
                onClick={() => { setSelectedStatusFilter('ALL'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedStatusFilter === 'ALL'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Semua Status ({stats.total})
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>Filter Tambahan:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    name="kip_filter"
                    checked={selectedKipFilter === 'ALL'}
                    onChange={() => setSelectedKipFilter('ALL')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Semua</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-amber-700">
                  <input
                    type="radio"
                    name="kip_filter"
                    checked={selectedKipFilter === 'KIP'}
                    onChange={() => setSelectedKipFilter('KIP')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Hanya Penerima KIP/PIP</span>
                </label>
              </div>

              {selectedStudentIds.length > 0 && (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
                  <span>{selectedStudentIds.length} Siswa Terpilih</span>
                </div>
              )}
            </div>
          </div>

          {/* Banner Pemberitahuan Khusus Jika Tampilan Mode Siswa Lulus */}
          {selectedStatusFilter === 'graduated' && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-amber-900">
                    Menampilkan Siswa Lulus / Alumni ({filteredStudents.length} Siswa)
                  </h4>
                  <p className="text-xs text-amber-800">
                    Ada siswa yang salah diluluskan? Pilih siswa di bawah lalu klik tombol <strong>"Batalkan Kelulusan"</strong> untuk mengembalikan mereka ke daftar siswa aktif.
                  </p>
                </div>
              </div>
              {filteredStudents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRevertModal({
                    isOpen: true,
                    studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : filteredStudents.map(s => s.id),
                    targetRombel: yearClasses[0]?.nama_kelas || '6A'
                  })}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-md shrink-0 flex items-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  {selectedStudentIds.length > 0 ? `Batalkan Kelulusan Terpilih (${selectedStudentIds.length})` : `Batalkan Kelulusan Semua (${filteredStudents.length})`}
                </button>
              )}
            </div>
          )}

          {/* Batch Action Toolbar */}
          {selectedStudentIds.length > 0 && (
            <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Check className="w-5 h-5 text-yellow-400" />
                <span>Aksi Massal ({selectedStudentIds.length} Siswa)</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Batch Move Rombel */}
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                  <span>Pindah Rombel:</span>
                  <select
                    value={batchActionRombel}
                    onChange={(e) => setBatchActionRombel(e.target.value)}
                    className="bg-emerald-950 text-white rounded px-2 py-1 text-xs border border-emerald-700"
                  >
                    <option value="">-- Pilih --</option>
                    {yearClasses.map(c => (
                      <option key={c.id} value={c.nama_kelas}>Kelas {c.nama_kelas}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBatchMoveRombel}
                    className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 font-bold rounded"
                  >
                    Terapkan
                  </button>
                </div>

                {/* Batch Update Status */}
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                  <span>Ubah Status:</span>
                  <select
                    value={batchActionStatus}
                    onChange={(e) => setBatchActionStatus(e.target.value as Student['status'])}
                    className="bg-emerald-950 text-white rounded px-2 py-1 text-xs border border-emerald-700"
                  >
                    <option value="active">Aktif</option>
                    <option value="graduated">Lulus</option>
                    <option value="moved">Mutasi</option>
                    <option value="dropped">Keluar</option>
                  </select>
                  <button
                    onClick={handleBatchUpdateStatus}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded"
                  >
                    Update
                  </button>
                </div>

                {/* Batch Duplicate Button */}
                <button
                  onClick={() => setDuplicateModal({
                    isOpen: true,
                    studentIds: selectedStudentIds,
                    targetYear: effectiveYear,
                    targetRombel: '',
                    targetStatus: 'active',
                  })}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded flex items-center gap-1.5 transition-colors"
                  title="Duplikat Ke TP/Rombel Baru"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplikat Ke TP Baru ({selectedStudentIds.length})</span>
                </button>

                {/* Batch Graduation Button */}
                <button
                  onClick={() => setGraduateModal({
                    isOpen: true,
                    studentIds: selectedStudentIds,
                    tahunLulus: effectiveYear,
                    tanggalLulus: new Date().toISOString().split('T')[0],
                    noIjazahPrefix: '',
                    keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
                  })}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Proses Kelulusan Siswa Terpilih"
                >
                  <GraduationCap className="w-4 h-4 text-indigo-200" />
                  <span>Luluskan Siswa ({selectedStudentIds.length})</span>
                </button>

                {/* Batch Revert Graduation Button */}
                <button
                  onClick={() => setRevertModal({
                    isOpen: true,
                    studentIds: selectedStudentIds,
                    targetRombel: yearClasses[0]?.nama_kelas || '6A'
                  })}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Batalkan Kelulusan & Kembalikan ke Siswa Aktif"
                >
                  <RotateCcw className="w-4 h-4 text-amber-200" />
                  <span>Batalkan Kelulusan ({selectedStudentIds.length})</span>
                </button>

                {/* Batch Delete Button */}
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded flex items-center gap-1.5 transition-colors"
                  title="Hapus Terpilih"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Massal ({selectedStudentIds.length})</span>
                </button>

                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="text-gray-300 hover:text-white underline ml-2"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">NISN / NIK</th>
                    <th className="p-4">Nama Siswa</th>
                    <th className="p-4">Gender</th>
                    <th className="p-4">Rombel</th>
                    <th className="p-4">KIP / PIP</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Orang Tua / Wali</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-gray-400">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                        <p className="font-medium text-sm">Memuat data siswa...</p>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="font-semibold text-gray-700">Tidak ada data siswa ditemukan</p>
                        <p className="text-xs text-gray-500 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const snapshot = getStudentSnapshotForYear(student, effectiveYear);
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-emerald-50/40 transition-colors ${
                            isSelected ? 'bg-emerald-50/80' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectStudent(student.id)}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-mono text-xs">
                            <div className="font-semibold text-gray-900">{student.nisn || '-'}</div>
                            <div className="text-gray-400 text-[11px]">{student.nik || 'NIK -'}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-gray-900">{student.name}</div>
                            <div className="text-xs text-gray-500">{student.tempat_lahir}, {student.tanggal_lahir}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.gender === 'Laki-laki'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}>
                              {student.gender === 'Laki-laki' ? 'L' : 'P'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/70 text-emerald-900 rounded-lg font-bold text-xs">
                              <School className="w-3.5 h-3.5 text-emerald-700" />
                              Kelas {snapshot.rombel || 'Unassigned'}
                            </span>
                          </td>
                          <td className="p-4">
                            {student.nomor_kip_pip || student.penerima_kip ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                <CreditCard className="w-3 h-3" />
                                {student.nomor_kip_pip || 'KIP/PIP'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              snapshot.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : snapshot.status === 'graduated'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {snapshot.status === 'active' ? 'Aktif' : snapshot.status === 'graduated' ? 'Lulus' : 'Mutasi'}
                            </span>
                          </td>
                          <td className="p-4 text-xs">
                            <div className="font-medium text-gray-800">{student.nama_ayah || student.nama_ibu || '-'}</div>
                            {student.phone && <div className="text-gray-400">{student.phone}</div>}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingStudent(student)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Lihat Profil Siswa"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setPrintingCardStudent(student)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Cetak Kartu Pelajar"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(student)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Edit Data"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDuplicateModal({
                                  isOpen: true,
                                  studentIds: [student.id],
                                  targetYear: effectiveYear,
                                  targetRombel: '',
                                  targetStatus: 'active',
                                })}
                                className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                title="Duplikat Siswa ke Kelas / TP Baru"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {snapshot.status === 'graduated' || student.status === 'graduated' ? (
                                <button
                                  onClick={() => setRevertModal({
                                    isOpen: true,
                                    studentIds: [student.id],
                                    targetRombel: yearClasses[0]?.nama_kelas || '6A'
                                  })}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                  title="Batalkan Kelulusan & Kembalikan ke Siswa Aktif"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Batalkan Lulus</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setGraduateModal({
                                    isOpen: true,
                                    studentIds: [student.id],
                                    tahunLulus: effectiveYear,
                                    tanggalLulus: new Date().toISOString().split('T')[0],
                                    noIjazahPrefix: '',
                                    keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
                                  })}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Proses Kelulusan Siswa Ini"
                                >
                                  <GraduationCap className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Siswa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
              <div>
                Menampilkan <span className="font-bold text-gray-800">{filteredStudents.length}</span> dari Total <span className="font-bold text-gray-800">{studentsForSelectedYear.length}</span> Siswa
              </div>
              <div className="flex items-center gap-2">
                <span>Rombel Terdaftar: <strong className="text-emerald-700">{yearClasses.length} Rombel</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MUTASI & NAIK KELAS MASSAL */}
      {/* ========================================================= */}
      {activeTab === 'mutasi' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Modul Mutasi & Kenaikan Kelas Massal</h3>
              <p className="text-gray-500 text-xs">
                Pindahkan seluruh siswa dari satu rombel ke rombel tingkat selanjutnya dalam satu kali klik saat pergantian tahun ajaran.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Box 1: Kenaikan Kelas Massal & Mutasi Rombel */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <School className="w-5 h-5 text-emerald-700" />
                  <span>Proses Kenaikan / Pindah Rombel</span>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Pilih jenis proses: <strong>Kenaikan Kelas</strong> (menjaga arsip TP lama) atau <strong>Mutasi Rombel</strong> (pindah dalam TP yang sama).
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const processType = (form.elements.namedItem('processType') as HTMLInputElement).value;
                  const fromRombel = (form.elements.namedItem('fromRombel') as HTMLSelectElement).value;
                  const targetYear = (form.elements.namedItem('targetYear') as HTMLInputElement | HTMLSelectElement)?.value || effectiveYear;
                  const toRombel = (form.elements.namedItem('toRombel') as HTMLSelectElement).value;

                  if (!fromRombel || !toRombel) {
                    showNotice("Pilih rombel asal dan tujuan!", "error");
                    return;
                  }
                  if (processType === 'mutasi' && fromRombel === toRombel) {
                    showNotice("Rombel asal dan tujuan tidak boleh sama pada mutasi dalam TP yang sama", "error");
                    return;
                  }

                  const targetStudents = studentsForSelectedYear.filter(s => {
                    const snapshot = getStudentSnapshotForYear(s, effectiveYear);
                    return snapshot.rombel === fromRombel && snapshot.status === 'active';
                  });
                  if (targetStudents.length === 0) {
                    showNotice(`Tidak ada siswa aktif di Rombel ${fromRombel}`, "error");
                    return;
                  }

                  const targetIdSet = new Set(targetStudents.map(s => String(s.id)));
                  const targetClass = yearClasses.find(c => c.nama_kelas === toRombel);

                  const nextList = students.map(s => {
                    if (targetIdSet.has(String(s.id))) {
                      if (processType === 'kenaikan') {
                        return promoteStudentToYear(
                          s,
                          effectiveYear,
                          targetYear,
                          toRombel,
                          targetClass?.id || '',
                          s.status,
                          targetYear === activeAcademicYear || targetYear > effectiveYear
                        ) as Student;
                      } else {
                        return setStudentRombelForYear(
                          s,
                          effectiveYear,
                          toRombel,
                          targetClass?.id || '',
                          s.status,
                          effectiveYear === activeAcademicYear
                        ) as Student;
                      }
                    }
                    return s;
                  });

                  persistStudents(nextList);
                  if (processType === 'kenaikan') {
                    showNotice(`Berhasil menaikkan ${targetStudents.length} siswa dari TP ${effectiveYear} (${fromRombel}) ke TP ${targetYear} (${toRombel})! Arsip TP ${effectiveYear} tetap aman.`, "success");
                  } else {
                    showNotice(`Berhasil memindahkan ${targetStudents.length} siswa ke Rombel ${toRombel} pada TP ${effectiveYear}!`, "success");
                  }
                }}
                className="space-y-3 pt-1"
              >
                <div>
                  <label className="text-[11px] font-bold text-gray-700 mb-1 block uppercase tracking-wider">
                    Jenis Proses:
                  </label>
                  <select
                    name="processType"
                    defaultValue="kenaikan"
                    onChange={(e) => {
                      const targetYearEl = document.getElementById('targetYearContainer');
                      if (targetYearEl) {
                        targetYearEl.style.display = e.target.value === 'kenaikan' ? 'block' : 'none';
                      }
                    }}
                    className="w-full p-2 text-xs font-bold bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="kenaikan">Naik Kelas (Ke TP Baru & Simpan Arsip TP ${effectiveYear})</option>
                    <option value="mutasi">Mutasi / Pindah Rombel (Dalam TP ${effectiveYear} yang sama)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Rombel Asal (TP {effectiveYear}):</label>
                  <select
                    name="fromRombel"
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Rombel Asal --</option>
                    {yearClasses.map(c => (
                      <option key={c.id} value={c.nama_kelas}>
                        Kelas {c.nama_kelas} ({studentsForSelectedYear.filter(s => {
                          const snapshot = getStudentSnapshotForYear(s, effectiveYear);
                          return snapshot.rombel === c.nama_kelas && snapshot.status === 'active';
                        }).length} Siswa)
                      </option>
                    ))}
                  </select>
                </div>

                <div id="targetYearContainer">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Tahun Pelajaran Tujuan Kenaikan:</label>
                  <input
                    type="text"
                    name="targetYear"
                    defaultValue={(() => {
                      const parts = effectiveYear.split('/');
                      if (parts.length === 2) {
                        return `${parseInt(parts[0]) + 1}/${parseInt(parts[1]) + 1}`;
                      }
                      return '2026/2027';
                    })()}
                    className="w-full p-2.5 text-sm bg-white border border-emerald-300 rounded-xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Rombel Tujuan:</label>
                  <select
                    name="toRombel"
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Rombel Tujuan --</option>
                    {yearClasses.map(c => (
                      <option key={c.id} value={c.nama_kelas}>Kelas {c.nama_kelas}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Proses Kenaikan / Pindah Massal</span>
                </button>
              </form>
            </div>

            {/* Box 2: Kelulusan Massal Kelas Akhir */}
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/60 space-y-4">
              <div className="flex items-center gap-2 text-blue-900 font-bold">
                <GraduationCap className="w-5 h-5 text-blue-700" />
                <span>Kelulusan Siswa Tingkat Akhir (Alumni)</span>
              </div>
              <p className="text-xs text-gray-600">
                Luluskan seluruh siswa di rombel tingkat akhir (misal Kelas 6 / 9 / 12) menjadi status Alumni/Lulus.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const endRombel = (form.elements.namedItem('endRombel') as HTMLSelectElement).value;

                  if (!endRombel) {
                    showNotice("Pilih rombel tingkat akhir!", "error");
                    return;
                  }

                  const targetStudents = studentsForSelectedYear.filter(s => {
                    const snapshot = getStudentSnapshotForYear(s, effectiveYear);
                    return snapshot.rombel === endRombel && snapshot.status === 'active';
                  });
                  if (targetStudents.length === 0) {
                    showNotice(`Tidak ada siswa aktif di Rombel ${endRombel}`, "error");
                    return;
                  }

                  const targetIds = targetStudents.map(s => s.id);
                  setGraduateModal({
                    isOpen: true,
                    studentIds: targetIds,
                    tahunLulus: effectiveYear,
                    tanggalLulus: new Date().toISOString().split('T')[0],
                    noIjazahPrefix: '',
                    keterangan: `Lulus Rombel ${endRombel} / Tingkat Akhir`,
                  });
                }}
                className="space-y-3 pt-2"
              >
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Rombel Tingkat Akhir:</label>
                  <select
                    name="endRombel"
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Rombel --</option>
                    {yearClasses.map(c => (
                      <option key={c.id} value={c.nama_kelas}>
                        Kelas {c.nama_kelas} ({studentsForSelectedYear.filter(s => {
                          const snapshot = getStudentSnapshotForYear(s, effectiveYear);
                          return snapshot.rombel === c.nama_kelas && snapshot.status === 'active';
                        }).length} Siswa Aktif)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-blue-800">
                  💡 Status siswa yang diluluskan akan tersimpan aman di database sebagai Alumni & Tamatan.
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Proses Kelulusan Massal</span>
                </button>
              </form>
            </div>

            {/* Box 3: Batalkan Kelulusan (Restorasi Alumni ke Siswa Aktif) */}
            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-4">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <RotateCcw className="w-5 h-5 text-amber-700" />
                <span>Batalkan Kelulusan (Kembalikan ke Aktif)</span>
              </div>
              <p className="text-xs text-gray-600">
                Kembalikan status siswa alumni/lulus menjadi siswa aktif jika terdapat kekeliruan data kelulusan.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <Users className="w-4 h-4 text-amber-600" />
                    Total Alumni/Lulus Terdaftar: {students.filter(s => s.status === 'graduated').length} Siswa
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Klik tombol di bawah untuk melihat daftar siswa lulus, lalu pilih siswa yang akan dibatalkan kelulusannya.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatusFilter('graduated');
                    setSelectedYearFilter('ALL');
                    setActiveTab('daftar');
                  }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Buka Kelola Kelulusan Siswa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: REKAPITULASI DEMOGRAFI */}
      {/* ========================================================= */}
      {activeTab === 'rekap' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Rekapitulasi Demografi Siswa Per Rombel</h3>
              <p className="text-gray-500 text-xs">Statistik perbandingan jumlah siswa Laki-laki & Perempuan di setiap rombel.</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-emerald-900 text-white font-semibold text-xs uppercase">
                  <th className="p-3.5 rounded-tl-xl">Rombongan Belajar</th>
                  <th className="p-3.5">Wali Kelas</th>
                  <th className="p-3.5 text-center">Laki-Laki (L)</th>
                  <th className="p-3.5 text-center">Perempuan (P)</th>
                  <th className="p-3.5 text-center">Penerima KIP</th>
                  <th className="p-3.5 text-center rounded-tr-xl">Total Siswa Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {yearClasses.map((c) => {
                  const rombelStudents = studentsForSelectedYear.filter(s => {
                    const snapshot = getStudentSnapshotForYear(s, effectiveYear);
                    return snapshot.rombel === c.nama_kelas && snapshot.status === 'active';
                  });
                  const mCount = rombelStudents.filter(s => s.gender === 'Laki-laki').length;
                  const fCount = rombelStudents.filter(s => s.gender === 'Perempuan').length;
                  const kipCount = rombelStudents.filter(s => s.penerima_kip || Boolean(s.nomor_kip_pip)).length;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="p-3.5 font-bold text-emerald-900">Kelas {c.nama_kelas}</td>
                      <td className="p-3.5 text-xs text-gray-600">{c.wali_kelas || '-'}</td>
                      <td className="p-3.5 text-center font-bold text-blue-600">{mCount}</td>
                      <td className="p-3.5 text-center font-bold text-pink-600">{fCount}</td>
                      <td className="p-3.5 text-center font-medium text-amber-700">{kipCount}</td>
                      <td className="p-3.5 text-center font-bold text-gray-900 bg-gray-50">{rombelStudents.length} Siswa</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 font-bold text-emerald-950 text-sm border-t-2 border-emerald-300">
                  <td colSpan={2} className="p-4">TOTAL KESELURUHAN SAKAD:</td>
                  <td className="p-4 text-center text-blue-700">{stats.male}</td>
                  <td className="p-4 text-center text-pink-700">{stats.female}</td>
                  <td className="p-4 text-center text-amber-800">{stats.kip}</td>
                  <td className="p-4 text-center text-emerald-900 text-base">{stats.active} Siswa Aktif</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: IMPORT EXCEL */}
      {/* ========================================================= */}
      {activeTab === 'import' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Import Data Siswa dari File Excel</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Unggah file Excel (.xlsx / .xls) untuk mendaftarkan banyak siswa secara sekaligus.
              </p>
            </div>

            {/* Class Target & Download Format */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Target Rombel / Kelas (Opsional):
                  </label>
                  <select
                    value={importTargetRombel}
                    onChange={(e) => setImportTargetRombel(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Sesuai Kolom "Rombel" di File Excel --</option>
                  {yearClasses.map(c => (
                      <option key={c.id} value={c.nama_kelas}>
                        Paksa Semua Masuk ke Rombel: {c.nama_kelas} (Tingkat {c.tingkat || '1'})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Unduh Contoh Format</span>
                </button>
              </div>

              {importTargetRombel && (
                <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg">
                  📌 Semua data siswa di dalam file Excel akan otomatis ditempatkan di <strong>{importTargetRombel}</strong>.
                </div>
              )}
            </div>

            <div className="border-2 border-dashed border-emerald-400 bg-emerald-50/30 rounded-2xl p-8 hover:bg-emerald-50 transition-all cursor-pointer relative text-center">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportExcel}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-10 h-10 text-emerald-600 mx-auto mb-2 animate-bounce" />
              <p className="font-bold text-emerald-950 text-sm">Klik di sini untuk memilih file Excel</p>
              <p className="text-xs text-gray-500 mt-1">Mendukung format .xlsx, .xls, dan .csv</p>
            </div>

            <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
              <p className="font-bold text-gray-800">💡 Format Kolom Excel yang Disarankan:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li><strong className="text-gray-900">Nama Lengkap</strong> (Wajib)</li>
                <li><strong className="text-gray-900">NISN</strong> & <strong className="text-gray-900">NIK</strong></li>
                <li><strong className="text-gray-900">Jenis Kelamin</strong> (Laki-laki / Perempuan)</li>
                <li><strong className="text-gray-900">Rombel</strong> (Contoh: Kelas 1A, 2B, 6A - jika tidak memilih target kelas)</li>
                <li><strong className="text-gray-900">Tempat Lahir</strong> & <strong className="text-gray-900">Tanggal Lahir</strong></li>
                <li><strong className="text-gray-900">Nama Ayah</strong> & <strong className="text-gray-900">Nama Ibu</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH / EDIT SISWA */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn my-8">
            <div className="bg-emerald-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-lg">
                  {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Data Identitas Utama */}
              <div>
                <h4 className="font-bold text-sm text-emerald-900 border-b pb-2 mb-4 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Data Identitas Utama
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="md:col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Nama Lengkap Siswa *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      placeholder="Masukkan nama lengkap siswa..."
                      className="w-full p-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">NISN</label>
                    <input
                      type="text"
                      value={studentForm.nisn}
                      onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                      placeholder="10 digit NISN..."
                      className="w-full p-2.5 bg-gray-50 border rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">NIK</label>
                    <input
                      type="text"
                      value={studentForm.nik}
                      onChange={(e) => setStudentForm({ ...studentForm, nik: e.target.value })}
                      placeholder="16 digit NIK..."
                      className="w-full p-2.5 bg-gray-50 border rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Jenis Kelamin *</label>
                    <select
                      value={studentForm.gender}
                      onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                      className="w-full p-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Laki-laki">Laki-Laki (L)</option>
                      <option value="Perempuan">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Rombongan Belajar (Rombel) *</label>
                    <select
                      value={studentForm.rombel}
                      onChange={(e) => setStudentForm({ ...studentForm, rombel: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                    >
                      {yearClasses.map(c => (
                        <option key={c.id} value={c.nama_kelas}>Kelas {c.nama_kelas}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={studentForm.tempat_lahir}
                      onChange={(e) => setStudentForm({ ...studentForm, tempat_lahir: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={studentForm.tanggal_lahir}
                      onChange={(e) => setStudentForm({ ...studentForm, tanggal_lahir: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Data Orang Tua & Kontak */}
              <div>
                <h4 className="font-bold text-sm text-emerald-900 border-b pb-2 mb-4 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" /> Data Orang Tua & Wali
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nama Ayah Kandung</label>
                    <input
                      type="text"
                      value={studentForm.nama_ayah}
                      onChange={(e) => setStudentForm({ ...studentForm, nama_ayah: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nama Ibu Kandung</label>
                    <input
                      type="text"
                      value={studentForm.nama_ibu}
                      onChange={(e) => setStudentForm({ ...studentForm, nama_ibu: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">No. HP Orang Tua / WA</label>
                    <input
                      type="text"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      placeholder="0812xxxxxxx"
                      className="w-full p-2.5 bg-gray-50 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nomor KIP / PIP (Jika Ada)</label>
                    <input
                      type="text"
                      value={studentForm.nomor_kip_pip}
                      onChange={(e) => setStudentForm({ ...studentForm, nomor_kip_pip: e.target.value, penerima_kip: Boolean(e.target.value) })}
                      placeholder="Nomor kartu KIP..."
                      className="w-full p-2.5 bg-gray-50 border rounded-xl"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Alamat Tempat Tinggal</label>
                    <textarea
                      rows={2}
                      value={studentForm.address}
                      onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL PROFIL SISWA */}
      {/* ========================================================= */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {(() => {
            const snapshot = getStudentSnapshotForYear(viewingStudent, effectiveYear);
            return (
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-6 relative">
              <button
                onClick={() => setViewingStudent(null)}
                className="absolute right-4 top-4 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-2xl text-yellow-300">
                  {viewingStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{viewingStudent.name}</h3>
                  <p className="text-emerald-200 text-xs font-mono mt-0.5">
                    NISN: {viewingStudent.nisn || '-'} | NIK: {viewingStudent.nik || '-'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 bg-yellow-400 text-emerald-950 font-bold rounded-full text-xs">
                      Kelas {snapshot.rombel || 'Unassigned'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-xs">
                      {viewingStudent.gender}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="text-xs text-gray-500 block">Tempat, Tanggal Lahir</span>
                  <span className="font-semibold text-gray-800">{viewingStudent.tempat_lahir}, {viewingStudent.tanggal_lahir}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Status Akademik</span>
                  <span className="font-bold text-emerald-700 capitalize">{snapshot.status}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Nama Ayah</span>
                  <span className="font-semibold text-gray-800">{viewingStudent.nama_ayah || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Nama Ibu</span>
                  <span className="font-semibold text-gray-800">{viewingStudent.nama_ibu || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Kontak Ortu</span>
                  <span className="font-semibold text-gray-800">{viewingStudent.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Kartu KIP/PIP</span>
                  <span className="font-semibold text-amber-700">{viewingStudent.nomor_kip_pip || 'Bukan Penerima'}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 block">Alamat Tinggal</span>
                <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-xl mt-1">{viewingStudent.address || 'Alamat belum diisi'}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
              <button
                onClick={() => {
                  setPrintingCardStudent(viewingStudent);
                  setViewingStudent(null);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Pelajar</span>
              </button>
              <button
                onClick={() => setViewingStudent(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PRINT KARTU PELAJAR */}
      {/* ========================================================= */}
      {printingCardStudent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {(() => {
            const snapshot = getStudentSnapshotForYear(printingCardStudent, effectiveYear);
            return (
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Pratinjau Kartu Pelajar</h3>

            {/* Print Card Mockup */}
            <div className="border-2 border-emerald-800 rounded-2xl p-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-2xl relative text-left overflow-hidden">
              <div className="flex items-center gap-3 border-b border-white/20 pb-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 text-emerald-950 flex items-center justify-center font-black text-xl">
                  🎓
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-wide">KARTU PELAJAR MADRASAH</h4>
                  <p className="text-[10px] text-emerald-200 uppercase">Si@Kad Digital Madrasah</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-24 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center text-3xl font-bold text-yellow-300">
                  {printingCardStudent.name.charAt(0)}
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-sm text-yellow-300">{printingCardStudent.name}</p>
                  <p className="text-emerald-100 font-mono">NISN: {printingCardStudent.nisn || '-'}</p>
                  <p className="text-emerald-100">Kelas: {snapshot.rombel || 'Unassigned'}</p>
                  <p className="text-emerald-200 text-[10px]">{printingCardStudent.tempat_lahir}, {printingCardStudent.tanggal_lahir}</p>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-300">
                <span>Berlaku Selama Menjadi Siswa</span>
                <span className="font-mono font-bold">VERIFIED DIGITAL</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu</span>
              </button>
              <button
                onClick={() => setPrintingCardStudent(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {/* MODAL DUPLIKAT SISWA UNTUK KELAS & TP BARU */}
      {duplicateModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-teal-800 to-emerald-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl text-teal-200">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Duplikat Data Siswa</h3>
                  <p className="text-[11px] text-teal-200">Salin data ke Tahun Pelajaran & Kelas baru</p>
                </div>
              </div>
              <button
                onClick={() => setDuplicateModal(prev => ({ ...prev, isOpen: false }))}
                className="text-teal-200 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="p-3.5 bg-teal-50/70 border border-teal-200/60 rounded-xl space-y-1.5">
                <div className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Siswa yang Akan Diduplikasi ({duplicateModal.studentIds.length})
                </div>
                <div className="text-xs text-slate-700 max-h-24 overflow-y-auto font-medium space-y-0.5">
                  {students
                    .filter(s => duplicateModal.studentIds.includes(s.id))
                    .map((s, idx) => {
                      const snapshot = getStudentSnapshotForYear(s, effectiveYear);
                      return (
                        <div key={s.id} className="flex items-center justify-between">
                          <span>{idx + 1}. <strong>{s.name}</strong> (NISN: {s.nisn || '-'})</span>
                          <span className="text-[10px] bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded font-mono">
                            TP {effectiveYear} | Rombel: {snapshot.rombel || 'Unassigned'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Tahun Pelajaran Tujuan *
                  </label>
                  <select
                    value={duplicateModal.targetYear}
                    onChange={(e) => setDuplicateModal(prev => ({ ...prev, targetYear: e.target.value }))}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    {['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028', '2028/2029'].map(y => (
                      <option key={y} value={y}>Tahun Pelajaran {y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Rombel / Kelas Tujuan *
                  </label>
                  <select
                    value={duplicateModal.targetRombel}
                    onChange={(e) => setDuplicateModal(prev => ({ ...prev, targetRombel: e.target.value }))}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Belum Ditentukan (Unassigned) --</option>
                    {duplicateTargetClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.nama_kelas} (Tingkat {c.tingkat || '1'} | Wali: {c.wali_kelas || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Status Siswa Baru *
                  </label>
                  <select
                    value={duplicateModal.targetStatus}
                    onChange={(e) => setDuplicateModal(prev => ({ ...prev, targetStatus: e.target.value as Student['status'] }))}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="graduated">Lulus</option>
                    <option value="moved">Mutasi</option>
                    <option value="dropped">Keluar</option>
                  </select>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  💡 <strong>Catatan:</strong> Proses ini akan membuat salinan record data baru untuk siswa terpilih di Tahun Pelajaran & Rombel tujuan. Data asli siswa pada Tahun Pelajaran sebelumnya tidak akan diubah atau dihapus.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDuplicateModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving || duplicateModal.studentIds.length === 0}
                  onClick={handleExecuteDuplicateStudents}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  Proses Duplikasi ({duplicateModal.studentIds.length} Siswa)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROSES KELULUSAN SISWA */}
      {graduateModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-indigo-800 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl text-indigo-200">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Proses Kelulusan Siswa</h3>
                  <p className="text-[11px] text-indigo-200">Meluluskan siswa & mengarsipkannya ke alumni</p>
                </div>
              </div>
              <button
                onClick={() => setGraduateModal(prev => ({ ...prev, isOpen: false }))}
                className="text-indigo-200 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl space-y-1.5">
                <div className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Siswa Diproses Lulus ({graduateModal.studentIds.length})
                </div>
                <div className="text-xs text-slate-700 max-h-28 overflow-y-auto font-medium space-y-1">
                  {students
                    .filter(s => graduateModal.studentIds.includes(s.id))
                    .map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between py-0.5 border-b border-indigo-100/50 last:border-0">
                        <span>{idx + 1}. <strong>{s.name}</strong> (NISN: {s.nisn || '-'})</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-mono font-bold">
                          {s.rombel || s.kelas || 'Siswa'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Tahun Kelulusan *
                    </label>
                    <select
                      value={graduateModal.tahunLulus}
                      onChange={(e) => setGraduateModal(prev => ({ ...prev, tahunLulus: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      {['2021/2022', '2022/2023', '2023/2024', '2024/2025', '2025/2026', '2026/2027'].map(y => (
                        <option key={y} value={y}>Tahun Pelajaran {y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Tanggal Kelulusan *
                    </label>
                    <input
                      type="date"
                      value={graduateModal.tanggalLulus}
                      onChange={(e) => setGraduateModal(prev => ({ ...prev, tanggalLulus: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                    Format / Awalan No. Ijazah (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: DN-02/MA/2025 (Auto-numbered per siswa)"
                    value={graduateModal.noIjazahPrefix}
                    onChange={(e) => setGraduateModal(prev => ({ ...prev, noIjazahPrefix: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                    Keterangan Status Kelulusan
                  </label>
                  <input
                    type="text"
                    value={graduateModal.keterangan}
                    onChange={(e) => setGraduateModal(prev => ({ ...prev, keterangan: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl text-[11px] text-indigo-950 leading-relaxed flex items-start gap-2">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Konfirmasi:</strong> Status {graduateModal.studentIds.length} siswa akan diubah menjadi <strong>LULUS (Graduated)</strong>. Siswa yang telah lulus akan otomatis tercatat di Rekapitulasi Tamatan & Direktori Alumni.
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setGraduateModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving || graduateModal.studentIds.length === 0}
                  onClick={handleExecuteGraduation}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                  Konfirmasi Luluskan ({graduateModal.studentIds.length} Siswa)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL BATALKAN KELULUSAN / KEMBALIKAN KE SISWA AKTIF */}
      {revertModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl text-amber-200">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Batalkan Kelulusan Siswa</h3>
                  <p className="text-[11px] text-amber-100">Mengembalikan siswa lulus menjadi siswa aktif</p>
                </div>
              </div>
              <button
                onClick={() => setRevertModal(prev => ({ ...prev, isOpen: false }))}
                className="text-amber-200 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-1.5">
                <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-600" /> Siswa Diproses Batal Lulus ({revertModal.studentIds.length})
                </div>
                <div className="text-xs text-slate-700 max-h-32 overflow-y-auto font-medium space-y-1">
                  {students
                    .filter(s => revertModal.studentIds.map(String).includes(String(s.id)))
                    .map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between py-1 border-b border-amber-100/60 last:border-0">
                        <span>{idx + 1}. <strong>{s.name}</strong> (NISN: {s.nisn || '-'})</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                          {s.rombel || 'Alumni'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-amber-600" /> Rombel / Kelas Tujuan Siswa Aktif:
                </label>
                <select
                  value={revertModal.targetRombel || (yearClasses[0]?.nama_kelas || classes[0]?.nama_kelas || '6A')}
                  onChange={(e) => setRevertModal(prev => ({ ...prev, targetRombel: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  {(yearClasses.length > 0 ? yearClasses : (classes.length > 0 ? classes : DEFAULT_CLASSES)).map(c => (
                    <option key={c.id} value={c.nama_kelas}>Kelas {c.nama_kelas} (Tapel {activeAcademicYear})</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 italic">
                  Status siswa akan diubah kembali ke <strong>Aktif</strong> dan dimasukkan ke rombel yang dipilih di atas.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setRevertModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving || revertModal.studentIds.length === 0}
                onClick={handleExecuteRevertGraduation}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Kembalikan ke Siswa Aktif ({revertModal.studentIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
