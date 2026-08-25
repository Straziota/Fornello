'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * The screen the week-one email links to.
 *
 * Three questions at most, each one tap, each writing a real setting. It is
 * deliberately the same shell as the login page and the questionnaire — this is
 * the same conversation continuing, not a new place.
 */
interface Answer { label: string; kind: string; day?: string; value?: number | string }
interface Question { id: string; observation: string; question: string; answers: Answer[] }

function Inner() {
  const token = useSearchParams().get('token') || '';
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/week-one/answer?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'That link has expired.');
        setQuestions(d.questions || []);
      })
      .catch(e => setError(e.message));
  }, [token]);

  const answer = async (q: Question, a: Answer) => {
    setDone(d => ({ ...d, [q.id]: a.label }));
    // Applied as tapped, not collected and submitted: someone who answers one
    // question and closes the tab should still have changed that one thing.
    fetch(`/api/week-one/answer?token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: a.kind, day: a.day, value: a.value }),
    }).catch(() => {});
  };

  const allDone = questions && questions.length > 0 && questions.every(q => done[q.id]);

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-10" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/Fornello Logo.png" alt="Fornello" style={{ width: '160px', margin: '0 auto 16px' }} />
          <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>Your family meal planner</p>
        </div>

        <div className="rounded-[22px] p-8" style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>
          {error ? (
            <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
          ) : !questions ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>One moment…</p>
          ) : !questions.length ? (
            <>
              <h1 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Nothing to ask</h1>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Your week looks about right to me. If something isn&apos;t, tell me by
                replying to that email — it comes to a person.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>
                {allDone ? 'Got it — thank you' : "Here's what I noticed"}
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                {allDone
                  ? "I'll remember all of that for every week from now on."
                  : 'Week one was my best guess. Tell me if I read it right.'}
              </p>

              {questions.map(q => (
                <div key={q.id} className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{q.observation}</p>
                  <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>{q.question}</p>
                  {done[q.id] ? (
                    <p className="text-sm" style={{ color: 'var(--green)' }}>✓ {done[q.id]}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {q.answers.map(a => (
                        <button key={a.label} onClick={() => answer(q, a)}
                          className="rounded-xl px-4 py-3 text-sm text-left"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <a href="/this-week"
                 className="block text-center rounded-full px-5 py-3 text-sm text-white"
                 style={{ background: 'var(--green)', textDecoration: 'none' }}>
                See this week
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WeekOnePage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
