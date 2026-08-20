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
  Trophy,
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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Loading Scoring Matrix...
        </p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-sm mb-4">Team record not found.</p>
        <Link href="/admin/teams" className="text-indigo-400 font-semibold text-xs hover:underline">
          &larr; Return to Teams Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <Link
        href="/admin/teams"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Teams Directory</span>
      </Link>

      {/* TEAM DETAILS HEADER CARD */}
      <div className="luxury-panel p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center space-x-3">
            <span className="font-mono font-bold text-xs text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/25">
              {team.teamNumber}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">{team.teamName}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Venue: <strong className="text-white">{team.venue.name}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <FileCode className="w-4 h-4 text-slate-400" />
              <span>Problem: <strong className="text-white font-mono">{team.problemStatement?.code ?? 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* Final Score Summary Box */}
        <div className="luxury-card p-5 text-center md:text-right min-w-[220px]">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Official Final Score
          </span>
          <div className="font-mono font-extrabold text-3xl text-indigo-300 font-display">
            {team.finalScore !== null && team.finalScore !== undefined
              ? `${team.finalScore.toFixed(2)}`
              : '—'}
            <span className="text-xs text-slate-500 font-normal"> / 100</span>
          </div>

          <div className="mt-2.5">
            {team.status === 'COMPLETED' ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Evaluation Completed</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Scoring</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC SCORING MATRIX TABLE */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2 font-display">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Dynamic Criteria Score Matrix</span>
        </h2>

        <div className="luxury-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-5 min-w-[220px]">Evaluation Rubric</th>
                  <th className="py-4 px-5 text-center w-28">Max Marks</th>
                  {assignedJuries.map((jury, idx) => (
                    <th key={jury.id} className="py-4 px-5 text-center min-w-[130px]">
                      Jury {idx + 1}
                      <span className="block text-[10px] text-slate-400 font-normal normal-case mt-0.5">
                        ({jury.name})
                      </span>
                    </th>
                  ))}
                  <th className="py-4 px-5 text-right min-w-[120px]">Criterion Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {criteriaBreakdown.map((row) => (
                  <tr key={row.criterionId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-4 px-5 font-semibold text-slate-200">
                      {row.criterionName}
                    </td>
                    <td className="py-4 px-5 text-center font-mono font-bold text-slate-400">
                      {row.maxMarks}
                    </td>
                    {assignedJuries.map((jury) => {
                      const score = row.juryScores[jury.id];
                      return (
                        <td key={jury.id} className="py-4 px-5 text-center font-mono font-bold">
                          {score !== null && score !== undefined ? (
                            <span className="text-white bg-white/[0.05] px-3 py-1 rounded-lg border border-white/[0.08]">
                              {score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-4 px-5 text-right font-mono font-extrabold text-indigo-300">
                      {row.averageScore !== null ? row.averageScore.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}

                {/* Jury Totals Summary Row */}
                <tr className="bg-black/50 font-bold border-t-2 border-white/[0.08] text-sm">
                  <td className="py-4 px-5 text-white uppercase text-xs tracking-wider">
                    Jury Total Score
                  </td>
                  <td className="py-4 px-5 text-center font-mono text-slate-400 text-xs">
                    100
                  </td>
                  {assignedJuries.map((jury) => {
                    const totalObj = juryTotals.find((j) => j.juryId === jury.id);
                    return (
                      <td key={jury.id} className="py-4 px-5 text-center font-mono text-base text-indigo-300">
                        {totalObj && totalObj.status === 'SUBMITTED' && totalObj.totalScore !== null
                          ? totalObj.totalScore.toFixed(2)
                          : '—'}
                      </td>
                    );
                  })}
                  <td className="py-4 px-5 text-right font-mono font-extrabold text-base text-emerald-400">
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
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2 font-display">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span>Jury Feedback & Submissions</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {juryTotals.map((j) => (
            <div key={j.juryId} className="luxury-panel p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">{j.juryName}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    j.status === 'SUBMITTED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      : j.status === 'UNLOCKED'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      : 'bg-white/[0.05] text-slate-400'
                  }`}
                >
                  {j.status}
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <div>
                  Score Awarded: <strong className="text-indigo-300 font-mono text-sm">{j.totalScore !== null ? `${j.totalScore.toFixed(2)} / 100` : '—'}</strong>
                </div>
                {j.submittedAt && (
                  <div className="text-[11px] text-slate-400">
                    Submitted: {new Date(j.submittedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {j.juryComment && (
                <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] text-xs text-slate-300 italic leading-relaxed">
                  "{j.juryComment}"
                </div>
              )}

              {/* Admin Unlock Button */}
              {j.status === 'SUBMITTED' && j.evaluationId && (
                <button
                  type="button"
                  onClick={() => handleOpenUnlock(j.evaluationId!)}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs transition-all border border-amber-500/30 flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock for Revision</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* UNLOCK EVALUATION MODAL */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="luxury-panel w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center space-x-2.5 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-bold text-white font-display">Unlock Jury Evaluation</h2>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Unlocking allows the assigned jury to modify submitted grades for this team. This intervention is logged in the system audit trail.
            </p>

            {unlockError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleConfirmUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Audit Justification / Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g. Jury requested correction on rubric #2 due to typo..."
                  className="w-full luxury-input p-3 text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(false)}
                  className="px-4 py-2.5 luxury-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unlocking || !unlockReason.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-900/30"
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
