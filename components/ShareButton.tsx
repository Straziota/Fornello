'use client';
import { useState } from 'react';
import Toast from './Toast';

interface Props {
  recipe: object;
  size?: 'sm' | 'md';
}

export default function ShareButton({ recipe, size = 'md' }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const send = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe, toEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Recipe sent to ${email} ✓`, type: 'success' });
      setOpen(false);
      setEmail('');
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const btnStyle = size === 'sm'
    ? { padding: '5px 12px', fontSize: '12px' }
    : { padding: '9px 18px', fontSize: '14px' };

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <button onClick={() => setOpen(true)}
        className="rounded-full font-medium transition-opacity hover:opacity-80"
        style={{ ...btnStyle, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)' }}>
        ✉️ Share
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.4)' }}
             onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="rounded-[22px] p-7 w-full max-w-sm"
               style={{ background: 'var(--white)', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <h3 className="text-xl mb-1" style={{ fontFamily: 'var(--font-lora), serif' }}>Share Recipe</h3>
            <p className="text-sm italic mb-5" style={{ color: 'var(--text-3)' }}>
              Recipient gets a PDF + a .fornello file they can import directly if they have the app.
            </p>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
              Send to
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="friend@email.com"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none mb-4"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)', fontFamily: 'Georgia, serif' }} />
            <div className="flex gap-3">
              <button onClick={send} disabled={sending || !email.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--green)' }}>
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
