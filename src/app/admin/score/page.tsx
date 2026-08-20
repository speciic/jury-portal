'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Sliders, Plus, Edit2, Search, Sparkles, Award } from 'lucide-react';
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
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Scoring Rubrics & Criteria
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Configure versioned evaluation rubrics, maximum marks & query breakdown stats
            </p>
          </div>
        </div>
      </div>

      {/* CRITERIA MANAGEMENT SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold text-white font-display">Active Rubric Criteria</h2>
            <div className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 font-mono font-extrabold text-xs shadow-inner">
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
            className="py-2.5 px-4 rounded-xl luxury-btn-primary flex items-center justify-center space-x-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rubric Criterion</span>
          </button>
        </div>

        {loadingCriteria ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-400">Loading criteria...</p>
          </div>
        ) : (
          <div className="luxury-panel overflow-hidden">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-5 w-20 text-center">Order</th>
                  <th className="py-4 px-5">Criterion Name</th>
                  <th className="py-4 px-5 text-center">Max Marks</th>
                  <th className="py-4 px-5 text-center">Snapshot Version</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {criteria.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-4 px-5 text-center font-mono font-bold text-slate-400">
                      #{c.displayOrder}
                    </td>
                    <td className="py-4 px-5 font-bold text-white text-sm">{c.name}</td>
                    <td className="py-4 px-5 text-center font-mono font-extrabold text-indigo-300 text-sm">
                      {c.maxMarks}
                    </td>
                    <td className="py-4 px-5 text-center font-mono text-slate-400 text-xs">
                      v{c.version}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCriterionActive(c)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                          c.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : 'bg-white/[0.05] text-slate-500'
                        }`}
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]"
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

      {/* SCORE SEARCH SECTION */}
      <div className="space-y-4 pt-6 border-t border-white/[0.08]">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2 font-display">
          <Search className="w-5 h-5 text-indigo-400" />
          <span>Team Score Lookup</span>
        </h2>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="Type team ID or team name..."
            className="w-full luxury-input py-2.5 !pl-10 pr-4 text-xs sm:text-sm placeholder:text-slate-500"
          />
        </div>

        {/* Search Results */}
        {loadingTeams ? (
          <div className="py-6 text-slate-400 text-xs">Searching teams...</div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {teams.map((t) => (
              <div key={t.id} className="luxury-panel p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                    {t.teamNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">{t.teamName}</h3>
                <div className="text-xs text-slate-400">Venue: {t.venue.name}</div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                  <span className="text-xs text-slate-400">Final Average:</span>
                  <span className="font-mono font-extrabold text-base text-indigo-300">
                    {t.finalScore !== null ? `${t.finalScore.toFixed(2)} / 100` : '—'}
                  </span>
                </div>
                <Link
                  href={`/admin/teams/${t.id}`}
                  className="block w-full text-center py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold text-xs transition-all border border-white/[0.08]"
                >
                  View Matrix
                </Link>
              </div>
            ))}
          </div>
        ) : teamSearch.trim() ? (
          <div className="py-4 text-slate-500 text-xs">No matching team scores found.</div>
        ) : null}
      </div>

      {/* ADD CRITERION MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="luxury-panel w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1 font-display">Add Scoring Criterion</h2>
            <p className="text-xs text-slate-400 mb-5">Create a grading rubric with maximum mark allocation</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddCriterion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Criterion Name
                </label>
                <input
                  type="text"
                  required
                  value={critName}
                  onChange={(e) => setCritName(e.target.value)}
                  placeholder="e.g. Code Architecture & Execution"
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
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
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Display Order
                </label>
                <input
                  type="number"
                  required
                  value={critDisplayOrder}
                  onChange={(e) => setCritDisplayOrder(e.target.value)}
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 luxury-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 luxury-btn-primary text-xs"
                >
                  {submitting ? 'Creating...' : 'Create Criterion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CRITERION MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="luxury-panel w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1 font-display">Edit Scoring Criterion</h2>
            <p className="text-xs text-slate-400 mb-5">Update rubric description and point weights</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditCriterion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Criterion Name
                </label>
                <input
                  type="text"
                  required
                  value={critName}
                  onChange={(e) => setCritName(e.target.value)}
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
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
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Display Order
                </label>
                <input
                  type="number"
                  required
                  value={critDisplayOrder}
                  onChange={(e) => setCritDisplayOrder(e.target.value)}
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="critActiveCheck"
                  checked={critActive}
                  onChange={(e) => setCritActive(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="critActiveCheck" className="text-xs font-semibold text-slate-300">
                  Criterion Active in Rubric
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 luxury-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 luxury-btn-primary text-xs"
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
