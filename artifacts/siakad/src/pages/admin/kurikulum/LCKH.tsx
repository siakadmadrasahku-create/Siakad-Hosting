"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Trash2, Printer, Loader2, Calendar, ClipboardList, 
  Upload, X, ImageIcon, ArrowLeft, Save, Search, FileText, Tag
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Badge } from '@/components/ui/badge';
import { compressImage } from '@/utils/imageCompression';

interface LCKHItem {
  id: string;
  tanggal: string;
  jenis_kegiatan: string;
  kegiatan: string;
  hasil_capaian: string;
  foto_url: string;
  created_at: string;
}

const JENIS_KEGIATAN_OPTIONS = [
  'Intrakurikuler (KBM)',
  'Kokurikuler (P5RA)',
  'Ekstrakurikuler',
  'Pengembangan Diri / Pelatihan',
  'Administrasi / Rapat',
  'Tugas Tambahan',
  'Lainnya'
];

const LCKH = () => {
  const { settings } = useSiteSettings();
  const [data, setData] = useState<LCKHItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<LCKHItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 11, show_kop: true, show_signature: true
  };
  
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    jenis_kegiatan: 'Intrakurikuler (KBM)',
    kegiatan: '',
    hasil_capaian: '',
    foto_url: ''
  });

  useEffect(() => {
    fetchLCKH();
  }, []);

  const fetchLCKH = async () => {
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'lckh_guru_list')
        .maybeSingle();

      if (error) throw error;
      if (res?.value && Array.isArray(res.value)) {
        setData(res.value as LCKHItem[]);
      }
    } catch (error) {
      console.error('Error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `lckh-${Date.now()}.${fileExt}`;
      const filePath = `lckh/${fileName}`;
      await supabase.storage.from('public').upload(filePath, compressedFile);
      const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, foto_url: urlData.publicUrl }));
      showSuccess('Foto berhasil diunggah');
    } catch (error: any) {
      showError('Gagal unggah foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.kegiatan || !formData.hasil_capaian) {
      showError('Lengkapi data kegiatan!');
      return;
    }
    setIsSaving(true);
    try {
      const newItem: LCKHItem = { id: Date.now().toString(), ...formData, created_at: new Date().toISOString() };
      const newList = [newItem, ...data];
      await supabase.from('site_settings').upsert({ id: 'lckh_guru_list', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      setDialogOpen(false);
      setFormData({ tanggal: new Date().toISOString().split('T')[0], jenis_kegiatan: 'Intrakurikuler (KBM)', kegiatan: '', hasil_capaian: '', foto_url: '' });
      showSuccess('Laporan berhasil disimpan!');
    } catch (error: any) {
      showError('Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const newList = data.filter(d => d.id !== id);
      await supabase.from('site_settings').upsert({ id: 'lckh_guru_list', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      showSuccess('Laporan dihapus');
    } catch (error) {
      showError('Gagal menghapus');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const filteredData = data.filter(item => 
    item.kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tanggal.includes(searchQuery) ||
    item.jenis_kegiatan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (previewItem) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setPreviewItem(null)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Laporan
          </Button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto print:p-0 print:overflow-visible">
          <div id="print-area-lckh" className="mx-auto print:w-full">
            <div 
              className="bg-white mx-auto shadow-xl print:shadow-none print:m-0 print:p-0 print:w-full flex flex-col"
              style={{ 
                width: '210mm', 
                minHeight: printConfig.paper_size === 'F4' ? '330mm' : '297mm',
                padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {printConfig.show_kop && <KopSurat />}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold underline uppercase">LAPORAN CAPAIAN KINERJA HARIAN (LCKH)</h2>
                <p className="mt-1">Hari/Tanggal: {formatDate(previewItem.tanggal)}</p>
              </div>
              <div className="mb-6">
                <table className="w-full border-collapse border border-black">
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 w-1/3 bg-gray-50 font-bold">Jenis Kegiatan</td>
                      <td className="border border-black p-2">{previewItem.jenis_kegiatan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mb-8 flex-1">
                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 w-12">No</th>
                      <th className="border border-black p-2">Uraian Kegiatan</th>
                      <th className="border border-black p-2">Hasil / Capaian</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-3 text-center">1</td>
                      <td className="border border-black p-3 align-top" style={{ fontSize: `${printConfig.font_size}pt` }}>{previewItem.kegiatan}</td>
                      <td className="border border-black p-3 align-top" style={{ fontSize: `${printConfig.font_size}pt` }}>{previewItem.hasil_capaian}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-8">
                  <p className="font-bold mb-3">Lampiran / Dokumentasi Kegiatan:</p>
                  {previewItem.foto_url ? (
                    <div className="border border-black p-2 inline-block">
                      <img src={previewItem.foto_url} alt="Dokumentasi" className="max-w-full h-[300px] object-contain" />
                    </div>
                  ) : (
                    <div className="h-40 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 italic">
                      Tidak ada lampiran foto
                    </div>
                  )}
                </div>
              </div>
              {printConfig.show_signature && <PenandatanganDokumen />}
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              size: ${printConfig.paper_size === 'F4' ? '215mm 330mm' : 'A4'}; 
              margin: 0 !important; 
            }
            html, body { height: auto; background: white !important; margin: 0 !important; padding: 0 !important; }
            .print\\:hidden { display: none !important; }
            #print-area-lckh { width: 100% !important; margin: 0 !important; padding: 0 !important; }
            #print-area-lckh > div { 
              box-shadow: none !important; 
              border: none !important; 
              width: 100% !important; 
              min-height: 0 !important;
              padding: ${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm !important;
            }
          }
        ` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="LCKH Guru">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Cari tanggal..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
          <Plus className="w-4 h-4 mr-2" /> Buat Laporan Baru
        </Button>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[150px] font-bold">Tanggal</TableHead>
                <TableHead className="font-bold">Uraian Kegiatan</TableHead>
                <TableHead className="w-[100px] text-center font-bold">Lampiran</TableHead>
                <TableHead className="w-[150px] text-center font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center text-gray-500">Belum ada laporan kinerja.</TableCell></TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="text-sm">{formatDate(item.tanggal)}</div>
                      <Badge variant="outline" className="mt-1 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100">{item.jenis_kegiatan}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-gray-900 line-clamp-1">{item.kegiatan}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{item.hasil_capaian}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.foto_url ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden mx-auto border"><img src={item.foto_url} alt="Doc" className="w-full h-full object-cover" /></div>
                      ) : <ImageIcon className="w-5 h-5 text-gray-300 mx-auto" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPreviewItem(item)} className="rounded-lg text-blue-600"><Printer className="w-4 h-4 mr-1" /> Cetak</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Input Laporan Kinerja Harian</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tanggal Kegiatan</label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Jenis Kegiatan</label>
                <Select value={formData.jenis_kegiatan} onValueChange={(v) => setFormData({...formData, jenis_kegiatan: v})}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS_KEGIATAN_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Uraian Kegiatan</label>
              <Textarea placeholder="Uraian..." value={formData.kegiatan} onChange={(e) => setFormData({...formData, kegiatan: e.target.value})} className="rounded-xl min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Hasil / Capaian</label>
              <Textarea placeholder="Hasil..." value={formData.hasil_capaian} onChange={(e) => setFormData({...formData, hasil_capaian: e.target.value})} className="rounded-xl min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Lampiran Foto</label>
              {formData.foto_url ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-100 group aspect-video max-w-xs">
                  <img src={formData.foto_url} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setFormData({...formData, foto_url: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                  <div className="flex flex-col items-center justify-center">
                    {uploading ? <Loader2 className="w-8 h-8 animate-spin text-emerald-500" /> : <Upload className="w-8 h-8 text-gray-400" />}
                    <p className="text-xs text-gray-500 mt-2">Klik untuk unggah foto</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl h-12">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving || uploading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Laporan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default LCKH;