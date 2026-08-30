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
  RotateCw,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function SentPage() {
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'REPLIED' | 'AWAITING' | 'FOLLOWUP'>('ALL');
  const [selectedSent, setSelectedSent] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeTabInModal, setActiveTabInModal] = useState<'INITIAL' | 'FOLLOWUPS' | 'REPLY'>('INITIAL');

  // Direct Reply Modal State
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [activeReply, setActiveReply] = useState<any>(null);
  const [replyResponseText, setReplyResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [responseSuccessMsg, setResponseSuccessMsg] = useState<string | null>(null);

  // Ingest Reply Modal State
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [targetSentForIngest, setTargetSentForIngest] = useState<any>(null);
  const [ingestBodyText, setIngestBodyText] = useState('Ok, please share corporate rates and booking procedure.');
  const [ingesting, setIngesting] = useState(false);

  const [syncingZoho, setSyncingZoho] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSent();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchSent();
  };

  const handleSyncZoho = async () => {
    setSyncingZoho(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch('/api/replies/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMsg(`✨ Zoho Inbox checked! ${data.syncedCount} new replies auto-synced.`);
        fetchSent();
      } else {
        setSyncStatusMsg(data.error || 'Zoho sync completed.');
      }
    } catch (err: any) {
      setSyncStatusMsg(err.message || 'Error syncing Zoho inbox');
    } finally {
      setSyncingZoho(false);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    }
  };

  const openViewer = (sent: any) => {
    setSelectedSent(sent);
    setActiveTabInModal(sent.hasReply || sent.replies?.length > 0 ? 'REPLY' : 'INITIAL');
    setIsViewerOpen(true);
  };

  const openReplyModal = (sent: any, reply: any) => {
    setSelectedSent(sent);
    setActiveReply(reply);
    setReplyResponseText(reply.aiDraftedReply || '');
    setResponseSuccessMsg(null);
    setIsReplyModalOpen(true);
  };

  const openIngestModal = (sent: any) => {
    setTargetSentForIngest(sent);
    setIngestBodyText('Ok, please share corporate rate card and booking procedure.');
    setIsIngestModalOpen(true);
  };

  const handleIngestReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSentForIngest || !ingestBodyText.trim()) return;

    setIngesting(true);
    try {
      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentEmailId: targetSentForIngest.id,
          senderEmail: targetSentForIngest.recipientEmail,
          prospectName: targetSentForIngest.recipientName,
          companyName: targetSentForIngest.company?.name || targetSentForIngest.event?.name,
          subject: `Re: ${targetSentForIngest.subject}`,
          bodyText: ingestBodyText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsIngestModalOpen(false);
        fetchSent();
        // Immediately open the response modal for 1-click send
        if (data.reply) {
          openReplyModal(targetSentForIngest, data.reply);
        }
      } else {
        alert(data.error || 'Failed to ingest reply');
      }
    } catch (err: any) {
      alert(err.message || 'Error ingesting reply');
    } finally {
      setIngesting(false);
    }
  };

  const handleSendResponse = async () => {
    if (!activeReply) return;
    setSendingResponse(true);
    setResponseSuccessMsg(null);
    try {
      const res = await fetch(`/api/replies/${activeReply.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText: replyResponseText }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResponseSuccessMsg(`✨ Response dispatched successfully to ${activeReply.senderEmail}!`);
        fetchSent();
        setTimeout(() => {
          setIsReplyModalOpen(false);
        }, 2000);
      } else {
        alert(data.error || 'Failed to dispatch reply');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending reply');
    } finally {
      setSendingResponse(false);
    }
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
              Complete real-time tracking of every dispatched email, live client reply status (Replied vs Awaiting), automated follow-up progress, and 1-click AI reply generator.
            </p>
          </div>

          {/* Quick Metrics & Refresh Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center min-w-[75px]">
                <div className="text-base font-black text-slate-100">{totalSent}</div>
                <div className="text-[9px] text-slate-400 font-semibold uppercase">Total Sent</div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-slate-950 border border-emerald-500/30 text-center min-w-[75px]">
                <div className="text-base font-black text-emerald-400">{totalReplied}</div>
                <div className="text-[9px] text-emerald-300 font-semibold uppercase">Replied</div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-slate-950 border border-amber-500/30 text-center min-w-[75px]">
                <div className="text-base font-black text-amber-400">{totalAwaiting}</div>
                <div className="text-[9px] text-amber-300 font-semibold uppercase">Awaiting</div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-slate-950 border border-sky-500/30 text-center min-w-[75px]">
                <div className="text-base font-black text-sky-400">{totalFollowupsActive}</div>
                <div className="text-[9px] text-sky-300 font-semibold uppercase">Follow-up</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncZoho}
                disabled={syncingZoho}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all self-stretch sm:self-auto disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${syncingZoho ? 'animate-spin text-white' : 'text-emerald-200'}`} />
                <span>{syncingZoho ? 'Checking Zoho...' : '🔄 Check Zoho Inbox'}</span>
              </button>

              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-all self-stretch sm:self-auto disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                <span>{refreshing ? 'Syncing...' : 'Sync Ledger'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
            <button onClick={() => setSyncStatusMsg(null)} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
          </div>
        )}

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
                  className={`p-5 rounded-2xl bg-slate-900/90 border transition-all flex flex-col justify-between gap-4 ${
                    hasReplies
                      ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
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
                    </div>

                    {/* Actions on Card */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                      {hasReplies ? (
                        <button
                          onClick={() => openReplyModal(sent, latestReply)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>⚡ View & Send AI Response</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openIngestModal(sent)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                        >
                          <Mail className="w-3.5 h-3.5 text-emerald-400" />
                          <span>📥 Ingest / Sync Reply</span>
                        </button>
                      )}

                      <button
                        onClick={() => openViewer(sent)}
                        className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Audit History</span>
                      </button>
                    </div>
                  </div>

                  {/* If Replied: Inline Reply Summary Box */}
                  {hasReplies && latestReply && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Inbound Client Reply ({new Date(latestReply.receivedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })})</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-200 border border-emerald-500/30">
                          {latestReply.aiClassification}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        &ldquo;{latestReply.bodyText}&rdquo;
                      </p>
                      <div className="text-[11px] text-emerald-200/90 flex flex-wrap items-center justify-between gap-2">
                        <span><b>AI Intent:</b> {latestReply.aiDetectedIntent || 'Inquiring about corporate transport rates'}</span>
                        <button
                          onClick={() => openReplyModal(sent, latestReply)}
                          className="text-amber-400 hover:text-amber-300 font-bold underline text-xs"
                        >
                          Draft & Send Response →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Follow-up info strip */}
                  {!hasReplies && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-slate-400">Follow-up Cadence:</span>
                      {scheduledFollowup ? (
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
                  )}
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md mt-2"
            >
              Go to Review Queue →
            </Link>
          </div>
        )}
      </div>

      {/* MODAL 1: 1-Click AI Response Sender */}
      {isReplyModalOpen && activeReply && (
        <Modal
          isOpen={isReplyModalOpen}
          onClose={() => setIsReplyModalOpen(false)}
          title={`⚡ 1-Click AI Reply Dispatch to ${activeReply.senderEmail}`}
          subtitle="AI has analyzed the prospect's intent and drafted a tailored rate card / booking response for Opal Chauffeurs."
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {responseSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{responseSuccessMsg}</span>
              </div>
            )}

            {/* Inbound Reply Display */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                <span>Client Message Received:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  {activeReply.aiClassification}
                </span>
              </div>
              <p className="text-xs text-slate-200 italic">&ldquo;{activeReply.bodyText}&rdquo;</p>
              <div className="text-[11px] text-slate-400 pt-1">
                <b>Detected Intent:</b> {activeReply.aiDetectedIntent}
              </div>
            </div>

            {/* Editable AI-Generated Response */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI-Drafted Response (Editable):</span>
                </label>
                <span className="text-[10px] text-slate-400">Sent from book@opalchauffeurs.com.au</span>
              </div>
              <textarea
                rows={7}
                value={replyResponseText}
                onChange={(e) => setReplyResponseText(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReplyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendResponse}
                disabled={sendingResponse || !replyResponseText.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {sendingResponse ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingResponse ? 'Dispatching Reply...' : '🚀 Approve & Send Reply Now'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Ingest / Log Inbound Reply from Zoho */}
      {isIngestModalOpen && targetSentForIngest && (
        <Modal
          isOpen={isIngestModalOpen}
          onClose={() => setIsIngestModalOpen(false)}
          title={`📥 Ingest Client Reply from ${targetSentForIngest.recipientName}`}
          subtitle="Paste or enter the message received in Zoho Mail. AI will classify the intent, halt future follow-ups, and generate a customized response draft."
          maxWidth="lg"
        >
          <form onSubmit={handleIngestReplySubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div><b>Company:</b> {targetSentForIngest.company?.name || targetSentForIngest.event?.name}</div>
              <div><b>Recipient Email:</b> {targetSentForIngest.recipientEmail}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Inbound Message Content / Reply Text:
              </label>
              <textarea
                rows={4}
                required
                value={ingestBodyText}
                onChange={(e) => setIngestBodyText(e.target.value)}
                placeholder="e.g. Ok, please share your rate card or call us at 2pm."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={ingesting || !ingestBodyText.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{ingesting ? 'Analyzing...' : '⚡ AI Analyze & Create Response Draft'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Audit History Viewer */}
      {isViewerOpen && selectedSent && (
        <Modal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          title={`Outreach Audit: ${selectedSent.company?.name || selectedSent.event?.name || 'Organization'}`}
          subtitle={`Dispatched to ${selectedSent.recipientName} (${selectedSent.recipientEmail}) on ${new Date(selectedSent.sentAt).toLocaleString('en-AU')}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-bold">Original Subject:</div>
              <div className="text-xs text-slate-100">{selectedSent.subject}</div>
              <div className="text-xs text-slate-400 font-bold pt-2">Original Email Dispatched:</div>
              <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900 p-3 rounded-xl border border-slate-800 font-sans leading-relaxed">
                {selectedSent.exactSentBody}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsViewerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
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
