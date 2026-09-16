'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Sidebar counts used to be hardcoded defaults (3 pending / 1 reply) that
  // were never overridden — so they kept showing stale numbers no matter
  // what was actually in the database (e.g. after a full data reset).
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [newReplyCount, setNewReplyCount] = useState(0);

  useEffect(() => {
    const fetchCounts = () => {
      fetch('/api/stats')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.stats) {
            setPendingReviewCount(data.stats.pendingDrafts || 0);
            setNewReplyCount(data.stats.repliesReceived || 0);
          }
        })
        .catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar: Fixed on Desktop, Slide-out Drawer on Mobile */}
      <Sidebar
        pendingReviewCount={pendingReviewCount}
        newReplyCount={newReplyCount}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area: Zero margin on mobile, 72 margin on desktop */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen w-full overflow-x-hidden">
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
