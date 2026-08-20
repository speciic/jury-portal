'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  FileCode,
  Send,
  HelpCircle,
} from 'lucide-react';

interface Criterion {
  id: string;
  name: string;
  maxMarks: number;
  displayOrder: number;
}

interface TeamInfo {
  id: string;
  teamNumber: string;
  teamName: string;
  venueName: string;
  problemCode: string;
  problemTitle: string;
  problemDescription: string;
}

interface ExistingEvaluation {
  id: string;
  status: 'SUBMITTED' | 'UNLOCKED';
  totalScore: number;
  juryComment: string | null;
  submittedAt: string;
  scores: { criterionId: string; score: number }[];
}

export default function JuryEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [maxTotalPossibleMarks, setMaxTotalPossibleMarks] = useState(100);
  const [existingEvaluation, setExistingEvaluation] = useState<ExistingEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Marks state: { [criterionId]: string }
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [juryComment, setJuryComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    async function loadTeamData() {
      try {
        const res = await fetch(`/api/jury/teams/${teamId}`);
        if (!res.ok) {
          if (res.status === 403) {
            setError('Forbidden: You are not assigned to evaluate this team.');
          } else {
            setError('Failed to load evaluation data.');
          }
          return;
        }

        const data = await res.json();
        setTeam(data.team);
        setCriteria(data.criteria);
        setMaxTotalPossibleMarks(data.maxTotalPossibleMarks);

        if (data.existingEvaluation) {
          setExistingEvaluation(data.existingEvaluation);
          setJuryComment(data.existingEvaluation.juryComment || '');
          const initialMarks: Record<string, string> = {};
          data.existingEvaluation.scores.forEach((s: { criterionId: string; score: number }) => {
            initialMarks[s.criterionId] = s.score.toString();
          });
          setMarks(initialMarks);
        } else {
          // Initialize empty marks
          const initialMarks: Record<string, string> = {};
          data.criteria.forEach((c: Criterion) => {
            initialMarks[c.id] = '';
          });
          setMarks(initialMarks);
        }
      } catch (err) {
        console.error('Error fetching evaluation form:', err);
        setError('Error loading team details');
      } finally {
        setLoading(false);
      }
    }
    loadTeamData();
  }, [teamId]);

  // Is Form Locked?
  const isLocked = existingEvaluation?.status === 'SUBMITTED';

  // Live Running Total Calculation
  const runningTotal = useMemo(() => {
    let total = 0;
    Object.values(marks).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) {
        total += num;
      }
    });
    return Math.round(total * 100) / 100;
  }, [marks]);

  const handleMarkChange = (critId: string, maxMarks: number, value: string) => {
    if (isLocked) return;

    // Allow empty string for backspacing
    if (value === '') {
      setMarks((prev) => ({ ...prev, [critId]: '' }));
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num < 0 || num > maxMarks) {
        // Enforce max bounds
        return;
      }
      setMarks((prev) => ({ ...prev, [critId]: value }));
    }
  };

  const handleValidateBeforeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check all criteria filled
    for (const c of criteria) {
      const val = marks[c.id];
      if (val === undefined || val === null || val === '') {
        setError(`Please enter marks for "${c.name}"`);
        return;
      }
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > c.maxMarks) {
        setError(`Invalid mark for "${c.name}". Must be between 0 and ${c.maxMarks}`);
        return;
      }
    }

    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmModalOpen(false);
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/jury/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          scores: marks,
          juryComment,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      // Refresh page state to show locked view
      router.push('/jury/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Loading Evaluation Rubric...
        </p>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="luxury-panel p-8 text-center space-y-4 border border-rose-500/30">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-rose-300 text-sm font-semibold">{error}</p>
        <Link href="/jury/dashboard" className="inline-block text-xs font-bold text-cyan-400 hover:underline">
          &larr; Return to Evaluator Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Back Button */}
      <Link
        href="/jury/dashboard"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Assigned Teams Roster</span>
      </Link>

      {/* TEAM CONTEXT HEADER */}
      {team && (
        <div className="luxury-panel p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3">
                <span className="font-mono font-bold text-xs text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/25">
                  {team.teamNumber}
                </span>
                <h1 className="text-2xl font-extrabold text-white font-display">{team.teamName}</h1>
              </div>
              <div className="text-xs text-slate-300 flex items-center space-x-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Venue: <strong className="text-white">{team.venueName}</strong></span>
              </div>
            </div>

            {/* Locked Status Badge */}
            {isLocked ? (
              <div className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-bold text-xs flex items-center space-x-2 shadow-sm">
                <Lock className="w-4 h-4" />
                <span>Status: Submitted & Locked</span>
              </div>
            ) : (
              <div className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold text-xs flex items-center space-x-2 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span>Status: Evaluation In Progress</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.08] text-xs text-slate-300 space-y-1.5">
            <div className="font-semibold text-white flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>{team.problemCode}: {team.problemTitle}</span>
            </div>
            {team.problemDescription && (
              <p className="text-slate-400 text-xs leading-relaxed pl-6">
                {team.problemDescription}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* DYNAMIC TOUCH-FRIENDLY CRITERIA GRADING FORM */}
      <form onSubmit={handleValidateBeforeSubmit} className="space-y-4">
        {criteria.map((c, index) => (
          <div
            key={c.id}
            className="luxury-panel p-6 space-y-3 focus-within:border-cyan-500/50 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rubric Criterion #{index + 1}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{c.name}</h3>
              </div>
              <span className="shrink-0 px-3 py-1 rounded-xl bg-black/40 text-cyan-300 font-mono font-bold text-xs border border-white/[0.08]">
                Max: {c.maxMarks} pts
              </span>
            </div>

            {/* Numeric Grade Input */}
            <div>
              <input
                type="number"
                step="0.5"
                min="0"
                max={c.maxMarks}
                disabled={isLocked}
                value={marks[c.id] ?? ''}
                onChange={(e) => handleMarkChange(c.id, c.maxMarks, e.target.value)}
                placeholder={`Enter marks (0 - ${c.maxMarks})`}
                className="w-full luxury-input py-3.5 px-4 text-xl font-mono font-bold text-white placeholder:text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        ))}

        {/* Optional Jury Comment Field */}
        <div className="luxury-panel p-6 space-y-2.5">
          <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
            Evaluation Feedback / Jury Comments (Optional)
          </label>
          <textarea
            rows={3}
            disabled={isLocked}
            value={juryComment}
            onChange={(e) => setJuryComment(e.target.value)}
            placeholder="Add constructive qualitative feedback for the team..."
            className="w-full luxury-input p-3.5 text-xs text-slate-200 placeholder:text-slate-600 disabled:opacity-60 leading-relaxed"
          />
        </div>

        {/* SUBMIT BUTTON */}
        {!isLocked && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl luxury-btn-primary font-extrabold text-base transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Final Evaluation</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* STICKY TOTAL SCORE DOCK */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080c14]/90 backdrop-blur-2xl border-t border-white/[0.08] py-3.5 px-4 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              RUNNING TOTAL
            </span>
          </div>

          <div className="font-mono font-extrabold text-2xl text-cyan-300 font-display">
            {runningTotal.toFixed(2)}
            <span className="text-xs text-slate-500 font-normal"> / {maxTotalPossibleMarks}</span>
          </div>
        </div>
      </div>

      {/* CONFIRMATION PROMPT MODAL */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="luxury-panel w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-cyan-400">
              <HelpCircle className="w-7 h-7" />
              <h2 className="text-lg font-extrabold text-white font-display">Confirm Score Submission</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to finalize and lock this evaluation? Once submitted, grades cannot be modified without administrator intervention.
            </p>

            <div className="bg-black/40 p-4 rounded-xl border border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Calculated Total Marks:</span>
              <span className="font-mono font-extrabold text-lg text-cyan-300">
                {runningTotal.toFixed(2)} / {maxTotalPossibleMarks}
              </span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2.5 luxury-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="px-5 py-2.5 luxury-btn-primary text-xs font-bold"
              >
                {submitting ? 'Submitting...' : 'Yes, Finalize & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
