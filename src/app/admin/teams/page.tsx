'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Eye, Edit2, Building2, FileCode, CheckCircle2, Clock } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface TeamItem {
  id: string;
  teamNumber: string;
  teamName: string;
  status: 'PENDING' | 'COMPLETED';
  finalScore: number | null;
  venue: { id: string; name: string };
  problemStatement: { id: string; code: string; title: string } | null;
  assignedJuriesCount: number;
  submittedEvaluationsCount: number;
}

interface VenueOption {
  id: string;
  name: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  // Form Fields
  const [teamNumber, setTeamNumber] = useState('');
  const [teamName, setTeamName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [problemStatementCode, setProblemStatementCode] = useState('PS-001');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { lastEvent } = useRealtime();

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teams?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to fetch teams');
      const data = await res.json();
      setTeams(data.teams);
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchVenues = async () => {
    try {
      const res = await fetch('/api/admin/venues');
      if (res.ok) {
        const data = await res.json();
        setVenues(data.venues);
        if (data.venues.length > 0 && !venueId) {
          setVenueId(data.venues[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading venues:', err);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchVenues();
  }, [fetchTeams]);

  useEffect(() => {
    if (lastEvent) {
      fetchTeams();
    }
  }, [lastEvent, fetchTeams]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamNumber,
          teamName,
          venueId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add team');

      setAddModalOpen(false);
      setTeamNumber('');
      setTeamName('');
      fetchTeams();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create team');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (team: TeamItem) => {
    setActiveTeamId(team.id);
    setTeamNumber(team.teamNumber);
    setTeamName(team.teamName);
    setVenueId(team.venue.id);
    setError('');
    setEditModalOpen(true);
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/teams/${activeTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamNumber,
          teamName,
          venueId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update team');

      setEditModalOpen(false);
      fetchTeams();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update team');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Teams Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            View, search, create, and manage registered hackathon teams
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setTeamNumber('');
            setTeamName('');
            setAddModalOpen(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-gradient-primary hover:opacity-95 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Team</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team by number or name..."
          className="w-full glass-input rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm placeholder:text-slate-500"
        />
      </div>

      {/* 11. TEAM CARDS GRID */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading hackathon teams...
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
          No teams found matching search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <div
              key={team.id}
              className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-extrabold text-sm text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    {team.teamNumber}
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      team.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {team.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Pending ({team.submittedEvaluationsCount}/{team.assignedJuriesCount})</span>
                      </>
                    )}
                  </span>
                </div>

                <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                  {team.teamName}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Venue: <strong className="text-slate-200">{team.venue.name}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Problem: <strong className="text-slate-200">{team.problemStatement?.code ?? 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Score and Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Total Score:</span>
                  <span className="font-mono font-extrabold text-sm text-white">
                    {team.finalScore !== null && team.finalScore !== undefined
                      ? `${team.finalScore.toFixed(2)} / 100`
                      : '—'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/admin/teams/${team.id}`}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 border border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => openEditModal(team)}
                    className="py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 border border-indigo-500/30"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 12. ADD TEAM MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Add New Hackathon Team</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Number (e.g. HACK042)
                </label>
                <input
                  type="text"
                  required
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  placeholder="HACK042"
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Code Warriors"
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Venue
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs bg-slate-900"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
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
                  {submitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. EDIT TEAM MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Edit Team Information</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Number
                </label>
                <input
                  type="text"
                  required
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Venue
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs bg-slate-900"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
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
