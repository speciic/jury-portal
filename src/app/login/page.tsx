'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (username.includes('@')) {
        // Jury flow: Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, username, password);
        const token = await userCredential.user.getIdToken();

        res = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } else {
        // Admin / Custom flow
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.user?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/jury/dashboard');
      }
    } catch (err: any) {
      console.error("Login catch block error details:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative font-sans selection:bg-violet-500/30">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[420px] z-10 my-8">
        {/* Brand Header */}
        <div className="text-center mb-10 space-y-4">
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
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-4">
              Jury<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Portal</span>
            </h1>
            <p className="text-sm text-zinc-400 font-medium mt-2">
              Sign in to manage and evaluate teams
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="surface-panel p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center space-x-3">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Username
              </label>
              <div className="relative group">
                <User className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="input-premium !pl-11 py-3.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-premium !pl-11 py-3.5"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 btn-primary flex items-center justify-center space-x-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
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

          {/* Footer note */}
          <div className="mt-8 pt-5 border-t border-white/5 flex flex-col items-center justify-center text-xs text-zinc-500 font-medium space-y-3">
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Encrypted Session</span>
              </div>
              <span>v3.0 Pro</span>
            </div>
            
            <div className="flex flex-col items-center space-y-3 mt-4">
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest text-center font-bold">
                Powered By
              </span>
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
