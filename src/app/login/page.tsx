'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sonutripathi9305@gmail.com');
  const [password, setPassword] = useState('02122025');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 p-[1px] shadow-xl shadow-amber-950/50 mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <Car className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            OPAL OUTREACH <span className="text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Corporate Partnership & Event Opportunity Intelligence Platform for Opal Chauffeurs
          </p>
        </div>

        {/* Login Box */}
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
            <h2 className="text-base font-semibold text-slate-100">Executive Sign In</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected Hub</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authorized Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
                  placeholder="admin@opalchauffeurs.com.au"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  <span>Access Intelligence Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Opal Chauffeurs (Esteem Travel Service Pty Ltd) • Melbourne, VIC
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
