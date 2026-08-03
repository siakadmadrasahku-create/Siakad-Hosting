"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Pencil, Trash2, BookCopy, Search, Loader2, 
  Save, RefreshCw, Upload, X, ImageIcon, Hash, User, Bookmark
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { compressImage } from '@/utils/imageCompression';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  available: number;
  cover_url: string;
  created_at: string;
}

const CATEGORIES = ['Buku Pelajaran', 'Fiksi / Novel', 'Agama Islam', 'Ensiklopedia', 'Majalah', 'Lainnya'];

const BookCatalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Book | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<Omit<Book, 'id' | 'created_at' | 'available'>>({
    title: '',
    author: '',
    isbn: '',
    category: 'Buku Pelajaran',
    stock: 1,
    cover_url: ''
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'library_books_list').maybeSingle();
      if (res?.value) setBooks(res.value as Book[]);
    } catch (err) { showError('Gagal memuat data'); } finally { setLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const fileName = `book-${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('public').upload(`books/${fileName}`, compressedFile);
      const { data } = supabase.storage.from('public').getPublicUrl(`books/${fileName}`);
      setFormData(prev => ({ ...prev, cover_url: data.publicUrl }));
      showSuccess('Cover berhasil diunggah!');
    } catch (err) { showError('Gagal upload'); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.author) {
      showError('Judul and Pengarang wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      let newList: Book[];
      if (editingItem) {
        newList = books.map(b => b.id === editingItem.id ? { ...formData, id: b.id, available: b.available + (formData.stock - b.stock), created_at: b.created_at } : b);
      } else {
        const newItem: Book = { ...formData, id: Date.now().toString(), available: formData.stock, created_at: new Date().toISOString() };
        newList = [newItem, ...books];
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'library_books_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      setBooks(newList);
      showSuccess('Buku berhasil disimpan!');
      setDialogOpen(false);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus buku ini dari katalog?')) return;
    try {
      const newList = books.filter(b => b.id !== id);
      await supabase.from('site_settings').upsert({ id: 'library_books_list', value: newList });
      setBooks(newList);
      showSuccess('Buku dihapus');
    } catch (err) { showError('Gagal menghapus'); }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.isbn.includes(searchQuery)
  );

  return (
    <AdminLayout title="Katalog Buku Perpustakaan">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Cari judul, pengarang, atau ISBN..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10 rounded-xl" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBooks} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => { setEditingItem(null); setFormData({ title: '', author: '', isbn: '', category: 'Buku Pelajaran', stock: 1, cover_url: '' }); setDialogOpen(true); }} className="bg-emerald-600 text-white rounded-xl font-bold">
            <Plus className="w-4 h-4 mr-2" /> Tambah Buku
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[80px] text-center font-bold">Cover</TableHead>
                <TableHead className="min-w-[250px] font-bold">Informasi Buku</TableHead>
                <TableHead className="font-bold">Kategori</TableHead>
                <TableHead className="text-center font-bold">Stok</TableHead>
                <TableHead className="text-center font-bold">Tersedia</TableHead>
                <TableHead className="w-[120px] text-center font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
              ) : filteredBooks.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-gray-500">Belum ada koleksi buku.</TableCell></TableRow>
              ) : (
                filteredBooks.map((book) => (
                  <TableRow key={book.id} className="hover:bg-emerald-50/30 transition-colors">
                    <TableCell className="p-2">
                      <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden border mx-auto">
                        {book.cover_url ? <img src={book.cover_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-full h-full p-3 text-gray-300" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-gray-900">{book.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> {book.author}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-1">ISBN: {book.isbn || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">{book.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-gray-600">{book.stock}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={book.available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {book.available} Eks
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingItem(book); setFormData({ ...book }); setDialogOpen(true); }} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(book.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
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
              <BookCopy className="w-6 h-6 text-emerald-600" />
              {editingItem ? 'Edit Data Buku' : 'Tambah Koleksi Buku'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex justify-center">
              <div className="relative w-32 h-44 border-2 border-dashed rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden group">
                {formData.cover_url ? (
                  <>
                    <img src={formData.cover_url} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setFormData({...formData, cover_url: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    {uploading ? <Loader2 className="animate-spin text-emerald-500" /> : <ImageIcon className="text-gray-300 w-10 h-10" />}
                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Upload Cover</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Judul Buku *</label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Pengarang *</label>
                <Input value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">ISBN / Kode Buku</label>
                <Input value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Kategori</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Jumlah Stok (Eks)</label>
                <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className="rounded-xl h-12" />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving || uploading} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold shadow-xl">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Buku
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default BookCatalog;