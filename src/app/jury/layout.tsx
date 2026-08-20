'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, LogOut, Building2, User, ShieldCheck } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface JuryUser {
  id: string;
  name: string;
  username: string;
  venueName?: string;
}

export default function JuryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [juryUser, setJuryUser] = useState<JuryUser | null>(null);
  const { isConnected } = useRealtime();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!data.user || data.user.role !== 'JURY') {
          router.push('/login');
          return;
        }
        setJuryUser(data.user);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100 font-sans">
      {/* Executive Touch-Friendly Header */}
      <header className="bg-[#080c14]/80 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-30 px-4 py-3.5 sm:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 border border-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-tight leading-tight font-display">
                JuryPortal <span className="text-[11px] font-semibold text-cyan-400">JUDGE</span>
              </h1>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                <span className="font-semibold text-slate-200">
                  {juryUser ? juryUser.name : 'Evaluator'}
                </span>
                {juryUser?.venueName && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-300 font-medium">{juryUser.venueName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Realtime dot */}
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px]">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-medium">{isConnected ? 'LIVE' : 'SYNCING'}</span>
            </div>

            <button
              onClick={handleLogout}
              className="py-1.5 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 border border-rose-500/25 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 pb-16">{children}</main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-white/[0.04]">
        <span className="text-slate-600 text-[10px] uppercase tracking-widest block leading-tight">
          Developed in association with DonDeal Studios & RatiioAi
        </span>
      </footer>
    </div>
  );
}
