"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Shield, Mail, UserPlus, Pencil, Trash2, Search, Loader2, School, Phone, IdCard, Building } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { useMadrasah } from '@/contexts/MadrasahContext';

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  email?: string;
  nip?: string;
  phone?: string;
  madrasah_id?: string;
  madrasah_name?: string;
  updated_at: string;
}

const UsersAdmin = () => {
  const { activeMadrasah, activeMadrasahId, madrasahs, getScopedKey } = useMadrasah();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({ 
    full_name: '', 
    role: 'guru', 
    email: '', 
    nip: '', 
    phone: '',
    target_madrasah_id: activeMadrasahId 
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const storageKey = getScopedKey('user_profiles_list');
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (error) throw error;

      if (res?.value && Array.isArray(res.value)) {
        setUsers(res.value as Profile[]);
      } else {
        // Default users scoped for this madrasah if first time
        const defaultList: Profile[] = [
          { 
            id: `usr_${activeMadrasahId}_1`, 
            full_name: `Administrator - ${activeMadrasah.nama_madrasah}`, 
            role: 'admin', 
            email: activeMadrasah.email || `admin@${activeMadrasah.id}.sch.id`, 
            madrasah_id: activeMadrasah.id,
            madrasah_name: activeMadrasah.nama_madrasah,
            updated_at: new Date().toISOString() 
          },
          { 
            id: `usr_${activeMadrasahId}_2`, 
            full_name: activeMadrasah.nama_pimpinan || 'Guru Utama', 
            role: 'guru', 
            email: `guru@${activeMadrasah.id}.sch.id`, 
            nip: activeMadrasah.nip_pimpinan || '198501012010011001',
            madrasah_id: activeMadrasah.id,
            madrasah_name: activeMadrasah.nama_madrasah,
            updated_at: new Date().toISOString() 
          }
        ];
        setUsers(defaultList);
        await supabase
          .from('site_settings')
          .upsert({ id: storageKey, value: defaultList, updated_at: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Gagal memuat data guru/user');
    } finally {
      setLoading(false);
    }
  }, [activeMadrasah, activeMadrasahId, getScopedKey]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSave = async () => {
    if (!formData.full_name || !formData.email) {
      showError('Nama dan Email wajib diisi!');
      return;
    }

    setSaving(true);
    try {
      const storageKey = getScopedKey('user_profiles_list');
      let newList: Profile[];

      if (editingUser) {
        newList = users.map(u => u.id === editingUser.id ? { 
          ...editingUser,
          full_name: formData.full_name,
          role: formData.role,
          email: formData.email,
          nip: formData.nip,
          phone: formData.phone,
          madrasah_id: activeMadrasah.id,
          madrasah_name: activeMadrasah.nama_madrasah,
          updated_at: new Date().toISOString() 
        } : u);
      } else {
        const newUser: Profile = { 
          id: `usr_${Date.now()}`,
          full_name: formData.full_name,
          role: formData.role,
          email: formData.email,
          nip: formData.nip,
          phone: formData.phone,
          madrasah_id: activeMadrasah.id,
          madrasah_name: activeMadrasah.nama_madrasah,
          updated_at: new Date().toISOString() 
        };
        newList = [newUser, ...users];
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: storageKey, value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;

      setUsers(newList);
      showSuccess(editingUser ? 'Data Guru / User diperbarui!' : 'Guru / User baru berhasil ditambahkan!');
      setDialogOpen(false);
    } catch (error) {
      showError('Gagal menyimpan data user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus user/guru ini?')) return;

    try {
      const storageKey = getScopedKey('user_profiles_list');
      const newList = users.filter(u => u.id !== id);
      await supabase.from('site_settings').upsert({ id: storageKey, value: newList, updated_at: new Date().toISOString() });
      setUsers(newList);
      showSuccess('Guru / User berhasil dihapus');
    } catch (error) {
      showError('Gagal menghapus user');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.nip || '').includes(searchQuery)
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-red-100 text-red-700 border-red-200">Administrator</Badge>;
      case 'guru': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Guru Tenaga Pendidik</Badge>;
      case 'staff': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Staf TU</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-700 border-slate-200">User Biasa</Badge>;
    }
  };

  return (
    <AdminLayout title="Manajemen Guru & User (Multi-Tenant)">
      {/* Banner Scoped Madrasah */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl mb-6 overflow-hidden">
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 text-white border border-white/20">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500 text-white border-0 text-[10px]">Data Terisolasi</Badge>
                <span className="text-xs text-emerald-200 font-mono">ID: {activeMadrasah.id}</span>
              </div>
              <h2 className="text-lg font-extrabold text-white mt-0.5">{activeMadrasah.nama_madrasah}</h2>
              <p className="text-xs text-emerald-100/80">
                Menampilkan {users.length} guru & staf khusus pada madrasah ini. Data guru pada madrasah ini tidak mempengaruhi madrasah lain.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setEditingUser(null);
              setFormData({ 
                full_name: '', 
                role: 'guru', 
                email: '', 
                nip: '', 
                phone: '',
                target_madrasah_id: activeMadrasahId 
              });
              setDialogOpen(true);
            }} 
            className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-2xl shrink-0 shadow-md"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Tambah Guru / Staf
          </Button>
        </CardContent>
      </Card>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Cari nama, NIP, atau email guru..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl bg-white border-slate-200"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Guru / User Aktif: <strong className="text-slate-900">{filteredUsers.length} Orang</strong>
        </div>
      </div>

      {/* List Grid */}
      <div className="grid gap-4">
        {loading ? (
          [1, 2, 3].map(i => <Card key={i} className="h-24 animate-pulse bg-slate-100 border-0 rounded-2xl" />)
        ) : filteredUsers.length === 0 ? (
          <Card className="border-0 shadow-lg p-12 text-center rounded-3xl bg-white">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-bold">Belum ada guru/user terdaftar di madrasah ini</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol 'Tambah Guru / Staf' di atas untuk menambah data baru.</p>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-white overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-bold shrink-0 shadow-sm">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 truncate">{user.full_name || 'Tanpa Nama'}</h3>
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {user.email || '-'}
                        </span>
                        {user.nip && (
                          <span className="flex items-center gap-1 font-mono">
                            <IdCard className="w-3.5 h-3.5 text-slate-400" /> NIP: {user.nip}
                          </span>
                        )}
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingUser(user);
                      setFormData({ 
                        full_name: user.full_name || '', 
                        role: user.role || 'guru', 
                        email: user.email || '', 
                        nip: user.nip || '',
                        phone: user.phone || '',
                        target_madrasah_id: activeMadrasahId
                      });
                      setDialogOpen(true);
                    }} className="rounded-xl border-slate-200 hover:bg-slate-50">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)} className="rounded-xl border-slate-200 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingUser ? 'Edit Data Guru / Staf' : 'Tambah Guru / Staf Baru'}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Menambahkan data ke: <strong>{activeMadrasah.nama_madrasah}</strong>
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="rounded-xl"
                placeholder="Contoh: Drs. H. Ahmad Dahlan, M.Pd"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-xl"
                  placeholder="guru@madrasah.sch.id"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NIP (Opsional)</label>
                <Input
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="rounded-xl"
                  placeholder="19850101..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Jabatan</label>
                <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guru">Guru Tenaga Pendidik</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="staff">Staf TU / Administrasi</SelectItem>
                    <SelectItem value="user">User Biasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / Telepon</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-xl"
                  placeholder="08123456789"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Simpan Guru'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersAdmin;
