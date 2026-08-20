'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Edit2, Users, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeListener';

interface VenueItem {
  id: string;
  name: string;
  capacity: number;
  juriesCount: number;
  juries: { id: string; name: string }[];
  teamsAssigned: number;
  completedEvaluations: number;
  pendingEvaluations: number;
}

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { lastEvent } = useRealtime();

  const fetchVenues = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/venues');
      if (!res.ok) throw new Error('Failed to fetch venues');
      const data = await res.json();
      setVenues(data.venues);
    } catch (err) {
      console.error('Error loading venues:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    if (lastEvent) {
      fetchVenues();
    }
  }, [lastEvent, fetchVenues]);

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, capacity: parseInt(capacity, 10) }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === 'Unauthorized') {
          window.location.href = '/login';
          return;
        }
        throw new Error(data.error || 'Failed to create venue');
      }

      setAddModalOpen(false);
      setName('');
      setCapacity('50');
      fetchVenues();
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

  const openEditModal = (v: VenueItem) => {
    setActiveVenueId(v.id);
    setName(v.name);
    setCapacity(v.capacity.toString());
    setError('');
    setEditModalOpen(true);
  };

  const handleEditVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVenueId) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/venues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeVenueId,
          name,
          capacity: parseInt(capacity, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update venue');

      setEditModalOpen(false);
      fetchVenues();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Building2 className="w-7 h-7 text-indigo-400" />
            <span>Venues & Lab Capacity</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage venue halls, max capacities, panel assignments, and live evaluation stats
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setName('');
            setCapacity('50');
            setAddModalOpen(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-gradient-primary hover:opacity-95 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Venue</span>
        </button>
      </div>

      {/* 22. VENUES CARDS GRID */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading venues...
        </div>
      ) : venues.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
          No venues created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((v) => {
            const completionPct =
              v.teamsAssigned > 0
                ? Math.round((v.completedEvaluations / v.teamsAssigned) * 1000) / 10
                : 0;

            return (
              <div
                key={v.id}
                className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all border border-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-white">{v.name}</h3>
                    <button
                      type="button"
                      onClick={() => openEditModal(v)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Max Capacity:</span>
                      <span className="font-bold text-slate-200">{v.capacity} Teams</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Juries:</span>
                      <span className="font-bold text-indigo-300">{v.juriesCount} Juries</span>
                    </div>
                  </div>

                  {/* Jury Names List */}
                  {v.juries.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {v.juries.map((j) => (
                        <span
                          key={j.id}
                          className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-medium"
                        >
                          {j.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Completion Bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Evaluation Progress</span>
                      <span className="font-bold text-indigo-400">{completionPct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(completionPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-500 text-[10px]">Teams</span>
                    <span className="font-bold text-white">{v.teamsAssigned}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-500 text-[10px]">Completed</span>
                    <span className="font-bold text-emerald-400">{v.completedEvaluations}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-500 text-[10px]">Pending</span>
                    <span className="font-bold text-amber-400">{v.pendingEvaluations}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 23. ADD VENUE MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Add New Venue</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Venue Name (e.g. Venue 5 - Robotics Lab)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Venue 5 - Robotics Lab"
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Capacity (Max Teams)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
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
                  {submitting ? 'Creating...' : 'Create Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 24. EDIT VENUE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Edit Venue Details</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Venue Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Capacity (Max Teams)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-xs"
                />
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
