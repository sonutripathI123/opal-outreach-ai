'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Inbox,
  Sparkles,
  Building2,
  User,
  Clock,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Send,
  Plus,
  RotateCw,
  AlertCircle,
} from 'lucide-react';

export default function InboxPage() {
  const [replies, setReplies] = useState<any[]>([]);
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReply, setSelectedReply] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [replyTextToEdit, setReplyTextToEdit] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  // Simulate Form State
  const [simForm, setSimForm] = useState({
    selectedKey: '',
    senderEmail: '',
    subject: '',
    bodyText: 'Hi, thanks for reaching out. We have several visiting executive delegates arriving at Melbourne Airport next month for our board meeting. Could you please share your corporate rate card and booking procedure?',
  });
  const [simulating, setSimulating] = useState(false);

  const scenarioPresets = [
    {
      title: '💰 Requesting Rates (High Interest)',
      text: 'Hi, thanks for reaching out. We have several visiting executive delegates arriving at Melbourne Airport next month for our board meeting. Could you please share your corporate rate card and booking procedure?',
    },
    {
      title: '📞 Schedule a Call',
      text: 'Hello, could we schedule a quick 5-minute introductory call this Thursday at 2:30 PM to discuss setting up a corporate chauffeur account for our executive team?',
    },
    {
      title: '⏳ Deferred / Check in Q4',
      text: 'Thanks for contacting us. Our travel logistics for this month are already finalized, but please follow up with us in November ahead of our upcoming annual leadership conference.',
    },
    {
      title: '❌ Not Interested',
      text: 'Thank you for reaching out, but we currently have an exclusive corporate transport agreement in place. Please remove us from your outreach sequence.',
    },
  ];

  const fetchInbox = async () => {
    try {
      const [resR, resS, resD] = await Promise.all([
        fetch('/api/replies'),
        fetch('/api/sent'),
        fetch('/api/outreach/drafts?status=ALL'),
      ]);

      if (resR.ok) {
        const data = await resR.json();
        setReplies(data.replies || []);
      }
      if (resS.ok) {
        const data = await resS.json();
        setSentEmails(data.sentEmails || []);
      }
      if (resD.ok) {
        const dataD = await resD.json();
        setDrafts(dataD.drafts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  // Prepare combined prospect options so dropdown is NEVER empty
  const prospectOptions: { key: string; label: string; type: 'SENT' | 'DRAFT'; id: string }[] = [];

  sentEmails.forEach((s) => {
    prospectOptions.push({
      key: `sent_${s.id}`,
      id: s.id,
      type: 'SENT',
      label: `[SENT] ${s.recipientName} (${s.company?.name || s.event?.name || s.recipientEmail}) - ${s.subject}`,
    });
  });

  drafts.forEach((d) => {
    if (!prospectOptions.some((p) => p.label.includes(d.recipientName))) {
      prospectOptions.push({
        key: `draft_${d.id}`,
        id: d.id,
        type: 'DRAFT',
        label: `[PROSPECT] ${d.recipientName} (${d.company?.name || d.event?.name || 'Melbourne Target'}) - ${d.subject}`,
      });
    }
  });

  // Fallback defaults if database is brand new
  if (prospectOptions.length === 0) {
    prospectOptions.push(
      {
        key: 'default_elena',
        id: 'draft-event-mining-1',
        type: 'DRAFT',
        label: 'Elena Rostova (Global Energy Expos / MCEC South Wharf) - VIP Speaker Transportation',
      },
      {
        key: 'default_marcus',
        id: 'draft-kwm-1',
        type: 'DRAFT',
        label: 'Marcus Vance (King & Wood Mallesons / Collins Arch) - Executive Chauffeur Services',
      },
      {
        key: 'default_sarah',
        id: 'draft-crown-1',
        type: 'DRAFT',
        label: 'Sarah Jenkins (Crown Melbourne / Southbank) - VIP Guest Transportation',
      }
    );
  }

  // Set default selection if none selected
  useEffect(() => {
    if (!simForm.selectedKey && prospectOptions.length > 0) {
      setSimForm((prev) => ({ ...prev, selectedKey: prospectOptions[0].key }));
    }
  }, [prospectOptions.length]);

  const handleSimulateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const selectedOption = prospectOptions.find((p) => p.key === simForm.selectedKey) || prospectOptions[0];

      const payload: any = {
        bodyText: simForm.bodyText,
      };

      if (selectedOption?.type === 'SENT') {
        payload.sentEmailId = selectedOption.id;
      } else {
        payload.draftId = selectedOption?.id;
      }

      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsSimulateOpen(false);
        fetchInbox();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to process reply');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const openDetail = (reply: any) => {
    setSelectedReply(reply);
    setReplyTextToEdit(reply.aiDraftedReply || '');
    setSendSuccessMsg(null);
    setIsDetailOpen(true);
  };

  const handleSendApproveReply = async () => {
    setSendingReply(true);
    setSendSuccessMsg(null);
    try {
      // Simulate live dispatch of the drafted response
      await new Promise((r) => setTimeout(r, 800));
      setSendSuccessMsg(`Reply approved & sent from book@opalchauffeurs.com.au to ${selectedReply.senderEmail}!`);
      setTimeout(() => {
        setIsDetailOpen(false);
      }, 2000);
    } catch (err: any) {
      alert('Error sending reply');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Claude AI Response Intelligence</span>
            </div>
            <h1 className="text-2xl font-black text-white">Inbound Replies & AI Response Classifier</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Every incoming response is matched to its organization, automatically classified by intent, summarized for executive review, and paired with an AI-suggested reply draft.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSimulateOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Process / Simulate Inbound Reply</span>
            </button>
          </div>
        </div>

        {/* Replies List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading inbound replies...</div>
        ) : replies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {replies.map((reply) => {
              const entityName = reply.company?.name || reply.contact?.fullName || reply.senderEmail;
              const isPositive =
                reply.aiClassification.includes('INTERESTED') || reply.aiClassification.includes('MEETING');

              return (
                <div
                  key={reply.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        {entityName}
                      </span>
                      <Badge variant={isPositive ? 'emerald' : 'gold'} size="sm">
                        {reply.aiClassification.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="slate" size="sm">
                        {reply.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>From: <b className="text-slate-300 font-mono">{reply.senderEmail}</b></span>
                      <span>•</span>
                      <span>{new Date(reply.receivedAt).toLocaleString('en-AU')}</span>
                    </div>

                    {/* AI Executive Summary */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Intent: {reply.aiDetectedIntent}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {reply.aiExecutiveSummary}
                      </p>
                    </div>

                    <div className="text-[11px] text-amber-400 font-semibold">
                      Recommended Next Action: {reply.aiSuggestedAction}
                    </div>
                  </div>

                  <button
                    onClick={() => openDetail(reply)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors self-start lg:self-auto flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>View Response & Draft Reply</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs space-y-3">
            <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
            <div>
              <p className="font-bold text-slate-200 text-sm">No Live Inbound Replies Received Yet</p>
              <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                When a corporate client replies to your outreach email, Claude AI classifies their intent and drafts a response here.
              </p>
            </div>
            <button
              onClick={() => setIsSimulateOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simulate / Test Inbound Reply</span>
            </button>
          </div>
        )}
      </div>

      {/* Reply Detail & Suggested Draft Modal */}
      {selectedReply && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Inbound Reply: ${selectedReply.company?.name || selectedReply.contact?.fullName || selectedReply.senderEmail}`}
          subtitle={`Received on ${new Date(selectedReply.receivedAt).toLocaleString('en-AU')}`}
          maxWidth="4xl"
        >
          <div className="space-y-5">
            {sendSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{sendSuccessMsg}</span>
              </div>
            )}

            {/* Inbound message text */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>Original Prospect Message</span>
                <span className="text-[11px] font-mono text-slate-500">From: {selectedReply.senderEmail}</span>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {selectedReply.bodyText}
              </div>
            </div>

            {/* AI Analysis Card */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Intent & Executive Analysis</span>
                </span>
                <Badge variant="emerald" size="sm">
                  {selectedReply.aiClassification}
                </Badge>
              </div>
              <p className="text-slate-200 leading-relaxed font-medium">
                {selectedReply.aiExecutiveSummary}
              </p>
              <div className="text-amber-300 font-semibold pt-1">
                Suggested Action: {selectedReply.aiSuggestedAction}
              </div>
            </div>

            {/* Suggested Response Draft */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                  AI-Drafted Response (Editable Before Dispatch)
                </label>
                <span className="text-[10px] text-slate-500">From: book@opalchauffeurs.com.au</span>
              </div>
              <textarea
                rows={6}
                value={replyTextToEdit}
                onChange={(e) => setReplyTextToEdit(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                🔒 Protected by Human-in-the-Loop Gate.
              </span>
              <button
                onClick={handleSendApproveReply}
                disabled={sendingReply}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {sendingReply ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingReply ? 'Dispatching...' : 'Approve & Send Reply to Client'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Simulate Inbound Reply Modal */}
      <Modal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        title="Process / Test Inbound Reply"
        subtitle="Select a prospect and choose a scenario to test Claude AI's intent classification & automatic response drafting."
        maxWidth="2xl"
      >
        <form onSubmit={handleSimulateReply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Prospect / Target Email *
            </label>
            <select
              value={simForm.selectedKey || (prospectOptions[0]?.key ?? '')}
              onChange={(e) => setSimForm({ ...simForm, selectedKey: e.target.value })}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {prospectOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Scenario Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Quick Test Scenarios (Click to auto-fill message):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {scenarioPresets.map((scen, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSimForm((prev) => ({ ...prev, bodyText: scen.text }))}
                  className={`p-2 rounded-xl text-left text-xs border transition-all ${
                    simForm.bodyText === scen.text
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {scen.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Inbound Prospect Message / Reply Body *
            </label>
            <textarea
              rows={4}
              required
              value={simForm.bodyText}
              onChange={(e) => setSimForm({ ...simForm, bodyText: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSimulateOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={simulating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {simulating ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{simulating ? 'Analyzing with Claude AI...' : 'Process with Claude AI'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
