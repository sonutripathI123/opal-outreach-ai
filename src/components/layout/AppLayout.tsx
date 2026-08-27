'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
