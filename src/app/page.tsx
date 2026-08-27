'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { Badge } from '@/components/ui/Badge';
import { ReviewDossierModal } from '@/components/review/ReviewDossierModal';
import {
  Building2,
  CalendarCheck2,
  Inbox,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Activity,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<any[]>([]);
  const [recentReplies, setRecentReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setActivities(data.recentActivities || []);
        setPendingDrafts(data.pendingApprovalDrafts || []);
        setRecentReplies(data.recentReplies || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openReview = (draft: any) => {
    setSelectedDraft(draft);
    setIsReviewOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome & Master Status Hero */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Opal Chauffeurs Intelligence Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Corporate Opportunity & Event Outreach Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Autonomous corporate discovery and upcoming event monitoring for Melbourne & interstate hubs. All outreach is AI-researched, scored, and securely gated for human approval.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/review"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Review Pending Queue ({stats?.pendingDrafts || 0})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Top KPI Metrics Grid (Mobile 1 col, Tablet 2 cols, Desktop 4 cols) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Companies */}
          <Link
            href="/companies"
            className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Corporate Companies</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              {stats?.totalCompanies || 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Badge variant="gold" size="sm">
                {stats?.highPriorityCompanies || 0} High Priority
              </Badge>
              <span className="text-slate-500">Melbourne</span>
            </div>
          </Link>

          {/* Card 2: Events */}
          <Link
            href="/events"
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-sky-500/40 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Upcoming Events</span>
              <CalendarCheck2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              {stats?.totalEvents || 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Badge variant="sky" size="sm">
                {stats?.highPriorityEvents || 0} High Value
              </Badge>
              <span className="text-slate-500">MCEC & CBD</span>
            </div>
          </Link>

          {/* Card 3: Pending Approvals */}
          <Link
            href="/review"
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Pending Approval</span>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
              {stats?.pendingDrafts || 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Awaiting Human Review</span>
            </div>
          </Link>

          {/* Card 4: Replies & Positive Intent */}
          <Link
            href="/inbox"
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Replies & Intent</span>
              <Inbox className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {stats?.repliesReceived || 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Badge variant="emerald" size="sm">
                {stats?.interestedReplies || 0} Interested / Calls
              </Badge>
            </div>
          </Link>
        </div>

        {/* Human Review Queue Spotlight */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Human-in-the-Loop Outreach Queue</h2>
                <p className="text-xs text-slate-400">
                  AI-drafted personalized outreach emails requiring explicit approval before dispatch.
                </p>
              </div>
            </div>
            <Link
              href="/review"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>View full queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingDrafts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {pendingDrafts.map((d) => {
                const entityName = d.company?.name || d.event?.name;
                const score = d.company?.opportunityScore || d.event?.opportunityScore || 85;
                return (
                  <div
                    key={d.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            {d.company ? 'Corporate Outreach' : 'Event Transport'}
                          </span>
                          <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{entityName}</h3>
                          <div className="text-xs text-slate-400">{d.recipientRole} ({d.recipientName})</div>
                        </div>
                        <ScoreGauge score={score} size="sm" showLabel={false} />
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                        "{d.subject}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                      <span className="text-[11px] text-slate-500">{d.recipientEmail}</span>
                      <button
                        onClick={() => openReview(d)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
                      >
                        Review & Approve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">Outreach Queue Clear</p>
              <p className="text-slate-500 mt-1">All qualified company and event drafts have been processed.</p>
            </div>
          )}
        </div>

        {/* Two-Column Grid: Recent Inbound Replies & Live Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Replies */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Inbox className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Recent Replies & AI Classification</h3>
              </div>
              <Link href="/inbox" className="text-xs text-amber-400 hover:underline">
                View all
              </Link>
            </div>

            {recentReplies.length > 0 ? (
              <div className="space-y-3">
                {recentReplies.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">
                        {r.company?.name || r.senderEmail}
                      </span>
                      <Badge variant="emerald" size="sm">
                        {r.aiClassification.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {r.aiExecutiveSummary || r.bodyText}
                    </p>
                    <div className="text-[11px] text-amber-400 font-medium pt-1">
                      Action: {r.aiSuggestedAction}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No incoming replies yet. Replies will be automatically tracked and analyzed by Claude AI.
              </div>
            )}
          </div>

          {/* Audit & Activity Timeline */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Live Activity & Audit Stream</h3>
              </div>
              <Link href="/logs" className="text-xs text-amber-400 hover:underline">
                Full logs
              </Link>
            </div>

            <div className="space-y-3">
              {activities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">{act.description}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(act.createdAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} • Actor: {act.actor}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ReviewDossierModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={selectedDraft}
        onRefresh={fetchDashboardData}
      />
    </AppLayout>
  );
}
