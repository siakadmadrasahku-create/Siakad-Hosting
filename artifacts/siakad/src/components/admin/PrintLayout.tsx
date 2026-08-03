"use client";

import React from 'react';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface PrintLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSignature?: boolean;
  showGuruSignature?: boolean;
  signatureMode?: 'default' | 'spmb';
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ 
  children, 
  title = "Dokumen Resmi",
  showSignature = true,
  showGuruSignature = true,
  signatureMode = 'default'
}) => {
  const { settings } = useSiteSettings();
  const general = settings.general || {};

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white min-h-screen print:p-0 print:m-0 print:shadow-none print:w-full">
      {/* Kop Surat */}
      <KopSurat />

      {/* Judul Dokumen */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">
          {general.school_name || 'Si@Kad'}
        </p>
      </div>

      {/* Konten Dokumen */}
      <div className="mb-8">
        {children}
      </div>

      {/* Penandatangan */}
      {showSignature && (
        <PenandatanganDokumen 
          mode={signatureMode}
          showGuru={showGuruSignature}
        />
      )}

      {/* Print-only styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 2cm;
            size: A4;
          }
          html, body {
            background: white !important;
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          aside, header, nav, button, .fixed, .absolute.top-0 {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          div {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}} />
    </div>
  );
};

export default PrintLayout;