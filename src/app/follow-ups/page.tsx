'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Building2,
  Calendar,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowUps = async () => {
    try {
      const res = await fetch('/api/follow-ups');
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data.followUps || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleAction = async (id: string, action: 'SEND' | 'CANCEL') => {
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpId: id, action }),
      });
      if (res.ok) {
        fetchFollowUps();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart Follow-up Cadence</span>
            </div>
            <h1 className="text-2xl font-black text-white">Automated Follow-Up Pipeline</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Configurable multi-step follow-up schedule (Day 0 Initial → Day 5 Follow-up → Day 10 Final). Follow-ups are automatically cancelled if a reply is detected, contact opts out, or admin halts sequence.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-xl font-black text-amber-400">
              {followUps.filter((f) => f.status === 'SCHEDULED').length}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Scheduled</div>
          </div>
        </div>

        {/* Auto Stop Rules Banner */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span><strong>Stop Rule 1:</strong> Reply received terminates future steps.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span><strong>Stop Rule 2:</strong> Opt-out / Do Not Contact halts instantly.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span><strong>Stop Rule 3:</strong> Manual admin cancellation at any step.</span>
          </div>
        </div>

        {/* Follow Ups List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading follow-up cadences...</div>
        ) : followUps.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {followUps.map((f) => {
              const entityName = f.company?.name || f.sentEmail?.recipientName || 'Contact';
              return (
                <div
                  key={f.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-100">{entityName}</span>
                      <Badge variant="gold" size="sm">
                        Step {f.stepNumber} ({f.stepNumber === 1 ? 'Day 5 Check-in' : 'Day 10 Final'})
                      </Badge>
                      <Badge
                        variant={f.status === 'SCHEDULED' ? 'amber' : f.status === 'SENT' ? 'emerald' : 'rose'}
                        size="sm"
                      >
                        {f.status} {f.cancelReason ? `(${f.cancelReason})` : ''}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>Target: {f.contact?.fullName || f.sentEmail?.recipientName}</span>
                      <span>•</span>
                      <span>{f.contact?.email || f.sentEmail?.recipientEmail}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        Scheduled: {new Date(f.scheduledDate).toLocaleDateString('en-AU')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-1 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mt-1 font-mono">
                      "{f.draftBody}"
                    </p>
                  </div>

                  {f.status === 'SCHEDULED' && (
                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      <button
                        onClick={() => handleAction(f.id, 'CANCEL')}
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/50 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                      >
                        Cancel Step
                      </button>
                      <button
                        onClick={() => handleAction(f.id, 'SEND')}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Now</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No Active Follow-Up Sequences</p>
            <p className="text-slate-500 mt-1">When outreach is dispatched, smart follow-up schedules are automatically initialized here.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
