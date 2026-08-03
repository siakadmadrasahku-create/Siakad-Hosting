"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, ArrowLeftRight, Search, Loader2, Save, 
  RefreshCw, User, BookOpen, Calendar, CheckCircle2, 
  AlertCircle, Clock, Trash2, History
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  student_id: string;
  student_name: string;
  book_id: string;
  book_title: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
  created_at: string;
}

const Circulation = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    student_id: '',
    book_id: '',
    borrow_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 hari
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      
      setTransactions(res?.find(s => s.id === 'library_transactions')?.value || []);
      setStudents(res?.find(s => s.id === 'students_list')?.value || []);
      setBooks(res?.find(s => s.id === 'library_books_list')?.value || []);
    } catch (err) { showError('Gagal memuat data'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.student_id || !formData.book_id) {
      showError('Pilih Siswa and Buku!');
      return;
    }

    const book = books.find(b => b.id === formData.book_id);
    if (book.available <= 0) {
      showError('Stok buku ini sedang kosong!');
      return;
    }

    setIsSaving(true);
    try {
      const student = students.find(s => s.id === formData.student_id);
      
      const newTrx: Transaction = {
        id: `trx-${Date.now()}`,
        ...formData,
        student_name: student.name,
        book_title: book.title,
        return_date: null,
        status: 'borrowed',
        created_at: new Date().toISOString()
      };

      const newList = [newTrx, ...transactions];
      
      // Update Stok Buku
      const newBooks = books.map(b => b.id === book.id ? { ...b, available: b.available - 1 } : b);

      await supabase.from('site_settings').upsert({ id: 'library_transactions', value: newList });
      await supabase.from('site_settings').upsert({ id: 'library_books_list', value: newBooks });

      setTransactions(newList);
      setBooks(newBooks);
      showSuccess('Peminjaman berhasil dicatat!');
      setDialogOpen(false);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const handleReturn = async (trxId: string) => {
    if (!confirm('Konfirmasi pengembalian buku?')) return;
    
    try {
      const trx = transactions.find(t => t.id === trxId);
      if (!trx) return;

      const newList = transactions.map(t => t.id === trxId ? { ...t, status: 'returned' as const, return_date: new Date().toISOString().split('T')[0] } : t);
      
      // Kembalikan Stok Buku
      const newBooks = books.map(b => b.id === trx.book_id ? { ...b, available: b.available + 1 } : b);

      await supabase.from('site_settings').upsert({ id: 'library_transactions', value: newList });
      await supabase.from('site_settings').upsert({ id: 'library_books_list', value: newBooks });

      setTransactions(newList);
      setBooks(newBooks);
      showSuccess('Buku telah dikembalikan!');
    } catch (err) { showError('Gagal memproses'); }
  };

  const filteredTransactions = transactions.filter(t => 
    t.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.book_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Sirkulasi Peminjaman Buku">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Cari nama siswa atau judul buku..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10 rounded-xl" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 text-white rounded-xl font-bold shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Catat Peminjaman
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-bold">Siswa</TableHead>
                <TableHead className="font-bold">Buku</TableHead>
                <TableHead className="font-bold">Tgl Pinjam</TableHead>
                <TableHead className="font-bold">Tgl Kembali</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
                <TableHead className="w-[150px] text-center font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-gray-500">Belum ada riwayat sirkulasi.</TableCell></TableRow>
              ) : (
                filteredTransactions.map((trx) => (
                  <TableRow key={trx.id} className="hover:bg-emerald-50/30 transition-colors">
                    <TableCell>
                      <div className="font-bold text-gray-900">{trx.student_name}</div>
                      <div className="text-[10px] text-gray-400 uppercase">ID: {trx.student_id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-700 line-clamp-1">{trx.book_title}</div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(trx.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      <div className={trx.status === 'borrowed' ? 'text-amber-600 font-bold' : ''}>
                        {new Date(trx.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {trx.return_date && <div className="text-[10px] text-emerald-600 italic">Dikembalikan: {trx.return_date}</div>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        trx.status === 'borrowed' ? 'bg-amber-100 text-amber-700' : 
                        trx.status === 'returned' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-red-100 text-red-700'
                      }>
                        {trx.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        {trx.status === 'borrowed' && (
                          <Button size="sm" onClick={() => handleReturn(trx.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold h-8">
                            KEMBALIKAN
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { if(confirm('Hapus riwayat?')) { const nl = transactions.filter(t => t.id !== trx.id); supabase.from('site_settings').upsert({ id: 'library_transactions', value: nl }).then(() => setTransactions(nl)); } }} className="h-8 w-8 p-0 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></Button>
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
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-6 h-6 text-emerald-600" />
              Catat Peminjaman Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Pilih Siswa</label>
              <Select value={formData.student_id} onValueChange={(v) => setFormData({...formData, student_id: v})}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Cari siswa..." /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Pilih Buku</label>
              <Select value={formData.book_id} onValueChange={(v) => setFormData({...formData, book_id: v})}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Cari buku..." /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {books.map(b => <SelectItem key={b.id} value={b.id} disabled={b.available <= 0}>{b.title} ({b.available} Eks)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tgl Pinjam</label>
                <Input type="date" value={formData.borrow_date} onChange={e => setFormData({...formData, borrow_date: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tgl Kembali</label>
                <Input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="rounded-xl h-12" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold shadow-xl">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Transaksi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Circulation;