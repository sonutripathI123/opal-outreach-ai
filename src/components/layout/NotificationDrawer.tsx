'use client';

import React, { useEffect, useState } from 'react';
import { X, Bell, CheckCircle2, Calendar, Building2, AlertTriangle, ArrowRight, Mail, Clock } from 'lucide-react';
import Link from 'next/link';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const ICONS: Record<string, { icon: any; color: string }> = {
  HIGH_PRIORITY_COMPANY: { icon: Building2, color: 'text-emerald-400' },
  HIGH_PRIORITY_EVENT: { icon: Calendar, color: 'text-sky-400' },
  CONTACT_FOUND: { icon: Building2, color: 'text-emerald-400' },
  DRAFT_READY: { icon: CheckCircle2, color: 'text-amber-400' },
  REPLY_RECEIVED: { icon: Mail, color: 'text-emerald-400' },
  FOLLOW_UP_DUE: { icon: Clock, color: 'text-amber-400' },
  JOB_COMPLETED: { icon: CheckCircle2, color: 'text-emerald-400' },
  JOB_ERROR: { icon: AlertTriangle, color: 'text-red-400' },
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onMarkAllRead,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' }),
      });
    } catch (e) {
      console.error('Failed to mark notifications read:', e);
    }
    onMarkAllRead();
    fetchNotifications();
  };

  if (!isOpen) return null;

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
              onClick={handleMarkAllRead}
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
          {loading ? (
            <div className="text-center text-xs text-slate-500 py-8">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-8">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => {
              const { icon: Icon, color } = ICONS[n.type] || { icon: Bell, color: 'text-slate-400' };
              return (
                <Link
                  key={n.id}
                  href={n.linkUrl || '#'}
                  onClick={onClose}
                  className={`block p-4 rounded-xl border transition-all group ${
                    n.isRead
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-500">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-2">
                        {n.message}
                      </p>
                      {n.linkUrl && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                          <span>View in dashboard</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
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
