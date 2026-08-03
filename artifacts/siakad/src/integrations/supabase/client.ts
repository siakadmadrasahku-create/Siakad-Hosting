import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (typeof window !== 'undefined' && (window as any).__ENV_SUPABASE_URL__) ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://zyytldzzqahayjxyegdm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  (typeof window !== 'undefined' && (window as any).__ENV_SUPABASE_ANON_KEY__) ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5eXRsZHp6cWFoYXlqeHllZ2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzA1MzAsImV4cCI6MjA4OTUwNjUzMH0.xNhRWM9qCOcIfu89jbM-atzp3pj86h2lUVmibn18UEI";

const rawSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// MySQL Adapter untuk Hosting Plesk / cPanel / DirectAdmin
const mysqlApiUrl = typeof window !== 'undefined' ? (window as any).__ENV_MYSQL_API_URL__ || '/api.php' : '/api.php';
const isMysqlEnabled = typeof window !== 'undefined' && Boolean((window as any).__ENV_USE_MYSQL__);

// Fast Memory Cache for Blazing Fast Performance
const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 15000; // 15 detik cache sebelum re-fetch background

function createMysqlClient() {
  return {
    from: (tableName: string) => {
      let targetId: string | null = null;

      const getCacheKey = () => `${tableName}:${targetId || 'ALL'}`;

      const builder = {
        select: (cols?: string) => builder,
        eq: (col: string, val: any) => {
          if (col === 'id') targetId = String(val);
          return builder;
        },
        maybeSingle: async () => {
          const cacheKey = getCacheKey();
          const cached = memoryCache[cacheKey];
          if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            // High-speed background sync
            fetch(targetId 
              ? `${mysqlApiUrl}?action=select&table=${tableName}&id=${encodeURIComponent(targetId)}`
              : `${mysqlApiUrl}?action=select&table=${tableName}`)
              .then(r => r.json())
              .then(json => {
                if (json.data) memoryCache[cacheKey] = { data: json.data, timestamp: Date.now() };
              }).catch(() => {});
            return { data: cached.data || null, error: null };
          }

          try {
            const url = targetId 
              ? `${mysqlApiUrl}?action=select&table=${tableName}&id=${encodeURIComponent(targetId)}`
              : `${mysqlApiUrl}?action=select&table=${tableName}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.data) {
              memoryCache[cacheKey] = { data: json.data, timestamp: Date.now() };
            }
            return { data: json.data || null, error: json.error || null };
          } catch (e: any) {
            return { data: cached ? cached.data : null, error: e };
          }
        },
        then: async (resolve: any, reject?: any) => {
          const cacheKey = getCacheKey();
          const cached = memoryCache[cacheKey];
          
          if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            const cachedResult = { data: cached.data ? (Array.isArray(cached.data) ? cached.data : [cached.data]) : [], error: null };
            // Background sync
            fetch(targetId 
              ? `${mysqlApiUrl}?action=select&table=${tableName}&id=${encodeURIComponent(targetId)}`
              : `${mysqlApiUrl}?action=select&table=${tableName}`)
              .then(r => r.json())
              .then(json => {
                if (json.data) memoryCache[cacheKey] = { data: json.data, timestamp: Date.now() };
              }).catch(() => {});
            return resolve ? resolve(cachedResult) : cachedResult;
          }

          try {
            const url = targetId 
              ? `${mysqlApiUrl}?action=select&table=${tableName}&id=${encodeURIComponent(targetId)}`
              : `${mysqlApiUrl}?action=select&table=${tableName}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.data) {
              memoryCache[cacheKey] = { data: json.data, timestamp: Date.now() };
            }
            const result = { data: json.data ? (Array.isArray(json.data) ? json.data : [json.data]) : [], error: json.error || null };
            return resolve ? resolve(result) : result;
          } catch (e: any) {
            const errResult = { data: cached ? (Array.isArray(cached.data) ? cached.data : [cached.data]) : null, error: e };
            return resolve ? resolve(errResult) : errResult;
          }
        },
        upsert: async (payload: any) => {
          try {
            // Instantly invalidate memory cache
            delete memoryCache[`${tableName}:${payload?.id || 'ALL'}`];
            delete memoryCache[`${tableName}:ALL`];

            const res = await fetch(`${mysqlApiUrl}?action=upsert&table=${tableName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const json = await res.json();
            return { data: json.data || null, error: json.error || null };
          } catch (e: any) {
            return { data: null, error: e };
          }
        },
        delete: () => ({
          eq: async (col: string, val: any) => {
            try {
              delete memoryCache[`${tableName}:${val}`];
              delete memoryCache[`${tableName}:ALL`];

              const res = await fetch(`${mysqlApiUrl}?action=delete&table=${tableName}&id=${encodeURIComponent(val)}`, { method: 'DELETE' });
              const json = await res.json();
              return { data: json.data || true, error: json.error || null };
            } catch (e: any) {
              return { data: null, error: e };
            }
          }
        })
      };

      return builder;
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (filePath: string, file: any, options?: any) => {
          try {
            const formData = new FormData();
            formData.append('file', file, filePath.split('/').pop() || 'upload');
            formData.append('filePath', filePath);
            const res = await fetch(`${mysqlApiUrl}?action=upload`, {
              method: 'POST',
              body: formData
            });
            const json = await res.json();
            if (json.publicUrl) {
              return { data: { path: json.path }, error: null };
            }
            return { data: null, error: json.error || 'Upload failed' };
          } catch (e: any) {
            return { data: null, error: e };
          }
        },
        getPublicUrl: (filePath: string) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          return { data: { publicUrl: `${origin}/${filePath.startsWith('uploads/') ? filePath : 'uploads/' + filePath}` } };
        }
      })
    },
    auth: rawSupabase.auth,
    functions: rawSupabase.functions,
  };
}

export const supabase = (isMysqlEnabled ? createMysqlClient() : rawSupabase) as any;

