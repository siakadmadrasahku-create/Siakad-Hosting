"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Trash2, Loader2, Calendar, Phone, Printer, ArrowLeft, Pencil, Save, RefreshCw,
  FileText, Eye, Download, X, ImageIcon, User, School as SchoolIcon, UserPlus, CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/components/admin/AdminLayout';
import { showSuccess, showError } from '@/utils/toast';
import KopSurat from '@/components/KopSurat';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const DaftarPendaftar = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [data, setData] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  
  // State untuk Edit Status
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // State untuk Lihat Berkas
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [viewDocsItem, setViewDocsItem] = useState<any>(null);

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 11, show_kop: true, show_signature: true
  };

  const penandatangan = settings.penandatangan || {};
  const identitas = settings.identitas_madrasah || {};

  useEffect(() => {
    fetchPendaftar();
  }, []);

  const fetchPendaftar = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', ['pendaftaran_spmb_list', 'kelas_list']);

      if (error) throw error;
      
      const pendaftarRes = res?.find(s => s.id === 'pendaftaran_spmb_list');
      setData(pendaftarRes?.value || []);

      const kelasRes = res?.find(s => s.id === 'kelas_list');
      setClasses(kelasRes?.value || []);
    } catch (error: any) {
      showError('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedItem) return;
    setIsUpdating(true);
    try {
      const newList = data.map(item => 
        item.id === selectedItem.id ? { ...item, status: newStatus } : item
      );

      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'pendaftaran_spmb_list', 
          value: newList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setData(newList);
      await refreshSettings();
      showSuccess(`Status ${selectedItem.data.nama_lengkap} berhasil diperbarui!`);
      setStatusDialogOpen(false);
    } catch (error: any) {
      showError('Gagal memperbarui status: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePromoteToStudent = async (pendaftar: any) => {
    if (!window.confirm(`Terima ${pendaftar.data.nama_lengkap} and masukkan ke database siswa aktif?`)) return;
    
    setIsUpdating(true);
    try {
      // 1. Ambil data siswa saat ini
      const { data: studentRes } = await supabase.from('site_settings').select('value').eq('id', 'students_list').maybeSingle();
      const currentStudents = studentRes?.value || [];

      // 2. Cek apakah sudah ada
      if (currentStudents.some((s: any) => s.nik === pendaftar.data.nik)) {
        showError('Siswa dengan NIK ini sudah ada di database aktif!');
        return;
      }

      // 3. Buat objek siswa baru
      const newStudent = {
        id: `std-${Date.now()}`,
        name: pendaftar.data.nama_lengkap,
        nisn: pendaftar.data.nisn || '',
        nik: pendaftar.data.nik,
        class_id: classes[0]?.id || '', // Default ke kelas pertama jika ada
        gender: pendaftar.data.jenis_kelamin,
        parent_name: pendaftar.data.nama_ayah || pendaftar.data.nama_ibu,
        phone: pendaftar.data.no_hp_ayah || pendaftar.data.no_hp_ibu,
        address: pendaftar.data.alamat_lengkap,
        status: 'active',
        created_at: new Date().toISOString()
      };

      // 4. Update database siswa
      const updatedStudentsList = [newStudent, ...currentStudents];
      await supabase.from('site_settings').upsert({ 
        id: 'students_list', 
        value: updatedStudentsList,
        updated_at: new Date().toISOString()
      });

      // Cache & Event notification
      try {
        const cachedStr = localStorage.getItem('siakad_site_settings');
        const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
        settingsObj.students_list = updatedStudentsList;
        localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
      } catch (e) {
        console.warn('Failed to update localStorage cache:', e);
      }

      window.dispatchEvent(new CustomEvent('students_data_updated', { detail: { students: updatedStudentsList } }));
      window.dispatchEvent(new Event('rekapitulasi_updated'));
      window.dispatchEvent(new Event('storage'));

      // 5. Update status pendaftar menjadi 'diterima'
      const newList = data.map(item => 
        item.id === pendaftar.id ? { ...item, status: 'diterima' } : item
      );
      await supabase.from('site_settings').upsert({ id: 'pendaftaran_spmb_list', value: newList });

      setData(newList);
      showSuccess(`${pendaftar.data.nama_lengkap} resmi menjadi siswa aktif!`);
    } catch (error: any) {
      showError('Gagal memproses: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus data pendaftar ini secara PERMANEN?')) return;
    
    try {
      const newList = data.filter(item => item.id !== id);
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'pendaftaran_spmb_list', 
          value: newList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setData(newList);
      await refreshSettings();
      showSuccess('Data berhasil dihapus permanen!');
    } catch (error: any) {
      showError('Gagal menghapus data: ' + error.message);
    }
  };

  const downloadBase64 = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    link.click();
  };

  const filteredData = data.filter(item => {
    const s = searchQuery.toLowerCase();
    const d = item.data;
    return (
      d.nama_lengkap?.toLowerCase().includes(s) ||
      d.nik?.includes(s) ||
      d.nisn?.includes(s) ||
      d.sekolah_asal?.toLowerCase().includes(s)
    );
  });

  if (isPrinting) {
    const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const kota = identitas.kabupaten || 'Indonesia';

    return (
      <div className="min-h-screen bg-white p-0">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Laporan
          </Button>
        </div>

        <div 
          id="print-rekap-spmb" 
          className="mx-auto print:w-full flex flex-col"
          style={{ 
            width: printConfig.paper_size === 'A4' ? '297mm' : '330mm', 
            padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
            boxSizing: 'border-box'
          }}
        >
          {printConfig.show_kop && <KopSurat />}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold underline uppercase">REKAPITULASI PENDAFTARAN SISWA BARU</h2>
            <p className="mt-1">Tahun Ajaran {settings.tahun_pelajaran?.spmb_year || '2025/2026'}</p>
          </div>

          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center w-8">No</th>
                <th className="border border-black p-2 text-left">Nama Lengkap</th>
                <th className="border border-black p-2 text-center">NISN</th>
                <th className="border border-black p-2 text-center">L/P</th>
                <th className="border border-black p-2 text-left">Tempat, Tgl Lahir</th>
                <th className="border border-black p-2 text-left">Sekolah Asal</th>
                <th className="border border-black p-2 text-left">Nama Orang Tua</th>
                <th className="border border-black p-2 text-center">No. HP</th>
                <th className="border border-black p-2 text-center">Kelas</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: `${printConfig.font_size - 1}pt` }}>
              {filteredData.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-black p-2 text-center">{idx + 1}</td>
                  <td className="border border-black p-2 font-bold">{item.data.nama_lengkap}</td>
                  <td className="border border-black p-2 text-center">{item.data.nisn || '-'}</td>
                  <td className="border border-black p-2 text-center">{item.data.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                  <td className="border border-black p-2">{item.data.tempat_lahir}, {item.data.tanggal_lahir}</td>
                  <td className="border border-black p-2">{item.data.sekolah_asal}</td>
                  <td className="border border-black p-2">{item.data.nama_ayah || item.data.nama_ibu}</td>
                  <td className="border border-black p-2 text-center">{item.data.no_hp_ayah || item.data.no_hp_ibu}</td>
                  <td className="border border-black p-2 text-center">{item.data.pilihan_kelas}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {printConfig.show_signature && (
            <div className="mt-12 grid grid-cols-2 gap-12 text-[11pt] font-serif">
              <div className="text-center">
                <p>Mengetahui,</p>
                <p className="mb-20">{penandatangan.kepala_jabatan || 'Kepala Madrasah'},</p>
                <div className="relative inline-block">
                  {penandatangan.kepala_tanda_tangan_url && (
                    <img src={penandatangan.kepala_tanda_tangan_url} alt="TTD" className="absolute -top-16 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply" />
                  )}
                  <p className="font-bold underline uppercase">{penandatangan.kepala_nama || '[Nama Kepala]'}</p>
                </div>
                <p>NIP. {penandatangan.kepala_nip || '-'}</p>
              </div>
              <div className="text-center">
                <p className="mb-1">{kota}, {tglCetak}</p>
                <p className="mb-20">Ketua Panitia SPMB,</p>
                <div className="relative inline-block">
                  {penandatangan.ketua_panitia_tanda_tangan_url && (
                    <img src={penandatangan.ketua_panitia_tanda_tangan_url} alt="TTD" className="absolute -top-16 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply" />
                  )}
                  <p className="font-bold underline uppercase">{penandatangan.ketua_panitia_nama || '[Nama Ketua Panitia]'}</p>
                </div>
                <p>NIP. {penandatangan.ketua_panitia_nip || '-'}</p>
              </div>
            </div>
          )}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: ${printConfig.paper_size === 'F4' ? '330mm 215mm' : 'A4 landscape'}; margin: 0 !important; }
            body { background: white !important; }
            .print\\:hidden { display: none !important; }
            #print-rekap-spmb { width: 100% !important; margin: 0 !important; padding: ${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm !important; }
          }
        ` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Rekapitulasi Pendaftaran">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Cari nama, NIK, NISN..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchPendaftar} className="rounded-xl">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={() => setIsPrinting(true)} className="bg-blue-600 text-white rounded-xl font-bold">
              <Printer className="w-4 h-4 mr-2" /> Cetak Rekapitulasi
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold">Tanggal Daftar</TableHead>
                  <TableHead className="font-bold">Nama Lengkap</TableHead>
                  <TableHead className="font-bold">Sekolah Asal</TableHead>
                  <TableHead className="font-bold text-center">Berkas</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-gray-500">Belum ada pendaftar.</TableCell></TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-gray-900">{item.data.nama_lengkap}</div>
                        <div className="text-[10px] text-gray-400 uppercase">NIK: {item.data.nik} | NISN: {item.data.nisn || '-'}</div>
                      </TableCell>
                      <TableCell className="text-sm">{item.data.sekolah_asal}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setViewDocsItem(item); setDocsDialogOpen(true); }}
                          className="text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {Object.values(item.data.docs || {}).filter(v => !!v).length} Berkas
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={
                          item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                          item.status === 'diterima' ? 'bg-emerald-100 text-emerald-700' : 
                          'bg-red-100 text-red-700'
                        }>
                          {item.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          {item.status !== 'diterima' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handlePromoteToStudent(item)}
                              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                              title="Terima & Jadikan Siswa"
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedItem(item);
                              setNewStatus(item.status);
                              setStatusDialogOpen(true);
                            }} 
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Dialog Lihat Berkas */}
      <Dialog open={docsDialogOpen} onOpenChange={setDocsDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Berkas Pendaftaran: {viewDocsItem?.data?.nama_lengkap}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {[
              { id: 'akta', label: 'Akta Kelahiran' },
              { id: 'kk', label: 'Kartu Keluarga' },
              { id: 'foto', label: 'Pas Foto' },
              { id: 'ijazah', label: 'Ijazah / SKL' },
            ].map((doc) => {
              const base64 = viewDocsItem?.data?.docs?.[doc.id];
              return (
                <Card key={doc.id} className="border-0 shadow-sm bg-slate-50 overflow-hidden">
                  <div className="p-3 border-b bg-white flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-slate-500">{doc.label}</span>
                    {base64 && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => downloadBase64(base64, `${doc.id}-${viewDocsItem.data.nama_lengkap}.jpg`)}
                        className="h-7 text-[10px] font-bold text-blue-600"
                      >
                        <Download className="w-3 h-3 mr-1" /> UNDUH
                      </Button>
                    )}
                  </div>
                  <CardContent className="p-4 flex items-center justify-center min-h-[200px]">
                    {base64 ? (
                      <img src={base64} className="max-w-full max-h-[300px] object-contain rounded-lg shadow-md" alt={doc.label} />
                    ) : (
                      <div className="text-center text-slate-300">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-[10px] font-bold uppercase">Belum Diupload</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-6 pt-6 border-t flex justify-end">
            <Button onClick={() => setDocsDialogOpen(false)} className="bg-slate-900 text-white rounded-xl px-8">Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Status */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ubah Status Pendaftar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-gray-50 rounded-xl border">
              <p className="text-xs text-gray-400 uppercase font-bold mb-1">Nama Pendaftar</p>
              <p className="font-bold text-gray-900">{selectedItem?.data?.nama_lengkap}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Pilih Status Baru</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">PENDING (Menunggu)</SelectItem>
                  <SelectItem value="diterima">DITERIMA</SelectItem>
                  <SelectItem value="ditolak">DITOLAK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)} className="flex-1 rounded-xl">Batal</Button>
              <Button 
                onClick={handleUpdateStatus} 
                disabled={isUpdating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default DaftarPendaftar;