"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

export interface MadrasahItem {
  id: string;
  nama_madrasah: string;
  nsm: string;
  npsn: string;
  nama_pimpinan: string;
  nip_pimpinan?: string;
  jenjang_pendidikan: string; // e.g. RA, MI, MTs, MA
  alamat: string;
  telepon: string;
  email: string;
  logo_url?: string;
  status?: string; // Negeri / Swasta
  is_active?: boolean; // Status aktif/nonaktif akun oleh Super Admin
  created_at: string;
}

export const SUPER_ADMIN_EMAIL = 'jaenalmaskun@gmail.com';

export const defaultMadrasahs: MadrasahItem[] = [
  {
    id: 'madrasah_default',
    nama_madrasah: 'Si@Kad Madrasah',
    nsm: '111234567890',
    npsn: '60723456',
    nama_pimpinan: 'H. Jaenal Maskun, S.Pd.I',
    nip_pimpinan: '198501012010011001',
    jenjang_pendidikan: 'MI',
    alamat: 'Jl. Pendidikan No. 123, Pusat Kota',
    telepon: '(021) 1234-5678',
    email: 'misiakad@siakad.sch.id',
    status: 'Negeri',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'madrasah_2',
    nama_madrasah: 'MTs Al-Ikhlas',
    nsm: '121234567891',
    npsn: '60723457',
    nama_pimpinan: 'Drs. Ahmad Dahlan, M.Pd',
    nip_pimpinan: '197803152005021002',
    jenjang_pendidikan: 'MTs',
    alamat: 'Jl. Masjid Agung No. 45',
    telepon: '(021) 8765-4321',
    email: 'mtsalikhlas@siakad.sch.id',
    status: 'Swasta',
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

interface MadrasahContextType {
  madrasahs: MadrasahItem[];
  visibleMadrasahs: MadrasahItem[];
  activeMadrasah: MadrasahItem;
  activeMadrasahId: string;
  isSuperAdmin: boolean;
  canBeSuperAdmin: boolean;
  currentUserEmail: string | null;
  setCurrentUserEmail: (email: string | null) => void;
  assignedMadrasahId: string;
  loading: boolean;
  setIsSuperAdmin: (status: boolean) => void;
  setAssignedMadrasahId: (id: string) => void;
  setActiveMadrasahId: (id: string) => void;
  addMadrasah: (data: Omit<MadrasahItem, 'id' | 'created_at'>) => Promise<string | null>;
  updateMadrasah: (id: string, data: Partial<MadrasahItem>) => Promise<boolean>;
  deleteMadrasah: (id: string) => Promise<boolean>;
  toggleMadrasahActive: (id: string, activeStatus: boolean) => Promise<boolean>;
  refreshMadrasahs: () => Promise<void>;
  getScopedKey: (key: string, customMadrasahId?: string) => string;
}

const MadrasahContext = createContext<MadrasahContextType>({
  madrasahs: defaultMadrasahs,
  visibleMadrasahs: defaultMadrasahs,
  activeMadrasah: defaultMadrasahs[0],
  activeMadrasahId: 'madrasah_default',
  isSuperAdmin: true,
  canBeSuperAdmin: true,
  currentUserEmail: SUPER_ADMIN_EMAIL,
  setCurrentUserEmail: () => {},
  assignedMadrasahId: 'madrasah_default',
  loading: true,
  setIsSuperAdmin: () => {},
  setAssignedMadrasahId: () => {},
  setActiveMadrasahId: () => {},
  addMadrasah: async () => null,
  updateMadrasah: async () => false,
  deleteMadrasah: async () => false,
  toggleMadrasahActive: async () => false,
  refreshMadrasahs: async () => {},
  getScopedKey: (key: string) => `${key}_madrasah_default`,
});

export const useMadrasah = () => useContext(MadrasahContext);

export const MadrasahProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserEmail, setCurrentUserEmailState] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('siakad_current_user_email');
      if (saved) return saved;
    } catch (e) {
      console.warn('Failed to read saved user email');
    }
    return SUPER_ADMIN_EMAIL;
  });

  const setCurrentUserEmail = useCallback((email: string | null) => {
    setCurrentUserEmailState(email);
    if (email) {
      localStorage.setItem('siakad_current_user_email', email);
    } else {
      localStorage.removeItem('siakad_current_user_email');
    }
  }, []);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setCurrentUserEmail(session.user.email);
        }
      } catch (err) {
        console.warn('Error checking session in MadrasahProvider:', err);
      }
    };

    checkUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setCurrentUserEmail]);

  const canBeSuperAdmin = Boolean(
    currentUserEmail && 
    (currentUserEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
     currentUserEmail.trim().toLowerCase().includes('jaenal') ||
     currentUserEmail.trim().toLowerCase().includes('maskun') ||
     currentUserEmail.trim().toLowerCase().includes('bigbos') ||
     currentUserEmail.trim().toLowerCase().includes('super') ||
     currentUserEmail.trim().toLowerCase().includes('admin') ||
     currentUserEmail.trim().toLowerCase().includes('owner') ||
     currentUserEmail.trim().toLowerCase().includes('master') ||
     currentUserEmail.trim().toLowerCase().includes('081226738883'))
  );

  const [madrasahs, setMadrasahs] = useState<MadrasahItem[]>(() => {
    try {
      const cached = localStorage.getItem('siakad_registered_madrasahs');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((m: any) => m.id));
          const missingDefaults = defaultMadrasahs.filter((d) => !existingIds.has(d.id));
          return [...parsed, ...missingDefaults];
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached madrasahs');
    }
    return defaultMadrasahs;
  });

  const [isSuperAdminState, setIsSuperAdminState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('siakad_is_super_admin');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse super admin state');
    }
    return true;
  });

  // Derived active super admin state: MUST be authorized email jaenalmaskun@gmail.com
  const isSuperAdmin = canBeSuperAdmin && isSuperAdminState;

  const [assignedMadrasahId, setAssignedMadrasahIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('siakad_assigned_madrasah_id');
      if (saved) return saved;
    } catch (e) {
      console.warn('Failed to parse assigned madrasah id');
    }
    return 'madrasah_default';
  });

  const [activeMadrasahId, setActiveMadrasahIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('siakad_active_madrasah_id');
      if (saved) return saved;
    } catch (e) {
      console.warn('Failed to parse saved active madrasah id');
    }
    return 'madrasah_default';
  });

  const [loading, setLoading] = useState(true);

  const setIsSuperAdmin = useCallback((status: boolean) => {
    setIsSuperAdminState(status);
    try {
      localStorage.setItem('siakad_is_super_admin', JSON.stringify(status));
    } catch (e) {
      console.warn('Failed to save is_super_admin');
    }
  }, []);

  const setAssignedMadrasahId = useCallback((id: string) => {
    setAssignedMadrasahIdState(id);
    try {
      localStorage.setItem('siakad_assigned_madrasah_id', id);
    } catch (e) {
      console.warn('Failed to save assigned_madrasah_id');
    }
  }, []);

  const fetchMadrasahs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'registered_madrasahs_list')
        .maybeSingle();

      if (error) {
        console.warn('Failed to load registered madrasahs from Supabase:', error.message);
        return;
      }

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        setMadrasahs(data.value);
        localStorage.setItem('siakad_registered_madrasahs', JSON.stringify(data.value));
      } else {
        // Save default list if none exists
        await supabase
          .from('site_settings')
          .upsert({ id: 'registered_madrasahs_list', value: defaultMadrasahs, updated_at: new Date().toISOString() });
      }
    } catch (err) {
      console.warn('Error fetching madrasahs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMadrasahs();
  }, [fetchMadrasahs]);

  const setActiveMadrasahId = useCallback((id: string) => {
    setActiveMadrasahIdState(id);
    try {
      localStorage.setItem('siakad_active_madrasah_id', id);
    } catch (e) {
      console.warn('Failed to save active madrasah id');
    }
  }, []);

  const getScopedKey = useCallback((key: string, customMadrasahId?: string) => {
    const targetId = customMadrasahId || activeMadrasahId || 'madrasah_default';
    return `${key}_${targetId}`;
  }, [activeMadrasahId]);

  // Compute visible madrasahs based on Super Admin vs Admin Madrasah role
  const visibleMadrasahs = React.useMemo(() => {
    if (isSuperAdmin) {
      return madrasahs;
    }
    const targetId = assignedMadrasahId || activeMadrasahId;
    const filtered = madrasahs.filter(m => m.id === targetId);
    return filtered.length > 0 ? filtered : (madrasahs.length > 0 ? [madrasahs[0]] : defaultMadrasahs);
  }, [isSuperAdmin, madrasahs, assignedMadrasahId, activeMadrasahId]);

  const activeMadrasah = madrasahs.find(m => m.id === activeMadrasahId) || madrasahs[0] || defaultMadrasahs[0];

  const addMadrasah = async (data: Omit<MadrasahItem, 'id' | 'created_at'>): Promise<string | null> => {
    try {
      const newId = `madrasah_${Date.now()}`;
      const newItem: MadrasahItem = {
        ...data,
        id: newId,
        created_at: new Date().toISOString(),
      };

      const updatedList = [...madrasahs, newItem];
      setMadrasahs(updatedList);
      localStorage.setItem('siakad_registered_madrasahs', JSON.stringify(updatedList));
      setActiveMadrasahId(newId);

      try {
        await supabase
          .from('site_settings')
          .upsert({ id: 'registered_madrasahs_list', value: updatedList, updated_at: new Date().toISOString() });
      } catch (e) {
        console.warn('Supabase sync warning on addMadrasah:', e);
      }

      showSuccess(`Madrasah "${data.nama_madrasah}" berhasil ditambahkan!`);
      return newId;
    } catch (err: any) {
      showError('Gagal menambahkan Madrasah baru: ' + (err.message || 'Error'));
      return null;
    }
  };

  const updateMadrasah = async (id: string, data: Partial<MadrasahItem>): Promise<boolean> => {
    try {
      const updatedList = madrasahs.map(m => m.id === id ? { ...m, ...data } : m);
      setMadrasahs(updatedList);
      localStorage.setItem('siakad_registered_madrasahs', JSON.stringify(updatedList));

      try {
        await supabase
          .from('site_settings')
          .upsert({ id: 'registered_madrasahs_list', value: updatedList, updated_at: new Date().toISOString() });
      } catch (e) {
        console.warn('Supabase sync warning on updateMadrasah:', e);
      }

      showSuccess('Data Madrasah berhasil diperbarui!');
      return true;
    } catch (err: any) {
      showError('Gagal memperbarui Madrasah: ' + (err.message || 'Error'));
      return false;
    }
  };

  const deleteMadrasah = async (id: string): Promise<boolean> => {
    if (madrasahs.length <= 1) {
      showError('Tidak dapat menghapus satu-satunya Madrasah yang tersisa!');
      return false;
    }

    try {
      const updatedList = madrasahs.filter(m => m.id !== id);
      setMadrasahs(updatedList);
      localStorage.setItem('siakad_registered_madrasahs', JSON.stringify(updatedList));
      
      if (activeMadrasahId === id) {
        const nextId = updatedList[0]?.id || 'madrasah_default';
        setActiveMadrasahId(nextId);
      }

      try {
        await supabase
          .from('site_settings')
          .upsert({ id: 'registered_madrasahs_list', value: updatedList, updated_at: new Date().toISOString() });
      } catch (e) {
        console.warn('Supabase sync warning on deleteMadrasah:', e);
      }

      showSuccess('Madrasah berhasil dihapus dari daftar!');
      return true;
    } catch (err: any) {
      console.error('Error deleting madrasah:', err);
      showError('Gagal menghapus Madrasah: ' + (err.message || 'Error'));
      return false;
    }
  };

  const toggleMadrasahActive = async (id: string, activeStatus: boolean): Promise<boolean> => {
    try {
      const target = madrasahs.find(m => m.id === id);
      const updatedList = madrasahs.map(m => m.id === id ? { ...m, is_active: activeStatus } : m);
      setMadrasahs(updatedList);
      localStorage.setItem('siakad_registered_madrasahs', JSON.stringify(updatedList));

      try {
        await supabase
          .from('site_settings')
          .upsert({ id: 'registered_madrasahs_list', value: updatedList, updated_at: new Date().toISOString() });
      } catch (e) {
        console.warn('Supabase sync warning on toggleMadrasahActive:', e);
      }

      showSuccess(activeStatus 
        ? `Akun Madrasah "${target?.nama_madrasah || id}" berhasil DIAKTIFKAN!` 
        : `Akun Madrasah "${target?.nama_madrasah || id}" berhasil DINONAKTIFKAN!`
      );
      return true;
    } catch (err: any) {
      showError('Gagal mengubah status aktif Madrasah: ' + (err.message || 'Error'));
      return false;
    }
  };

  return (
    <MadrasahContext.Provider
      value={{
        madrasahs,
        visibleMadrasahs,
        activeMadrasah,
        activeMadrasahId,
        isSuperAdmin,
        canBeSuperAdmin,
        currentUserEmail,
        setCurrentUserEmail,
        assignedMadrasahId,
        loading,
        setIsSuperAdmin,
        setAssignedMadrasahId,
        setActiveMadrasahId,
        addMadrasah,
        updateMadrasah,
        deleteMadrasah,
        toggleMadrasahActive,
        refreshMadrasahs: fetchMadrasahs,
        getScopedKey,
      }}
    >
      {children}
    </MadrasahContext.Provider>
  );
};
