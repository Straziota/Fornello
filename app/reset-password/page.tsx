'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import Link from 'next/link';

// Where users land after clicking the reset-password email link from Supabase.
// At this point Supabase has already exchanged the token in the URL for a
// short-lived session that allows updateUser({ password }) to succeed.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Verify the user actually arrived via a valid reset link (Supabase put them
  // into a session). If not, surface a helpful message instead of failing later.
  useEffect(() => {
    const supabase = createBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setSessionChecked(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords don\'t match.');
      return;
    }
    setLoading(true);
    const supabase = createBrowser();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    // Give the user a moment to read the success, then push to home.
    setTimeout(() => { router.push('/'); router.refresh(); }, 1800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/Fornello Logo.png" alt="Fornello" style={{ width: '160px', margin: '0 auto 16px' }} />
          <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>Set a new password</p>
        </div>

        <div className="rounded-[22px] p-8" style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>
          {!sessionChecked ? (
            <p className="text-sm italic text-center" style={{ color: 'var(--text-3)' }}>Verifying your reset link…</p>
          ) : !hasSession ? (
            <div className="space-y-4">
              <h1 className="text-2xl" style={{ fontFamily: 'var(--font-lora), serif' }}>Link expired</h1>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Your reset link is no longer valid (it may have already been used, or expired). Request a fresh one from the sign-in page.
              </p>
              <Link href="/login"
                className="block w-full py-3 rounded-xl text-sm font-semibold text-white text-center transition-opacity hover:opacity-90"
                style={{ background: 'var(--green)' }}>
                Back to sign in
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl">✅</div>
              <h1 className="text-2xl" style={{ fontFamily: 'var(--font-lora), serif' }}>Password updated</h1>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                You're now signed in. Taking you to Fornello…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-lora), serif' }}>Choose a new password</h1>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#FDEDEB', color: '#C0392B' }}>
                  {error}
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>New password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
                  <p className="text-xs italic mt-1" style={{ color: 'var(--text-3)' }}>At least 8 characters.</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Confirm new password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--green)' }}>
                  {loading ? 'Saving…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
