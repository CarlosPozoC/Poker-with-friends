import './globals.css';
import type { Metadata } from 'next';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Texas Hold\'em Poker',
  description: 'Online multiplayer Texas Hold\'em Poker',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Poker' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
