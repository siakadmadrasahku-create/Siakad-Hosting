"use client";

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PrintLayout from '@/components/admin/PrintLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';

const PrintPreviewPage = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();

  // Data dummy untuk preview
  const documentData = {
    siswa: {
      nama: 'Ahmad Fauzi',
      nisn: '1234567890',
      kelas: 'Kelas 1 (Reguler)',
      tgl_lahir: '15 Januari 2019',
      nama_ayah: 'Bapak Ahmad',
      nama_ibu: 'Ibu Siti',
      sekolah: 'Si@Kad Madrasah'
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'surat-pengantar':
        return 'Surat Pengantar Penerimaan Siswa Baru';
      case 'konfirmasi-pendaftaran':
        return 'Konfirmasi Pendaftaran Siswa Baru';
      case 'ijazah':
        return 'Ijazah Madrasah Ibtidaiyah';
      default:
        return 'Dokumen Resmi';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Tentukan mode penandatanganan
  const isSPMB = type === 'surat-pengantar' || type === 'konfirmasi-pendaftaran';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white shadow-sm border-b print:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              Preview: {getTitle()}
            </h1>
          </div>
          <Button 
            onClick={handlePrint}
            className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Dokumen
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <PrintLayout 
        title={getTitle()}
        showSignature={true}
        signatureMode={isSPMB ? 'spmb' : 'default'}
        showGuruSignature={!isSPMB} // SPMB menggunakan mode Kepala + Panitia
      >
        {/* Konten dokumen berdasarkan type */}
        {type === 'surat-pengantar' && (
          <div className="space-y-6">
            <p className="text-justify leading-relaxed text-gray-700">
              Dengan hormat,
            </p>
            <p className="text-justify leading-relaxed text-gray-700">
              Yang bertanda tangan di bawah ini, Kepala {documentData.siswa.sekolah || 'Madrasah'}, 
              dengan ini menerangkan bahwa:
            </p>
            
            <div className="ml-8 space-y-2">
              <p><strong>Nama:</strong> {documentData.siswa.nama}</p>
              <p><strong>NISN:</strong> {documentData.siswa.nisn}</p>
              <p><strong>Kelas:</strong> {documentData.siswa.kelas}</p>
              <p><strong>Tempat/Tgl Lahir:</strong> {documentData.siswa.tgl_lahir}</p>
              <p><strong>Nama Ayah:</strong> {documentData.siswa.nama_ayah}</p>
              <p><strong>Nama Ibu:</strong> {documentData.siswa.nama_ibu}</p>
            </div>

            <p className="text-justify leading-relaxed text-gray-700 mt-6">
              adalah siswa/siswi yang benar-benar telah terdaftar di {documentData.siswa.sekolah || 'madrasah kami'} 
              untuk tahun ajaran 2025/2026. Demikian surat pengantar ini dibuat untuk dapat dipergunakan 
              sebagaimana mestinya.
            </p>
          </div>
        )}

        {type === 'konfirmasi-pendaftaran' && (
          <div className="space-y-6">
            <p className="text-center font-semibold mb-4">
              BUKU PENDAFTARAN SISWA BARU
            </p>
            <p className="text-center text-gray-600 mb-6">
              Tahun Ajaran 2025/2026
            </p>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">
                Data lengkap pendaftar tercantum dalam sistem.
              </p>
            </div>
          </div>
        )}

        {type === 'ijazah' && (
          <div className="space-y-6 text-center">
            <h3 className="text-xl font-bold">SURAT KETERANGAN LULUS</h3>
            <p className="text-gray-600">
              Nomor: 001/SK.II/2025
            </p>
            
            <div className="text-left space-y-4 mt-8">
              <p>
                Yang bertanda tangan di bawah ini, Kepala Madrasah, dengan ini 
                menerangkan bahwa:
              </p>
              
              <div className="ml-8 space-y-2">
                <p><strong>Nama:</strong> {documentData.siswa.nama}</p>
                <p><strong>NISN:</strong> {documentData.siswa.nisn}</p>
                <p><strong>Tempat/Tgl Lahir:</strong> {documentData.siswa.tgl_lahir}</p>
                <p><strong>Nama Ayah:</strong> {documentData.siswa.nama_ayah}</p>
                <p><strong>Nama Ibu:</strong> {documentData.siswa.nama_ibu}</p>
              </div>

              <p className="mt-6">
                Telah menyelesaikan seluruh mata pelajaran dengan baik dan dinyatakan 
                LULUS pada Tahun Ajaran 2024/2025.
              </p>
            </div>
          </div>
        )}
      </PrintLayout>
    </div>
  );
};

export default PrintPreviewPage;