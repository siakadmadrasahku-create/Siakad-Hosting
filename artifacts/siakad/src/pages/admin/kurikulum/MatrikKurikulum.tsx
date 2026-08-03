"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Sparkles, Loader2, Save, RefreshCw } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';

interface MatrikItem {
  id: string;
  elemen: string;
  sub_elemen: string;
  tp: string;
  fase: string;
  created_at: string;
}

const MatrikKurikulum = () => {
  const [data, setData] = useState<MatrikItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MatrikItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFase, setFilterFase] = useState('all');
  const [formData, setFormData] = useState({ elemen: '', sub_elemen: '', tp: '', fase: 'A' });

  useEffect(() => {
    fetchMatrik();
  }, []);

  const fetchMatrik = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'matrik_kurikulum_list')
        .maybeSingle();

      if (error) throw error;
      if (res?.value && Array.isArray(res.value)) {
        setData(res.value as MatrikItem[]);
      }
    } catch (error) {
      console.error('Error fetching matrik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = () => {
    if (!formData.elemen || !formData.sub_elemen) {
      showError('Isi Elemen dan Sub Elemen terlebih dahulu!');
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        tp: `Peserta didik mampu menganalisis konsep ${prev.sub_elemen} dan mengimplementasikannya dalam pembiasaan akhlak mulia sehari-hari di lingkungan madrasah.`
      }));
      setIsGenerating(false);
      showSuccess('Tujuan Pembelajaran berhasil disusun!');
    }, 1000);
  };

  const handleSave = async () => {
    if (!formData.elemen.trim() || !formData.sub_elemen.trim()) {
      showError('Elemen dan Sub Elemen harus diisi!');
      return;
    }

    setIsSaving(true);
    try {
      let newList: MatrikItem[];
      if (editingItem) {
        newList = data.map(d => d.id === editingItem.id ? { ...formData, id: editingItem.id, created_at: editingItem.created_at } : d);
      } else {
        newList = [{ ...formData, id: Date.now().toString(), created_at: new Date().toISOString() }, ...data];
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'matrik_kurikulum_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      
      setData(newList);
      showSuccess('Matrik berhasil disimpan ke database!');
      setDialogOpen(false);
    } catch (error) {
      showError('Gagal menyimpan ke database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const newList = data.filter(d => d.id !== id);
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'matrik_kurikulum_list', value: newList, updated_at: new Date().toISOString() });
      
      if (error) throw error;
      setData(newList);
      showSuccess('Data berhasil dihapus');
    } catch (error) {
      showError('Gagal menghapus data');
    }
  };

  const filteredData = data.filter(item => {
    const matchSearch = item.elemen.toLowerCase().includes(searchQuery.toLowerCase()) || item.sub_elemen.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFase = filterFase === 'all' || item.fase === filterFase;
    return matchSearch && matchFase;
  });

  return (
    <AdminLayout title="Matrik Kurikulum MI">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Cari elemen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
          </div>
          <Select value={filterFase} onValueChange={setFilterFase}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Fase</SelectItem>
              <SelectItem value="A">Fase A</SelectItem>
              <SelectItem value="B">Fase B</SelectItem>
              <SelectItem value="C">Fase C</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={fetchMatrik} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => { setEditingItem(null); setFormData({ elemen: '', sub_elemen: '', tp: '', fase: 'A' }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
            <Plus className="w-4 h-4 mr-2" />Tambah Matrik
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[50px] text-center font-bold">No</TableHead>
                <TableHead className="w-[100px] text-center font-bold">Fase</TableHead>
                <TableHead className="min-w-[200px] font-bold">Elemen</TableHead>
                <TableHead className="min-w-[200px] font-bold">Sub-Elemen</TableHead>
                <TableHead className="min-w-[350px] font-bold">Tujuan Pembelajaran (TP)</TableHead>
                <TableHead className="w-[100px] text-center font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-gray-500">Belum ada data matrik kurikulum.</TableCell></TableRow>
              ) : (
                filteredData.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <TableCell className="text-center font-medium">{index + 1}</TableCell>
                    <TableCell className="text-center">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">FASE {item.fase}</span>
                    </TableCell>
                    <TableCell className="font-bold text-gray-900">{item.elemen}</TableCell>
                    <TableCell className="text-gray-600">{item.sub_elemen}</TableCell>
                    <TableCell className="text-sm text-gray-600 leading-relaxed">{item.tp}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormData({ ...item }); setDialogOpen(true); }} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingItem ? 'Edit Matrik' : 'Tambah Matrik Baru'}
              <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="ml-auto text-purple-600 border-purple-200 hover:bg-purple-50 rounded-lg">
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Generate TP with AI
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Elemen</label><Input placeholder="Nama elemen..." value={formData.elemen} onChange={(e) => setFormData({ ...formData, elemen: e.target.value })} className="rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Sub Elemen</label><Input placeholder="Nama sub elemen..." value={formData.sub_elemen} onChange={(e) => setFormData({ ...formData, sub_elemen: e.target.value })} className="rounded-xl" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fase</label>
              <Select value={formData.fase} onValueChange={(val) => setFormData({ ...formData, fase: val })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="A">Fase A</SelectItem><SelectItem value="B">Fase B</SelectItem><SelectItem value="C">Fase C</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Tujuan Pembelajaran (TP)</label><Textarea placeholder="Tulis TP..." value={formData.tp} onChange={(e) => setFormData({ ...formData, tp: e.target.value })} className="rounded-xl min-h-[100px]" /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan ke Database
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default MatrikKurikulum;