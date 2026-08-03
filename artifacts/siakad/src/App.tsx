import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { MadrasahProvider } from "@/contexts/MadrasahContext";
import SEO from "./components/SEO";
import StickyFooter from "./components/StickyFooter";
import RunningTextTicker from "./components/RunningTextTicker";
import AIAssistant from "./components/AIAssistant";

// Lazy Loaded Pages untuk Performa Loading Super Cepat
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const SPMB = lazy(() => import("./pages/SPMB"));
const StudentsList = lazy(() => import("./pages/StudentsList"));
const Links = lazy(() => import("./pages/Links"));
const CalendarPublic = lazy(() => import("./pages/Calendar"));
const LibraryPublic = lazy(() => import("./pages/Library"));
const JadwalPelajaranPublic = lazy(() => import("./pages/JadwalPelajaran"));
const TeachersList = lazy(() => import("./pages/TeachersList"));
const ProfilMadrasah = lazy(() => import("./pages/ProfilMadrasah"));
const AITeachingPublic = lazy(() => import("./pages/AITeaching"));
const MateriInteraktifPublic = lazy(() => import("./pages/MateriInteraktif"));
const TeachingAidsPublic = lazy(() => import("./pages/TeachingAids"));
const TranslatorPublic = lazy(() => import("./pages/Translator"));
const ExamCards = lazy(() => import("./pages/ExamCards"));

