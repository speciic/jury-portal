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
  Award,
  Sparkles,
  KeyRound,
  Lock,
  CheckCircle,
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
    <div className="min-h-screen flex bg-[#0b0f17] text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#111827] border-r border-[#1f293d] fixed inset-y-0 left-0 z-30">
        <div className="p-5 flex items-center space-x-3 border-b border-[#1f293d]">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white tracking-tight">Admin Portal</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Organizer Dashboard
            </p>
          </div>
        </div>

        {/* Export Button */}
        <div className="px-4 py-3.5 border-b border-[#1f293d]">
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={exporting}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-2 shadow-sm"
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
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#1a2338] text-white border-l-2 border-indigo-500 pl-2.5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-[#1f293d] space-y-1.5">
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0b0f17]/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] border-r border-[#1f293d] lg:hidden transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-[#1f293d]">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-white">Organizer Admin</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-[#1f293d]">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              handleExportXlsx();
            }}
            disabled={exporting}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-2"
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
              <a
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? 'bg-[#1a2338] text-white border-l-2 border-indigo-500 pl-2.5' : 'text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>

        <div className="p-3 mt-auto border-t border-[#1f293d] space-y-1.5">
          <button
            onClick={() => {
              setMobileOpen(false);
              setPasswordModalOpen(true);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/50"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-[#111827] border-b border-[#1f293d] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-300 hover:text-white p-1.5 rounded-lg bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Logged in:</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                {adminUser ? adminUser.name : 'Organizer Admin'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Realtime status */}
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-slate-300 font-medium text-[11px]">
                {isConnected ? 'Realtime Connected' : 'Reconnecting...'}
              </span>
            </div>

            {/* Header Export Button */}
            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={exporting}
              className="hidden sm:flex items-center space-x-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Result</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Admin Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/80 backdrop-blur-xs">
          <div className="w-full max-w-md card-panel rounded-xl p-5 border border-[#1f293d] shadow-2xl relative">
            <button
              onClick={() => {
                setPasswordModalOpen(false);
                setPasswordMsg(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Change Account Password</h2>
                <p className="text-xs text-slate-400">Update your Admin login password</p>
              </div>
            </div>

            {passwordMsg && (
              <div
                className={`mb-4 p-3 rounded-lg border text-xs font-medium flex items-center space-x-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <span>⚠️</span>
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full input-field rounded-lg py-2.5 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-[#1f293d]">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPasswordMsg(null);
                  }}
                  className="px-3.5 py-2 btn-secondary text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="py-2 px-4 btn-primary text-xs font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  {passwordSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
