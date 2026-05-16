import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Texas Hold\'em Poker',
  description: 'Online multiplayer Texas Hold\'em Poker',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Poker' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
