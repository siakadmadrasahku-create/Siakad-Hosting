"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, Plus, Trash2, Wallet, Info, Loader2, 
  Banknote, CreditCard, Settings2, Calendar
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  type: 'monthly' | 'once'; // bulanan atau sekali bayar
}

const SppSettings = () => {
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'finance_fees_list').maybeSingle();
      if (res?.value) {
        setFees(res.value as FeeItem[]);
      } else {
        setFees([
          { id: '1', name: 'SPP Bulanan', amount: 150000, type: 'monthly' },
          { id: '2', name: 'Uang Gedung', amount: 1000000, type: 'once' }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'finance_fees_list', 
          value: fees, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      showSuccess('Pengaturan biaya berhasil disimpan!');
    } catch (err) {
      showError('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const addFee = () => {
    setFees([...fees, { id: Date.now().toString(), name: 'Biaya Baru', amount: 0, type: 'monthly' }]);
  };

  const removeFee = (id: string) => {
    setFees(fees.filter(f => f.id !== id));
  };

  const updateFee = (id: string, field: keyof FeeItem, value: any) => {
    setFees(fees.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  return (
    <AdminLayout title="Pengaturan Biaya Sekolah">
      <div className="max-w-4xl space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-500">Tentukan besaran biaya SPP and administrasi lainnya.</p>
          <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 text-white rounded-xl font-bold">
            <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan
          </Button>
        </div>

        <div className="grid gap-6">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600" /></div>
          ) : (
            fees.map((fee) => (
              <Card key={fee.id} className="border-0 shadow-lg overflow-hidden group">
                <div className={`h-1.5 w-full ${fee.type === 'monthly' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-1 flex justify-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${fee.type === 'monthly' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {fee.type === 'monthly' ? <Calendar className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
                      </div>
                    </div>
                    <div className="md:col-span-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Nama Biaya</label>
                      <Input 
                        value={fee.name} 
                        onChange={(e) => updateFee(fee.id, 'name', e.target.value)}
                        className="rounded-xl font-bold"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Nominal (Rp)</label>
                      <Input 
                        type="number"
                        value={fee.amount} 
                        onChange={(e) => updateFee(fee.id, 'amount', parseInt(e.target.value))}
                        className="rounded-xl font-mono"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Jenis Tagihan</label>
                      <select 
                        className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                        value={fee.type}
                        onChange={(e) => updateFee(fee.id, 'type', e.target.value)}
                      >
                        <option value="monthly">Bulanan (SPP)</option>
                        <option value="once">Sekali Bayar</option>
                      </select>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button variant="ghost" onClick={() => removeFee(fee.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          <Button onClick={addFee} variant="outline" className="w-full h-16 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
            <Plus className="w-5 h-5 mr-2" /> Tambah Jenis Biaya Baru
          </Button>
        </div>

        <Card className="border-0 shadow-lg bg-amber-50 border-amber-100">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Informasi Penting:</p>
              <p>Perubahan nominal biaya di sini akan menjadi acuan default saat menginput pembayaran baru. Transaksi yang sudah tersimpan sebelumnya tidak akan berubah.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SppSettings;