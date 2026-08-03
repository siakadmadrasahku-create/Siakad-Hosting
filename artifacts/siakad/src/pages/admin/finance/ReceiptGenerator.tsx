"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Printer, Save, Trash2, Receipt, Upload, X, 
  ImageIcon, Loader2, ArrowLeft, Sparkles, History,
  User, Banknote, FileText, MapPin, Calendar, Fingerprint,
  Building, Phone, Globe, Mail, Layout, FolderOpen, RefreshCw
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import ReceiptTemplate from '@/components/ReceiptTemplate';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { compressSignature, compressImage } from '@/utils/imageCompression';
import { Badge } from '@/components/ui/badge';

interface SavedReceipt {
  id: string;
  no_kuitansi: string;
  penerima: string;
  nominal: number;
  keperluan: string;
  tanggal: string;
  created_at: string;
  custom_kop?: {
    nama_yayasan?: string;
    nama_madrasah?: string;
    alamat?: string;
    telepon?: string;
    email?: string;
    website?: string;
    logo_url?: string;
  };
}

const ReceiptGenerator = () => {
  const { settings } = useSiteSettings();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  
  const [formData, setFormData] = useState({
    no_kuitansi: `KW-${Date.now().toString().slice(-6)}`,
    penerima: '',
    nominal: 0,
    keperluan: '',
    tanggal: new Date().toISOString().split('T')[0],
    tempat: settings.identitas_madrasah?.kabupaten || 'Indonesia',
    nama_petugas: settings.general?.headmaster_name || '',
    ttd_url: settings.penandatangan?.ketua_panitia_tanda_tangan_url || '',
    stamp_url: '',
    custom_kop: {

      nama_yayasan: settings.identitas_madrasah?.nama_yayasan || '',
      nama_madrasah: settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || '',
      alamat: settings.identitas_madrasah?.alamat || settings.general?.address || '',
      telepon: settings.identitas_madrasah?.telepon || '',
      email: settings.identitas_madrasah?.email || '',
      website: settings.identitas_madrasah?.website || '',
      logo_url: settings.identitas_madrasah?.logo_url || '',
    }
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'saved_receipts_list').maybeSingle();
      if (res?.value) setSavedReceipts(res.value as SavedReceipt[]);
    } catch (err) { console.error(err); } finally { setLoadingHistory(false); }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ttd' | 'logo' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    try {
      const compressedFile = type === 'ttd' ? await compressSignature(file) : await compressImage(file);
      const fileName = `receipt-${type}-${Date.now()}.${file.name.split('.').pop()}`;
      const folder = type === 'ttd' ? 'signatures' : type === 'stamp' ? 'stamps' : 'madrasah';
      const filePath = `${folder}/${fileName}`;
      await supabase.storage.from('public').upload(filePath, compressedFile);
      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      if (type === 'ttd') {
        setFormData(prev => ({ ...prev, ttd_url: data.publicUrl }));
      } else if (type === 'stamp') {
        setFormData(prev => ({ ...prev, stamp_url: data.publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, custom_kop: { ...prev.custom_kop, logo_url: data.publicUrl } }));
      }
      showSuccess('Gambar berhasil diperbarui!');
    } catch (err) { showError(`Gagal mengunggah ${type}`); } finally { setUploading(null); }
  };

  const handleSave = async () => {
    if (!formData.penerima || formData.nominal <= 0) { showError('Lengkapi data!'); return; }
    setIsSaving(true);
    try {
      const newReceipt = { ...formData, id: `rcp-${Date.now()}`, created_at: new Date().toISOString() };
      const newList = [newReceipt, ...savedReceipts];
      await supabase.from('site_settings').upsert({ id: 'saved_receipts_list', value: newList, updated_at: new Date().toISOString() });
      setSavedReceipts(newList as any);
      showSuccess('Kuitansi disimpan!');
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus?')) return;
    const newList = savedReceipts.filter(r => r.id !== id);
    await supabase.from('site_settings').upsert({ id: 'saved_receipts_list', value: newList });
    setSavedReceipts(newList);
    showSuccess('Dihapus');
  };

  const loadReceipt = (receipt: SavedReceipt) => {
    setFormData(prev => ({
      ...prev,
      no_kuitansi: receipt.no_kuitansi,
      penerima: receipt.penerima,
      nominal: receipt.nominal,
      keperluan: receipt.keperluan,
      tanggal: receipt.tanggal,
      custom_kop: {
        ...prev.custom_kop,
        ...(receipt.custom_kop || {})
      } as any
    }));
    showSuccess('Data kuitansi dimuat!');
  };

  if (isPreviewing) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPreviewing(false)} className="font-bold text-gray-600"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg"><Printer className="w-4 h-4 mr-2" /> Cetak Sekarang</Button>
        </div>
        <div className="flex-1 p-4 sm:p-12 overflow-y-auto print:p-0 flex justify-center items-start">
          <ReceiptTemplate data={formData} className="print:m-0 shadow-2xl print:shadow-none" />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4 portrait; margin: 0 !important; } html, body { height: 297mm; background: white !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; } .print\\:hidden { display: none !important; } }` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Generator Kuitansi Digital">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Tabs defaultValue="transaksi" className="w-full">
              <TabsList className="bg-white border p-1 rounded-xl mb-4 w-full">
                <TabsTrigger value="transaksi" className="flex-1 rounded-lg"><Receipt className="w-4 h-4 mr-2" /> Transaksi</TabsTrigger>
                <TabsTrigger value="kop" className="flex-1 rounded-lg"><Layout className="w-4 h-4 mr-2" /> Kop Khusus</TabsTrigger>
              </TabsList>
              <TabsContent value="transaksi">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-2 bg-emerald-600"></div>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">No. Kuitansi</label><Input value={formData.no_kuitansi} onChange={e => setFormData({...formData, no_kuitansi: e.target.value})} className="rounded-xl h-11 font-mono" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Tanggal</label><Input type="date" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="rounded-xl h-11" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Telah Terima Dari</label><Input placeholder="Nama pembayar" value={formData.penerima} onChange={e => setFormData({...formData, penerima: e.target.value})} className="rounded-xl h-11 font-bold" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Nominal (Rp)</label><Input type="number" value={formData.nominal || ''} onChange={e => setFormData({...formData, nominal: parseInt(e.target.value) || 0})} className="rounded-xl h-11 font-mono text-lg font-bold text-emerald-700" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Keperluan</label><Textarea placeholder="Contoh: SPP Januari" value={formData.keperluan} onChange={e => setFormData({...formData, keperluan: e.target.value})} className="rounded-xl min-h-[80px]" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Tempat</label><Input value={formData.tempat} onChange={e => setFormData({...formData, tempat: e.target.value})} className="rounded-xl h-11" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Penerima</label><Input value={formData.nama_petugas} onChange={e => setFormData({...formData, nama_petugas: e.target.value})} className="rounded-xl h-11" /></div>
                    </div>
                    <div className="pt-4 border-t space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-emerald-600 block mb-2">Tanda Tangan Digital</label>
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-20 border-2 border-dashed rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden group">
                            {formData.ttd_url ? (
                              <><img src={formData.ttd_url} className="w-full h-full object-contain mix-blend-multiply" alt="" /><button onClick={() => setFormData({...formData, ttd_url: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 shadow-lg"><X className="w-3 h-3" /></button></>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center">
                                {uploading === 'ttd' ? (
                                  <Loader2 className="animate-spin text-emerald-500" />
                                ) : (
                                  <>
                                    <ImageIcon className="text-gray-300 w-6 h-6" />
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadImage(e, 'ttd')} disabled={!!uploading} />
                                  </>
                                )}
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-emerald-600 block mb-2">Logo Stempel</label>
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-20 border-2 border-dashed rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden group">
                            {formData.stamp_url ? (
                              <><img src={formData.stamp_url} className="w-full h-full object-contain mix-blend-multiply" alt="" /><button onClick={() => setFormData({...formData, stamp_url: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 shadow-lg"><X className="w-3 h-3" /></button></>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center">
                                {uploading === 'stamp' ? (
                                  <Loader2 className="animate-spin text-emerald-500" />
                                ) : (
                                  <>
                                    <ImageIcon className="text-gray-300 w-6 h-6" />
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadImage(e, 'stamp')} disabled={!!uploading} />
                                  </>
                                )}
                              </label>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 italic">Unggah stempel untuk ditampilkan di area tanda tangan kuitansi.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="kop">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-2 bg-blue-600"></div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Edit Kop Lengkap
                      </CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setFormData(prev => ({
                          ...prev, 
                          custom_kop: {
                            nama_yayasan: settings.identitas_madrasah?.nama_yayasan || '',
                            nama_madrasah: settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || '',
                            alamat: settings.identitas_madrasah?.alamat || settings.general?.address || '',
                            telepon: settings.identitas_madrasah?.telepon || '',
                            email: settings.identitas_madrasah?.email || '',
                            website: settings.identitas_madrasah?.website || '',
                            logo_url: settings.identitas_madrasah?.logo_url || '',
                          }
                        }))}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset ke Default
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                      <p className="text-sm text-blue-800 font-medium">
                        <Sparkles className="w-4 h-4 inline mr-2" />
                        Edit lengkap header kuitansi. Perubahan ini hanya berlaku untuk kuitansi ini saja dan tidak mempengaruhi pengaturan global madrasah.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="relative w-20 h-20 border-2 border-dashed rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden group">
                        {formData.custom_kop.logo_url ? (
                          <><img src={formData.custom_kop.logo_url} className="w-full h-full object-contain" alt="" /><button onClick={() => setFormData({...formData, custom_kop: {...formData.custom_kop, logo_url: ''}})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 shadow-lg"><X className="w-3 h-3" /></button></>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center">
                            {uploading === 'logo' ? (
                              <Loader2 className="animate-spin text-blue-500" />
                            ) : (
                              <>
                                <ImageIcon className="text-gray-300 w-6 h-6" />
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadImage(e, 'logo')} disabled={!!uploading} />
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Yayasan</label><Input value={formData.custom_kop.nama_yayasan} onChange={e => setFormData({...formData, custom_kop: {...formData.custom_kop, nama_yayasan: e.target.value}})} className="rounded-xl h-11" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Madrasah</label><Input value={formData.custom_kop.nama_madrasah} onChange={e => setFormData({...formData, custom_kop: {...formData.custom_kop, nama_madrasah: e.target.value}})} className="rounded-xl h-11 font-bold" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Alamat</label><Textarea value={formData.custom_kop.alamat} onChange={e => setFormData({...formData, custom_kop: {...formData.custom_kop, alamat: e.target.value}})} className="rounded-xl min-h-[60px]" /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Telepon</label><Input value={formData.custom_kop.telepon} onChange={e => setFormData({...formData, custom_kop: {...formData.custom_kop, telepon: e.target.value}})} className="rounded-xl h-11" placeholder="021-1234567" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Email</label><Input value={formData.custom_kop.email} onChange={e => setFormData({...formData, custom_kop: {...formData.custom_kop, email: e.target.value}})} className="rounded-xl h-11" placeholder="info@madrasah.sch.id" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Website</label><Input value={formData.custom_kop.website} onChange={e => setFormData({...formData, custom_kop: {...formData.custom_kop, website: e.target.value}})} className="rounded-xl h-11" placeholder="www.madrasah.sch.id" /></div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleSave} disabled={isSaving} variant="outline" className="rounded-xl h-14 font-bold border-emerald-200 text-emerald-700">{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan</Button>
              <Button onClick={() => setIsPreviewing(true)} className="bg-emerald-600 text-white rounded-xl h-14 font-bold shadow-xl"><Printer className="w-5 h-5 mr-2" /> Preview & Cetak</Button>
            </div>
          </div>
          <div className="hidden lg:block sticky top-24">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Live Preview (Mini)</p>
            <div className="scale-[0.42] origin-top transform shadow-2xl rounded-lg overflow-hidden border"><ReceiptTemplate data={formData} /></div>
          </div>
        </div>
        <div className="space-y-4 pt-8 border-t">
          <div className="flex items-center justify-between"><h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><History className="w-6 h-6 text-emerald-600" /> Riwayat Kuitansi</h3><Button variant="ghost" size="sm" onClick={fetchHistory} className="text-gray-400"><RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh</Button></div>
          {loadingHistory ? (<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>) : savedReceipts.length === 0 ? (<div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-gray-100"><FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 font-medium">Belum ada kuitansi.</p></div>) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedReceipts.map((receipt) => (
                <Card key={receipt.id} className="border-0 shadow-md hover:shadow-lg transition-all group overflow-hidden rounded-2xl bg-white">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3"><Badge className="bg-emerald-50 text-emerald-700 border-0 text-[9px] font-black uppercase">{receipt.no_kuitansi}</Badge><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="sm" onClick={() => loadReceipt(receipt)} className="h-8 w-8 p-0 text-blue-600"><FolderOpen className="w-4 h-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete(receipt.id)} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button></div></div>
                    <h4 className="font-bold text-gray-900 line-clamp-1 text-sm">{receipt.penerima}</h4>
                    <p className="text-[10px] text-gray-400 line-clamp-1 mb-3">{receipt.keperluan}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50"><span className="text-[10px] font-bold text-gray-400">{new Date(receipt.tanggal).toLocaleDateString('id-ID')}</span><span className="text-sm font-black text-emerald-600">Rp {receipt.nominal.toLocaleString('id-ID')}</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReceiptGenerator;