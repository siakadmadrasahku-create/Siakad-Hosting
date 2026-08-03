"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, Plus, Search, Pencil, Trash2, Printer, Download, RefreshCw, 
  Upload, UserCheck, Award, GraduationCap, FileSpreadsheet, ShieldCheck, 
  Filter, CheckCircle, XCircle, Clock, School, Mail, Phone, ImageIcon, UserX, Sparkles
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { uploadImageToStorage } from '@/utils/imageCompression';

export interface Teacher {
  id: string;
  nama: string; // Nama Lengkap beserta Gelar
  nip: string; // NIP / NPK
  nik: string; // NIK 16 digit
  pendidikan: string; // Pendidikan Terakhir (S1 PAI, S2 Pendidikan, dll)
  sertifikasi: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses';
  no_sertifikat_pendidik?: string;
  nuptk?: string;
  jabatan: string; // Guru Kelas, Guru PAI, Kepala Madrasah, Operator, Staf TU
  mapel_diampu?: string;
  gender: 'Laki-laki' | 'Perempuan';
  tempat_lahir?: string;
  tanggal_lahir?: string;
  telepon?: string;
  email?: string;
  foto_url?: string;
  status_keaktifan: 'Aktif' | 'Cuti' | 'Non-Aktif';
  tmt_pendidik?: string;
  created_at: string;
}

const sampleTeachers: Teacher[] = [
  {
    id: 'g-1',
    nama: 'Ahmad Syafii, S.Pd.I, M.Pd',
    nip: '198501152010011001',
    nik: '3302151501850001',
    pendidikan: 'S2 Pendidikan Agama Islam',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '123456789012',
    nuptk: '1234567890123456',
    jabatan: 'Kepala Madrasah & Guru PAI',
    mapel_diampu: 'Akidah Akhlak',
    gender: 'Laki-laki',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1985-01-15',
    telepon: '081234567890',
    email: 'ahmad.syafii@mimaarif.sch.id',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2010-01-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-2',
    nama: 'Siti Nurjanah, S.Pd',
    nip: '199003202015022002',
    nik: '3302156003900002',
    pendidikan: 'S1 PGMI / PGSD',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '987654321098',
    nuptk: '8765432109876543',
    jabatan: 'Guru Kelas I',
    mapel_diampu: 'Guru Kelas / Tematik',
    gender: 'Perempuan',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1990-03-20',
    telepon: '082198765432',
    email: 'siti.nurjanah@mimaarif.sch.id',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2015-02-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-3',
    nama: 'M. Ridwan Kurniawan, S.Pd',
    nip: '199307122019031003',
    nik: '3302151207930003',
    pendidikan: 'S1 Pendidikan Bahasa Arab',
    sertifikasi: 'Dalam Proses',
    no_sertifikat_pendidik: '',
    nuptk: '5678901234567890',
    jabatan: 'Guru Mapel Bahasa Arab',
    mapel_diampu: 'Bahasa Arab & Al-Qur\'an Hadis',
    gender: 'Laki-laki',
    tempat_lahir: 'Purwokerto',
    tanggal_lahir: '1993-07-12',
    telepon: '085712345678',
    email: 'ridwan.kurniawan@mimaarif.sch.id',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2019-03-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-4',
    nama: 'Dewi Rahmawati, S.Kom',
    nip: '-',
    nik: '3302154508950004',
    pendidikan: 'S1 Teknik Informatika',
    sertifikasi: 'Belum Sertifikasi',
    no_sertifikat_pendidik: '',
    nuptk: '3456789012345678',
    jabatan: 'Guru TIK & Operator EMIS',
    mapel_diampu: 'Informatika / TIK',
    gender: 'Perempuan',
    tempat_lahir: 'Cilacap',
    tanggal_lahir: '1995-08-05',
    telepon: '088812349999',
    email: 'dewi.rahmawati@mimaarif.sch.id',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2021-07-15',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-5',
    nama: 'Bambang Subagyo, S.Pd',
    nip: '198811022014011005',
    nik: '3302150211880005',
    pendidikan: 'S1 Pendidikan Jasmani (PJOK)',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '543210987654',
    nuptk: '7654321098765432',
    jabatan: 'Guru PJOK & Pembina Pramuka',
    mapel_diampu: 'PJOK',
    gender: 'Laki-laki',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1988-11-02',
    telepon: '081398761234',
    email: 'bambang.subagyo@mimaarif.sch.id',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2014-01-01',
    created_at: new Date().toISOString(),
  }
];

