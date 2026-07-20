'use client';
import { useState, useEffect } from 'react';
import { randomLoadingEntry, LoadingEntry } from '@/lib/loadingMessages';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  interval?: number;
}

export default function LoadingMessage({ size = 'md', interval = 2800 }: Props) {
  const [entry, setEntry] = useState<LoadingEntry>(randomLoadingEntry);

  useEffect(() => {
    const timer = setInterval(() => setEntry(randomLoadingEntry()), interval);
    return () => clearInterval(timer);
  }, [interval]);

  const imgSize = size === 'sm' ? 80 : size === 'lg' ? 160 : 120;
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

  return (
    <div className="flex flex-col items-center gap-4">
      <img
        key={entry.icon}
        src={entry.icon}
        alt=""
        style={{ width: `${imgSize}px`, height: `${imgSize}px`, objectFit: 'contain', borderRadius: '12px' }}
        className="animate-slide-up"
      />
      <p className={`italic ${textSize}`} style={{ color: 'var(--text-2)' }}>
        {entry.message}
      </p>
    </div>
  );
}
