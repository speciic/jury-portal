import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface JuryUser {
  id: string;
  name: string;
  username: string;
  venueName?: string;
}

export default function JuryLayout() {
  const navigate = useNavigate();
  const [juryUser, setJuryUser] = useState<JuryUser | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');

        if (!userId || userRole !== 'JURY') {
          navigate('/login');
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists() || userDoc.data()?.role !== 'JURY') {
          navigate('/login');
          return;
        }

        const userData = userDoc.data();
        let venueName = '';

        if (userData.venueId) {
          const venueDoc = await getDoc(doc(db, 'venues', userData.venueId));
          if (venueDoc.exists()) {
            venueName = venueDoc.data()?.name || '';
          }
        }

        setJuryUser({
          id: userDoc.id,
          name: userData.name || userData.username,
          username: userData.username,
          venueName,
        });

      } catch (err) {
        console.error('Error in JuryLayout auth check:', err);
        navigate('/login');
      }
    }
    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-slate-100 font-sans">
      {/* Executive Touch-Friendly Header */}
      <header className="bg-[#080c14]/80 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-30 px-4 py-3.5 sm:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 border border-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-tight leading-tight">
                JuryPortal <span className="text-[11px] font-semibold text-cyan-400">JUDGE</span>
              </h1>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                <span className="font-semibold text-slate-200">
                  {juryUser ? juryUser.name : 'Evaluator'}
                </span>
                {juryUser?.venueName && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-300 font-medium">{juryUser.venueName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="py-1.5 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 border border-rose-500/25 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 pb-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-white/[0.04] flex flex-col items-center space-y-2.5">
        <span className="text-slate-600 text-[10px] uppercase tracking-widest block leading-tight font-bold">
          Powered By
        </span>
        <div className="flex items-center justify-center space-x-4 opacity-80">
          <img src="/logos/Dondeal.png" alt="DonDeal Studios" className="h-10 w-auto object-contain rounded-md" />
          <img src="/logos/Ratiio1.png" alt="RatiioAi" className="h-10 w-auto object-contain rounded-md" />
          <img src="/logos/riftgostudios.png" alt="RIFTGO STUDIOS" className="h-10 w-auto object-contain rounded-md" />
        </div>
      </footer>
    </div>
  );
}
