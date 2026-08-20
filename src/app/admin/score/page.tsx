'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Sliders, Plus, Edit2, Check, X, Search, Sparkles, Award } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface CriterionItem {
  id: string;
  version: number;
  name: string;
  maxMarks: number;
  displayOrder: number;
  active: boolean;
}

interface TeamScoreSearchItem {
  id: string;
  teamNumber: string;
  teamName: string;
  status: string;
  finalScore: number | null;
  venue: { name: string };
}

export default function AdminScorePage() {
  const [criteria, setCriteria] = useState<CriterionItem[]>([]);
  const [totalMaxMarks, setTotalMaxMarks] = useState(0);
  const [loadingCriteria, setLoadingCriteria] = useState(true);

  // Criteria Add / Edit Form State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeCritId, setActiveCritId] = useState<string | null>(null);

  const [critName, setCritName] = useState('');
  const [critMaxMarks, setCritMaxMarks] = useState('15');
  const [critDisplayOrder, setCritDisplayOrder] = useState('1');
  const [critActive, setCritActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Team Score Search State
  const [teamSearch, setTeamSearch] = useState('');
  const [teams, setTeams] = useState<TeamScoreSearchItem[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const { lastEvent } = useRealtime();

  const fetchCriteria = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/criteria');
      if (!res.ok) throw new Error('Failed to fetch criteria');
      const data = await res.json();
      setCriteria(data.criteria);
      setTotalMaxMarks(data.totalMaxMarks);
    } catch (err) {
      console.error('Error loading criteria:', err);
    } finally {
      setLoadingCriteria(false);
    }
  }, []);

  const searchTeams = useCallback(async () => {
    if (!teamSearch.trim()) {
      setTeams([]);
      return;
    }
    setLoadingTeams(true);
    try {
      const res = await fetch(`/api/admin/teams?q=${encodeURIComponent(teamSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams);
      }
    } catch (err) {
      console.error('Error searching teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  }, [teamSearch]);

  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  useEffect(() => {
    searchTeams();
  }, [searchTeams]);

  useEffect(() => {
    if (lastEvent) {
      fetchCriteria();
    }
  }, [lastEvent, fetchCriteria]);

  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: critName,
          maxMarks: parseFloat(critMaxMarks),
          displayOrder: parseInt(critDisplayOrder, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add criterion');

      setAddModalOpen(false);
      setCritName('');
      setCritMaxMarks('15');
      fetchCriteria();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Creation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (c: CriterionItem) => {
    setActiveCritId(c.id);
    setCritName(c.name);
    setCritMaxMarks(c.maxMarks.toString());
    setCritDisplayOrder(c.displayOrder.toString());
    setCritActive(c.active);
    setError('');
    setEditModalOpen(true);
  };

  const handleEditCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCritId) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeCritId,
          name: critName,
          maxMarks: parseFloat(critMaxMarks),
          displayOrder: parseInt(critDisplayOrder, 10),
          active: critActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update criterion');

      setEditModalOpen(false);
      fetchCriteria();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Update failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCriterionActive = async (c: CriterionItem) => {
    try {
      await fetch('/api/admin/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          active: !c.active,
        }),
      });
      fetchCriteria();
    } catch (err) {
      console.error('Failed to toggle active state:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <Sliders className="w-7 h-7 text-indigo-400" />
          <span>Score Criteria & Evaluation Setup</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure evaluation criteria, maximum mark limits, active status, and search team scores
        </p>
      </div>

      {/* 26. CRITERIA MANAGEMENT SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold text-white">Active Scoring Rubric</h2>
            <div className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-extrabold text-xs">
              Total Max Marks: {totalMaxMarks} / 100
            </div>
          </div>

          <button
            onClick={() => {
              setError('');
              setCritName('');
              setCritMaxMarks('15');
              setCritDisplayOrder((criteria.length + 1).toString());
              setAddModalOpen(true);
            }}
            className="py-2 px-3.5 rounded-xl bg-gradient-primary hover:opacity-95 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Criterion</span>
          </button>
        </div>

        {loadingCriteria ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading criteria...</div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">Order</th>
                  <th className="py-3.5 px-4">Criterion Name</th>
                  <th className="py-3.5 px-4 text-center">Max Marks</th>
                  <th className="py-3.5 px-4 text-center">Snapshot Version</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {criteria.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      #{c.displayOrder}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{c.name}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-indigo-300">
                      {c.maxMarks}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      v{c.version}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCriterionActive(c)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {c.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 28. SCORE SEARCH SECTION */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <Search className="w-5 h-5 text-indigo-400" />
          <span>Team Score Search & Breakdown</span>
        </h2>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="Type team number or name to view detailed marks..."
            className="w-full glass-input rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm placeholder:text-slate-500"
          />
        </div>

        {/* Search Results */}
        {loadingTeams ? (
          <div className="py-4 text-slate-400 text-xs">Searching teams...</div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {teams.map((t) => (
              <div key={t.id} className="glass-panel p-5 rounded-2xl space-y-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-400">{t.teamNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white">{t.teamName}</h3>
                <div className="text-xs text-slate-400">Venue: {t.venue.name}</div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400">Final Average:</span>
                  <span className="font-mono font-extrabold text-sm text-indigo-300">
                    {t.finalScore !== null ? `${t.finalScore.toFixed(2)} / 100` : '—'}
                  </span>
                </div>
                <Link
                  href={`/admin/teams/${t.id}`}
                  className="block w-full text-center py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
                >
                  View Complete Score Breakdown
                </Link>
              </div>
            ))}
          </div>
        ) : teamSearch.trim() ? (
          <div className="py-4 text-slate-500 text-xs">No matching teams found.</div>
        ) : null}
      </div>

      {/* ADD CRITERION MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Add Scoring Criterion</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddCriterion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Criterion Name
                </label>
                <input
                  type="text"
                  required
                  value={critName}
                  onChange={(e) => setCritName(e.target.value)}
                  placeholder="e.g. Technical Approach & Code Quality"
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Maximum Marks
                </label>
                <input
                  type="number"
                  required
                  step="0.5"
                  min="1"
                  max="100"
                  value={critMaxMarks}
                  onChange={(e) => setCritMaxMarks(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  required
                  value={critDisplayOrder}
                  onChange={(e) => setCritDisplayOrder(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-primary hover:opacity-95 text-white font-bold text-xs"
                >
                  {submitting ? 'Creating...' : 'Add Criterion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CRITERION MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Edit Criterion</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditCriterion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Criterion Name
                </label>
                <input
                  type="text"
                  required
                  value={critName}
                  onChange={(e) => setCritName(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Maximum Marks
                </label>
                <input
                  type="number"
                  required
                  step="0.5"
                  min="1"
                  max="100"
                  value={critMaxMarks}
                  onChange={(e) => setCritMaxMarks(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  required
                  value={critDisplayOrder}
                  onChange={(e) => setCritDisplayOrder(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="critActiveCheck"
                  checked={critActive}
                  onChange={(e) => setCritActive(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="critActiveCheck" className="text-xs font-semibold text-slate-300">
                  Criterion Active
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-primary hover:opacity-95 text-white font-bold text-xs"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
