'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Eye, Edit2, Building2, FileCode, CheckCircle2, Clock, Users } from 'lucide-react';
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
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                Teams Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage registered hackathon teams, assigned venues & evaluation statuses
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setError('');
            setTeamNumber('');
            setTeamName('');
            setAddModalOpen(true);
          }}
          className="py-2.5 px-4 rounded-xl luxury-btn-primary flex items-center justify-center space-x-2 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Team</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams by ID or name..."
          className="w-full luxury-input py-2.5 !pl-10 pr-4 text-xs sm:text-sm placeholder:text-slate-500"
        />
      </div>

      {/* TEAM CARDS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Loading Hackathon Teams...
          </p>
        </div>
      ) : teams.length === 0 ? (
        <div className="luxury-panel p-12 text-center text-slate-400 text-sm">
          No registered teams found matching your query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <div
              key={team.id}
              className="luxury-card p-5 flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono font-bold text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    {team.teamNumber}
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      team.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                    }`}
                  >
                    {team.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
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
                    <span>Venue: <strong className="text-white">{team.venue.name}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Problem: <strong className="text-slate-200 font-mono">{team.problemStatement?.code ?? 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Score and Action Buttons */}
              <div className="pt-3 border-t border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Final Score:</span>
                  <span className="font-mono font-extrabold text-sm text-indigo-300">
                    {team.finalScore !== null && team.finalScore !== undefined
                      ? `${team.finalScore.toFixed(2)} / 100`
                      : '—'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/admin/teams/${team.id}`}
                    className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 border border-white/[0.08]"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Matrix</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => openEditModal(team)}
                    className="py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 border border-indigo-500/25"
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

      {/* ADD TEAM MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="luxury-panel w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1 font-display">Add Hackathon Team</h2>
            <p className="text-xs text-slate-400 mb-5">Register a team into the evaluation roster</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Team Number
                </label>
                <input
                  type="text"
                  required
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  placeholder="e.g. HACK042"
                  className="w-full luxury-input py-2.5 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. CyberVanguard"
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Assigned Venue
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full luxury-input py-2.5 px-3 text-xs bg-[#080c14]"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
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
                  {submitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="luxury-panel w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1 font-display">Edit Team Information</h2>
            <p className="text-xs text-slate-400 mb-5">Update registration details for this team</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Team Number
                </label>
                <input
                  type="text"
                  required
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  className="w-full luxury-input py-2.5 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full luxury-input py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Assigned Venue
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full luxury-input py-2.5 px-3 text-xs bg-[#080c14]"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
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
