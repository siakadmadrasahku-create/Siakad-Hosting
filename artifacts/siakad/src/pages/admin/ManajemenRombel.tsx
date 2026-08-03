import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  School,
  Users,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRightLeft,
  X,
  Printer,
  ChevronRight,
  PieChart as PieChartIcon,
  UserCheck,
  Building,
  UserPlus,
  BookOpen,
  Layers,
  ArrowRight,
  FileSpreadsheet,
  Download,
  Upload,
  Calendar,
  Info,
  Copy,
  GraduationCap,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../integrations/supabase/client';
import AdminLayout from '../../components/admin/AdminLayout';
import { useMadrasah } from '../../contexts/MadrasahContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { syncDataToAcademicYear } from '../../utils/academicYearSync';
import { getStudentRombelForYear, setStudentRombelForYear, promoteStudentToYear, RombelHistoryItem } from '../../utils/studentRombelHistory';

interface Student {
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

interface RombelClass {
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

export default function ManajemenRombel() {
  const navigate = useNavigate();
  const { activeMadrasahId, getScopedKey } = useMadrasah();
  const { settings } = useSiteSettings();
  const activeYearFromSettings = settings.tahun_pelajaran?.active_year || '2024/2025';

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<RombelClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'daftar_rombel' | 'plotting' | 'rekap_kapasitas'>('daftar_rombel');

  // Academic Year selection state
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(activeYearFromSettings);

  // Sync selectedAcademicYear when active system academic year changes
  useEffect(() => {
    if (activeYearFromSettings) {
      setSelectedAcademicYear(activeYearFromSettings);
    }
  }, [activeYearFromSettings]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    if (activeYearFromSettings) yearsSet.add(activeYearFromSettings);
    if (settings.tahun_pelajaran?.available_years && Array.isArray(settings.tahun_pelajaran.available_years)) {
      settings.tahun_pelajaran.available_years.forEach((y: string) => yearsSet.add(y));
    }
    classes.forEach(c => { if (c.tahun_pelajaran) yearsSet.add(c.tahun_pelajaran); });
    students.forEach(s => { if (s.tahun_pelajaran) yearsSet.add(s.tahun_pelajaran); });
    if (yearsSet.size === 0) yearsSet.add('2024/2025');
    return Array.from(yearsSet).sort().reverse();
  }, [settings.tahun_pelajaran, classes, students, activeYearFromSettings]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTingkatFilter, setSelectedTingkatFilter] = useState<string>('ALL');

  // Modals & Selection State
  const [showRombelModal, setShowRombelModal] = useState(false);
  const [editingRombel, setEditingRombel] = useState<RombelClass | null>(null);

  const [viewingRombel, setViewingRombel] = useState<RombelClass | null>(null);

  // Global Import Excel State
  const [showGlobalImportModal, setShowGlobalImportModal] = useState(false);
  const [importTargetClassId, setImportTargetClassId] = useState<string>('');

  // Manual Add/Edit Student State in Rombel
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const initialStudentForm: Partial<Student> = {
    name: '',
    nisn: '',
    nik: '',
    gender: 'Laki-laki',
    status: 'active',
    tingkat_rombel: '',
    class_id: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    address: '',
    phone: '',
    nama_ayah: '',
    nama_ibu: '',
    nomor_kip_pip: '',
  };
  const [studentForm, setStudentForm] = useState<Partial<Student>>(initialStudentForm);

  const handleOpenAddStudentManual = (targetClassId?: string, targetClassName?: string) => {
    setEditingStudent(null);
    const defaultClassId = targetClassId || (yearClasses.length > 0 ? yearClasses[0].id : '');
    const defaultClassName = targetClassName || (yearClasses.length > 0 ? yearClasses[0].nama_kelas : '');
    setStudentForm({
      ...initialStudentForm,
      class_id: defaultClassId,
      tingkat_rombel: defaultClassName,
      tahun_pelajaran: selectedAcademicYear || activeYearFromSettings,
    });
    setShowAddStudentModal(true);
  };

  const handleOpenEditStudentManual = (st: Student) => {
    setEditingStudent(st);
    const currentRombel = getStudentRombelForYear(st, selectedAcademicYear || activeYearFromSettings);
    setStudentForm({
      ...st,
      class_id: currentRombel.class_id || st.class_id || '',
      tingkat_rombel: currentRombel.rombel || st.tingkat_rombel || st.kelas || '',
      status: (currentRombel.status as any) || st.status || 'active',
      tahun_pelajaran: selectedAcademicYear || st.tahun_pelajaran || activeYearFromSettings,
    });
    setShowAddStudentModal(true);
  };

  const handleSaveStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.name.trim()) {
      showToast('Nama siswa wajib diisi!', 'error');
      return;
    }

