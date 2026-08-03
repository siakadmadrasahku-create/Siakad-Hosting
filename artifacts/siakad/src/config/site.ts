export const SITE_URL_FALLBACK = 'https://siakad-madrasah.edgeone.dev';

const getRuntimeOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
};

export const DEFAULT_SITE_URL = (
  import.meta.env.VITE_SITE_URL?.trim() ||
  getRuntimeOrigin() ||
  SITE_URL_FALLBACK
).replace(/\/+$/, '');

export const DEFAULT_SITE_URL_WITH_SLASH = `${DEFAULT_SITE_URL}/`;

export const DEFAULT_OG_IMAGE_NAME = 'og-image-share-v2.jpeg';
export const DEFAULT_OG_IMAGE_PATH = `/${DEFAULT_OG_IMAGE_NAME}`;
export const SEO_SHARE_IMAGE_STORAGE_PATH = 'settings/seo-social-share';

export const normalizeSiteUrl = (value?: string, trailingSlash = false) => {
  const normalized = (value?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '');
  return trailingSlash ? `${normalized}/` : normalized;
};

export const buildDefaultOgImageUrl = (siteUrl?: string) => {
  const origin = normalizeSiteUrl(siteUrl);
  return new URL(DEFAULT_OG_IMAGE_PATH, `${origin}/`).href;
};

export const appendVersionToAssetUrl = (value?: string, version?: string) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:') || !version) {
    return trimmed;
  }

  try {
    const isProtocolRelative = trimmed.startsWith('//');
    const baseValue = isProtocolRelative ? `https:${trimmed}` : trimmed;
    const url = new URL(baseValue, `${DEFAULT_SITE_URL}/`);
    url.searchParams.set('v', version);
    return isProtocolRelative ? url.toString().replace(/^https:/, '') : url.toString();
  } catch {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}v=${encodeURIComponent(version)}`;
  }
};

export const stripVersionFromAssetUrl = (value?: string) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    const isProtocolRelative = trimmed.startsWith('//');
    const baseValue = isProtocolRelative ? `https:${trimmed}` : trimmed;
    const url = new URL(baseValue, `${DEFAULT_SITE_URL}/`);
    url.searchParams.delete('v');

    const normalized = url.toString();
    return isProtocolRelative ? normalized.replace(/^https:/, '') : normalized;
  } catch {
    return trimmed.replace(/([?&])v=[^&]*(&|$)/, (_match, prefix, suffix) => {
      if (prefix === '?' && suffix) return '?';
      if (prefix === '&' && suffix) return '&';
      return '';
    }).replace(/[?&]$/, '');
  }
};
