'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ReviewDossierModal } from '@/components/review/ReviewDossierModal';
import {
  Building2,
  Search,
  Plus,
  Filter,
  ExternalLink,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Radar,
  Copy,
  Download,
} from 'lucide-react';
import Link from 'next/link';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Target Radar State
  const [radarTargets, setRadarTargets] = useState<any[]>([]);
  const [copiedDomains, setCopiedDomains] = useState(false);

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedCount, setCsvParsedCount] = useState<number | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<any>(null);

  // New Company Form state
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: 'Financial Services & Wealth Management',
    city: 'Melbourne',
    state: 'VIC',
    headquartersAddress: '120 Collins Street, Melbourne VIC 3000',
    approximateSize: 'Large (200-1000)',
    officeCount: '4',
    internationalPresence: true,
    contactName: 'James Hawthorne',
    contactRole: 'Head of Executive Travel & Operations',
    contactEmail: 'j.hawthorne@company.com.au',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/companies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRadarTargets = async () => {
    try {
      const res = await fetch('/api/companies/target-radar');
      if (res.ok) {
        const data = await res.json();
        setRadarTargets(data.companies || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchRadarTargets();
  }, [search, priorityFilter, statusFilter]);

  const handleCopyDomains = () => {
    const domains = radarTargets.map((t) => t.domain).join('\n');
    navigator.clipboard.writeText(domains);
    setCopiedDomains(true);
    setTimeout(() => setCopiedDomains(false), 3000);
  };

  const handleDownloadRadarCsv = () => {
    const headers = ['Company', 'Website', 'Industry', 'City', 'Address', 'Title', 'Description'];
    const rows = radarTargets.map((t) => [
      `"${t.name}"`,
      `"${t.domain}"`,
      `"${t.industry}"`,
      `"${t.suburb}"`,
      `"${t.address}"`,
      `"${t.targetRoles.join('; ')}"`,
      `"${t.whyTarget}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Melbourne_Top_Corporate_Targets_Apollo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setFormData({
          name: '',
          website: '',
          industry: 'Financial Services & Wealth Management',
          city: 'Melbourne',
          state: 'VIC',
          headquartersAddress: '',
          approximateSize: 'Medium (50-200)',
          officeCount: '2',
          internationalPresence: false,
          contactName: '',
          contactRole: 'Head of Executive Operations',
          contactEmail: '',
        });
        fetchCompanies();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add company');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to parse CSV string into objects
  const parseCsvStringToObjects = (text: string) => {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvText(content);
        const parsed = parseCsvStringToObjects(content);
        setCsvParsedCount(parsed.length);
      };
      reader.readAsText(file);
    }
  };

  const handleCsvTextChange = (text: string) => {
    setCsvText(text);
    const parsed = parseCsvStringToObjects(text);
    setCsvParsedCount(parsed.length > 0 ? parsed.length : null);
  };

  const handleRunBulkImport = async () => {
    const rows = parseCsvStringToObjects(csvText);
    if (rows.length === 0) {
      alert('Please provide valid CSV content with headers');
      return;
    }

    setImportingCsv(true);
    setCsvImportResult(null);
    try {
      const res = await fetch('/api/companies/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCsvImportResult(data);
        fetchCompanies();
      } else {
        alert(data.error || 'Failed to bulk import leads');
      }
    } catch (e: any) {
      alert(e.message || 'Error executing bulk import');
    } finally {
      setImportingCsv(false);
    }
  };

  const openReviewForCompany = (comp: any) => {
    const draft = comp.emailDrafts?.[0];
    if (draft) {
      setSelectedDraft({ ...draft, company: comp });
      setIsReviewOpen(true);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-amber-400" />
              <span>Corporate Company Intelligence</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Discover target enterprises in Melbourne, generate Apollo search queries, and import verified contacts to create AI pitches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start sm:self-auto">
            <button
              onClick={() => setIsRadarOpen(true)}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-md flex items-center gap-2 transition-all"
            >
              <Radar className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>🎯 Melbourne Target Radar</span>
            </button>

            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-bold shadow-md flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>📥 Import Apollo CSV</span>
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies by name, industry, Melbourne suburb..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 flex-1 sm:flex-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority (80+)</option>
              <option value="MEDIUM">Medium Priority (60-79)</option>
              <option value="MANUAL_REVIEW">Manual Review</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 flex-1 sm:flex-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFTED">In Review</option>
              <option value="APPROVED">Approved</option>
              <option value="CONTACTED">Contacted</option>
              <option value="REPLIED">Replied</option>
            </select>
          </div>
        </div>

        {/* Company Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading corporate intelligence database...</div>
        ) : companies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {companies.map((comp) => {
              const opp = comp.opportunity;
              const draft = comp.emailDrafts?.[0];
              const contact = comp.contacts?.[0];

              return (
                <div
                  key={comp.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 group"
                >
                  {/* Left: Info & Score */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                    <ScoreGauge score={comp.opportunityScore} size="md" />

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/companies/${comp.id}`}
                          className="text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors"
                        >
                          {comp.name}
                        </Link>
                        <Badge variant={comp.priority === 'HIGH' ? 'gold' : 'slate'} size="sm">
                          {comp.priority}
                        </Badge>
                        <Badge variant={comp.status === 'CONTACTED' ? 'sky' : comp.status === 'APPROVED' ? 'emerald' : 'amber'} size="sm">
                          {comp.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span>{comp.industry}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {comp.city}, {comp.state}
                        </span>
                        <span>•</span>
                        <span>{comp.approximateSize}</span>
                        {comp.website && (
                          <>
                            <span>•</span>
                            <a
                              href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline flex items-center gap-1"
                            >
                              <span>Website</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </>
                        )}
                      </div>

                      {/* Why Relevant Preview */}
                      {opp?.whyRelevant && (
                        <p className="text-xs text-slate-300 line-clamp-1 pt-1 font-medium">
                          <span className="text-amber-400 font-semibold">Relevance: </span>
                          {opp.whyRelevant}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Contact & Actions */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800 w-full lg:w-auto">
                    {contact && (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex-1 sm:flex-none min-w-[150px]">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Contact</div>
                        <div className="font-semibold text-slate-200 line-clamp-1">{contact.fullName}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{contact.jobTitle}</div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/companies/${comp.id}`}
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors"
                      >
                        Dossier
                      </Link>

                      {draft && (
                        <button
                          onClick={() => openReviewForCompany(comp)}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Review Draft</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            No companies matching current filters. Click &ldquo;🎯 Melbourne Target Radar&rdquo; or &ldquo;Import Apollo CSV&rdquo; to evaluate organizations.
          </div>
        )}
      </div>

      {/* Target Radar Modal */}
      <Modal
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
        title="🎯 Location & Suburb Corporate Target Radar"
        subtitle="Discover top high-mobility enterprises by Melbourne & Australian suburbs with 1-click direct AI pitch generation and Apollo search links."
        maxWidth="5xl"
      >
        <div className="space-y-5">
          {/* Suburb Preset Chips & Search */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-2">Filter by Commercial Suburb / Precinct:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'All Locations', value: 'ALL' },
                  { label: '🏢 Melbourne CBD (Collins / William St)', value: 'Melbourne CBD' },
                  { label: '🎰 Southbank', value: 'Southbank' },
                  { label: '🏟️ Docklands', value: 'Docklands' },
                  { label: '🌳 St Kilda Road', value: 'St Kilda Road' },
                  { label: '🏭 Clayton & SE', value: 'Clayton' },
                  { label: '🌆 Sydney CBD', value: 'Sydney' },
                  { label: '🌆 Brisbane', value: 'Brisbane' },
                ].map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setPriorityFilter((prev) => prev)} // trigger re-render
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      (search === chip.value || (chip.value === 'ALL' && !search))
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter radar targets by company name, suburb, or industry..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    // Live client filter
                  }}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyDomains}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedDomains ? '✓ Copied!' : 'Copy Domains'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRadarCsv}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Target List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[55vh] overflow-y-auto pr-1">
            {radarTargets.map((item, idx) => {
              const apolloUrl = `https://app.apollo.io/#/people?qOrganizationDomains=${encodeURIComponent(item.domain)}&personTitles[]=Executive%20Assistant&personTitles[]=Head%20of%20Operations&personTitles[]=Corporate%20Travel%20Manager&personTitles[]=Office%20Manager`;
              const isAlreadyMonitored = companies.some(
                (c) =>
                  c.name?.toLowerCase() === item.name?.toLowerCase() ||
                  c.website?.toLowerCase().includes(item.domain?.toLowerCase())
              );

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl bg-slate-950/80 border transition-all flex flex-col justify-between space-y-3 ${
                    isAlreadyMonitored ? 'border-emerald-500/40' : 'border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{item.name}</h4>
                          {isAlreadyMonitored && (
                            <Badge variant="emerald" size="sm">
                              ✓ MONITORED
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono">{item.domain}</div>
                      </div>
                      <Badge variant="gold" size="sm">
                        {item.suburb}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium line-clamp-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                      {item.whyTarget}
                    </p>

                    <div className="text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">Target Roles: </span>
                      {item.targetRoles?.join(', ')}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">{item.size}</span>
                    
                    <div className="flex items-center gap-2">
                      <a
                        href={apolloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Apollo</span>
                        <ExternalLink className="w-3 h-3 text-sky-400" />
                      </a>

                      {!isAlreadyMonitored && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/companies', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: item.name,
                                  website: `https://${item.domain}`,
                                  industry: item.industry,
                                  headquartersAddress: item.address,
                                  city: 'Melbourne',
                                  state: 'VIC',
                                  approximateSize: item.size || 'Large (200-1000)',
                                  contactName: 'Corporate Travel Lead',
                                  contactRole: item.targetRoles?.[0] || 'Executive Operations Director',
                                  contactEmail: `travel@${item.domain}`,
                                }),
                              });
                              if (res.ok) {
                                fetchCompanies();
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow flex items-center gap-1 transition-all"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Import & Pitch</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          setCsvImportResult(null);
        }}
        title="📥 Bulk Import Apollo.io Leads & Generate AI Outreaches"
        subtitle="Upload an Apollo.io CSV export or paste CSV text. Claude 3.5 AI will automatically score all companies and generate tailored executive drafts in batch."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {csvImportResult ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Bulk Import & Intelligence Complete!</h3>
              <p className="text-xs text-emerald-200">
                Successfully imported <b>{csvImportResult.importedCount}</b> companies and generated individual personalized outreach drafts.
              </p>
              {csvImportResult.skippedCount > 0 && (
                <div className="text-[11px] text-slate-400">
                  {csvImportResult.skippedCount} duplicate or invalid rows skipped.
                </div>
              )}
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/review"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg"
                >
                  Go to Human Review Queue →
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCsvImportResult(null);
                    setCsvText('');
                    setCsvParsedCount(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                >
                  Import More
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Upload Zone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-2xl p-6 text-center transition-colors bg-slate-950/60">
                <input
                  type="file"
                  accept=".csv"
                  id="csv-file-input"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
                  <UploadCloud className="w-8 h-8 text-sky-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-200">
                    {csvFile ? csvFile.name : 'Click to select or drag & drop an Apollo CSV file'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supports exports directly from Apollo.io with Company Name, Website, Title, Email columns.
                  </div>
                </label>
              </div>

              {/* Paste Text Area */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Or Paste CSV Raw Content Here:
                  </label>
                  {csvParsedCount !== null && (
                    <span className="text-[11px] font-bold text-emerald-400">
                      ✓ {csvParsedCount} leads detected
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => handleCsvTextChange(e.target.value)}
                  placeholder="Company Name,Website,Industry,First Name,Last Name,Title,Email&#10;Telstra,telstra.com,Telecommunications,Sarah,Jenkins,Head of Operations,sarah.jenkins@telstra.com&#10;BHP,bhp.com,Mining,Marcus,Vance,Corporate Travel Desk,m.vance@bhp.com"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">💡 Complete 3-Step Flow:</div>
                <div>1. Click &ldquo;🎯 Melbourne Target Radar&rdquo; and click &ldquo;Copy Domains&rdquo;.</div>
                <div>2. In Apollo.io web, paste domains and click &ldquo;Export CSV&rdquo;.</div>
                <div>3. Drop that CSV file here. Claude AI will score all companies and draft emails automatically!</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importingCsv || !csvParsedCount}
                  onClick={handleRunBulkImport}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {importingCsv
                      ? 'AI Processing & Scoring Leads...'
                      : `Import & Score ${csvParsedCount ? `${csvParsedCount} Leads` : 'Leads'}`}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add / Discover Company Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Discover & Analyze Corporate Enterprise"
        subtitle="AI will research the company, evaluate executive travel & airport demand, score the opportunity, and generate a 2-layer personalized draft."
        maxWidth="2xl"
      >
        <form onSubmit={handleAddCompany} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Macquarie Group Melbourne"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Website *</label>
              <input
                type="text"
                required
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://macquarie.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Industry Sector</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scale / Employee Count</label>
              <select
                value={formData.approximateSize}
                onChange={(e) => setFormData({ ...formData, approximateSize: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Small (10-50)">Small (10-50)</option>
                <option value="Medium (50-200)">Medium (50-200)</option>
                <option value="Large (200-1000)">Large (200-1000)</option>
                <option value="Enterprise (1000+)">Enterprise (1000+)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City Hub</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Offices Count</label>
              <input
                type="number"
                value={formData.officeCount}
                onChange={(e) => setFormData({ ...formData, officeCount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Headquarters Address</label>
              <input
                type="text"
                value={formData.headquartersAddress}
                onChange={(e) => setFormData({ ...formData, headquartersAddress: e.target.value })}
                placeholder="101 Collins St, Melbourne VIC"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Decision Maker */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-amber-400">Target Decision-Maker / Executive Desk</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Full Name (or leave blank for Apollo)"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData.contactRole}
                  onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                  placeholder="Head of Operations"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Business Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="Leave blank for auto-lookup"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Running Intelligence...' : 'Run AI Analysis & Draft'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Dossier Modal */}
      <ReviewDossierModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={selectedDraft}
        onRefresh={fetchCompanies}
      />
    </AppLayout>
  );
}
