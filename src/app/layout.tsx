import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Opal Outreach AI | Corporate Partnership & Event Intelligence Platform',
  description: 'AI-Powered Corporate Partnership, Event Opportunity Intelligence & Outreach Management Platform for Opal Chauffeurs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-slate-100 min-h-screen antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
