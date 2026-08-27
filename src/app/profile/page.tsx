'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import {
  Building,
  Save,
  CheckCircle2,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 text-xs">Loading Opal business profile...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <form onSubmit={handleSave} className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>Opal Chauffeurs Brand Master</span>
            </div>
            <h1 className="text-2xl font-black text-white">Business Profile & Brand Configuration</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              All company details, contact channels, brand positioning, email signatures, and collaboration offers are editable here and feed into the AI 2-layer outreach engine.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Business profile settings updated successfully! All future AI outreach will use these updated details.</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Core Company Identity */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Legal & Brand Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company Brand Name</label>
                <input
                  type="text"
                  value={profile?.companyName || ''}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Legal / Trading Entity</label>
                <input
                  type="text"
                  value={profile?.tradingName || ''}
                  onChange={(e) => setProfile({ ...profile, tradingName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Website</label>
              <input
                type="text"
                value={profile?.website || ''}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Master Company Description</label>
              <textarea
                rows={4}
                value={profile?.description || ''}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Positioning Statement</label>
              <textarea
                rows={3}
                value={profile?.brandPositioning || ''}
                onChange={(e) => setProfile({ ...profile, brandPositioning: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Card 2: Contact, Address & Outgoing Signatures */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Contact & Outgoing Outreach Wording
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Public / Booking Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telephone / Hotline</label>
                <input
                  type="text"
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Street Address</label>
                <input
                  type="text"
                  value={profile?.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Suburb / State</label>
                <input
                  type="text"
                  value={`${profile?.suburb || 'Clarinda'}, ${profile?.state || 'VIC'}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(',');
                    setProfile({ ...profile, suburb: parts[0]?.trim() || '', state: parts[1]?.trim() || 'VIC' });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Postcode</label>
                <input
                  type="text"
                  value={profile?.postcode || '3169'}
                  onChange={(e) => setProfile({ ...profile, postcode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Collaboration Offer / Concept</label>
              <textarea
                rows={3}
                value={profile?.collaborationOffer || ''}
                onChange={(e) => setProfile({ ...profile, collaborationOffer: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email Signature (Layer 1 Fixed)</label>
              <textarea
                rows={5}
                value={profile?.emailSignature || ''}
                onChange={(e) => setProfile({ ...profile, emailSignature: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
