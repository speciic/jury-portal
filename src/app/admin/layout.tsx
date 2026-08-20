'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Trophy,
  UserCheck,
  Building2,
  Sliders,
  FileSpreadsheet,
  History,
  LogOut,
  Menu,
  X,
  Sparkles,
  KeyRound,
  Lock,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface AdminUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { isConnected } = useRealtime();

  useEffect(() => {
    async function checkAdminAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/login');
          return;
        }
        setAdminUser(data.user);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAdminAuth();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setNewPassword('');
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordMsg(null);
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordMsg({ type: 'error', text: err.message });
      } else {
        setPasswordMsg({ type: 'error', text: 'Password change failed' });
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleExportXlsx = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/admin/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hackathon_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to download result sheet');
    } finally {
      setExporting(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Teams', href: '/admin/teams', icon: Users },
    { name: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy },
    { name: 'Juries', href: '/admin/juries', icon: UserCheck },
    { name: 'Venues', href: '/admin/venues', icon: Building2 },
    { name: 'Score & Criteria', href: '/admin/score', icon: Sliders },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  ];

  return (
    <div className="min-h-screen flex text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#080c14]/90 backdrop-blur-2xl border-r border-white/[0.07] fixed inset-y-0 left-0 z-30 shadow-2xl">
        <div className="p-5 flex items-center space-x-3.5 border-b border-white/[0.07]">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#080c14]" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-white tracking-tight font-display">
              JuryPortal <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PRO</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Organizer Console</p>
          </div>
        </div>

        {/* Quick Export Action */}
        <div className="px-4 py-3.5 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={exporting}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 border border-white/15"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Results (.xlsx)</span>
              </>
            )}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-indigo-400 shadow-sm shadow-indigo-400" />
                )}
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-white/[0.07] space-y-1 bg-black/20">
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          <div className="pt-3 mt-1 border-t border-white/[0.04] text-center flex flex-col items-center space-y-2">
            <span className="text-slate-600 text-[9px] uppercase tracking-widest block leading-tight font-bold">
              Powered By
            </span>
            <div className="flex items-center justify-center space-x-3 opacity-80">
              <img src="/logos/Dondeal.png" alt="DonDeal Studios" className="h-7 w-auto object-contain rounded" />
              <img src="/logos/Ratiio1.png" alt="RatiioAi" className="h-7 w-auto object-contain rounded" />
              <img src="/logos/riftgostudios.png" alt="RIFTGO STUDIOS" className="h-7 w-auto object-contain rounded" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#080c14] border-r border-white/[0.08] lg:hidden transform transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-white font-display">Organizer Portal</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              handleExportXlsx();
            }}
            disabled={exporting}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Results (.xlsx)</span>
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active ? 'bg-indigo-500/20 text-white border border-indigo-500/30' : 'text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3.5 mt-auto border-t border-white/[0.08] space-y-1">
          <button
            onClick={() => {
              setMobileOpen(false);
              setPasswordModalOpen(true);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/[0.05]"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-[#080c14]/70 backdrop-blur-xl border-b border-white/[0.07] sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-300 hover:text-white p-2 rounded-xl bg-white/[0.05] border border-white/[0.08]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Session:</span>
              <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/[0.05] text-slate-200 border border-white/[0.08] flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>{adminUser ? adminUser.name : 'Organizer Admin'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Realtime status */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs shadow-inner">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-slate-300 font-medium text-[11px] tracking-wide">
                {isConnected ? 'LIVE SYNC' : 'CONNECTING...'}
              </span>
            </div>

            {/* Header Export Button */}
            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={exporting}
              className="hidden sm:flex items-center space-x-1.5 py-1.5 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Admin Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md luxury-panel p-6 sm:p-7 relative shadow-2xl">
            <button
              onClick={() => {
                setPasswordModalOpen(false);
                setPasswordMsg(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-display">Update Password</h2>
                <p className="text-xs text-slate-400">Secure your organizer account credentials</p>
              </div>
            </div>

            {passwordMsg && (
              <div
                className={`mb-4 p-3.5 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <span>⚠️</span>
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter min 4 characters"
                    className="w-full luxury-input py-2.5 !pl-10 pr-3.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPasswordMsg(null);
                  }}
                  className="px-4 py-2.5 luxury-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="py-2.5 px-5 luxury-btn-primary text-xs font-semibold disabled:opacity-50 flex items-center space-x-2"
                >
                  {passwordSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
