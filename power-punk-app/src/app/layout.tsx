import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PowerPunk - Grassroots Climate Solutions",
  description: "Fund community climate projects through crowdfunding with transparent escrow and rewards",
  icons: {
    icon: '/powerpunk.png',
    shortcut: '/powerpunk.png',
    apple: '/powerpunk.png',
  },
  openGraph: {
    title: 'PowerPunk',
    description: 'Fund community climate projects through crowdfunding',
    images: ['/powerpunk.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
