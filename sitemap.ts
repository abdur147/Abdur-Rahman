import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';
import { getCatalog } from '@/lib/data';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = ['', '/services', '/portfolio', '/pricing', '/contact', '/faq', '/order', '/track', '/privacy', '/terms', '/refund-policy'];
  const catalog = await getCatalog().catch(() => []);
  return [
    ...staticPaths.map((p) => ({ url: `${SITE.url}${p}`, lastModified: now, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...catalog.flatMap((c) =>
      c.services.map((s) => ({ url: `${SITE.url}/services/${s.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ),
  ];
}
