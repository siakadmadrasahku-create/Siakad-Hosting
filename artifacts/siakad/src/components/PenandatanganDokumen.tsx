"use client";

import React from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface PenandatanganProps {
  title?: string;
  showGuru?: boolean;
  targetKelas?: string;
  tanggalCetak?: string;
  mode?: 'default' | 'spmb';
}

const PenandatanganDokumen = ({ title = "Mengetahui,", showGuru = true, targetKelas, tanggalCetak, mode = 'default' }: PenandatanganProps) => {
  const { settings } = useSiteSettings();
  const penandatangan = settings.penandatangan || {};
  const identitas = settings.identitas_madrasah || {};

  const tglDate = tanggalCetak ? new Date(tanggalCetak) : new Date();
  const tgl = tglDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const kota = identitas.kabupaten || 'Indonesia';
  
  const kepala = {
    nama: penandatangan.kepala_nama || '[Nama Kepala Madrasah]',
    nip: penandatangan.kepala_nip || '-',
    jabatan: penandatangan.kepala_jabatan || 'Kepala Madrasah',
    ttd: penandatangan.kepala_tanda_tangan_url,
    stempel: penandatangan.kepala_stempel_url
  };

  const panitia = {
    nama: penandatangan.ketua_panitia_nama || '[Nama Ketua Panitia]',
    nip: penandatangan.ketua_panitia_nip || '-',
    jabatan: 'Ketua Panitia SPMB',
    ttd: penandatangan.ketua_panitia_tanda_tangan_url
  };

  // Mode SPMB: Kepala Madrasah (Kiri) & Ketua Panitia (Kanan)
  if (mode === 'spmb') {
    return (
      <div className="mt-12 grid grid-cols-2 gap-12 text-[11pt] font-serif">
        <div className="text-center">
          <p>Mengetahui,</p>
          <p className="mb-20">{kepala.jabatan},</p>
          <div className="relative inline-block">
            {kepala.stempel && (
              <img src={kepala.stempel} alt="Stempel" className="absolute -top-36 left-[-48px] w-[270px] object-contain opacity-90 mix-blend-multiply" />
            )}
            {kepala.ttd && (
              <img src={kepala.ttd} alt="TTD" className="absolute -top-16 left-4 h-20 object-contain mix-blend-multiply" />
            )}
            <p className="font-bold underline uppercase">{kepala.nama}</p>
          </div>
          <p>NIP. {kepala.nip}</p>
        </div>

        <div className="text-center">
          <p className="mb-1">{kota}, {tgl}</p>
          <p className="mb-20">{panitia.jabatan},</p>
          <div className="relative inline-block">
            {panitia.ttd && (
              <img src={panitia.ttd} alt="TTD" className="absolute -top-16 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply" />
            )}
            <p className="font-bold underline uppercase">{panitia.nama}</p>
          </div>
          <p>NIP. {panitia.nip}</p>
        </div>
      </div>
    );
  }

  // Default Mode (Kepala & Guru Kelas)
  let selectedGuru = null;
  if (targetKelas && penandatangan.guru_kelas) {
    const classMatch = targetKelas.match(/\d+/);
    const classNum = classMatch ? classMatch[0] : null;
    if (classNum) {
      selectedGuru = penandatangan.guru_kelas.find((g: any) => {
        const k = g.kelas?.toLowerCase() || "";
        const teacherClassMatch = k.match(/\d+/);
        return teacherClassMatch && teacherClassMatch[0] === classNum;
      });
    }
  }

  const guru = selectedGuru || {
    nama: '..........................................',
    nip: '..........................................',
    jabatan: 'Guru Kelas',
    kelas: targetKelas || '',
    tanda_tangan_url: null
  };

  const cleanKelas = guru.kelas?.toLowerCase().includes('kelas') ? guru.kelas : `Kelas ${guru.kelas}`;
  const teacherTitle = guru.jabatan?.toLowerCase().includes('kelas') ? guru.jabatan : `${guru.jabatan} ${cleanKelas}`;

  return (
    <div className={`mt-12 grid ${showGuru ? 'grid-cols-2' : 'grid-cols-1'} gap-12 text-[11pt] font-serif`}>
      {showGuru ? (
        <>
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="mb-20">{kepala.jabatan},</p>
            <div className="relative inline-block">
              {kepala.stempel && (
                <img src={kepala.stempel} alt="Stempel" className="absolute -top-36 left-[-48px] w-[270px] object-contain opacity-90 mix-blend-multiply" />
              )}
              {kepala.ttd && (
                <img src={kepala.ttd} alt="TTD" className="absolute -top-16 left-4 h-20 object-contain mix-blend-multiply" />
              )}
              <p className="font-bold underline uppercase">{kepala.nama}</p>
            </div>
            <p>NIP. {kepala.nip}</p>
          </div>

          <div className="text-center">
            <p className="mb-1">{kota}, {tgl}</p>
            <p className="mb-20">{teacherTitle},</p>
            <div className="relative inline-block">
              {guru.tanda_tangan_url && (
                <img src={guru.tanda_tangan_url} alt="TTD" className="absolute -top-16 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply" />
              )}
              <p className="font-bold underline uppercase">{guru.nama}</p>
            </div>
            <p>NIP. {guru.nip}</p>
          </div>
        </>
      ) : (
        <div className="text-right pr-12">
          <p className="mb-1">{kota}, {tgl}</p>
          <p>Mengetahui,</p>
          <p className="mb-20">{kepala.jabatan},</p>
          <div className="relative inline-block">
            {kepala.stempel && (
              <img src={kepala.stempel} alt="Stempel" className="absolute -top-36 left-[-48px] w-[270px] object-contain opacity-90 mix-blend-multiply" />
            )}
            {kepala.ttd && (
              <img src={kepala.ttd} alt="TTD" className="absolute -top-16 left-4 h-20 object-contain mix-blend-multiply" />
            )}
            <p className="font-bold underline uppercase">{kepala.nama}</p>
          </div>
          <p>NIP. {kepala.nip}</p>
        </div>
      )}
    </div>
  );
};

export default PenandatanganDokumen;