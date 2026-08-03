import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <div className="text-center">
          <div className="text-8xl md:text-9xl font-extrabold text-emerald-200 mb-4">404</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Halaman Tidak Ditemukan</h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6">
                <Home className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </a>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="rounded-xl px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Halaman Sebelumnya
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;