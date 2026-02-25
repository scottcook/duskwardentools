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

export const metadata: Metadata = {
  title: "Duskwarden | 5e to OSR Monster Converter",
  description: "Turn 5e prep into OSR play. Paste any modern monster and get a streamlined, table-ready stat card in seconds.",
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
