'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import {
  History,
  Activity,
  Filter,
  CheckCircle2,
  Send,
  Sparkles,
  Cpu,
  User,
  ShieldCheck,
} from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (entityFilter !== 'ALL') params.append('entityType', entityFilter);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const getActorBadge = (actor: string) => {
    if (actor === 'ADMIN_USER') return <Badge variant="gold" size="sm">Admin User</Badge>;
    if (actor === 'AI_ENGINE') return <Badge variant="emerald" size="sm">Claude AI</Badge>;
    return <Badge variant="sky" size="sm">Scheduler</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Audit Trail</span>
            </div>
            <h1 className="text-2xl font-black text-white">System Activity & Audit Logs</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Complete historical record of all discovery runs, scoring events, draft creations, human approvals, rejections, dispatched emails, and inbound reply classifications.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-xl font-black text-slate-200">{logs.length}</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Audit Events</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="DISCOVERY">Discovery Events</option>
              <option value="RESEARCH">Research Dossiers</option>
              <option value="DRAFT_GENERATED">Drafts Generated</option>
              <option value="DRAFT_APPROVED">Human Approvals</option>
              <option value="DRAFT_REJECTED">Human Rejections</option>
              <option value="EMAIL_SENT">Emails Dispatched</option>
              <option value="REPLY_RECEIVED">Replies Received</option>
              <option value="JOB_RUN">Background Jobs</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              <option value="COMPANY">Companies</option>
              <option value="EVENT">Events</option>
              <option value="DRAFT">Outreach Drafts</option>
              <option value="SENT_EMAIL">Sent Emails</option>
              <option value="REPLY">Inbound Replies</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading audit records...</div>
        ) : logs.length > 0 ? (
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            {logs.map((log) => {
              let details: any = null;
              try {
                if (log.details) details = JSON.parse(log.details);
              } catch (e) {}

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100">{log.action.replace(/_/g, ' ')}</span>
                      {getActorBadge(log.actor)}
                      <Badge variant="slate" size="sm">
                        {log.entityType}
                      </Badge>
                    </div>
                    <p className="text-slate-300 font-medium">{log.description}</p>
                    {details && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        {JSON.stringify(details)}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap self-start sm:self-auto">
                    {new Date(log.createdAt).toLocaleString('en-AU')}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            No audit records matching criteria.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