    setSaving(true);
    try {
      const targetClass = yearClasses.find(c => c.id === studentForm.class_id) || classes.find(c => c.id === studentForm.class_id || c.nama_kelas === studentForm.tingkat_rombel);
      const classNameToSet = targetClass ? targetClass.nama_kelas : (studentForm.tingkat_rombel || '');
      const classIdToSet = targetClass ? targetClass.id : (studentForm.class_id || '');
      const targetYear = studentForm.tahun_pelajaran || selectedAcademicYear || activeYearFromSettings;
      const isCurrentActiveYear = targetYear === activeYearFromSettings;

      let updatedList: Student[] = [];

      if (editingStudent) {
        updatedList = students.map(s => {
          if (s.id === editingStudent.id) {
            const merged = {
              ...s,
              ...studentForm,
              name: studentForm.name!.trim(),
              gender: studentForm.gender || 'Laki-laki',
            };
            return setStudentRombelForYear(
              merged,
              targetYear,
              classNameToSet,
              classIdToSet,
              studentForm.status || 'active',
              isCurrentActiveYear
            ) as Student;
          }
          return s;
        });
      } else {
        const timestamp = Date.now();
        const newStudentBase: Student = {
          id: `std_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
          name: studentForm.name!.trim(),
          nisn: studentForm.nisn ? studentForm.nisn.trim() : '',
          nik: studentForm.nik ? studentForm.nik.trim() : '',
          gender: studentForm.gender || 'Laki-laki',
          status: studentForm.status || 'active',
          tempat_lahir: studentForm.tempat_lahir || 'Jakarta',
          tanggal_lahir: studentForm.tanggal_lahir || '2016-01-01',
          address: studentForm.address || '',
          phone: studentForm.phone || '',
          nama_ayah: studentForm.nama_ayah || '',
          nama_ibu: studentForm.nama_ibu || '',
          nomor_kip_pip: studentForm.nomor_kip_pip || '',
          penerima_kip: Boolean(studentForm.nomor_kip_pip),
          tahun_pelajaran: targetYear,
          created_at: new Date().toISOString()
        };

        const newStudent = setStudentRombelForYear(
          newStudentBase,
          targetYear,
          classNameToSet,
          classIdToSet,
          studentForm.status || 'active',
          isCurrentActiveYear
        ) as Student;

        updatedList = [newStudent, ...students];
      }

      await persistStudents(updatedList);
      showToast(editingStudent ? 'Data siswa berhasil diperbarui' : `Siswa "${studentForm.name}" berhasil ditambahkan ke Rombel ${classNameToSet || 'Unassigned'}!`);
      setShowAddStudentModal(false);
      setEditingStudent(null);
    } catch (err: any) {
      console.error('Error saving student:', err);
      showToast('Gagal menyimpan data siswa: ' + (err?.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Batch Plotting States
  const [sourceRombelFilter, setSourceRombelFilter] = useState<string>('UNASSIGNED');
  const [targetRombelForPlot, setTargetRombelForPlot] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [plottingSearch, setPlottingSearch] = useState<string>('');

  // Single Move Student State
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [targetRombelForSingle, setTargetRombelForSingle] = useState<string>('');

  // Duplicate Student State
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    studentIds: string[];
    targetYear: string;
    targetRombel: string;
    targetStatus: 'active' | 'graduated' | 'moved' | 'dropped';
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

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Custom Confirmation Dialog State (replaces native window.confirm)
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

  // Download Excel Format Template per Class
  const handleDownloadTemplate = (targetClassName?: string) => {
    const templateData = [
      {
        'NISN': '0012345678',
        'NIK': '3201234567890001',
        'Nama Lengkap': 'Ahmad Fadhil',
        'Jenis Kelamin': 'Laki-laki',
        'Rombel': targetClassName || 'Kelas 1A',
        'Tempat Lahir': 'Jakarta',
        'Tanggal Lahir': '2016-05-12',
        'Alamat': 'Jl. Pendidikan No. 12',
        'No HP': '081234567890',
        'Nama Ayah': 'Budi Santoso',
        'Nama Ibu': 'Siti Rahmah',
        'Nomor KIP/PIP': 'KIP-12345'
      },
      {
        'NISN': '0012345679',
        'NIK': '3201234567890002',
        'Nama Lengkap': 'Aisyah Putri',
        'Jenis Kelamin': 'Perempuan',
        'Rombel': targetClassName || 'Kelas 1A',
        'Tempat Lahir': 'Bandung',
        'Tanggal Lahir': '2016-08-20',
        'Alamat': 'Jl. Melati No. 5',
        'No HP': '081298765432',
        'Nama Ayah': 'Hasan Basri',
        'Nama Ibu': 'Amina',
        'Nomor KIP/PIP': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format Siswa");
    const filename = targetClassName
      ? `Template_Siswa_${targetClassName.replace(/\s+/g, '_')}.xlsx`
      : `Template_Import_Siswa_Per_Kelas.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`Template Excel ${targetClassName ? `untuk ${targetClassName}` : ''} berhasil diunduh!`);
  };

  // Import Excel Handler for Class
  const handleImportExcelForClass = (e: React.ChangeEvent<HTMLInputElement>, selectedClass?: RombelClass) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    const targetClass =
      selectedClass ||
      yearClasses.find(c => c.id === importTargetClassId) ||
      classes.find(c => c.id === importTargetClassId);
    const targetClassName = targetClass ? targetClass.nama_kelas : '';

    if (!targetClass) {
      showToast("Pilih rombel tujuan terlebih dahulu sebelum import.", "error");
      try { inputEl.value = ''; } catch (_e) { /* ignore */ }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

        if (!Array.isArray(rawRows) || rawRows.length === 0) {
          showToast("File Excel kosong atau format tidak valid", "error");
          try { inputEl.value = ''; } catch (_e) { /* ignore */ }
          return;
        }

        let headerRowIndex = -1;
        const colMap: Record<string, number> = {};

        for (let r = 0; r < Math.min(15, rawRows.length); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;
          const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (rowStr.includes('nama') || rowStr.includes('nisn') || rowStr.includes('nik') || rowStr.includes('gender') || rowStr.includes('jk') || rowStr.includes('jenis kelamin')) {
            headerRowIndex = r;
            row.forEach((cell, cIdx) => {
              const cv = String(cell || '').toLowerCase().trim();
              if (cv.includes('nama') && !cv.includes('ayah') && !cv.includes('ibu') && !cv.includes('wali')) {
                colMap.name = cIdx;
              } else if (cv.includes('nisn')) {
                colMap.nisn = cIdx;
              } else if (cv.includes('nik')) {
                colMap.nik = cIdx;
              } else if (cv.includes('gender') || cv.includes('jk') || cv.includes('jenis kelamin') || cv === 'l/p') {
                colMap.gender = cIdx;
              } else if (cv.includes('tempat')) {
                colMap.tempat_lahir = cIdx;
              } else if (cv.includes('tanggal') || cv.includes('tgl')) {
                colMap.tanggal_lahir = cIdx;
              } else if (cv.includes('alamat')) {
                colMap.address = cIdx;
              } else if (cv.includes('hp') || cv.includes('telepon') || cv.includes('phone') || cv.includes('wa') || cv.includes('notelp')) {
                colMap.phone = cIdx;
              } else if (cv.includes('ayah')) {
                colMap.nama_ayah = cIdx;
              } else if (cv.includes('ibu')) {
                colMap.nama_ibu = cIdx;
              } else if (cv.includes('kip') || cv.includes('pip')) {
                colMap.nomor_kip_pip = cIdx;
              }
            });
            break;
          }
        }

        const cleanStr = (val: any): string => {
          if (val === undefined || val === null) return '';
          if (typeof val === 'number') {
            return val.toLocaleString('fullwide', { useGrouping: false });
          }
          return String(val).trim();
        };

        const cleanDateStr = (val: any): string => {
          if (!val) return '2016-01-01';
          if (val instanceof Date && !isNaN(val.getTime())) {
            return val.toISOString().split('T')[0];
          }
          if (typeof val === 'number' && val > 10000 && val < 60000) {
            const dateObj = new Date((val - (25567 + 2)) * 86400 * 1000);
            if (!isNaN(dateObj.getTime())) {
              return dateObj.toISOString().split('T')[0];
            }
          }
          const parsed = new Date(String(val));
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
          return String(val).trim();
        };

        const getCol = (field: string, fallbackIdx: number, row: any[]) => {
          const idx = colMap[field] !== undefined ? colMap[field] : fallbackIdx;
          if (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) {
            return row[idx];
          }
          return '';
        };

        const importedAt = Date.now();
        const targetYear = selectedAcademicYear || targetClass.tahun_pelajaran || activeYearFromSettings;
        const isCurrentActiveYear = targetYear === activeYearFromSettings;

        const parsedStudents: Student[] = [];
        const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

        if (headerRowIndex === -1) {
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
          jsonRows.forEach((row, idx) => {
            const name = cleanStr(row['Nama Lengkap'] || row['Nama'] || row['nama'] || row['NAMA'] || row['Nama Siswa'] || row['NAMA SISWA']);
            if (!name || name.toLowerCase().includes('daftar') || name.toLowerCase().includes('madrasah')) return;

            const nisn = cleanStr(row['NISN'] || row['nisn'] || row['Nisn'] || '');
            const nik = cleanStr(row['NIK'] || row['nik'] || row['Nik'] || '');
            const genderStr = String(row['Jenis Kelamin'] || row['Gender'] || row['JK'] || row['jk'] || '').toLowerCase();
            const gender: 'Laki-laki' | 'Perempuan' = genderStr.startsWith('p') || genderStr.includes('perempuan') || genderStr === '2' ? 'Perempuan' : 'Laki-laki';

            const baseStudent: Student = {
              id: `std_rombel_${importedAt}_${idx}`,
              name,
              nisn,
              nik,
              gender,
              status: 'active',
              tempat_lahir: cleanStr(row['Tempat Lahir'] || row['Tempat'] || 'Jakarta'),
              tanggal_lahir: cleanDateStr(row['Tanggal Lahir'] || row['Tgl Lahir']),
              address: cleanStr(row['Alamat'] || row['alamat']),
              phone: cleanStr(row['No HP'] || row['HP'] || row['No Telp']),
              nama_ayah: cleanStr(row['Nama Ayah'] || row['Ayah']),
              nama_ibu: cleanStr(row['Nama Ibu'] || row['Ibu']),
              nomor_kip_pip: cleanStr(row['Nomor KIP/PIP'] || row['KIP'] || row['PIP']),
              penerima_kip: Boolean(row['Nomor KIP/PIP'] || row['KIP'] || row['PIP']),
              tahun_pelajaran: targetYear,
              created_at: new Date().toISOString()
            };

            parsedStudents.push(setStudentRombelForYear(
              baseStudent,
              targetYear,
              targetClassName,
              targetClass.id,
              'active',
              isCurrentActiveYear
            ) as Student);
          });
        } else {
          for (let r = startRow; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!Array.isArray(row) || row.length === 0) continue;

            const rawName = getCol('name', colMap.name !== undefined ? colMap.name : 1, row);
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
            const genderRaw = cleanStr(getCol('gender', 4, row));
            const tempat_lahir = cleanStr(getCol('tempat_lahir', 5, row)) || 'Jakarta';
            const tanggal_lahir = cleanDateStr(getCol('tanggal_lahir', 6, row));
            const address = cleanStr(getCol('address', 7, row));
            const phone = cleanStr(getCol('phone', 8, row));
            const nama_ayah = cleanStr(getCol('nama_ayah', 9, row));
            const nama_ibu = cleanStr(getCol('nama_ibu', 10, row));
            const nomor_kip_pip = cleanStr(getCol('nomor_kip_pip', 11, row));

            const gender: 'Laki-laki' | 'Perempuan' =
              (genderRaw && (genderRaw.toLowerCase().startsWith('p') || genderRaw.toLowerCase().includes('perempuan') || genderRaw.toLowerCase() === 'female' || genderRaw === '2'))
                ? 'Perempuan' : 'Laki-laki';

            const baseStudent: Student = {
              id: `std_rombel_${importedAt}_${r}`,
              name: nameStr,
              nisn,
              nik,
              gender,
              status: 'active',
              tempat_lahir,
              tanggal_lahir,
              address,
              phone,
              nama_ayah,
              nama_ibu,
              nomor_kip_pip,
              penerima_kip: Boolean(nomor_kip_pip),
              tahun_pelajaran: targetYear,
              created_at: new Date().toISOString()
            };

            parsedStudents.push(setStudentRombelForYear(
              baseStudent,
              targetYear,
              targetClassName,
              targetClass.id,
              'active',
              isCurrentActiveYear
            ) as Student);
          }
        }

        if (parsedStudents.length === 0) {
          showToast("Tidak ada data baris siswa yang terdeteksi dalam file Excel!", "error");
          try { inputEl.value = ''; } catch (_e) { /* ignore */ }
          return;
        }

        const currentStudentsList = [...students];
        let newAdded = 0;
        let skippedCount = 0;

        parsedStudents.forEach(imp => {
          const existingIndex = currentStudentsList.findIndex(s => {
            if (imp.nisn && s.nisn && s.nisn.trim() === imp.nisn.trim()) return true;
            if (imp.nik && s.nik && s.nik.trim() === imp.nik.trim()) return true;
            if (imp.name && s.name && s.name.trim().toLowerCase() === imp.name.trim().toLowerCase()) {
              if (imp.tanggal_lahir && s.tanggal_lahir && s.tanggal_lahir !== '2016-01-01' && imp.tanggal_lahir !== '2016-01-01') {
                return s.tanggal_lahir === imp.tanggal_lahir;
              }
              return true;
            }
            return false;
          });

          if (existingIndex !== -1) {
            skippedCount++;
            // JANGAN DITIMPA JIKA SISWA SUDAH ADA
          } else {
            currentStudentsList.unshift(imp);
            newAdded++;
          }
        });

        await persistStudents(currentStudentsList);
        let msg = `Import Berhasil: ${newAdded} siswa baru ditambahkan ke ${targetClassName}.`;
        if (skippedCount > 0) {
          msg += ` (${skippedCount} siswa sudah ada & tidak ditimpa)`;
        }
        showToast(msg);
        setShowGlobalImportModal(false);
        try { inputEl.value = ''; } catch (_e) { /* ignore */ }
      } catch (err: any) {
        console.error('Import error:', err);
        showToast("Gagal mengimpor file Excel: " + (err?.message || "Pastikan format file valid"), "error");
        try { inputEl.value = ''; } catch (_e) { /* ignore */ }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Rombel Form State
  const initialRombelForm: Partial<RombelClass> = {
    nama_kelas: '',
    tingkat: '1',
    wali_kelas: '',
    ruangan: '',
    kapasitas: 32,
    tahun_pelajaran: activeYearFromSettings,
    keterangan: ''
  };
  const [rombelForm, setRombelForm] = useState<Partial<RombelClass>>(initialRombelForm);

  // Pastikan saat membuat rombel baru, tahun_pelajaran mengikuti TP yang sedang dipilih.
  // Ini mencegah kasus "rombel terasa tidak tersimpan" karena tersimpan ke TP lain.
  useEffect(() => {
    if (showRombelModal && !editingRombel) {
      setRombelForm(prev => ({
        ...prev,
        tahun_pelajaran: selectedAcademicYear || activeYearFromSettings
      }));
    }
  }, [showRombelModal, editingRombel, selectedAcademicYear, activeYearFromSettings]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // -------------------------------------------------------------
  // Data Sync Engine (Realtime Supabase + Local Cache)
  // -------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const scopedClassesKey = getScopedKey ? getScopedKey('kelas_list') : `kelas_list_${activeMadrasahId || 'madrasah_default'}`;
      const allClassKeys = Array.from(new Set([
        scopedClassesKey,
        'kelas_list',
        `kelas_list_${activeMadrasahId || 'madrasah_default'}`,
        ...STORAGE_KEYS_CLASSES
      ]));

      // 1. Load Classes
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
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (!classesFoundInDb && loadedClasses.length === 0) {
        loadedClasses = [
          { id: 'c-1a', nama_kelas: 'Kelas 1A', tingkat: '1', wali_kelas: 'Ustadzah Fatimah, S.Pd', ruangan: 'R. 101', kapasitas: 30, tahun_pelajaran: '2024/2025' },
          { id: 'c-1b', nama_kelas: 'Kelas 1B', tingkat: '1', wali_kelas: 'Ustadz Ahmad, S.Ag', ruangan: 'R. 102', kapasitas: 30, tahun_pelajaran: '2024/2025' },
          { id: 'c-2a', nama_kelas: 'Kelas 2A', tingkat: '2', wali_kelas: 'Siti Rahma, S.Pd.I', ruangan: 'R. 201', kapasitas: 32, tahun_pelajaran: '2024/2025' },
          { id: 'c-3a', nama_kelas: 'Kelas 3A', tingkat: '3', wali_kelas: 'Muhammad Imran, M.Pd', ruangan: 'R. 202', kapasitas: 32, tahun_pelajaran: '2024/2025' },
          { id: 'c-4a', nama_kelas: 'Kelas 4A', tingkat: '4', wali_kelas: 'Nur Azizah, S.Si', ruangan: 'R. 301', kapasitas: 32, tahun_pelajaran: '2024/2025' },
          { id: 'c-5a', nama_kelas: 'Kelas 5A', tingkat: '5', wali_kelas: 'Hasan Basri, S.Pd', ruangan: 'R. 302', kapasitas: 32, tahun_pelajaran: '2024/2025' },
          { id: 'c-6a', nama_kelas: 'Kelas 6A', tingkat: '6', wali_kelas: 'Zubair Al-Farisi, S.Ag', ruangan: 'R. 303', kapasitas: 32, tahun_pelajaran: '2024/2025' },
        ];
      }

      setClasses(loadedClasses);
      try { localStorage.setItem(LOCAL_CACHE_CLASSES, JSON.stringify(loadedClasses)); } catch (err) { void err; }
      try { localStorage.setItem('kelas_list', JSON.stringify(loadedClasses)); } catch (err) { void err; }
      try { localStorage.setItem(scopedClassesKey, JSON.stringify(loadedClasses)); } catch (err) { void err; }

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
          } catch (e) {
            console.error(e);
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
      try { localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify(loadedStudents)); } catch (err) { void err; }
      try { localStorage.setItem('students_list', JSON.stringify(loadedStudents)); } catch (err) { void err; }
      try { localStorage.setItem(scopedStudentsKey, JSON.stringify(loadedStudents)); } catch (err) { void err; }
    } catch (err) {
      console.error('Fetch Rombel data failed:', err);
      showToast('Gagal memuat data rombel', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeMadrasahId, getScopedKey]);

