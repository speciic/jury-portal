import React, { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Edit2, CheckCircle2, Clock } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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

  const fetchVenuesData = useCallback(async () => {
    try {
      setLoading(true);

      const [venuesSnap, usersSnap, teamsSnap, assignmentsSnap, evaluationsSnap] = await Promise.all([
        getDocs(collection(db, 'venues')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'JURY'))),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'juryTeamAssignments')),
        getDocs(collection(db, 'evaluations'))
      ]);

      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const fetchedVenues = venuesSnap.docs.map(doc => {
        const venueData = doc.data();
        const venueId = doc.id;

        const venueJuries = users.filter(u => u.venueId === venueId);
        const venueTeams = teams.filter(t => t.venueId === venueId);
        
        let completed = 0;
        let pending = 0;

        venueTeams.forEach(team => {
          const teamAssignments = assignments.filter(a => a.teamId === team.id);
          const teamEvaluations = evaluations.filter(e => e.teamId === team.id && e.status === 'SUBMITTED');
          
          if (teamAssignments.length > 0 && teamEvaluations.length >= teamAssignments.length) {
            completed++;
          } else {
            pending++;
          }
        });

        return {
          id: venueId,
          name: venueData.name || 'Unnamed Venue',
          capacity: venueData.capacity || 50,
          juriesCount: venueJuries.length,
          juries: venueJuries.map(j => ({ id: j.id, name: j.name || j.username })),
          teamsAssigned: venueTeams.length,
          completedEvaluations: completed,
          pendingEvaluations: pending,
        };
      });

      fetchedVenues.sort((a, b) => a.name.localeCompare(b.name));
      setVenues(fetchedVenues);
    } catch (err) {
      console.error('Error loading venues:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenuesData();
  }, [fetchVenuesData]);

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
      fetchVenuesData();
    } catch (err: any) {
      setError(err.message || 'Creation failed. Ensure Cloud Functions are running.');
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
      const res = await fetch(`/api/admin/venues/${activeVenueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          capacity: parseInt(capacity, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update venue');

      setEditModalOpen(false);
      fetchVenuesData();
    } catch (err: any) {
      setError(err.message || 'Update failed. Ensure Cloud Functions are running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Venues & Capacity
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage venue halls, room capacity limits & panel jury assignments
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setError('');
            setName('');
            setCapacity('50');
            setAddModalOpen(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 flex items-center justify-center space-x-2 text-xs font-bold shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Venue</span>
        </button>
      </div>

      {/* VENUES CARDS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Loading Venues...
          </p>
        </div>
      ) : venues.length === 0 ? (
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-12 text-center text-slate-400 text-sm">
          No venues registered yet.
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
                className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-white">{v.name}</h3>
                    <button
                      type="button"
                      onClick={() => openEditModal(v)}
                      className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Max Capacity:</span>
                      <span className="font-bold text-white font-mono">{v.capacity} Teams</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Evaluators:</span>
                      <span className="font-bold text-indigo-300 font-mono">{v.juriesCount} Juries</span>
                    </div>
                  </div>

                  {/* Jury Names List */}
                  {v.juries.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {v.juries.map((j) => (
                        <span
                          key={j.id}
                          className="px-2.5 py-1 rounded-lg bg-black/40 text-slate-300 border border-white/[0.06] text-[10px] font-semibold"
                        >
                          {j.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Completion Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Evaluation Progress</span>
                      <span className="font-bold text-indigo-300 font-mono">{completionPct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-700 shadow-sm shadow-indigo-500/50"
                        style={{ width: `${Math.min(completionPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-white/[0.08]">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="block text-slate-400 text-[10px] uppercase font-semibold">Teams</span>
                    <span className="font-bold text-white font-mono mt-0.5">{v.teamsAssigned}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="block text-slate-400 text-[10px] uppercase font-semibold">Done</span>
                    <span className="font-bold text-emerald-400 font-mono mt-0.5">{v.completedEvaluations}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="block text-slate-400 text-[10px] uppercase font-semibold">Pending</span>
                    <span className="font-bold text-amber-400 font-mono mt-0.5">{v.pendingEvaluations}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD VENUE MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Add New Venue</h2>
            <p className="text-xs text-slate-400 mb-5">Create a competition room or lab hall</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Venue Name (e.g. Lab 3 - AI Incubator)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lab 3 - AI Incubator"
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Capacity (Max Teams)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {submitting ? 'Creating...' : 'Create Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VENUE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Edit Venue</h2>
            <p className="text-xs text-slate-400 mb-5">Update venue capacity and details</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Venue Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Capacity (Max Teams)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
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
