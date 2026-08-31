'use client';
import { useEffect, useState } from 'react';

/**
 * The page a guest bookmarks.
 *
 * Inert by design: one field, one button, and no knowledge of who is allowed
 * in. It reveals nothing before an address is entered and nothing afterwards
 * either — the answer is identical whether the address is a member, a stranger,
 * or nonsense. Otherwise the bookmark becomes a tool for testing who belongs to
 * a particular family.
 *
 * The Kitchen's name appears only if its owner turned that on. A page saved on
 * a phone should not hand a family's name to whoever picks the phone up.
 */
export default function KitchenAccess({ slug }: { slug: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    // Returns a name only when the owner opted in; otherwise nothing, and the
    // page stays anonymous.
    fetch(`/api/kitchen-access/name?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setName(d.name); })
      .catch(() => {});
  }, [slug]);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch('/api/kitchen-access/request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, email }),
    }).catch(() => {});
    // Shown whatever happened, including a failed request: the page must not
    // become an oracle by way of its error handling either.
    setSent(true);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-10" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/Fornello Logo.png" alt="Fornello" style={{ width: '160px', margin: '0 auto 16px' }} />
        </div>

        <div className="rounded-[22px] p-8" style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>
          {sent ? (
            <>
              <h1 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Check your email</h1>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
                If that address has access, we&apos;ve sent a link. It opens the Kitchen
                straight away — no password.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Keep this page. Whenever you want to come back, ask for a new link here.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--green)' }}>
                Use a different address
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
                {name ? `${name}'s Kitchen` : 'Open the Kitchen'}
              </h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
                Enter the email address you were invited with and we&apos;ll send you a
                link. There&apos;s no password to remember.
              </p>
              <form onSubmit={request}>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email"
                  className="w-full rounded-xl px-4 py-3 text-base mb-4"
                  style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />
                <button type="submit" disabled={busy}
                  className="w-full rounded-full px-5 py-3.5 text-sm text-white disabled:opacity-50"
                  style={{ background: 'var(--green)' }}>
                  {busy ? 'Sending…' : 'Email me a link'}
                </button>
              </form>
              <p className="text-xs mt-5 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Bookmark this page — it&apos;s where you come back to whenever you need a
                new link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
