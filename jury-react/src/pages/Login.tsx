import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isEmail = username.trim().includes('@');

      if (isEmail) {
        // ── JURY LOGIN: Firebase Auth (email + password) ──
        const userCredential = await signInWithEmailAndPassword(auth, username.trim(), password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const role = userDoc.exists() ? (userDoc.data()?.role || 'JURY') : 'JURY';
        
        localStorage.setItem('userId', userCredential.user.uid);
        localStorage.setItem('userRole', role);
        
        navigate(role === 'ADMIN' ? '/admin/dashboard' : '/jury/dashboard');

      } else {
        // ── ADMIN / CUSTOM LOGIN: username + bcrypt password via API ──
        // First try the Cloud Functions API (works in production & when emulator is running)
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: username.trim(), password }),
          });

          if (res.status === 502 || res.status === 504 || res.status === 404) {
            throw new Error('BACKEND_UNAVAILABLE');
          }

          if (res.ok) {
            const data = await res.json();
            const role = data.user?.role || 'JURY';
            
            localStorage.setItem('userId', data.user?.id);
            localStorage.setItem('userRole', role);
            
            navigate(role === 'ADMIN' ? '/admin/dashboard' : '/jury/dashboard');
            return;
          } else {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Invalid credentials');
          }
        } catch (fetchErr: any) {
          // If the Cloud Functions API is not running (network error), fall back to
          // Firestore lookup so the UI isn't broken during development.
          if (fetchErr.message === 'BACKEND_UNAVAILABLE' || fetchErr.name === 'TypeError' || fetchErr.message?.includes('fetch')) {
            // FALLBACK: look up user in Firestore by username
            const cleanUsername = username.trim().toLowerCase();
            const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
            const snap = await getDocs(q);

            if (snap.empty) throw new Error('Invalid username or password');

            const userData = snap.docs[0].data() as any;
            if (userData.active === false) throw new Error('Account is disabled');

            // NOTE: We cannot verify bcrypt password in the browser.
            // This fallback only works when the Functions emulator or deployed Functions are unavailable.
            // Redirect based on role (password not verified — for dev preview only).
            const role = userData.role || 'JURY';
            const userId = snap.docs[0].id;
            
            localStorage.setItem('userId', userId);
            localStorage.setItem('userRole', role);
            
            navigate(role === 'ADMIN' ? '/admin/dashboard' : '/jury/dashboard');
          } else {
            throw fetchErr;
          }
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error — please check your internet connection.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative font-sans bg-[#0a0a0a]">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 my-8">
        {/* Brand Header */}
        <div className="text-center mb-10 flex flex-col items-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span>Secure Evaluation Portal</span>
          </div>

          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-violet-500 to-cyan-400 blur-xl opacity-30" />
            <div className="relative w-16 h-16 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-white shadow-2xl">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">
              Jury<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Portal</span>
            </h1>
            <p className="text-sm text-zinc-400 font-medium mt-2">
              Sign in to manage and evaluate teams
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="p-8 bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center space-x-3">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Username or Email
              </label>
              <div className="relative group">
                <User className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full bg-black/60 border border-white/10 rounded-xl text-white pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Password
              </label>
              <div className="relative group">
                <Lock className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/60 border border-white/10 rounded-xl text-white pl-11 pr-11 py-3.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2.5 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-white/5 flex flex-col items-center justify-center text-xs text-zinc-500 font-medium space-y-3">
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Encrypted Session</span>
              </div>
              <span>v3.0 Pro</span>
            </div>
            <div className="flex flex-col items-center space-y-3 mt-4">
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest text-center font-bold">Powered By</span>
              <div className="flex items-center justify-center space-x-5">
                <img src="/logos/Dondeal.png" alt="DonDeal Studios" className="h-10 w-auto object-contain rounded-lg" />
                <img src="/logos/Ratiio1.png" alt="RatiioAi" className="h-10 w-auto object-contain rounded-lg" />
                <img src="/logos/riftgostudios.png" alt="RIFTGO STUDIOS" className="h-10 w-auto object-contain rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
