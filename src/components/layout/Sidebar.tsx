'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck2,
  Inbox,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Car,
  Building,
  Sparkles,
  History,
  Cpu,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  pendingReviewCount?: number;
  newReplyCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pendingReviewCount = 3,
  newReplyCount = 1,
}) => {
  const pathname = usePathname();

  const navSections = [
    {
      title: 'INTELLIGENCE & DISCOVERY',
      items: [
        { name: 'Executive Overview', href: '/', icon: LayoutDashboard },
        { name: 'Corporate Companies', href: '/companies', icon: Building2 },
        { name: 'Event Opportunities', href: '/events', icon: CalendarCheck2 },
      ],
    },
    {
      title: 'OUTREACH & APPROVALS',
      items: [
        {
          name: 'Human Review Queue',
          href: '/review',
          icon: CheckCircle2,
          badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
          badgeVariant: 'gold',
        },
        { name: 'Sent Email Vault', href: '/sent', icon: Send },
        {
          name: 'Replies & AI Inbox',
          href: '/inbox',
          icon: Inbox,
          badge: newReplyCount > 0 ? newReplyCount : undefined,
          badgeVariant: 'emerald',
        },
        { name: 'Follow-Up Pipeline', href: '/follow-ups', icon: Clock },
      ],
    },
    {
      title: 'BUSINESS CONFIGURATION',
      items: [
        { name: 'Service Locations', href: '/locations', icon: MapPin },
        { name: 'Services & Fleet', href: '/services', icon: Car },
        { name: 'Business Profile', href: '/profile', icon: Building },
      ],
    },
    {
      title: 'SYSTEM & AI GOVERNANCE',
      items: [
        { name: 'AI & Scoring Rules', href: '/settings', icon: Sparkles },
        { name: 'Audit & Activity Logs', href: '/logs', icon: History },
        { name: 'Background Jobs', href: '/jobs', icon: Cpu },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-72 bg-slate-950/90 border-r border-slate-800/80 flex flex-col h-screen fixed left-0 top-0 z-30 select-none backdrop-blur-xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-[1px] shadow-lg shadow-amber-950/40">
          <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
            <Car className="w-5 h-5 text-amber-400" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-white">OPAL OUTREACH</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              AI
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]">
            Opal Chauffeurs Intelligence
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={clsx(
                        'w-4 h-4 transition-colors',
                        isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={clsx(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm animate-pulse',
                        item.badgeVariant === 'emerald'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-950 text-amber-300 border-amber-500/40'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Human-in-the-Loop Safe Guard Footer Banner */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div className="text-[11px] text-slate-400 leading-tight">
          <span className="font-semibold text-slate-200">Human Guard Active:</span> All initial emails require admin approval.
        </div>
      </div>

      {/* User / Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
            OC
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Administrator</span>
            <span className="text-[10px] text-slate-500">Melbourne Hub</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
