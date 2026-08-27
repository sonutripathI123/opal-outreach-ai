'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Key,
  RotateCw,
  Plus,
  Trash2,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface ApolloKeyItem {
  id: string;
  name: string;
  apiKey: string;
  maskedKey?: string;
  monthlyLimit?: number;
  creditsUsed: number;
  status: 'ACTIVE' | 'LIMIT_REACHED' | 'INVALID' | 'PAUSED';
  lastUsedAt?: string;
  lastError?: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Testing state for Claude
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; claudeResponse?: string } | null>(null);

  // Apollo Key Pool State
  const [apolloPool, setApolloPool] = useState<ApolloKeyItem[]>([]);
  const [newApolloName, setNewApolloName] = useState('');
  const [newApolloKey, setNewApolloKey] = useState('');
  const [newApolloLimit, setNewApolloLimit] = useState(250);
  const [addingApollo, setAddingApollo] = useState(false);
  const [testingApolloId, setTestingApolloId] = useState<string | null>(null);
  const [apolloTestMsg, setApolloTestMsg] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Corporate weights state
  const [corpWeights, setCorpWeights] = useState({
    companySize: 20,
    locationRelevance: 15,
    travelDemand: 20,
    executiveActivity: 15,
    eventsVipActivity: 15,
    serviceMatch: 10,
    businessVerification: 5,
  });

  // Event weights state
  const [eventWeights, setEventWeights] = useState({
    eventSize: 20,
    transportDemand: 25,
    vipRelevance: 15,
    groupTransferPotential: 15,
    locationMatch: 10,
    eventTypeMatch: 10,
    timingUrgency: 5,
  });

  const [apiKey, setApiKey] = useState('');
  const [modelPrimary, setModelPrimary] = useState('claude-3-5-sonnet-20241022');
  const [modelFast, setModelFast] = useState('claude-3-5-haiku-20241022');

  const fetchSettings = async () => {
    try {
      const [settingsRes, apolloRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/apollo/keys'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const settingsList = data.settings || [];

        const keySetting = settingsList.find((s: any) => s.key === 'anthropic_api_key');
        if (keySetting?.value) {
          setApiKey(keySetting.value);
        }

        const aiParams = settingsList.find((s: any) => s.key === 'ai_engine_parameters');
        if (aiParams?.value) {
          try {
            const parsed = JSON.parse(aiParams.value);
            if (parsed.modelPrimary) setModelPrimary(parsed.modelPrimary);
            if (parsed.modelFast) setModelFast(parsed.modelFast);
          } catch (e) {}
        }

        const corp = settingsList.find((s: any) => s.key === 'corporate_scoring_weights');
        if (corp?.value) {
          try {
            const parsed = JSON.parse(corp.value);
            setCorpWeights({
              companySize: parsed.companySize?.weight ?? 20,
              locationRelevance: parsed.locationRelevance?.weight ?? 15,
              travelDemand: parsed.travelDemand?.weight ?? 20,
              executiveActivity: parsed.executiveActivity?.weight ?? 15,
              eventsVipActivity: parsed.eventsVipActivity?.weight ?? 15,
              serviceMatch: parsed.serviceMatch?.weight ?? 10,
              businessVerification: parsed.businessVerification?.weight ?? 5,
            });
          } catch (e) {}
        }

        const ev = settingsList.find((s: any) => s.key === 'event_scoring_weights');
        if (ev?.value) {
          try {
            const parsed = JSON.parse(ev.value);
            setEventWeights({
              eventSize: parsed.eventSize?.weight ?? 20,
              transportDemand: parsed.transportDemand?.weight ?? 25,
              vipRelevance: parsed.vipRelevance?.weight ?? 15,
              groupTransferPotential: parsed.groupTransferPotential?.weight ?? 15,
              locationMatch: parsed.locationMatch?.weight ?? 10,
              eventTypeMatch: parsed.eventTypeMatch?.weight ?? 10,
              timingUrgency: parsed.timingUrgency?.weight ?? 5,
            });
          } catch (e) {}
        }
      }

      if (apolloRes.ok) {
        const aData = await apolloRes.json();
        setApolloPool(aData.pool || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestConnection = async () => {
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model: modelPrimary }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connected successfully to ${data.model}!`,
          claudeResponse: data.claudeResponse,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to connect to Claude API.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error connecting to API endpoint.',
      });
    } finally {
      setTestingAi(false);
    }
  };

  const handleAddApolloKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApolloKey.trim()) return;
    try {
      const res = await fetch('/api/apollo/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_KEY',
          keyEntry: {
            name: newApolloName.trim() || `Apollo Account ${apolloPool.length + 1}`,
            apiKey: newApolloKey.trim(),
            monthlyLimit: Number(newApolloLimit) || 250,
          },
        }),
      });
      if (res.ok) {
        setNewApolloName('');
        setNewApolloKey('');
        setAddingApollo(false);
        const aRes = await fetch('/api/apollo/keys');
        const aData = await aRes.json();
        setApolloPool(aData.pool || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteApolloKey = async (id: string) => {
    try {
      const res = await fetch('/api/apollo/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_KEY', id }),
      });
      if (res.ok) {
        setApolloPool(apolloPool.filter((k) => k.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetApolloStatus = async (id: string) => {
    try {
      const res = await fetch('/api/apollo/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_STATUS', id }),
      });
      if (res.ok) {
        setApolloPool(
          apolloPool.map((k) => (k.id === id ? { ...k, status: 'ACTIVE', creditsUsed: 0, lastError: undefined } : k))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestApolloKey = async (item: ApolloKeyItem) => {
    setTestingApolloId(item.id);
    setApolloTestMsg(null);
    try {
      const res = await fetch('/api/apollo/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST_KEY', apiKey: item.apiKey }),
      });
      const data = await res.json();
      setApolloTestMsg({
        id: item.id,
        success: data.success,
        message: data.message || (data.success ? 'Apollo Key connected successfully!' : 'Apollo connection failed'),
      });
    } catch (err: any) {
      setApolloTestMsg({
        id: item.id,
        success: false,
        message: err.message || 'Error testing Apollo Key',
      });
    } finally {
      setTestingApolloId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'anthropic_api_key',
            value: apiKey.trim(),
            category: 'AI_CONFIG',
            description: 'Anthropic Claude API Secret Key',
          }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'ai_engine_parameters',
            value: {
              primaryProvider: 'claude',
              modelPrimary,
              modelFast,
              temperature: 0.3,
            },
            category: 'AI_CONFIG',
          }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'corporate_scoring_weights',
            value: corpWeights,
            category: 'SCORING_WEIGHTS',
          }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'event_scoring_weights',
            value: eventWeights,
            category: 'SCORING_WEIGHTS',
          }),
        }),
      ]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const corpTotal = Object.values(corpWeights).reduce((a, b) => a + Number(b), 0);
  const eventTotal = Object.values(eventWeights).reduce((a, b) => a + Number(b), 0);
  const totalApolloCapacity = apolloPool.reduce((acc, k) => acc + (k.monthlyLimit || 250), 0);
  const totalApolloUsed = apolloPool.reduce((acc, k) => acc + (k.creditsUsed || 0), 0);

  return (
    <AppLayout>
      <form onSubmit={handleSave} className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Governance & API Pooling</span>
            </div>
            <h1 className="text-2xl font-black text-white">AI Engine, Apollo.io Pool & Scoring Weights</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Manage Anthropic Claude credentials, configure multi-account Apollo.io API keys with auto-failover (for 1,500–2,000+ monthly email extractions), and adjust transparent 0–100 scoring weights.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save AI & Scoring Rules'}</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settings and API keys updated successfully!</span>
          </div>
        )}

        {/* SECTION 1: Claude API Configuration */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Anthropic Claude API Abstraction
              </h2>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingAi}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {testingAi ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{testingAi ? 'Testing Key...' : 'Test Claude Connection'}</span>
            </button>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div>{testResult.message}</div>
                {testResult.claudeResponse && (
                  <div className="text-[11px] text-emerald-200 font-mono italic">
                    Claude replied: &ldquo;{testResult.claudeResponse}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Anthropic Claude API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Primary Intelligence Model
              </label>
              <select
                value={modelPrimary}
                onChange={(e) => setModelPrimary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fast Classification Model
              </label>
              <select
                value={modelFast}
                onChange={(e) => setModelFast(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Apollo.io Multi-Account Key Pool & Auto-Failover */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-sky-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Apollo.io Multi-Account API Pool & Auto-Failover
                </h2>
                <Badge variant="sky" size="sm">
                  {apolloPool.filter((k) => k.status === 'ACTIVE').length} Active Keys
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Auto-switches between multiple accounts when monthly or daily credit limits are reached, achieving 1,500–2,000+ monthly verified executive emails effortlessly.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-200 font-mono">
                  {totalApolloUsed} / {totalApolloCapacity} Credits
                </div>
                <div className="text-[10px] text-slate-500 uppercase">Pool Capacity</div>
              </div>
              <button
                type="button"
                onClick={() => setAddingApollo(!addingApollo)}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Apollo Account Key</span>
              </button>
            </div>
          </div>

          {/* Add Key Form Inline */}
          {addingApollo && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/40 space-y-3 animate-in fade-in">
              <div className="text-xs font-bold text-sky-400">Add New Apollo.io Account Key to Rotation Pool</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Account Label / Identifier</label>
                  <input
                    type="text"
                    value={newApolloName}
                    onChange={(e) => setNewApolloName(e.target.value)}
                    placeholder="e.g. Apollo Account 1 (sonu@...)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Apollo API Key</label>
                  <input
                    type="password"
                    value={newApolloKey}
                    onChange={(e) => setNewApolloKey(e.target.value)}
                    placeholder="api_sk_..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Monthly Export Limit</label>
                  <input
                    type="number"
                    value={newApolloLimit}
                    onChange={(e) => setNewApolloLimit(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddingApollo(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddApolloKey}
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  Add Key to Pool
                </button>
              </div>
            </div>
          )}

          {/* Apollo Key Pool List */}
          {apolloPool.length > 0 ? (
            <div className="space-y-2.5">
              {apolloPool.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{item.name}</span>
                      <Badge
                        variant={
                          item.status === 'ACTIVE'
                            ? 'emerald'
                            : item.status === 'LIMIT_REACHED'
                            ? 'gold'
                            : 'rose'
                        }
                        size="sm"
                      >
                        {item.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] font-mono text-slate-500">
                        {item.maskedKey || '••••••••••••••••'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Credits Used: <b className="text-amber-400 font-mono">{item.creditsUsed || 0}</b> / {item.monthlyLimit || 250}</span>
                      {item.lastError && (
                        <span className="text-rose-400">({item.lastError})</span>
                      )}
                    </div>

                    {apolloTestMsg && apolloTestMsg.id === item.id && (
                      <div className={`text-[11px] font-semibold ${apolloTestMsg.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {apolloTestMsg.message}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleTestApolloKey(item)}
                      disabled={testingApolloId === item.id}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                    >
                      {testingApolloId === item.id ? <RotateCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      <span>Test</span>
                    </button>

                    {item.status === 'LIMIT_REACHED' && (
                      <button
                        type="button"
                        onClick={() => handleResetApolloStatus(item.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold"
                      >
                        Reset Limit
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteApolloKey(item.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-xs text-slate-400 space-y-1">
              <div>No Apollo API keys added to the rotation pool yet.</div>
              <div className="text-[11px] text-slate-500">
                Click <b>&ldquo;Add Apollo Account Key&rdquo;</b> to add 4–6 accounts for automated 1,500–2,000+ monthly contact extractions.
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: 2-Column Scoring Factor Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Corporate Scoring Factor Weights */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Corporate Opportunity Scoring Model (0–100)
              </h2>
              <span className={`text-xs font-bold font-mono ${corpTotal === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                Total: {corpTotal}/100 pts
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Company Size (Employee Scale):</span>
                  <span className="font-bold text-amber-400">{corpWeights.companySize} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={corpWeights.companySize}
                  onChange={(e) => setCorpWeights({ ...corpWeights, companySize: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Location Relevance (Melbourne & Active Hubs):</span>
                  <span className="font-bold text-amber-400">{corpWeights.locationRelevance} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={corpWeights.locationRelevance}
                  onChange={(e) => setCorpWeights({ ...corpWeights, locationRelevance: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Travel & Airport Demand (Tullamarine Flights):</span>
                  <span className="font-bold text-amber-400">{corpWeights.travelDemand} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={corpWeights.travelDemand}
                  onChange={(e) => setCorpWeights({ ...corpWeights, travelDemand: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Corporate & Executive Activity (C-suite & Board):</span>
                  <span className="font-bold text-amber-400">{corpWeights.executiveActivity} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={corpWeights.executiveActivity}
                  onChange={(e) => setCorpWeights({ ...corpWeights, executiveActivity: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Events, Galas & VIP Hospitality:</span>
                  <span className="font-bold text-amber-400">{corpWeights.eventsVipActivity} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={corpWeights.eventsVipActivity}
                  onChange={(e) => setCorpWeights({ ...corpWeights, eventsVipActivity: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Opal Service Alignment (Sedans / Vans / VIP):</span>
                  <span className="font-bold text-amber-400">{corpWeights.serviceMatch} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={corpWeights.serviceMatch}
                  onChange={(e) => setCorpWeights({ ...corpWeights, serviceMatch: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Business Standing & Registration Verification:</span>
                  <span className="font-bold text-amber-400">{corpWeights.businessVerification} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={corpWeights.businessVerification}
                  onChange={(e) => setCorpWeights({ ...corpWeights, businessVerification: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Event Scoring Factor Weights */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Event Opportunity Scoring Model (0–100)
              </h2>
              <span className={`text-xs font-bold font-mono ${eventTotal === 100 ? 'text-emerald-400' : 'text-sky-400'}`}>
                Total: {eventTotal}/100 pts
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Event Delegate Scale:</span>
                  <span className="font-bold text-sky-400">{eventWeights.eventSize} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={eventWeights.eventSize}
                  onChange={(e) => setEventWeights({ ...eventWeights, eventSize: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Transportation & Airport Volume:</span>
                  <span className="font-bold text-sky-400">{eventWeights.transportDemand} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={eventWeights.transportDemand}
                  onChange={(e) => setEventWeights({ ...eventWeights, transportDemand: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>VIP & Keynote Speaker Presence:</span>
                  <span className="font-bold text-sky-400">{eventWeights.vipRelevance} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={eventWeights.vipRelevance}
                  onChange={(e) => setEventWeights({ ...eventWeights, vipRelevance: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Group Van & Shuttle Potential (Mercedes V-Class):</span>
                  <span className="font-bold text-sky-400">{eventWeights.groupTransferPotential} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={eventWeights.groupTransferPotential}
                  onChange={(e) => setEventWeights({ ...eventWeights, groupTransferPotential: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Venue Location Alignment (MCEC / CBD / Venues):</span>
                  <span className="font-bold text-sky-400">{eventWeights.locationMatch} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={eventWeights.locationMatch}
                  onChange={(e) => setEventWeights({ ...eventWeights, locationMatch: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Event Category Match (Conference / Gala / Trade Show):</span>
                  <span className="font-bold text-sky-400">{eventWeights.eventTypeMatch} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={eventWeights.eventTypeMatch}
                  onChange={(e) => setEventWeights({ ...eventWeights, eventTypeMatch: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Timing & Lead-Time Urgency (7–90 Days):</span>
                  <span className="font-bold text-sky-400">{eventWeights.timingUrgency} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={eventWeights.timingUrgency}
                  onChange={(e) => setEventWeights({ ...eventWeights, timingUrgency: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
