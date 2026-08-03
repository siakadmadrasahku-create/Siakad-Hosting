import { supabase } from '@/integrations/supabase/client';
import { archiveAndRotateStudentRombel } from './studentRombelHistory';

export interface SyncResult {
  success: boolean;
  studentsUpdatedCount: number;
  classesUpdatedCount: number;
  activeAcademicYear: string;
  error?: string;
}

const STORAGE_KEYS_STUDENTS = ['students_list', 'siakad_students_data', 'site_students', 'app_students_v2', 'students_data', 'madrasah_students'];
const STORAGE_KEYS_CLASSES = ['kelas_list', 'siakad_classes_data', 'siakad_rombel_classes', 'site_classes', 'app_classes', 'classes_data', 'madrasah_classes'];
const LOCAL_CACHE_STUDENTS = 'siakad_students_cache';
const LOCAL_CACHE_CLASSES = 'siakad_classes_cache';

/**
 * Synchronizes all active student records and rombel classes to the target active academic year.
 * @param targetAcademicYear The academic year to set for active students and classes (e.g. "2025/2026")
 * @param activeMadrasahId Optional madrasah ID for scoping storage keys
 */
export async function syncDataToAcademicYear(
  targetAcademicYear: string,
  activeMadrasahId: string = 'madrasah_default'
): Promise<SyncResult> {
  if (!targetAcademicYear || !targetAcademicYear.trim()) {
    return {
      success: false,
      studentsUpdatedCount: 0,
      classesUpdatedCount: 0,
      activeAcademicYear: targetAcademicYear,
      error: 'Tahun pelajaran tidak valid'
    };
  }

  const activeYear = targetAcademicYear.trim();

  try {
    // 1. Fetch current student list from Supabase / localStorage
    const scopedStudentsKey = `students_list_${activeMadrasahId}`;
    const allStudentKeys = Array.from(new Set([
      scopedStudentsKey,
      'students_list',
      ...STORAGE_KEYS_STUDENTS
    ]));

    let currentStudents: any[] = [];
    const { data: studentRows } = await supabase
      .from('site_settings')
      .select('id, value')
      .in('id', allStudentKeys);

    if (studentRows && studentRows.length > 0) {
      for (const r of studentRows) {
        if (Array.isArray(r.value) && r.value.length > 0) {
          currentStudents = r.value;
          break;
        }
      }
    }

    if (currentStudents.length === 0) {
      const cached = localStorage.getItem(LOCAL_CACHE_STUDENTS) || localStorage.getItem('students_list');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) currentStudents = parsed;
        } catch (e) {
          console.warn('Error parsing cached students:', e);
        }
      }
    }

    // Update active students' academic year and archive previous rombel history
    let studentsUpdatedCount = 0;
    const updatedStudents = currentStudents.map((s: any) => {
      const status = (s.status || 'active').toLowerCase().trim();
      const isGraduatedOrInactive = status === 'graduated' || status === 'lulus' || status === 'alumni' || status === 'moved' || status === 'dropped';
      
      const oldYear = s.tahun_pelajaran || '2024/2025';

      if (!isGraduatedOrInactive) {
        if (s.tahun_pelajaran !== activeYear) {
          studentsUpdatedCount++;
          // Archive old year rombel and prepare a clean assignment slot for the new active year.
          // This keeps rombel data isolated per tahun pelajaran instead of carrying old assignments forward.
          return archiveAndRotateStudentRombel(s, oldYear, activeYear, true);
        }
      }
      return s;
    });

    // Save updated students list
    if (updatedStudents.length > 0) {
      const now = new Date().toISOString();
      try { localStorage.setItem(LOCAL_CACHE_STUDENTS, JSON.stringify(updatedStudents)); } catch (err) { void err; }
      try { localStorage.setItem('students_list', JSON.stringify(updatedStudents)); } catch (err) { void err; }
      try { localStorage.setItem(scopedStudentsKey, JSON.stringify(updatedStudents)); } catch (err) { void err; }

      for (const key of allStudentKeys) {
        try {
          try { localStorage.setItem(key, JSON.stringify(updatedStudents)); } catch (err) { void err; }
          await supabase.from('site_settings').upsert({
            id: key,
            value: updatedStudents,
            updated_at: now
          });
        } catch (e) {
          console.warn(`Failed to save student key ${key}:`, e);
        }
      }
    }

    // 2. Fetch current classes list
    const scopedClassesKey = `kelas_list_${activeMadrasahId}`;
    const allClassKeys = Array.from(new Set([
      scopedClassesKey,
      'kelas_list',
      ...STORAGE_KEYS_CLASSES
    ]));

    let currentClasses: any[] = [];
    const { data: classRows } = await supabase
      .from('site_settings')
      .select('id, value')
      .in('id', allClassKeys);

    if (classRows && classRows.length > 0) {
      for (const r of classRows) {
        if (Array.isArray(r.value) && r.value.length > 0) {
          currentClasses = r.value;
          break;
        }
      }
    }

    if (currentClasses.length === 0) {
      const cached = localStorage.getItem(LOCAL_CACHE_CLASSES) || localStorage.getItem('kelas_list');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) currentClasses = parsed;
        } catch (e) {
          console.warn('Error parsing cached classes:', e);
        }
      }
    }

    // Update classes to ensure target academic year has its own isolated rombel records
    let classesUpdatedCount = 0;
    let updatedClasses = [...currentClasses];
    const existingTargetClasses = currentClasses.filter((c: any) => c.tahun_pelajaran === activeYear);

    if (existingTargetClasses.length === 0 && currentClasses.length > 0) {
      // Find classes from previous academic year to copy
      const recentYearClasses = currentClasses.filter((c: any) => c.tahun_pelajaran && c.tahun_pelajaran !== activeYear);
      const sourceClasses = recentYearClasses.length > 0 ? recentYearClasses : currentClasses;

      // De-duplicate source classes by name
      const uniqueSourceMap = new Map<string, any>();
      sourceClasses.forEach((c: any) => {
        const key = (c.nama_kelas || '').trim().toLowerCase();
        if (key && !uniqueSourceMap.has(key)) {
          uniqueSourceMap.set(key, c);
        }
      });

      const copiedClasses = Array.from(uniqueSourceMap.values()).map((c: any, idx: number) => ({
        ...c,
        id: `c_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        tahun_pelajaran: activeYear,
        created_at: new Date().toISOString()
      }));

      updatedClasses = [...currentClasses, ...copiedClasses];
      classesUpdatedCount = copiedClasses.length;
    }

    if (updatedClasses.length > 0) {
      const now = new Date().toISOString();
      try { localStorage.setItem(LOCAL_CACHE_CLASSES, JSON.stringify(updatedClasses)); } catch (err) { void err; }
      try { localStorage.setItem('kelas_list', JSON.stringify(updatedClasses)); } catch (err) { void err; }
      try { localStorage.setItem(scopedClassesKey, JSON.stringify(updatedClasses)); } catch (err) { void err; }

      for (const key of allClassKeys) {
        try {
          try { localStorage.setItem(key, JSON.stringify(updatedClasses)); } catch (err) { void err; }
          await supabase.from('site_settings').upsert({
            id: key,
            value: updatedClasses,
            updated_at: now
          });
        } catch (e) {
          console.warn(`Failed to save class key ${key}:`, e);
        }
      }
    }

    // Dispatch global events to notify all UI components
    window.dispatchEvent(new CustomEvent('siakad_direktori_updated'));
    window.dispatchEvent(new CustomEvent('siakad_classes_updated'));
    window.dispatchEvent(new CustomEvent('students_data_updated', { detail: { students: updatedStudents } }));

    return {
      success: true,
      studentsUpdatedCount,
      classesUpdatedCount,
      activeAcademicYear: activeYear
    };
  } catch (err: any) {
    console.error('Failed to sync data to academic year:', err);
    return {
      success: false,
      studentsUpdatedCount: 0,
      classesUpdatedCount: 0,
      activeAcademicYear: activeYear,
      error: err.message || 'Gagal melakukan sinkronisasi data'
    };
  }
}
