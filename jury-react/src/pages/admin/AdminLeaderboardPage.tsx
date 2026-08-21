import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface LeaderboardRow {
  rank: number | null;
  id: string;
  teamNumber: string;
  teamName: string;
  venueName: string;
  problemCode: string;
  problemTitle: string;
  finalScore: number | null;
  status: 'COMPLETED' | 'PENDING';
  juryEvaluationsCount?: number;
}

export default function AdminLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboardData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [teamsSnap, venuesSnap, psSnap, evalSnap, assignmentsSnap] = await Promise.all([
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'venues')),
        getDocs(collection(db, 'problemStatements')),
        getDocs(collection(db, 'evaluations')),
        getDocs(collection(db, 'juryTeamAssignments')),
      ]);

      const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const problemStatements = psSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const evaluations = evalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      let completed = 0;
      let pending = 0;

      const rows: LeaderboardRow[] = teams.map((team) => {
        const venue = venues.find(v => v.id === team.venueId);
        const ps = problemStatements.find(p => p.id === team.problemStatementId);
        
        const teamAssignments = assignments.filter(a => a.teamId === team.id);
        const teamEvaluations = evaluations.filter(e => e.teamId === team.id && e.status === 'SUBMITTED');
        
        let status: 'COMPLETED' | 'PENDING' = 'PENDING';
        let finalScore: number | null = null;
        
        if (teamAssignments.length > 0 && teamEvaluations.length >= teamAssignments.length) {
          status = 'COMPLETED';
          completed++;
        } else {
          pending++;
        }

        if (teamEvaluations.length > 0) {
          const totalScore = teamEvaluations.reduce((sum, ev) => sum + (ev.totalScore || 0), 0);
          finalScore = totalScore / teamEvaluations.length;
        }

        return {
          rank: null, // Will be set after sorting
          id: team.id,
          teamNumber: team.teamNumber || team.id,
          teamName: team.teamName || team.name || 'Unnamed',
          venueName: venue?.name || 'Unknown',
          problemCode: ps?.code || '-',
          problemTitle: ps?.title || 'No Problem Statement',
          finalScore,
          status,
          juryEvaluationsCount: teamEvaluations.length,
        };
      });

      // Sort by final score descending
      rows.sort((a, b) => {
        const scoreA = a.finalScore ?? -1;
        const scoreB = b.finalScore ?? -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.teamNumber.localeCompare(b.teamNumber);
      });

      // Assign ranks only to completed teams with a score
      let currentRank = 1;
      rows.forEach(row => {
        if (row.finalScore !== null) {
          row.rank = currentRank++;
        }
      });

      setLeaderboard(rows);
      setCompletedCount(completed);
      setPendingCount(pending);

    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Official Leaderboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Real-time official standings calculated dynamically across all panels
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchLeaderboardData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white text-xs font-semibold flex items-center space-x-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Standings</span>
        </button>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Ranked Teams: <strong className="text-white font-mono">{completedCount}</strong></span>
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-center space-x-2 shadow-sm">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Pending Teams: <strong className="text-white font-mono">{pendingCount}</strong></span>
        </div>
      </div>

      {/* LEADERBOARD TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-[3px] border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Calculating Official Rankings...
          </p>
        </div>
      ) : (
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-5 text-center w-24">Rank</th>
                  <th className="py-4 px-5">Team Number</th>
                  <th className="py-4 px-5">Team Name</th>
                  <th className="py-4 px-5">Venue</th>
                  <th className="py-4 px-5">Problem Statement</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Final Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs font-medium">
                      No team evaluation records found.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((item) => {
                    const isGold = item.rank === 1;
                    const isSilver = item.rank === 2;
                    const isBronze = item.rank === 3;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-white/[0.03] transition-colors ${
                          isGold ? 'bg-amber-500/[0.05]' : isSilver ? 'bg-slate-300/[0.03]' : isBronze ? 'bg-amber-700/[0.03]' : ''
                        }`}
                      >
                        <td className="py-4 px-5 text-center font-bold">
                          {item.rank !== null ? (
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
                          ) : (
                            <span className="text-slate-600 font-mono text-xs">—</span>
                          )}
                        </td>

                        <td className="py-4 px-5 font-mono font-bold text-indigo-300">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {item.teamNumber}
                          </span>
                        </td>

                        <td className="py-4 px-5 font-bold text-white text-base">
                          {item.teamName}
                        </td>

                        <td className="py-4 px-5 text-slate-300 font-medium">{item.venueName}</td>

                        <td className="py-4 px-5 text-slate-400">
                          <span className="font-mono text-xs font-bold text-slate-300 mr-2">
                            {item.problemCode}
                          </span>
                          <span className="text-xs truncate max-w-[220px] inline-block align-bottom text-slate-400">
                            {item.problemTitle}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                              item.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                            />
                            <span>{item.status === 'COMPLETED' ? 'Completed' : 'Pending'}</span>
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          {item.finalScore !== null ? (
                            <span className="inline-block px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-200 border border-indigo-500/30 font-mono font-extrabold text-base shadow-inner">
                              {item.finalScore.toFixed(2)} <span className="text-slate-500 text-xs font-normal">/ 100</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
