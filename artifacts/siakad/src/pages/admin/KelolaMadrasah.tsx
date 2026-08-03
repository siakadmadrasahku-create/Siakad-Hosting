"use client";

import React, { useState, useEffect } from 'react';
import { useMadrasah, MadrasahItem } from '@/contexts/MadrasahContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building, Plus, Pencil, Trash2, CheckCircle2, School, Users, 
  MapPin, Phone, Mail, Award, Search, Loader2, Sparkles, ShieldCheck, ExternalLink,
  Shield, UserCheck, AlertTriangle, KeyRound, Lock, Eye, EyeOff, Power, ShieldAlert
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const KelolaMadrasah = () => {
  const { 
    madrasahs, 
    visibleMadrasahs,
    activeMadrasah, 
    activeMadrasahId, 
    setActiveMadrasahId, 
    addMadrasah, 
    updateMadrasah, 
    deleteMadrasah,
    toggleMadrasahActive,
    isSuperAdmin,
    canBeSuperAdmin,
    setIsSuperAdmin,
    assignedMadrasahId,
    setAssignedMadrasahId,
    getScopedKey 
  } = useMadrasah();

  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMadrasah, setEditingMadrasah] = useState<MadrasahItem | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Custom Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMadrasah, setDeletingMadrasah] = useState<MadrasahItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Password Update Dialog State
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordMadrasah, setPasswordMadrasah] = useState<MadrasahItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Status Toggle (Active/Nonactive) State
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatusMadrasah, setTargetStatusMadrasah] = useState<MadrasahItem | null>(null);
  const [nextActiveStatus, setNextActiveStatus] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleOpenStatusDialog = (m: MadrasahItem, activeStatus: boolean) => {
    setTargetStatusMadrasah(m);
    setNextActiveStatus(activeStatus);
    setStatusDialogOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!targetStatusMadrasah) return;
    setUpdatingStatus(true);
    try {
      const ok = await toggleMadrasahActive(targetStatusMadrasah.id, nextActiveStatus);
      if (ok) {
        setStatusDialogOpen(false);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const [teacherCounts, setTeacherCounts] = useState<Record<string, number>>({});
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    nama_madrasah: '',
    nsm: '',
    npsn: '',
    nama_pimpinan: '',
    nip_pimpinan: '',
    jenjang_pendidikan: 'MI',
    alamat: '',
    telepon: '',
    email: '',
    status: 'Swasta',
    logo_url: '',
  });

  // Load teacher and student counts per madrasah
  useEffect(() => {
    const fetchCounts = async () => {
      const teacherMap: Record<string, number> = {};
      const studentMap: Record<string, number> = {};

      for (const m of madrasahs) {
        try {
          // Fetch teachers count
          const teacherKey = getScopedKey('user_profiles_list', m.id);
          const { data: tRes } = await supabase.from('site_settings').select('value').eq('id', teacherKey).maybeSingle();
          if (tRes?.value && Array.isArray(tRes.value)) {
            teacherMap[m.id] = tRes.value.length;
          } else {
            teacherMap[m.id] = 0;
          }

          // Fetch students count
          const studentKey = getScopedKey('students_list', m.id);
          const { data: sRes } = await supabase.from('site_settings').select('value').eq('id', sRes?.id || m.id).maybeSingle();
          if (sRes?.value && Array.isArray(sRes.value)) {
            studentMap[m.id] = sRes.value.length;
          } else {
            studentMap[m.id] = 0;
          }
        } catch (e) {
          console.warn('Error fetching counts for', m.id, e);
        }
      }

      setTeacherCounts(teacherMap);
      setStudentCounts(studentMap);
    };

    fetchCounts();
  }, [madrasahs, getScopedKey]);

  const handleOpenAdd = () => {
    setEditingMadrasah(null);
    setFormData({
      nama_madrasah: '',
      nsm: '',
      npsn: '',
      nama_pimpinan: '',
      nip_pimpinan: '',
      jenjang_pendidikan: 'MI',
      alamat: '',
      telepon: '',
      email: '',
      status: 'Swasta',
      logo_url: '',
      custom_password: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (m: MadrasahItem) => {
    setEditingMadrasah(m);
    setFormData({
      nama_madrasah: m.nama_madrasah || '',
      nsm: m.nsm || '',
      npsn: m.npsn || '',
      nama_pimpinan: m.nama_pimpinan || '',
      nip_pimpinan: m.nip_pimpinan || '',
      jenjang_pendidikan: m.jenjang_pendidikan || 'MI',
      alamat: m.alamat || '',
      telepon: m.telepon || '',
      email: m.email || '',
      status: m.status || 'Swasta',
      logo_url: m.logo_url || '',
      custom_password: m.custom_password || '',
      is_active: m.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_madrasah.trim()) {
      showError('Nama Madrasah wajib diisi!');
      return;
    }

    if (!formData.email.trim()) {
      showError('Email resmi madrasah wajib diisi untuk akses login!');
      return;
    }

    setSaving(true);
    try {
      if (editingMadrasah) {
        const ok = await updateMadrasah(editingMadrasah.id, {
          ...formData,
          email: formData.email.trim().toLowerCase(),
        });
        if (ok) setDialogOpen(false);
      } else {
        const cleanEmail = formData.email.trim().toLowerCase();
        const pwd = formData.custom_password || '123456';
        const newId = await addMadrasah({
          ...formData,
          email: cleanEmail,
          custom_password: pwd,
          is_active: true,
        });

        if (newId) {
          // Attempt registering auth account in Supabase
          try {
            await supabase.auth.signUp({
              email: cleanEmail,
              password: pwd,
              options: {
                data: {
                  full_name: formData.nama_pimpinan || formData.nama_madrasah,
                  madrasah_name: formData.nama_madrasah,
                }
              }
            });
          } catch (e) {
            console.warn('Silent signUp during add madrasah:', e);
          }
          setDialogOpen(false);
        }
      }
    } catch (err: any) {
      showError('Terjadi kesalahan saat menyimpan data: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (m: MadrasahItem) => {
    setDeletingMadrasah(m);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingMadrasah) return;
    setDeleting(true);
    try {
      const res = await deleteMadrasah(deletingMadrasah.id);
      if (res) {
        setDeleteDialogOpen(false);
        setDeletingMadrasah(null);
      }
    } catch (err) {
      showError('Gagal menghapus madrasah');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenPasswordDialog = (m: MadrasahItem) => {
    setPasswordMadrasah(m);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setPasswordDialogOpen(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordMadrasah) return;

    if (!newPassword) {
      showError('Password baru wajib diisi!');
      return;
    }

    if (newPassword.length < 6) {
      showError('Password minimal 6 karakter!');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Konfirmasi password tidak cocok!');
      return;
    }

    setUpdatingPassword(true);
    try {
      // 1. Update custom_password on Madrasah Item
      await updateMadrasah(passwordMadrasah.id, {
        custom_password: newPassword,
      });

      // 2. Also register / update user in Supabase Auth
      try {
        await supabase.auth.signUp({
          email: passwordMadrasah.email.trim().toLowerCase(),
          password: newPassword,
          options: {
            data: {
              full_name: passwordMadrasah.nama_pimpinan || passwordMadrasah.nama_madrasah,
              madrasah_name: passwordMadrasah.nama_madrasah,
            }
          }
        });
      } catch (e) {
        console.warn('Silent auth sync on password update:', e);
      }

      showSuccess(`Password akun untuk "${passwordMadrasah.nama_madrasah}" berhasil diperbarui!`);
      setPasswordDialogOpen(false);
    } catch (err) {
      showError('Terjadi kesalahan saat memperbarui password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const filteredMadrasahs = visibleMadrasahs.filter(m => 
    m.nama_madrasah.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.nsm.includes(searchQuery) ||
    m.npsn.includes(searchQuery) ||
    (m.alamat || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Kelola Madrasah Multi-Tenant">
      {/* Header Info */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl mb-8 overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <CardContent className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> System Multi-Tenancy Berlisensi
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Kelola Daftar Madrasah / Sekolah
              </h2>
              <p className="text-emerald-100/80 text-sm leading-relaxed">
                Aplikasi Si@Kad mendukung multi-tenant secara mandiri. Setiap madrasah memiliki isolasi data yang aman dan terpisah 100% (data guru, siswa, kelas, jadwal, dan pengaturan tidak akan tumpang tindih).
              </p>
            </div>
            {isSuperAdmin && (
              <Button 
                onClick={handleOpenAdd} 
                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl px-6 py-6 font-bold shadow-lg shadow-emerald-950/40 shrink-0"
              >
                <Plus className="w-5 h-5 mr-2" /> Tambah Madrasah Baru
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Access Rights Switcher / Banner */}
      <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isSuperAdmin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isSuperAdmin ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Mode Hak Akses Tampilan</span>
                  <Badge variant="outline" className={isSuperAdmin ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' : 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'}>
                    {isSuperAdmin ? '👑 Super Admin / Pemilik Aplikasi' : '🏫 Admin Madrasah'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isSuperAdmin 
                    ? 'Anda dapat melihat, menambah, mengubah, dan menghapus seluruh daftar akun madrasah di aplikasi ini.' 
                    : `Menampilkan khusus data madrasah yang Anda kelola. Terisolasi sesuai akun pendaftaran.`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              {!isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 hidden lg:inline">Pilih Madrasah Saya:</span>
                  <Select value={assignedMadrasahId} onValueChange={(val) => {
                    setAssignedMadrasahId(val);
                    setActiveMadrasahId(val);
                    showSuccess('Data madrasah disesuaikan!');
                  }}>
                    <SelectTrigger className="w-48 rounded-xl text-xs font-bold border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {madrasahs.map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-xs font-medium">
                          {m.nama_madrasah}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {canBeSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = !isSuperAdmin;
                    setIsSuperAdmin(next);
                    showSuccess(next ? 'Beralih ke Mode Super Admin (Semua Madrasah)' : 'Beralih ke Mode Admin Madrasah (Khusus Akun Sendiri)');
                  }}
                  className="rounded-xl border-slate-300 text-xs font-bold whitespace-nowrap hover:bg-slate-50"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  {isSuperAdmin ? 'Ganti ke Mode Admin Madrasah' : 'Ganti ke Mode Super Admin'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner for Super Admin */}
      <div className="mb-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs leading-relaxed flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-blue-950">Panduan Status & Multi-Madrasah:</p>
          <p>
            • <strong>Status Akun (Aktif / Nonaktif):</strong> Seluruh madrasah yang terdaftar dapat berstatus <strong>AKTIF secara bersamaan</strong>. Fitur nonaktifkan hanya digunakan Super Admin jika akun madrasah tertentu perlu ditangguhkan sementara.
          </p>
          <p>
            • <strong>Pilih & Kelola (Tampilan Aktif):</strong> Tombol ini digunakan oleh Anda untuk <strong>beralih tampilan/fokus</strong> saat hendak melihat, menginput, atau mengedit data akademik (guru, siswa, nilai, jadwal) milik madrasah tertentu.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama madrasah, NSM, NPSN, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl border-slate-200 shadow-sm bg-white"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <Building className="w-4 h-4 text-emerald-600" />
          Total Ditemukan: <span className="font-bold text-slate-900">{filteredMadrasahs.length}</span> (dari {madrasahs.length} terdaftar)
        </div>
      </div>

      {/* Madrasah Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMadrasahs.map((m) => {
          const isActive = m.id === activeMadrasahId;
          const teacherCount = teacherCounts[m.id] ?? 0;
          const studentCount = studentCounts[m.id] ?? 0;

          return (
            <Card 
              key={m.id} 
              className={`border-2 transition-all duration-300 rounded-3xl overflow-hidden relative ${
                isActive 
                  ? 'border-emerald-500 shadow-xl bg-gradient-to-b from-emerald-50/50 to-white' 
                  : 'border-slate-100 hover:border-slate-300 shadow-md bg-white'
              }`}
            >
              {isActive && (
                <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> SEDANG DIKELOLA / DITAMPILKAN SAAT INI
                  </span>
                  <Badge className="bg-white/20 text-white border-0 text-[10px]">Tampilan Aktif</Badge>
                </div>
              )}

              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      {m.logo_url ? (
                        <img src={m.logo_url} alt={m.nama_madrasah} className="w-full h-full object-contain p-1" />
                      ) : (
                        <School className="w-7 h-7 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-emerald-100/60 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                          {m.jenjang_pendidikan || 'MI'}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                          {m.status || 'Swasta'}
                        </Badge>
                        {m.is_active === false ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold text-[10px] flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-600" /> Account Nonaktif
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Account Aktif
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">{m.nama_madrasah}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        NSM: {m.nsm || '-'} | NPSN: {m.npsn || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate"><strong>Kepala Madrasah:</strong> {m.nama_pimpinan || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{m.alamat || 'Alamat belum diisi'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{m.email || '-'} | {m.telepon || '-'}</span>
                  </div>
                </div>

                {/* Stats Badge */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Jumlah Guru</p>
                      <p className="text-lg font-extrabold text-blue-900">{teacherCount} Guru</p>
                    </div>
                    <Users className="w-5 h-5 text-blue-500/60" />
                  </div>
                  <div className="bg-teal-50/70 border border-teal-100 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Jumlah Siswa</p>
                      <p className="text-lg font-extrabold text-teal-900">{studentCount} Siswa</p>
                    </div>
                    <School className="w-5 h-5 text-teal-500/60" />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {isActive ? (
                    <Button disabled className="bg-slate-900 text-white rounded-xl text-xs font-bold px-3.5 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" /> Sedang Dikelola
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        setActiveMadrasahId(m.id);
                        showSuccess(`Berhasil beralih ke "${m.nama_madrasah}"!`);
                      }} 
                      variant="outline" 
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-500 rounded-xl text-xs font-bold px-3.5"
                    >
                      Pilih & Kelola Madrasah Ini
                    </Button>
                  )}

                  <div className="flex items-center gap-1.5">
                    {isSuperAdmin && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenStatusDialog(m, m.is_active === false)}
                        className={m.is_active === false 
                          ? "rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 text-xs px-2.5" 
                          : "rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-xs px-2.5"
                        }
                        title={m.is_active === false ? "Aktifkan Akun Madrasah Ini" : "Nonaktifkan Akun Madrasah Ini"}
                      >
                        <Power className="w-3.5 h-3.5 mr-1" />
                        {m.is_active === false ? 'Aktifkan' : 'Nonaktifkan'}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenEdit(m)}
                      className="rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs font-bold px-2.5"
                      title="Edit Profile & Akun Madrasah"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenPasswordDialog(m)}
                      className="rounded-xl hover:bg-emerald-50 text-emerald-700"
                      title="Update Password Akun Madrasah"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenDelete(m)}
                      disabled={madrasahs.length <= 1}
                      className="rounded-xl hover:bg-red-50 text-red-600 disabled:opacity-40"
                      title="Hapus Madrasah"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Modal Confirmation Delete Madrasah */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Hapus Madrasah dari Daftar?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus madrasah <strong className="text-slate-900">{deletingMadrasah?.nama_madrasah}</strong>?
              Madrasah ini akan dihapus dari daftar multi-tenant. Seluruh data terisolasi untuk madrasah ini akan tetap aman di database.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md shadow-red-900/20"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Ya, Hapus Madrasah
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Add / Edit Madrasah */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingMadrasah ? 'Edit Data Madrasah' : 'Tambah Madrasah Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi identitas madrasah. Madrasah ini akan memiliki sistem terpisah 100% untuk guru, siswa, kelas, dan jadwal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Madrasah / Sekolah *</label>
                <Input
                  required
                  placeholder="Contoh: MI Al-Ikhlas / MTs Negeri 1"
                  value={formData.nama_madrasah}
                  onChange={(e) => setFormData({ ...formData, nama_madrasah: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenjang Pendidikan</label>
                <Select 
                  value={formData.jenjang_pendidikan} 
                  onValueChange={(val) => setFormData({ ...formData, jenjang_pendidikan: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RA">RA / TK Islam</SelectItem>
                    <SelectItem value="MI">MI (Madrasah Ibtidaiyah)</SelectItem>
                    <SelectItem value="MTs">MTs (Madrasah Tsanawiyah)</SelectItem>
                    <SelectItem value="MA">MA (Madrasah Aliyah)</SelectItem>
                    <SelectItem value="Ponpes">Pondok Pesantren</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Sekolah</label>
                <Select 
                  value={formData.status} 
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Negeri">Negeri</SelectItem>
                    <SelectItem value="Swasta">Swasta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NSM (Nomor Statistik)</label>
                <Input
                  placeholder="Contoh: 111234567890"
                  value={formData.nsm}
                  onChange={(e) => setFormData({ ...formData, nsm: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NPSN</label>
                <Input
                  placeholder="Contoh: 60723456"
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kepala / Pimpinan</label>
                <Input
                  placeholder="Nama pimpinan madrasah"
                  value={formData.nama_pimpinan}
                  onChange={(e) => setFormData({ ...formData, nama_pimpinan: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NIP Pimpinan (Opsional)</label>
                <Input
                  placeholder="NIP Pimpinan"
                  value={formData.nip_pimpinan}
                  onChange={(e) => setFormData({ ...formData, nip_pimpinan: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                <Input
                  placeholder="Jalan, RT/RW, Desa, Kecamatan, Kabupaten/Kota"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. Telepon / WA</label>
                <Input
                  placeholder="(021) 1234-5678"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi / Username Login *</label>
                <Input
                  type="email"
                  required
                  placeholder="info@madrasah.sch.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password Akun Login</label>
                <Input
                  type="text"
                  placeholder={editingMadrasah ? "Biarkan kosong jika tidak diubah" : "Contoh: 123456"}
                  value={formData.custom_password}
                  onChange={(e) => setFormData({ ...formData, custom_password: e.target.value })}
                  className="rounded-xl font-mono text-xs"
                />
              </div>

              {editingMadrasah && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                  <Select 
                    value={formData.is_active ? "active" : "inactive"} 
                    onValueChange={(val) => setFormData({ ...formData, is_active: val === "active" })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <span className="text-emerald-700 font-bold">● Aktif (Dapat Login)</span>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <span className="text-rose-700 font-bold">● Nonaktif (Diblokir)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={editingMadrasah ? "" : "sm:col-span-2"}>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Logo Madrasah (Opsional)</label>
                <Input
                  placeholder="https://... URL Gambar Logo"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                className="flex-1 rounded-xl"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={saving} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Simpan Madrasah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Dialog Update Password Madrasah */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Update Password Akun Madrasah
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
              Atur password baru untuk akun madrasah <strong className="text-slate-900">{passwordMadrasah?.nama_madrasah}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs text-slate-600">
              <div className="font-semibold text-slate-900">{passwordMadrasah?.nama_madrasah}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">Email: {passwordMadrasah?.email || 'admin@madrasah.sch.id'}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password Baru *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password baru (min 6 karakter)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 rounded-xl h-10 border-slate-200 text-sm focus:border-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Konfirmasi Password Baru *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ketik ulang password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 rounded-xl h-10 border-slate-200 text-sm focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setPasswordDialogOpen(false)} 
                className="flex-1 rounded-xl font-semibold"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={updatingPassword} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-900/10"
              >
                {updatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Memperbarui...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Simpan Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmation Status Toggle (Aktif/Nonaktif) */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className={nextActiveStatus 
              ? "w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2"
              : "w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2"
            }>
              {nextActiveStatus ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {nextActiveStatus ? 'Aktifkan Akun Madrasah?' : 'Nonaktifkan Akun Madrasah?'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
              {nextActiveStatus ? (
                <>Apakah Anda yakin ingin mengaktifkan kembali akun madrasah <strong className="text-slate-900">{targetStatusMadrasah?.nama_madrasah}</strong>? Admin madrasah ini akan dapat login dan mengakses seluruh fitur kembali.</>
              ) : (
                <>Apakah Anda yakin ingin menonaktifkan akun madrasah <strong className="text-slate-900">{targetStatusMadrasah?.nama_madrasah}</strong>? Admin madrasah ini tidak akan dapat login ke dashboard hingga diaktifkan kembali oleh Super Admin.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              className="rounded-xl font-semibold text-xs"
              disabled={updatingStatus}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmToggleStatus}
              disabled={updatingStatus}
              className={nextActiveStatus 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-4"
                : "bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs px-4"
              }
            >
              {updatingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Memproses...
                </>
              ) : nextActiveStatus ? (
                <>
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  Ya, Aktifkan Akun
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  Ya, Nonaktifkan Akun
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default KelolaMadrasah;
