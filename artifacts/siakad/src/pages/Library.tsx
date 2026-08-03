"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Library, Search, BookOpen, User, Bookmark, 
  Info, Sparkles, Filter, ChevronRight, ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const LibraryPublic = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  const categories = ['Semua', 'Buku Pelajaran', 'Fiksi / Novel', 'Agama Islam', 'Ensiklopedia', 'Majalah'];

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'library_books_list').maybeSingle();
      if (res?.value) setBooks(res.value as any[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filteredBooks = books.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'Semua' || b.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Library className="w-3 h-3" /> Jendela Dunia
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Perpustakaan <span className="text-emerald-600 font-serif-premium italic">Digital</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
              Temukan ribuan koleksi buku berkualitas untuk mendukung proses belajar and memperluas wawasan ananda.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Cari judul buku atau pengarang..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
              />
            </div>
            <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-4 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-500 hover:bg-emerald-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[3/4] animate-pulse bg-white rounded-2xl shadow-sm" />)
            ) : filteredBooks.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Buku tidak ditemukan.</p>
              </div>
            ) : (
              filteredBooks.map((book) => (
                <Card key={book.id} className="border-0 shadow-md hover:shadow-xl transition-all hover:-translate-y-2 group rounded-2xl overflow-hidden bg-white">
                  <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                    {book.cover_url ? (
                      <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={book.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-12 h-12" /></div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className={book.available > 0 ? 'bg-emerald-500 text-white border-0' : 'bg-red-500 text-white border-0'}>
                        {book.available > 0 ? 'Tersedia' : 'Kosong'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{book.category}</p>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">{book.title}</h3>
                    <p className="text-[10px] text-gray-400 truncate">{book.author}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LibraryPublic;