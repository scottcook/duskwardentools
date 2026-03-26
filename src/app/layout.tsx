import type { Metadata } from 'next';
import { Montserrat, UnifrakturCook } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { FeedbackModal } from '@/components/features/FeedbackModal';
import { NewsletterModal } from '@/components/features/NewsletterModal';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { getThemeScript } from '@/lib/theme';
import { siteConfig } from '@/lib/seo';
import './globals.css';

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const unifrakturCook = UnifrakturCook({
  variable: "--font-unifraktur",
  subsets: ["latin"],
  weight: "700",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.defaultTitle,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.defaultDescription,
  applicationName: siteConfig.name,
  category: 'games',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    url: "/",
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1024,
        height: 537,
        alt: 'Duskwarden Tools — Monster Stat Block Converter',
      },
    ],
    type: "website",
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    images: [siteConfig.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${unifrakturCook.variable} font-sans antialiased text-text-primary min-h-screen`}>
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
        <ThemeProvider>
          {children}
          <NewsletterModal />
          <FeedbackModal />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
