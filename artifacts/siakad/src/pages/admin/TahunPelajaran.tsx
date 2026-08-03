"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Save, Calendar, GraduationCap, Users, Info, Plus, Archive, Printer, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { syncDataToAcademicYear } from '@/utils/academicYearSync';

const TahunPelajaran = () => {
  const navigate = useNavigate();
  const { settings, refreshSettings } = useSiteSettings();
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [addYearDialogOpen, setAddYearDialogOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [formData, setFormData] = useState({
    active_year: '2024/2025',
    spmb_year: '2025/2026',
    semester: 'Ganjil'
  });

  useEffect(() => {
    if (settings.tahun_pelajaran) {
      setFormData(settings.tahun_pelajaran);
    }
  }, [settings]);

  const handleAddAcademicYear = async () => {
    if (!newYear.trim()) {
      showError('Tahun pelajaran tidak boleh kosong');
      return;
    }

    // Validate format (should be like "2024/2025")
    const yearPattern = /^\d{4}\/\d{4}$/;
    if (!yearPattern.test(newYear.trim())) {
      showError('Format tahun pelajaran harus YYYY/YYYY (contoh: 2024/2025)');
      return;
    }

    try {
      const currentTahunPelajaran = settings.tahun_pelajaran || {};
      const availableYears = currentTahunPelajaran.available_years || [];

      if (availableYears.includes(newYear.trim())) {
        showError('Tahun pelajaran sudah ada');
        return;
      }

      const updatedTahunPelajaran = {
        ...currentTahunPelajaran,
        available_years: [...availableYears, newYear.trim()].sort().reverse() // Sort descending
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'tahun_pelajaran', value: updatedTahunPelajaran });

      if (error) throw error;

      await refreshSettings();
      showSuccess(`Tahun pelajaran ${newYear} berhasil ditambahkan`);
      setNewYear('');
      setAddYearDialogOpen(false);
    } catch (err) {
      showError('Gagal menambahkan tahun pelajaran');
    }
  };

  const handleSaveCheck = async () => {
    const currentTP = settings.tahun_pelajaran || {};
    const yearChanged = currentTP.active_year && currentTP.active_year !== formData.active_year;
    const semesterChanged = currentTP.semester && currentTP.semester !== formData.semester;

    if (yearChanged || semesterChanged) {
      setArchiveConfirmOpen(true);
    } else {
      await executeSave(false);
    }
  };

  const executeSave = async (shouldArchiveFirst: boolean = false) => {
    setLoading(true);
    try {
      const currentTahunPelajaran = settings.tahun_pelajaran || {};
      const oldYear = currentTahunPelajaran.active_year || '2024/2025';
      const oldSemester = currentTahunPelajaran.semester || 'Ganjil';

      if (shouldArchiveFirst) {
        setArchiving(true);
        // Take snapshot of current data before updating
        const { data: allSettings } = await supabase.from('site_settings').select('*');
        const getSettingVal = (id: string, fallback: any = []) => {
          const found = allSettings?.find(s => s.id === id);
          return found?.value ?? fallback;
        };

        const students = getSettingVal('students_list', []);
        const classes = getSettingVal('classes_list', []);
        const mapels = getSettingVal('mapel_list', []);
        const schedules = getSettingVal('schedules_list', []);
        const nilai = getSettingVal('nilai_list', []);
        const absensi = getSettingVal('absensi_list', []);
        const spmb = getSettingVal('pendaftaran_spmb_list', []);
        const finance = getSettingVal('spp_transactions', []);

        const existingArchivesRes = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'academic_archives')
          .maybeSingle();

        const existingArchives = Array.isArray(existingArchivesRes.data?.value) 
          ? existingArchivesRes.data.value 
          : [];

        const autoArchive = {
          id: `archive_${Date.now()}`,
          academic_year: oldYear,
          semester: oldSemester,
          archived_at: new Date().toISOString(),
          archived_by: localStorage.getItem('siakad_current_user_email') || 'Admin',
          note: `Arsip Otomatis Pergantian ke ${formData.active_year} - ${formData.semester}`,
          summary: {
            student_count: Array.isArray(students) ? students.length : 0,
            class_count: Array.isArray(classes) ? classes.length : 0,
            mapel_count: Array.isArray(mapels) ? mapels.length : 0,
            nilai_count: Array.isArray(nilai) ? nilai.length : 0,
            spmb_count: Array.isArray(spmb) ? spmb.length : 0,
            financial_count: Array.isArray(finance) ? finance.length : 0,
          },
          data: {
            students: Array.isArray(students) ? students : [],
            classes: Array.isArray(classes) ? classes : [],
            schedules: Array.isArray(schedules) ? schedules : [],
            mapels: Array.isArray(mapels) ? mapels : [],
            nilai: Array.isArray(nilai) ? nilai : [],
            absensi: Array.isArray(absensi) ? absensi : [],
            spmb: Array.isArray(spmb) ? spmb : [],
            finance: Array.isArray(finance) ? finance : [],
            settings_snapshot: {
              identitas: settings.identitas_madrasah,
              penandatangan: settings.penandatangan
            }
          }
        };

        const updatedArchives = [
          autoArchive,
          ...existingArchives.filter((a: any) => !(a.academic_year === oldYear && a.semester === oldSemester))
        ];

        await supabase.from('site_settings').upsert({
          id: 'academic_archives',
          value: updatedArchives,
          updated_at: new Date().toISOString()
        });

        showSuccess(`Arsip data ${oldYear} Semester ${oldSemester} berhasil disimpan!`);
        setArchiving(false);
      }

      // Update academic year settings
      const updatedTahunPelajaran = {
        ...currentTahunPelajaran,
        ...formData,
        available_years: currentTahunPelajaran.available_years || [formData.active_year]
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'tahun_pelajaran', 
          value: updatedTahunPelajaran, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;

      // Synchronize active students & rombel classes to newly activated year
      const syncRes = await syncDataToAcademicYear(formData.active_year);

      await refreshSettings();
      window.dispatchEvent(new CustomEvent('siakad_settings_updated'));
      window.dispatchEvent(new CustomEvent('siakad_direktori_updated'));
      window.dispatchEvent(new CustomEvent('siakad_classes_updated'));
      
      if (syncRes.success) {
        showSuccess(`Tahun pelajaran ${formData.active_year} diaktifkan! ${syncRes.studentsUpdatedCount} siswa & ${syncRes.classesUpdatedCount} rombel disinkronkan.`);
      } else {
        showSuccess(`Tahun pelajaran ${formData.active_year} berhasil diperbarui!`);
      }
      setArchiveConfirmOpen(false);
    } catch (error: any) {
      showError(error.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
      setArchiving(false);
    }
  };

  return (
    <AdminLayout title="Manajemen Tahun Pelajaran">
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-500">Kelola tahun pelajaran aktif untuk sistem akademik dan pendaftaran siswa baru.</p>
          <Button onClick={handleSaveCheck} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold">
            <Save className="w-4 h-4 mr-2" />
            Simpan Perubahan
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tahun Pelajaran Aktif */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                Akademik Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                <p className="text-xs text-emerald-700 leading-relaxed">
                  <Info className="w-3 h-3 inline mr-1 mb-0.5" />
                  Tahun ini digunakan untuk modul Kurikulum, Bank Soal, dan Materi Pembelajaran.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Pelajaran</label>
                <div className="flex gap-2">
                  <Select
                    value={formData.active_year}
                    onValueChange={(v) => setFormData({...formData, active_year: v})}
                  >
                    <SelectTrigger className="rounded-xl flex-1">
                      <SelectValue placeholder="Pilih Tahun Pelajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {(settings.tahun_pelajaran?.available_years || [formData.active_year]).map((year: string) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddYearDialogOpen(true)}
                    className="rounded-xl px-3"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                <Select 
                  value={formData.semester} 
                  onValueChange={(v) => setFormData({...formData, semester: v})}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ganjil">Ganjil</SelectItem>
                    <SelectItem value="Genap">Genap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tahun Pelajaran SPMB */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                Penerimaan (SPMB)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <Info className="w-3 h-3 inline mr-1 mb-0.5" />
                  Tahun ini digunakan khusus untuk formulir pendaftaran siswa baru.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Pelajaran SPMB</label>
                <Input 
                  placeholder="Contoh: 2025/2026" 
                  value={formData.spmb_year}
                  onChange={(e) => setFormData({...formData, spmb_year: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                  <span className="text-sm text-gray-600">Status Pendaftaran</span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Terbuka</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-900 to-teal-800 text-white overflow-hidden relative">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-bold uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Fitur Pengarsipan & Siap Cetak
              </div>
              <h3 className="text-lg font-bold">Pusat Arsip Data Akademik Per Tahun & Semester</h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-xl">
                Arsipkan seluruh riwayat siswa, kelas, jadwal, nilai, SPMB, dan keuangan untuk tahun pelajaran ini agar tersimpan rapi dan siap dicetak sebagai dokumen resmi kapan pun dibutuhkan.
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/arsip-akademik')}
              className="bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold rounded-2xl h-11 px-5 shadow-lg border-0 shrink-0 flex items-center gap-2 z-10"
            >
              <Archive className="w-4 h-4 text-emerald-600" /> Buka Pusat Arsip <ArrowRight className="w-4 h-4" />
            </Button>
            <Archive className="absolute -right-4 -bottom-4 w-36 h-36 text-white/5 pointer-events-none" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-amber-50 border-amber-100">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Penting!</p>
              <p>Perubahan tahun pelajaran akan berdampak langsung pada label di formulir pendaftaran dan kop surat dokumen resmi yang dicetak.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Auto-Archive Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Archive className="w-6 h-6 text-emerald-600" />
              Tahun Pelajaran / Semester Berganti
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda terdeteksi mengubah Tahun Pelajaran atau Semester aktif dari <strong className="text-slate-900">{settings.tahun_pelajaran?.active_year} ({settings.tahun_pelajaran?.semester})</strong> menjadi <strong className="text-emerald-700">{formData.active_year} ({formData.semester})</strong>.
            </p>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800">
              <p className="font-bold mb-1">Rekomendasi Pengarsipan:</p>
              <p className="text-emerald-700">Disarankan untuk membuat snapshot arsip data akademik periode lama terlebih dahulu agar seluruh rekapitulasi data siswa & nilai tersimpan rapi dan siap dicetak.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => executeSave(true)}
              disabled={loading || archiving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-11 text-xs shadow-md"
            >
              {archiving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
              Arsipkan Data Lama & Simpan Perubahan
            </Button>
            <Button
              variant="outline"
              onClick={() => executeSave(false)}
              disabled={loading}
              className="rounded-xl font-bold h-10 text-xs text-slate-700"
            >
              Simpan Tanpa Arsip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addYearDialogOpen} onOpenChange={setAddYearDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Plus className="w-6 h-6 text-emerald-600" />
              Tambah Tahun Pelajaran
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Tahun Pelajaran Baru</label>
              <Input
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="Contoh: 2025/2026"
                className="rounded-xl h-12"
              />
              <p className="text-xs text-gray-500">Format: YYYY/YYYY (tahun awal/tahun akhir)</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setAddYearDialogOpen(false);
                  setNewYear('');
                }}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handleAddAcademicYear}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                Tambah Tahun
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default TahunPelajaran;