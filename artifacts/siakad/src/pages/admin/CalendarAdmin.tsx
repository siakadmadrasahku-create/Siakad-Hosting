"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Pencil, Trash2, Calendar as CalendarIcon, 
  Save, Loader2, RefreshCw, Search, X, Clock, Tag
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  category: 'academic' | 'holiday' | 'event' | 'exam';
  description: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'academic', label: 'Akademik', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  { value: 'holiday', label: 'Libur', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  { value: 'event', label: 'Kegiatan', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { value: 'exam', label: 'Ujian', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
];

const CalendarAdmin = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<Omit<CalendarEvent, 'id' | 'created_at'>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    end_date: '',
    category: 'academic',
    description: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'academic_calendar_list').maybeSingle();
      if (res?.value) setEvents(res.value as CalendarEvent[]);
    } catch (err) { showError('Gagal memuat data'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date) {
      showError('Judul and Tanggal wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      let newList: CalendarEvent[];
      if (editingItem) {
        newList = events.map(e => e.id === editingItem.id ? { ...formData, id: e.id, created_at: e.created_at } : e);
      } else {
        const newItem: CalendarEvent = { ...formData, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...events];
      }

      // Sort by date
      newList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'academic_calendar_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      setEvents(newList);
      showSuccess(editingItem ? 'Agenda diperbarui!' : 'Agenda baru ditambahkan!');
      setDialogOpen(false);
      setEditingItem(null);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus agenda ini?')) return;
    try {
      const newList = events.filter(e => e.id !== id);
      await supabase.from('site_settings').upsert({ id: 'academic_calendar_list', value: newList });
      setEvents(newList);
      showSuccess('Agenda dihapus');
    } catch (err) { showError('Gagal menghapus'); }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Manajemen Kalender Akademik">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Cari agenda..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10 rounded-xl" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEvents} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => { setEditingItem(null); setFormData({ title: '', date: new Date().toISOString().split('T')[0], end_date: '', category: 'academic', description: '' }); setDialogOpen(true); }} className="bg-emerald-600 text-white rounded-xl font-bold">
            <Plus className="w-4 h-4 mr-2" /> Tambah Agenda
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          [1, 2, 3].map(i => <Card key={i} className="h-24 animate-pulse bg-gray-100 border-0 rounded-2xl" />)
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed">
            <CalendarIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada agenda akademik.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const cat = CATEGORIES.find(c => c.value === event.category) || CATEGORIES[0];
            return (
              <Card key={event.id} className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className={`w-1.5 h-full absolute left-0 top-0 ${cat.color}`}></div>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[60px]">
                      <div className="text-2xl font-black text-gray-900 leading-none">{new Date(event.date).getDate()}</div>
                      <div className="text-[10px] font-bold uppercase text-gray-400 mt-1">
                        {new Date(event.date).toLocaleDateString('id-ID', { month: 'short' })}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{event.title}</h3>
                        <Badge className={`${cat.bg} ${cat.text} border-0 text-[9px] font-black uppercase`}>{cat.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{event.description || 'Tidak ada deskripsi.'}</p>
                      {event.end_date && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <Clock className="w-3 h-3" /> s/d {new Date(event.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingItem(event); setFormData({ ...event }); setDialogOpen(true); }} className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)} className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if(!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Agenda' : 'Tambah Agenda Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Judul Agenda</label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Libur Semester Ganjil" className="rounded-xl h-12" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tanggal Mulai</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tanggal Selesai (Opsional)</label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="rounded-xl h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Kategori</label>
              <Select value={formData.category} onValueChange={(v: any) => setFormData({...formData, category: v})}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Keterangan</label>
              <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detail kegiatan..." className="rounded-xl min-h-[80px]" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl h-12">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} {editingItem ? 'Update' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CalendarAdmin;