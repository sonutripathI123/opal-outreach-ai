'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import {
  Cpu,
  Play,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const triggerJob = async (jobType: string) => {
    setRunningJob(jobType);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType, action: 'TRIGGER' }),
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningJob(null);
    }
  };

  const toggleJob = async (jobType: string) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType, action: 'TOGGLE' }),
      });
      if (res.ok) {
        fetchJobs();
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
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Continuous Schedulers</span>
            </div>
            <h1 className="text-2xl font-black text-white">Background Schedulers & Intelligence Monitors</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Configurable background jobs responsible for scanning Melbourne commercial hubs, discovering upcoming events at MCEC/venues, enforcing follow-up cadence rules, and classifying inbound email replies.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-xl font-black text-emerald-400">
              {jobs.filter((j) => j.isEnabled).length} / {jobs.length}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Monitors</div>
          </div>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading scheduled jobs...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {jobs.map((job) => {
              const isRunning = runningJob === job.jobType;
              return (
                <div
                  key={job.id}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="gold" size="sm">
                            {job.frequency} SCAN
                          </Badge>
                          <Badge variant={job.isEnabled ? 'emerald' : 'slate'} size="sm">
                            {job.isEnabled ? 'ENABLED' : 'PAUSED'}
                          </Badge>
                        </div>
                        <h2 className="text-base font-bold text-slate-100">{job.title}</h2>
                      </div>

                      <button
                        onClick={() => toggleJob(job.jobType)}
                        className="text-slate-400 hover:text-amber-400 p-1"
                        title={job.isEnabled ? 'Pause Job' : 'Enable Job'}
                      >
                        {job.isEnabled ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                    </div>

                    {/* Result Summary */}
                    {job.lastResultSummary && (
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-amber-400">
                          Last Scan Summary:
                        </div>
                        <p className="text-[11px] leading-relaxed">{job.lastResultSummary}</p>
                      </div>
                    )}

                    {/* Timestamps & Processed stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                      <div>
                        <span className="text-slate-500">Last Executed:</span>
                        <div className="font-medium text-slate-300">
                          {job.lastRunAt ? new Date(job.lastRunAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'Pending run'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Items Processed:</span>
                        <div className="font-bold text-amber-400">{job.itemsProcessed} total</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Status: {isRunning ? 'Executing...' : job.status}
                    </span>

                    <button
                      onClick={() => triggerJob(job.jobType)}
                      disabled={isRunning}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isRunning ? (
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{isRunning ? 'Running Scan...' : 'Trigger Scan Now'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
