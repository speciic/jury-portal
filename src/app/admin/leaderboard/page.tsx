'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Award, Sparkles, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

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

  const { lastEvent } = useRealtime();

  const fetchLeaderboard = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetch('/api/admin/leaderboard');
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard);
      setCompletedCount(data.completedCount);
      setPendingCount(data.pendingCount);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (lastEvent) {
      fetchLeaderboard();
    }
  }, [lastEvent, fetchLeaderboard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Trophy className="w-7 h-7 text-amber-400" />
            <span>Official Hackathon Leaderboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time ranked standings calculated server-side based on jury evaluations
          </p>
        </div>

        <button
          onClick={() => fetchLeaderboard(true)}
          disabled={refreshing}
          className="self-start sm:self-auto py-2 px-3.5 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Leaderboard</span>
        </button>
      </div>

      {/* Summary Chips */}
      <div className="flex items-center space-x-4 text-xs font-semibold">
        <div className="px-3.5 py-2 rounded-xl glass-panel text-slate-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Ranked Teams: <strong className="text-white">{completedCount}</strong></span>
        </div>
        <div className="px-3.5 py-2 rounded-xl glass-panel text-slate-300 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Pending Teams: <strong className="text-white">{pendingCount}</strong></span>
        </div>
      </div>

      {/* 17. LEADERBOARD TABLE */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Calculating official rankings...
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-4 px-4 text-center w-20">Rank</th>
                  <th className="py-4 px-4">Team Number</th>
                  <th className="py-4 px-4">Team Name</th>
                  <th className="py-4 px-4">Venue</th>
                  <th className="py-4 px-4">Problem Statement</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Final Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.map((item) => {
                  const isGold = item.rank === 1;
                  const isSilver = item.rank === 2;
                  const isBronze = item.rank === 3;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isGold ? 'bg-amber-500/5' : isSilver ? 'bg-slate-300/5' : isBronze ? 'bg-amber-700/5' : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-center font-bold">
                        {item.rank !== null ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold ${
                              isGold
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                                : isSilver
                                ? 'bg-slate-300 text-slate-950'
                                : isBronze
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{item.rank}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono font-extrabold text-indigo-400">
                        {item.teamNumber}
                      </td>

                      <td className="py-4 px-4 font-bold text-white text-base">
                        {item.teamName}
                      </td>

                      <td className="py-4 px-4 text-slate-300">{item.venueName}</td>

                      <td className="py-4 px-4 text-slate-400">
                        <span className="font-mono text-xs font-semibold text-slate-300 mr-2">
                          {item.problemCode}
                        </span>
                        <span className="text-xs truncate max-w-[200px] inline-block align-bottom">
                          {item.problemTitle}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        {item.finalScore !== null ? (
                          <span className="inline-block px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-extrabold text-base">
                            {item.finalScore.toFixed(2)} / 100
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
