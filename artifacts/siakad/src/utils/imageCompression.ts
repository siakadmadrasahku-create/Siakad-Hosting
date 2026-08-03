import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_OG_IMAGE_NAME } from '@/config/site';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

export const compressImage = async (file: File): Promise<File> => {
  // Always compress if > 100KB for maximum speed and small size
  if (file.size < 100 * 1024) {
    return file;
  }

  // Compression options optimized for web and social share cards
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1200,
    useWebWorker: false,
    initialQuality: 0.7,
  };

  try {
    const compressPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error('Compression timeout')), 2500)
    );
    return await Promise.race([compressPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Menggunakan file asli karena kompresi lambat/gagal:", error);
    return file;
  }
};

export const compressSignature = async (file: File): Promise<File> => {
  if (file.size < 150 * 1024) {
    return file;
  }
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 600,
    useWebWorker: false,
    initialQuality: 0.8,
  };

  try {
    const compressPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error('Signature compression timeout')), 1200)
    );
    return await Promise.race([compressPromise, timeoutPromise]);
  } catch (error) {
    return file;
  }
};

export const dataURLtoBlob = (dataurl: string): Blob => {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return new Blob([], { type: 'image/png' });
  }
};

export const uploadImageToStorage = async (file: File, folderPath: string = 'uploads'): Promise<string> => {
  // 1. Kompres gambar secara cepat (skip jika < 100KB)
  const targetFile = await compressImage(file);
  const targetBlob: Blob = targetFile || file;

  const getBase64 = (f: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  // 2. Upload via Litterbox (Catbox CDN - Direct HTTPS Image Link with CORS support)
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('time', '72h');
    formData.append('fileToUpload', targetBlob, file.name || DEFAULT_OG_IMAGE_NAME);

    const lbRes = await fetchWithTimeout('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: formData,
    }, 6000);

    if (lbRes.ok) {
      const text = (await lbRes.text()).trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        return text.replace('http://', 'https://');
      }
    }
  } catch (lbErr) {
    console.warn("Litterbox upload skipped:", lbErr);
  }

  // 3. Fallback: TmpFiles Direct Link
  try {
    const tmpFormData = new FormData();
    tmpFormData.append('file', targetBlob, file.name || DEFAULT_OG_IMAGE_NAME);
    const tmpRes = await fetchWithTimeout('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: tmpFormData,
    }, 6000);

    if (tmpRes.ok) {
      const json = await tmpRes.json();
      if (json?.data?.url) {
        // Convert page link to direct download link: https://tmpfiles.org/123/file.jpg -> https://tmpfiles.org/dl/123/file.jpg
        return json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/').replace('http://', 'https://');
      }
    }
  } catch (tmpErr) {
    console.warn("Tmpfiles upload skipped:", tmpErr);
  }

  // 4. Fallback: Supabase Storage
  try {
    const cleanFileName = (file.name || 'image.png').replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${cleanFileName}`;
    const filePath = `${folderPath}/${fileName}`;

    const uploadPromise = supabase.storage.from('public').upload(filePath, targetBlob, {
      cacheControl: '3600',
      upsert: true
    });

    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase storage timeout')), 3000)
    );

    const { error: uploadErr } = await Promise.race([uploadPromise, timeoutPromise]);

    if (!uploadErr) {
      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Supabase storage upload skipped:", err);
  }

  // 5. Fallback akhir ke Compressed Base64 Data URL
  return await getBase64(targetBlob);
};

export const convertBase64ToPublicUrl = async (base64Str: string): Promise<string> => {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:')) {
    return base64Str;
  }

  // Try Litterbox
  try {
    const blob = dataURLtoBlob(base64Str);
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('time', '72h');
    formData.append('fileToUpload', blob, DEFAULT_OG_IMAGE_NAME);

    const lbRes = await fetchWithTimeout('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: formData,
    }, 6000);

    if (lbRes.ok) {
      const text = (await lbRes.text()).trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        return text.replace('http://', 'https://');
      }
    }
  } catch (err) {
    console.warn("Litterbox base64 conversion skipped:", err);
  }

  // Try TmpFiles
  try {
    const blob = dataURLtoBlob(base64Str);
    const tmpFormData = new FormData();
    tmpFormData.append('file', blob, DEFAULT_OG_IMAGE_NAME);
    const tmpRes = await fetchWithTimeout('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: tmpFormData,
    }, 6000);

    if (tmpRes.ok) {
      const json = await tmpRes.json();
      if (json?.data?.url) {
        return json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/').replace('http://', 'https://');
      }
    }
  } catch (err) {
    console.warn("Tmpfiles base64 conversion skipped:", err);
  }

  return base64Str;
};
