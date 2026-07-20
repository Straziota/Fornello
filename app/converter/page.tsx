'use client';
import { useState } from 'react';
import PageBackground from '@/components/PageBackground';

interface ConversionResult {
  answer: string;
  explanation: string;
  alternatives?: string[];
}

const QUICK_EXAMPLES = [
  'How many cups is 200 g of all-purpose flour?',
  'How much is 3 tablespoons of butter in grams?',
  'What\'s 350°F in Celsius?',
  '8 oz of cream cheese in cups?',
  '1 lb of ground beef — how many cups?',
];

export default function ConverterPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ q: string; r: ConversionResult }[]>([]);

  const ask = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text) return;
    if (q) setQuestion(q);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/converter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      setResult(data);
      setHistory(prev => [{ q: text, r: data }, ...prev].slice(0, 10));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />

      <div className="mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
          Converter
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Ask anything about kitchen units — weights, volumes, temperatures, ingredient-specific conversions.
        </p>
      </div>

      {/* Input */}
      <div className="rounded-[22px] p-6 ring-1 mb-6"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
          What do you need converted?
        </p>
        <textarea value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask(); }}
          rows={2} placeholder="e.g. How many cups is 200 g of all-purpose flour?"
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
          style={{ background: 'var(--cream)', borderColor: 'var(--border)', fontFamily: 'Georgia, serif' }} />
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => ask()} disabled={loading || !question.trim()}
            className="rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-40 hover:opacity-80"
            style={{ background: 'var(--green)', color: '#fff' }}>
            {loading ? 'Thinking…' : 'Convert'}
          </button>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>⌘ + Enter</span>
        </div>
      </div>

      {/* Quick examples */}
      {!result && !history.length && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_EXAMPLES.map(ex => (
              <button key={ex} onClick={() => ask(ex)}
                className="text-xs px-4 py-2 rounded-full transition-opacity hover:opacity-70"
                style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl px-5 py-4 mb-6 text-sm" style={{ background: '#FDEDEB', color: '#C0392B' }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-[22px] p-6 ring-1 mb-6"
             style={{ background: 'var(--green-lt)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          <p className="text-[22px] mb-2 leading-tight"
             style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--green-dk)' }}>
            ✨ {result.answer}
          </p>
          {result.explanation && (
            <p className="text-sm italic mt-3" style={{ color: 'var(--text-2)' }}>
              {result.explanation}
            </p>
          )}
          {result.alternatives && result.alternatives.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Related</p>
              <ul className="space-y-1">
                {result.alternatives.map((alt, i) => (
                  <li key={i} className="text-sm" style={{ color: 'var(--text-2)' }}>· {alt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Recent</p>
          <ul className="space-y-2">
            {history.slice(1).map((h, i) => (
              <li key={i} className="rounded-xl px-4 py-3 ring-1"
                  style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.04)' }}>
                <p className="text-xs italic mb-1" style={{ color: 'var(--text-3)' }}>{h.q}</p>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{h.r.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
