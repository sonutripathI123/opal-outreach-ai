'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { Badge } from '@/components/ui/Badge';
import { ReviewDossierModal } from '@/components/review/ReviewDossierModal';
import {
  CalendarCheck2,
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building,
  Car,
} from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 text-xs">Loading event opportunity profile...</div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 text-xs">Event not found.</div>
      </AppLayout>
    );
  }

  const opp = event.opportunity;
  const res = event.research;
  const draft = event.emailDrafts?.[0];

  let scoreBreakdown: any = {};
  try {
    if (opp?.scoreBreakdown) scoreBreakdown = JSON.parse(opp.scoreBreakdown);
  } catch (e) {}

  let demandSignals: string[] = [];
  try {
    if (res?.transportationDemandSignals) demandSignals = JSON.parse(res.transportationDemandSignals);
  } catch (e) {}

  let recommendedServices: string[] = [];
  try {
    if (opp?.recommendedServices) recommendedServices = JSON.parse(opp.recommendedServices);
  } catch (e) {}

  return (
    <AppLayout>
      <div className="space-y-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Event Opportunities</span>
        </Link>

        {/* Event Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start sm:items-center gap-5">
            <ScoreGauge score={event.opportunityScore} size="lg" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-white">{event.name}</h1>
                <Badge variant="sky" size="sm">
                  {event.eventType.replace(/_/g, ' ')}
                </Badge>
                <Badge variant={event.priority === 'HIGH' ? 'gold' : 'slate'} size="sm">
                  {event.priority}
                </Badge>
              </div>

              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  {new Date(event.startDate).toLocaleDateString('en-AU', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {event.venueName}, {event.city}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  ~{event.expectedAttendance?.toLocaleString() || 500} Expected Delegates
                </span>
              </div>
            </div>
          </div>

          {draft && (
            <button
              onClick={() => {
                setSelectedDraft({ ...draft, event });
                setIsReviewOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all self-start md:self-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review Event Outreach Draft</span>
            </button>
          )}
        </div>

        {/* Why Relevant */}
        {opp?.whyRelevant && (
          <div className="p-5 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Transportation & Chauffeur Opportunity Rationale</span>
            </div>
            <p className="text-sm font-semibold text-slate-100 leading-relaxed">
              {opp.whyRelevant}
            </p>
          </div>
        )}

        {/* Two-Column Grid: Transportation Demand & Scoring Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demand Signals */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Event Logistics & Mobility Signals
            </h3>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              {res?.summary || 'Event analysis completed.'}
            </div>

            {demandSignals.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Key Transportation Factors</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {demandSignals.map((s, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendedServices.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300">Tailored Fleet Solutions</div>
                <div className="flex flex-wrap gap-2">
                  {recommendedServices.map((srv, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-medium"
                    >
                      {srv}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scoring Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Transparent Event Scoring Breakdown
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(scoreBreakdown).map(([key, val]: any) => (
                <div key={key} className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{val} pts</div>
                </div>
              ))}
            </div>

            {/* Organizer Contact Snapshot */}
            {event.contacts?.[0] && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 pt-3">
                <div className="text-xs font-bold text-slate-300">Host / Organizer Contact</div>
                <div className="text-xs font-bold text-slate-100">{event.contacts[0].fullName}</div>
                <div className="text-xs text-sky-400">{event.contacts[0].jobTitle}</div>
                <div className="text-xs text-slate-400">{event.contacts[0].email}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewDossierModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={selectedDraft}
        onRefresh={fetchEvent}
      />
    </AppLayout>
  );
}
