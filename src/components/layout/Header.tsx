'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Sparkles,
  ExternalLink,
  Shield,
  Activity,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { NotificationDrawer } from './NotificationDrawer';

export const Header: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-AU', {
          timeZone: 'Australia/Melbourne',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' AEST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-20">
        {/* Left: Location & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-4" />
            <span className="text-slate-300 font-medium">Melbourne Intelligence Hub</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-mono text-[11px]">{timeStr || '10:00:00 AM AEST'}</span>
          </div>

          <a
            href="https://www.opalchauffeurs.com.au/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors px-2 py-1"
          >
            <span>opalchauffeurs.com.au</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Right: Quick Stats & Notification Center */}
        <div className="flex items-center gap-4">
          {/* AI Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Claude 3.5 AI Engine</span>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
              Active
            </span>
          </div>

          {/* Notification Button */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
            title="Notifications & Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-md">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onMarkAllRead={() => setUnreadCount(0)}
      />
    </>
  );
};
