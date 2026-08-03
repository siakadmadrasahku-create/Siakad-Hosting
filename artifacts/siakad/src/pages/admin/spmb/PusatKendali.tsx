"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, Settings, Users, Layout, 
  Info, AlertCircle, Power, MessageSquare, Sparkles
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';

const PusatKendali = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    is_open: true,
    tahun_ajaran: '2025/2026',
    pesan_tutup: 'Mohon maaf, pendaftaran siswa baru saat ini sedang ditutup.',
    kontak_wa: '',
  });

  const [ui, setUi] = useState({
    hero_title: 'Formulir Pendaftaran Online',
    hero_subtitle: 'Lengkapi data calon siswa dengan teliti dan benar.',
    info_box_title: 'Fitur Auto-Save Aktif',
    info_box_text: 'Data yang Anda isi otomatis tersimpan sebagai draft di browser ini.',
    success_title: 'Pendaftaran Berhasil!',
    success_text: 'Terima kasih telah mendaftar. Silakan unduh bukti pendaftaran di bawah ini.'
  });

  useEffect(() => {
    if (settings.spmb_config) setConfig(prev => ({ ...prev, ...settings.spmb_config }));
    if (settings.spmb_ui) setUi(prev => ({ ...prev, ...settings.spmb_ui }));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('site_settings').upsert({ id: 'spmb_config', value: config });
      await supabase.from('site_settings').upsert({ id: 'spmb_ui', value: ui });
      await refreshSettings();
      showSuccess('Pengaturan SPMB berhasil diperbarui!');
    } catch (error) {
      showError('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Pusat Kendali SPMB">
      <div className="max-w-5xl space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-500 text-sm">Kelola sistem pendaftaran dan tampilan halaman publik.</p>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white rounded-xl font-bold">
            <Save className="w-4 h-4 mr-2" /> Simpan Semua Perubahan
          </Button>
        </div>

        <Tabs defaultValue="sistem" className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-xl">
            <TabsTrigger value="sistem" className="rounded-lg"><Settings className="w-4 h-4 mr-2" /> Pengaturan Sistem</TabsTrigger>
            <TabsTrigger value="tampilan" className="rounded-lg"><Layout className="w-4 h-4 mr-2" /> Edit Tampilan Halaman</TabsTrigger>
          </TabsList>

          <TabsContent value="sistem" className="space-y-6">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={`h-2 ${config.is_open ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.is_open ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      <Power className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Status Pendaftaran</h3>
                      <Badge className={config.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {config.is_open ? 'SEDANG DIBUKA' : 'SEDANG DITUTUP'}
                      </Badge>
                    </div>
                  </div>
                  <Switch checked={config.is_open} onCheckedChange={(v) => setConfig({...config, is_open: v})} />
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader><CardTitle className="text-sm uppercase">Parameter Dasar</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Tahun Ajaran</label>
                    <Input value={config.tahun_ajaran} onChange={e => setConfig({...config, tahun_ajaran: e.target.value})} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">WhatsApp Panitia</label>
                    <Input value={config.kontak_wa} onChange={e => setConfig({...config, kontak_wa: e.target.value})} className="rounded-xl" placeholder="0812..." />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardHeader><CardTitle className="text-sm uppercase">Pesan Penutupan</CardTitle></CardHeader>
                <CardContent>
                  <Textarea value={config.pesan_tutup} onChange={e => setConfig({...config, pesan_tutup: e.target.value})} className="rounded-xl min-h-[100px]" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tampilan" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" /> Konten Halaman Pendaftaran</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-700 border-b pb-2">Bagian Atas (Hero)</h4>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Judul Utama</label>
                      <Input value={ui.hero_title} onChange={e => setUi({...ui, hero_title: e.target.value})} className="rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Sub-Judul</label>
                      <Input value={ui.hero_subtitle} onChange={e => setUi({...ui, hero_subtitle: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-700 border-b pb-2">Kotak Informasi (Draft)</h4>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Judul Kotak</label>
                      <Input value={ui.info_box_title} onChange={e => setUi({...ui, info_box_title: e.target.value})} className="rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Isi Pesan</label>
                      <Textarea value={ui.info_box_text} onChange={e => setUi({...ui, info_box_text: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-bold text-gray-700">Pesan Setelah Berhasil Daftar</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Judul Sukses</label>
                      <Input value={ui.success_title} onChange={e => setUi({...ui, success_title: e.target.value})} className="rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Pesan Sukses</label>
                      <Input value={ui.success_text} onChange={e => setUi({...ui, success_text: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default PusatKendali;