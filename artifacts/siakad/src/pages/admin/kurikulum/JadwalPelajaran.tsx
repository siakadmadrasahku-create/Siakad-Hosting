import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Plus, Pencil, Trash2, Calendar, Clock, BookOpen, 
  Save, Printer, ArrowLeft, Search, RefreshCw, Info,
  LayoutGrid, ChevronRight, Download, Loader2, Coffee, Flag,
  Wand2, Zap, Check, AlertCircle, Copy, GraduationCap, Sparkles, Eraser
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import CetakJadwal from '@/components/CetakJadwal';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface JadwalItem {
  id: string;
  class_id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_id: string;
  teacher_name?: string;
  period_number?: number; // Jam keberapa (1, 2, 3...)
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Helper to add minutes to time "HH:MM"
const addMinutesToTime = (timeStr: string, minsToAdd: number): string => {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  date.setMinutes(date.getMinutes() + minsToAdd);
  const newH = String(date.getHours()).padStart(2, '0');
  const newM = String(date.getMinutes()).padStart(2, '0');
  return `${newH}:${newM}`;
};

const JadwalPelajaranAdmin = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [schedules, setSchedules] = useState<JadwalItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');

  // Batch Fill Form State (e.g. Matematika 4 jam auto-guru)
  const [batchForm, setBatchForm] = useState({
    class_id: '',
    day: 'Senin',
    subject_id: '',
    teacher_name: '',
    hoursCount: 4,
    startFromSlot: 1 as string | number, // 1-indexed for academic slots or 'next_empty'
    endToSlot: 4 as string | number, // 1-indexed for academic slots or 'auto'
  });

  // Clear / Reset Modal State
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearForm, setClearForm] = useState<{
    scope: 'all' | 'specific_day';
    day: string;
    mode: 'reset_mapel' | 'delete_all';
  }>({
    scope: 'all',
    day: 'Senin',
    mode: 'reset_mapel',
  });

  // Auto Generator Form States (Default: 35 menit, 8 jam per hari - dinamis)
  const [genConfig, setGenConfig] = useState({
    startTime: '07:00',
    durationMin: 35,
    totalPeriods: 8,
    customFridayPeriods: true,
    fridayPeriods: 6,
    includeUpacaraSenin: true,
    includePembiasaanReligi: true,
    pembiasaanDuration: 25,
    pembiasaanMode: 'slot_khusus', // 'slot_khusus' (ditambah sebelum jam ke-1) atau 'jam_ke_1' (mengisi jam 1)
    break1After: 3,
    break1Duration: 20,
    includeBreak2: true,
    break2After: 6,
    break2Duration: 30,
    applyScope: 'selected', // 'selected' or 'all'
    overwriteExisting: true
  });

  const [formData, setFormData] = useState<Omit<JadwalItem, 'id'>>({
    class_id: '',
    day: 'Senin',
    start_time: '07:00',
    end_time: '07:35',
    subject_id: '',
    teacher_name: '',
    period_number: 1
  });

  const [isManualTimeMode, setIsManualTimeMode] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Match teacher automatically from data_guru module based on mapel name or ID
  const findTeacherForMapel = (mapelIdOrName: string, mapelsList: any[], teachersList: any[]) => {
    if (!mapelIdOrName || ['pembiasaan', 'upacara', 'istirahat', 'istirahat_2', 'ishoma'].includes(mapelIdOrName)) {
      return '';
    }

    const mapelObj = mapelsList.find(m => m.id === mapelIdOrName || m.nama?.toLowerCase() === mapelIdOrName.toLowerCase());
    const targetMapelName = (mapelObj?.nama || mapelIdOrName).trim().toLowerCase();

    // 1. Search in teachersList by mapel_diampu
    if (Array.isArray(teachersList) && teachersList.length > 0) {
      const matchedTeacher = teachersList.find((t: any) => {
        if (!t || !t.mapel_diampu) return false;
        const diampu = String(t.mapel_diampu).trim().toLowerCase();
        return diampu.includes(targetMapelName) || targetMapelName.includes(diampu);
      });
      if (matchedTeacher?.nama) {
        return matchedTeacher.nama;
      }
    }

    // 2. Check if mapelObj itself has guru properties
    if (mapelObj?.guru_pengampu) return mapelObj.guru_pengampu;
    if (mapelObj?.guru) return mapelObj.guru;

    return '';
  };

  // Filter unique non-duplicate classes by name / id
  const uniqueClasses = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    const map = new Map<string, any>();
    classes.forEach(c => {
      if (!c || !c.nama_kelas) return;
      const cleanName = String(c.nama_kelas).trim();
      const key = cleanName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          ...c,
          id: c.id || key,
          nama_kelas: cleanName
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const tA = parseInt(a.tingkat || '0') || 0;
      const tB = parseInt(b.tingkat || '0') || 0;
      if (tA !== tB) return tA - tB;
      return a.nama_kelas.localeCompare(b.nama_kelas, undefined, { numeric: true });
    });
  }, [classes]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      const loadedSchedules = res?.find(s => s.id === 'jadwal_pelajaran_list')?.value || [];
      const loadedClasses = res?.find(s => s.id === 'kelas_list')?.value || [];
      const loadedMapels = res?.find(s => s.id === 'mata_pelajaran_list')?.value || [];
      const loadedGuru = res?.find(s => s.id === 'data_guru' || s.id.includes('data_guru') || s.id === 'teachers_list')?.value || [];

      setSchedules(loadedSchedules);
      setClasses(loadedClasses);
      setMapels(loadedMapels);
      setTeachers(Array.isArray(loadedGuru) ? loadedGuru : []);

      // Auto-select first class if none selected
      if (loadedClasses && loadedClasses.length > 0 && !selectedClass) {
        const first = loadedClasses[0];
        setSelectedClass(first.id || first.nama_kelas);
      }
    } catch (err) {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.class_id || !formData.start_time) {
      showError('Lengkapi data jadwal!');
      return;
    }

    const cleanSubjectId = formData.subject_id === 'empty' ? '' : formData.subject_id;
    const cleanItem = {
      ...formData,
      subject_id: cleanSubjectId,
      teacher_name: cleanSubjectId ? formData.teacher_name : ''
    };

    setIsSaving(true);
    try {
      let newList: JadwalItem[];

      const targetClassObj = uniqueClasses.find(c => c.id === formData.class_id || c.nama_kelas === formData.class_id);
      const targetClassId = targetClassObj?.id || formData.class_id;
      const targetClassName = targetClassObj?.nama_kelas?.toLowerCase();

      const isTargetClass = (cId?: string) => {
        return cId === formData.class_id || cId === targetClassId || (targetClassName && cId?.toLowerCase() === targetClassName);
      };

      if (editingItem && formData.period_number) {
        // Search if target slot already exists in grid for this class, day, and target period_number
        const targetSlot = schedules.find(s => 
          isTargetClass(s.class_id) && 
          s.day === formData.day && 
          s.period_number === formData.period_number &&
          s.id !== editingItem.id
        );

        if (targetSlot) {
          newList = schedules.map(s => {
            if (s.id === targetSlot.id) {
              return {
                ...s,
                subject_id: cleanSubjectId,
                teacher_name: cleanSubjectId ? formData.teacher_name : '',
                start_time: formData.start_time,
                end_time: formData.end_time
              };
            }
            if (s.id === editingItem.id) {
              return {
                ...s,
                subject_id: '',
                teacher_name: ''
              };
            }
            return s;
          });
        } else {
          newList = schedules.map(s => s.id === editingItem.id ? { ...cleanItem, id: s.id } : s);
        }
      } else if (editingItem) {
        newList = schedules.map(s => s.id === editingItem.id ? { ...cleanItem, id: s.id } : s);
      } else {
        const targetSlot = formData.period_number ? schedules.find(s => 
          isTargetClass(s.class_id) && 
          s.day === formData.day && 
          s.period_number === formData.period_number
        ) : null;

        if (targetSlot) {
          newList = schedules.map(s => s.id === targetSlot.id ? {
            ...s,
            subject_id: cleanSubjectId,
            teacher_name: cleanSubjectId ? formData.teacher_name : '',
            start_time: formData.start_time,
            end_time: formData.end_time
          } : s);
        } else {
          newList = [{ ...cleanItem, id: Date.now().toString() }, ...schedules];
        }
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'jadwal_pelajaran_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      setSchedules(newList);
      showSuccess(editingItem ? 'Jadwal & Waktu slot berhasil diperbarui!' : 'Jadwal manual berhasil ditambahkan!');
      setDialogOpen(false);
    } catch (err) {
      showError('Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const getTimeForPeriod = (targetDay: string, targetClassId: string, periodNum: number, currentSchedules: JadwalItem[]) => {
    const classObj = uniqueClasses.find(c => c.id === targetClassId || c.nama_kelas === targetClassId);
    const targetId = classObj?.id || targetClassId;
    const targetName = classObj?.nama_kelas?.toLowerCase();

    // 1. Try finding in current class schedules for targetDay and periodNum
    const existingInClass = currentSchedules.find(s => 
      (s.class_id === targetClassId || s.class_id === targetId || (targetName && s.class_id?.toLowerCase() === targetName)) && 
      s.day === targetDay && 
      s.period_number === periodNum
    );
    if (existingInClass?.start_time && existingInClass?.end_time) {
      return { start_time: existingInClass.start_time, end_time: existingInClass.end_time };
    }

    // 2. Try finding in any class schedules for targetDay and periodNum
    const existingInAnyClass = currentSchedules.find(s => 
      s.day === targetDay && s.period_number === periodNum
    );
    if (existingInAnyClass?.start_time && existingInAnyClass?.end_time) {
      return { start_time: existingInAnyClass.start_time, end_time: existingInAnyClass.end_time };
    }

    // 3. Calculation fallback using genConfig
    let currentTime = genConfig.startTime || '07:00';
    const duration = genConfig.durationMin || 35;
    
    if (genConfig.pembiasaanMode === 'slot_khusus') {
      if (targetDay === 'Senin' && genConfig.includeUpacaraSenin) {
        currentTime = addMinutesToTime(currentTime, duration);
      } else if (targetDay !== 'Senin' && genConfig.includePembiasaanReligi) {
        currentTime = addMinutesToTime(currentTime, genConfig.pembiasaanDuration || 25);
      }
    }

    for (let p = 1; p <= periodNum; p++) {
      const sTime = currentTime;
      const eTime = addMinutesToTime(sTime, duration);
      if (p === periodNum) {
        return { start_time: sTime, end_time: eTime };
      }
      currentTime = eTime;
      if (p === genConfig.firstBreakAfter) {
        currentTime = addMinutesToTime(currentTime, genConfig.firstBreakMin || 15);
      } else if (p === genConfig.secondBreakAfter) {
        currentTime = addMinutesToTime(currentTime, genConfig.secondBreakMin || 30);
      }
    }

    return { start_time: currentTime, end_time: addMinutesToTime(currentTime, duration) };
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus slot jam pelajaran ini dari daftar?')) return;
    const newList = schedules.filter(s => s.id !== id);
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'jadwal_pelajaran_list', value: newList, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSchedules(newList);
      showSuccess('Slot jam pelajaran berhasil dihapus');
    } catch (err) {
      showError('Gagal menghapus slot jam pelajaran');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSlot = async (id: string) => {
    const newList = schedules.map(s => s.id === id ? { ...s, subject_id: '', teacher_name: '' } : s);
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'jadwal_pelajaran_list', value: newList, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSchedules(newList);
      showSuccess('Mata pelajaran & Guru pada slot ini berhasil dikosongkan');
    } catch (err) {
      showError('Gagal mengosongkan slot');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate 8 Jam @ 35 Menit (dengan Pembiasaan Religi & 2 Istirahat Dinamis)
  const handleAutoGenerate = async () => {
    const targetClasses = genConfig.applyScope === 'all' 
      ? uniqueClasses 
      : uniqueClasses.filter(c => c.id === selectedClass || c.nama_kelas === selectedClass);

    if (targetClasses.length === 0) {
      showError('Pilih kelas terlebih dahulu!');
      return;
    }

    setIsSaving(true);
    try {
      const generatedItems: JadwalItem[] = [];

      targetClasses.forEach(cls => {
        const classIdentifier = cls.id || cls.nama_kelas;

        DAYS.forEach(day => {
          let currentTime = genConfig.startTime; // e.g. "07:00"

          // Tentukan jumlah jam untuk hari ini (e.g. Jumat bisa 6 jam, Senin-Kamis/Sabtu 8/9/10 jam)
          const dayTotalPeriods = (day === 'Jumat' && genConfig.customFridayPeriods) 
            ? genConfig.fridayPeriods 
            : genConfig.totalPeriods;

          // 1. Slot Kegiatan Pagi (Jika Mode: Slot Khusus Sebelum Jam Ke-1)
          if (genConfig.pembiasaanMode === 'slot_khusus') {
            if (day === 'Senin' && genConfig.includeUpacaraSenin) {
              const endUpacara = addMinutesToTime(currentTime, genConfig.durationMin || 35);
              generatedItems.push({
                id: `gen_${classIdentifier}_${day}_upacara_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                class_id: classIdentifier,
                day: day,
                start_time: currentTime,
                end_time: endUpacara,
                subject_id: 'upacara',
                teacher_name: 'Pembina Upacara'
              });
              currentTime = endUpacara;
            } else if (day !== 'Senin' && genConfig.includePembiasaanReligi) {
              const endPembiasaan = addMinutesToTime(currentTime, genConfig.pembiasaanDuration || 25);
              generatedItems.push({
                id: `gen_${classIdentifier}_${day}_pembiasaan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                class_id: classIdentifier,
                day: day,
                start_time: currentTime,
                end_time: endPembiasaan,
                subject_id: 'pembiasaan',
                teacher_name: 'Guru Agama / Wali Kelas'
              });
              currentTime = endPembiasaan;
            }
          }

          // 2. Loop Jam Pelajaran
          for (let p = 1; p <= dayTotalPeriods; p++) {
            const periodStartTime = currentTime;
            const periodEndTime = addMinutesToTime(periodStartTime, genConfig.durationMin);

            // Jika Mode: jam_ke_1 (Kegiatan Pagi Mengisi Jam Ke-1)
            if (genConfig.pembiasaanMode === 'jam_ke_1' && p === 1) {
              if (day === 'Senin' && genConfig.includeUpacaraSenin) {
                generatedItems.push({
                  id: `gen_${classIdentifier}_${day}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  class_id: classIdentifier,
                  day: day,
                  start_time: periodStartTime,
                  end_time: periodEndTime,
                  subject_id: 'upacara',
                  teacher_name: 'Pembina Upacara',
                  period_number: p
                });
              } else if (day !== 'Senin' && genConfig.includePembiasaanReligi) {
                generatedItems.push({
                  id: `gen_${classIdentifier}_${day}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  class_id: classIdentifier,
                  day: day,
                  start_time: periodStartTime,
                  end_time: periodEndTime,
                  subject_id: 'pembiasaan',
                  teacher_name: 'Guru Agama / Wali Kelas',
                  period_number: p
                });
              } else {
                generatedItems.push({
                  id: `gen_${classIdentifier}_${day}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  class_id: classIdentifier,
                  day: day,
                  start_time: periodStartTime,
                  end_time: periodEndTime,
                  subject_id: '',
                  teacher_name: '',
                  period_number: p
                });
              }
            } else {
              generatedItems.push({
                id: `gen_${classIdentifier}_${day}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                class_id: classIdentifier,
                day: day,
                start_time: periodStartTime,
                end_time: periodEndTime,
                subject_id: '',
                teacher_name: '',
                period_number: p
              });
            }

            currentTime = periodEndTime;

            // Check Istirahat 1
            if (p === genConfig.break1After && genConfig.break1Duration > 0) {
              const breakStart = currentTime;
              const breakEnd = addMinutesToTime(breakStart, genConfig.break1Duration);
              generatedItems.push({
                id: `gen_break1_${classIdentifier}_${day}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                class_id: classIdentifier,
                day: day,
                start_time: breakStart,
                end_time: breakEnd,
                subject_id: 'istirahat',
                teacher_name: ''
              });
              currentTime = breakEnd;
            }

            // Check Istirahat 2 (Ishoma)
            if (genConfig.includeBreak2 && p === genConfig.break2After && genConfig.break2Duration > 0) {
              const breakStart = currentTime;
              const breakEnd = addMinutesToTime(breakStart, genConfig.break2Duration);
              generatedItems.push({
                id: `gen_break2_${classIdentifier}_${day}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                class_id: classIdentifier,
                day: day,
                start_time: breakStart,
                end_time: breakEnd,
                subject_id: 'ishoma',
                teacher_name: ''
              });
              currentTime = breakEnd;
            }
          }
        });
      });

      let updatedSchedules: JadwalItem[];
      const targetClassIds = new Set(targetClasses.map(c => c.id || c.nama_kelas));

      if (genConfig.overwriteExisting) {
        // Remove existing schedules for target classes
        const remaining = schedules.filter(s => !targetClassIds.has(s.class_id));
        updatedSchedules = [...generatedItems, ...remaining];
      } else {
        updatedSchedules = [...generatedItems, ...schedules];
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'jadwal_pelajaran_list', value: updatedSchedules, updated_at: new Date().toISOString() });

      if (error) throw error;

      setSchedules(updatedSchedules);
      showSuccess(`Berhasil memformat ${generatedItems.length} slot jam pelajaran (${genConfig.totalPeriods} jam @ ${genConfig.durationMin} menit)!`);
      setGenDialogOpen(false);
    } catch (err) {
      showError('Gagal membuat jadwal otomatis');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Batch Apply Mapel (e.g., Matematika 4 jam auto-guru)
  const handleApplyBatchMapel = async () => {
    if (!batchForm.class_id || !batchForm.subject_id) {
      showError('Pilih Rombel Kelas dan Mata Pelajaran!');
      return;
    }

    let hoursNeeded = Number(batchForm.hoursCount) || 1;
    if (batchForm.startFromSlot !== 'next_empty' && batchForm.endToSlot !== 'auto') {
      const sNum = Number(batchForm.startFromSlot) || 1;
      const eNum = Number(batchForm.endToSlot) || sNum;
      if (eNum >= sNum) {
        hoursNeeded = eNum - sNum + 1;
      }
    }

    const targetClass = batchForm.class_id;
    const targetDay = batchForm.day;

    // Determine target teacher
    let teacherName = batchForm.teacher_name;
    if (!teacherName) {
      teacherName = findTeacherForMapel(batchForm.subject_id, mapels, teachers);
    }

    // Match class object
    const classObj = uniqueClasses.find(c => c.id === targetClass || c.nama_kelas === targetClass);
    const targetClassId = classObj?.id || targetClass;
    const targetClassName = classObj?.nama_kelas || targetClass;

    // Get current schedule slots for this day
    const daySchedules = schedules
      .filter(s => (s.class_id === targetClassId || s.class_id === targetClassName || s.class_id === selectedClass) && s.day === targetDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    if (daySchedules.length === 0) {
      showError(`Belum ada grid jam pelajaran di hari ${targetDay}. Silakan jalankan 'Auto-Generate Grid' terlebih dahulu.`);
      return;
    }

    // Filter academic slots (non-break / non-upacara / non-pembiasaan)
    const academicSlots = daySchedules.filter(s => !['istirahat', 'istirahat_2', 'ishoma', 'upacara', 'pembiasaan'].includes(s.subject_id));

    if (academicSlots.length === 0) {
      showError('Tidak ditemukan slot jam pelajaran reguler di hari tersebut.');
      return;
    }

    // Determine starting index among academic slots
    let startIdx = 0;
    if ((batchForm.startFromSlot as any) === 'next_empty') {
      const firstEmptyIdx = academicSlots.findIndex(s => !s.subject_id);
      startIdx = firstEmptyIdx >= 0 ? firstEmptyIdx : 0;
    } else {
      const slotNum = Number(batchForm.startFromSlot) || 1;
      // 1. Try matching period_number directly if present
      const periodMatchIdx = academicSlots.findIndex(s => s.period_number === slotNum);
      if (periodMatchIdx >= 0) {
        startIdx = periodMatchIdx;
      } else {
        // 2. Check if day starts with upacara/pembiasaan
        const hasUpacaraAtStart = ['upacara', 'pembiasaan'].includes(daySchedules[0]?.subject_id);
        const expectedOffset = hasUpacaraAtStart ? 2 : 1;
        startIdx = Math.max(0, slotNum - expectedOffset);
        if (startIdx >= academicSlots.length) {
          startIdx = Math.max(0, academicSlots.length - 1);
        }
      }
    }

    const targetAcademicSlots = academicSlots.slice(startIdx, startIdx + hoursNeeded);

    if (targetAcademicSlots.length === 0) {
      showError('Tidak ada slot jam pelajaran yang tersedia untuk diisi.');
      return;
    }

    const targetSlotIds = new Set(targetAcademicSlots.map(s => s.id));

    // Update schedules list
    const updatedSchedules = schedules.map(s => {
      if (targetSlotIds.has(s.id)) {
        return {
          ...s,
          subject_id: batchForm.subject_id,
          teacher_name: teacherName
        };
      }
      return s;
    });

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'jadwal_pelajaran_list', value: updatedSchedules, updated_at: new Date().toISOString() });

      if (error) throw error;

      setSchedules(updatedSchedules);
      const mapelName = getMapelName(batchForm.subject_id);
      showSuccess(`Berhasil mengisi ${targetAcademicSlots.length} jam ${mapelName} (${teacherName || 'Guru Sesuai Modul'}) pada hari ${targetDay}!`);
      setBatchDialogOpen(false);
    } catch (err) {
      showError('Gagal menyimpan jadwal batch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteClear = async () => {
    if (!selectedClass) return;

    const currentClassObj = uniqueClasses.find(c => c.id === selectedClass || c.nama_kelas === selectedClass);
    const targetId = currentClassObj?.id || selectedClass;
    const targetName = currentClassObj?.nama_kelas?.toLowerCase();

    const isMatchingClass = (cId?: string) => {
      return cId === selectedClass || cId === targetId || (targetName && cId?.toLowerCase() === targetName);
    };

    const isTargetSchedule = (s: JadwalItem) => {
      if (!isMatchingClass(s.class_id)) return false;
      if (clearForm.scope === 'specific_day') {
        return s.day === clearForm.day;
      }
      return true;
    };

    let newList: JadwalItem[];
    if (clearForm.mode === 'reset_mapel') {
      newList = schedules.map(s => {
        if (isTargetSchedule(s)) {
          return { ...s, subject_id: '', teacher_name: '' };
        }
        return s;
      });
    } else {
      newList = schedules.filter(s => !isTargetSchedule(s));
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'jadwal_pelajaran_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;

      setSchedules(newList);
      setClearDialogOpen(false);

      const scopeDesc = clearForm.scope === 'specific_day' ? `pada hari ${clearForm.day}` : 'semua hari';
      if (clearForm.mode === 'reset_mapel') {
        showSuccess(`Mata pelajaran untuk ${selectedClassObj?.nama_kelas || 'kelas ini'} (${scopeDesc}) berhasil dikosongkan!`);
      } else {
        showSuccess(`Slot jam pelajaran untuk ${selectedClassObj?.nama_kelas || 'kelas ini'} (${scopeDesc}) berhasil dihapus!`);
      }
    } catch (err) {
      showError('Gagal mengosongkan/menghapus jadwal');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSchedules = useMemo(() => {
    if (!selectedClass) return [];
    const currentClassObj = uniqueClasses.find(c => c.id === selectedClass || c.nama_kelas === selectedClass);
    const targetId = currentClassObj?.id || selectedClass;
    const targetName = currentClassObj?.nama_kelas?.toLowerCase();

    return schedules.filter(s => 
      s.class_id === selectedClass || 
      s.class_id === targetId ||
      (targetName && s.class_id?.toLowerCase() === targetName)
    );
  }, [schedules, selectedClass, uniqueClasses]);

  const getMapelName = (id: string) => {
    if (!id) return '(Pilih Mata Pelajaran)';
    if (id === 'pembiasaan') return '🕌 PEMBIASAAN RELIGI';
    if (id === 'upacara') return '🇮🇩 UPACARA BENDERA';
    if (id === 'istirahat') return '☕ ISTIRAHAT 1';
    if (id === 'istirahat_2') return '☕ ISTIRAHAT 2';
    if (id === 'ishoma') return '🍱 ISHOMA';
    return mapels.find(m => m.id === id)?.nama || 'Mata Pelajaran';
  };

  if (isPrinting) {
    const classObj = uniqueClasses.find(c => c.id === selectedClass || c.nama_kelas === selectedClass);
    return (
      <CetakJadwal
        selectedClassId={selectedClass || (uniqueClasses[0]?.id ?? '')}
        className={classObj?.nama_kelas || 'Kelas'}
        schedules={schedules}
        classes={uniqueClasses}
        mapels={mapels}
        onClose={() => setIsPrinting(false)}
      />
    );
  }

  const selectedClassObj = uniqueClasses.find(c => c.id === selectedClass || c.nama_kelas === selectedClass);

  return (
    <AdminLayout title="Manajemen Jadwal Pelajaran">
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 text-white overflow-hidden rounded-3xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0 shadow-inner">
                  <Calendar className="w-8 h-8 text-emerald-300" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-300" /> Standar 35 Menit / Jam Pelajaran
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">Pengaturan Jadwal Pelajaran</h2>
                  <p className="text-emerald-100/80 text-sm">Kelola struktur jam pelajaran, waktu istirahat, dan pengampu kelas.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                <div className="w-full md:w-60">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-full bg-white/10 border-white/20 text-white rounded-2xl h-12 font-bold focus:ring-2 focus:ring-emerald-400">
                      <SelectValue placeholder="Pilih Rombel / Kelas" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-72">
                      {uniqueClasses.map((c, idx) => (
                        <SelectItem key={`${c.id || c.nama_kelas}_${idx}`} value={c.id || c.nama_kelas} className="font-semibold">
                          {c.nama_kelas} {c.tingkat ? `(Tingkat ${c.tingkat})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={() => setGenDialogOpen(true)}
                  className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl font-extrabold h-12 px-5 shadow-lg transition-all hover:scale-105"
                >
                  <Zap className="w-4 h-4 mr-2 text-slate-950 fill-slate-950 shrink-0" /> Auto-Grid Jam
                </Button>

                <Button 
                  onClick={() => {
                    const defaultMapel = mapels[0]?.id || '';
                    const autoTeacher = findTeacherForMapel(defaultMapel, mapels, teachers);
                    setBatchForm({
                      class_id: selectedClass || (uniqueClasses[0]?.id || ''),
                      day: 'Senin',
                      subject_id: defaultMapel,
                      teacher_name: autoTeacher,
                      hoursCount: 4,
                      startFromSlot: 1,
                      endToSlot: 4,
                    });
                    setBatchDialogOpen(true);
                  }}
                  disabled={!selectedClass}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl h-12 px-5 shadow-lg transition-all hover:scale-105"
                >
                  <Wand2 className="w-4 h-4 mr-2 text-slate-950 fill-slate-950 shrink-0" /> Pengisian Cepat Mapel (Auto-Guru)
                </Button>

                <Button 
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({ ...formData, class_id: selectedClass });
                    setIsManualTimeMode(true);
                    setDialogOpen(true);
                  }} 
                  disabled={!selectedClass} 
                  className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-extrabold h-12 px-5 shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2 shrink-0" /> Tambah Manual
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedClass ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
            <LayoutGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-bold text-lg">Silakan pilih Kelas terlebih dahulu.</p>
            <p className="text-slate-400 text-xs mt-1">Pilih rombongan belajar di atas untuk mengatur atau meninjau jadwal.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Toolbar Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold px-3 py-1 text-xs rounded-xl border-0">
                  {selectedClassObj?.nama_kelas || 'Kelas Terpilih'}
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  Total {filteredSchedules.length} slot terdaftar ({filteredSchedules.filter(s => !['istirahat', 'ishoma', 'upacara'].includes(s.subject_id)).length} Mapel)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-semibold text-xs h-10 px-3 border border-red-200"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Kosongkan / Reset
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl p-2 w-64">
                    <DropdownMenuItem 
                      onClick={() => {
                        setClearForm({ scope: 'all', day: 'Senin', mode: 'reset_mapel' });
                        setClearDialogOpen(true);
                      }} 
                      className="rounded-xl font-semibold text-xs cursor-pointer text-amber-700 focus:text-amber-800 focus:bg-amber-50 py-2.5"
                    >
                      <Eraser className="w-4 h-4 mr-2 shrink-0 text-amber-600" />
                      <div>
                        <div>Kosongkan Semua Hari</div>
                        <div className="text-[10px] text-slate-400 font-normal">Reset mapel & guru untuk Senin s/d Sabtu</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setClearForm({ scope: 'specific_day', day: 'Senin', mode: 'reset_mapel' });
                        setClearDialogOpen(true);
                      }} 
                      className="rounded-xl font-semibold text-xs cursor-pointer text-blue-700 focus:text-blue-800 focus:bg-blue-50 py-2.5"
                    >
                      <Calendar className="w-4 h-4 mr-2 shrink-0 text-blue-600" />
                      <div>
                        <div>Kosongkan Hari Terentu Saja</div>
                        <div className="text-[10px] text-slate-400 font-normal">Pilih hari tertentu yang akan dikosongkan</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setClearForm({ scope: 'all', day: 'Senin', mode: 'delete_all' });
                        setClearDialogOpen(true);
                      }} 
                      className="rounded-xl font-semibold text-xs cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 py-2.5"
                    >
                      <Trash2 className="w-4 h-4 mr-2 shrink-0 text-red-500" />
                      <div>
                        <div>Hapus Total Slot Grid</div>
                        <div className="text-[10px] text-slate-400 font-normal">Menghapus seluruh slot jam kelas ini</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  onClick={() => setIsPrinting(true)} 
                  variant="outline" 
                  className="rounded-xl font-bold h-10 px-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-2" /> Cetak Jadwal Resmi
                </Button>
              </div>
            </div>

            {/* Grid Days */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DAYS.map(day => {
                const daySchedules = filteredSchedules
                  .filter(s => s.day === day)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <Card key={day} className="border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-3xl bg-white">
                    <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-extrabold text-white uppercase tracking-wider text-xs">{day}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {daySchedules.filter(s => !['istirahat', 'istirahat_2', 'ishoma', 'upacara', 'pembiasaan'].includes(s.subject_id)).length} Jam Mapel
                        </Badge>
                        {daySchedules.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setClearForm({ scope: 'specific_day', day: day, mode: 'reset_mapel' });
                              setClearDialogOpen(true);
                            }}
                            className="h-6 px-1.5 text-[10px] text-red-300 hover:text-white hover:bg-red-600/50 rounded-lg transition-colors"
                            title={`Kosongkan Jadwal Hari ${day}`}
                          >
                            <Eraser className="w-3 h-3 mr-1" /> Kosongkan
                          </Button>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-0 divide-y divide-slate-100">
                      {(() => {
                        let autoAcademicCount = 0;
                        return daySchedules.map((s) => {
                          const isRest = ['istirahat', 'istirahat_2', 'ishoma'].includes(s.subject_id);
                          const isUpacara = s.subject_id === 'upacara';
                          const isPembiasaan = s.subject_id === 'pembiasaan';
                          const isBlank = !s.subject_id;

                          let displayPeriodLabel = '';
                          if (!isRest && !isUpacara && !isPembiasaan) {
                            autoAcademicCount++;
                            displayPeriodLabel = s.period_number ? `Jam ke-${s.period_number}` : `Jam ke-${autoAcademicCount}`;
                          } else if (isPembiasaan) {
                            displayPeriodLabel = 'Pembiasaan';
                          } else if (isUpacara) {
                            displayPeriodLabel = 'Upacara';
                          } else if (isRest) {
                            displayPeriodLabel = 'Istirahat';
                          }

                          return (
                            <div 
                              key={s.id} 
                              className={`p-3 sm:p-3.5 flex items-center justify-between group transition-colors ${
                                isRest
                                  ? 'bg-amber-50/60 hover:bg-amber-100/50' 
                                  : isUpacara
                                  ? 'bg-blue-50/60 hover:bg-blue-100/50'
                                  : isPembiasaan
                                  ? 'bg-emerald-50/70 hover:bg-emerald-100/50'
                                  : isBlank
                                  ? 'bg-slate-50/50 hover:bg-emerald-50/30'
                                  : 'hover:bg-emerald-50/30'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <div className="text-center min-w-[55px] bg-slate-100 group-hover:bg-white p-1.5 rounded-xl border border-slate-200/80 shrink-0">
                                  <div className="text-[11px] font-black text-slate-800 leading-tight">{s.start_time}</div>
                                  <div className="text-[9px] font-bold text-slate-400 leading-tight mt-0.5">{s.end_time}</div>
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {displayPeriodLabel && (
                                      <Badge className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0 rounded-md border-0 shrink-0 ${
                                        isRest 
                                          ? 'bg-amber-200/80 text-amber-900' 
                                          : isUpacara 
                                          ? 'bg-blue-200/80 text-blue-900' 
                                          : isPembiasaan 
                                          ? 'bg-emerald-200/80 text-emerald-900' 
                                          : 'bg-slate-200 text-slate-800'
                                      }`}>
                                        {displayPeriodLabel}
                                      </Badge>
                                    )}
                                    <span className={`font-bold text-xs truncate ${
                                      isRest 
                                        ? 'text-amber-800 italic font-bold' 
                                        : isUpacara 
                                        ? 'text-blue-800 font-black' 
                                        : isPembiasaan
                                        ? 'text-emerald-800 font-black'
                                        : isBlank 
                                        ? 'text-slate-400 italic font-normal' 
                                        : 'text-slate-900'
                                    }`}>
                                      {getMapelName(s.subject_id)}
                                    </span>
                                  </div>
                                  {s.teacher_name && (
                                    <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                      👨‍🏫 {s.teacher_name}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => { setEditingItem(s); setFormData(s); setIsManualTimeMode(false); setDialogOpen(true); }} 
                                  className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100 rounded-lg"
                                  title="Edit Slot Jam Pelajaran"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                {s.subject_id && !['istirahat', 'istirahat_2', 'ishoma', 'upacara', 'pembiasaan'].includes(s.subject_id) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleResetSlot(s.id)} 
                                    className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-100 rounded-lg"
                                    title="Kosongkan Mapel (Reset Slot)"
                                  >
                                    <Eraser className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDelete(s.id)} 
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-100 rounded-lg"
                                  title="Hapus Slot Jam Pelajaran"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {daySchedules.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          Belum ada jadwal untuk {day}.
                          <div className="mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setEditingItem(null);
                                setFormData({ ...formData, class_id: selectedClass, day: day });
                                setDialogOpen(true);
                              }}
                              className="text-[11px] h-8 rounded-xl font-semibold text-emerald-700 border-emerald-200"
                            >
                              <Plus className="w-3 h-3 mr-1" /> Isi Jadwal
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Auto-Generate Jam Pelajaran */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-slate-900">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" /> Auto-Generate Jam Pelajaran Dinamis
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-slate-700 text-sm">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
              💡 Membuat otomatis slot jam pelajaran (default 35 menit, 8 jam/hari) lengkap dengan Pembiasaan Religi pagi & 2 sesi istirahat.
            </div>

            {/* Section 1: Jam & Durasi Dinamis */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. Jam Pelajaran Dinamis & Durasi
                </h4>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  ⚡ Bisa 6, 8, 9, atau 10+ Jam
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Jam Mulai</label>
                  <Input 
                    type="time" 
                    value={genConfig.startTime} 
                    onChange={e => setGenConfig({...genConfig, startTime: e.target.value})} 
                    className="rounded-xl h-10 font-bold text-xs" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Durasi / Jam (m)</label>
                  <Input 
                    type="number" 
                    value={genConfig.durationMin} 
                    onChange={e => setGenConfig({...genConfig, durationMin: Number(e.target.value)})} 
                    className="rounded-xl h-10 font-bold text-xs" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Jumlah Jam Utam/Hari</label>
                  <Input 
                    type="number" 
                    value={genConfig.totalPeriods} 
                    onChange={e => setGenConfig({...genConfig, totalPeriods: Number(e.target.value)})} 
                    className="rounded-xl h-10 font-bold text-xs text-center bg-slate-50" 
                  />
                </div>
              </div>

              {/* Quick Preset Buttons for Total Periods */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Preset Jam:</span>
                {[6, 7, 8, 9, 10, 12].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGenConfig({...genConfig, totalPeriods: num})}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      genConfig.totalPeriods === num
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num} Jam
                  </button>
                ))}
              </div>

              {/* Special Friday setting */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input 
                    type="checkbox" 
                    checked={genConfig.customFridayPeriods} 
                    onChange={e => setGenConfig({...genConfig, customFridayPeriods: e.target.checked})}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>Beda Jam Khusus Hari <strong>Jumat</strong></span>
                </label>

                {genConfig.customFridayPeriods && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">Jumat:</span>
                    <Input 
                      type="number" 
                      value={genConfig.fridayPeriods} 
                      onChange={e => setGenConfig({...genConfig, fridayPeriods: Number(e.target.value)})} 
                      className="rounded-lg h-8 w-16 text-center font-bold text-xs bg-white" 
                    />
                    <span className="text-[11px] font-semibold text-slate-600">Jam</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Kegiatan Pagi */}
            <div className="space-y-2 border-t pt-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
              <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                🕌 2. Kegiatan Pagi (Upacara & Pembiasaan Religi)
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input 
                    type="checkbox" 
                    checked={genConfig.includeUpacaraSenin} 
                    onChange={e => setGenConfig({...genConfig, includeUpacaraSenin: e.target.checked})}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  🇮🇩 Upacara Senin (07:00)
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input 
                    type="checkbox" 
                    checked={genConfig.includePembiasaanReligi} 
                    onChange={e => setGenConfig({...genConfig, includePembiasaanReligi: e.target.checked})}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  🕌 Pembiasaan Religi (Selasa-Sabtu)
                </label>
              </div>

              {genConfig.includePembiasaanReligi && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Posisi Pembiasaan</label>
                    <Select value={genConfig.pembiasaanMode} onValueChange={(v: any) => setGenConfig({...genConfig, pembiasaanMode: v})}>
                      <SelectTrigger className="rounded-xl h-9 text-xs font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="slot_khusus">Slot Khusus Pagi (Sebelum Jam 1)</SelectItem>
                        <SelectItem value="jam_ke_1">Mengisi Jam Pelajaran Ke-1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {genConfig.pembiasaanMode === 'slot_khusus' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Durasi Pembiasaan (m)</label>
                      <Input 
                        type="number" 
                        value={genConfig.pembiasaanDuration} 
                        onChange={e => setGenConfig({...genConfig, pembiasaanDuration: Number(e.target.value)})} 
                        className="rounded-xl h-9 font-bold text-xs" 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Pengaturan Istirahat Dinamis */}
            <div className="space-y-2 border-t pt-3 bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                ☕ 3. Pengaturan Istirahat (2 Sesi / Dinamis)
              </h4>

              {/* Istirahat 1 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Istirahat 1 Setelah Jam Ke-</label>
                  <Input 
                    type="number" 
                    value={genConfig.break1After} 
                    onChange={e => setGenConfig({...genConfig, break1After: Number(e.target.value)})} 
                    className="rounded-xl h-9 font-bold text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Durasi Istirahat 1 (m)</label>
                  <Input 
                    type="number" 
                    value={genConfig.break1Duration} 
                    onChange={e => setGenConfig({...genConfig, break1Duration: Number(e.target.value)})} 
                    className="rounded-xl h-9 font-bold text-xs" 
                  />
                </div>
              </div>

              {/* Istirahat 2 */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900 mb-2">
                  <input 
                    type="checkbox" 
                    checked={genConfig.includeBreak2} 
                    onChange={e => setGenConfig({...genConfig, includeBreak2: e.target.checked})}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  Sertakan Istirahat Ke-2 / Ishoma (Siang)
                </label>

                {genConfig.includeBreak2 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Istirahat 2 Setelah Jam Ke-</label>
                      <Input 
                        type="number" 
                        value={genConfig.break2After} 
                        onChange={e => setGenConfig({...genConfig, break2After: Number(e.target.value)})} 
                        className="rounded-xl h-9 font-bold text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Durasi Istirahat 2 (m)</label>
                      <Input 
                        type="number" 
                        value={genConfig.break2Duration} 
                        onChange={e => setGenConfig({...genConfig, break2Duration: Number(e.target.value)})} 
                        className="rounded-xl h-9 font-bold text-xs" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-1.5 border-t pt-3">
              <label className="text-xs font-bold text-slate-600 uppercase">Terapkan Ke Target Kelas</label>
              <Select value={genConfig.applyScope} onValueChange={(v: any) => setGenConfig({...genConfig, applyScope: v})}>
                <SelectTrigger className="rounded-xl h-11 font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="selected">Kelas Terpilih Sahaja ({selectedClassObj?.nama_kelas || 'Kelas'})</SelectItem>
                  <SelectItem value="all">Semua Rombel / Kelas ({uniqueClasses.length} Kelas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-3">
              <Button variant="outline" onClick={() => setGenDialogOpen(false)} className="flex-1 rounded-2xl h-11 font-bold">
                Batal
              </Button>
              <Button onClick={handleAutoGenerate} disabled={isSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-11 font-extrabold shadow-lg">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} Generate Grid Jam
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Pengisian Cepat Mapel (Batch Auto-Guru) */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2 text-slate-900">
              <Wand2 className="w-5 h-5 text-emerald-600 shrink-0" /> Pengisian Cepat Mapel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {/* Target Kelas & Hari */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Target Kelas</label>
                <Select value={batchForm.class_id} onValueChange={(v) => setBatchForm({...batchForm, class_id: v})}>
                  <SelectTrigger className="rounded-xl h-9 font-bold text-xs"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent className="rounded-xl max-h-52">
                    {uniqueClasses.map(c => (
                      <SelectItem key={`b_cls_${c.id || c.nama_kelas}`} value={c.id || c.nama_kelas}>
                        {c.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Hari</label>
                <Select value={batchForm.day} onValueChange={(v) => setBatchForm({...batchForm, day: v})}>
                  <SelectTrigger className="rounded-xl h-9 font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mata Pelajaran */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Mata Pelajaran</label>
              <Select 
                value={batchForm.subject_id} 
                onValueChange={(val) => {
                  const autoTeacher = findTeacherForMapel(val, mapels, teachers);
                  setBatchForm({
                    ...batchForm,
                    subject_id: val,
                    teacher_name: autoTeacher
                  });
                }}
              >
                <SelectTrigger className="rounded-xl h-10 font-extrabold text-xs sm:text-sm border-slate-300">
                  <SelectValue placeholder="Pilih Mata Pelajaran" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {mapels.map(m => (
                    <SelectItem key={`b_m_${m.id}`} value={m.id} className="font-bold py-2 text-xs sm:text-sm">
                      {m.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Guru Pengampu */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> Guru Pengampu
                </label>
                {batchForm.teacher_name && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold px-1.5 py-0">
                    ✓ Match Otomatis
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                <Input 
                  value={batchForm.teacher_name} 
                  onChange={e => setBatchForm({...batchForm, teacher_name: e.target.value})} 
                  placeholder="Nama Guru Pengampu..." 
                  className="rounded-xl h-9 font-semibold text-xs bg-white flex-1" 
                />
                
                {teachers.length > 0 && (
                  <Select 
                    onValueChange={(teacherName) => setBatchForm({...batchForm, teacher_name: teacherName})}
                  >
                    <SelectTrigger className="w-32 sm:w-36 rounded-xl h-9 text-xs font-semibold bg-white shrink-0">
                      <SelectValue placeholder="Pilih Guru..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-52">
                      {teachers.map((t: any, idx: number) => (
                        <SelectItem key={`t_opt_${t.id || idx}`} value={t.nama || ''} className="text-xs">
                          {t.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Jumlah Jam & Alokasi Slot dalam Grid Compact */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Alokasi Jam Pelajaran
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Jumlah:</span>
                  <Input 
                    type="number" 
                    min={1} 
                    max={12} 
                    value={batchForm.hoursCount} 
                    onChange={e => {
                      const hCount = Math.max(1, Number(e.target.value));
                      const startNum = batchForm.startFromSlot === 'next_empty' ? 1 : Number(batchForm.startFromSlot);
                      setBatchForm({
                        ...batchForm,
                        hoursCount: hCount,
                        endToSlot: batchForm.endToSlot === 'auto' ? 'auto' : startNum + hCount - 1
                      });
                    }} 
                    className="rounded-lg h-7 w-14 text-center font-black text-xs bg-white" 
                  />
                  <span className="text-xs font-bold text-emerald-700">Jam</span>
                </div>
              </div>

              {/* Quick Preset Buttons (1 - 6) */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={`h_${num}`}
                    type="button"
                    onClick={() => {
                      const startNum = batchForm.startFromSlot === 'next_empty' ? 1 : Number(batchForm.startFromSlot);
                      setBatchForm({
                        ...batchForm,
                        hoursCount: num,
                        endToSlot: batchForm.endToSlot === 'auto' ? 'auto' : startNum + num - 1
                      });
                    }}
                    className={`flex-1 h-8 text-xs font-extrabold rounded-lg border transition-all active:scale-95 ${
                      batchForm.hoursCount === num
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num} J
                  </button>
                ))}
              </div>

              {/* Mulai Dari & Sampai Ke */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mulai Dari Slot</label>
                  <Select 
                    value={String(batchForm.startFromSlot)} 
                    onValueChange={(v) => {
                      if (v === 'next_empty') {
                        setBatchForm({
                          ...batchForm,
                          startFromSlot: 'next_empty',
                          endToSlot: 'auto'
                        });
                      } else {
                        const startNum = Number(v);
                        const currentEnd = batchForm.endToSlot === 'auto' ? startNum + batchForm.hoursCount - 1 : Number(batchForm.endToSlot);
                        const newEnd = currentEnd >= startNum ? currentEnd : startNum;
                        setBatchForm({
                          ...batchForm,
                          startFromSlot: startNum,
                          endToSlot: newEnd,
                          hoursCount: Math.max(1, newEnd - startNum + 1)
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-lg h-8 font-semibold text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="next_empty">✨ Slot Kosong Pertama</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={`start_slot_${n}`} value={String(n)}>Jam Ke-{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Sampai Slot Ke</label>
                  <Select 
                    value={String(batchForm.endToSlot)} 
                    onValueChange={(v) => {
                      if (v === 'auto') {
                        setBatchForm({
                          ...batchForm,
                          endToSlot: 'auto'
                        });
                      } else {
                        const endNum = Number(v);
                        const startNum = batchForm.startFromSlot === 'next_empty' ? 1 : Number(batchForm.startFromSlot);
                        const newStart = endNum >= startNum ? startNum : endNum;
                        setBatchForm({
                          ...batchForm,
                          startFromSlot: batchForm.startFromSlot === 'next_empty' ? 'next_empty' : newStart,
                          endToSlot: endNum,
                          hoursCount: Math.max(1, endNum - newStart + 1)
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-lg h-8 font-semibold text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="auto">⚡ Otomatis ({batchForm.hoursCount} Jam)</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={`end_slot_${n}`} value={String(n)}>Jam Ke-{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Summary preview */}
            {batchForm.subject_id && (
              <div className="px-3 py-2 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Isi <strong>{batchForm.hoursCount} Jam</strong> untuk <strong>{getMapelName(batchForm.subject_id)}</strong> ({batchForm.teacher_name || 'Tanpa Guru'}) pada <strong>Hari {batchForm.day}</strong>
                  {batchForm.startFromSlot !== 'next_empty' && batchForm.endToSlot !== 'auto' ? ` (Jam Ke-${batchForm.startFromSlot} s/d Jam Ke-${batchForm.endToSlot})` : ''}.
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)} className="flex-1 rounded-xl h-10 font-bold text-slate-700 text-xs">
                Batal
              </Button>
              <Button onClick={handleApplyBatchMapel} disabled={isSaving || !batchForm.subject_id} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 font-extrabold shadow-md text-xs">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Wand2 className="w-4 h-4 mr-1.5" />} Terapkan {batchForm.hoursCount} Jam
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Prompt Kosongkan Jadwal */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Eraser className="w-5 h-5 text-red-600" />
              Kosongkan Jadwal Pelajaran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Konfirmasi pengosongan jadwal untuk <strong className="text-slate-800">{selectedClassObj?.nama_kelas || 'Kelas Terpilih'}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Pilihan Cakupan Hari */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Mau kosongkan semua atau hari tertentu saja?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClearForm({ ...clearForm, scope: 'all' })}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    clearForm.scope === 'all'
                      ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-300 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-red-600" /> Semua Hari
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-normal">
                    Senin s/d Sabtu
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setClearForm({ ...clearForm, scope: 'specific_day' })}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    clearForm.scope === 'specific_day'
                      ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-300 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" /> Hari Terentu Saja
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-normal">
                    Pilih 1 hari tertentu
                  </div>
                </button>
              </div>
            </div>

            {/* Dropdown Hari jika specific_day */}
            {clearForm.scope === 'specific_day' && (
              <div className="space-y-1.5 bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 animate-in fade-in">
                <label className="text-xs font-bold text-amber-900 uppercase">Pilih Hari Terentu</label>
                <Select value={clearForm.day} onValueChange={(v) => setClearForm({ ...clearForm, day: v })}>
                  <SelectTrigger className="rounded-xl h-11 bg-white border-amber-300 font-bold text-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DAYS.map(d => (
                      <SelectItem key={`clear_day_opt_${d}`} value={d} className="font-semibold">
                        Hari {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pilihan Metode Pengosongan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Metode Pengosongan
              </label>
              <Select value={clearForm.mode} onValueChange={(v: any) => setClearForm({ ...clearForm, mode: v })}>
                <SelectTrigger className="rounded-xl h-11 font-semibold text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="reset_mapel">⭕ Reset Mapel & Guru (Grid Jam Tetap Tersimpan)</SelectItem>
                  <SelectItem value="delete_all">🗑️ Hapus Total Grid Slot Jam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alert Summary Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Pemberitahuan:</span>
                {clearForm.mode === 'reset_mapel' ? (
                  <span>
                    Akan mengosongkan semua mata pelajaran & guru pada {clearForm.scope === 'all' ? <strong>SEMUA HARI (Senin - Sabtu)</strong> : <strong>HARI {clearForm.day.toUpperCase()}</strong>} untuk {selectedClassObj?.nama_kelas}. Slot jam pelajaran tetap tersimpan.
                  </span>
                ) : (
                  <span>
                    Akan <strong>MENGHAPUS TOTAL</strong> seluruh slot jam pelajaran pada {clearForm.scope === 'all' ? <strong>SEMUA HARI (Senin - Sabtu)</strong> : <strong>HARI {clearForm.day.toUpperCase()}</strong>} untuk {selectedClassObj?.nama_kelas}.
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
              <Button variant="outline" onClick={() => setClearDialogOpen(false)} className="w-full sm:flex-1 rounded-2xl h-11 font-bold text-slate-700">
                Batal
              </Button>
              <Button onClick={handleExecuteClear} disabled={isSaving} className="w-full sm:flex-1 bg-red-600 hover:bg-red-500 text-white rounded-2xl h-11 font-extrabold shadow-md text-sm">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eraser className="w-4 h-4 mr-2" />} Kosongkan Sekarang
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Edit / Tambah Manual */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              {editingItem ? 'Edit Jam Pelajaran' : 'Tambah Jam Pelajaran Manual'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Target Rombel / Kelas</label>
              <Select 
                value={formData.class_id} 
                onValueChange={(v) => {
                  if (formData.period_number) {
                    const timeRes = getTimeForPeriod(formData.day, v, formData.period_number, schedules);
                    setFormData({ ...formData, class_id: v, start_time: timeRes.start_time, end_time: timeRes.end_time });
                  } else {
                    setFormData({ ...formData, class_id: v });
                  }
                }}
              >
                <SelectTrigger className="rounded-2xl h-12 font-bold"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent className="rounded-2xl max-h-60">
                  {uniqueClasses.map((c, idx) => (
                    <SelectItem key={`${c.id || c.nama_kelas}_mod_${idx}`} value={c.id || c.nama_kelas}>
                      {c.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Hari</label>
                <Select 
                  value={formData.day} 
                  onValueChange={(v) => {
                    if (formData.period_number) {
                      const timeRes = getTimeForPeriod(v, formData.class_id, formData.period_number, schedules);
                      setFormData({ ...formData, day: v, start_time: timeRes.start_time, end_time: timeRes.end_time });
                    } else {
                      setFormData({ ...formData, day: v });
                    }
                  }}
                >
                  <SelectTrigger className="rounded-2xl h-12 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Jam Ke- (Urutan Slot)</label>
                <Select 
                  value={formData.period_number ? String(formData.period_number) : 'none'} 
                  onValueChange={(v) => {
                    if (v === 'none') {
                      setFormData({ ...formData, period_number: undefined });
                    } else {
                      const num = Number(v);
                      const timeRes = getTimeForPeriod(formData.day, formData.class_id, num, schedules);
                      setFormData({
                        ...formData,
                        period_number: num,
                        start_time: timeRes.start_time,
                        end_time: timeRes.end_time
                      });
                    }
                  }}
                >
                  <SelectTrigger className="rounded-2xl h-12 font-bold text-sm"><SelectValue placeholder="Pilih Jam Ke-" /></SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-56">
                    <SelectItem value="none" className="font-semibold text-slate-500">Non-Mapel / Khusus</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <SelectItem key={`p_select_${n}`} value={String(n)} className="font-bold">
                        Jam Ke-{n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Mata Pelajaran</label>
              <Select 
                value={formData.subject_id || 'empty'} 
                onValueChange={(v) => {
                  if (v === 'empty') {
                    setFormData({
                      ...formData,
                      subject_id: '',
                      teacher_name: ''
                    });
                  } else {
                    const autoTeacher = findTeacherForMapel(v, mapels, teachers);
                    setFormData({
                      ...formData, 
                      subject_id: v,
                      teacher_name: autoTeacher || formData.teacher_name || ''
                    });
                  }
                }}
              >
                <SelectTrigger className="rounded-2xl h-12 font-bold"><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                <SelectContent className="rounded-2xl max-h-60">
                  <SelectItem value="empty" className="font-semibold text-slate-500 italic">⭕ (Kosongkan Mapel / Belum Diisi)</SelectItem>
                  <SelectItem value="pembiasaan" className="font-bold text-emerald-700">🕌 PEMBIASAAN RELIGI</SelectItem>
                  <SelectItem value="upacara" className="font-bold text-blue-600">🇮🇩 UPACARA BENDERA</SelectItem>
                  <SelectItem value="istirahat" className="font-bold text-amber-600">☕ ISTIRAHAT 1</SelectItem>
                  <SelectItem value="istirahat_2" className="font-bold text-amber-600">☕ ISTIRAHAT 2</SelectItem>
                  <SelectItem value="ishoma" className="font-bold text-amber-700">🍱 ISHOMA</SelectItem>
                  {mapels.map(m => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!isManualTimeMode ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800">
                      Waktu Slot: {formData.start_time || '07:00'} - {formData.end_time || '07:35'}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {formData.period_number ? `Jam Pelajaran Ke-${formData.period_number}` : 'Otomatis Sesuai Grid Jam'}
                    </div>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsManualTimeMode(true)}
                  className="text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl h-8 px-2.5 shrink-0"
                >
                  <Pencil className="w-3 h-3 mr-1" /> Ubah Jam
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5 p-3 bg-amber-50/50 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Waktu Manual Jam Pelajaran</label>
                  {editingItem && (
                    <button 
                      type="button" 
                      onClick={() => setIsManualTimeMode(false)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      ✓ Gunakan Waktu Otomatis Slot
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Jam Mulai</label>
                    <Input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="rounded-xl h-10 font-bold text-sm bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Jam Selesai</label>
                    <Input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="rounded-xl h-10 font-bold text-sm bg-white" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 uppercase">Nama Guru Pengampu</label>
                {formData.teacher_name && (
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input value={formData.teacher_name} onChange={e => setFormData({...formData, teacher_name: e.target.value})} placeholder="Contoh: Ahmad Subagyo, S.Pd." className="rounded-2xl h-12 font-semibold flex-1" />
                {teachers.length > 0 && (
                  <Select onValueChange={(tName) => setFormData({...formData, teacher_name: tName})}>
                    <SelectTrigger className="w-28 rounded-2xl h-12 text-xs font-bold"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-52">
                      {teachers.map((t: any, idx: number) => (
                        <SelectItem key={`s_t_${t.id || idx}`} value={t.nama || ''}>
                          {t.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-2xl h-12 font-bold">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-12 font-extrabold shadow-md">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default JadwalPelajaranAdmin;