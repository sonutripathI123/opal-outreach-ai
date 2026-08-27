'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ReviewDossierModal } from '@/components/review/ReviewDossierModal';
import {
  CalendarCheck2,
  Search,
  Plus,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  ExternalLink,
  Radar,
  RotateCw,
  CheckCircle2,
  Building,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Location Radar State
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [radarLocation, setRadarLocation] = useState('South Wharf (MCEC)');
  const [radarScanning, setRadarScanning] = useState(false);
  const [discoveredEvents, setDiscoveredEvents] = useState<any[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [batchImporting, setBatchImporting] = useState(false);
  const [radarSuccessMsg, setRadarSuccessMsg] = useState<string | null>(null);

  // New Event Form State
  const [formData, setFormData] = useState({
    name: '',
    eventType: 'CONFERENCE',
    startDate: '',
    endDate: '',
    venueName: 'Melbourne Convention and Exhibition Centre (MCEC)',
    venueAddress: '1 Convention Centre Pl, South Wharf VIC 3006',
    suburb: 'South Wharf',
    city: 'Melbourne',
    state: 'VIC',
    expectedAttendance: '1500',
    vipPresenceLikelihood: 'HIGH',
    organizerName: 'Claire Tremaine',
    organizerCompany: 'Enterprise Tech Summits Australia',
    organizerWebsite: 'https://techsummits.com.au',
    organizerEmail: 'claire@techsummits.com.au',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (eventTypeFilter !== 'ALL') params.append('eventType', eventTypeFilter);

      const res = await fetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, eventTypeFilter]);

  // Handle Location Radar Scan
  const handleScanLocation = async (locationQuery: string) => {
    setRadarScanning(true);
    setRadarSuccessMsg(null);
    try {
      const res = await fetch('/api/events/scan-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRadarScanning(false);
    }
  };

  const openRadarModal = () => {
    setIsRadarOpen(true);
    handleScanLocation(radarLocation);
  };

  // Import single discovered event
  const handleImportDiscoveredEvent = async (eventItem: any) => {
    setImportingId(eventItem.id);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventItem.name,
          eventType: eventItem.eventType,
          startDate: eventItem.startDate,
          endDate: eventItem.endDate,
          venueName: eventItem.venueName,
          venueAddress: eventItem.venueAddress,
          suburb: eventItem.suburb,
          city: eventItem.city,
          state: eventItem.state,
          expectedAttendance: eventItem.expectedAttendance,
          vipPresenceLikelihood: eventItem.vipPresenceLikelihood,
          organizerName: eventItem.organizerName,
          organizerCompany: eventItem.organizerCompany,
          organizerWebsite: eventItem.organizerWebsite,
          organizerEmail: eventItem.organizerEmail,
          sourceUrl: eventItem.sourceUrl,
        }),
      });

      if (res.ok) {
        setDiscoveredEvents((prev) =>
          prev.map((e) => (e.id === eventItem.id ? { ...e, isAlreadyImported: true } : e))
        );
        setRadarSuccessMsg(`"${eventItem.name}" imported and Claude AI pitch generated in Review Queue!`);
        fetchEvents();
        setTimeout(() => setRadarSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setImportingId(null);
    }
  };

  // Import All discovered events
  const handleBatchImportDiscovered = async () => {
    const unimported = discoveredEvents.filter((e) => !e.isAlreadyImported);
    if (unimported.length === 0) return;

    setBatchImporting(true);
    try {
      const res = await fetch('/api/events/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: unimported }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiscoveredEvents((prev) => prev.map((e) => ({ ...e, isAlreadyImported: true })));
        setRadarSuccessMsg(`Successfully imported ${data.importedCount} events and drafted AI proposals!`);
        fetchEvents();
        setTimeout(() => setRadarSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBatchImporting(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setFormData({
          name: '',
          eventType: 'CONFERENCE',
          startDate: '',
          endDate: '',
          venueName: 'Melbourne Convention and Exhibition Centre (MCEC)',
          venueAddress: '',
          suburb: 'South Wharf',
          city: 'Melbourne',
          state: 'VIC',
          expectedAttendance: '1000',
          vipPresenceLikelihood: 'HIGH',
          organizerName: '',
          organizerCompany: '',
          organizerWebsite: '',
          organizerEmail: '',
        });
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add event');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewForEvent = (event: any) => {
    const draft = event.emailDrafts?.[0];
    if (draft) {
      setSelectedDraft({ ...draft, event });
      setIsReviewOpen(true);
    }
  };

  const locationPresets = [
    { label: '🏢 South Wharf (MCEC)', query: 'South Wharf' },
    { label: '🎰 Southbank (Crown)', query: 'Southbank' },
    { label: '🏛️ Melbourne CBD', query: 'Melbourne CBD' },
    { label: '🏟️ Docklands (Marvel)', query: 'Docklands' },
    { label: '🎾 Olympic Blvd (Melb Park)', query: 'Olympic Boulevard' },
    { label: '🏛️ Carlton (Royal Exhibition)', query: 'Carlton' },
    { label: '🌆 Sydney (ICC)', query: 'Sydney' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <CalendarCheck2 className="w-6 h-6 text-sky-400" />
              <span>Event Opportunity Intelligence</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active monitoring of Melbourne & Australian conferences, exhibitions, gala dinners, and sporting events with transport demand analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Feature: Location Radar Button */}
            <button
              onClick={openRadarModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 flex items-center gap-2 transition-all"
            >
              <Radar className="w-4 h-4 text-sky-200 animate-pulse" />
              <span>📡 Location Event Radar</span>
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Custom Event</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search monitored events, venues (MCEC, Crown, Marvel Stadium)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
            >
              <option value="ALL">All Event Types</option>
              <option value="CONFERENCE">Conferences & Summits</option>
              <option value="TRADE_SHOW">Trade Shows & Expos</option>
              <option value="GALA_DINNER">Gala Dinners & Awards</option>
              <option value="SPORTING_EVENT">Sporting & Entertainment</option>
              <option value="VIP_GATHERING">VIP Gatherings</option>
            </select>
          </div>
        </div>

        {/* Events Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading event intelligence database...</div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => {
              const opp = event.opportunity;
              const draft = event.emailDrafts?.[0];
              const contact = event.contacts?.[0];

              return (
                <div
                  key={event.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-sky-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
                >
                  {/* Left: Info & Score */}
                  <div className="flex items-start sm:items-center gap-4 flex-1">
                    <ScoreGauge score={event.opportunityScore} size="md" />

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors"
                        >
                          {event.name}
                        </Link>
                        <Badge variant="sky" size="sm">
                          {event.eventType.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant={event.priority === 'HIGH' ? 'gold' : 'slate'} size="sm">
                          {event.priority}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3 h-3 text-sky-400" />
                          {new Date(event.startDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {event.venueName} ({event.city})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          ~{event.expectedAttendance?.toLocaleString() || 500} Attendees
                        </span>
                      </div>

                      {opp?.whyRelevant && (
                        <p className="text-xs text-slate-300 line-clamp-1 pt-1 font-medium">
                          <span className="text-sky-400 font-semibold">Transport Opportunity: </span>
                          {opp.whyRelevant}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Organizer & Actions */}
                  <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    {contact && (
                      <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs min-w-[170px]">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Organizer Contact</div>
                        <div className="font-semibold text-slate-200 line-clamp-1">{contact.fullName}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{contact.jobTitle}</div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors"
                      >
                        View Logistics
                      </Link>

                      {draft && (
                        <button
                          onClick={() => openReviewForEvent(event)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Review Pitch</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs space-y-3">
            <div>No events found matching current filters.</div>
            <button
              onClick={openRadarModal}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Scan Any Suburb / Venue with Radar</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: 📡 LOCATION EVENT RADAR & AI SCANNER */}
      <Modal
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
        title="📡 Location Event Radar & AI Scanner"
        subtitle="Enter any Suburb, Venue, or Australian City to scan & discover all upcoming high-value corporate events with instant chauffeur pitch generation."
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Preset Location Chips */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-2">Quick Suburb & Venue Presets:</div>
            <div className="flex flex-wrap gap-1.5">
              {locationPresets.map((preset) => (
                <button
                  key={preset.query}
                  type="button"
                  onClick={() => {
                    setRadarLocation(preset.query);
                    handleScanLocation(preset.query);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    radarLocation === preset.query
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 text-sky-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={radarLocation}
                onChange={(e) => setRadarLocation(e.target.value)}
                placeholder="Enter any Suburb or Venue (e.g. South Wharf, Crown, Docklands, Sydney, Brisbane)..."
                onKeyDown={(e) => e.key === 'Enter' && handleScanLocation(radarLocation)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleScanLocation(radarLocation)}
              disabled={radarScanning || !radarLocation.trim()}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all shrink-0"
            >
              {radarScanning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
              <span>{radarScanning ? 'Scanning Location...' : 'Scan Location'}</span>
            </button>
          </div>

          {/* Feedback Success Message */}
          {radarSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{radarSuccessMsg}</span>
            </div>
          )}

          {/* Discovered Events List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Discovered Events ({discoveredEvents.length})</span>
                <span className="text-[11px] font-normal text-slate-500">for &ldquo;{radarLocation}&rdquo;</span>
              </div>

              {discoveredEvents.some((e) => !e.isAlreadyImported) && (
                <button
                  type="button"
                  onClick={handleBatchImportDiscovered}
                  disabled={batchImporting}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {batchImporting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Import All Unsaved to Review Queue</span>
                </button>
              )}
            </div>

            {radarScanning ? (
              <div className="p-10 text-center rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <RotateCw className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
                <div className="text-xs font-semibold text-slate-300">Scanning {radarLocation} venue calendars & delegate rosters...</div>
                <div className="text-[11px] text-slate-500">Extracting international summits, keynote attendance, and airport logistics.</div>
              </div>
            ) : discoveredEvents.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {discoveredEvents.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">{item.name}</span>
                          <Badge variant="sky" size="sm">
                            {item.eventType.replace(/_/g, ' ')}
                          </Badge>
                          {item.isAlreadyImported && (
                            <Badge variant="emerald" size="sm">
                              ✓ IN DATABASE
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2.5">
                          <span className="text-amber-400 font-medium">{item.startDate}</span>
                          <span>•</span>
                          <span>{item.venueName} ({item.suburb})</span>
                          <span>•</span>
                          <span>~{item.expectedAttendance?.toLocaleString()} Delegates</span>
                          <span>•</span>
                          <span className="font-mono text-slate-300">{item.ticketPriceRange}</span>
                        </div>
                      </div>

                      {/* Import / Action Button */}
                      <div>
                        {item.isAlreadyImported ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-semibold inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Monitored</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleImportDiscoveredEvent(item)}
                            disabled={importingId === item.id}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                          >
                            {importingId === item.id ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>{importingId === item.id ? 'Importing...' : 'Import & Draft AI Pitch'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Logistics Demand Explanation */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                      <b className="text-sky-400">Transport Logistics Opportunity: </b>
                      {item.whyRelevant}
                    </div>

                    {/* Organizer Info & Services */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                      <div>
                        Host: <b className="text-slate-200">{item.organizerCompany}</b> ({item.organizerName}) • <span className="text-sky-400 font-mono">{item.organizerEmail}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.recommendedServices?.map((srv: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 text-[10px] border border-slate-800">
                            {srv}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-xs text-slate-400">
                No events found for &ldquo;{radarLocation}&rdquo;. Try another suburb or venue name above.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRadarOpen(false)}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Close Radar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Add Event Form */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Discover & Monitor Upcoming Event"
        subtitle="AI will analyze delegate size, keynote speaker transit, VIP group potential, and draft personalized event logistics outreach."
        maxWidth="2xl"
      >
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Melbourne Biotech & Health Summit 2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Category</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="CONFERENCE">Conference / Summit</option>
                <option value="TRADE_SHOW">Trade Show / Expo</option>
                <option value="GALA_DINNER">Gala Dinner / Awards</option>
                <option value="SPORTING_EVENT">Sporting / Grand Prix / Tennis</option>
                <option value="VIP_GATHERING">VIP Gathering</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Attendance</label>
              <input
                type="number"
                value={formData.expectedAttendance}
                onChange={(e) => setFormData({ ...formData, expectedAttendance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Name *</label>
              <input
                type="text"
                required
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City Hub</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Organizer Details */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-sky-400">Host / Organizer Logistics Contact</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Organizer Name</label>
                <input
                  type="text"
                  value={formData.organizerName}
                  onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                  placeholder="Claire Tremaine"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Organizer Company</label>
                <input
                  type="text"
                  value={formData.organizerCompany}
                  onChange={(e) => setFormData({ ...formData, organizerCompany: e.target.value })}
                  placeholder="Event Producer Pty Ltd"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.organizerEmail}
                  onChange={(e) => setFormData({ ...formData, organizerEmail: e.target.value })}
                  placeholder="logistics@events.com.au"
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Analyzing Event...' : 'Analyze Transportation Opportunity'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <ReviewDossierModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={selectedDraft}
        onRefresh={fetchEvents}
      />
    </AppLayout>
  );
}
