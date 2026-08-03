"use client";

import React from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface KopSuratProps {
  customData?: {
    nama_yayasan?: string;
    nama_madrasah?: string;
    alamat?: string;
    telepon?: string;
    email?: string;
    website?: string;
    logo_url?: string;
  };
}

const KopSurat = ({ customData }: KopSuratProps) => {
  const { settings } = useSiteSettings();
  const identitas = settings.identitas_madrasah || {};
  const general = settings.general || {};

  // Gunakan data kustom jika ada, jika tidak gunakan data global
  const namaYayasan = customData?.nama_yayasan ?? (identitas.nama_yayasan || '');
  const namaSekolah = customData?.nama_madrasah ?? (identitas.nama_madrasah || general.school_name || 'Si@Kad');
  const alamatSekolah = customData?.alamat ?? (identitas.alamat || general.address || 'Jl. Pendidikan No. 123');
  const logoUrl = customData?.logo_url ?? identitas.logo_url;

  // Menggabungkan detail wilayah (hanya jika tidak menggunakan alamat kustom penuh)
  const detailWilayah = !customData?.alamat ? [
    identitas.kecamatan ? `Kec. ${identitas.kecamatan}` : '',
    identitas.kabupaten ? identitas.kabupaten : '',
    identitas.provinsi ? identitas.provinsi : '',
    identitas.kode_pos ? identitas.kode_pos : ''
  ].filter(Boolean).join(', ') : '';

  // Menggabungkan kontak
  const telp = customData?.telepon ?? identitas.telepon;
  const email = customData?.email ?? identitas.email;
  const web = customData?.website ?? identitas.website;

  const kontak = [
    telp ? `Telp: ${telp}` : '',
    email ? `Email: ${email}` : '',
    web ? `Web: ${web}` : ''
  ].filter(Boolean).join(' | ');

  return (
    <div className="border-b-[3px] border-double border-black pb-3 mb-8 flex items-center justify-between w-full font-serif">
      {/* Logo Kiri */}
      <div className="w-[15%] flex justify-start">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Logo" 
            className="h-20 w-auto object-contain"
          />
        ) : (
          <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center text-[8px] text-gray-400">LOGO</div>
        )}
      </div>

      {/* Teks Tengah */}
      <div className="w-[70%] text-center flex flex-col justify-center px-2">
        {namaYayasan && (
          <h2 className="text-[11pt] font-bold uppercase tracking-tight leading-tight mb-0.5">
            {namaYayasan}
          </h2>
        )}
        <h1 className="text-[16pt] font-bold uppercase tracking-tight leading-tight mb-1.5">
          {namaSekolah}
        </h1>
        
        {/* Baris Tunggal Alamat & Kontak */}
        <div className="text-[8pt] leading-tight text-gray-800 flex flex-col items-center">
          <p className="whitespace-nowrap">
            {alamatSekolah} {detailWilayah && `• ${detailWilayah}`}
          </p>
          <p className="mt-0.5 font-medium italic">
            {kontak}
          </p>
        </div>
      </div>

      {/* Ruang Kosong Kanan (Untuk Keseimbangan) */}
      <div className="w-[15%] flex justify-end"></div>
    </div>
  );
};

export default KopSurat;