'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Building2,
  FileCode,
  MessageSquare,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface TeamDetail {
  id: string;
  teamNumber: string;
  teamName: string;
  status: 'PENDING' | 'COMPLETED';
  finalScore: number | null;
  venue: { id: string; name: string; capacity: number };
  problemStatement: { id: string; code: string; title: string; description: string } | null;
}

interface AssignedJury {
  id: string;
  name: string;
  username: string;
}

interface CriteriaBreakdownRow {
  criterionId: string;
  criterionName: string;
  maxMarks: number;
  juryScores: Record<string, number | null>;
  averageScore: number | null;
}

interface JuryTotalItem {
  juryId: string;
  juryName: string;
  totalScore: number | null;
  status: 'SUBMITTED' | 'UNLOCKED' | 'PENDING';
  submittedAt: string | null;
  juryComment: string | null;
  evaluationId: string | null;
}

export default function AdminTeamDetailPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [assignedJuries, setAssignedJuries] = useState<AssignedJury[]>([]);
  const [criteriaBreakdown, setCriteriaBreakdown] = useState<CriteriaBreakdownRow[]>([]);
  const [juryTotals, setJuryTotals] = useState<JuryTotalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Unlock Modal State
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const { lastEvent } = useRealtime();

  const fetchTeamDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`);
      if (!res.ok) throw new Error('Failed to fetch team details');
      const data = await res.json();
      setTeam(data.team);
      setAssignedJuries(data.assignedJuries);
      setCriteriaBreakdown(data.criteriaBreakdown);
      setJuryTotals(data.juryTotals);
    } catch (err) {
      console.error('Error loading team details:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeamDetails();
  }, [fetchTeamDetails]);

  useEffect(() => {
    if (lastEvent) {
      fetchTeamDetails();
    }
  }, [lastEvent, fetchTeamDetails]);

  const handleOpenUnlock = (evalId: string) => {
    setSelectedEvalId(evalId);
    setUnlockReason('');
    setUnlockError('');
    setUnlockModalOpen(true);
  };

  const handleConfirmUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvalId || !unlockReason.trim()) return;
    setUnlockError('');
    setUnlocking(true);

    try {
      const res = await fetch('/api/admin/evaluations/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: selectedEvalId,
          reason: unlockReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unlock evaluation');

      setUnlockModalOpen(false);
      fetchTeamDetails();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setUnlockError(err.message);
      } else {
        setUnlockError('Unlock failed');
      }
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        Loading team evaluation breakdown...
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 text-sm mb-4">Team not found.</p>
        <Link href="/admin/teams" className="text-indigo-400 font-semibold text-xs hover:underline">
          &larr; Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/admin/teams"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Teams Management</span>
      </Link>

      {/* 14. TEAM DETAILS HEADER CARD */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="font-mono font-extrabold text-sm text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/20">
              {team.teamNumber}
            </span>
            <h1 className="text-2xl font-extrabold text-white">{team.teamName}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Venue: <strong className="text-white">{team.venue.name}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <FileCode className="w-4 h-4 text-slate-400" />
              <span>Problem: <strong className="text-white">{team.problemStatement?.code ?? 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* Final Score Summary Box */}
        <div className="glass-card p-4 rounded-xl text-center md:text-right min-w-[200px] border border-slate-800">
          <span className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Official Final Score
          </span>
          <div className="font-mono font-extrabold text-3xl text-indigo-300">
            {team.finalScore !== null && team.finalScore !== undefined
              ? `${team.finalScore.toFixed(2)}`
              : '—'}
            <span className="text-xs text-slate-500 font-normal"> / 100</span>
          </div>

          <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            {team.status === 'COMPLETED' ? (
              <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Completed
              </span>
            ) : (
              <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Pending Evaluation
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 15. DYNAMIC SCORING MATRIX TABLE */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Dynamic Criteria Score Breakdown</span>
        </h2>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 min-w-[200px]">Criteria</th>
                  <th className="py-3.5 px-4 text-center w-24">Max Marks</th>
                  {assignedJuries.map((jury, idx) => (
                    <th key={jury.id} className="py-3.5 px-4 text-center min-w-[120px]">
                      Jury {idx + 1}
                      <span className="block text-[10px] text-slate-400 font-normal normal-case">
                        ({jury.name})
                      </span>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right min-w-[110px]">Criterion Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {criteriaBreakdown.map((row) => (
                  <tr key={row.criterionId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {row.criterionName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {row.maxMarks}
                    </td>
                    {assignedJuries.map((jury) => {
                      const score = row.juryScores[jury.id];
                      return (
                        <td key={jury.id} className="py-3.5 px-4 text-center font-mono font-bold">
                          {score !== null && score !== undefined ? (
                            <span className="text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                              {score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-indigo-300">
                      {row.averageScore !== null ? row.averageScore.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}

                {/* Jury Totals Summary Row */}
                <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-800 text-sm">
                  <td className="py-4 px-4 text-white uppercase text-xs tracking-wider">
                    Jury Total Score
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-slate-400 text-xs">
                    100
                  </td>
                  {assignedJuries.map((jury) => {
                    const totalObj = juryTotals.find((j) => j.juryId === jury.id);
                    return (
                      <td key={jury.id} className="py-4 px-4 text-center font-mono text-base text-indigo-300">
                        {totalObj && totalObj.status === 'SUBMITTED' && totalObj.totalScore !== null
                          ? totalObj.totalScore.toFixed(2)
                          : '—'}
                      </td>
                    );
                  })}
                  <td className="py-4 px-4 text-right font-mono font-extrabold text-base text-emerald-400">
                    {team.finalScore !== null && team.finalScore !== undefined
                      ? team.finalScore.toFixed(2)
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* JURY COMMENTS & SUBMISSION METADATA CARDS */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span>Jury Submission Status & Comments</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {juryTotals.map((j) => (
            <div key={j.juryId} className="glass-panel p-5 rounded-2xl space-y-3 border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">{j.juryName}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    j.status === 'SUBMITTED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : j.status === 'UNLOCKED'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {j.status}
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <div>
                  Score: <strong className="text-indigo-300 font-mono">{j.totalScore !== null ? `${j.totalScore.toFixed(2)} / 100` : '—'}</strong>
                </div>
                {j.submittedAt && (
                  <div className="text-[11px] text-slate-400">
                    Submitted: {new Date(j.submittedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {j.juryComment && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 italic">
                  "{j.juryComment}"
                </div>
              )}

              {/* Admin Unlock Button */}
              {j.status === 'SUBMITTED' && j.evaluationId && (
                <button
                  type="button"
                  onClick={() => handleOpenUnlock(j.evaluationId!)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs transition-all border border-amber-500/30 flex items-center justify-center space-x-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Evaluation</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* UNLOCK EVALUATION MODAL */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800">
            <div className="flex items-center space-x-2 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-bold text-white">Unlock Jury Evaluation</h2>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Unlocking allows the jury to re-enter and edit marks for this team. This action will be recorded in audit logs.
            </p>

            {unlockError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleConfirmUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Unlocking (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g. Jury requested correction for problem statement #2 score typo"
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unlocking || !unlockReason.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                >
                  {unlocking ? 'Unlocking...' : 'Confirm Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
