import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, CheckCircle2, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

interface AssignedTeam {
  id: string;
  teamNumber: string;
  teamName: string;
  venueName: string;
  problemCode: string;
  problemTitle: string;
  evaluationStatus: 'PENDING' | 'SUBMITTED' | 'UNLOCKED';
  totalScore: number | null;
}

interface JuryInfo {
  id: string;
  name: string;
  username: string;
  venueName: string;
}

export default function JuryDashboardPage() {
  const [juryInfo, setJuryInfo] = useState<JuryInfo | null>(null);
  const [teams, setTeams] = useState<AssignedTeam[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchJuryData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        window.location.href = '/login';
        return;
      }

      // Fetch Jury Info
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) throw new Error('User not found');
      
      const userData = userDoc.data();
      const venueId = userData.venueId;
      let venueName = 'Unknown Venue';
      
      if (venueId) {
        const venueDoc = await getDoc(doc(db, 'venues', venueId));
        if (venueDoc.exists()) {
          venueName = venueDoc.data().name;
        }
      }

      setJuryInfo({
        id: userId,
        name: userData.name || userData.username,
        username: userData.username,
        venueName
      });

      // Fetch Assigned Teams
      const assignmentsSnap = await getDocs(query(collection(db, 'juryTeamAssignments'), where('juryId', '==', userId)));
      const assignedTeamIds = assignmentsSnap.docs.map(doc => doc.data().teamId);

      if (assignedTeamIds.length === 0) {
        setTeams([]);
        return;
      }

      // We have to fetch teams in chunks if there are many, but since we are migrating for proto, fetching all is fine
      const teamsSnap = await getDocs(collection(db, 'teams'));
      let assignedTeams = teamsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(t => assignedTeamIds.includes(t.id));

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        assignedTeams = assignedTeams.filter(t => 
          (t.teamNumber && t.teamNumber.toLowerCase().includes(q)) || 
          (t.teamName && t.teamName.toLowerCase().includes(q))
        );
      }

      // Fetch evaluations for this jury
      const evaluationsSnap = await getDocs(query(collection(db, 'evaluations'), where('juryId', '==', userId)));
      const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const formattedTeams = assignedTeams.map(team => {
        const teamEval = evaluations.find(e => e.teamId === team.id);
        
        return {
          id: team.id,
          teamNumber: team.teamNumber || 'Unknown',
          teamName: team.teamName || team.name || 'Unnamed',
          venueName,
          problemCode: team.problemCode || 'N/A',
          problemTitle: team.problemStatement || 'N/A',
          evaluationStatus: teamEval?.status || 'PENDING',
          totalScore: teamEval?.totalScore ?? null
        } as AssignedTeam;
      });

      // Sort by team number
      formattedTeams.sort((a, b) => a.teamNumber.localeCompare(b.teamNumber));
      setTeams(formattedTeams);

    } catch (err) {
      console.error('Error fetching jury dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchJuryData();
  }, [fetchJuryData]);

  const completedCount = teams.filter((t) => t.evaluationStatus === 'SUBMITTED').length;
  const pendingCount = teams.length - completedCount;

  return (
    <div className="space-y-7 p-4 sm:p-8 min-h-screen">
      {/* WELCOME BANNER & VENUE BADGE */}
      <div className="bg-[#0e1420] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-cyan-300 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Evaluator Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {juryInfo ? juryInfo.name : 'Jury Evaluator'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select an assigned team below to inspect submissions and enter evaluation grades
            </p>
          </div>

          <div className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center space-x-2.5 text-xs shadow-inner">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Assigned Venue:</span>
            <strong className="text-white font-bold">{juryInfo?.venueName ?? 'Loading...'}</strong>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-black/30 p-3.5 rounded-xl border border-white/[0.06] text-center">
            <span className="block text-slate-400 text-[10px] uppercase font-semibold">Total Assigned</span>
            <span className="font-extrabold text-white text-xl mt-0.5">{teams.length}</span>
          </div>
          <div className="bg-black/30 p-3.5 rounded-xl border border-white/[0.06] text-center">
            <span className="block text-slate-400 text-[10px] uppercase font-semibold">Evaluated</span>
            <span className="font-extrabold text-emerald-400 text-xl mt-0.5">{completedCount}</span>
          </div>
          <div className="bg-black/30 p-3.5 rounded-xl border border-white/[0.06] text-center col-span-2 sm:col-span-1">
            <span className="block text-slate-400 text-[10px] uppercase font-semibold">Pending</span>
            <span className="font-extrabold text-amber-400 text-xl mt-0.5">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* SEARCH BOX */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team by team number (e.g. HACK042) or name..."
          className="w-full bg-[#0e1420] border border-white/10 rounded-2xl py-3.5 !pl-12 pr-4 text-sm text-white placeholder:text-slate-500 font-medium outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* ASSIGNED TEAMS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-[3px] border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Loading Assigned Roster...
          </p>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-[#0e1420] border border-white/10 rounded-2xl p-12 text-center text-slate-400 text-sm">
          No assigned teams found matching your search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => {
            const isCompleted = team.evaluationStatus === 'SUBMITTED';

            return (
              <div
                key={team.id}
                className="bg-[#0e1420] border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-cyan-500/30 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-extrabold text-xs text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/25">
                      {team.teamNumber}
                    </span>
                    <span
                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submitted ({team.totalScore?.toFixed(1)})</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Scoring</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-white">{team.teamName}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono line-clamp-2">
                    Problem: <span className="text-slate-200">{team.problemCode}</span> - {team.problemTitle}
                  </p>
                </div>

                <Link
                  to={`/jury/evaluate/${team.id}`}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md ${
                    isCompleted
                      ? 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08]'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
                  }`}
                >
                  <span>{isCompleted ? 'Inspect Submitted Evaluation' : 'Enter Evaluation Scores'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
