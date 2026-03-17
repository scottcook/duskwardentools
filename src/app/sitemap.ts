import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/5e-to-osr-monster-converter'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/shadowdark-compatible-monster-stat-cards'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/ose-bx-monster-converter'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: absoluteUrl('/faq'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