// Lazy Loaded Admin Pages
const DashboardHome = lazy(() => import("./pages/admin/DashboardHome"));
const AnnouncementsAdmin = lazy(() => import("./pages/admin/AnnouncementsAdmin"));
const GalleryAdmin = lazy(() => import("./pages/admin/GalleryAdmin"));
const PostsAdmin = lazy(() => import("./pages/admin/PostsAdmin"));
const SettingsAdmin = lazy(() => import("./pages/admin/SettingsAdmin"));
const APIConfig = lazy(() => import("./pages/admin/APIConfig"));
const IdentitasMadrasah = lazy(() => import("./pages/admin/IdentitasMadrasah"));
const DataTamatan = lazy(() => import("./pages/admin/DataTamatan"));
const DataPrestasi = lazy(() => import("./pages/admin/DataPrestasi"));
const RekapSiswaAdmin = lazy(() => import("./pages/admin/RekapSiswaAdmin"));
const Penandatangan = lazy(() => import("./pages/admin/Penandatangan"));
const TahunPelajaran = lazy(() => import("./pages/admin/TahunPelajaran"));
const ArsipAkademik = lazy(() => import("./pages/admin/ArsipAkademik"));
const PrintSettings = lazy(() => import("./pages/admin/PrintSettings"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));
const ManajemenSiswa = lazy(() => import("./pages/admin/ManajemenSiswa"));
const ManajemenRombel = lazy(() => import("./pages/admin/ManajemenRombel"));
const TeachersAdmin = lazy(() => import("./pages/admin/TeachersAdmin"));
const CalendarAdmin = lazy(() => import("./pages/admin/CalendarAdmin"));
const LinksAdmin = lazy(() => import("./pages/admin/LinksAdmin"));
const BackupAdmin = lazy(() => import("./pages/admin/BackupAdmin"));
const KelolaMadrasah = lazy(() => import("./pages/admin/KelolaMadrasah"));
const LogoDesigner = lazy(() => import("./pages/admin/LogoDesigner"));
const PrintPreviewPage = lazy(() => import("./pages/admin/PrintPreviewPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy Loaded Sub-Modules
const MatrikKurikulum = lazy(() => import("./pages/admin/kurikulum/MatrikKurikulum"));
const BedahCP = lazy(() => import("./pages/admin/kurikulum/BedahCP"));
const MataPelajaran = lazy(() => import("./pages/admin/kurikulum/MataPelajaran"));
const JadwalPelajaranAdmin = lazy(() => import("./pages/admin/kurikulum/JadwalPelajaran"));
const AITeachingAdmin = lazy(() => import("./pages/admin/kurikulum/AITeaching"));
const BankSoal = lazy(() => import("./pages/admin/kurikulum/BankSoal"));
const KisiKisi = lazy(() => import("./pages/admin/kurikulum/KisiKisi"));
const MateriInteraktifAdmin = lazy(() => import("./pages/admin/kurikulum/MateriInteraktif"));
const TeachingAidsAdmin = lazy(() => import("./pages/admin/kurikulum/TeachingAids"));
const LCKH = lazy(() => import("./pages/admin/kurikulum/LCKH"));
const InputNilai = lazy(() => import("./pages/admin/kurikulum/InputNilai"));
const CetakRapor = lazy(() => import("./pages/admin/kurikulum/CetakRapor"));
const AbsensiSiswa = lazy(() => import("./pages/admin/kurikulum/AbsensiSiswa"));
const RekapAbsensi = lazy(() => import("./pages/admin/kurikulum/RekapAbsensi"));
const CoverGenerator = lazy(() => import("./pages/admin/kurikulum/CoverGenerator"));
const ExamCardGenerator = lazy(() => import("./pages/admin/kurikulum/ExamCardGenerator"));

const BookCatalog = lazy(() => import("./pages/admin/library/BookCatalog"));
const Circulation = lazy(() => import("./pages/admin/library/Circulation"));

const SppSettings = lazy(() => import("./pages/admin/finance/SppSettings"));
const PaymentEntry = lazy(() => import("./pages/admin/finance/PaymentEntry"));
const PaymentHistory = lazy(() => import("./pages/admin/finance/PaymentHistory"));
const ReceiptGenerator = lazy(() => import("./pages/admin/finance/ReceiptGenerator"));

const PusatKendali = lazy(() => import("./pages/admin/spmb/PusatKendali"));
const DaftarPendaftar = lazy(() => import("./pages/admin/spmb/DaftarPendaftar"));
const BrosurSPMB = lazy(() => import("./pages/admin/spmb/BrosurSPMB"));

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    <p className="mt-3 text-xs font-semibold tracking-wider text-emerald-400 uppercase animate-pulse">Memuat...</p>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <MadrasahProvider>
        <SiteSettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
              <SEO />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/spmb" element={<SPMB />} />
                  <Route path="/students-list" element={<StudentsList />} />
                  <Route path="/kelas" element={<StudentsList />} />
                  <Route path="/siswa" element={<StudentsList />} />
                  <Route path="/rekap-siswa-publik" element={<StudentsList />} />
                  <Route path="/direktori-siswa-publik" element={<StudentsList />} />
                  <Route path="/teachers" element={<TeachersList />} />
                  <Route path="/guru" element={<TeachersList />} />
                  <Route path="/profil-madrasah" element={<ProfilMadrasah />} />
                  <Route path="/profil" element={<ProfilMadrasah />} />
                  <Route path="/links" element={<Links />} />
                  <Route path="/calendar" element={<CalendarPublic />} />
                  <Route path="/library" element={<LibraryPublic />} />
                  <Route path="/jadwal" element={<JadwalPelajaranPublic />} />
                  <Route path="/ai-teaching" element={<AITeachingPublic />} />
                  <Route path="/materi-interaktif" element={<MateriInteraktifPublic />} />
                  <Route path="/teaching-aids" element={<TeachingAidsPublic />} />
                  <Route path="/translator" element={<TranslatorPublic />} />
                  <Route path="/exam-cards" element={<ExamCards />} />
                  <Route path="/admin" element={<DashboardHome />} />
                  <Route path="/admin/kelola-madrasah" element={<KelolaMadrasah />} />
                  <Route path="/admin/tahun-pelajaran" element={<TahunPelajaran />} />
                  <Route path="/admin/arsip-akademik" element={<ArsipAkademik />} />
                  <Route path="/admin/settings" element={<SettingsAdmin />} />
                  <Route path="/admin/print-settings" element={<PrintSettings />} />
                  <Route path="/admin/api-config" element={<APIConfig />} />
                  <Route path="/admin/backup" element={<BackupAdmin />} />
                  <Route path="/admin/identitas-madrasah" element={<IdentitasMadrasah />} />
                  <Route path="/admin/data-tamatan" element={<DataTamatan />} />
                  <Route path="/admin/data-prestasi" element={<DataPrestasi />} />
                  <Route path="/admin/rekap-siswa" element={<RekapSiswaAdmin />} />
                  <Route path="/admin/penandatangan" element={<Penandatangan />} />
                  <Route path="/admin/users" element={<UsersAdmin />} />
                  <Route path="/admin/manajemen-siswa" element={<ManajemenSiswa />} />
                  <Route path="/admin/manajemen-rombel" element={<ManajemenRombel />} />
                  <Route path="/admin/rombel" element={<ManajemenRombel />} />
                  <Route path="/admin/direktori-siswa" element={<ManajemenSiswa />} />
                  <Route path="/admin/students" element={<ManajemenSiswa />} />
                  <Route path="/admin/siswa" element={<ManajemenSiswa />} />
                  <Route path="/admin/teachers" element={<TeachersAdmin />} />
                  <Route path="/admin/guru" element={<TeachersAdmin />} />
                  <Route path="/admin/calendar" element={<CalendarAdmin />} />
                  <Route path="/admin/announcements" element={<AnnouncementsAdmin />} />
                  <Route path="/admin/gallery" element={<GalleryAdmin />} />
                  <Route path="/admin/posts" element={<PostsAdmin />} />
                  <Route path="/admin/links" element={<LinksAdmin />} />
                  {/* Kurikulum Admin */}
                  <Route path="/admin/kurikulum/matrik" element={<MatrikKurikulum />} />
                  <Route path="/admin/kurikulum/bedah-cp" element={<BedahCP />} />
                  <Route path="/admin/kurikulum/mapel" element={<MataPelajaran />} />
                  <Route path="/admin/kurikulum/jadwal" element={<JadwalPelajaranAdmin />} />
                  <Route path="/admin/kurikulum/ai-teaching" element={<AITeachingAdmin />} />
                  <Route path="/admin/kurikulum/bank-soal" element={<BankSoal />} />
                  <Route path="/admin/kurikulum/kisi-kisi" element={<KisiKisi />} />
                  <Route path="/admin/kurikulum/materi-interaktif" element={<MateriInteraktifAdmin />} />
                  <Route path="/admin/kurikulum/teaching-aids" element={<TeachingAidsAdmin />} />
                  <Route path="/admin/kurikulum/lckh" element={<LCKH />} />
                  <Route path="/admin/kurikulum/nilai" element={<InputNilai />} />
                  <Route path="/admin/kurikulum/rapor" element={<CetakRapor />} />
                  <Route path="/admin/kurikulum/absensi" element={<AbsensiSiswa />} />
                  <Route path="/admin/kurikulum/rekap-absensi" element={<RekapAbsensi />} />
                  <Route path="/admin/kurikulum/cover" element={<CoverGenerator />} />
                  <Route path="/admin/kurikulum/exam-card" element={<ExamCardGenerator />} />
                  {/* Library Admin */}
                  <Route path="/admin/library/books" element={<BookCatalog />} />
                  <Route path="/admin/library/circulation" element={<Circulation />} />
                  {/* Keuangan Admin */}
                  <Route path="/admin/finance/settings" element={<SppSettings />} />
                  <Route path="/admin/finance/payment" element={<PaymentEntry />} />
                  <Route path="/admin/finance/history" element={<PaymentHistory />} />
                  <Route path="/admin/finance/receipt" element={<ReceiptGenerator />} />
                  <Route path="/admin/logo-designer" element={<LogoDesigner />} />
                  {/* SPMB */}
                  <Route path="/admin/spmb/pusat-kendali" element={<PusatKendali />} />
                  <Route path="/admin/spmb/pendaftar" element={<DaftarPendaftar />} />
                  <Route path="/admin/spmb/brosur" element={<BrosurSPMB />} />
                  {/* Print Preview */}
                  <Route path="/admin/print/:type" element={<PrintPreviewPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <RunningTextTicker />
              <StickyFooter />
              <AIAssistant />
            </BrowserRouter>
          </TooltipProvider>
        </SiteSettingsProvider>
      </MadrasahProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
