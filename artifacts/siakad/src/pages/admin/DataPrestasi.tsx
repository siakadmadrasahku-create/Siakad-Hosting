"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Trophy, Plus, Pencil, Trash2, Search, Printer, FileSpreadsheet,
  Save, Medal, Award, Calendar, Users, Filter, Sparkles
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { useMadrasah } from '@/contexts/MadrasahContext';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import * as XLSX from 'xlsx';

export interface PrestasiItem {
  id: string;
  nama_siswa: string;
  tanggal_kegiatan: string;
  jenis_lomba: string;
  tingkat: 'Kecamatan' | 'Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional' | string;
  juara_ke: string;
  penyelenggara?: string;
  keterangan?: string;
}

const defaultPrestasiList: PrestasiItem[] = [
  {
    id: 'p1',
    nama_siswa: 'Ahmad Fauzi & Tim Regu',
    tanggal_kegiatan: '2024-05-12',
    jenis_lomba: 'KSM (Kompetisi Sains Madrasah) Matematika',
    tingkat: 'Kabupaten',
    juara_ke: 'Juara 1',
    penyelenggara: 'Kemenag Kabupaten',
    keterangan: 'Maju Tingkat Provinsi'
  },
  {
    id: 'p2',
    nama_siswa: 'Siti Nurhaliza',
    tanggal_kegiatan: '2024-03-20',
    jenis_lomba: 'Lomba MTQ Remaja & Kaligrafi',
    tingkat: 'Kecamatan',
    juara_ke: 'Juara 1',
    penyelenggara: 'KKMI Kecamatan',
    keterangan: 'Mendapat Piala Bergilir'
  },
  {
    id: 'p3',
    nama_siswa: 'Tim Pramuka Penggalang',
    tanggal_kegiatan: '2023-11-10',
    jenis_lomba: 'Lomba Tingkat LT-III Pramuka',
    tingkat: 'Kabupaten',
    juara_ke: 'Juara 2',
    penyelenggara: 'Kwarcab Pramuka',
    keterangan: 'Tropy & Sertifikat Penghargaan'
  }
];

