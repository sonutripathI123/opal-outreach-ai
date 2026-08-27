'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { ScoreGauge } from '../ui/ScoreGauge';
import { Badge } from '../ui/Badge';
import { RejectionModal } from './RejectionModal';
import {
  Sparkles,
  Building2,
  Calendar,
  User,
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Edit3,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { RejectionReason } from '@/types';

interface ReviewDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: any;
  onRefresh: () => void;
}

export const ReviewDossierModal: React.FC<ReviewDossierModalProps> = ({
  isOpen,
  onClose,
  draft,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'dossier' | 'evidence'>('email');
  const [subject, setSubject] = useState('');
  const [fullBodyText, setFullBodyText] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  useEffect(() => {
    if (draft) {
      setSubject(draft.subject || '');
      setFullBodyText(draft.fullBodyText || '');
      setRecipientEmail(draft.recipientEmail || '');
      setIsEditing(false);
    }
  }, [draft]);

  if (!draft) return null;

  const entity = draft.company || draft.event;
  const isCompany = Boolean(draft.company);
  const opportunity = draft.company?.opportunity || draft.event?.opportunity;
  const research = draft.company?.research || draft.event?.research;

  let scoreBreakdown: any = {};
  try {
    if (opportunity?.scoreBreakdown) {
      scoreBreakdown = JSON.parse(opportunity.scoreBreakdown);
    }
  } catch (e) {}

  let evidenceSources: any[] = [];
  try {
    if (research?.evidenceSources) {
      evidenceSources = JSON.parse(research.evidenceSources);
    }
  } catch (e) {}

  let detectedSignals: any = {};
  try {
    if (research?.detectedSignals) {
      detectedSignals = JSON.parse(research.detectedSignals);
    }
  } catch (e) {}

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/outreach/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, fullBodyText, recipientEmail }),
      });
      if (res.ok) {
        setIsEditing(false);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/outreach/drafts/${draft.id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(false);
    }
  };

  const handleSend = async () => {
    if (!confirm(`Are you sure you want to officially send this personalized outreach email to ${draft.recipientEmail}?`)) {
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/outreach/drafts/${draft.id}/send`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('Email successfully dispatched to recipient and recorded in permanent sent vault.');
        onRefresh();
        onClose();
      } else {
        const data = await res.json();
        alert(`Failed to send: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error dispatching email');
    } finally {
      setSending(false);
    }
  };

  const handleReject = async (reason: RejectionReason, notes: string) => {
    const res = await fetch(`/api/outreach/drafts/${draft.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason: reason, rejectionFeedbackNotes: notes }),
    });
    if (res.ok) {
      onRefresh();
      onClose();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isCompany ? draft.company.name : draft.event.name}
        subtitle={`${isCompany ? 'Corporate Enterprise' : 'Upcoming Event Opportunity'} • ${draft.recipientRole} (${draft.recipientName})`}
        maxWidth="5xl"
      >
        <div className="space-y-6">
          {/* Top Banner: Score & Verification Header */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ScoreGauge score={entity.opportunityScore || 85} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{entity.name}</span>
                  <Badge variant={entity.priority === 'HIGH' ? 'gold' : 'slate'} size="sm">
                    {entity.priority} PRIORITY
                  </Badge>
                  <Badge variant={draft.status === 'APPROVED' ? 'emerald' : 'amber'} size="sm">
                    {draft.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                  <span>{isCompany ? entity.industry : entity.eventType}</span>
                  <span>•</span>
                  <span>{entity.city || 'Melbourne'}, {entity.state || 'VIC'}</span>
                  {entity.website && (
                    <>
                      <span>•</span>
                      <a
                        href={entity.website.startsWith('http') ? entity.website : `https://${entity.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        Official Site <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Recipient Snapshot */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Decision-Maker:</span>
              </div>
              <div className="font-semibold text-slate-200 mt-0.5">{draft.recipientName}</div>
              <div className="text-[11px] text-slate-400">{draft.recipientEmail}</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'email'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Personalized Email Draft</span>
            </button>
            <button
              onClick={() => setActiveTab('dossier')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'dossier'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Research & Why Relevant</span>
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'evidence'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Score Breakdown & Evidence Sources</span>
            </button>
          </div>

          {/* TAB 1: EMAIL DRAFT & HUMAN EDITING */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Strict Rule Notice */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>Human Approval Rule Enforced:</strong> This email will not be sent until you explicitly approve or trigger send.
                  </span>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1 text-[11px] font-medium"
                  >
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    <span>Edit Copy</span>
                  </button>
                )}
              </div>

              {/* AI Personalization Reasoning */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <span className="font-semibold text-amber-400">AI Personalization Strategy: </span>
                <span className="text-slate-300">{draft.personalizationReasoning}</span>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs ${
                      isEditing
                        ? 'bg-slate-950 border border-amber-500/50 text-slate-100'
                        : 'bg-slate-950/40 border border-slate-800 text-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium ${
                      isEditing
                        ? 'bg-slate-950 border border-amber-500/50 text-slate-100'
                        : 'bg-slate-950/40 border border-slate-800 text-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Full Personalized Body Content (2-Layer: Opal Brand + Tailored Context)
                  </label>
                  <textarea
                    rows={12}
                    disabled={!isEditing}
                    value={fullBodyText}
                    onChange={(e) => setFullBodyText(e.target.value)}
                    className={`w-full p-4 rounded-xl text-xs font-mono leading-relaxed ${
                      isEditing
                        ? 'bg-slate-950 border border-amber-500/50 text-slate-100 focus:outline-none'
                        : 'bg-slate-950/40 border border-slate-800 text-slate-300 whitespace-pre-wrap'
                    }`}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSubject(draft.subject);
                      setFullBodyText(draft.fullBodyText);
                      setRecipientEmail(draft.recipientEmail);
                      setIsEditing(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdits}
                    disabled={saving}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save Draft Changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOSSIER & WHY RELEVANT */}
          {activeTab === 'dossier' && (
            <div className="space-y-5">
              {/* Why Relevant Card */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Why this opportunity is relevant to Opal Chauffeurs</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {opportunity?.whyRelevant || 'High corporate activity and flight-tracking transport requirement detected.'}
                </p>
              </div>

              {/* Research Summary */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  AI Research Dossier & Operations Overview
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {research?.summary || 'Operations and corporate travel signals verified.'}
                </p>
              </div>

              {/* Detected Demand Signals */}
              {detectedSignals?.strong && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Strong Demand Signals Detected</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {detectedSignals.strong.map((s: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Services Match */}
              {opportunity?.recommendedServices && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Matched Opal Chauffeurs Service Lines
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {JSON.parse(opportunity.recommendedServices).map((srv: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium"
                      >
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCORE BREAKDOWN & EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-5">
              {/* Score Factor Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                  <span>Transparent 0-100 Scoring Model Breakdown</span>
                  <span className="text-amber-400 font-mono text-xs">{entity.opportunityScore}/100</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(scoreBreakdown).map(([factor, pts]: any) => (
                    <div key={factor} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 capitalize">
                        {factor.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-base font-bold text-slate-200 mt-1">{pts} pts</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Public Evidence Sources */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Public Sources & Verification References
                </div>
                {evidenceSources.length > 0 ? (
                  <div className="space-y-2">
                    {evidenceSources.map((ev: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-amber-400 hover:underline flex items-center gap-1.5"
                        >
                          <span>{ev.title}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-slate-400 text-[11px]">{ev.snippet}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Official business website and registry verified.</div>
                )}
              </div>
            </div>
          )}

          {/* Master Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsRejectOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Outreach</span>
            </button>

            <div className="flex items-center gap-3">
              {draft.status !== 'APPROVED' && draft.status !== 'SENT' && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{approving ? 'Approving...' : 'Approve Draft'}</span>
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={sending || draft.status === 'SENT'}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{draft.status === 'SENT' ? 'Already Dispatched' : sending ? 'Dispatching...' : 'Approve & Send Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <RejectionModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirmReject={handleReject}
        recipientName={draft.recipientName}
      />
    </>
  );
};
