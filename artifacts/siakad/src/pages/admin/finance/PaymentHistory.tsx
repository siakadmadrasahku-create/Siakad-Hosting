"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, Printer, Trash2, Loader2, ArrowLeft, 
  Receipt, Filter, Download, Calendar, User, Wallet
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const PaymentHistory = () => {
  const { settings } = useSiteSettings();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<any>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'finance_transactions').maybeSingle();
      if (res?.value) setTransactions(res.value as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus riwayat transaksi ini?')) return;
    try {
      const newList = transactions.filter(t => t.id !== id);
      await supabase.from('site_settings').upsert({ id: 'finance_transactions', value: newList });
      setTransactions(newList);
      showSuccess('Transaksi dihapus');
    } catch (err) {
      showError('Gagal menghapus');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fee_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  if (previewItem) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setPreviewItem(null)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Kuitansi
          </Button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto print:p-0">
          <div className="bg-white mx-auto shadow-2xl print:shadow-none p-[1.5cm] border-2 border-emerald-600 relative" style={{ width: '210mm', minHeight: '148mm' }}>
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <Receipt className="w-96 h-96 text-emerald-900 rotate-12" />
            </div>

            <KopSurat />
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-emerald-800 underline uppercase tracking-widest">KUITANSI PEMBAYARAN</h2>
              <p className="text-xs font-mono mt-1">No. Transaksi: {previewItem.id}</p>
            </div>

            <div className="space-y-6 font-serif text-[11pt] relative z-10">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">Telah terima dari</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 font-bold border-b border-dotted border-gray-400 uppercase">{previewItem.student_name}</div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">Untuk Pembayaran</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 border-b border-dotted border-gray-400">{previewItem.fee_name} - Bulan {previewItem.month}</div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">Keterangan</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 border-b border-dotted border-gray-400 italic">{previewItem.note || '-'}</div>
              </div>

              <div className="mt-12 flex justify-between items-end">
                <div className="bg-emerald-50 border-2 border-emerald-600 px-8 py-4 rounded-xl">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Terbilang (Rp)</p>
                  <p className="text-2xl font-black text-emerald-900 font-mono">Rp {previewItem.amount.toLocaleString()},-</p>
                </div>
                <div className="text-center min-w-[200px]">
                  <p className="mb-1 text-xs">{settings.identitas_madrasah?.kabupaten || 'Indonesia'}, {new Date(previewItem.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="mb-20 font-bold">Bendahara,</p>
                  <p className="font-bold underline uppercase">{settings.general?.headmaster_name || '................................'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A5 landscape; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Riwayat Transaksi Keuangan">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Cari nama siswa atau jenis biaya..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTransactions} className="rounded-xl">
              <Filter className="w-4 h-4 mr-2" /> Filter Periode
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Download className="w-4 h-4 mr-2" /> Ekspor Excel
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold">Tanggal</TableHead>
                  <TableHead className="font-bold">Nama Siswa</TableHead>
                  <TableHead className="font-bold">Jenis Biaya</TableHead>
                  <TableHead className="font-bold">Bulan</TableHead>
                  <TableHead className="font-bold text-right">Nominal</TableHead>
                  <TableHead className="font-bold text-center">Metode</TableHead>
                  <TableHead className="font-bold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-gray-500">Belum ada riwayat transaksi.</TableCell></TableRow>
                ) : (
                  filteredTransactions.map((trx) => (
                    <TableRow key={trx.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="text-xs text-gray-500">
                        {new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">{trx.student_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">{trx.fee_name}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{trx.month}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-700">
                        Rp {trx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={trx.payment_method === 'Tunai' ? 'bg-gray-100 text-gray-700' : 'bg-purple-100 text-purple-700'}>
                          {trx.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewItem(trx)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(trx.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
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
    </AdminLayout>
  );
};

export default PaymentHistory;