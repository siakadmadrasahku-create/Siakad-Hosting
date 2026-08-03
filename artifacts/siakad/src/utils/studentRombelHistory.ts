export interface RombelHistoryItem {
  tahun_pelajaran: string;
  rombel: string;
  class_id?: string;
  status?: 'active' | 'graduated' | 'moved' | 'dropped' | string;
  updated_at?: string;
}

export interface StudentWithHistory {
  id: string;
  name: string;
  status?: string;
  tahun_pelajaran?: string;
  rombel?: string;
  kelas?: string;
  tingkat_rombel?: string;
  class_id?: string;
  riwayat_rombel?: RombelHistoryItem[];
  [key: string]: any;
}

/**
 * Retrieves student rombel assignment and status for a specific academic year.
 */
export function getStudentRombelForYear(student: StudentWithHistory, year: string): {
  rombel: string;
  class_id: string;
  status: string;
} {
  if (!student) return { rombel: '', class_id: '', status: 'active' };

  const history = Array.isArray(student.riwayat_rombel) ? student.riwayat_rombel : [];
  const historyMatch = history.find(h => h && h.tahun_pelajaran === year);

  if (historyMatch && historyMatch.rombel !== undefined) {
    return {
      rombel: historyMatch.rombel || '',
      class_id: historyMatch.class_id || '',
      status: historyMatch.status || student.status || 'active'
    };
  }

  // Fallback if student's primary academic year matches
  const currentRombel = student.rombel || student.kelas || student.tingkat_rombel || '';

  if (student.tahun_pelajaran === year) {
    return {
      rombel: currentRombel,
      class_id: student.class_id || '',
      status: student.status || 'active'
    };
  }

  // If no historical entry exists for previous years, but student has primary rombel and no history at all,
  // ensure we return empty for years that aren't the student's active year if history has other entries.
  if (history.length > 0) {
    // If student has a history entry for a LATER year (e.g. 2026/2027), but NO entry for `year` (e.g. 2025/2026),
    // check if student's root rombel was originally set in this year or if they have no earlier entry
    const hasLaterYear = history.some(h => h && h.tahun_pelajaran && h.tahun_pelajaran > year);
    if (!hasLaterYear) {
      return { rombel: '', class_id: '', status: student.status || 'active' };
    }
    // If student has a later year entry, they were promoted. If student's root fields or created_at match or if we fall back to initial fields:
    if (student.tahun_pelajaran === year) {
      return {
        rombel: currentRombel,
        class_id: student.class_id || '',
        status: student.status || 'active'
      };
    }
    return { rombel: '', class_id: '', status: student.status || 'active' };
  }

  // If student has no history array at all yet, fallback to current rombel if year is empty or matches
  if (!student.tahun_pelajaran || student.tahun_pelajaran === year) {
    return {
      rombel: currentRombel,
      class_id: student.class_id || '',
      status: student.status || 'active'
    };
  }

  return { rombel: '', class_id: '', status: student.status || 'active' };
}

/**
 * Updates or appends a student's rombel assignment for a specific academic year in riwayat_rombel.
 */
export function setStudentRombelForYear(
  student: StudentWithHistory,
  year: string,
  rombelName: string,
  classId?: string,
  status?: string,
  isCurrentActiveYear: boolean = true
): StudentWithHistory {
  if (!student || !year) return student;

  const currentHistory = Array.isArray(student.riwayat_rombel) ? [...student.riwayat_rombel] : [];
  const existingIdx = currentHistory.findIndex(h => h && h.tahun_pelajaran === year);

  const updatedItem: RombelHistoryItem = {
    tahun_pelajaran: year,
    rombel: rombelName || '',
    class_id: classId || '',
    status: status || student.status || 'active',
    updated_at: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    currentHistory[existingIdx] = updatedItem;
  } else {
    currentHistory.push(updatedItem);
  }

  const updatedStudent: StudentWithHistory = {
    ...student,
    riwayat_rombel: currentHistory
  };

  if (isCurrentActiveYear || student.tahun_pelajaran === year || !student.tahun_pelajaran) {
    updatedStudent.tahun_pelajaran = year;
    updatedStudent.rombel = rombelName || '';
    updatedStudent.kelas = rombelName || '';
    updatedStudent.tingkat_rombel = rombelName || '';
    updatedStudent.class_id = classId || '';
    if (status) updatedStudent.status = status;
  }

  return updatedStudent;
}

