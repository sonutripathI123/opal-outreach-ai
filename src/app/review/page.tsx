'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { Badge } from '@/components/ui/Badge';
import { ReviewDossierModal } from '@/components/review/ReviewDossierModal';
import {
  CheckCircle2,
  ShieldCheck,
  Building2,
  CalendarCheck2,
  User,
  Sparkles,
  Send,
  XCircle,
  Filter,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function ReviewPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('READY_FOR_REVIEW');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const fetchDrafts = async () => {
    try {
      const res = await fetch(`/api/outreach/drafts?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [statusFilter]);

  const filteredDrafts = drafts.filter((d) => {
    if (typeFilter === 'COMPANY') return Boolean(d.company);
    if (typeFilter === 'EVENT') return Boolean(d.event);
    return true;
  });

  const openReview = (draft: any) => {
    setSelectedDraft(draft);
    setIsReviewOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Strict Human-in-the-Loop Protocol Enforced</span>
            </div>
            <h1 className="text-2xl font-black text-white">Outreach Review & Approval Workspace</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              AI researches companies and events, detects transportation needs, and drafts personalized outreach. The administrator has final authority to review, edit, approve, or reject each message before sending.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-xl font-black text-amber-400">{filteredDrafts.length}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">In Queue</div>
            </div>
          </div>
        </div>

        {/* Filter Controls (Mobile wrap) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('READY_FOR_REVIEW')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === 'READY_FOR_REVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending ({drafts.filter((d) => d.status === 'READY_FOR_REVIEW').length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-slate-200 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="COMPANY">Corporate Only</option>
              <option value="EVENT">Events Only</option>
            </select>
          </div>
        </div>

        {/* Drafts List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading outreach review queue...</div>
        ) : filteredDrafts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredDrafts.map((draft) => {
              const isCompany = Boolean(draft.company);
              const entity = draft.company || draft.event;
              const score = entity?.opportunityScore || 85;

              return (
                <div
                  key={draft.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
                >
                  {/* Left: Info & Score */}
                  <div className="flex items-start sm:items-center gap-4 flex-1">
                    <ScoreGauge score={score} size="md" />

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                          {entity?.name}
                        </span>
                        <Badge variant={isCompany ? 'gold' : 'sky'} size="sm">
                          {isCompany ? 'Corporate' : 'Event'}
                        </Badge>
                        <Badge variant={draft.status === 'APPROVED' ? 'emerald' : 'amber'} size="sm">
                          {draft.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                        <span>Target: {draft.recipientRole} ({draft.recipientName})</span>
                        <span>•</span>
                        <span className="text-slate-500">{draft.recipientEmail}</span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-1 italic pt-1 font-medium">
                        "{draft.subject}"
                      </p>

                      <div className="text-[11px] text-amber-400/90 font-medium">
                        Strategy: {draft.personalizationReasoning}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <button
                      onClick={() => openReview(draft)}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Review, Edit & Send</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-200">No Drafts in this View</p>
            <p className="text-slate-500 mt-1">Check another filter or add new companies and events to generate personalized outreach.</p>
          </div>
        )}
      </div>

      <ReviewDossierModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={selectedDraft}
        onRefresh={fetchDrafts}
      />
    </AppLayout>
  );
}
