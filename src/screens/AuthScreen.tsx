import { useState } from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const { login, signup } = useAuthStore();
  const [mode,     setMode]     = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('Username is required.'); return; }
    if (!password)        { setError('Password is required.');  return; }
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 300)); // brief loading feel

    const err = mode === 'login'
      ? login(username, password)
      : signup(username, password);

    setLoading(false);
    if (err) setError(err);
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">

        {/* Logo + title */}
        <img src="/logo.png" alt="Stonkify" className="h-20 w-20 object-contain mb-4 drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]" />
        <h1 className="text-4xl font-black tracking-tight mb-1">
          <span className="text-white">STO</span><span className="text-yellow-400">NK</span><span className="text-red-400">IFY</span>
        </h1>
        <p className="text-gray-500 text-sm mb-8">Trade fast. Bet smart. Survive.</p>

        {/* Card */}
        <div className="w-full bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden">

          {/* Tab toggle */}
          <div className="flex border-b border-gray-800">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={clsx(
                  'flex-1 py-4 text-sm font-bold tracking-wide uppercase transition-all',
                  mode === m
                    ? 'text-yellow-400 border-b-2 border-yellow-500 bg-gray-800/50'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4 p-7">

            {/* Username */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest font-semibold block mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="your_alias"
                maxLength={20}
                autoComplete="username"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-yellow-500 outline-none placeholder-gray-600 text-sm transition-colors font-mono"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest font-semibold block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 pr-11 border border-gray-700 focus:border-yellow-500 outline-none placeholder-gray-600 text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest font-semibold block mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-yellow-500 outline-none placeholder-gray-600 text-sm transition-colors"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-400 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-base rounded-xl transition-all hover:scale-[1.01] shadow-lg shadow-yellow-900/20 tracking-wide mt-1 flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="animate-pulse">Loading…</span>
                : <><TrendingUp size={18} /> {mode === 'login' ? 'Enter the Market' : 'Create Account'}</>
              }
            </button>

          </form>
        </div>

        {/* Footer hint */}
        <p className="text-gray-700 text-xs mt-6 text-center">
          Accounts are stored locally in your browser only.
        </p>
      </div>
    </div>
  );
}
