import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  Trophy,
  Building2,
  FileSpreadsheet,
  RefreshCw,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

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

export default function AdminDashboard() {
  const [heroMetrics, setHeroMetrics] = useState<HeroMetrics | null>(null);
  const [venueProgress, setVenueProgress] = useState<VenueProgress[]>([]);
  const [top10Leaderboard, setTop10Leaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);

      // Fetch all data from Firestore directly
      const [teamsSnap, venuesSnap, evaluationsSnap, assignmentsSnap] = await Promise.all([
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'venues')),
        getDocs(collection(db, 'evaluations')),
        getDocs(collection(db, 'juryTeamAssignments')),
      ]);

      const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const venues = venuesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const evaluations = evaluationsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const assignments = assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Hero Metrics
      const submittedEvals = evaluations.filter(e => e.status === 'SUBMITTED');
      const teamsWithCompleteEvals = new Set<string>();
      
      teams.forEach(team => {
        const teamAssignments = assignments.filter(a => a.teamId === team.id);
        const teamEvals = submittedEvals.filter(e => e.teamId === team.id);
        if (teamAssignments.length > 0 && teamEvals.length >= teamAssignments.length) {
          teamsWithCompleteEvals.add(team.id);
        }
      });

      setHeroMetrics({
        totalTeams: teams.length,
        completedTeams: teamsWithCompleteEvals.size,
        pendingTeams: teams.length - teamsWithCompleteEvals.size,
      });

      // Venue Progress
      const venueProgressData: VenueProgress[] = venues.map(venue => {
        const venueTeams = teams.filter(t => t.venueId === venue.id);
        const venueTeamIds = new Set(venueTeams.map(t => t.id));
        const venueEvals = submittedEvals.filter(e => venueTeamIds.has(e.teamId));
        const venueAssignments = assignments.filter(a => venueTeamIds.has(a.teamId));

        const evaluated = new Set(venueEvals.map(e => e.teamId)).size;
        const totalAssigned = venueTeams.length;
        const pending = totalAssigned - evaluated;
        const completionPercentage = totalAssigned > 0 ? Math.round((evaluated / totalAssigned) * 100) : 0;

        return {
          id: venue.id,
          name: venue.name,
          capacity: venue.capacity || totalAssigned,
          totalAssigned,
          evaluated,
          pending: Math.max(0, pending),
          completionPercentage,
        };
      });

      setVenueProgress(venueProgressData);

      // Top 10 Leaderboard
      const teamScores: LeaderboardItem[] = [];
      teams.forEach(team => {
        const teamEvals = submittedEvals.filter(e => e.teamId === team.id);
        if (teamEvals.length > 0) {
          const totalScore = teamEvals.reduce((sum, e) => sum + (e.totalScore || 0), 0);
          const avgScore = totalScore / teamEvals.length;
          const venue = venues.find(v => v.id === team.venueId);

          teamScores.push({
            rank: 0,
            id: team.id,
            teamNumber: team.teamNumber || team.id,
            teamName: team.name || 'Unnamed',
            venueName: venue?.name || 'Unknown',
            problemCode: team.problemStatement || team.problemCode || '-',
            finalScore: avgScore,
          });
        }
      });

      teamScores.sort((a, b) => b.finalScore - a.finalScore);
      teamScores.forEach((item, idx) => { item.rank = idx + 1; });

      setTop10Leaderboard(teamScores.slice(0, 10));
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

  const handleExportXlsx = async () => {
    alert("Export will be connected to Cloud Functions once deployed.");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-4">
          Synchronizing Live Event Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 bg-[#0a0a0a] min-h-screen text-white p-6 sm:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Live Executive Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>LIVE</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time evaluation statistics, venue progress & top team rankings
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 flex items-center space-x-2 text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportXlsx}
            disabled={exporting}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* HERO METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Teams */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Teams</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white">{heroMetrics?.totalTeams ?? 0}</div>
          <div className="mt-3 flex items-center text-[11px] text-slate-400 font-medium space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Distributed across all venues</span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-emerald-400">{heroMetrics?.completedTeams ?? 0}</div>
          <div className="mt-3 flex items-center text-[11px] text-emerald-400/80 font-medium space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>All rubric scores submitted</span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-amber-400">{heroMetrics?.pendingTeams ?? 0}</div>
          <div className="mt-3 flex items-center text-[11px] text-amber-400/80 font-medium space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Currently in progress</span>
          </div>
        </div>
      </div>

      {/* VENUE PROGRESS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Venue Progression</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {venueProgress.length === 0 ? (
            <div className="col-span-2 text-center text-slate-500 py-12 text-sm">No venues found in database.</div>
          ) : venueProgress.map((v) => (
            <div key={v.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">{v.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Capacity: <strong className="text-slate-200">{v.capacity} Teams</strong></p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-indigo-300">{v.completionPercentage}%</span>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Completed</p>
                </div>
              </div>
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(v.completionPercentage, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center text-xs">
                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Assigned</span>
                  <span className="font-bold text-white font-mono mt-0.5">{v.totalAssigned}</span>
                </div>
                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Evaluated</span>
                  <span className="font-bold text-emerald-400 font-mono mt-0.5">{v.evaluated}</span>
                </div>
                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Pending</span>
                  <span className="font-bold text-amber-400 font-mono mt-0.5">{v.pending}</span>
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
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Top 10 Live Leaderboard
            </h2>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-5 text-center w-20">Rank</th>
                  <th className="py-4 px-5">Team Number</th>
                  <th className="py-4 px-5">Team Name</th>
                  <th className="py-4 px-5">Venue</th>
                  <th className="py-4 px-5">Problem Statement</th>
                  <th className="py-4 px-5 text-right">Average Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {top10Leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-medium">
                      No finalized evaluations submitted yet.
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
                        <td className="py-4 px-5 font-bold text-white text-base">{item.teamName}</td>
                        <td className="py-4 px-5 text-slate-300">{item.venueName}</td>
                        <td className="py-4 px-5 text-slate-400 font-mono text-xs">{item.problemCode}</td>
                        <td className="py-4 px-5 text-right">
                          <span className="inline-block px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-200 border border-indigo-500/30 font-mono font-extrabold text-sm">
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
