"use client";

import React from 'react';
import KopSurat from './KopSurat';
import { terbilang } from '@/utils/terbilang';
import { Receipt, CheckCircle2 } from 'lucide-react';

interface ReceiptTemplateProps {
  data: {
    no_kuitansi: string;
    penerima: string;
    nominal: number;
    keperluan: string;
    tanggal: string;
    tempat: string;
    nama_petugas: string;
    ttd_url?: string;
    stamp_url?: string;
    custom_kop?: {

      nama_yayasan?: string;
      nama_madrasah?: string;
      alamat?: string;
      telepon?: string;
      email?: string;
      website?: string;
    };
  };
  className?: string;
}

const ReceiptTemplate = ({ data, className = "" }: ReceiptTemplateProps) => {
  const currentNominal = Number(data.nominal) || 0;

  return (
    <div 
      className={`bg-white relative overflow-hidden border-[10px] border-emerald-600 p-8 sm:p-10 font-serif ${className}`}
      style={{ 
        width: '210mm', 
        height: '297mm', 
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Watermark Background - Logo Stempel */}
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 opacity-[0.08] pointer-events-none z-0">
        <Receipt className="w-96 h-96 text-emerald-600 rotate-12" />
      </div>

      <KopSurat customData={data.custom_kop} />

      <div className="relative z-10 flex flex-col">
        <div className="text-center mb-6 mt-3">
          <h2 className="text-2xl font-black text-emerald-800 underline uppercase tracking-[0.15em]">KUITANSI PEMBAYARAN</h2>
          <p className="text-xs font-mono mt-1 text-gray-500">No: {data.no_kuitansi}</p>
        </div>

        <div className="space-y-5 text-[11pt]">

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 text-gray-500 font-bold uppercase text-[9pt]">Telah terima dari</div>
            <div className="col-span-1 text-center text-gray-400">:</div>
            <div className="col-span-8 font-black border-b border-dotted border-gray-300 uppercase py-1 text-lg text-gray-900">
              {data.penerima || '..................................................................'}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-3 text-gray-500 font-bold uppercase text-[9pt]">Uang Sejumlah</div>
            <div className="col-span-1 text-center text-gray-400">:</div>
            <div className="col-span-8 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 italic font-bold text-emerald-900 text-base leading-relaxed">
              {currentNominal > 0 ? terbilang(currentNominal) : '..................................................................'}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 text-gray-500 font-bold uppercase text-[9pt]">Untuk Pembayaran</div>
            <div className="col-span-1 text-center text-gray-400">:</div>
            <div className="col-span-8 border-b border-dotted border-gray-300 py-1 text-gray-800">
              {data.keperluan || '..................................................................'}
            </div>
          </div>
        </div>

        <div className="pt-5 flex justify-between items-end">
          <div className="space-y-2">
            <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-xl inline-block border-2 border-emerald-500">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-1">Total Nominal</p>
              <p className="text-3xl font-black font-mono">Rp {currentNominal.toLocaleString('id-ID')},-</p>
            </div>
            <div className="flex items-center gap-2 text-[8px] text-emerald-600 font-black tracking-tighter">
              <CheckCircle2 className="w-3 h-3" /> OFFICIAL DIGITAL RECEIPT • SIAKAD SYSTEM
            </div>
          </div>

          <div className="text-center min-w-[200px]">

            <p className="mb-1 text-[10pt] font-bold text-gray-600">{data.tempat}, {new Date(data.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="mb-1 font-black text-gray-900 uppercase text-[10pt]">Bendahara,</p>
            
            <div className="h-32 relative flex items-center justify-center mb-0">
              <div className="flex items-center justify-center w-full h-full">
                {data.ttd_url ? (
                  <img src={data.ttd_url} alt="TTD" className="max-h-20 object-contain mix-blend-multiply" />
                ) : (
                  <div className="w-full border-b border-gray-200 mb-8"></div>
                )}
                {data.stamp_url ? (
                  <img src={data.stamp_url} alt="Stempel" className="absolute -left-16 bottom-0 h-64 w-64 object-contain opacity-90 mix-blend-multiply translate-y-12" />
                ) : null}
              </div>
            </div>

            <p className="font-black text-base underline uppercase text-gray-900 -mt-2">{data.nama_petugas || '................................'}</p>
            <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">NIP. ................................</p>
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-700 via-yellow-400 to-emerald-700"></div>
    </div>
  );
};

export default ReceiptTemplate;