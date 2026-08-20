'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  Flame,
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
        <div className="relative">
          <div className="w-12 h-12 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md" />
        </div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-4">
          Synchronizing Live Event Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Live Executive Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>LIVE</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time evaluation statistics, venue progress metrics & top team rankings
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 sm:px-3.5 sm:py-2 rounded-xl luxury-btn-secondary text-slate-300 hover:text-white flex items-center space-x-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <button
            onClick={handleExportXlsx}
            disabled={exporting}
            className="py-2 px-4 rounded-xl luxury-btn-gold text-white font-bold text-xs flex items-center space-x-2 shadow-lg"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Standings (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* HERO METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Teams Card */}
        <div className="luxury-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Enrolled Teams
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight font-display">
            {heroMetrics?.totalTeams ?? 0}
          </div>
          <div className="mt-3 flex items-center text-[11px] text-slate-400 font-medium space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Distributed across all venue halls</span>
          </div>
        </div>

        {/* Completed Teams Card */}
        <div className="luxury-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Completed Evaluations
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-emerald-400 tracking-tight font-display">
            {heroMetrics?.completedTeams ?? 0}
          </div>
          <div className="mt-3 flex items-center text-[11px] text-emerald-400/80 font-medium space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>All assigned rubric scores submitted</span>
          </div>
        </div>

        {/* Pending Teams Card */}
        <div className="luxury-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Awaiting Evaluation
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-amber-400 tracking-tight font-display">
            {heroMetrics?.pendingTeams ?? 0}
          </div>
          <div className="mt-3 flex items-center text-[11px] text-amber-400/80 font-medium space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Currently in progress by juries</span>
          </div>
        </div>
      </div>

      {/* VENUE PROGRESS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center space-x-2.5 font-display">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Venue Progression Telemetry</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Real-time room occupancy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {venueProgress.map((v) => (
            <div key={v.id} className="luxury-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">{v.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hall Capacity: <strong className="text-slate-200">{v.capacity} Teams</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-indigo-300 font-display">
                    {v.completionPercentage}%
                  </span>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Completed
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/[0.08] shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-sm shadow-indigo-500/50"
                  style={{ width: `${Math.min(v.completionPercentage, 100)}%` }}
                />
              </div>

              {/* Metrics pill row */}
              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center text-xs">
                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Assigned</span>
                  <span className="font-bold text-white font-mono mt-0.5">{v.totalAssigned} Teams</span>
                </div>
                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Evaluated</span>
                  <span className="font-bold text-emerald-400 font-mono mt-0.5">{v.evaluated} Teams</span>
                </div>
                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Pending</span>
                  <span className="font-bold text-amber-400 font-mono mt-0.5">{v.pending} Teams</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP 10 LEADERBOARD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-display">
              Top 10 Live Leaderboard
            </h2>
          </div>
          <Link
            href="/admin/leaderboard"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 transition-all hover:bg-indigo-500/20"
          >
            <span>View Full Standings</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="luxury-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-5 text-center w-20">Rank</th>
                  <th className="py-4 px-5">Team Number</th>
                  <th className="py-4 px-5">Team Name</th>
                  <th className="py-4 px-5">Venue</th>
                  <th className="py-4 px-5">Problem Statement</th>
                  <th className="py-4 px-5 text-right">Final Average Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {top10Leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-medium">
                      No finalized evaluations submitted yet. Standings will populate live in real-time.
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
                        className={`hover:bg-white/[0.03] transition-colors ${
                          isGold ? 'bg-amber-500/[0.04]' : isSilver ? 'bg-slate-300/[0.03]' : isBronze ? 'bg-amber-700/[0.03]' : ''
                        }`}
                      >
                        <td className="py-4 px-5 text-center font-bold">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold shadow-md ${
                              isGold
                                ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-black shadow-amber-500/40 ring-2 ring-amber-300/40'
                                : isSilver
                                ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black shadow-slate-400/30'
                                : isBronze
                                ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-amber-800/30'
                                : 'bg-white/[0.05] text-slate-300 border border-white/[0.08]'
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono font-bold text-indigo-300">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {item.teamNumber}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-bold text-white text-base">
                          {item.teamName}
                        </td>
                        <td className="py-4 px-5 text-slate-300">{item.venueName}</td>
                        <td className="py-4 px-5 text-slate-400 font-mono text-xs">
                          {item.problemCode}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className="inline-block px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-200 border border-indigo-500/30 font-mono font-extrabold text-sm shadow-inner">
                            {item.finalScore.toFixed(2)} <span className="text-slate-500 text-xs font-normal">/ 100</span>
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
