'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { AlertTriangle, XCircle, Check } from 'lucide-react';
import { RejectionReason } from '@/types';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (reason: RejectionReason, notes: string) => Promise<void>;
  recipientName: string;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  onConfirmReject,
  recipientName,
}) => {
  const [reason, setReason] = useState<RejectionReason>('NOT_RELEVANT');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasonOptions: { label: string; value: RejectionReason; desc: string }[] = [
    {
      label: 'Not Relevant / Low Transport Demand',
      value: 'NOT_RELEVANT',
      desc: 'Company or event has low executive travel, remote workforce, or minimal chauffeur need.',
    },
    {
      label: 'Wrong Decision-Maker Contact',
      value: 'WRONG_CONTACT',
      desc: 'Identified contact role does not manage corporate travel, executive transit, or events.',
    },
    {
      label: 'Email Quality / Personalization Issue',
      value: 'EMAIL_QUALITY_ISSUE',
      desc: 'Tone, copy, or cited evidence needs major revision before reaching out.',
    },
    {
      label: 'Already Contacted / Active Relationship',
      value: 'ALREADY_CONTACTED',
      desc: 'Company is already an existing client or in direct discussions with Opal team.',
    },
    {
      label: 'Company Not Suitable',
      value: 'COMPANY_NOT_SUITABLE',
      desc: 'Excluded industry or does not meet minimum executive standards.',
    },
    {
      label: 'Other Reason',
      value: 'OTHER',
      desc: 'Specify custom feedback for AI system learning.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmReject(reason, notes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Outreach Draft"
      subtitle={`Provide feedback to prevent outreach and improve future AI intelligence for ${recipientName}.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Rejecting this draft will stop email delivery and record your feedback in the AI optimization feedback loop.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select Rejection Reason:
          </label>
          <div className="space-y-2">
            {reasonOptions.map((opt) => (
              <label
                key={opt.value}
                onClick={() => setReason(opt.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  reason === opt.value
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="rejectionReason"
                  checked={reason === opt.value}
                  onChange={() => setReason(opt.value)}
                  className="mt-0.5 text-rose-500 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">{opt.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Additional Feedback Notes (Optional):
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Needs higher emphasis on Tullamarine flight meet-and-greet, or contact has moved departments."
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500/60"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            <XCircle className="w-4 h-4" />
            <span>{submitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
