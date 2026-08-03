"use client";

import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { convertBase64ToPublicUrl } from '@/utils/imageCompression';
import { appendVersionToAssetUrl, DEFAULT_OG_IMAGE_PATH, DEFAULT_SITE_URL } from '@/config/site';

const getRuntimeOrigin = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return DEFAULT_SITE_URL;
};

const buildAbsoluteUrl = (value?: string, fallbackPath = DEFAULT_OG_IMAGE_PATH) => {
  const origin = getRuntimeOrigin();
  const fallbackUrl = new URL(fallbackPath, `${origin}/`).href;

  const isHttpUrl = (url: URL) => url.protocol === 'https:' || url.protocol === 'http:';

  if (!value || !value.trim()) {
    return fallbackUrl;
  }

  const cleanValue = value.trim();

  if (cleanValue.startsWith('data:')) {
    return fallbackUrl;
  }

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    try {
      const url = new URL(cleanValue);
      return isHttpUrl(url) ? url.href : fallbackUrl;
    } catch {
      return fallbackUrl;
    }
  }

  if (cleanValue.startsWith('//')) {
    return `https:${cleanValue}`;
  }

  try {
    const url = new URL(cleanValue, `${origin}/`);
    return isHttpUrl(url) ? url.href : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
};

const buildPageUrl = (value?: string) => {
  if (value?.trim()) {
    return buildAbsoluteUrl(value, '/');
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    // Pakai URL tanpa query/hash agar canonical/og:url stabil meskipun ada cache-buster (?v=...)
    const path = window.location.pathname || '/';
    return `${window.location.origin.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  return DEFAULT_SITE_URL;
};

const DEFAULT_OG_IMAGE = buildAbsoluteUrl(DEFAULT_OG_IMAGE_PATH);

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

const SEO = ({ title: customTitle, description: customDescription, image: customImage, url: customUrl }: SEOProps = {}) => {
  const { settings } = useSiteSettings();

  const general = useMemo(() => settings.general || {}, [settings.general]);
  const identitas = useMemo(() => settings.identitas_madrasah || {}, [settings.identitas_madrasah]);
  const seo = useMemo(() => settings.seo || {}, [settings.seo]);

  const metaTitle = customTitle || seo.title || general.school_name || 'Si@Kad Madrasah';
  const rawMetaDescription = customDescription || seo.description || general.tagline || "Sistem Informasi Akademik Modern Si@Kad Madrasah";
  const metaDescription = rawMetaDescription.replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim() || general.tagline || "Sistem Informasi Akademik Modern Si@Kad Madrasah";

  // Open Graph & Twitter dapat di-override dari modul SEO & Sosmed
  const ogTitle = seo.og_title?.trim() ? seo.og_title.trim() : metaTitle;
  const ogDescription = seo.og_description?.trim() ? seo.og_description.trim() : metaDescription;
  const twitterTitle = seo.twitter_title?.trim() ? seo.twitter_title.trim() : ogTitle;
  const twitterDescription = seo.twitter_description?.trim() ? seo.twitter_description.trim() : ogDescription;

  const schoolName = metaTitle;
  const rawLogoUrl = customImage || seo.og_image_url || seo.image_url || identitas.logo_url || DEFAULT_OG_IMAGE;
  const versionedLogoUrl = appendVersionToAssetUrl(rawLogoUrl, seo.og_image_updated_at);
  const initialLogoUrl = buildAbsoluteUrl(versionedLogoUrl || rawLogoUrl);
  const [activeLogoUrl, setActiveLogoUrl] = useState<string>(initialLogoUrl);
  const siteDomain = buildPageUrl(customUrl || seo.website_url);
  const pageTitle = `${metaTitle} - ${metaDescription}`;
  const lowerImg = activeLogoUrl.toLowerCase();
  const imageType = seo.og_image_type?.trim()
    ? seo.og_image_type.trim()
    : lowerImg.includes('.png')
      ? 'image/png'
      : lowerImg.includes('.webp')
        ? 'image/webp'
        : 'image/jpeg';

  // Handle auto conversion if rawLogoUrl is base64
  useEffect(() => {
    const absUrl = buildAbsoluteUrl(versionedLogoUrl || rawLogoUrl);
    setActiveLogoUrl(absUrl);

    if (rawLogoUrl && rawLogoUrl.startsWith('data:')) {
      convertBase64ToPublicUrl(rawLogoUrl).then((publicUrl) => {
        if (publicUrl && publicUrl.startsWith('http')) {
          setActiveLogoUrl(buildAbsoluteUrl(appendVersionToAssetUrl(publicUrl, seo.og_image_updated_at) || publicUrl));
        }
      });
    }
  }, [rawLogoUrl, versionedLogoUrl, seo.og_image_updated_at]);

  // Direct DOM fallback update for legacy webview crawlers
  useEffect(() => {
    document.title = pageTitle;

    if (activeLogoUrl && !activeLogoUrl.startsWith('data:')) {
      try {
        localStorage.setItem('siakad_og_image', activeLogoUrl);
      } catch (err) {
        console.warn('Unable to store siakad_og_image in localStorage:', err);
      }
    }

    const updateMeta = (key: string, content: string, attr: 'property' | 'name' = 'property') => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const updateLink = (rel: string, href?: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!href) {
        if (element) element.remove();
        return;
      }
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    updateMeta('description', metaDescription, 'name');
    if (activeLogoUrl) {
      updateMeta('image', activeLogoUrl, 'name');
      updateLink('image_src', activeLogoUrl);
    }

    // Open Graph
    updateMeta('og:type', 'website', 'property');
    updateMeta('og:locale', 'id_ID', 'property');
    updateMeta('og:site_name', schoolName, 'property');
    updateMeta('og:title', ogTitle, 'property');
    updateMeta('og:description', ogDescription, 'property');
    if (activeLogoUrl) {
      updateMeta('og:image', activeLogoUrl, 'property');
      updateMeta('og:image:url', activeLogoUrl, 'property');
      updateMeta('og:image:secure_url', activeLogoUrl, 'property');
      updateMeta('og:image:type', imageType, 'property');
      updateMeta('og:image:width', '1200', 'property');
      updateMeta('og:image:height', '630', 'property');
      updateMeta('og:image:alt', schoolName, 'property');
    }
    updateMeta('og:url', siteDomain, 'property');

    // Twitter
    updateMeta('twitter:card', 'summary_large_image', 'name');
    updateMeta('twitter:title', twitterTitle, 'name');
    updateMeta('twitter:description', twitterDescription, 'name');
    if (activeLogoUrl) {
      updateMeta('twitter:image', activeLogoUrl, 'name');
      updateMeta('twitter:image:src', activeLogoUrl, 'name');
      updateMeta('twitter:image:alt', schoolName, 'name');
    }
    if (seo.twitter_site?.trim()) updateMeta('twitter:site', seo.twitter_site.trim(), 'name');
    if (seo.twitter_creator?.trim()) updateMeta('twitter:creator', seo.twitter_creator.trim(), 'name');
    updateMeta('twitter:url', siteDomain, 'name');
    updateLink('canonical', siteDomain);
  }, [pageTitle, schoolName, metaDescription, ogTitle, ogDescription, twitterTitle, twitterDescription, activeLogoUrl, siteDomain, imageType, seo.twitter_site, seo.twitter_creator]);

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={metaDescription} />
      {activeLogoUrl ? <meta name="image" content={activeLogoUrl} /> : null}
      {activeLogoUrl ? <link rel="image_src" href={activeLogoUrl} /> : null}

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:site_name" content={schoolName} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      {activeLogoUrl ? <meta property="og:image" content={activeLogoUrl} /> : null}
      {activeLogoUrl ? <meta property="og:image:url" content={activeLogoUrl} /> : null}
      {activeLogoUrl ? <meta property="og:image:secure_url" content={activeLogoUrl} /> : null}
      {activeLogoUrl ? <meta property="og:image:type" content={imageType} /> : null}
      {activeLogoUrl ? <meta property="og:image:width" content="1200" /> : null}
      {activeLogoUrl ? <meta property="og:image:height" content="630" /> : null}
      {activeLogoUrl ? <meta property="og:image:alt" content={schoolName} /> : null}
      <meta property="og:url" content={siteDomain} />
      <link rel="canonical" href={siteDomain} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      {activeLogoUrl ? <meta name="twitter:image" content={activeLogoUrl} /> : null}
      {activeLogoUrl ? <meta name="twitter:image:alt" content={schoolName} /> : null}
      {seo.twitter_site?.trim() ? <meta name="twitter:site" content={seo.twitter_site.trim()} /> : null}
      {seo.twitter_creator?.trim() ? <meta name="twitter:creator" content={seo.twitter_creator.trim()} /> : null}
      <meta name="twitter:url" content={siteDomain} />
    </Helmet>
  );
};

export default SEO;
