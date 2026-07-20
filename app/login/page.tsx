'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { SITE_URL } from '@/lib/site';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Forgot-password flow
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [resetSent, setResetSent] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/');
    router.refresh();
  };

  const sendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetMsg('');
    const supabase = createBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
    setResetMsg(`If an account exists for ${email}, you'll get an email with a link to set a new password. Check your inbox (and spam folder).`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/Fornello Logo.png" alt="Fornello" style={{ width: '160px', margin: '0 auto 16px' }} />
          <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>Your family meal planner</p>
        </div>

        <div className="rounded-[22px] p-8" style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>
          <h1 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-lora), serif' }}>
            {mode === 'signin' ? 'Sign in' : 'Reset password'}
          </h1>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#FDEDEB', color: '#C0392B' }}>
              {error}
            </div>
          )}

          {mode === 'signin' ? (
            <>
              <form onSubmit={login} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label className="block text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Password</label>
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setResetSent(false); setResetMsg(''); }}
                      className="text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--green)' }}>
                      Forgot password?
                    </button>
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--green)' }}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="text-center text-sm mt-5" style={{ color: 'var(--text-3)' }}>
                No account?{' '}
                <Link href="/signup" style={{ color: 'var(--green)' }}>Create one</Link>
              </p>
            </>
          ) : (
            <>
              {resetSent ? (
                <div className="space-y-4">
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                    📧 {resetMsg}
                  </div>
                  <button onClick={() => { setMode('signin'); setError(''); setResetSent(false); setResetMsg(''); }}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--cream)' }}>
                    ← Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={sendResetEmail} className="space-y-4">
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Enter your email and we'll send you a link to set a new password.
                  </p>
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                      style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
                  </div>
                  <button type="submit" disabled={loading || !email}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--green)' }}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                  <button type="button" onClick={() => { setMode('signin'); setError(''); }}
                    className="w-full text-sm transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-3)' }}>
                    ← Back to sign in
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
