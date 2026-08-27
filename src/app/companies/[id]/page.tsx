'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { Badge } from '@/components/ui/Badge';
import { ReviewDossierModal } from '@/components/review/ReviewDossierModal';
import {
  Building2,
  ArrowLeft,
  MapPin,
  Globe,
  ExternalLink,
  Users,
  CheckCircle2,
  Sparkles,
  Mail,
  Send,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [company, setCompany] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/companies/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCompany();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 text-xs">Loading company intelligence profile...</div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 text-xs">Company not found.</div>
      </AppLayout>
    );
  }

  const opp = company.opportunity;
  const res = company.research;
  const draft = company.emailDrafts?.[0];

  let scoreBreakdown: any = {};
  try {
    if (opp?.scoreBreakdown) scoreBreakdown = JSON.parse(opp.scoreBreakdown);
  } catch (e) {}

  let detectedSignals: any = {};
  try {
    if (res?.detectedSignals) detectedSignals = JSON.parse(res.detectedSignals);
  } catch (e) {}

  let evidenceSources: any[] = [];
  try {
    if (res?.evidenceSources) evidenceSources = JSON.parse(res.evidenceSources);
  } catch (e) {}

  let recommendedServices: string[] = [];
  try {
    if (opp?.recommendedServices) recommendedServices = JSON.parse(opp.recommendedServices);
  } catch (e) {}

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back navigation */}
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Corporate Companies</span>
        </Link>

        {/* Company Banner */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start sm:items-center gap-5">
            <ScoreGauge score={company.opportunityScore} size="lg" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-white">{company.name}</h1>
                <Badge variant={company.priority === 'HIGH' ? 'gold' : 'slate'} size="sm">
                  {company.priority} PRIORITY
                </Badge>
                <Badge variant={company.status === 'APPROVED' ? 'emerald' : 'amber'} size="sm">
                  {company.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                <span>{company.industry}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {company.headquartersAddress || `${company.city}, ${company.state}`}
                </span>
                <span>•</span>
                <span>{company.approximateSize}</span>
                {company.website && (
                  <>
                    <span>•</span>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{company.domain || company.website}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {draft && (
            <button
              onClick={() => {
                setSelectedDraft({ ...draft, company });
                setIsReviewOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all self-start md:self-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review Outreach Draft</span>
            </button>
          )}
        </div>

        {/* Why Relevant Card */}
        {opp?.whyRelevant && (
          <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Why this company is relevant to Opal Chauffeurs</span>
            </div>
            <p className="text-sm font-semibold text-slate-100 leading-relaxed">
              {opp.whyRelevant}
            </p>
          </div>
        )}

        {/* Two-Column Grid: AI Research Signals & Scoring Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Research & Demand Signals */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              AI Research & Demand Signals
            </h3>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              {res?.summary || 'Comprehensive corporate mobility analysis completed.'}
            </div>

            {/* Signals */}
            {detectedSignals?.strong && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Strong Demand Indicators</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {detectedSignals.strong.map((s: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Matched Services */}
            {recommendedServices.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300">Recommended Opal Services</div>
                <div className="flex flex-wrap gap-2">
                  {recommendedServices.map((srv, idx) => (
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

          {/* Scoring Breakdown & Sources */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Transparent 0-100 Scoring Model Breakdown
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

            {/* Sources */}
            {evidenceSources.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300">Verification Sources</div>
                <div className="space-y-2">
                  {evidenceSources.map((ev, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <span>{ev.title}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-slate-400 text-[11px] mt-0.5">{ev.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contacts & Decision-Makers */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Decision-Makers & Corporate Contacts
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {company.contacts?.map((contact: any) => (
              <div
                key={contact.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{contact.fullName}</span>
                    <Badge variant="emerald" size="sm">
                      {contact.verificationStatus}
                    </Badge>
                  </div>
                  <div className="text-xs text-amber-400 mt-0.5">{contact.jobTitle}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{contact.email}</div>
                </div>

                <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Source: {contact.emailSource.replace(/_/g, ' ')}</span>
                  <span>Confidence: {Math.round(contact.emailConfidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline & History */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Activity History & Audit Trail</span>
          </h3>

          <div className="space-y-2">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-slate-200">{act.description}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(act.createdAt).toLocaleString('en-AU')} • Actor: {act.actor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReviewDossierModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={selectedDraft}
        onRefresh={fetchCompany}
      />
    </AppLayout>
  );
}
