import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  School,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText,
  PieChart as PieChartIcon,
  ChevronRight,
  UserPlus,
  ArrowRightLeft,
  X,
  Printer,
  Sparkles,
  ShieldCheck,
  Building,
  Calendar,
  Phone,
  MapPin,
  HeartHandshake,
  Copy,
  GraduationCap,
  Award
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import * as XLSX from 'xlsx';
import { useMadrasah } from '../../contexts/MadrasahContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { syncDataToAcademicYear } from '../../utils/academicYearSync';
import { getStudentRombelForYear, setStudentRombelForYear, RombelHistoryItem } from '../../utils/studentRombelHistory';

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
  kebutuhan_khusus?: string;
  disabilitas?: string;
  nomor_kip_pip?: string;
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
  keterangan?: string;
}

const STORAGE_KEYS_STUDENTS = ['students_list', 'siakad_students_data', 'site_students', 'app_students_v2', 'students_data', 'madrasah_students'];
const STORAGE_KEYS_CLASSES = ['kelas_list', 'siakad_classes_data', 'siakad_rombel_classes', 'site_classes', 'app_classes', 'classes_data', 'madrasah_classes'];
const LOCAL_CACHE_STUDENTS = 'siakad_students_cache';
const LOCAL_CACHE_CLASSES = 'siakad_classes_cache';

