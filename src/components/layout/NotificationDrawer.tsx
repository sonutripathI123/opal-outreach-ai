'use client';

import React from 'react';
import { X, Bell, CheckCircle2, Calendar, Building2, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 'notif-1',
      title: 'New Outreach Draft Ready for Approval',
      message: 'Personalized email drafted for Sarah Jenkins (Telstra Enterprise Solutions). Opportunity score: 92/100.',
      time: '12m ago',
      type: 'DRAFT_READY',
      href: '/review',
      icon: CheckCircle2,
      iconColor: 'text-amber-400',
    },
    {
      id: 'notif-2',
      title: 'High-Priority Event Detected at MCEC',
      message: 'Asia-Pacific Mining & Energy Leadership Summit (2,800 delegates) requires VIP speaker transfers.',
      time: '45m ago',
      type: 'EVENT',
      href: '/events',
      icon: Calendar,
      iconColor: 'text-sky-400',
    },
    {
      id: 'notif-3',
      title: 'King & Wood Mallesons Melbourne Qualified',
      message: 'Top-tier law firm at Collins Arch scored 88.5/100. Partner travel and airport demand detected.',
      time: '2h ago',
      type: 'COMPANY',
      href: '/companies',
      icon: Building2,
      iconColor: 'text-emerald-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-100">Live Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium px-2 py-1"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.id}
                href={n.href}
                onClick={onClose}
                className="block p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-950 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${n.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-500">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                      <span>View in dashboard</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
          <span className="text-xs text-slate-500">
            Real-time intelligence feed for Opal Chauffeurs operations.
          </span>
        </div>
      </div>
    </div>
  );
};
