'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Car,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  Sparkles,
  DollarSign,
  Tag,
} from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [addForm, setAddForm] = useState({
    name: '',
    category: 'Corporate',
    shortDescription: '',
    fullDescription: '',
    targetAudience: 'Corporate Executives & Event Planners',
    pricingModel: 'Fixed Corporate Rate / Hourly',
    suggestedKeywords: '',
  });

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingService),
      });
      if (res.ok) {
        setIsEditOpen(false);
        fetchServices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setAddForm({
          name: '',
          category: 'Corporate',
          shortDescription: '',
          fullDescription: '',
          targetAudience: '',
          pricingModel: '',
          suggestedKeywords: '',
        });
        fetchServices();
      }
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
              <Car className="w-3.5 h-3.5 text-amber-400" />
              <span>Opal Chauffeurs Offerings</span>
            </div>
            <h1 className="text-2xl font-black text-white">Services, Fleet & Pricing Management</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Define and customize Opal Chauffeurs luxury transportation services. The AI engines match corporate demand signals and event requirements directly against these active offerings.
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service Line</span>
          </button>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading services catalog...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {services.map((srv) => {
              let features: string[] = [];
              try {
                if (srv.features) features = JSON.parse(srv.features);
              } catch (e) {}

              return (
                <div
                  key={srv.id}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="gold" size="sm" className="mb-1.5">
                          {srv.category}
                        </Badge>
                        <h2 className="text-base font-bold text-slate-100">{srv.name}</h2>
                      </div>
                      <button
                        onClick={() => {
                          setEditingService(srv);
                          setIsEditOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition-colors"
                        title="Edit Service"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {srv.shortDescription}
                    </p>

                    {features.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Key Capabilities & Fleet Specs
                        </div>
                        <ul className="space-y-1 text-xs text-slate-400">
                          {features.map((f, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px]">{srv.pricingModel || 'Corporate Agreement'}</span>
                    </div>
                    <Badge variant={srv.isActive ? 'emerald' : 'slate'} size="sm">
                      {srv.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Service Modal */}
      {editingService && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Service: ${editingService.name}`}
          subtitle="Update service description, pricing model, and availability without code change."
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Service Name</label>
              <input
                type="text"
                value={editingService.name}
                onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Short Description (for AI matching)</label>
              <textarea
                rows={3}
                value={editingService.shortDescription}
                onChange={(e) => setEditingService({ ...editingService, shortDescription: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pricing Model / Rate Structure</label>
              <input
                type="text"
                value={editingService.pricingModel || ''}
                onChange={(e) => setEditingService({ ...editingService, pricingModel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeSrv"
                checked={editingService.isActive}
                onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })}
                className="rounded text-amber-500"
              />
              <label htmlFor="activeSrv" className="text-xs text-slate-200 font-semibold">
                Service Active for AI Matching & Outreach
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Service Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Service Line"
        subtitle="Expands Opal Chauffeurs offerings portfolio for corporate matching."
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Service Name</label>
              <input
                type="text"
                required
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Diplomatic & Embassy VIP Transport"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                <option value="Corporate">Corporate & Executive</option>
                <option value="Airport">Airport Transfers</option>
                <option value="VIP">VIP & Luxury</option>
                <option value="Event">Event Transfers</option>
                <option value="Hourly">Hourly / Standby</option>
                <option value="Fleet">Group Vans / People Movers</option>
                <option value="Tours">Tours & Intercity</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Service Summary</label>
            <textarea
              rows={3}
              required
              value={addForm.shortDescription}
              onChange={(e) => setAddForm({ ...addForm, shortDescription: e.target.value })}
              placeholder="Describe vehicle types, protocol, and key benefits..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md"
            >
              Add Service
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
