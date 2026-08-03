"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Save, Printer, MoveUp, MoveDown, MoveLeft, MoveRight, Type, FileText, Info, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const PrintSettings = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    margin_top: 2,
    margin_bottom: 2,
    margin_left: 2,
    margin_right: 2,
    paper_size: 'A4',
    font_size: 11,
    show_kop: true,
    show_signature: true
  });

  useEffect(() => {
    if (settings.print_settings) {
      setFormData(settings.print_settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'print_settings', 
          value: formData, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      await refreshSettings();
      showSuccess('Pengaturan cetak berhasil disimpan!');
    } catch (error: any) {
      showError('Gagal menyimpan pengaturan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Pengaturan Cetak Dokumen">
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-500">Atur tata letak halaman cetak (Margin, Ukuran Kertas, dan Font) secara global.</p>
          <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg">
            <Save className="w-4 h-4 mr-2" />
            Simpan Pengaturan
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Margin Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Printer className="w-5 h-5 text-emerald-600" />
                Pengaturan Margin (cm)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                    <MoveUp className="w-3 h-3" /> Margin Atas
                  </Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={formData.margin_top}
                    onChange={(e) => setFormData({...formData, margin_top: parseFloat(e.target.value)})}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                    <MoveDown className="w-3 h-3" /> Margin Bawah
                  </Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={formData.margin_bottom}
                    onChange={(e) => setFormData({...formData, margin_bottom: parseFloat(e.target.value)})}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                    <MoveLeft className="w-3 h-3" /> Margin Kiri
                  </Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={formData.margin_left}
                    onChange={(e) => setFormData({...formData, margin_left: parseFloat(e.target.value)})}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                    <MoveRight className="w-3 h-3" /> Margin Kanan
                  </Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={formData.margin_right}
                    onChange={(e) => setFormData({...formData, margin_right: parseFloat(e.target.value)})}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paper & Font Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                Format Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-400">Ukuran Kertas</Label>
                <Select 
                  value={formData.paper_size} 
                  onValueChange={(v) => setFormData({...formData, paper_size: v})}
                >
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                    <SelectItem value="F4">F4 / Folio (215 x 330 mm)</SelectItem>
                    <SelectItem value="Legal">Legal (216 x 356 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                  <Type className="w-3 h-3" /> Ukuran Font Isi (pt)
                </Label>
                <Input 
                  type="number" 
                  value={formData.font_size}
                  onChange={(e) => setFormData({...formData, font_size: parseInt(e.target.value)})}
                  className="rounded-xl h-12"
                />
              </div>

              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                  <Label htmlFor="show-kop" className="text-sm font-medium cursor-pointer">Tampilkan Kop Surat</Label>
                  <Switch 
                    id="show-kop" 
                    checked={formData.show_kop} 
                    onCheckedChange={(v) => setFormData({...formData, show_kop: v})} 
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                  <Label htmlFor="show-sig" className="text-sm font-medium cursor-pointer">Tampilkan Tanda Tangan</Label>
                  <Switch 
                    id="show-sig" 
                    checked={formData.show_signature} 
                    onCheckedChange={(v) => setFormData({...formData, show_signature: v})} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg bg-amber-50 border-amber-100">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Tips Pencetakan Presisi:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Gunakan satuan <strong>Centimeter (cm)</strong> untuk margin.</li>
                <li>Saat jendela cetak browser muncul, pastikan opsi <strong>"Margins"</strong> diatur ke <strong>"None"</strong> atau <strong>"Minimum"</strong> agar pengaturan di atas bekerja maksimal.</li>
                <li>Nonaktifkan opsi <strong>"Headers and Footers"</strong> di pengaturan cetak browser untuk menghilangkan teks otomatis di pinggir kertas.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PrintSettings;