const emptyTeacherForm: Omit<Teacher, 'id' | 'created_at'> = {
  nama: '',
  nip: '',
  nik: '',
  pendidikan: 'S1 Pendidikan Agama Islam',
  sertifikasi: 'Belum Sertifikasi',
  no_sertifikat_pendidik: '',
  nuptk: '',
  jabatan: 'Guru Kelas',
  mapel_diampu: '',
  gender: 'Laki-laki',
  tempat_lahir: '',
  tanggal_lahir: '',
  telepon: '',
  email: '',
  foto_url: '',
  status_keaktifan: 'Aktif',
  tmt_pendidik: '',
};

const TeachersAdmin = () => {
  const { activeMadrasah, activeMadrasahId, getScopedKey } = useMadrasah();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'semua' | 'sertifikasi' | 'proses' | 'belum'>('semua');
  const [filterSertifikasi, setFilterSertifikasi] = useState<string>('all');
  const [filterPendidikan, setFilterPendidikan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<Omit<Teacher, 'id' | 'created_at'>>(emptyTeacherForm);
  const [saving, setSaving] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, [activeMadrasahId]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const storageKey = getScopedKey('data_guru');
      const scopedCacheKey = `siakad_data_guru_${activeMadrasahId}`;
      const allTeacherKeys = Array.from(new Set([storageKey, 'data_guru']));
      const { data, error } = await supabase
        .from('site_settings')
        .select('id, value, updated_at')
        .in('id', allTeacherKeys)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const dbTeachers = Array.isArray(data)
        ? data.find(row => Array.isArray(row.value))?.value
        : [];

      if (Array.isArray(dbTeachers)) {
        setTeachers(dbTeachers);
      } else {
        const cachedKeys = [scopedCacheKey, storageKey, 'siakad_data_guru', 'data_guru'];
        for (const key of cachedKeys) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                setTeachers(parsed);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.warn('Failed parsing cached teachers:', e);
            }
          }
        }
        setTeachers([]);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      const fallbackKeys = [`siakad_data_guru_${activeMadrasahId}`, getScopedKey('data_guru'), 'siakad_data_guru', 'data_guru'];
      for (const key of fallbackKeys) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setTeachers(parsed);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed parsing cached teachers:', e);
          }
        }
      }
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const saveTeachersToDb = async (updatedList: Teacher[]) => {
    const storageKey = getScopedKey('data_guru');
    const scopedCacheKey = `siakad_data_guru_${activeMadrasahId}`;
    const now = new Date().toISOString();

    try { localStorage.setItem(scopedCacheKey, JSON.stringify(updatedList)); } catch (err) { void err; }
    try { localStorage.setItem('siakad_data_guru', JSON.stringify(updatedList)); } catch (err) { void err; }
    try { localStorage.setItem(storageKey, JSON.stringify(updatedList)); } catch (err) { void err; }
    try { localStorage.setItem('data_guru', JSON.stringify(updatedList)); } catch (err) { void err; }

    try {
      await supabase
        .from('site_settings')
        .upsert({
          id: storageKey,
          value: updatedList,
          updated_at: now
        });
      await supabase
        .from('site_settings')
        .upsert({
          id: 'data_guru',
          value: updatedList,
          updated_at: now
        });
    } catch (e) {
      console.warn('Failed to upsert teachers:', e);
    }

    window.dispatchEvent(new CustomEvent('siakad_teachers_updated'));
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData(emptyTeacherForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      nama: teacher.nama,
      nip: teacher.nip || '',
      nik: teacher.nik || '',
      pendidikan: teacher.pendidikan || 'S1 Pendidikan Agama Islam',
      sertifikasi: teacher.sertifikasi || 'Belum Sertifikasi',
      no_sertifikat_pendidik: teacher.no_sertifikat_pendidik || '',
      nuptk: teacher.nuptk || '',
      jabatan: teacher.jabatan || 'Guru Kelas',
      mapel_diampu: teacher.mapel_diampu || '',
      gender: teacher.gender || 'Laki-laki',
      tempat_lahir: teacher.tempat_lahir || '',
      tanggal_lahir: teacher.tanggal_lahir || '',
      telepon: teacher.telepon || '',
      email: teacher.email || '',
      foto_url: teacher.foto_url || '',
      status_keaktifan: teacher.status_keaktifan || 'Aktif',
      tmt_pendidik: teacher.tmt_pendidik || '',
    });
    setIsModalOpen(true);
  };

  const handlePromptDeleteTeacher = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    const targetId = teacherToDelete.id;
    const targetName = teacherToDelete.nama;

    try {
      setSaving(true);
      const updated = teachers.filter(t => t.id !== targetId);
      setTeachers(updated);
      await saveTeachersToDb(updated);
      showSuccess(`Data GTK "${targetName}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      showError('Gagal menghapus data GTK.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      showError('Nama guru wajib diisi!');
      return;
    }

    setSaving(true);
    try {
      let updatedList: Teacher[] = [];
      if (editingTeacher) {
        updatedList = teachers.map(t => t.id === editingTeacher.id ? { ...t, ...formData } : t);
        showSuccess('Data guru berhasil diperbarui!');
      } else {
        const newTeacher: Teacher = {
          id: 'guru-' + Date.now(),
          ...formData,
          created_at: new Date().toISOString(),
        };
        updatedList = [newTeacher, ...teachers];
        showSuccess('Guru baru berhasil ditambahkan!');
      }

      setTeachers(updatedList);
      await saveTeachersToDb(updatedList);
      setIsModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Gagal menyimpan data guru.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImageToStorage(file, 'guru');
      setFormData(prev => ({ ...prev, foto_url: url }));
      showSuccess('Foto guru berhasil diunggah!');
    } catch (err: any) {
      showError(err.message || 'Gagal unggah foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSeedSamples = async () => {
    if (window.confirm('Muat ulang sample data guru default?')) {
      setTeachers(sampleTeachers);
      await saveTeachersToDb(sampleTeachers);
      showSuccess('Sample data guru berhasil dimuat!');
    }
  };

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = 
        t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.jabatan.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSertifikasi = 
        filterSertifikasi === 'all' || t.sertifikasi === filterSertifikasi;

      const matchesPendidikan = 
        filterPendidikan === 'all' || t.pendidikan.toLowerCase().includes(filterPendidikan.toLowerCase());

      const matchesStatus = 
        filterStatus === 'all' || t.status_keaktifan === filterStatus;

      return matchesSearch && matchesSertifikasi && matchesPendidikan && matchesStatus;
    });
  }, [teachers, searchQuery, filterSertifikasi, filterPendidikan, filterStatus]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = teachers.length;
    const certified = teachers.filter(t => t.sertifikasi === 'Sudah Sertifikasi').length;
    const process = teachers.filter(t => t.sertifikasi === 'Dalam Proses').length;
    const notCertified = teachers.filter(t => t.sertifikasi === 'Belum Sertifikasi').length;
    const male = teachers.filter(t => t.gender === 'Laki-laki').length;
    const female = teachers.filter(t => t.gender === 'Perempuan').length;
    const percentCertified = total > 0 ? Math.round((certified / total) * 100) : 0;

    return { total, certified, process, notCertified, male, female, percentCertified };
  }, [teachers]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['No', 'Nama Guru', 'NIP', 'NIK', 'Pendidikan', 'Sertifikasi', 'Jabatan', 'Mapel Diampu', 'Gender', 'No HP', 'Email', 'Status'];
    const rows = filteredTeachers.map((t, idx) => [
      idx + 1,
      `"${t.nama}"`,
      `"${t.nip}"`,
      `"${t.nik}"`,
      `"${t.pendidikan}"`,
      `"${t.sertifikasi}"`,
      `"${t.jabatan}"`,
      `"${t.mapel_diampu || '-'}"`,
      `"${t.gender}"`,
      `"${t.telepon || '-'}"`,
      `"${t.email || '-'}"`,
      `"${t.status_keaktifan}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Guru_GTK_${activeMadrasah.nama_madrasah}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout title="Daftar Guru & GTK">
      {/* Printable Area for Formal GTK Report */}
      <div className="hidden print:block font-serif text-black p-6 space-y-4">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h2 className="text-lg font-bold uppercase">DAFTAR PENDIDIK & TENAGA KEPENDIDIKAN (GTK)</h2>
          <h1 className="text-xl font-black uppercase text-emerald-950">{activeMadrasah.nama_madrasah || "MADRASAH IBTIDAIYAH"}</h1>
          <p className="text-xs italic mt-0.5">
            NSM: {activeMadrasah.nsm || '-'} | NPSN: {activeMadrasah.npsn || '-'} | {activeMadrasah.alamat}
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-200 text-center font-bold">
              <th className="border border-black p-2 w-10">NO</th>
              <th className="border border-black p-2 text-left">NAMA LENGKAP & GELAR</th>
              <th className="border border-black p-2">NIP / NPK</th>
              <th className="border border-black p-2">NIK</th>
              <th className="border border-black p-2">PENDIDIKAN</th>
              <th className="border border-black p-2">SERTIFIKASI</th>
              <th className="border border-black p-2 text-left">JABATAN / MAPEL</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((t, idx) => (
              <tr key={t.id} className="text-center">
                <td className="border border-black p-2 font-bold">{idx + 1}</td>
                <td className="border border-black p-2 text-left font-bold">{t.nama}</td>
                <td className="border border-black p-2 font-mono">{t.nip || '-'}</td>
                <td className="border border-black p-2 font-mono">{t.nik || '-'}</td>
                <td className="border border-black p-2">{t.pendidikan}</td>
                <td className="border border-black p-2 font-bold">{t.sertifikasi}</td>
                <td className="border border-black p-2 text-left">{t.jabatan} {t.mapel_diampu ? `(${t.mapel_diampu})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex justify-between text-xs px-6">
          <div></div>
          <div className="text-center">
            <p>Dicetak Pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold mt-1">Kepala Madrasah</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{activeMadrasah.nama_pimpinan || 'Kepala Madrasah'}</p>
            <p>NIP. {activeMadrasah.nip_pimpinan || '-'}</p>
          </div>
        </div>
      </div>

      {/* Main Admin UI */}
      <div className="print:hidden space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-400 text-emerald-950 font-extrabold uppercase px-2.5 py-0.5 rounded-full text-[10px]">
                Pendataan GTK Madrasah
              </Badge>
              <Badge variant="outline" className="text-emerald-200 border-emerald-400/30 text-[10px]">
                Total: {stats.total} Orang
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-black mt-1 text-white">Modul Data Guru & Tenaga Kependidikan</h1>
            <p className="text-xs text-emerald-100/80 mt-1">
              Manajemen lengkap biodata guru, NIP, NIK, kualifikasi pendidikan, dan status sertifikasi pendidik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSeedSamples}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl gap-1.5 text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-300" /> Reset Sample
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl gap-1.5 text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" /> Export Excel/CSV
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl gap-1.5 text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-300" /> Cetak GTK
            </Button>
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black rounded-2xl gap-1.5 shadow-lg px-4 text-xs"
            >
              <Plus className="w-4 h-4" /> Tambah Guru Baru
            </Button>
          </div>
        </div>

        {/* Horizontal Iconic Sub-Menu Bar */}
        <div className="bg-white p-3 rounded-3xl shadow-md border border-slate-200/80">
          <div className="flex flex-row items-center overflow-x-auto bg-slate-100/90 p-1.5 rounded-2xl gap-1.5 scrollbar-none">
            <button
              onClick={() => { setActiveSubTab('semua'); setFilterSertifikasi('all'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'semua' && filterSertifikasi === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'semua' && filterSertifikasi === 'all' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                <Users className="w-4 h-4" />
              </div>
              <span>Semua Data GTK</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'semua' && filterSertifikasi === 'all' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {stats.total}
              </Badge>
            </button>

            <button
              onClick={() => { setActiveSubTab('sertifikasi'); setFilterSertifikasi('Sudah Sertifikasi'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'sertifikasi' || filterSertifikasi === 'Sudah Sertifikasi'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-teal-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'sertifikasi' || filterSertifikasi === 'Sudah Sertifikasi' ? 'bg-white/20' : 'bg-teal-100 text-teal-700'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>Sudah Sertifikasi</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'sertifikasi' || filterSertifikasi === 'Sudah Sertifikasi' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'}`}>
                {stats.certified}
              </Badge>
            </button>

            <button
              onClick={() => { setActiveSubTab('proses'); setFilterSertifikasi('Dalam Proses'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'proses' || filterSertifikasi === 'Dalam Proses'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'proses' || filterSertifikasi === 'Dalam Proses' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <span>Dalam Proses PPG</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'proses' || filterSertifikasi === 'Dalam Proses' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {stats.process}
              </Badge>
            </button>

            <button
              onClick={() => { setActiveSubTab('belum'); setFilterSertifikasi('Belum Sertifikasi'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'belum' || filterSertifikasi === 'Belum Sertifikasi'
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'belum' || filterSertifikasi === 'Belum Sertifikasi' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                <GraduationCap className="w-4 h-4" />
              </div>
              <span>Belum Sertifikasi</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'belum' || filterSertifikasi === 'Belum Sertifikasi' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
                {stats.notCertified}
              </Badge>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-500 uppercase">Total Guru & GTK</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{stats.male} Laki-laki • {stats.female} Perempuan</p>
              </div>
              <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-emerald-700 uppercase">Sudah Sertifikasi</p>
                <h3 className="text-2xl font-black text-emerald-900 mt-1">{stats.certified} <span className="text-xs font-bold text-emerald-600">({stats.percentCertified}%)</span></h3>
                <p className="text-[11px] text-emerald-600 mt-0.5">Memiliki Sertifikat Pendidik</p>
              </div>
              <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-amber-700 uppercase">Dalam Proses PPG</p>
                <h3 className="text-2xl font-black text-amber-900 mt-1">{stats.process}</h3>
                <p className="text-[11px] text-amber-600 mt-0.5">Sedang Menempuh PPG</p>
              </div>
              <div className="w-11 h-11 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-800">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-600 uppercase">Belum Sertifikasi</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.notCertified}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Belum Bersertifikat</p>
              </div>
              <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-700">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter & Search Controls */}
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari berdasarkan Nama Guru, NIP, NIK, atau Jabatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-2xl text-xs font-medium border-slate-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select value={filterSertifikasi} onValueChange={setFilterSertifikasi}>
                  <SelectTrigger className="w-[170px] rounded-2xl text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Status Sertifikasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Sertifikasi</SelectItem>
                    <SelectItem value="Sudah Sertifikasi">Sudah Sertifikasi</SelectItem>
                    <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                    <SelectItem value="Belum Sertifikasi">Belum Sertifikasi</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPendidikan} onValueChange={setFilterPendidikan}>
                  <SelectTrigger className="w-[150px] rounded-2xl text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Pendidikan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Pendidikan</SelectItem>
                    <SelectItem value="S2">S2 (Magister)</SelectItem>
                    <SelectItem value="S1">S1 (Sarjana)</SelectItem>
                    <SelectItem value="D3">D3 / D2</SelectItem>
                    <SelectItem value="SMA">SMA / MA</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] rounded-2xl text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Status Keaktifan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Cuti">Cuti</SelectItem>
                    <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table View (Consisting explicitly of: NO, NAMA, NIP, NIK, PENDIDIKAN, SERTIFIKASI) */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Tabel Data Guru & GTK Resmi
              </CardTitle>
              <CardDescription className="text-xs">
                Menampilkan {filteredTeachers.length} dari total {teachers.length} guru/tenaga kependidikan
              </CardDescription>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                  <th className="p-3.5 text-center w-12 border-r border-slate-800">NO</th>
                  <th className="p-3.5 border-r border-slate-800">NAMA LENGKAP & GELAR</th>
                  <th className="p-3.5 border-r border-slate-800">NIP / NPK</th>
                  <th className="p-3.5 border-r border-slate-800">NIK (16 DIGIT)</th>
                  <th className="p-3.5 border-r border-slate-800">PENDIDIKAN TERAKHIR</th>
                  <th className="p-3.5 border-r border-slate-800 text-center">STATUS SERTIFIKASI</th>
                  <th className="p-3.5 text-center w-28">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher, index) => (
                    <tr key={teacher.id} className="hover:bg-emerald-50/30 transition-colors">
                      {/* 1. NO */}
                      <td className="p-3.5 text-center font-bold text-slate-800 border-r border-slate-100 font-mono">
                        {index + 1}
                      </td>

                      {/* 2. NAMA */}
                      <td className="p-3.5 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          {teacher.foto_url ? (
                            <img src={teacher.foto_url} alt={teacher.nama} className="w-10 h-10 rounded-full object-cover border border-emerald-300 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-200">
                              {teacher.nama.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{teacher.nama}</div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                              <span className="text-emerald-700 font-bold">{teacher.jabatan}</span>
                              {teacher.mapel_diampu && <span>• {teacher.mapel_diampu}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. NIP */}
                      <td className="p-3.5 border-r border-slate-100 font-mono text-slate-800 font-bold">
                        {teacher.nip || '-'}
                      </td>

                      {/* 4. NIK */}
                      <td className="p-3.5 border-r border-slate-100 font-mono text-slate-700 font-medium">
                        {teacher.nik || '-'}
                      </td>

                      {/* 5. PENDIDIKAN */}
                      <td className="p-3.5 border-r border-slate-100">
                        <div className="font-bold text-slate-800">{teacher.pendidikan}</div>
                        {teacher.nuptk && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            NUPTK: {teacher.nuptk}
                          </div>
                        )}
                      </td>

                      {/* 6. SERTIFIKASI */}
                      <td className="p-3.5 border-r border-slate-100 text-center">
                        {teacher.sertifikasi === 'Sudah Sertifikasi' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-300">
                            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Sudah Sertifikasi
                          </Badge>
                        ) : teacher.sertifikasi === 'Dalam Proses' ? (
                          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-300">
                            <Clock className="w-3 h-3 mr-1 text-amber-700" /> Dalam Proses PPG
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold px-2.5 py-1 rounded-full text-[10px]">
                            Belum Sertifikasi
                          </Badge>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(teacher)}
                            className="h-8 w-8 p-0 rounded-xl text-blue-600 hover:bg-blue-50"
                            title="Edit Data Guru"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePromptDeleteTeacher(teacher)}
                            className="h-8 w-8 p-0 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Hapus Data Guru"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <UserX className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-bold text-slate-600">Tidak ada data guru yang ditemukan.</p>
                      <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal Dialog Form Tambah / Edit Guru */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {editingTeacher ? 'Edit Data Guru & GTK' : 'Tambah Guru / GTK Baru'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap & Gelar <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Contoh: Ahmad Syafii, S.Pd.I, M.Pd"
                    className="rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIP / NPK</label>
                  <Input
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="18 Digit NIP atau NPK"
                    className="rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIK (16 Digit KTP)</label>
                  <Input
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    placeholder="16 Digit NIK KTP"
                    className="rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pendidikan Terakhir <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.pendidikan}
                    onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                    placeholder="Contoh: S1 Pendidikan Agama Islam"
                    className="rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Sertifikasi Pendidik</label>
                  <Select
                    value={formData.sertifikasi}
                    onValueChange={(val: any) => setFormData({ ...formData, sertifikasi: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Status Sertifikasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sudah Sertifikasi">Sudah Sertifikasi</SelectItem>
                      <SelectItem value="Dalam Proses">Dalam Proses (PPG)</SelectItem>
                      <SelectItem value="Belum Sertifikasi">Belum Sertifikasi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Sertifikat Pendidik (Sertis)</label>
                  <Input
                    value={formData.no_sertifikat_pendidik || ''}
                    onChange={(e) => setFormData({ ...formData, no_sertifikat_pendidik: e.target.value })}
                    placeholder="12 Digit No. Sertifikat"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NUPTK</label>
                  <Input
                    value={formData.nuptk || ''}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    placeholder="16 Digit NUPTK"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Madrasah</label>
                  <Input
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    placeholder="Guru Kelas I / Kepala Madrasah / Guru PAI"
                    className="rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran Diampu</label>
                  <Input
                    value={formData.mapel_diampu || ''}
                    onChange={(e) => setFormData({ ...formData, mapel_diampu: e.target.value })}
                    placeholder="Bahasa Arab / Tematik / PJOK"
                    className="rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val: any) => setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Keaktifan</label>
                  <Select
                    value={formData.status_keaktifan}
                    onValueChange={(val: any) => setFormData({ ...formData, status_keaktifan: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Status Keaktifan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Cuti">Cuti</SelectItem>
                      <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <Input
                    value={formData.telepon || ''}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Guru</label>
                  <Input
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="guru@mimaarif.sch.id"
                    className="rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Foto Guru</label>
                  <div className="flex items-center gap-3">
                    {formData.foto_url ? (
                      <img src={formData.foto_url} alt="Foto" className="w-12 h-12 rounded-xl object-cover border border-emerald-300" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <Button type="button" size="sm" variant="outline" className="rounded-xl text-xs font-bold" asChild disabled={uploading}>
                          <span><Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Mengunggah...' : 'Upload Foto'}</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setMediaModalOpen(true)}
                        className="rounded-xl text-xs font-bold"
                      >
                        Pilih dari Galeri
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-2xl text-xs font-bold">
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold">
                  {saving ? 'Menyimpan...' : 'Simpan Data Guru'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <MediaLibraryModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelectImage={(url) => {
            setFormData(prev => ({ ...prev, foto_url: url }));
            showSuccess('Foto dipilih!');
          }}
          title="Pilih Foto Guru"
        />

        {/* Confirmation Modal for Delete GTK */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Konfirmasi Hapus GTK
              </DialogTitle>
            </DialogHeader>

            <div className="py-3 space-y-2">
              <p className="text-xs text-slate-700 font-medium">
                Apakah Anda yakin ingin menghapus data GTK <strong className="text-slate-900">{teacherToDelete?.nama}</strong>?
              </p>
              {teacherToDelete?.jabatan && (
                <p className="text-[11px] text-slate-500">
                  Jabatan: {teacherToDelete.jabatan} • NIP: {teacherToDelete.nip || '-'}
                </p>
              )}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold mt-2">
                ⚠️ Tindakan ini bersifat permanen. Data GTK akan dihapus dari sistem.
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setTeacherToDelete(null);
                }}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleConfirmDeleteTeacher}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                {saving ? 'Menghapus...' : 'Ya, Hapus GTK'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default TeachersAdmin;
