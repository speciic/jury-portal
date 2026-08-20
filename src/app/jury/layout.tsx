'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Award, LogOut, Building2, User, ShieldCheck } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface JuryUser {
  id: string;
  name: string;
  username: string;
  venueName?: string;
}

export default function JuryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 font-sans">
      {/* Mobile/Tablet Touch-Friendly Header */}
      <header className="bg-[#111827] border-b border-[#1f293d] sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight leading-tight">Jury Evaluation Portal</h1>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="font-medium text-cyan-400">
                  {juryUser ? juryUser.name : 'Evaluator'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLogout}
              className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium flex items-center space-x-1.5 border border-rose-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24">{children}</main>
    </div>
  );
}
