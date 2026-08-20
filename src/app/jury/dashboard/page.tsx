'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Building2, CheckCircle2, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface AssignedTeam {
  id: string;
  teamNumber: string;
  teamName: string;
  venueName: string;
  problemCode: string;
  problemTitle: string;
  evaluationStatus: 'PENDING' | 'SUBMITTED' | 'UNLOCKED';
  totalScore: number | null;
}

interface JuryInfo {
  id: string;
  name: string;
  username: string;
  venueName: string;
}

export default function JuryDashboardPage() {
  const [juryInfo, setJuryInfo] = useState<JuryInfo | null>(null);
  const [teams, setTeams] = useState<AssignedTeam[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { lastEvent } = useRealtime();

  const fetchJuryData = useCallback(async () => {
    try {
      const res = await fetch(`/api/jury/teams?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to load assigned teams');
      const data = await res.json();
      setJuryInfo(data.jury);
      setTeams(data.teams);
    } catch (err) {
      console.error('Error fetching jury dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchJuryData();
  }, [fetchJuryData]);

  useEffect(() => {
    if (lastEvent) {
      fetchJuryData();
    }
  }, [lastEvent, fetchJuryData]);

  const completedCount = teams.filter((t) => t.evaluationStatus === 'SUBMITTED').length;
  const pendingCount = teams.length - completedCount;

  return (
    <div className="space-y-6">
      {/* 31. WELCOME BANNER & VENUE BADGE */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Welcome, {juryInfo ? juryInfo.name : 'Jury Evaluator'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select an assigned team below to enter evaluation scores
            </p>
          </div>

          <div className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2 text-xs">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Assigned Venue:</span>
            <strong className="text-white font-bold">{juryInfo?.venueName ?? 'Loading...'}</strong>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="block text-slate-400 text-[10px]">Total Assigned</span>
            <span className="font-extrabold text-white text-base">{teams.length}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="block text-slate-400 text-[10px]">Evaluated</span>
            <span className="font-extrabold text-emerald-400 text-base">{completedCount}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
            <span className="block text-slate-400 text-[10px]">Pending</span>
            <span className="font-extrabold text-amber-400 text-base">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* 32. PROMINENT TEAM SEARCH BOX */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team by team number (e.g. HACK042)..."
          className="w-full glass-input rounded-2xl py-3.5 pl-12 pr-4 text-sm placeholder:text-slate-500 font-medium"
        />
      </div>

      {/* ASSIGNED TEAMS GRID */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading assigned teams...
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
          No assigned teams found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => {
            const isCompleted = team.evaluationStatus === 'SUBMITTED';

            return (
              <div
                key={team.id}
                className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all border border-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-extrabold text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                      {team.teamNumber}
                    </span>
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Submitted ({team.totalScore?.toFixed(1)})</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white">{team.teamName}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Problem: {team.problemCode} - {team.problemTitle}
                  </p>
                </div>

                <Link
                  href={`/jury/evaluate/${team.id}`}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md ${
                    isCompleted
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-gradient-accent hover:opacity-95 text-white shadow-cyan-500/20'
                  }`}
                >
                  <span>{isCompleted ? 'View / Inspect Submission' : 'Evaluate Team'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
