'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Send,
  Building2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  ExternalLink,
  Mail,
  ShieldCheck,
  Search,
  MessageSquare,
  ArrowRight,
  Sparkles,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function SentPage() {
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'REPLIED' | 'AWAITING' | 'FOLLOWUP'>('ALL');
  const [selectedSent, setSelectedSent] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeTabInModal, setActiveTabInModal] = useState<'INITIAL' | 'FOLLOWUPS' | 'REPLY'>('INITIAL');

  const fetchSent = async () => {
    try {
      const res = await fetch('/api/sent');
      if (res.ok) {
        const data = await res.json();
        setSentEmails(data.sentEmails || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSent();
  }, []);

  const openViewer = (sent: any) => {
    setSelectedSent(sent);
    setActiveTabInModal(sent.hasReply ? 'REPLY' : 'INITIAL');
    setIsViewerOpen(true);
  };

  // Filter logic
  const filteredList = sentEmails.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.recipientName?.toLowerCase().includes(query) ||
      item.recipientEmail?.toLowerCase().includes(query) ||
      item.company?.name?.toLowerCase().includes(query) ||
      item.event?.name?.toLowerCase().includes(query) ||
      item.subject?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filterTab === 'REPLIED') return item.hasReply || item.replies?.length > 0;
    if (filterTab === 'AWAITING') return !item.hasReply && (!item.replies || item.replies.length === 0);
    if (filterTab === 'FOLLOWUP') return item.followUps?.some((f: any) => f.status === 'SCHEDULED' || f.status === 'SENT');

    return true;
  });

  const totalSent = sentEmails.length;
  const totalReplied = sentEmails.filter((s) => s.hasReply || s.replies?.length > 0).length;
  const totalAwaiting = totalSent - totalReplied;
  const totalFollowupsActive = sentEmails.filter((s) =>
    s.followUps?.some((f: any) => f.status === 'SCHEDULED')
  ).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Outreach Delivery & Reply Ledger</span>
            </div>
            <h1 className="text-2xl font-black text-white">Sent Outreach & Live Reply Tracker</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Complete real-time tracking of every dispatched email, live client reply status (Replied vs Awaiting), automated follow-up progress, and immutable audit logs.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center min-w-[85px]">
              <div className="text-lg font-black text-slate-100">{totalSent}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Sent</div>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-emerald-500/30 text-center min-w-[85px]">
              <div className="text-lg font-black text-emerald-400">{totalReplied}</div>
              <div className="text-[10px] text-emerald-300 font-semibold uppercase">Replied</div>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-amber-500/30 text-center min-w-[85px]">
              <div className="text-lg font-black text-amber-400">{totalAwaiting}</div>
              <div className="text-[10px] text-amber-300 font-semibold uppercase">Awaiting</div>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-sky-500/30 text-center min-w-[85px]">
              <div className="text-lg font-black text-sky-400">{totalFollowupsActive}</div>
              <div className="text-[10px] text-sky-300 font-semibold uppercase">Follow-up In Plan</div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by recipient name, email, company, or subject..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All Sent ({totalSent})
            </button>
            <button
              onClick={() => setFilterTab('REPLIED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'REPLIED'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-emerald-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              🟢 Replied ({totalReplied})
            </button>
            <button
              onClick={() => setFilterTab('AWAITING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'AWAITING'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-950 text-amber-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              ⏳ Awaiting Reply ({totalAwaiting})
            </button>
            <button
              onClick={() => setFilterTab('FOLLOWUP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'FOLLOWUP'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-sky-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              🔄 Follow-ups Active ({totalFollowupsActive})
            </button>
          </div>
        </div>

        {/* Sent Emails Detailed Ledger List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading sent outreach database...</div>
        ) : filteredList.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredList.map((sent) => {
              const entityName = sent.company?.name || sent.event?.name || 'Organization';
              const hasReplies = sent.hasReply || sent.replies?.length > 0;
              const latestReply = sent.replies?.[0];
              const scheduledFollowup = sent.followUps?.find((f: any) => f.status === 'SCHEDULED');
              const sentFollowup = sent.followUps?.find((f: any) => f.status === 'SENT');

              return (
                <div
                  key={sent.id}
                  className={`p-5 rounded-2xl bg-slate-900/90 border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                    hasReplies
                      ? 'border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    {/* Top Row: Entity + Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-100">{entityName}</span>
                      
                      {/* Reply Status Badge */}
                      {hasReplies ? (
                        <Badge variant="emerald" size="sm">
                          🟢 REPLIED ({latestReply?.aiClassification?.replace(/_/g, ' ') || 'INTERESTED'})
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm">
                          ⏳ AWAITING REPLY
                        </Badge>
                      )}

                      {/* Delivery Status */}
                      <Badge variant="slate" size="sm">
                        {sent.deliveryStatus}
                      </Badge>
                    </div>

                    {/* Meta Row */}
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>To: <b className="text-slate-200">{sent.recipientName}</b></span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">{sent.recipientEmail}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Sent: {new Date(sent.sentAt).toLocaleString('en-AU')}
                      </span>
                    </div>

                    {/* Subject */}
                    <div className="text-xs text-slate-200 font-medium">
                      <span className="text-slate-400">Subject: </span>{sent.subject}
                    </div>

                    {/* Follow-up / Reply Status Summary Strip */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-3">
                      {/* Follow-up info */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-slate-400">Follow-up Cadence:</span>
                        {hasReplies ? (
                          <span className="text-emerald-400 font-semibold">
                            ✓ Auto-Halted (Reply Received)
                          </span>
                        ) : scheduledFollowup ? (
                          <span className="text-amber-300 font-medium">
                            Step {scheduledFollowup.stepNumber} Scheduled for {new Date(scheduledFollowup.scheduledDate).toLocaleDateString('en-AU')}
                          </span>
                        ) : sentFollowup ? (
                          <span className="text-sky-300 font-medium">
                            Step {sentFollowup.stepNumber} Sent on {new Date(sentFollowup.sentAt || sentFollowup.updatedAt).toLocaleDateString('en-AU')}
                          </span>
                        ) : (
                          <span className="text-slate-500">None Scheduled</span>
                        )}
                      </div>

                      {/* Reply link if replied */}
                      {hasReplies && (
                        <Link
                          href="/inbox"
                          className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>View in AI Inbox</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    <button
                      onClick={() => openViewer(sent)}
                      className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition-colors flex items-center gap-2 shadow"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Full History & Audit</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs space-y-3">
            <Send className="w-10 h-10 text-slate-600 mx-auto" />
            <div>
              <p className="font-bold text-slate-200 text-sm">No Sent Email Records Matching Filter</p>
              <p className="text-slate-500 text-xs mt-1">
                When emails are dispatched from the Review Queue, they are permanently tracked here with live reply & follow-up updates.
              </p>
            </div>
            <Link
              href="/review"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Go to Review Queue & Send Outreach</span>
            </Link>
          </div>
        )}
      </div>

      {/* Complete Audit & Timeline Modal */}
      {selectedSent && (
        <Modal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          title={`Outreach Audit: ${selectedSent.recipientName} (${selectedSent.company?.name || selectedSent.event?.name || 'Client'})`}
          subtitle={`Dispatched from book@opalchauffeurs.com.au on ${new Date(selectedSent.sentAt).toLocaleString('en-AU')}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Meta summary strip */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Recipient</span>
                <span className="text-slate-200 font-semibold">{selectedSent.recipientName}</span>
                <span className="text-slate-400 text-[11px] block font-mono">{selectedSent.recipientEmail}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Reply Status</span>
                {selectedSent.hasReply || selectedSent.replies?.length > 0 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Replied</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Awaiting Response</span>
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Follow-Up Cadence</span>
                {selectedSent.hasReply ? (
                  <span className="text-emerald-400 text-xs font-semibold">Cancelled (Replied)</span>
                ) : selectedSent.followUps?.length > 0 ? (
                  <span className="text-sky-300 text-xs font-semibold">
                    {selectedSent.followUps.filter((f: any) => f.status === 'SCHEDULED').length} Step(s) Scheduled
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">None</span>
                )}
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => setActiveTabInModal('INITIAL')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  activeTabInModal === 'INITIAL'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Initial Dispatched Email
              </button>

              <button
                type="button"
                onClick={() => setActiveTabInModal('FOLLOWUPS')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  activeTabInModal === 'FOLLOWUPS'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Follow-Up Sequence ({selectedSent.followUps?.length || 0})
              </button>

              {(selectedSent.hasReply || selectedSent.replies?.length > 0) && (
                <button
                  type="button"
                  onClick={() => setActiveTabInModal('REPLY')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                    activeTabInModal === 'REPLY'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3. Client Inbound Reply (🟢 Active)
                </button>
              )}
            </div>

            {/* Tab 1: Initial Email */}
            {activeTabInModal === 'INITIAL' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Subject: <span className="text-slate-100 font-bold">{selectedSent.subject}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-[45vh] overflow-y-auto">
                  {selectedSent.exactSentBody}
                </div>
              </div>
            )}

            {/* Tab 2: Follow-up Sequences */}
            {activeTabInModal === 'FOLLOWUPS' && (
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {selectedSent.followUps?.length > 0 ? (
                  selectedSent.followUps.map((f: any) => (
                    <div key={f.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-200">
                          Step {f.stepNumber}: {f.stepNumber === 1 ? 'Day 5 Check-in' : 'Day 10 Final Follow-up'}
                        </div>
                        <Badge
                          variant={f.status === 'SCHEDULED' ? 'amber' : f.status === 'SENT' ? 'emerald' : 'rose'}
                          size="sm"
                        >
                          {f.status} {f.cancelReason ? `(${f.cancelReason})` : ''}
                        </Badge>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Target Date: {new Date(f.scheduledDate).toLocaleDateString('en-AU')}
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                        {f.draftBody}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No follow-ups recorded for this outreach.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Client Inbound Reply */}
            {activeTabInModal === 'REPLY' && selectedSent.replies?.length > 0 && (
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {selectedSent.replies.map((r: any) => (
                  <div key={r.id} className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 uppercase">
                        AI Intent: {r.aiClassification}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(r.receivedAt).toLocaleString('en-AU')}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {r.bodyText}
                    </div>

                    <div className="text-slate-300 text-[11px]">
                      <b>AI Summary:</b> {r.aiExecutiveSummary}
                    </div>

                    <div className="pt-1">
                      <Link
                        href="/inbox"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open Response & Send Reply in AI Inbox</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsViewerOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
