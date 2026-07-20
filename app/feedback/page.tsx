'use client';
import { useState } from 'react';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';
import { T } from '@/components/T';

const CATEGORIES = ['Bug', 'Feature request', 'Compliment', 'Other'];

export default function FeedbackPage() {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/user-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, category, email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to send');
      }
      setSubmitted(true);
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="max-w-2xl mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
          <T>Send feedback</T>
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          <T>Found a bug? Have an idea? Just want to say hi? Claudia reads every message.</T>
        </p>
      </div>

      {submitted ? (
        <div className="max-w-2xl rounded-[22px] p-8 ring-1 text-center"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          <div className="text-5xl mb-4">💌</div>
          <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}><T>Thank you!</T></h2>
          <p className="italic mb-6" style={{ color: 'var(--text-2)' }}>
            <T>Your feedback has been sent. Claudia will read it soon.</T>
          </p>
          <button onClick={() => { setSubmitted(false); setMessage(''); setCategory(''); }}
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <T>Send another</T>
          </button>
        </div>
      ) : (
        <div className="max-w-2xl rounded-[22px] p-6 ring-1 space-y-5"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
              <T>What kind of feedback?</T>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(category === c ? '' : c)}
                  className="px-4 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    background: category === c ? 'var(--green)' : 'var(--cream)',
                    color: category === c ? '#fff' : 'var(--text-2)',
                    border: `1px solid ${category === c ? 'var(--green)' : 'var(--border)'}`,
                  }}>
                  <T>{c}</T>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
              <T>Your message</T>
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              rows={8} placeholder="What's on your mind?"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-y"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)', fontFamily: 'Georgia, serif' }} />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
              <T>Reply-to email (optional)</T>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="If you'd like a reply, leave your email"
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
          </div>

          <button onClick={submit} disabled={submitting || !message.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--green)' }}>
            {submitting ? <T>Sending…</T> : <T>Send feedback</T>}
          </button>
        </div>
      )}
    </>
  );
}
