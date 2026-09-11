import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Opal Outreach AI | Corporate Partnership & Event Intelligence Platform',
  description: 'AI-Powered Corporate Partnership, Event Opportunity Intelligence & Outreach Management Platform for Opal Chauffeurs.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Opal Outreach',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-slate-100 min-h-screen antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