export default function DirektoriSiswa() {
  const { activeMadrasahId, getScopedKey } = useMadrasah();
  const { settings } = useSiteSettings();
  const activeYearFromSettings = settings.tahun_pelajaran?.active_year || '2024/2025';

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<RombelClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'daftar' | 'rombel' | 'rekap' | 'import'>('daftar');

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRombelFilter, setSelectedRombelFilter] = useState<string>('ALL');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(activeYearFromSettings);

  // Sync selectedYearFilter if activeYearFromSettings updates
  useEffect(() => {
    if (activeYearFromSettings) {
      setSelectedYearFilter(activeYearFromSettings);
    }
  }, [activeYearFromSettings]);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Modals state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const [showRombelModal, setShowRombelModal] = useState(false);
  const [editingRombel, setEditingRombel] = useState<RombelClass | null>(null);

  const [showMoveRombelModal, setShowMoveRombelModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetRombelForMove, setTargetRombelForMove] = useState<string>('');

  // Duplicate Student State
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

  // Import Excel state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [parsedImportRows, setParsedImportRows] = useState<Partial<Student>[]>([]);
  const [importPreviewModal, setImportPreviewModal] = useState(false);
  const [targetRombelForImport, setTargetRombelForImport] = useState<string>('AUTO');

  // Student Form State
  const initialStudentForm: Partial<Student> = {
    name: '',
    nisn: '',
    nik: '',
    gender: 'Laki-laki',
    class_id: '',
    tingkat_rombel: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    address: '',
    phone: '',
    status: 'active',
    tahun_pelajaran: '2024/2025',
    nama_ayah: '',
    nama_ibu: '',
    nama_wali: '',
    kebutuhan_khusus: '',
    disabilitas: '',
    nomor_kip_pip: ''
  };
  const [studentForm, setStudentForm] = useState<Partial<Student>>(initialStudentForm);

  // Rombel Form State
  const initialRombelForm: Partial<RombelClass> = {
    nama_kelas: '',
    tingkat: '1',
    wali_kelas: '',
    ruangan: '',
    kapasitas: 32,
    tahun_pelajaran: '2024/2025',
    keterangan: ''
  };
  const [rombelForm, setRombelForm] = useState<Partial<RombelClass>>(initialRombelForm);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // -------------------------------------------------------------
  // Load & Sync Engine (Real-Time Auto Fetch & Broadcast)
  // -------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);
    try {
      const scopedClassesKey = getScopedKey ? getScopedKey('kelas_list') : `kelas_list_${activeMadrasahId || 'madrasah_default'}`;
      const allClassKeys = Array.from(new Set([
        scopedClassesKey,
        'kelas_list',
        `kelas_list_${activeMadrasahId || 'madrasah_default'}`,
        ...STORAGE_KEYS_CLASSES
      ]));

      // 1. Load classes
      let loadedClasses: RombelClass[] = [];
      let classesFoundInDb = false;

      const { data: classRows } = await supabase
        .from('site_settings')
        .select('id, value, updated_at')
        .in('id', allClassKeys)
        .order('updated_at', { ascending: false, nullsFirst: false });

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
        const cached = localStorage.getItem(LOCAL_CACHE_CLASSES) || localStorage.getItem(scopedClassesKey) || localStorage.getItem('kelas_list');
        if (cached !== null) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              loadedClasses = parsed;
              classesFoundInDb = true;
            }
          } catch (e) { console.error(e); }
        }
      }

      // Default default classes if empty and not found in db/cache
      if (!classesFoundInDb && loadedClasses.length === 0) {
        loadedClasses = [
          { id: 'c-1a', nama_kelas: 'Kelas 1A', tingkat: '1', wali_kelas: '-', tahun_pelajaran: '2024/2025' },
          { id: 'c-1b', nama_kelas: 'Kelas 1B', tingkat: '1', wali_kelas: '-', tahun_pelajaran: '2024/2025' },
          { id: 'c-2a', nama_kelas: 'Kelas 2A', tingkat: '2', wali_kelas: '-', tahun_pelajaran: '2024/2025' },
          { id: 'c-3a', nama_kelas: 'Kelas 3A', tingkat: '3', wali_kelas: '-', tahun_pelajaran: '2024/2025' },
          { id: 'c-4a', nama_kelas: 'Kelas 4A', tingkat: '4', wali_kelas: '-', tahun_pelajaran: '2024/2025' },
          { id: 'c-5a', nama_kelas: 'Kelas 5A', tingkat: '5', wali_kelas: '-', tahun_pelajaran: '2024/2025' },
          { id: 'c-6a', nama_kelas: 'Kelas 6A', tingkat: '6', wali_kelas: '-', tahun_pelajaran: '2024/2025' },
        ];
      }

      setClasses(loadedClasses);
      try { localStorage.setItem(LOCAL_CACHE_CLASSES, JSON.stringify(loadedClasses)); } catch (err) { void err; }
      try { localStorage.setItem('kelas_list', JSON.stringify(loadedClasses)); } catch (err) { void err; }
      try { localStorage.setItem(scopedClassesKey, JSON.stringify(loadedClasses)); } catch (err) { void err; }

      // 2. Load students
      const scopedStudentsKey = getScopedKey ? getScopedKey('students_list') : `students_list_${activeMadrasahId || 'madrasah_default'}`;
      const allStudentKeys = Array.from(new Set([
        scopedStudentsKey,
        'students_list',
        `students_list_${activeMadrasahId || 'madrasah_default'}`,
        ...STORAGE_KEYS_STUDENTS
      ]));

      let loadedStudents: Student[] = [];
      let studentsFoundInDb = false;

      const { data: studentRows } = await supabase
        .from('site_settings')
        .select('id, value, updated_at')
        .in('id', allStudentKeys)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (studentRows && studentRows.length > 0) {
        for (const r of studentRows) {
          if (Array.isArray(r.value)) {
            loadedStudents = r.value;
            studentsFoundInDb = true;
            break;
          }
        }
      }

      if (!studentsFoundInDb) {
        const cached = localStorage.getItem(LOCAL_CACHE_STUDENTS) || localStorage.getItem(scopedStudentsKey) || localStorage.getItem('students_list');
        if (cached !== null) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              loadedStudents = parsed;
              studentsFoundInDb = true;
            }
          } catch (e) { console.error(e); }
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
      try { localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify(loadedStudents)); } catch (err) { void err; }
      try { localStorage.setItem('students_list', JSON.stringify(loadedStudents)); } catch (err) { void err; }
      try { localStorage.setItem(scopedStudentsKey, JSON.stringify(loadedStudents)); } catch (err) { void err; }
    } catch (err) {
      console.error('Fetch student directory failed:', err);
      showToast('Gagal memuat data direktori', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to local custom event & window storage
    const handleLocalUpdate = () => {
      const cStudents = localStorage.getItem(LOCAL_CACHE_STUDENTS);
      if (cStudents) {
        try { setStudents(JSON.parse(cStudents)); } catch (e) { console.error(e); }
      }
      const cClasses = localStorage.getItem(LOCAL_CACHE_CLASSES);
      if (cClasses) {
        try { setClasses(JSON.parse(cClasses)); } catch (e) { console.error(e); }
      }
    };

    window.addEventListener('siakad_direktori_updated', handleLocalUpdate);
    window.addEventListener('siakad_classes_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    // Supabase Realtime channel
    const channel = supabase
      .channel('direktori_siswa_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload) => {
          if (payload.new && (payload.new as any).id) {
            const key = (payload.new as any).id;
            if ((STORAGE_KEYS_STUDENTS.includes(key) || key.includes('students_list')) && Array.isArray((payload.new as any).value)) {
              setStudents((payload.new as any).value);
              try { localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify((payload.new as any).value)); } catch (err) { void err; }
            }
            if ((STORAGE_KEYS_CLASSES.includes(key) || key.includes('kelas_list')) && Array.isArray((payload.new as any).value)) {
              setClasses((payload.new as any).value);
              try { localStorage.setItem(LOCAL_CACHE_CLASSES, JSON.stringify((payload.new as any).value)); } catch (err) { void err; }
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('siakad_direktori_updated', handleLocalUpdate);
      window.removeEventListener('siakad_classes_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [activeMadrasahId]);

  // Save Students Helper
  const persistStudents = async (newStudentsList: Student[]) => {
    setStudents(newStudentsList);

    const scopedKey = getScopedKey ? getScopedKey('students_list') : `students_list_${activeMadrasahId || 'madrasah_default'}`;
    const allKeys = Array.from(new Set([
      scopedKey,
      'students_list',
      `students_list_${activeMadrasahId || 'madrasah_default'}`,
      ...STORAGE_KEYS_STUDENTS
    ]));

    try { localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify(newStudentsList)); } catch (err) { void err; }
    try { localStorage.setItem('students_list', JSON.stringify(newStudentsList)); } catch (err) { void err; }
    try { localStorage.setItem(scopedKey, JSON.stringify(newStudentsList)); } catch (err) { void err; }
    allKeys.forEach(k => {
      try { localStorage.setItem(k, JSON.stringify(newStudentsList)); } catch (err) { void err; }
    });

    try {
      const cachedStr = localStorage.getItem('siakad_site_settings');
      const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
      allKeys.forEach(k => {
        settingsObj[k] = newStudentsList;
      });
      localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
    } catch (err) { void err; }

    try {
      const now = new Date().toISOString();
      const payload = allKeys.map(k => ({ id: k, value: newStudentsList, updated_at: now }));
      await supabase.from('site_settings').upsert(payload);
    } catch (e) {
      console.error('Supabase students save error:', e);
    }

    window.dispatchEvent(new CustomEvent('siakad_direktori_updated'));
  };

  // Save Classes Helper
  const persistClasses = async (newClassesList: RombelClass[]) => {
    setClasses(newClassesList);

    const scopedKey = getScopedKey ? getScopedKey('kelas_list') : `kelas_list_${activeMadrasahId || 'madrasah_default'}`;
    const allKeys = Array.from(new Set([
      scopedKey,
      'kelas_list',
      `kelas_list_${activeMadrasahId || 'madrasah_default'}`,
      ...STORAGE_KEYS_CLASSES
    ]));

    try { localStorage.setItem(LOCAL_CACHE_CLASSES, JSON.stringify(newClassesList)); } catch (err) { void err; }
    try { localStorage.setItem('kelas_list', JSON.stringify(newClassesList)); } catch (err) { void err; }
    try { localStorage.setItem(scopedKey, JSON.stringify(newClassesList)); } catch (err) { void err; }
    allKeys.forEach(k => {
      try { localStorage.setItem(k, JSON.stringify(newClassesList)); } catch (err) { void err; }
    });

    try {
      const cachedStr = localStorage.getItem('siakad_site_settings');
      const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
      allKeys.forEach(k => {
        settingsObj[k] = newClassesList;
      });
      localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
    } catch (err) { void err; }

    window.dispatchEvent(new CustomEvent('siakad_direktori_updated'));
    window.dispatchEvent(new CustomEvent('siakad_classes_updated'));

    try {
      const now = new Date().toISOString();
      for (const k of allKeys) {
        await supabase
          .from('site_settings')
          .upsert({ id: k, value: newClassesList, updated_at: now });
      }
    } catch (e) {
      console.error('Supabase classes save error:', e);
    }
  };

  // -------------------------------------------------------------
  // Filtered Data & Statistics Calculations
  // -------------------------------------------------------------
  const filteredStudents = useMemo(() => {
    const evalYear = selectedYearFilter !== 'ALL' ? selectedYearFilter : activeYearFromSettings;

    return students.filter(student => {
      const { rombel: sRombel, class_id: sClassId, status: sStatus } = getStudentRombelForYear(student, evalYear);

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = student.name?.toLowerCase().includes(q);
        const matchNisn = student.nisn?.toLowerCase().includes(q);
        const matchNik = student.nik?.toLowerCase().includes(q);
        const matchRombel = sRombel?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchNik && !matchRombel) return false;
      }

      // Rombel filter
      if (selectedRombelFilter !== 'ALL') {
        const selectedClassObj = classes.find(c => c.id === selectedRombelFilter || c.nama_kelas === selectedRombelFilter);
        const matchById = sClassId === selectedRombelFilter;
        const matchByName = selectedClassObj && (sRombel === selectedClassObj.nama_kelas || sRombel.toLowerCase() === selectedClassObj.nama_kelas.toLowerCase());
        if (!matchById && !matchByName) return false;
      }

      // Gender filter
      if (selectedGenderFilter !== 'ALL' && student.gender !== selectedGenderFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL' && sStatus !== selectedStatusFilter) {
        return false;
      }

      // Year filter
      if (selectedYearFilter !== 'ALL') {
        const st = sStatus.toLowerCase().trim();
        if ((st === 'graduated' || st === 'lulus' || st === 'alumni') && student.tahun_lulus && student.tahun_lulus !== selectedYearFilter) {
          return false;
        }
      }

      return true;
    });
  }, [students, classes, searchTerm, selectedRombelFilter, selectedGenderFilter, selectedStatusFilter, selectedYearFilter, activeYearFromSettings]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const laki = students.filter(s => s.gender === 'Laki-laki').length;
    const perempuan = students.filter(s => s.gender === 'Perempuan').length;
    const active = students.filter(s => s.status === 'active' || !s.status).length;
    const graduated = students.filter(s => s.status === 'graduated').length;
    const moved = students.filter(s => s.status === 'moved').length;
    const withKip = students.filter(s => s.nomor_kip_pip && s.nomor_kip_pip.trim() !== '').length;

    return { total, laki, perempuan, active, graduated, moved, withKip };
  }, [students]);

  // Stats Breakdown per Rombel
  const rombelStats = useMemo(() => {
    const evalYear = selectedYearFilter !== 'ALL' ? selectedYearFilter : activeYearFromSettings;
    return classes.map(cls => {
      const clsStudents = students.filter(s => {
        const { rombel: sRombel, class_id: sClassId, status: sStatus } = getStudentRombelForYear(s, evalYear);
        const st = sStatus.toLowerCase().trim();
        const rb = sRombel.toLowerCase().trim();
        if (st === 'graduated' || st === 'lulus' || st === 'alumni' || rb.includes('alumni') || rb.includes('lulus') || st === 'moved' || st === 'dropped') {
          return false;
        }
        if (sClassId === cls.id) return true;
        return rb === cls.nama_kelas.toLowerCase();
      });

      const total = clsStudents.length;
      const laki = clsStudents.filter(s => s.gender === 'Laki-laki').length;
      const perempuan = clsStudents.filter(s => s.gender === 'Perempuan').length;
      const kip = clsStudents.filter(s => s.nomor_kip_pip && s.nomor_kip_pip.trim() !== '').length;

      return {
        ...cls,
        totalStudents: total,
        laki,
        perempuan,
        kip
      };
    });
  }, [classes, students, activeYearFromSettings, selectedYearFilter]);

  // Unassigned Students (students without rombel)
  const unassignedStudentsCount = useMemo(() => {
    const evalYear = selectedYearFilter !== 'ALL' ? selectedYearFilter : activeYearFromSettings;
    return students.filter(s => {
      const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, evalYear);
      if (!sClassId && !sRombel) return true;
      const rName = sRombel.trim();
      if (!rName) return true;
      const exists = classes.some(c => c.id === sClassId || c.nama_kelas.toLowerCase() === rName.toLowerCase());
      return !exists;
    }).length;
  }, [students, classes, selectedYearFilter, activeYearFromSettings]);

  // -------------------------------------------------------------
  // Student Actions: Add, Edit, Delete, Bulk Move
  // -------------------------------------------------------------
  const handleOpenAddStudent = () => {
    setStudentForm(initialStudentForm);
    setEditingStudent(null);
    setShowAddStudentModal(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({ ...student });
    setShowAddStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.name.trim()) {
      showToast('Nama siswa wajib diisi!', 'error');
      return;
    }

    setSaving(true);
    try {
      // Find class object
      const targetClass = classes.find(c => c.id === studentForm.class_id || c.nama_kelas === studentForm.tingkat_rombel);
      const classNameToSet = targetClass ? targetClass.nama_kelas : (studentForm.tingkat_rombel || '');

      let updatedList: Student[] = [];
      const targetYear = studentForm.tahun_pelajaran || activeYearFromSettings;
      const isCurrentActiveYear = targetYear === activeYearFromSettings;

      if (editingStudent) {
        updatedList = students.map(s => {
          if (s.id === editingStudent.id) {
            const merged = {
              ...s,
              ...studentForm,
              name: studentForm.name!.trim(),
              gender: studentForm.gender || 'Laki-laki'
            };
            return setStudentRombelForYear(
              merged,
              targetYear,
              classNameToSet,
              targetClass?.id || studentForm.class_id || '',
              studentForm.status || 'active',
              isCurrentActiveYear
            ) as Student;
          }
          return s;
        });
      } else {
        const newStudentBase: Student = {
          id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: studentForm.name!.trim(),
          nisn: studentForm.nisn || '',
          nik: studentForm.nik || '',
          gender: studentForm.gender || 'Laki-laki',
          class_id: targetClass?.id || studentForm.class_id || '',
          tingkat_rombel: classNameToSet,
          kelas: classNameToSet,
          rombel: classNameToSet,
          tempat_lahir: studentForm.tempat_lahir || '',
          tanggal_lahir: studentForm.tanggal_lahir || '',
          address: studentForm.address || '',
          phone: studentForm.phone || '',
          status: studentForm.status || 'active',
          tahun_pelajaran: targetYear,
          nama_ayah: studentForm.nama_ayah || '',
          nama_ibu: studentForm.nama_ibu || '',
          nama_wali: studentForm.nama_wali || '',
          kebutuhan_khusus: studentForm.kebutuhan_khusus || '',
          disabilitas: studentForm.disabilitas || '',
          nomor_kip_pip: studentForm.nomor_kip_pip || '',
          created_at: new Date().toISOString()
        };
        const newStudent = setStudentRombelForYear(
          newStudentBase,
          targetYear,
          classNameToSet,
          targetClass?.id || studentForm.class_id || '',
          studentForm.status || 'active',
          isCurrentActiveYear
        ) as Student;
        updatedList = [newStudent, ...students];
      }

      await persistStudents(updatedList);
      showToast(editingStudent ? 'Data siswa berhasil diperbarui' : 'Siswa baru berhasil ditambahkan');
      setShowAddStudentModal(false);
      setEditingStudent(null);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan data siswa', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Data Siswa',
      message: `Apakah Anda yakin ingin menghapus data siswa "${studentName}"? Data yang dihapus tidak dapat dikembalikan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const updatedList = students.filter(s => s.id !== studentId);
          await persistStudents(updatedList);
          showToast(`Data siswa "${studentName}" berhasil dihapus`);
        } catch (err) {
          showToast('Gagal menghapus siswa', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleBulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Massal Siswa',
      message: `Apakah Anda yakin ingin menghapus ${selectedStudentIds.length} siswa yang dipilih?`,
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const selectedSet = new Set(selectedStudentIds.map(String));
          const updatedList = students.filter(s => !selectedSet.has(String(s.id)));
          await persistStudents(updatedList);
          setSelectedStudentIds([]);
          showToast(`${selectedStudentIds.length} data siswa berhasil dihapus`);
        } catch (err) {
          showToast('Gagal menghapus siswa', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleBulkMoveRombel = async () => {
    if (selectedStudentIds.length === 0 || !targetRombelForMove) return;

    const targetClass = classes.find(c => c.id === targetRombelForMove || c.nama_kelas === targetRombelForMove);
    if (!targetClass) {
      showToast('Pilih rombel tujuan yang valid', 'error');
      return;
    }

    try {
      const selectedSet = new Set(selectedStudentIds.map(String));
      const activeYr = selectedAcademicYear || activeYearFromSettings || '2025/2026';

      const updatedList = students.map(s => {
        if (selectedSet.has(String(s.id))) {
          const newStatus = (!s.status || s.status === 'unassigned') ? 'active' : s.status;
          const baseUpdated = {
            ...s,
            class_id: targetClass.id,
            tingkat_rombel: targetClass.nama_kelas,
            kelas: targetClass.nama_kelas,
            rombel: targetClass.nama_kelas,
            status: newStatus as any,
            tahun_pelajaran: s.tahun_pelajaran || activeYr
          };
          return setStudentRombelForYear(
            baseUpdated as any,
            activeYr,
            targetClass.nama_kelas,
            targetClass.id,
            newStatus,
            true
          ) as Student;
        }
        return s;
      });

      await persistStudents(updatedList);
      showToast(`${selectedStudentIds.length} siswa berhasil dipindahkan ke ${targetClass.nama_kelas}`);
      setSelectedStudentIds([]);
      setShowMoveRombelModal(false);
    } catch (err) {
      showToast('Gagal memindahkan siswa', 'error');
    }
  };

  const handleExecuteDuplicateStudents = async () => {
    if (duplicateModal.studentIds.length === 0) return;
    if (!duplicateModal.targetYear) {
      showToast('Pilih Tahun Pelajaran tujuan!', 'error');
      return;
    }

    setSaving(true);
    try {
      const targetStudents = students.filter(s => duplicateModal.studentIds.includes(s.id));
      const matchedClass = classes.find(c => c.id === duplicateModal.targetRombel || c.nama_kelas === duplicateModal.targetRombel);
      const targetClassName = matchedClass ? matchedClass.nama_kelas : duplicateModal.targetRombel;
      const targetClassId = matchedClass ? matchedClass.id : undefined;

      const duplicatedRecords: Student[] = targetStudents.map(s => {
        const newId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return {
          ...s,
          id: newId,
          tahun_pelajaran: duplicateModal.targetYear,
          class_id: targetClassId || undefined,
          tingkat_rombel: targetClassName || '',
          kelas: targetClassName || '',
          rombel: targetClassName || '',
          status: duplicateModal.targetStatus,
          created_at: new Date().toISOString()
        };
      });

      const nextList = [...students, ...duplicatedRecords];
      await persistStudents(nextList);

      showToast(`Berhasil menduplikasi ${duplicatedRecords.length} siswa ke TP ${duplicateModal.targetYear} ${targetClassName ? `(Rombel ${targetClassName})` : ''}`);
      setSelectedStudentIds([]);
      setDuplicateModal({
        isOpen: false,
        studentIds: [],
        targetYear: '2025/2026',
        targetRombel: '',
        targetStatus: 'active',
      });
    } catch (err) {
      showToast('Gagal menduplikasi data siswa', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteGraduation = async () => {
    if (graduateModal.studentIds.length === 0) return;
    if (!graduateModal.tahunLulus) {
      showToast('Pilih Tahun Kelulusan terlebih dahulu!', 'error');
      return;
    }

    setSaving(true);
    try {
      const targetIds = graduateModal.studentIds;
      const updatedStudents = students.map((s, idx) => {
        if (targetIds.includes(s.id)) {
          return {
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
        }
        return s;
      });

      await persistStudents(updatedStudents);
      showToast(`Berhasil meluluskan ${targetIds.length} siswa!`, 'success');
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
      showToast('Gagal memproses kelulusan siswa', 'error');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Rombel Actions: Add, Edit, Delete
  // -------------------------------------------------------------
  const handleOpenAddRombel = () => {
    setRombelForm(initialRombelForm);
    setEditingRombel(null);
    setShowRombelModal(true);
  };

  const handleOpenEditRombel = (cls: RombelClass) => {
    setEditingRombel(cls);
    setRombelForm({ ...cls });
    setShowRombelModal(true);
  };

  const handleSaveRombel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rombelForm.nama_kelas || !rombelForm.nama_kelas.trim()) {
      showToast('Nama kelas / rombel wajib diisi!', 'error');
      return;
    }

    setSaving(true);
    try {
      let updatedClasses: RombelClass[] = [];
      if (editingRombel) {
        updatedClasses = classes.map(c => c.id === editingRombel.id ? {
          ...c,
          ...rombelForm,
          nama_kelas: rombelForm.nama_kelas!.trim()
        } as RombelClass : c);
      } else {
        const newRombel: RombelClass = {
          id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          nama_kelas: rombelForm.nama_kelas!.trim(),
          tingkat: rombelForm.tingkat || '1',
          wali_kelas: rombelForm.wali_kelas || '-',
          ruangan: rombelForm.ruangan || '',
          kapasitas: rombelForm.kapasitas || 32,
          tahun_pelajaran: rombelForm.tahun_pelajaran || '2024/2025',
          keterangan: rombelForm.keterangan || ''
        };
        updatedClasses = [...classes, newRombel];
      }

      await persistClasses(updatedClasses);
      showToast(editingRombel ? 'Data rombel berhasil diperbarui' : 'Rombel baru berhasil dibuat');
      setShowRombelModal(false);
      setEditingRombel(null);
    } catch (err) {
      showToast('Gagal menyimpan data rombel', 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteRombel = async (clsId: string, clsName: string) => {
    setSaving(true);
    try {
      // 1. Delete class by ID or Name
      const updatedClasses = classes.filter(c => {
        const isIdMatch = clsId && c.id === clsId;
        const isNameMatch = clsName && c.nama_kelas && c.nama_kelas.trim().toLowerCase() === clsName.trim().toLowerCase();
        return !isIdMatch && !isNameMatch;
      });
      await persistClasses(updatedClasses);

      // 2. Unassign students in this class
      const updatedStudents = students.map(s => {
        const matchId = clsId && s.class_id === clsId;
        const matchName = clsName && (s.tingkat_rombel || s.kelas || s.rombel || '').trim().toLowerCase() === clsName.trim().toLowerCase();
        if (matchId || matchName) {
          return {
            ...s,
            class_id: '',
            tingkat_rombel: '',
            kelas: '',
            rombel: ''
          };
        }
        return s;
      });
      await persistStudents(updatedStudents);

      if (editingRombel && (editingRombel.id === clsId || editingRombel.nama_kelas?.trim().toLowerCase() === clsName?.trim().toLowerCase())) {
        setEditingRombel(null);
        setShowRombelModal(false);
      }

      showToast(`Rombel "${clsName}" berhasil dihapus secara permanen`, 'success');
    } catch (err) {
      console.error('Delete rombel error:', err);
      showToast('Gagal menghapus rombel', 'error');
    } finally {
      setSaving(false);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteRombel = (clsId: string, clsName: string) => {
    const affectedStudentsCount = students.filter(s => {
      if (s.class_id === clsId) return true;
      const rName = (s.tingkat_rombel || s.kelas || s.rombel || '').trim();
      return rName.toLowerCase() === clsName.toLowerCase();
    }).length;

    const message = affectedStudentsCount > 0
      ? `Apakah Anda yakin ingin menghapus Rombel "${clsName}"?\n\n⚠️ Terdapat ${affectedStudentsCount} siswa yang terdaftar di Rombel ini. Siswa tidak akan terhapus dari sistem, namun status rombelnya akan diubah menjadi Unassigned (Belum Ada Rombel).`
      : `Apakah Anda yakin ingin menghapus Rombel "${clsName}" secara permanen? Data yang dihapus tidak dapat dikembalikan.`;

    setConfirmDialog({
      isOpen: true,
      title: `Hapus Rombel "${clsName}"`,
      message,
      confirmText: 'Ya, Hapus Rombel',
      cancelText: 'Batal',
      variant: 'danger',
      onConfirm: () => executeDeleteRombel(clsId, clsName),
    });
  };

  // -------------------------------------------------------------
  // Excel Impor & Parser Engine (Fail-safe Dynamic Matching)
  // -------------------------------------------------------------
  const handleParseExcelFile = (file: File) => {
    setExcelFile(file);
    setImportingExcel(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          showToast('File Excel kosong atau tidak memiliki data!', 'error');
          setImportingExcel(false);
          return;
        }

        // Clean helpers
        const cleanStr = (val: any): string => {
          if (val === undefined || val === null) return '';
          if (typeof val === 'number') {
            return val.toLocaleString('fullwide', { useGrouping: false });
          }
          return val.toString().trim();
        };

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

        // Header Detector (Scan first 25 rows)
        let headerRowIndex = -1;
        let maxScore = -1;

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

          if (score > maxScore && score >= 3) {
            maxScore = score;
            headerRowIndex = r;
          }
        }

        // Column Index Mapping
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
        const parsedList: Partial<Student>[] = [];

        for (let r = startRow; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          const rawName = getCol('name', colMap.name !== undefined ? colMap.name : (colMap.nisn === 1 || colMap.nik === 1 ? 2 : 1), row);
          let nameStr = cleanStr(rawName);

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
            const nextColVal = cleanStr(row[(colMap.name !== undefined ? colMap.name : 1) + 1]);
            if (nextColVal && !/^\d+$/.test(nextColVal)) {
              nameStr = nextColVal;
            } else {
              continue;
            }
          }

          const nisn = cleanStr(getCol('nisn', 2, row));
          const nik = cleanStr(getCol('nik', 3, row));
          const tempat_lahir = cleanStr(getCol('tempat_lahir', 4, row));
          const tanggal_lahir = cleanDateStr(getCol('tanggal_lahir', 5, row));
          const rombelExcel = cleanStr(getCol('tingkat_rombel', 6, row));
          const statusRaw = cleanStr(getCol('status', 8, row));
          const genderRaw = cleanStr(getCol('gender', 9, row));
          const address = cleanStr(getCol('alamat', 10, row));
          const phone = cleanStr(getCol('phone', 11, row));
          const kebutuhan_khusus = cleanStr(getCol('kebutuhan_khusus', 12, row));
          const disabilitas = cleanStr(getCol('disabilitas', 13, row));
          const nomor_kip_pip = cleanStr(getCol('nomor_kip_pip', 14, row));
          const nama_ayah = cleanStr(getCol('nama_ayah', 15, row));
          const nama_ibu = cleanStr(getCol('nama_ibu', 16, row));
          const nama_wali = cleanStr(getCol('nama_wali', 17, row));

          const resolvedGender: 'Laki-laki' | 'Perempuan' =
            (genderRaw && (genderRaw.toLowerCase().startsWith('p') || genderRaw.toLowerCase().includes('perempuan') || genderRaw.toLowerCase() === 'female' || genderRaw === '2'))
              ? 'Perempuan' : 'Laki-laki';

          let resolvedStatus: 'active' | 'graduated' | 'moved' = 'active';
          if (statusRaw) {
            const stLower = statusRaw.toLowerCase();
            if (stLower.includes('lulus') || stLower === 'graduated') resolvedStatus = 'graduated';
            else if (stLower.includes('pindah') || stLower.includes('keluar') || stLower === 'moved') resolvedStatus = 'moved';
          }

          parsedList.push({
            name: nameStr,
            nisn,
            nik,
            tempat_lahir,
            tanggal_lahir,
            tingkat_rombel: rombelExcel,
            gender: resolvedGender,
            address,
            phone,
            status: resolvedStatus,
            kebutuhan_khusus,
            disabilitas,
            nomor_kip_pip,
            nama_ayah,
            nama_ibu,
            nama_wali
          });
        }

        if (parsedList.length === 0) {
          showToast('Tidak ada data baris siswa yang terdeteksi dari file ini!', 'error');
        } else {
          setParsedImportRows(parsedList);
          setImportPreviewModal(true);
          showToast(`Berhasil membaca ${parsedList.length} data calon siswa dari file Excel`);
        }
      } catch (err) {
        console.error('Failed reading Excel file:', err);
        showToast('Gagal membaca file Excel. Pastikan format file valid (.xlsx / .xls)', 'error');
      } finally {
        setImportingExcel(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleCommitImport = async () => {
    if (parsedImportRows.length === 0) return;

    setSaving(true);
    try {
      const currentStudents = [...students];
      const currentClasses = [...classes];

      let newInserted = 0;
      let skippedCount = 0;
      const timestamp = Date.now();

      parsedImportRows.forEach((row, idx) => {
        // Determine class
        let finalClassId = '';
        let finalClassName = row.tingkat_rombel || '';

        if (targetRombelForImport !== 'AUTO') {
          const selectedTargetClass = currentClasses.find(c => c.id === targetRombelForImport);
          if (selectedTargetClass) {
            finalClassId = selectedTargetClass.id;
            finalClassName = selectedTargetClass.nama_kelas;
          }
        } else if (row.tingkat_rombel) {
          // Auto match with existing rombel or create one if missing
          let matchedClass = currentClasses.find(c =>
            c.nama_kelas.toLowerCase() === row.tingkat_rombel?.toLowerCase() ||
            c.id === row.tingkat_rombel
          );

          if (!matchedClass && row.tingkat_rombel.trim()) {
            // Auto create rombel
            matchedClass = {
              id: `c-auto-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              nama_kelas: row.tingkat_rombel.trim(),
              tingkat: '1',
              wali_kelas: '-',
              tahun_pelajaran: '2024/2025'
            };
            currentClasses.push(matchedClass);
          }

          if (matchedClass) {
            finalClassId = matchedClass.id;
            finalClassName = matchedClass.nama_kelas;
          }
        }

        // Check if student exists by NISN, NIK, or exact Name
        const existingIdx = currentStudents.findIndex(s => {
          if (row.nisn && s.nisn && s.nisn.trim().toLowerCase() === row.nisn.toLowerCase()) return true;
          if (row.nik && s.nik && s.nik.trim().toLowerCase() === row.nik.toLowerCase()) return true;
          if (row.name && s.name && s.name.trim().toLowerCase() === row.name.toLowerCase()) {
            if (row.tanggal_lahir && s.tanggal_lahir && s.tanggal_lahir !== '2016-01-01' && row.tanggal_lahir !== '2016-01-01') {
              return s.tanggal_lahir === row.tanggal_lahir;
            }
            return true;
          }
          return false;
        });

        if (existingIdx !== -1) {
          skippedCount++;
          // JANGAN DITIMPA JIKA SISWA SUDAH ADA
        } else {
          // Insert
          const newStudent: Student = {
            id: `imp-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            name: row.name || '',
            nisn: row.nisn || '',
            nik: row.nik || '',
            gender: row.gender || 'Laki-laki',
            class_id: finalClassId,
            tingkat_rombel: finalClassName,
            kelas: finalClassName,
            rombel: finalClassName,
            tempat_lahir: row.tempat_lahir || '',
            tanggal_lahir: row.tanggal_lahir || '',
            address: row.address || '',
            phone: row.phone || '',
            status: row.status || 'active',
            tahun_pelajaran: '2024/2025',
            nama_ayah: row.nama_ayah || '',
            nama_ibu: row.nama_ibu || '',
            nama_wali: row.nama_wali || '',
            kebutuhan_khusus: row.kebutuhan_khusus || '',
            disabilitas: row.disabilitas || '',
            nomor_kip_pip: row.nomor_kip_pip || '',
            created_at: new Date().toISOString()
          };
          currentStudents.push(newStudent);
          newInserted++;
        }
      });

      // Save updated rombel & students
      await persistClasses(currentClasses);
      await persistStudents(currentStudents);

      let msg = `Impor Sukses: ${newInserted} siswa baru ditambahkan!`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} siswa sudah ada & tidak ditimpa)`;
      }
      showToast(msg);
      setImportPreviewModal(false);
      setParsedImportRows([]);
      setExcelFile(null);
      setActiveTab('daftar');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses simpan impor data Excel', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      ['NO', 'NAMA SISWA', 'NISN', 'NIK', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'ROMBEL', 'JENIS KELAMIN', 'ALAMAT', 'NO TELEPON', 'NOMOR KIP/PIP', 'NAMA AYAH', 'NAMA IBU', 'NAMA WALI'],
      [1, 'Ahmad Fauzi', '0081234567', '3201123456780001', 'Jakarta', '2012-05-15', 'Kelas 1A', 'Laki-laki', 'Jl. Merdeka No. 10', '081234567890', 'KIP-12345', 'Budi Santoso', 'Siti Rahma', ''],
      [2, 'Aisyah Putri', '0087654321', '3201123456780002', 'Bandung', '2012-08-20', 'Kelas 1A', 'Perempuan', 'Jl. Mawar No. 5', '089876543210', '', 'Hasan Basri', 'Fatimah', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Import_Direktori_Siswa.xlsx');
  };

  // Export Filtered Students to Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      showToast('Tidak ada data siswa untuk diexport', 'info');
      return;
    }

    const exportRows = filteredStudents.map((s, idx) => ({
      'No': idx + 1,
      'Nama Lengkap': s.name,
      'NISN': s.nisn || '-',
      'NIK': s.nik || '-',
      'Jenis Kelamin': s.gender,
      'Rombel / Kelas': s.tingkat_rombel || s.kelas || s.rombel || 'Unassigned',
      'Tempat Lahir': s.tempat_lahir || '-',
      'Tanggal Lahir': s.tanggal_lahir || '-',
      'Alamat': s.address || '-',
      'No Telepon': s.phone || '-',
      'Status': s.status === 'active' ? 'Aktif' : s.status === 'graduated' ? 'Lulus' : 'Pindah',
      'No KIP/PIP': s.nomor_kip_pip || '-',
      'Nama Ayah': s.nama_ayah || '-',
      'Nama Ibu': s.nama_ibu || '-',
      'Nama Wali': s.nama_wali || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Direktori Siswa');
    XLSX.writeFile(wb, `Direktori_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white transition-all transform animate-bounce ${
            toast.type === 'error'
              ? 'bg-red-600'
              : toast.type === 'info'
              ? 'bg-blue-600'
              : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div id="direktori-header-banner" className="bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Users className="w-96 h-96 -mr-20 -mt-20 text-white" />
        </div>
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-100 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Module Direktori Siswa & Rombel Real-Time
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Direktori Siswa & Manajemen Rombel
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base opacity-90 leading-relaxed">
            Kelola data siswa, struktur Rombongan Belajar (Rombel), rekapitulasi data rasio gender & KIP/PIP secara otomatis dengan sistem sinkronisasi langsung.
          </p>
        </div>
      </div>

      {/* Top Quick Stat Cards */}
      <div id="top-stat-cards" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Siswa</p>
            <p className="text-xl font-bold text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Laki-laki</p>
            <p className="text-xl font-bold text-blue-600">{stats.laki}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-pink-50 text-pink-600 rounded-lg">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Perempuan</p>
            <p className="text-xl font-bold text-pink-600">{stats.perempuan}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <School className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Rombel</p>
            <p className="text-xl font-bold text-purple-600">{classes.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Penerima KIP/PIP</p>
            <p className="text-xl font-bold text-amber-600">{stats.withKip}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Unassigned</p>
            <p className="text-xl font-bold text-slate-700">{unassignedStudentsCount}</p>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm flex flex-wrap gap-2">
        <button
          id="tab-btn-daftar"
          onClick={() => setActiveTab('daftar')}
          className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'daftar'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Daftar Siswa ({filteredStudents.length})
        </button>

        <button
          id="tab-btn-rombel"
          onClick={() => setActiveTab('rombel')}
          className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'rombel'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <School className="w-4 h-4" /> Kelola Rombel ({classes.length})
        </button>

        <button
          id="tab-btn-rekap"
          onClick={() => setActiveTab('rekap')}
          className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'rekap'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PieChartIcon className="w-4 h-4" /> Rekapitulasi & Statistik
        </button>

        <button
          id="tab-btn-import"
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'import'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Impor Excel Otomatis
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            id="btn-sync-refresh"
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
            title="Sinkronkan Data Terkini"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: DAFTAR SISWA */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {/* Action Bar & Search Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="input-search-siswa"
                  type="text"
                  placeholder="Cari nama, NISN, NIK, atau nama Rombel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-open-add-student"
                  onClick={handleOpenAddStudent}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Tambah Siswa Manual
                </button>

                <button
                  id="btn-export-excel"
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Export Excel
                </button>

                {selectedStudentIds.length > 0 && (
                  <>
                    <button
                      id="btn-move-selected"
                      onClick={() => setShowMoveRombelModal(true)}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-blue-200"
                    >
                      <ArrowRightLeft className="w-4 h-4" /> Pindah Rombel ({selectedStudentIds.length})
                    </button>

                    <button
                      id="btn-duplicate-selected"
                      onClick={() => setDuplicateModal({
                        isOpen: true,
                        studentIds: selectedStudentIds,
                        targetYear: '2025/2026',
                        targetRombel: '',
                        targetStatus: 'active',
                      })}
                      className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-teal-200"
                    >
                      <Copy className="w-4 h-4 text-teal-600" /> Duplikat Ke TP Baru ({selectedStudentIds.length})
                    </button>

                    <button
                      id="btn-graduate-selected"
                      onClick={() => setGraduateModal({
                        isOpen: true,
                        studentIds: selectedStudentIds,
                        tahunLulus: academicYearFilter !== 'all' ? academicYearFilter : '2024/2025',
                        tanggalLulus: new Date().toISOString().split('T')[0],
                        noIjazahPrefix: '',
                        keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
                      })}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-indigo-200 shadow-sm"
                    >
                      <GraduationCap className="w-4 h-4 text-indigo-600" /> Luluskan Siswa ({selectedStudentIds.length})
                    </button>

                    <button
                      id="btn-delete-selected"
                      onClick={handleBulkDeleteStudents}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-red-200"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus ({selectedStudentIds.length})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>

              {/* Rombel Filter */}
              <select
                id="filter-rombel"
                value={selectedRombelFilter}
                onChange={(e) => setSelectedRombelFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Rombel ({classes.length})</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.nama_kelas}</option>
                ))}
              </select>

              {/* Gender Filter */}
              <select
                id="filter-gender"
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Jenis Kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>

              {/* Status Filter */}
              <select
                id="filter-status"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Status Keberadaan</option>
                <option value="active">Aktif</option>
                <option value="graduated">Lulus</option>
                <option value="moved">Pindah</option>
              </select>

              {(selectedRombelFilter !== 'ALL' || selectedGenderFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedRombelFilter('ALL');
                    setSelectedGenderFilter('ALL');
                    setSelectedStatusFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="text-emerald-600 hover:underline font-semibold ml-auto"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds(filteredStudents.map(s => s.id));
                          } else {
                            setSelectedStudentIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="p-3 w-12 text-center">NO</th>
                    <th className="p-3">NAMA SISWA</th>
                    <th className="p-3">NISN / NIK</th>
                    <th className="p-3">JK</th>
                    <th className="p-3">ROMBEL / KELAS</th>
                    <th className="p-3">TEMPAT, TGL LAHIR</th>
                    <th className="p-3">NAMA ORANG TUA</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        Memuat data direktori siswa...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-slate-600">Tidak ada data siswa ditemukan</p>
                        <p className="text-xs text-slate-400 mt-1">Gunakan tombol 'Tambah Siswa' atau 'Impor Excel' untuk menambahkan data.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      const displayRombel = student.tingkat_rombel || student.kelas || student.rombel || 'Unassigned';

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds(prev => [...prev, student.id]);
                                } else {
                                  setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                }
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-3 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{student.name}</div>
                            {student.nomor_kip_pip && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                KIP: {student.nomor_kip_pip}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-600 text-xs">
                            <div>NISN: {student.nisn || '-'}</div>
                            <div className="text-[11px] text-slate-400">NIK: {student.nik || '-'}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              student.gender === 'Laki-laki'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-pink-100 text-pink-700'
                            }`}>
                              {student.gender === 'Laki-laki' ? 'L' : 'P'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">
                            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {displayRombel}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-600">
                            {student.tempat_lahir || '-'}, {student.tanggal_lahir || '-'}
                          </td>
                          <td className="p-3 text-xs">
                            <div>Ayah: {student.nama_ayah || '-'}</div>
                            <div className="text-slate-500">Ibu: {student.nama_ibu || '-'}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              student.status === 'graduated'
                                ? 'bg-purple-100 text-purple-700'
                                : student.status === 'moved'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {student.status === 'graduated' ? 'Lulus' : student.status === 'moved' ? 'Pindah' : 'Aktif'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewingStudent(student)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Detail Siswa"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEditStudent(student)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Edit Siswa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDuplicateModal({
                                  isOpen: true,
                                  studentIds: [student.id],
                                  targetYear: '2025/2026',
                                  targetRombel: '',
                                  targetStatus: 'active',
                                })}
                                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                                title="Duplikat Ke TP / Rombel Baru"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setGraduateModal({
                                  isOpen: true,
                                  studentIds: [student.id],
                                  tahunLulus: student.tahun_pelajaran || '2024/2025',
                                  tanggalLulus: new Date().toISOString().split('T')[0],
                                  noIjazahPrefix: '',
                                  keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
                                })}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Proses Kelulusan Siswa Ini"
                              >
                                <GraduationCap className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
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

            {/* Footer Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                Menampilkan <span className="font-bold text-slate-700">{filteredStudents.length}</span> dari total <span className="font-bold text-slate-700">{students.length}</span> siswa.
              </div>
              <div className="flex gap-4 font-medium">
                <span>Laki-laki: <strong className="text-blue-600">{filteredStudents.filter(s=>s.gender==='Laki-laki').length}</strong></span>
                <span>Perempuan: <strong className="text-pink-600">{filteredStudents.filter(s=>s.gender==='Perempuan').length}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA ROMBEL */}
      {activeTab === 'rombel' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Struktur Rombongan Belajar (Rombel)</h2>
              <p className="text-xs text-slate-500">Kelola kelas, wali kelas, dan pembagian siswa per rombel.</p>
            </div>
            <button
              id="btn-add-rombel"
              onClick={handleOpenAddRombel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Rombel Baru
            </button>
          </div>

          {/* Rombel Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rombelStats.map((rombel) => (
              <div
                key={rombel.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 space-y-4"
              >
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      Tingkat {rombel.tingkat || '1'}
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-800">{rombel.nama_kelas}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditRombel(rombel)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Edit Rombel"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRombel(rombel.id, rombel.nama_kelas)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Hapus Rombel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <div className="text-[11px] text-slate-500">Laki-laki</div>
                    <div className="text-base font-bold text-blue-600">{rombel.laki}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Perempuan</div>
                    <div className="text-base font-bold text-pink-600">{rombel.perempuan}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Total Siswa</div>
                    <div className="text-base font-bold text-emerald-700">{rombel.totalStudents}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wali Kelas:</span>
                    <span className="font-medium text-slate-700">{rombel.wali_kelas || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ruangan:</span>
                    <span className="font-medium text-slate-700">{rombel.ruangan || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Penerima KIP/PIP:</span>
                    <span className="font-medium text-amber-700">{rombel.kip} Siswa</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedRombelFilter(rombel.id);
                      setActiveTab('daftar');
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Lihat Daftar Siswa <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setStudentForm({ ...initialStudentForm, class_id: rombel.id, tingkat_rombel: rombel.nama_kelas });
                      setShowAddStudentModal(true);
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambah
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REKAPITULASI DATA */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-xl">Laporan Rekapitulasi Siswa per Rombel</h2>
                <p className="text-xs text-slate-500">Statistik otomatis real-time rincian rasio siswa Laki-laki, Perempuan, dan bantuan KIP/PIP.</p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Cetak / Download PDF
              </button>
            </div>

            {/* Recap Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-emerald-800 text-white font-semibold">
                    <th className="p-3 text-center border border-emerald-900 w-12">NO</th>
                    <th className="p-3 border border-emerald-900">TINGKAT</th>
                    <th className="p-3 border border-emerald-900">NAMA ROMBEL / KELAS</th>
                    <th className="p-3 border border-emerald-900 text-center">WALI KELAS</th>
                    <th className="p-3 border border-emerald-900 text-center">LAKI-LAKI</th>
                    <th className="p-3 border border-emerald-900 text-center">PEREMPUAN</th>
                    <th className="p-3 border border-emerald-900 text-center">TOTAL SISWA</th>
                    <th className="p-3 border border-emerald-900 text-center">PENERIMA KIP/PIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rombelStats.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50 font-medium text-slate-700">
                      <td className="p-3 text-center border border-slate-200">{idx + 1}</td>
                      <td className="p-3 border border-slate-200">Tingkat {r.tingkat || '1'}</td>
                      <td className="p-3 border border-slate-200 font-bold text-emerald-800">{r.nama_kelas}</td>
                      <td className="p-3 border border-slate-200 text-center text-slate-600">{r.wali_kelas || '-'}</td>
                      <td className="p-3 border border-slate-200 text-center text-blue-600 font-bold">{r.laki}</td>
                      <td className="p-3 border border-slate-200 text-center text-pink-600 font-bold">{r.perempuan}</td>
                      <td className="p-3 border border-slate-200 text-center font-extrabold text-slate-800">{r.totalStudents}</td>
                      <td className="p-3 border border-slate-200 text-center text-amber-700 font-semibold">{r.kip}</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 font-extrabold text-slate-900 border-t-2 border-emerald-700">
                    <td colSpan={4} className="p-3 text-right border border-emerald-200">TOTAL SELURUH SISWA:</td>
                    <td className="p-3 text-center border border-emerald-200 text-blue-700">{stats.laki}</td>
                    <td className="p-3 text-center border border-emerald-200 text-pink-700">{stats.perempuan}</td>
                    <td className="p-3 text-center border border-emerald-200 text-emerald-800 text-base">{stats.total}</td>
                    <td className="p-3 text-center border border-emerald-200 text-amber-800">{stats.withKip}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: IMPOR EXCEL WORKSPACE */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="font-bold text-slate-800 text-xl">Pusat Impor Data Excel Otomatis</h2>
              <p className="text-xs text-slate-500">
                Upload file Excel rekapitulasi data siswa (support format EMIS, RDM, SIMPATIKA, atau format Excel custom lainnya).
              </p>
            </div>

            {/* Instruction Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">1</span>
                  Unduh Template Standard
                </div>
                <p className="text-xs text-slate-500">Gunakan template Excel berikut untuk memudahkan pengisian kolom secara rapi.</p>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-2 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold flex items-center justify-center gap-1 border border-emerald-200"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Template.xlsx
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">2</span>
                  Pilih Rombel Tujuan (Opsional)
                </div>
                <p className="text-xs text-slate-500">Pilih jika ingin menetapkan semua data impor ke rombel tertentu secara otomatis.</p>
                <select
                  value={targetRombelForImport}
                  onChange={(e) => setTargetRombelForImport(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  <option value="AUTO">Deteksi Otomatis dari Kolom Excel</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>Paksa ke Rombel: {cls.nama_kelas}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">3</span>
                  Upload & Sinkron
                </div>
                <p className="text-xs text-slate-500">Sistem akan memverifikasi, mendeteksi header, dan menyinkronkan data.</p>
              </div>
            </div>

            {/* Drag & Drop File Zone */}
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl p-8 text-center space-y-4">
              <Upload className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <p className="font-bold text-slate-800 text-base">Pilih atau Drag File Excel Siswa di Sini</p>
                <p className="text-xs text-slate-500 mt-1">Dukungan format file: .XLSX, .XLS, .CSV</p>
              </div>

              <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-md cursor-pointer transition-all">
                <FileSpreadsheet className="w-4 h-4" /> Pilih File Excel...
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleParseExcelFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>

              {importingExcel && (
                <div className="text-xs text-emerald-700 font-semibold animate-pulse flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Membaca dan memproses struktur kolom Excel...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW IMPORT EXCEL */}
      {importPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Hasil Deteksi Impor Excel ({parsedImportRows.length} Siswa)</h3>
                <p className="text-xs text-emerald-100 opacity-90">Periksa preview data di bawah sebelum menyimpan secara permanen.</p>
              </div>
              <button
                onClick={() => setImportPreviewModal(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-medium">
                Catatan: Siswa dengan NISN/NIK/Nama yang sudah ada di database akan diperbarui otomatis, sedangkan data baru akan dibuatkan entri baru.
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 w-8 text-center">NO</th>
                      <th className="p-2">NAMA SISWA</th>
                      <th className="p-2">NISN</th>
                      <th className="p-2">NIK</th>
                      <th className="p-2">JK</th>
                      <th className="p-2">ROMBEL</th>
                      <th className="p-2">TEMPAT, TGL LAHIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedImportRows.slice(0, 30).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-800">{row.name}</td>
                        <td className="p-2 font-mono text-slate-600">{row.nisn || '-'}</td>
                        <td className="p-2 font-mono text-slate-600">{row.nik || '-'}</td>
                        <td className="p-2 font-semibold text-slate-700">{row.gender}</td>
                        <td className="p-2 font-semibold text-emerald-700">{row.tingkat_rombel || '-'}</td>
                        <td className="p-2 text-slate-600">{row.tempat_lahir || '-'}, {row.tanggal_lahir || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedImportRows.length > 30 && (
                  <div className="p-2 text-center text-slate-500 font-semibold bg-slate-50 border-t border-slate-200">
                    ... Dan {parsedImportRows.length - 30} data siswa lainnya.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setImportPreviewModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleCommitImport}
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Simpan {parsedImportRows.length} Data Siswa Ke Sistem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT STUDENT */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: Muhammad Rizky"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    value={studentForm.nisn || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                    placeholder="0081234567"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIK</label>
                  <input
                    type="text"
                    value={studentForm.nik || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, nik: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                    placeholder="3201..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    value={studentForm.gender || 'Laki-laki'}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih Rombel / Kelas</label>
                  <select
                    value={studentForm.class_id || ''}
                    onChange={(e) => {
                      const selectedCls = classes.find(c => c.id === e.target.value);
                      setStudentForm({
                        ...studentForm,
                        class_id: e.target.value,
                        tingkat_rombel: selectedCls ? selectedCls.nama_kelas : ''
                      });
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Rombel --</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.nama_kelas}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={studentForm.tempat_lahir || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, tempat_lahir: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                    placeholder="Contoh: Jakarta"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={studentForm.tanggal_lahir || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, tanggal_lahir: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Ayah</label>
                  <input
                    type="text"
                    value={studentForm.nama_ayah || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, nama_ayah: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Ibu</label>
                  <input
                    type="text"
                    value={studentForm.nama_ibu || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, nama_ibu: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor KIP / PIP</label>
                  <input
                    type="text"
                    value={studentForm.nomor_kip_pip || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, nomor_kip_pip: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                    placeholder="Kosongkan jika tidak ada"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Keberadaan</label>
                  <select
                    value={studentForm.status || 'active'}
                    onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="active">Aktif</option>
                    <option value="graduated">Lulus</option>
                    <option value="moved">Pindah</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Alamat Tempat Tinggal</label>
                  <textarea
                    rows={2}
                    value={studentForm.address || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                    placeholder="Jl. Merdeka No. 10..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ROMBEL */}
      {showRombelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingRombel ? 'Edit Rombel' : 'Buat Rombel Baru'}
              </h3>
              <button onClick={() => setShowRombelModal(false)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveRombel} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Rombel / Kelas *</label>
                <input
                  type="text"
                  required
                  value={rombelForm.nama_kelas || ''}
                  onChange={(e) => setRombelForm({ ...rombelForm, nama_kelas: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-bold text-slate-800"
                  placeholder="Contoh: Kelas 1A"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tingkat</label>
                  <select
                    value={rombelForm.tingkat || '1'}
                    onChange={(e) => setRombelForm({ ...rombelForm, tingkat: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                      <option key={num} value={num.toString()}>Tingkat {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={rombelForm.kapasitas || 32}
                    onChange={(e) => setRombelForm({ ...rombelForm, kapasitas: parseInt(e.target.value) || 32 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Wali Kelas</label>
                <input
                  type="text"
                  value={rombelForm.wali_kelas || ''}
                  onChange={(e) => setRombelForm({ ...rombelForm, wali_kelas: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                  placeholder="Nama Wali Kelas..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ruangan / Gedung</label>
                <input
                  type="text"
                  value={rombelForm.ruangan || ''}
                  onChange={(e) => setRombelForm({ ...rombelForm, ruangan: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                  placeholder="Gedung A, R. 101"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRombelModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK MOVE ROMBEL */}
      {showMoveRombelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">Pindah Rombel Siswa</h3>
              <button onClick={() => setShowMoveRombelModal(false)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <p className="font-semibold text-slate-700">
                Pindahkan <span className="text-blue-700 font-bold">{selectedStudentIds.length} siswa</span> yang dipilih ke Rombel berikut:
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rombel / Kelas Tujuan *</label>
                <select
                  value={targetRombelForMove}
                  onChange={(e) => setTargetRombelForMove(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="">-- Pilih Rombel Tujuan --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.nama_kelas}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowMoveRombelModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleBulkMoveRombel}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md"
                >
                  Proses Pindahkan Siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL STUDENT CARD */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold">{viewingStudent.name}</h3>
                <p className="text-xs text-emerald-100 opacity-90">
                  Rombel: {viewingStudent.tingkat_rombel || viewingStudent.kelas || viewingStudent.rombel || 'Unassigned'}
                </p>
              </div>
              <button onClick={() => setViewingStudent(null)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[11px]">NISN</span>
                  <p className="font-bold font-mono text-slate-800">{viewingStudent.nisn || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">NIK</span>
                  <p className="font-bold font-mono text-slate-800">{viewingStudent.nik || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Jenis Kelamin</span>
                  <p className="font-bold text-slate-800">{viewingStudent.gender}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Status</span>
                  <p className="font-bold text-emerald-700">{viewingStudent.status === 'active' ? 'Aktif' : viewingStudent.status}</p>
                </div>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <strong>TTL:</strong> {viewingStudent.tempat_lahir || '-'}, {viewingStudent.tanggal_lahir || '-'}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <strong>Alamat:</strong> {viewingStudent.address || '-'}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <strong>No HP/WA:</strong> {viewingStudent.phone || '-'}
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <strong>Nomor KIP/PIP:</strong> {viewingStudent.nomor_kip_pip || 'Tidak Ada'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1 text-slate-700">
                <p className="font-bold text-slate-800">Orang Tua / Wali:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-400">Ayah:</span> {viewingStudent.nama_ayah || '-'}</div>
                  <div><span className="text-slate-400">Ibu:</span> {viewingStudent.nama_ibu || '-'}</div>
                  <div><span className="text-slate-400">Wali:</span> {viewingStudent.nama_wali || '-'}</div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-5 py-2 bg-slate-800 text-white font-semibold rounded-lg text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS / TINDAKAN */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  confirmDialog.variant === 'danger' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base">{confirmDialog.title}</h3>
              </div>
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                {confirmDialog.message}
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  {confirmDialog.cancelText || 'Batal'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => confirmDialog.onConfirm()}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center gap-2 transition-all ${
                    confirmDialog.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : confirmDialog.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {confirmDialog.confirmText || 'Ya, Lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DUPLIKAT SISWA UNTUK KELAS & TP BARU */}
      {duplicateModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-gradient-to-r from-teal-800 to-emerald-800 text-white flex items-center justify-between">
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

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-teal-50/70 border border-teal-200/60 rounded-xl space-y-1.5">
                <div className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Siswa yang Akan Diduplikasi ({duplicateModal.studentIds.length})
                </div>
                <div className="text-xs text-slate-700 max-h-24 overflow-y-auto font-medium space-y-0.5">
                  {students
                    .filter(s => duplicateModal.studentIds.includes(s.id))
                    .map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span>{idx + 1}. <strong>{s.name}</strong> (NISN: {s.nisn || '-'})</span>
                        <span className="text-[10px] bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded font-mono">
                          TP {s.tahun_pelajaran || '-'} | Rombel: {s.rombel || s.kelas || 'Unassigned'}
                        </span>
                      </div>
                    ))}
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
                    {classes.map(c => (
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
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-gradient-to-r from-indigo-800 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
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

            <div className="p-6 space-y-4">
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
    </div>
  );
}
