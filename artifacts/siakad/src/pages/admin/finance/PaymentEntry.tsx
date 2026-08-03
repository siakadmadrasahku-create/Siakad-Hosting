"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Save, Loader2, Search, User, Calendar, Banknote, 
  CheckCircle2, Printer, ArrowLeft, Receipt, Wallet, History as HistoryIcon
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const PaymentEntry = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    fee_id: '',
    month: MONTHS[new Date().getMonth()],
    amount: 0,
    payment_method: 'Tunai',
    note: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      setStudents(res?.find(s => s.id === 'students_list')?.value || []);
      setClasses(res?.find(s => s.id === 'kelas_list')?.value || []);
      setFees(res?.find(s => s.id === 'finance_fees_list')?.value || []);
    } catch (err) {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleFeeChange = (feeId: string) => {
    const selectedFee = fees.find(f => f.id === feeId);
    setFormData({ ...formData, fee_id: feeId, amount: selectedFee?.amount || 0 });
  };

  const handleSave = async () => {
    if (!formData.student_id || !formData.fee_id || formData.amount <= 0) {
      showError('Lengkapi data pembayaran!');
      return;
    }

    setIsSaving(true);
    try {
      const { data: currentRes } = await supabase.from('site_settings').select('value').eq('id', 'finance_transactions').maybeSingle();
      const transactions = currentRes?.value || [];

      const student = students.find(s => s.id === formData.student_id);
      const fee = fees.find(f => f.id === formData.fee_id);

      const newTransaction = {
        id: `trx-${Date.now()}`,
        ...formData,
        student_name: student?.name,
        fee_name: fee?.name,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'finance_transactions', 
          value: [newTransaction, ...transactions],
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      showSuccess('Pembayaran berhasil dicatat!');
      setFormData({ ...formData, student_id: '', note: '' });
    } catch (err) {
      showError('Gagal mencatat pembayaran');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Input Pembayaran Siswa">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-inner">
            <Wallet className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Pencatatan Transaksi</h2>
          <p className="text-gray-500">Gunakan formulir ini untuk mencatat pembayaran SPP and biaya lainnya.</p>
        </div>

        <Card className="border-0 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
          <div className="h-3 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <CardContent className="p-10 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Student Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4" /> Pilih Siswa
                </label>
                <Select value={formData.student_id} onValueChange={(v) => setFormData({...formData, student_id: v})}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50">
                    <SelectValue placeholder="Cari nama siswa..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({classes.find(c => c.id === s.class_id)?.nama_kelas || 'Tanpa Kelas'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fee Type Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Jenis Pembayaran
                </label>
                <Select value={formData.fee_id} onValueChange={handleFeeChange}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50">
                    <SelectValue placeholder="Pilih jenis biaya..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {fees.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name} (Rp {f.amount.toLocaleString()})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Month Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Untuk Bulan
                </label>
                <Select value={formData.month} onValueChange={(v) => setFormData({...formData, month: v})}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nominal Bayar (Rp)</label>
                <Input 
                  type="number" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value)})}
                  className="rounded-2xl h-14 border-gray-100 bg-gray-50/50 font-mono text-lg font-bold"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metode</label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Tunai">Tunai / Cash</SelectItem>
                    <SelectItem value="Transfer">Transfer Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
              <Input 
                placeholder="Contoh: Pembayaran lunas semester 1" 
                value={formData.note} 
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"
              />
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-16 font-bold text-lg shadow-xl shadow-emerald-100 transition-all hover:scale-[1.02]"
              >
                {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
                Simpan & Cetak Kuitansi
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-3xl shadow-md border border-gray-50 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><Receipt className="w-6 h-6" /></div>
            <div>
              <h4 className="font-bold text-gray-900">Kuitansi Digital</h4>
              <p className="text-xs text-gray-500">Setiap transaksi menghasilkan kuitansi unik yang bisa dicetak.</p>
            </div>
          </div>
          <div className="p-6 bg-white rounded-3xl shadow-md border border-gray-50 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><HistoryIcon className="w-6 h-6" /></div>
            <div>
              <h4 className="font-bold text-gray-900">Riwayat Otomatis</h4>
              <p className="text-xs text-gray-500">Data pembayaran langsung masuk ke laporan keuangan bulanan.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PaymentEntry;