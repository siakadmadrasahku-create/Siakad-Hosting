export interface SlideItem {
  url: string;
  title: string;
  subtitle: string;
}

export function flattenSlideItems(
  rawList: any[],
  defaultTitle: string,
  defaultSubtitle: string
): SlideItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  const result: SlideItem[] = [];

  rawList.forEach((item) => {
    if (!item) return;

    if (typeof item === 'string') {
      if (item.trim()) {
        result.push({
          url: item.trim(),
          title: defaultTitle,
          subtitle: defaultSubtitle,
        });
      }
    } else if (typeof item === 'object') {
      const title = item.title !== undefined && item.title !== null ? item.title : defaultTitle;
      const subtitle = item.subtitle !== undefined && item.subtitle !== null ? item.subtitle : defaultSubtitle;

      // Check for multi-photo arrays (urls or images)
      const multiUrls = Array.isArray(item.urls)
        ? item.urls
        : Array.isArray(item.images)
        ? item.images
        : null;

      if (multiUrls && multiUrls.length > 0) {
        multiUrls.forEach((u: any) => {
          if (typeof u === 'string' && u.trim()) {
            result.push({
              url: u.trim(),
              title,
              subtitle,
            });
          }
        });
      } else if (typeof item.url === 'string' && item.url.trim()) {
        result.push({
          url: item.url.trim(),
          title,
          subtitle,
        });
      }
    }
  });

  return result;
}
