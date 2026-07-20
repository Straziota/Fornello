'use client';
import { useEffect } from 'react';

interface Props {
  message: string;
  type?: 'success' | 'error';
  onDone: () => void;
}

export default function Toast({ message, type = 'success', onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-slide-up px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
         style={{ background: type === 'error' ? '#C0392B' : 'var(--green)' }}>
      {message}
    </div>
  );
}
