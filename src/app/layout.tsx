import type { Metadata } from "next";
import { Montserrat, UnifrakturCook } from "next/font/google";
import "./globals.css";

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://duskwarden.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Duskwarden | 5e/OSE to OSR Monster Converter",
  description: "Convert 5e, OSE, B/X, and generic monster stat blocks into streamlined compatibility stat cards.",
  openGraph: {
    title: "Duskwarden | 5e/OSE to OSR Monster Converter",
    description: "Convert 5e, OSE, B/X, and generic monster stat blocks into streamlined compatibility stat cards.",
    url: "/",
    siteName: "Duskwarden Tools",
    images: [
      {
        url: "/og-image.jpg",
        width: 1024,
        height: 537,
        alt: "Duskwarden Tools — 5e/OSE to OSR Monster Converter",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Duskwarden | 5e/OSE to OSR Monster Converter",
    description: "Convert 5e, OSE, B/X, and generic monster stat blocks into streamlined compatibility stat cards.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${montserrat.variable} ${unifrakturCook.variable} font-sans antialiased text-text-primary min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
