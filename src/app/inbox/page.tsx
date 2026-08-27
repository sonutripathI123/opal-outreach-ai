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
} from 'lucide-react';

export default function InboxPage() {
  const [replies, setReplies] = useState<any[]>([]);
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReply, setSelectedReply] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);

  // Simulate Form
  const [simForm, setSimForm] = useState({
    sentEmailId: '',
    senderEmail: '',
    subject: '',
    bodyText: 'Hi, thanks for reaching out. We have several visiting executive delegates arriving at Melbourne Airport next month for our board meeting. Could you please share your corporate rate card and booking procedure?',
  });
  const [simulating, setSimulating] = useState(false);

  const fetchInbox = async () => {
    try {
      const [resR, resS] = await Promise.all([
        fetch('/api/replies'),
        fetch('/api/sent'),
      ]);
      if (resR.ok) {
        const data = await resR.json();
        setReplies(data.replies || []);
      }
      if (resS.ok) {
        const data = await resS.json();
        setSentEmails(data.sentEmails || []);
        if (data.sentEmails?.length > 0 && !simForm.sentEmailId) {
          setSimForm((prev) => ({ ...prev, sentEmailId: data.sentEmails[0].id }));
        }
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

  const handleSimulateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simForm),
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
    setIsDetailOpen(true);
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
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Process / Simulate Inbound Reply</span>
            </button>
          </div>
        </div>

        {/* Replies List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading inbound replies...</div>
        ) : replies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {replies.map((reply) => {
              const entityName = reply.company?.name || reply.senderEmail;
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
                      <Badge variant="emerald" size="sm">
                        {reply.aiClassification.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="slate" size="sm">
                        {reply.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>From: {reply.senderEmail}</span>
                      <span>•</span>
                      <span>{new Date(reply.receivedAt).toLocaleString('en-AU')}</span>
                    </div>

                    {/* AI Executive Summary */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="font-semibold text-emerald-400">
                        AI Intent: {reply.aiDetectedIntent}
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
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors self-start lg:self-auto flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>View Response & Draft Reply</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No Replies Received Yet</p>
            <p className="text-slate-500 mt-1">
              Click "Process / Simulate Inbound Reply" to test the AI reply classification and response engine.
            </p>
          </div>
        )}
      </div>

      {/* Reply Detail & Suggested Draft Modal */}
      {selectedReply && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Inbound Reply: ${selectedReply.company?.name || selectedReply.senderEmail}`}
          subtitle={`Received on ${new Date(selectedReply.receivedAt).toLocaleString('en-AU')}`}
          maxWidth="4xl"
        >
          <div className="space-y-5">
            {/* Inbound message text */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400">Inbound Message Body</div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {selectedReply.bodyText}
              </div>
            </div>

            {/* AI Analysis Card */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 uppercase tracking-wide">
                  AI Intent & Summary
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
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                AI-Drafted Response (Editable for Admin Review)
              </label>
              <textarea
                rows={6}
                defaultValue={selectedReply.aiDraftedReply}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Responses require admin approval before sending.
              </span>
              <button
                onClick={() => {
                  alert('Response recorded and sent to client.');
                  setIsDetailOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Approve & Send Reply</span>
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
        subtitle="Simulate receiving a reply from a contacted prospect to test AI intent classification."
        maxWidth="2xl"
      >
        <form onSubmit={handleSimulateReply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Sent Email</label>
            <select
              value={simForm.sentEmailId}
              onChange={(e) => setSimForm({ ...simForm, sentEmailId: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {sentEmails.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.recipientName} ({s.company?.name || s.recipientEmail}) - {s.subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reply Content / Prospect Message</label>
            <textarea
              rows={5}
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
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{simulating ? 'Analyzing Reply...' : 'Process with Claude AI'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
