import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, UserCheck, KeyRound, Building2, Eye, Edit2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface JuryItem {
  id: string;
  name: string;
  username: string;
  active: boolean;
  venue: { id: string; name: string } | null;
  totalAssigned: number;
  completedEvaluations: number;
  pendingEvaluations: number;
}

interface VenueOption {
  id: string;
  name: string;
}

interface EvaluatedTeamRow {
  teamId: string;
  teamNumber: string;
  teamName: string;
  status: string;
  totalScore: number | null;
  submittedAt: string | null;
}

export default function AdminJuriesPage() {
  const [juries, setJuries] = useState<JuryItem[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Form Fields
  const [activeJuryId, setActiveJuryId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [venueId, setVenueId] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Detail View State
  const [selectedJuryDetails, setSelectedJuryDetails] = useState<JuryItem | null>(null);
  const [evaluatedTeams, setEvaluatedTeams] = useState<EvaluatedTeamRow[]>([]);

  const fetchJuriesData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersSnap, venuesSnap, assignmentsSnap, evaluationsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'JURY'))),
        getDocs(collection(db, 'venues')),
        getDocs(collection(db, 'juryTeamAssignments')),
        getDocs(collection(db, 'evaluations'))
      ]);

      const fetchedVenues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setVenues(fetchedVenues);
      if (fetchedVenues.length > 0 && !venueId) {
        setVenueId(fetchedVenues[0].id);
      }

      const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      let fetchedUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      if (search.trim()) {
        const s = search.trim().toLowerCase();
        fetchedUsers = fetchedUsers.filter(u =>
          (u.name && u.name.toLowerCase().includes(s)) ||
          (u.username && u.username.toLowerCase().includes(s))
        );
      }

      const formattedJuries = fetchedUsers.map((jury) => {
        const juryAssignments = assignments.filter(a => a.juryId === jury.id);
        const juryEvaluations = evaluations.filter(e => e.juryId === jury.id && e.status === 'SUBMITTED');
        
        const totalAssigned = juryAssignments.length;
        const completed = juryEvaluations.length;
        const pending = totalAssigned - completed;
        const venue = fetchedVenues.find(v => v.id === jury.venueId);

        return {
          id: jury.id,
          name: jury.name || 'Unnamed',
          username: jury.username || '',
          active: jury.active !== false,
          venue: venue ? { id: venue.id, name: venue.name } : null,
          totalAssigned,
          completedEvaluations: completed,
          pendingEvaluations: Math.max(0, pending),
        };
      });

      formattedJuries.sort((a, b) => a.name.localeCompare(b.name));
      setJuries(formattedJuries);

    } catch (err) {
      console.error('Error loading juries:', err);
    } finally {
      setLoading(false);
    }
  }, [search]); // venueId omitted from deps

  useEffect(() => {
    fetchJuriesData();
  }, [fetchJuriesData]);

  const handleAddJury = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/juries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, venueId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === 'Unauthorized') {
          window.location.href = '/login';
          return;
        }
        throw new Error(data.error || 'Failed to create jury');
      }

      setAddModalOpen(false);
      setName('');
      setUsername('');
      setPassword('');
      fetchJuriesData();
    } catch (err: any) {
      setError(err.message || 'Creation failed. Ensure Cloud Functions are running.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (jury: JuryItem) => {
    setActiveJuryId(jury.id);
    setName(jury.name);
    setUsername(jury.username);
    setPassword('');
    setVenueId(jury.venue ? jury.venue.id : venues[0]?.id || '');
    setActive(jury.active);
    setError('');
    setEditModalOpen(true);
  };

  const handleEditJury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJuryId) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/juries/${activeJuryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username,
          newPassword: password.trim() ? password.trim() : undefined,
          venueId,
          active,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === 'Unauthorized') {
          window.location.href = '/login';
          return;
        }
        throw new Error(data.error || 'Failed to update jury');
      }

      setEditModalOpen(false);
      fetchJuriesData();
    } catch (err: any) {
      setError(err.message || 'Update failed. Ensure Cloud Functions are running.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = async (jury: JuryItem) => {
    setSelectedJuryDetails(jury);
    setDetailModalOpen(true);
    setEvaluatedTeams([]);
    
    try {
      // Fetch details locally
      const [assignmentsSnap, evaluationsSnap, teamsSnap] = await Promise.all([
        getDocs(query(collection(db, 'juryTeamAssignments'), where('juryId', '==', jury.id))),
        getDocs(query(collection(db, 'evaluations'), where('juryId', '==', jury.id))),
        getDocs(collection(db, 'teams'))
      ]);

      const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const evaluations = evaluationsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const rows: EvaluatedTeamRow[] = assignmentsSnap.docs.map(doc => {
        const assignment = doc.data();
        const team = teams.find(t => t.id === assignment.teamId);
        const evaluation = evaluations.find(e => e.teamId === assignment.teamId);

        return {
          teamId: assignment.teamId,
          teamNumber: team?.teamNumber || 'Unknown',
          teamName: team?.teamName || team?.name || 'Unknown',
          status: evaluation ? evaluation.status : 'PENDING',
          totalScore: evaluation?.totalScore ?? null,
          submittedAt: evaluation?.submittedAt ?? null,
        };
      });

      setEvaluatedTeams(rows);
    } catch (err) {
      console.error('Error fetching jury detail:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Juries & Evaluators
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage evaluator credentials, track evaluation progress & assign venues
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setError('');
            setName('');
            setUsername('');
            setPassword('');
            setAddModalOpen(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 flex items-center justify-center space-x-2 text-xs font-bold shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Evaluator</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search evaluators by name or username..."
          className="w-full bg-[#0e1420] border border-white/10 rounded-xl py-2.5 !pl-10 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:border-indigo-500/50 outline-none"
        />
      </div>

      {/* JURY CARDS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Loading Evaluators...
          </p>
        </div>
      ) : juries.length === 0 ? (
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-12 text-center text-slate-400 text-sm">
          No jury members found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {juries.map((jury) => (
            <div
              key={jury.id}
              className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono text-xs font-bold text-slate-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                    @{jury.username}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      jury.active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                    }`}
                  >
                    {jury.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="font-bold text-base text-white">{jury.name}</h3>

                <div className="mt-2.5 flex items-center space-x-2 text-xs text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Venue: <strong className="text-white">{jury.venue?.name ?? 'Unassigned'}</strong></span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="block text-slate-400 text-[10px] uppercase font-semibold">Assigned</span>
                    <span className="font-bold text-slate-200 font-mono mt-0.5">{jury.totalAssigned}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="block text-slate-400 text-[10px] uppercase font-semibold">Completed</span>
                    <span className="font-bold text-emerald-400 font-mono mt-0.5">{jury.completedEvaluations}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="block text-slate-400 text-[10px] uppercase font-semibold">Pending</span>
                    <span className="font-bold text-amber-400 font-mono mt-0.5">{jury.pendingEvaluations}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/[0.08] grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openDetailModal(jury)}
                  className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 border border-white/[0.08]"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Progress</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(jury)}
                  className="py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 border border-indigo-500/25"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit / Reset</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD JURY MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Add Jury Evaluator</h2>
            <p className="text-xs text-slate-400 mb-5">Create login credentials for a hackathon judge</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddJury} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Alan Turing"
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="jury01"
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs font-mono outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Assigned Venue
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
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
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT JURY & PASSWORD RESET MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Edit Jury & Reset Password</h2>
            <p className="text-xs text-slate-400 mb-5">Update evaluator account details and credentials</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleEditJury} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Full Name
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
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs font-mono outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  New Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password to reset"
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Assigned Venue
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-slate-300">
                  Account Active & Enabled
                </label>
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

      {/* JURY DETAILS & EVALUATION PROGRESS MODAL */}
      {detailModalOpen && selectedJuryDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 rounded-2xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedJuryDetails.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Venue: {selectedJuryDetails.venue?.name ?? 'Unassigned'} | @{selectedJuryDetails.username}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]"
              >
                Close
              </button>
            </div>

            <div className="py-4 flex-1 overflow-y-auto space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Assigned Team Evaluation Status
              </h3>

              <div className="bg-black/30 border border-white/[0.08] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-black/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-white/[0.08]">
                      <th className="py-3 px-4">Team Number</th>
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Marks Awarded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {evaluatedTeams.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No teams evaluated yet by this judge.
                        </td>
                      </tr>
                    ) : (
                      evaluatedTeams.map((t) => (
                        <tr key={t.teamId} className="hover:bg-white/[0.03]">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                            {t.teamNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">{t.teamName}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'SUBMITTED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            {t.totalScore !== null ? `${t.totalScore.toFixed(2)} / 100` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
