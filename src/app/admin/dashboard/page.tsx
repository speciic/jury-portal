'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Trophy,
  Building2,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface HeroMetrics {
  totalTeams: number;
  completedTeams: number;
  pendingTeams: number;
}

interface VenueProgress {
  id: string;
  name: string;
  capacity: number;
  totalAssigned: number;
  evaluated: number;
  pending: number;
  completionPercentage: number;
}

interface LeaderboardItem {
  rank: number;
  id: string;
  teamNumber: string;
  teamName: string;
  venueName: string;
  problemCode: string;
  finalScore: number;
}

export default function AdminDashboardPage() {
  const [heroMetrics, setHeroMetrics] = useState<HeroMetrics | null>(null);
  const [venueProgress, setVenueProgress] = useState<VenueProgress[]>([]);
  const [top10Leaderboard, setTop10Leaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { lastEvent } = useRealtime();

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const data = await res.json();
      setHeroMetrics(data.heroMetrics);
      setVenueProgress(data.venueProgress);
      setTop10Leaderboard(data.top10Leaderboard);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Re-fetch automatically when any relevant realtime SSE event is received!
  useEffect(() => {
    if (lastEvent) {
      fetchDashboardData();
    }
  }, [lastEvent, fetchDashboardData]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">Loading live hackathon dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Organizer Live Dashboard</span>
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time evaluation statistics, venue progress & live top rankings
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center space-x-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Prominent Download Result Sheet Button */}
          <button
            onClick={handleExportXlsx}
            disabled={exporting}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 border border-emerald-400/30 flex items-center space-x-2"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Result Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 7.1 HERO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Teams Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Teams
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight">
            {heroMetrics?.totalTeams ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
            <span>Enrolled across all venues</span>
          </p>
        </div>

        {/* Completed Teams Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Completed Teams
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-emerald-400 tracking-tight">
            {heroMetrics?.completedTeams ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            All required jury evaluations submitted
          </p>
        </div>

        {/* Pending Teams Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Teams
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-amber-400 tracking-tight">
            {heroMetrics?.pendingTeams ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Awaiting full jury scoring
          </p>
        </div>
      </div>

      {/* 8. DASHBOARD VENUE PROGRESS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Venue Progress Metrics</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Real-time venue tracking</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venueProgress.map((v) => (
            <div key={v.id} className="glass-panel p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">{v.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Capacity: {v.capacity} Teams
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-indigo-300">
                    {v.completionPercentage}%
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">Completed</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(v.completionPercentage, 100)}%` }}
                />
              </div>

              {/* Metrics pill row */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="block text-slate-400 text-[10px]">Assigned</span>
                  <span className="font-bold text-slate-200">{v.totalAssigned} Teams</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="block text-slate-400 text-[10px]">Evaluated</span>
                  <span className="font-bold text-emerald-400">{v.evaluated} Teams</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="block text-slate-400 text-[10px]">Pending</span>
                  <span className="font-bold text-amber-400">{v.pending} Teams</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 9. DASHBOARD TOP 10 LEADERBOARD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Top 10 Live Leaderboard
            </h2>
          </div>
          <a
            href="/admin/leaderboard"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
          >
            <span>View Full Standings</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Team Number</th>
                  <th className="py-3.5 px-4">Team Name</th>
                  <th className="py-3.5 px-4">Venue</th>
                  <th className="py-3.5 px-4">Problem</th>
                  <th className="py-3.5 px-4 text-right">Final Average Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {top10Leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No completed evaluations yet. Standings will populate live once jury evaluations are submitted.
                    </td>
                  </tr>
                ) : (
                  top10Leaderboard.map((item) => {
                    const isGold = item.rank === 1;
                    const isSilver = item.rank === 2;
                    const isBronze = item.rank === 3;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4 text-center font-bold">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              isGold
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                                : isSilver
                                ? 'bg-slate-300 text-slate-950'
                                : isBronze
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                          {item.teamNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {item.teamName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{item.venueName}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                          {item.problemCode}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-block px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-extrabold text-sm">
                            {item.finalScore.toFixed(2)} / 100
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
