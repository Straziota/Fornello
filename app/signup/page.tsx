'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createBrowser();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      const msg = error.message?.toLowerCase().includes('invite-only') || error.message?.toLowerCase().includes('allowlist')
        ? "Fornello is currently in private beta. If you'd like access, please reach out to Claudia at straziota1980@yahoo.com — she'll add you to the invite list."
        : error.message;
      setError(msg);
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
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
          <h1 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-lora), serif' }}>Create account</h1>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#FDEDEB', color: '#C0392B' }}>
              {error}
            </div>
          )}

          <form onSubmit={signup} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="e.g. Claudia"
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                minLength={6} placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--green)' }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--green)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