  useEffect(() => {
    fetchData();

    const handleLocalUpdate = () => {
      const cClasses = localStorage.getItem(LOCAL_CACHE_CLASSES);
      if (cClasses) {
        try { setClasses(JSON.parse(cClasses)); } catch (e) { console.error(e); }
      }
      const cStudents = localStorage.getItem(LOCAL_CACHE_STUDENTS);
      if (cStudents) {
        try { setStudents(JSON.parse(cStudents)); } catch (e) { console.error(e); }
      }
    };

    window.addEventListener('siakad_direktori_updated', handleLocalUpdate);
    window.addEventListener('siakad_classes_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    const channel = supabase
      .channel('manajemen_rombel_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload) => {
          if (payload.new && (payload.new as any).id) {
            const key = (payload.new as any).id;
            if ((STORAGE_KEYS_CLASSES.includes(key) || key.includes('kelas_list')) && Array.isArray((payload.new as any).value)) {
              setClasses((payload.new as any).value);
              try { localStorage.setItem(LOCAL_CACHE_CLASSES, JSON.stringify((payload.new as any).value)); } catch (err) { void err; }
            }
            if ((STORAGE_KEYS_STUDENTS.includes(key) || key.includes('students_list')) && Array.isArray((payload.new as any).value)) {
              setStudents((payload.new as any).value);
              try { localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify((payload.new as any).value)); } catch (err) { void err; }
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
  }, [fetchData]);

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

    allKeys.forEach(k => {
      try { localStorage.setItem(k, JSON.stringify(newStudentsList)); } catch (err) { void err; }
    });
    try { localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify(newStudentsList)); } catch (err) { void err; }
    try { localStorage.setItem('students_list', JSON.stringify(newStudentsList)); } catch (err) { void err; }
    try { localStorage.setItem(scopedKey, JSON.stringify(newStudentsList)); } catch (err) { void err; }

    try {
      const cachedStr = localStorage.getItem('siakad_site_settings');
      const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
      allKeys.forEach(k => {
        settingsObj[k] = newStudentsList;
      });
      localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
    } catch (err) { void err; }

    const activeStudents = newStudentsList.filter(s => {
      const status = (s.status || '').toLowerCase().trim();
      return status === 'active' || status === 'aktif' || !status;
    });
    const maleActive = activeStudents.filter(s => s.gender === 'Laki-laki').length;
    const femaleActive = activeStudents.filter(s => s.gender === 'Perempuan').length;

    try {
      const now = new Date().toISOString();
      const payload = allKeys.map(k => ({ id: k, value: newStudentsList, updated_at: now }));
      await supabase.from('site_settings').upsert(payload);
    } catch (e) {
      console.error('Supabase students save error:', e);
    }

    window.dispatchEvent(new CustomEvent('siakad_direktori_updated'));
    window.dispatchEvent(new CustomEvent('siakad_data_updated'));
    window.dispatchEvent(new CustomEvent('students_data_updated', {
      detail: {
        students: newStudentsList,
        activeCount: activeStudents.length,
        maleCount: maleActive,
        femaleCount: femaleActive
      }
    }));
    window.dispatchEvent(new Event('storage'));
  };

  // -------------------------------------------------------------
  // Rombel Statistics
  // -------------------------------------------------------------
  const handleSyncActiveYear = async () => {
    setLoading(true);
    try {
      const res = await syncDataToAcademicYear(activeYearFromSettings, activeMadrasahId);
      if (res.success) {
        showToast(`Berhasil menyinkronkan data ke Tahun Pelajaran ${activeYearFromSettings}! (${res.studentsUpdatedCount} siswa & ${res.classesUpdatedCount} rombel diperbarui)`, 'success');
        await fetchData();
      } else {
        showToast(res.error || 'Gagal menyinkronkan data', 'error');
      }
    } catch (e) {
      showToast('Gagal menyinkronkan data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Distinct classes for selected academic year
  const yearClasses = useMemo(() => {
    const exact = classes.filter(cls => cls.tahun_pelajaran === selectedAcademicYear);
    let baseList = exact;

    if (baseList.length === 0) {
      const generic = classes.filter(cls => !cls.tahun_pelajaran || cls.tahun_pelajaran === 'ALL');
      if (generic.length > 0) {
        baseList = generic;
      } else {
        baseList = classes;
      }
    }

    const uniqueMap = new Map<string, RombelClass>();
    baseList.forEach(cls => {
      const key = cls.nama_kelas.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...cls,
          tahun_pelajaran: cls.tahun_pelajaran || selectedAcademicYear
        });
      }
    });

    return Array.from(uniqueMap.values());
  }, [classes, selectedAcademicYear]);

  const availableTingkatOptions = useMemo(() => {
    const set = new Set<string>();
    yearClasses.forEach(c => {
      if (c.tingkat) set.add(c.tingkat.toString());
    });
    if (set.size === 0) {
      ['1', '2', '3', '4', '5', '6'].forEach(t => set.add(t));
    }
    return Array.from(set).sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
  }, [yearClasses]);

  const rombelDetails = useMemo(() => {
    return yearClasses.map(cls => {
      const memberStudents = students.filter(s => {
        const { rombel: sRombel, class_id: sClassId, status: sStatus } = getStudentRombelForYear(s, selectedAcademicYear);
        const st = sStatus.toLowerCase().trim();
        const rb = sRombel.toLowerCase().trim();
        if (st === 'graduated' || st === 'lulus' || st === 'alumni' || rb.includes('alumni') || rb.includes('lulus') || st === 'moved' || st === 'dropped') {
          return false;
        }

        const matchId = sClassId && sClassId === cls.id;
        const matchName = rb === cls.nama_kelas.trim().toLowerCase();
        return Boolean(matchId || matchName);
      });

      const totalStudents = memberStudents.length;
      const laki = memberStudents.filter(s => s.gender === 'Laki-laki').length;
      const perempuan = memberStudents.filter(s => s.gender === 'Perempuan').length;
      const maxCap = cls.kapasitas || 32;
      const fillPercentage = Math.min(100, Math.round((totalStudents / maxCap) * 100));

      return {
        ...cls,
        totalStudents,
        laki,
        perempuan,
        maxCap,
        fillPercentage,
        students: memberStudents
      };
    });
  }, [yearClasses, students, selectedAcademicYear]);

  const filteredRombels = useMemo(() => {
    return rombelDetails.filter(cls => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = cls.nama_kelas.toLowerCase().includes(q);
        const matchWali = cls.wali_kelas?.toLowerCase().includes(q);
        const matchRuang = cls.ruangan?.toLowerCase().includes(q);
        if (!matchName && !matchWali && !matchRuang) return false;
      }

      if (selectedTingkatFilter !== 'ALL' && cls.tingkat !== selectedTingkatFilter) {
        return false;
      }

      return true;
    });
  }, [rombelDetails, searchTerm, selectedTingkatFilter]);

  const overallStats = useMemo(() => {
    const totalRombel = yearClasses.length;
    const withWali = yearClasses.filter(c => c.wali_kelas && c.wali_kelas !== '-').length;
    const totalCapacity = yearClasses.reduce((sum, c) => sum + (c.kapasitas || 32), 0);

    const yearStudents = students.filter(s => {
      const { rombel: sRombel, status: sStatus } = getStudentRombelForYear(s, selectedAcademicYear);
      const st = sStatus.toLowerCase().trim();
      const rb = sRombel.toLowerCase().trim();
      return !(st === 'graduated' || st === 'lulus' || st === 'alumni' || rb.includes('alumni') || rb.includes('lulus') || st === 'moved' || st === 'dropped');
    });

    const assignedStudentsCount = yearStudents.filter(s => {
      const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);
      if (sClassId && yearClasses.some(c => c.id === sClassId)) return true;
      const rName = sRombel.trim();
      if (!rName) return false;
      return yearClasses.some(c => c.nama_kelas.toLowerCase() === rName.toLowerCase());
    }).length;

    const unassignedStudentsCount = Math.max(0, yearStudents.length - assignedStudentsCount);

    return {
      totalRombel,
      withWali,
      totalCapacity,
      assignedStudentsCount,
      unassignedStudentsCount
    };
  }, [yearClasses, students, selectedAcademicYear]);

  // Students available for batch plotting
  const plottingSourceStudents = useMemo(() => {
    const yearStudents = students.filter(s => {
      const { rombel: sRombel, status: sStatus } = getStudentRombelForYear(s, selectedAcademicYear);
      const st = sStatus.toLowerCase().trim();
      const rb = sRombel.toLowerCase().trim();
      return !(st === 'graduated' || st === 'lulus' || st === 'alumni' || rb.includes('alumni') || rb.includes('lulus') || st === 'moved' || st === 'dropped');
    });

    let list: Student[] = [];
    if (sourceRombelFilter === 'UNASSIGNED') {
      list = yearStudents.filter(s => {
        const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);
        if (!sClassId && !sRombel) return true;
        const rName = sRombel.trim();
        if (!rName) return true;
        return !yearClasses.some(c => c.id === sClassId || c.nama_kelas.toLowerCase() === rName.toLowerCase());
      });
    } else {
      list = yearStudents.filter(s => {
        const { rombel: sRombel, class_id: sClassId } = getStudentRombelForYear(s, selectedAcademicYear);
        if (sClassId === sourceRombelFilter) return true;
        const rName = sRombel.trim();
        const matchedClass = yearClasses.find(c => c.id === sourceRombelFilter);
        return matchedClass && rName.toLowerCase() === matchedClass.nama_kelas.toLowerCase();
      });
    }

    if (plottingSearch.trim()) {
      const q = plottingSearch.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.toLowerCase().includes(q)) ||
        (s.nik && s.nik.toLowerCase().includes(q))
      );
    }

    return list;
  }, [students, yearClasses, sourceRombelFilter, selectedAcademicYear, activeYearFromSettings, plottingSearch]);

  // -------------------------------------------------------------
  // Rombel Handlers (Add, Edit, Delete, Plotting)
  // -------------------------------------------------------------
  const handleOpenAddRombel = () => {
    setRombelForm({
      nama_kelas: '',
      tingkat: '1',
      wali_kelas: '',
      ruangan: '',
      kapasitas: 32,
      tahun_pelajaran: selectedAcademicYear || activeYearFromSettings,
      keterangan: ''
    });
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
      showToast('Nama Rombel wajib diisi!', 'error');
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
          tahun_pelajaran: rombelForm.tahun_pelajaran || selectedAcademicYear || activeYearFromSettings,
          keterangan: rombelForm.keterangan || ''
        };
        updatedClasses = [...classes, newRombel];
      }

      await persistClasses(updatedClasses);
      showToast(editingRombel ? 'Data Rombel berhasil diperbarui' : 'Rombel baru berhasil dibuat');
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
      // 1. Delete Class by ID or Name
      const updatedClasses = classes.filter(c => {
        const isIdMatch = clsId && c.id === clsId;
        const isNameMatch = clsName && c.nama_kelas && c.nama_kelas.trim().toLowerCase() === clsName.trim().toLowerCase();
        return !isIdMatch && !isNameMatch;
      });
      await persistClasses(updatedClasses);

      // 2. Unassign students in this class
      const updatedStudents = students.map(s => {
        const { rombel: studentRombel, class_id: studentClassId } = getStudentRombelForYear(s, selectedAcademicYear);
        const matchId = clsId && studentClassId === clsId;
        const matchName = clsName && studentRombel.trim().toLowerCase() === clsName.trim().toLowerCase();
        if (matchId || matchName) {
          return setStudentRombelForYear(
            s,
            selectedAcademicYear,
            '',
            '',
            s.status,
            selectedAcademicYear === activeYearFromSettings
          ) as Student;
        }
        return s;
      });
      await persistStudents(updatedStudents);

      if (viewingRombel && (viewingRombel.id === clsId || viewingRombel.nama_kelas?.trim().toLowerCase() === clsName?.trim().toLowerCase())) {
        setViewingRombel(null);
      }

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
      const { rombel: studentRombel, class_id: studentClassId } = getStudentRombelForYear(s, selectedAcademicYear);
      if (studentClassId === clsId) return true;
      const rName = studentRombel.trim();
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

  const handleRemoveStudentFromRombel = (studentId: string, studentName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Keluarkan Siswa dari Rombel',
      message: `Apakah Anda yakin ingin mengeluarkan "${studentName}" dari rombel ini? Status siswa akan diubah menjadi Unassigned.`,
      confirmText: 'Ya, Keluarkan',
      cancelText: 'Batal',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const updatedStudents = students.map(s => {
            if (s.id === studentId) {
              return setStudentRombelForYear(
                s,
                selectedAcademicYear,
                '',
                '',
                s.status,
                selectedAcademicYear === activeYearFromSettings
              ) as Student;
            }
            return s;
          });
          await persistStudents(updatedStudents);
          showToast(`Siswa "${studentName}" berhasil dikeluarkan dari rombel`, 'success');
        } catch (err) {
          showToast('Gagal mengeluarkan siswa dari rombel', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteStudentFromRombel = (studentId: string, studentName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Data Siswa Permanen',
      message: `Apakah Anda yakin ingin menghapus data siswa "${studentName}" secara permanen? Data yang dihapus tidak dapat dikembalikan.`,
      confirmText: 'Ya, Hapus Siswa',
      cancelText: 'Batal',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const updatedStudents = students.filter(s => s.id !== studentId);
          await persistStudents(updatedStudents);
          showToast(`Data siswa "${studentName}" berhasil dihapus`, 'success');
        } catch (err) {
          showToast('Gagal menghapus data siswa', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleExecuteBatchPlotting = async () => {
    if (selectedStudentIds.length === 0) {
      showToast('Pilih minimal satu siswa untuk di-plotting!', 'error');
      return;
    }

    if (!targetRombelForPlot) {
      showToast('Pilih rombel tujuan terlebih dahulu!', 'error');
      return;
    }

    const targetClass = classes.find(c => c.id === targetRombelForPlot || c.nama_kelas === targetRombelForPlot);
    if (!targetClass) {
      showToast('Rombel tujuan tidak valid!', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedSet = new Set(selectedStudentIds.map(String));
      const effectiveYear = selectedAcademicYear || activeYearFromSettings || '2025/2026';

      const isCurrentActive = effectiveYear === activeYearFromSettings;

      const updatedStudents = students.map(s => {
        if (selectedSet.has(String(s.id))) {
          const newStatus = (!s.status || s.status === 'unassigned') ? 'active' : s.status;
          return setStudentRombelForYear(
            s,
            effectiveYear,
            targetClass.nama_kelas,
            targetClass.id,
            newStatus,
            isCurrentActive
          ) as Student;
        }
        return s;
      });

      await persistStudents(updatedStudents);
      showToast(`Berhasil memindahkan ${selectedStudentIds.length} siswa ke Rombel ${targetClass.nama_kelas}`, 'success');
      setSelectedStudentIds([]);
    } catch (err) {
      showToast('Gagal memproses plotting siswa', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteSingleMoveRombel = async () => {
    if (!movingStudent) return;
    if (!targetRombelForSingle) {
      showToast('Pilih Rombel tujuan terlebih dahulu!', 'error');
      return;
    }

    const targetClass = classes.find(c => c.id === targetRombelForSingle || c.nama_kelas === targetRombelForSingle);
    if (!targetClass) {
      showToast('Rombel tujuan tidak valid!', 'error');
      return;
    }

    setSaving(true);
    try {
      const effectiveYear = selectedAcademicYear || activeYearFromSettings || '2025/2026';
      const isCurrentActive = effectiveYear === activeYearFromSettings;
      const newStatus = (!movingStudent.status || movingStudent.status === 'unassigned') ? 'active' : movingStudent.status;
      const updatedStudents = students.map(s => {
        if (String(s.id) === String(movingStudent.id)) {
          return setStudentRombelForYear(
            s,
            effectiveYear,
            targetClass.nama_kelas,
            targetClass.id,
            newStatus,
            isCurrentActive
          ) as Student;
        }
        return s;
      });

      await persistStudents(updatedStudents);
      showToast(`Siswa "${movingStudent.name}" berhasil dipindahkan ke Rombel ${targetClass.nama_kelas}`, 'success');
      setMovingStudent(null);
      setTargetRombelForSingle('');
    } catch (err) {
      showToast('Gagal memindahkan siswa', 'error');
    } finally {
      setSaving(false);
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

      showToast(`Berhasil menduplikasi ${duplicatedRecords.length} siswa ke TP ${duplicateModal.targetYear} ${targetClassName ? `(Rombel ${targetClassName})` : ''}`, 'success');
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
            class_id: '',
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

  return (
    <AdminLayout title="Manajemen Rombel (Rombongan Belajar)">
      <div className="space-y-6">
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
        <div id="rombel-header-banner" className="bg-gradient-to-r from-teal-800 via-emerald-800 to-cyan-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
            <School className="w-96 h-96 -mr-20 -mt-20 text-white" />
          </div>
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-100 text-xs font-semibold backdrop-blur-md border border-emerald-400/30">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Modul Khusus Manajemen Rombongan Belajar
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Manajemen Rombongan Belajar (Rombel)
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base opacity-90 leading-relaxed">
              Atur struktur kelas, alokasi wali kelas, kapasitas ruangan, serta plotting siswa per rombel secara mandiri dan cepat.
            </p>
          </div>
          <div className="relative z-10 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenAddRombel}
              className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 hover:from-amber-300 hover:to-teal-200 text-emerald-950 font-black text-sm sm:text-base rounded-2xl shadow-xl hover:shadow-2xl flex items-center justify-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer border border-white/40"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>+ Tambah Rombel Baru</span>
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <School className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Rombel</p>
              <p className="text-xl font-black text-slate-800">{overallStats.totalRombel}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Wali Kelas</p>
              <p className="text-xl font-black text-blue-600">{overallStats.withWali}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kapasitas Max</p>
              <p className="text-xl font-black text-purple-600">{overallStats.totalCapacity} Kursi</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siswa Terplot</p>
              <p className="text-xl font-black text-cyan-700">{overallStats.assignedStudentsCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Belum Ada Rombel</p>
              <p className="text-xl font-black text-amber-600">{overallStats.unassignedStudentsCount}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Action Toolbar */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-md space-y-3">
          {/* Row 1: Sub-Modul Tabs - Grid Non-slide */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('daftar_rombel')}
              className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all border cursor-pointer min-w-0 ${
                activeTab === 'daftar_rombel'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'daftar_rombel' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  <School className="w-4 h-4" />
                </div>
                <span className="whitespace-nowrap font-bold">Daftar Rombel</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeTab === 'daftar_rombel' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {classes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/manajemen-siswa')}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all border bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80 cursor-pointer min-w-0 whitespace-nowrap"
            >
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span>Manajemen Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('plotting')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all border cursor-pointer min-w-0 whitespace-nowrap ${
                activeTab === 'plotting'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'plotting' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <span>Plotting & Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rekap_kapasitas')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all border cursor-pointer min-w-0 whitespace-nowrap ${
                activeTab === 'rekap_kapasitas'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'rekap_kapasitas' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                <PieChartIcon className="w-4 h-4" />
              </div>
              <span>Matrik & Kapasitas</span>
            </button>
          </div>

          {/* Row 2: Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Aksi Utama Rombel:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleOpenAddRombel}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer transform hover:scale-[1.02] flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Tambah Rombel Baru</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddStudentManual()}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer flex-1 sm:flex-none"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (classes.length > 0) setImportTargetClassId(classes[0].id);
                  setShowGlobalImportModal(true);
                }}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/90 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 sm:flex-none"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="p-2.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl transition-colors border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold"
                title="Refresh Data Rombel"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: DAFTAR ROMBEL (CARDS GRID) */}
        {activeTab === 'daftar_rombel' && (
          <div className="space-y-4">
            {/* Academic Year Notice Banner if viewing non-active year */}
            {selectedAcademicYear !== activeYearFromSettings && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Menampilkan Rombel untuk <strong>Tahun Pelajaran {selectedAcademicYear}</strong>. Tahun pelajaran aktif di sistem saat ini adalah <strong>{activeYearFromSettings}</strong>.
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAcademicYear(activeYearFromSettings)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                >
                  Ke Tahun Aktif ({activeYearFromSettings})
                </button>
              </div>
            )}

            {/* Search and Iconic Modern Filters - Side-by-Side Grid Layout */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-md space-y-3.5">
              {/* Grid 2 Column: Side-by-Side TP and Tingkat across all screen sizes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 border-b border-slate-100 pb-3.5">
                {/* Column 1: Pilih TP (Title on top, wrap items underneath) */}
                <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-2xl border border-slate-200/70 space-y-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider">
                    <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span>Tahun Pelajaran</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {availableYears.map(yr => {
                      const isSelected = selectedAcademicYear === yr;
                      const isSystemActive = yr === activeYearFromSettings;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setSelectedAcademicYear(yr)}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-sm shadow-emerald-600/20 scale-[1.01]'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span>{yr}</span>
                          {isSystemActive && (
                            <span className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${
                              isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              Aktif
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Filter Tingkat (Title on top, wrap items underneath) */}
                <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-2xl border border-slate-200/70 space-y-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider">
                    <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span>Tingkat Kelas</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedTingkatFilter('ALL')}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer border ${
                        selectedTingkatFilter === 'ALL'
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-sm shadow-emerald-600/20 scale-[1.01]'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>Semua</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${
                        selectedTingkatFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {yearClasses.length}
                      </span>
                    </button>

                    {availableTingkatOptions.map(t => {
                      const isSelected = selectedTingkatFilter === t.toString();
                      const countInTingkat = yearClasses.filter(c => (c.tingkat || '1').toString() === t.toString()).length;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTingkatFilter(t.toString())}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-sm shadow-emerald-600/20 scale-[1.01]'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span>Tingkat {t}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {countInTingkat}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 3: Search Bar */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-t border-slate-100">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama rombel, wali kelas, atau ruangan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200/80 flex items-center justify-between sm:justify-start gap-2">
                    <span>Ditemukan:</span>
                    <span className="text-emerald-700 font-extrabold bg-emerald-100/80 px-2.5 py-0.5 rounded-xl text-xs">
                      {filteredRombels.length} Rombel
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddRombel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Rombel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Rombel Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRombels.map((rombel) => (
                <div
                  key={rombel.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 space-y-4 relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                          Tingkat {rombel.tingkat || '1'}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-1">{rombel.nama_kelas}</h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditRombel(rombel)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Rombel"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRombel(rombel.id, rombel.nama_kelas)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Rombel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats Block */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Laki-laki</div>
                        <div className="text-base font-black text-blue-600">{rombel.laki}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Perempuan</div>
                        <div className="text-base font-black text-pink-600">{rombel.perempuan}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Terisi</div>
                        <div className="text-base font-black text-emerald-700">{rombel.totalStudents} / {rombel.maxCap}</div>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Kepadatan Kelas</span>
                        <span className={rombel.fillPercentage >= 90 ? 'text-amber-600' : 'text-emerald-600'}>
                          {rombel.fillPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rombel.fillPercentage >= 100
                              ? 'bg-rose-500'
                              : rombel.fillPercentage >= 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${rombel.fillPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Wali Kelas:</span>
                        <span className="font-bold text-slate-800">{rombel.wali_kelas || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Ruangan:</span>
                        <span className="font-medium text-slate-700">{rombel.ruangan || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingRombel(rombel)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 p-1 hover:bg-emerald-50 rounded-lg"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" /> Detail Siswa ({rombel.totalStudents})
                    </button>

                    <a
                      href={`/admin/direktori-siswa`}
                      className="text-[11px] font-extrabold text-slate-600 hover:text-emerald-700 flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      Buka Direktori <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PLOTTING & BATCH TRANSFER SISWA */}
        {activeTab === 'plotting' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Plotting & Transfer Siswa Antar Rombel</h2>
              <p className="text-xs text-slate-500">Pindahkan siswa baru (Unassigned) atau siswa lama secara kolektif mau pun individual ke Rombel tujuan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                  1. Pilih Sumber Siswa (Asal)
                </label>
                <select
                  value={sourceRombelFilter}
                  onChange={(e) => {
                    setSourceRombelFilter(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UNASSIGNED">Siswa Unassigned (Belum Punya Rombel)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Rombel: {c.nama_kelas}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                  2. Pilih Rombel Tujuan Transfer
                </label>
                <select
                  value={targetRombelForPlot}
                  onChange={(e) => setTargetRombelForPlot(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Rombel Tujuan --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Pindahkan ke: {c.nama_kelas}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Search in Plotting */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama siswa atau NISN di daftar ini..."
                value={plottingSearch}
                onChange={(e) => setPlottingSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* List of Students to Select */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-100 flex items-center justify-between border-b border-slate-200 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plottingSourceStudents.length > 0 && selectedStudentIds.length === plottingSourceStudents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudentIds(plottingSourceStudents.map(s => s.id));
                      } else {
                        setSelectedStudentIds([]);
                      }
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Pilih Semua ({plottingSourceStudents.length} Siswa Ditemukan)</span>
                </div>

                <span>Terpilih: <strong className="text-emerald-700 font-extrabold">{selectedStudentIds.length}</strong> Siswa</span>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                {plottingSourceStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Tidak ada siswa pada kriteria sumber ini.
                  </div>
                ) : (
                  plottingSourceStudents.map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (isChecked) setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                          else setSelectedStudentIds(prev => [...prev, s.id]);
                        }}
                        className={`p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-slate-800">{s.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">NISN: {s.nisn || '-'} | JK: {s.gender}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {s.tingkat_rombel || s.kelas || 'Unassigned'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMovingStudent(s);
                              setTargetRombelForSingle(targetRombelForPlot);
                            }}
                            className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Pindahkan siswa ini saja"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-emerald-700" /> Pindah
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDuplicateModal({
                                isOpen: true,
                                studentIds: [s.id],
                                targetYear: '2025/2026',
                                targetRombel: targetRombelForPlot,
                                targetStatus: 'active',
                              });
                            }}
                            className="px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Duplikat siswa ini ke TP/Rombel baru"
                          >
                            <Copy className="w-3 h-3 text-teal-700" /> Duplikat
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGraduateModal({
                                isOpen: true,
                                studentIds: [s.id],
                                tahunLulus: s.tahun_pelajaran || '2024/2025',
                                tanggalLulus: new Date().toISOString().split('T')[0],
                                noIjazahPrefix: '',
                                keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
                              });
                            }}
                            className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Proses Kelulusan siswa ini"
                          >
                            <GraduationCap className="w-3 h-3 text-indigo-700" /> Luluskan
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setDuplicateModal({
                  isOpen: true,
                  studentIds: selectedStudentIds,
                  targetYear: '2025/2026',
                  targetRombel: targetRombelForPlot,
                  targetStatus: 'active',
                })}
                disabled={saving || selectedStudentIds.length === 0}
                className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                <Copy className="w-4 h-4" />
                Duplikat {selectedStudentIds.length} Siswa Ke TP Baru
              </button>

              <button
                type="button"
                onClick={() => setGraduateModal({
                  isOpen: true,
                  studentIds: selectedStudentIds,
                  tahunLulus: '2024/2025',
                  tanggalLulus: new Date().toISOString().split('T')[0],
                  noIjazahPrefix: '',
                  keterangan: 'Lulus Utama / Memenuhi Syarat Kelulusan',
                })}
                disabled={saving || selectedStudentIds.length === 0}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                <GraduationCap className="w-4 h-4" />
                Luluskan {selectedStudentIds.length} Siswa
              </button>

              <button
                onClick={handleExecuteBatchPlotting}
                disabled={saving || selectedStudentIds.length === 0 || !targetRombelForPlot}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                Eksekusi Transfer {selectedStudentIds.length} Siswa
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: MATRIK KAPASITAS */}
        {activeTab === 'rekap_kapasitas' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Matrik Kapasitas & Wali Kelas Rombel</h2>
                <p className="text-xs text-slate-500">Evaluasi rasio keterisian bangku, wali kelas, dan status kelayakan rombel.</p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Cetak Laporan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="p-3 border border-slate-700 text-center w-12">NO</th>
                    <th className="p-3 border border-slate-700">TINGKAT</th>
                    <th className="p-3 border border-slate-700">NAMA ROMBEL</th>
                    <th className="p-3 border border-slate-700">WALI KELAS</th>
                    <th className="p-3 border border-slate-700 text-center">RUANGAN</th>
                    <th className="p-3 border border-slate-700 text-center">KAPASITAS</th>
                    <th className="p-3 border border-slate-700 text-center">TERISI</th>
                    <th className="p-3 border border-slate-700 text-center">SISA KURSI</th>
                    <th className="p-3 border border-slate-700 text-center">STATUS KEPADATAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rombelDetails.map((r, idx) => {
                    const sisa = r.maxCap - r.totalStudents;
                    let statusLabel = 'Ideal';
                    let statusBg = 'bg-emerald-100 text-emerald-800';
                    if (r.fillPercentage >= 100) {
                      statusLabel = 'Penuh';
                      statusBg = 'bg-rose-100 text-rose-800';
                    } else if (r.fillPercentage >= 85) {
                      statusLabel = 'Hampir Penuh';
                      statusBg = 'bg-amber-100 text-amber-800';
                    }

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 font-medium text-slate-700">
                        <td className="p-3 text-center border border-slate-200">{idx + 1}</td>
                        <td className="p-3 border border-slate-200">Tingkat {r.tingkat || '1'}</td>
                        <td className="p-3 border border-slate-200 font-bold text-slate-900">{r.nama_kelas}</td>
                        <td className="p-3 border border-slate-200 font-semibold">{r.wali_kelas || '-'}</td>
                        <td className="p-3 border border-slate-200 text-center text-slate-500">{r.ruangan || '-'}</td>
                        <td className="p-3 border border-slate-200 text-center font-bold">{r.maxCap}</td>
                        <td className="p-3 border border-slate-200 text-center font-bold text-emerald-700">{r.totalStudents}</td>
                        <td className="p-3 border border-slate-200 text-center font-bold text-blue-600">{sisa < 0 ? 0 : sisa}</td>
                        <td className="p-3 border border-slate-200 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${statusBg}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT ROMBEL */}
        {showRombelModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="p-5 bg-emerald-800 text-white flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editingRombel ? 'Edit Data Rombel' : 'Buat Rombel Baru'}
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
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: Kelas 1A"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tingkat Kelas</label>
                    <select
                      value={rombelForm.tingkat || '1'}
                      onChange={(e) => setRombelForm({ ...rombelForm, tingkat: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                        <option key={num} value={num.toString()}>Tingkat {num}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kapasitas Kursi</label>
                    <input
                      type="number"
                      value={rombelForm.kapasitas || 32}
                      onChange={(e) => setRombelForm({ ...rombelForm, kapasitas: parseInt(e.target.value) || 32 })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
                  <select
                    value={rombelForm.tahun_pelajaran || selectedAcademicYear || activeYearFromSettings}
                    onChange={(e) => setRombelForm({ ...rombelForm, tahun_pelajaran: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-white"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>
                        {yr} {yr === activeYearFromSettings ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wali Kelas</label>
                  <input
                    type="text"
                    value={rombelForm.wali_kelas || ''}
                    onChange={(e) => setRombelForm({ ...rombelForm, wali_kelas: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium"
                    placeholder="Nama Wali Kelas..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ruangan / Gedung</label>
                  <input
                    type="text"
                    value={rombelForm.ruangan || ''}
                    onChange={(e) => setRombelForm({ ...rombelForm, ruangan: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium"
                    placeholder="Contoh: Gedung A, R. 101"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                  {editingRombel ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRombelModal(false);
                        handleDeleteRombel(editingRombel.id, editingRombel.nama_kelas);
                      }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Rombel
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRombelModal(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md flex items-center gap-2"
                    >
                      {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Simpan Rombel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VIEW MEMBER STUDENTS OF A ROMBEL */}
        {viewingRombel && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black">{viewingRombel.nama_kelas}</h3>
                  <p className="text-xs text-emerald-100">
                    Wali Kelas: {viewingRombel.wali_kelas || '-'} | Ruangan: {viewingRombel.ruangan || '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteRombel(viewingRombel.id, viewingRombel.nama_kelas)}
                    className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Hapus Rombel ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Rombel
                  </button>
                  <button onClick={() => setViewingRombel(null)} className="text-white/80 hover:text-white p-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-3 text-xs">
                {(() => {
                  const members = students.filter(s => {
                    const { rombel: sRombel, class_id: sClassId, status } = getStudentRombelForYear(s, selectedAcademicYear);
                    const normalizedStatus = (status || '').toLowerCase().trim();
                    const normalizedRombel = sRombel.toLowerCase().trim();
                    if (normalizedStatus === 'graduated' || normalizedStatus === 'lulus' || normalizedStatus === 'alumni' || normalizedRombel.includes('alumni') || normalizedRombel.includes('lulus')) {
                      return false;
                    }
                    if (sClassId === viewingRombel.id) return true;
                    const rName = sRombel || '';
                    return rName.toLowerCase() === viewingRombel.nama_kelas.toLowerCase();
                  });

                  if (members.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400">
                        Belum ada siswa yang terdaftar pada Rombel ini.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 w-10 text-center">NO</th>
                            <th className="p-2.5">NAMA SISWA</th>
                            <th className="p-2.5">NISN</th>
                            <th className="p-2.5">JK</th>
                            <th className="p-2.5">STATUS</th>
                            <th className="p-2.5 text-center">AKSI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {members.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-slate-50 font-medium">
                              <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-800">{s.name}</td>
                              <td className="p-2.5 font-mono text-slate-600">{s.nisn || '-'}</td>
                              <td className="p-2.5 font-semibold text-slate-700">{s.gender}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  {getStudentRombelForYear(s, selectedAcademicYear).status === 'active' ? 'Aktif' : getStudentRombelForYear(s, selectedAcademicYear).status}
                                </span>
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStudentManual(s)}
                                    className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors"
                                    title="Edit Data Siswa"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMovingStudent(s);
                                      setTargetRombelForSingle('');
                                    }}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors"
                                    title="Pindahkan siswa ini ke Rombel lain"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" /> Pindah
                                  </button>
                                  <button
                                    onClick={() => handleRemoveStudentFromRombel(s.id, s.name)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold transition-colors"
                                    title="Keluarkan dari Rombel ini"
                                  >
                                    Keluarkan
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStudentFromRombel(s.id, s.name)}
                                    className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition-colors"
                                    title="Hapus Data Siswa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenAddStudentManual(viewingRombel.id, viewingRombel.nama_kelas)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Tambah Siswa</span>
                  </button>

                  <button
                    onClick={() => handleDownloadTemplate(viewingRombel.nama_kelas)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Unduh Format Excel Siswa Khusus Rombel Ini"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    Unduh Format Excel
                  </button>

                  <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Excel Ke {viewingRombel.nama_kelas}</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => handleImportExcelForClass(e, viewingRombel)}
                    />
                  </label>
                </div>

                <button
                  onClick={() => setViewingRombel(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: GLOBAL IMPORT EXCEL SISWA PER KELAS */}
        {showGlobalImportModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                  <h3 className="text-lg font-extrabold">Import Excel Siswa Per Kelas</h3>
                </div>
                <button onClick={() => setShowGlobalImportModal(false)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs sm:text-sm">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs leading-relaxed">
                  <strong>Petunjuk Import:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1 text-emerald-800">
                    <li>Pilih Rombel / Kelas tujuan siswa.</li>
                    <li>Unduh template Excel jika belum memiliki format kolom.</li>
                    <li>Upload file Excel yang telah diisi data siswa. Semua siswa dalam file otomatis masuk ke Rombel pilihan.</li>
                  </ol>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Pilih Rombel / Kelas Tujuan *</label>
                  <select
                    value={importTargetClassId}
                    onChange={(e) => setImportTargetClassId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Kelas Tujuan --</option>
                    {yearClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.nama_kelas} (Tingkat {cls.tingkat || '1'} - Wali: {cls.wali_kelas || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-800 text-xs">Format File Excel (.xlsx)</p>
                    <p className="text-[11px] text-slate-500">Unduh format tabel resmi dengan nama kolom NISN, NIK, Nama Lengkap, dll.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedClass = yearClasses.find(c => c.id === importTargetClassId);
                      handleDownloadTemplate(selectedClass?.nama_kelas);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" /> Unduh Format
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Upload File Excel (.xlsx / .xls)</label>
                  <label className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
                    !importTargetClassId
                      ? 'bg-slate-100 border-slate-300 cursor-not-allowed opacity-60'
                      : 'bg-emerald-50/50 border-emerald-300 hover:bg-emerald-100/50 cursor-pointer'
                  }`}>
                    <Upload className="w-8 h-8 text-emerald-600 mb-2" />
                    <span className="font-bold text-slate-800 text-xs">Klik di sini untuk memilih file Excel</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Siswa otomatis di-plot ke Rombel terpilih</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      disabled={!importTargetClassId}
                      className="hidden"
                      onChange={(e) => {
                        const selectedClass = yearClasses.find(c => c.id === importTargetClassId);
                        handleImportExcelForClass(e, selectedClass);
                      }}
                    />
                  </label>
                  {!importTargetClassId && (
                    <p className="text-[11px] font-bold text-amber-600 mt-1">
                      * Pilih Rombel / Kelas tujuan terlebih dahulu sebelum memilih file.
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowGlobalImportModal(false)}
                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
                  >
                    Batal
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
        {/* MODAL PINDAH ROMBEL INDIVIDUAL */}
        {movingStudent && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-5 bg-gradient-to-r from-teal-800 to-emerald-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-300" />
                  <h3 className="font-extrabold text-sm sm:text-base">Pindah Rombel Siswa</h3>
                </div>
                <button
                  onClick={() => { setMovingStudent(null); setTargetRombelForSingle(''); }}
                  className="text-slate-200 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Siswa Terpilih</div>
                  <div className="font-extrabold text-sm text-slate-900">{movingStudent.name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    NISN: {movingStudent.nisn || '-'} | Rombel Saat Ini: <strong className="text-emerald-700">{getStudentRombelForYear(movingStudent, selectedAcademicYear).rombel || 'Unassigned'}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Pilih Rombel Tujuan Baru *
                  </label>
                  <select
                    value={targetRombelForSingle}
                    onChange={(e) => setTargetRombelForSingle(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Rombel Tujuan --</option>
                    {yearClasses.map(c => {
                      const count = students.filter(s => {
                        const { rombel: sRombel, class_id: sClassId, status } = getStudentRombelForYear(s, selectedAcademicYear);
                        const normalizedStatus = (status || '').toLowerCase().trim();
                        const normalizedRombel = sRombel.toLowerCase().trim();
                        if (normalizedStatus === 'graduated' || normalizedStatus === 'lulus' || normalizedStatus === 'alumni' || normalizedRombel.includes('alumni') || normalizedRombel.includes('lulus')) {
                          return false;
                        }
                        if (sClassId === c.id) return true;
                        const rName = sRombel.trim();
                        return rName.toLowerCase() === c.nama_kelas.toLowerCase();
                      }).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nama_kelas} (Tingkat {c.tingkat || '1'} | Wali: {c.wali_kelas || '-'} | Terisi: {count}/{c.kapasitas || 32})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setMovingStudent(null); setTargetRombelForSingle(''); }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={saving || !targetRombelForSingle}
                    onClick={handleExecuteSingleMoveRombel}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                    Konfirmasi Pindah Rombel
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

        {/* MODAL TAMBAH / EDIT SISWA MANUAL */}
        {showAddStudentModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 my-8 max-h-[90vh] flex flex-col">
              <div className="p-5 bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl text-blue-200">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base">
                      {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Manual'}
                    </h3>
                    <p className="text-[11px] text-blue-200">
                      {editingStudent ? 'Perbarui data siswa dan penempatan rombel' : 'Input data siswa baru secara langsung ke dalam rombel'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="text-blue-200 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStudentManual} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Nama Lengkap Siswa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Muhammad Raihan Subagjo"
                      value={studentForm.name || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      NISN
                    </label>
                    <input
                      type="text"
                      placeholder="10 digit nomor NISN"
                      value={studentForm.nisn || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      NIK (No. KTP/KK)
                    </label>
                    <input
                      type="text"
                      placeholder="16 digit nomor NIK"
                      value={studentForm.nik || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, nik: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Jenis Kelamin *
                    </label>
                    <select
                      value={studentForm.gender || 'Laki-laki'}
                      onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Target Rombel / Kelas *
                    </label>
                    <select
                      value={studentForm.class_id || ''}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const matchedClass = yearClasses.find(c => c.id === targetId) || classes.find(c => c.id === targetId);
                        setStudentForm({
                          ...studentForm,
                          class_id: targetId,
                          tingkat_rombel: matchedClass ? matchedClass.nama_kelas : ''
                        });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Belum Ada Rombel (Unassigned) --</option>
                      {yearClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.nama_kelas} (Tingkat {cls.tingkat || '1'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      placeholder="Kota tempat lahir"
                      value={studentForm.tempat_lahir || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, tempat_lahir: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={studentForm.tanggal_lahir || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, tanggal_lahir: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Nama Ayah
                    </label>
                    <input
                      type="text"
                      placeholder="Nama ayah kandung"
                      value={studentForm.nama_ayah || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, nama_ayah: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Nama Ibu
                    </label>
                    <input
                      type="text"
                      placeholder="Nama ibu kandung"
                      value={studentForm.nama_ibu || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, nama_ibu: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      No. HP / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 081234567890"
                      value={studentForm.phone || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Nomor KIP / PIP
                    </label>
                    <input
                      type="text"
                      placeholder="Isi jika penerima bantuan KIP/PIP"
                      value={studentForm.nomor_kip_pip || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, nomor_kip_pip: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                      Alamat Lengkap
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Jl. Desa/Kelurahan, RT/RW, Kecamatan..."
                      value={studentForm.address || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
