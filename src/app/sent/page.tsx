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
} from 'lucide-react';

export default function SentPage() {
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSent, setSelectedSent] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

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
    setIsViewerOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Immutable Audit Vault</span>
            </div>
            <h1 className="text-2xl font-black text-white">Sent Outreach Vault</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Permanent immutable archive of all sent outreach emails. Records preserve the exact body, recipient metadata, and timestamps regardless of future template changes.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-xl font-black text-emerald-400">{sentEmails.length}</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Dispatched</div>
          </div>
        </div>

        {/* Sent Emails List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading sent email records...</div>
        ) : sentEmails.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {sentEmails.map((sent) => {
              const entityName = sent.company?.name || sent.event?.name || 'Organization';
              return (
                <div
                  key={sent.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-100">{entityName}</span>
                      <Badge variant="emerald" size="sm">
                        {sent.deliveryStatus}
                      </Badge>
                      {sent.hasReply && (
                        <Badge variant="gold" size="sm">
                          REPLIED
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>To: {sent.recipientName}</span>
                      <span>•</span>
                      <span>{sent.recipientEmail}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(sent.sentAt).toLocaleString('en-AU')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 font-medium line-clamp-1 pt-1">
                      Subject: {sent.subject}
                    </div>
                  </div>

                  <button
                    onClick={() => openViewer(sent)}
                    className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors self-start lg:self-auto"
                  >
                    View Exact Sent Content
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <Send className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No Dispatched Emails Yet</p>
            <p className="text-slate-500 mt-1">When outreach drafts are approved and sent, their exact records are permanently preserved here.</p>
          </div>
        )}
      </div>

      {/* Sent Email Viewer Modal */}
      {selectedSent && (
        <Modal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          title={`Sent Email: ${selectedSent.company?.name || selectedSent.event?.name}`}
          subtitle={`Dispatched on ${new Date(selectedSent.sentAt).toLocaleString('en-AU')} to ${selectedSent.recipientEmail}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div><strong className="text-slate-400">To:</strong> <span className="text-slate-200">{selectedSent.recipientName} &lt;{selectedSent.recipientEmail}&gt;</span></div>
              <div><strong className="text-slate-400">Subject:</strong> <span className="text-slate-100 font-semibold">{selectedSent.subject}</span></div>
              <div><strong className="text-slate-400">Delivery Status:</strong> <span className="text-emerald-400 font-semibold">{selectedSent.deliveryStatus}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Exact Sent Email Copy</label>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {selectedSent.exactSentBody}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsViewerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
