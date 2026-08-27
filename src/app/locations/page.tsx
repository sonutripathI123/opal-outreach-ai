'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  MapPin,
  Plus,
  CheckCircle2,
  XCircle,
  Building,
  Plane,
  Shield,
  Layers,
} from 'lucide-react';

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddCityOpen, setIsAddCityOpen] = useState(false);
  const [isAddSuburbOpen, setIsAddSuburbOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // Form states
  const [cityForm, setCityForm] = useState({
    cityName: '',
    state: 'VIC',
    serviceRadiusKm: 50,
    priorityLevel: 'HIGH',
    notes: '',
  });

  const [suburbForm, setSuburbForm] = useState({
    locationId: '',
    name: '',
    postcode: '',
    commercialHubType: 'BUSINESS_DISTRICT',
  });

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
        if (data.locations?.length > 0 && !selectedLocationId) {
          setSelectedLocationId(data.locations[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cityForm),
      });
      if (res.ok) {
        setIsAddCityOpen(false);
        setCityForm({ cityName: '', state: 'VIC', serviceRadiusKm: 50, priorityLevel: 'HIGH', notes: '' });
        fetchLocations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSuburb = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_SUBURB', ...suburbForm }),
      });
      if (res.ok) {
        setIsAddSuburbOpen(false);
        setSuburbForm({ locationId: '', name: '', postcode: '', commercialHubType: 'BUSINESS_DISTRICT' });
        fetchLocations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLocation = async (locationId: string, current: boolean) => {
    try {
      await fetch('/api/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, isActive: !current }),
      });
      fetchLocations();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSuburb = async (suburbId: string, current: boolean) => {
    try {
      await fetch('/api/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburbId, isActive: !current }),
      });
      fetchLocations();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-City Service Management</span>
            </div>
            <h1 className="text-2xl font-black text-white">Active Service Locations & Commercial Suburbs</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Manage operational zones for corporate discovery, event monitoring, and airport transit across Melbourne and all Australian capital expansion markets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddCityOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add City / Region</span>
            </button>
          </div>
        </div>

        {/* Locations Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading operational locations...</div>
        ) : (
          <div className="space-y-6">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5"
              >
                {/* City Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-bold text-slate-100">
                          {loc.cityName}, {loc.state}
                        </h2>
                        {loc.isPrimary && (
                          <Badge variant="gold" size="sm">
                            PRIMARY FLEET HQ
                          </Badge>
                        )}
                        <Badge variant={loc.isActive ? 'emerald' : 'slate'} size="sm">
                          {loc.isActive ? 'ACTIVE ZONE' : 'INACTIVE'}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Radius: {loc.serviceRadiusKm} km coverage • Priority: {loc.priorityLevel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSuburbForm((prev) => ({ ...prev, locationId: loc.id }));
                        setIsAddSuburbOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Suburb</span>
                    </button>

                    <button
                      onClick={() => toggleLocation(loc.id, loc.isActive)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                        loc.isActive
                          ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/50'
                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50'
                      }`}
                    >
                      {loc.isActive ? 'Deactivate City' : 'Activate City'}
                    </button>
                  </div>
                </div>

                {/* Suburbs List */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Key Commercial Hubs & Suburbs ({loc.suburbs?.length || 0})
                  </div>

                  {loc.suburbs?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {loc.suburbs.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-200">
                              {sub.name} <span className="text-slate-500 font-mono">({sub.postcode})</span>
                            </div>
                            <div className="text-[10px] text-amber-400/90 font-medium mt-0.5">
                              {sub.commercialHubType.replace(/_/g, ' ')}
                            </div>
                          </div>

                          <button
                            onClick={() => toggleSuburb(sub.id, sub.isActive)}
                            className={`p-1.5 rounded-lg text-xs font-bold ${
                              sub.isActive
                                ? 'text-emerald-400 hover:text-rose-400'
                                : 'text-slate-500 hover:text-emerald-400'
                            }`}
                            title={sub.isActive ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {sub.isActive ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center rounded-xl bg-slate-950 text-slate-500 text-xs">
                      No commercial precincts listed yet for this city.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add City Modal */}
      <Modal
        isOpen={isAddCityOpen}
        onClose={() => setIsAddCityOpen(false)}
        title="Activate New Service Location"
        subtitle="Expands corporate discovery and event monitoring into this city."
      >
        <form onSubmit={handleAddCity} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City Name</label>
              <input
                type="text"
                required
                value={cityForm.cityName}
                onChange={(e) => setCityForm({ ...cityForm, cityName: e.target.value })}
                placeholder="e.g. Gold Coast"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">State / Region</label>
              <input
                type="text"
                required
                value={cityForm.state}
                onChange={(e) => setCityForm({ ...cityForm, state: e.target.value })}
                placeholder="QLD"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Service Radius (km)</label>
              <input
                type="number"
                value={cityForm.serviceRadiusKm}
                onChange={(e) => setCityForm({ ...cityForm, serviceRadiusKm: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority Level</label>
              <select
                value={cityForm.priorityLevel}
                onChange={(e) => setCityForm({ ...cityForm, priorityLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="EXPANSION">Future Expansion</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddCityOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md"
            >
              Activate Location
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Suburb Modal */}
      <Modal
        isOpen={isAddSuburbOpen}
        onClose={() => setIsAddSuburbOpen(false)}
        title="Add Commercial Suburb / Precinct"
        subtitle="Define commercial business districts, airport precincts, or tech parks."
      >
        <form onSubmit={handleAddSuburb} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target City</label>
            <select
              value={suburbForm.locationId}
              onChange={(e) => setSuburbForm({ ...suburbForm, locationId: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              <option value="">Select City</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.cityName}, {l.state}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Suburb / Precinct Name</label>
              <input
                type="text"
                required
                value={suburbForm.name}
                onChange={(e) => setSuburbForm({ ...suburbForm, name: e.target.value })}
                placeholder="e.g. Southbank"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Postcode</label>
              <input
                type="text"
                required
                value={suburbForm.postcode}
                onChange={(e) => setSuburbForm({ ...suburbForm, postcode: e.target.value })}
                placeholder="3006"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Commercial Hub Type</label>
            <select
              value={suburbForm.commercialHubType}
              onChange={(e) => setSuburbForm({ ...suburbForm, commercialHubType: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              <option value="CBD">Central Business District (CBD)</option>
              <option value="BUSINESS_DISTRICT">Commercial Business District</option>
              <option value="AIRPORT">Airport / Aviation Precinct</option>
              <option value="BUSINESS_PARK">Tech / Business Park</option>
              <option value="LUXURY_DIPLOMATIC">Luxury / Diplomatic Corridor</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddSuburbOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md"
            >
              Add Suburb
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