/**
 * Ensures student current rombel is safely archived for oldYear,
 * and sets up/restores rombel for newYear.
 */
export function archiveAndRotateStudentRombel(
  student: StudentWithHistory,
  oldYear: string,
  newYear: string,
  autoUnassignInNewYear: boolean = false
): StudentWithHistory {
  if (!student) return student;

  const currentRombel = student.rombel || student.kelas || student.tingkat_rombel || '';
  const currentClassId = student.class_id || '';
  const currentStatus = student.status || 'active';

  // 1. Ensure old year rombel is recorded in history
  let studentWithOldArchived = setStudentRombelForYear(
    student,
    oldYear,
    currentRombel,
    currentClassId,
    currentStatus,
    false
  );

  // 2. Look for new year record in riwayat_rombel
  const history = Array.isArray(studentWithOldArchived.riwayat_rombel) ? studentWithOldArchived.riwayat_rombel : [];
  const newYearRecord = history.find(h => h && h.tahun_pelajaran === newYear);

  if (newYearRecord) {
    studentWithOldArchived.tahun_pelajaran = newYear;
    studentWithOldArchived.rombel = newYearRecord.rombel || '';
    studentWithOldArchived.kelas = newYearRecord.rombel || '';
    studentWithOldArchived.tingkat_rombel = newYearRecord.rombel || '';
    studentWithOldArchived.class_id = newYearRecord.class_id || '';
  } else {
    studentWithOldArchived.tahun_pelajaran = newYear;
    if (autoUnassignInNewYear) {
      studentWithOldArchived.rombel = '';
      studentWithOldArchived.kelas = '';
      studentWithOldArchived.tingkat_rombel = '';
      studentWithOldArchived.class_id = '';
      
      // Add initial record in history for newYear as unassigned
      studentWithOldArchived = setStudentRombelForYear(
        studentWithOldArchived,
        newYear,
        '',
        '',
        currentStatus,
        true
      );
    } else {
      // Retain current rombel into new year history
      studentWithOldArchived = setStudentRombelForYear(
        studentWithOldArchived,
        newYear,
        currentRombel,
        currentClassId,
        currentStatus,
        true
      );
    }
  }

  return studentWithOldArchived;
}

/**
 * Promotes a student from sourceYear to targetYear.
 * Guarantees that the student's assignment for sourceYear is preserved in riwayat_rombel
 * (so viewing sourceYear will still show their original class e.g. Kelas 5),
 * while assigning them to targetClass (e.g. Kelas 6) for targetYear!
 */
export function promoteStudentToYear(
  student: StudentWithHistory,
  sourceYear: string,
  targetYear: string,
  targetRombelName: string,
  targetClassId?: string,
  status: string = 'active',
  isTargetActiveSystemYear: boolean = true
): StudentWithHistory {
  if (!student) return student;

  // 1. Get current snapshot/assignment for sourceYear
  const sourceSnapshot = getStudentRombelForYear(student, sourceYear);
  const sourceRombelName = sourceSnapshot.rombel || student.rombel || student.kelas || student.tingkat_rombel || '';
  const sourceClassId = sourceSnapshot.class_id || student.class_id || '';
  const sourceStatus = sourceSnapshot.status || student.status || 'active';

  // 2. Archive sourceYear assignment FIRST into riwayat_rombel (without changing active root fields to source year)
  let updatedStudent = setStudentRombelForYear(
    student,
    sourceYear,
    sourceRombelName,
    sourceClassId,
    sourceStatus,
    false
  );

  // 3. Record targetYear assignment into riwayat_rombel and update active root fields if target is active year
  updatedStudent = setStudentRombelForYear(
    updatedStudent,
    targetYear,
    targetRombelName,
    targetClassId,
    status,
    isTargetActiveSystemYear
  );

  return updatedStudent;
}
