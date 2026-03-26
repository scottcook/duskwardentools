import type { Metadata } from 'next';

export const siteConfig = {
  name: 'Duskwarden Tools',
  shortName: 'Duskwarden',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://duskwarden.vercel.app',
  email: 'duskwardentools@gmail.com',
  donateUrl: 'https://buymeacoffee.com/duskwarden',
  defaultTitle: 'Duskwarden | Monster Stat Block Converter for OSR and Shadowdark-Compatible Play',
  defaultDescription:
    'Convert 5e, OSE, B/X, and generic monster stat blocks into streamlined OSR and Shadowdark-compatible stat cards with export and print support.',
  ogImage: '/og-image.jpg',
} as const;

export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.url).toString();
}

interface MetadataInput {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noindex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path = '/',
  keywords = [],
  noindex = false,
}: MetadataInput): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      title,
      description,
      url: path,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1024,
          height: 537,
          alt: 'Duskwarden Tools — Monster Stat Block Converter',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}