const DataPrestasi = () => {
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const [loading, setLoading] = useState(true);
  const [prestasiList, setPrestasiList] = useState<PrestasiItem[]>(defaultPrestasiList);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('all');
  const [prestasiModalOpen, setPrestasiModalOpen] = useState(false);
  const [editingPrestasi, setEditingPrestasi] = useState<PrestasiItem | null>(null);

  const [prestasiForm, setPrestasiForm] = useState<Omit<PrestasiItem, 'id'>>({
    nama_siswa: '',
    tanggal_kegiatan: new Date().toISOString().split('T')[0],
    jenis_lomba: 'KSM (Kompetisi Sains Madrasah)',
    tingkat: 'Kabupaten',
    juara_ke: 'Juara 1',
    penyelenggara: '',
    keterangan: '',
  });

  useEffect(() => {
    fetchPrestasi();
  }, [activeMadrasah.id]);

  const fetchPrestasi = async () => {
    setLoading(true);
    try {
      const prestasiKey = getScopedKey('prestasi_madrasah');
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', prestasiKey)
        .maybeSingle();

      if (error) throw error;

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        setPrestasiList(data.value);
      } else {
        setPrestasiList(defaultPrestasiList);
      }
    } catch (err: any) {
      console.error('Error fetching data prestasi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrestasiList = async (newList: PrestasiItem[]) => {
    setPrestasiList(newList);
    try {
      const prestasiKey = getScopedKey('prestasi_madrasah');
      await supabase
        .from('site_settings')
        .upsert({ id: prestasiKey, value: newList, updated_at: new Date().toISOString() });
      showSuccess('Data prestasi siswa/madrasah berhasil disimpan!');
    } catch (e: any) {
      showError('Gagal menyimpan data prestasi: ' + e.message);
    }
  };

  const handleOpenAdd = () => {
    setEditingPrestasi(null);
    setPrestasiForm({
      nama_siswa: '',
      tanggal_kegiatan: new Date().toISOString().split('T')[0],
      jenis_lomba: '',
      tingkat: 'Kabupaten',
      juara_ke: 'Juara 1',
      penyelenggara: '',
      keterangan: '',
    });
    setPrestasiModalOpen(true);
  };

  const handleOpenEdit = (item: PrestasiItem) => {
    setEditingPrestasi(item);
    setPrestasiForm({
      nama_siswa: item.nama_siswa,
      tanggal_kegiatan: item.tanggal_kegiatan,
      jenis_lomba: item.jenis_lomba,
      tingkat: item.tingkat,
      juara_ke: item.juara_ke,
      penyelenggara: item.penyelenggara || '',
      keterangan: item.keterangan || '',
    });
    setPrestasiModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan prestasi ini?')) {
      const updated = prestasiList.filter(item => item.id !== id);
      handleSavePrestasiList(updated);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPrestasi) {
      const updated = prestasiList.map(item =>
        item.id === editingPrestasi.id
          ? { ...prestasiForm, id: editingPrestasi.id }
          : item
      );
      handleSavePrestasiList(updated);
    } else {
      const newItem: PrestasiItem = {
        ...prestasiForm,
        id: Date.now().toString(),
      };
      handleSavePrestasiList([newItem, ...prestasiList]);
    }
    setPrestasiModalOpen(false);
  };

  const filteredList = prestasiList.filter(item => {
    const matchSearch =
      item.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jenis_lomba.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.penyelenggara && item.penyelenggara.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchTingkat = filterTingkat === 'all' || item.tingkat === filterTingkat;
    return matchSearch && matchTingkat;
  });

  // Stats
  const totalPrestasi = prestasiList.length;
  const totalJuara1 = prestasiList.filter(p => p.juara_ke.toLowerCase().includes('juara 1') || p.juara_ke.toLowerCase().includes('juara i')).length;
  const totalKabupatenProvinsi = prestasiList.filter(p => ['Kabupaten', 'Provinsi', 'Nasional', 'Internasional'].includes(p.tingkat)).length;

  const exportExcel = () => {
    const exportData = prestasiList.map((p, idx) => ({
      No: idx + 1,
      'Nama Siswa / Tim': p.nama_siswa,
      'Tanggal Kegiatan': p.tanggal_kegiatan,
      'Jenis Lomba': p.jenis_lomba,
      'Tingkat Lomba': p.tingkat,
      'Juara Ke': p.juara_ke,
      'Penyelenggara': p.penyelenggara || '-',
      'Keterangan': p.keterangan || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Prestasi");
    XLSX.writeFile(wb, `Data_Prestasi_Madrasah_${activeMadrasah.nama_madrasah || 'Madrasah'}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Printable Header */}
        <div className="hidden print:block mb-6">
          <KopSurat />
          <div className="text-center my-4">
            <h2 className="text-base font-bold uppercase underline">DAFTAR PRESTASI &amp; KEJUARAAN MADRASAH</h2>
            <p className="text-xs">{activeMadrasah.nama_madrasah || 'Madrasah'}</p>
          </div>
        </div>

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden print:hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-amber-600/60 backdrop-blur-md px-3 py-1 rounded-full text-amber-200 text-xs font-semibold border border-amber-400/30">
                <Trophy className="w-4 h-4 text-amber-300" />
                Modul Data Lembaga Madrasah
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Data Prestasi &amp; Kejuaraan Madrasah
              </h1>
              <p className="text-amber-100/90 text-xs sm:text-sm max-w-xl">
                Dokumentasi capaian prestasi siswa, guru, dan regu madrasah dalam kejuaraan lomba akademik maupun non-akademik.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={handleOpenAdd}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs gap-2 px-5 py-6 shadow-lg shadow-amber-950/20"
              >
                <Plus className="w-4 h-4" /> Catat Prestasi Baru
              </Button>
              <Button
                type="button"
                onClick={exportExcel}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" /> Export Excel
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold gap-2 px-4 py-6"
              >
                <Printer className="w-4 h-4 text-amber-300" /> Cetak Data
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <Card className="border-0 shadow-md rounded-2xl bg-amber-50/50 border border-amber-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Prestasi Tercatat</p>
                <p className="text-2xl font-black text-amber-950 mt-1">{totalPrestasi} Kejuaraan</p>
                <p className="text-[11px] text-amber-700 mt-1">Akademik &amp; Non-Akademik</p>
              </div>
              <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Trophy className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Capaian Juara 1</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">{totalJuara1} Tropi / Emas</p>
                <p className="text-[11px] text-emerald-700 mt-1">Juara Utama Pertama</p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Medal className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-blue-50/50 border border-blue-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Tingkat Kab/Prov/Nasional</p>
                <p className="text-2xl font-black text-blue-950 mt-1">{totalKabupatenProvinsi} Prestasi</p>
                <p className="text-[11px] text-blue-700 mt-1">Di Luar Tingkat Kecamatan</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Award className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table Card */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Trophy className="w-5 h-5 text-amber-600" /> Daftar Rekapitulasi Kejuaraan &amp; Prestasi
              </CardTitle>
              <CardDescription className="text-xs">
                Filter dan cari catatan riwayat prestasi siswa serta penyelenggara kegiatan.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Select value={filterTingkat} onValueChange={setFilterTingkat}>
                <SelectTrigger className="w-full sm:w-44 rounded-xl text-xs font-bold border-slate-200">
                  <SelectValue placeholder="Semua Tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tingkat Lomba</SelectItem>
                  <SelectItem value="Kecamatan">Kecamatan</SelectItem>
                  <SelectItem value="Kabupaten">Kabupaten / Kota</SelectItem>
                  <SelectItem value="Provinsi">Provinsi</SelectItem>
                  <SelectItem value="Nasional">Nasional</SelectItem>
                  <SelectItem value="Internasional">Internasional</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Cari siswa / nama lomba..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl text-xs bg-white border-slate-200"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px]">
                    <TableHead className="w-12 text-center p-3">No</TableHead>
                    <TableHead className="p-3">Nama Siswa / Tim</TableHead>
                    <TableHead className="p-3 text-center">Tanggal</TableHead>
                    <TableHead className="p-3">Jenis Lomba / Kejuaraan</TableHead>
                    <TableHead className="text-center p-3">Tingkat</TableHead>
                    <TableHead className="text-center p-3">Juara Ke</TableHead>
                    <TableHead className="p-3">Penyelenggara</TableHead>
                    <TableHead className="p-3">Keterangan</TableHead>
                    <TableHead className="w-24 text-center p-3 print:hidden">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                        Belum ada catatan prestasi yang sesuai. Klik "Catat Prestasi Baru" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((item, idx) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-bold text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-slate-900">{item.nama_siswa}</TableCell>
                        <TableCell className="text-center font-mono text-slate-600">{item.tanggal_kegiatan}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{item.jenis_lomba}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 font-bold border-0 text-[10px]">
                            {item.tingkat}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                            {item.juara_ke}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{item.penyelenggara || '-'}</TableCell>
                        <TableCell className="text-slate-600 max-w-xs truncate">{item.keterangan || '-'}</TableCell>
                        <TableCell className="text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Printable Signature */}
        <div className="hidden print:block mt-12">
          <PenandatanganDokumen />
        </div>

        {/* Modal Form Dialog */}
        <Dialog open={prestasiModalOpen} onOpenChange={setPrestasiModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-800">
                <Trophy className="w-5 h-5 text-amber-600" />
                {editingPrestasi ? 'Edit Data Prestasi Madrasah' : 'Tambah Data Prestasi Madrasah'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Catat rincian juara kejuaraan lomba akademik maupun non-akademik siswa.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveForm} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Siswa / Tim Regu</label>
                <Input
                  required
                  placeholder="Contoh: Ahmad Fauzi / Tim Regu Pramuka"
                  value={prestasiForm.nama_siswa}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, nama_siswa: e.target.value })}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Kegiatan</label>
                  <Input
                    type="date"
                    required
                    value={prestasiForm.tanggal_kegiatan}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, tanggal_kegiatan: e.target.value })}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Lomba</label>
                  <Select
                    value={prestasiForm.tingkat}
                    onValueChange={(val) => setPrestasiForm({ ...prestasiForm, tingkat: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Pilih tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kecamatan">Kecamatan</SelectItem>
                      <SelectItem value="Kabupaten">Kabupaten / Kota</SelectItem>
                      <SelectItem value="Provinsi">Provinsi</SelectItem>
                      <SelectItem value="Nasional">Nasional</SelectItem>
                      <SelectItem value="Internasional">Internasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Lomba</label>
                  <Input
                    required
                    placeholder="Porseni, AXIOMA, KSM, OSN, Pramuka..."
                    value={prestasiForm.jenis_lomba}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, jenis_lomba: e.target.value })}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Juara Ke</label>
                  <Input
                    required
                    placeholder="Juara 1, Juara 2, Harapan 1..."
                    value={prestasiForm.juara_ke}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, juara_ke: e.target.value })}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Penyelenggara Kegiatan</label>
                <Input
                  placeholder="Kemenag Kab / KKMI / Dll"
                  value={prestasiForm.penyelenggara || ''}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, penyelenggara: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Tambahan (Opsional)</label>
                <Input
                  placeholder="Lolos provinsi, Piala bergilir, dll"
                  value={prestasiForm.keterangan || ''}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, keterangan: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrestasiModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Save className="w-4 h-4" /> Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default DataPrestasi;
