'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import type { Traction, Metric, FunnelRow } from '@/lib/traction';

/**
 * The numbers that decide whether to keep going.
 *
 * One table and a few counters, no charts — a chart of seventeen points makes
 * you feel things that are not true. Signups, MAU, DAU, session length and
 * recipes generated are deliberately absent: at this size they are noise
 * dressed as progress, and time-in-app would be actively backwards, since the
 * weekly email exists so that nobody has to open the product at all.
 */
function MetricCard({ m, big }: { m: Metric; big?: boolean }) {
  return (
    <div className="rounded-[18px] p-6" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
      <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>{m.label}</p>
      <p style={{ fontFamily: 'AbramoSerif, serif', fontSize: big ? 44 : 30, lineHeight: 1.1, color: 'var(--text)' }}>
        {m.value}
      </p>
      <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-2)' }}>{m.detail}</p>
      {m.threshold && (
        // Written down so the page is for deciding rather than for feeling.
        // A number without a line drawn next to it is a scoreboard.
        <div className="mt-4 pt-4 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="mb-2" style={{ color: 'var(--green)' }}>
            <strong>Keep going if:</strong> <span style={{ color: 'var(--text-2)' }}>{m.threshold.keepGoing}</span>
          </p>
          <p style={{ color: '#8B2E22' }}>
            <strong>Stop if:</strong> <span style={{ color: 'var(--text-2)' }}>{m.threshold.stop}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function Funnel({ rows }: { rows: FunnelRow[] }) {
  const cell = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)' } as const;
  const head = { ...cell, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--text-3)' };
  return (
    <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr>
              {['Household', 'Joined', 'Onboarded', 'First menu', 'Weeks (theirs / sent)', 'Ratings', 'List opened', 'Swaps', 'Where they stopped']
                .map(h => <th key={h} style={{ ...head, textAlign: 'left' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.email} style={{ opacity: r.internal ? 0.45 : 1 }}>
                <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                  {r.email}{r.internal && <span style={{ color: 'var(--text-3)' }}> · you</span>}
                </td>
                <td style={{ ...cell, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.joined}</td>
                <td style={cell}>{r.onboarded ? '✓' : '—'}</td>
                <td style={{ ...cell, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.firstMenu ?? '—'}</td>
                {/* Two numbers, because they mean opposite things: weeks a
                    person caused, and weeks Fornello sent unprompted. */}
                <td style={{ ...cell, color: r.secondMenu ? 'var(--green)' : undefined, fontWeight: r.secondMenu ? 600 : 400 }}>
                  {r.humanMenus}
                  {r.autoPlanned > 0 && (
                    <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> / {r.autoPlanned} sent</span>
                  )}
                </td>
                <td style={{ ...cell, color: r.ratings ? 'var(--green)' : undefined }}>{r.ratings || '—'}</td>
                <td style={cell}>{r.groceriesOpened == null ? <span style={{ color: 'var(--text-3)' }}>n/a</span> : r.groceriesOpened ? '✓' : '—'}</td>
                <td style={cell}>{r.swaps || '—'}</td>
                <td style={{ ...cell, color: r.stalledAt === '—' ? 'var(--text-3)' : '#8B2E22' }}>{r.stalledAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TractionPage() {
  const [data, setData] = useState<Traction | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/traction')
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Forbidden'); setData(d); })
      .catch(e => setError(e.message));
  }, []);

  return (
    <>
      <PageBackground src="/backgrounds/this-week-page.png" />
      <Link href="/admin" className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-3)' }}>← Admin</Link>

      <h1 className="text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] mb-2"
          style={{ fontFamily: 'AbramoSerif, serif' }}>Traction</h1>
      <p className="text-[15px] italic mb-8" style={{ color: 'var(--text-2)' }}>
        The few numbers that decide whether to keep going.
      </p>

      {error && <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>}
      {!data && !error && <p className="text-sm" style={{ color: 'var(--text-3)' }}>Counting…</p>}

      {data && (
        <div className="pb-16">
          <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {data.tier1.map(m => <MetricCard key={m.key} m={m} big />)}
          </div>

          <h2 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
            Why tier one moved
          </h2>
          <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {data.tier2.map(m => <MetricCard key={m.key} m={m} />)}
          </div>

          <h2 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
            Every household, and where it stopped
          </h2>
          <div className="mb-10"><Funnel rows={data.funnel} /></div>

          <h2 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
            Operational — glance monthly
          </h2>
          <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
            {data.tier3.map(m => <MetricCard key={m.key} m={m} />)}
          </div>

          {/* Named so it cannot quietly reappear as a "nice to have". */}
          <div className="rounded-[18px] p-6" style={{ background: 'var(--cream)' }}>
            <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Not tracked, on purpose</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Signups, MAU, DAU and recipes generated: volume without outcome, and at this
              size a chart of seventeen points will make you feel things that aren&apos;t true.
              Session length and time in app are missing for a stronger reason — the weekly
              email exists so nobody has to open Fornello at all, so rewarding time-on-site
              would be measuring the opposite of success.
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--text-2)' }}>
              <strong>The number to build toward:</strong> households still receiving or
              generating menus in week four and beyond — the point where the engine has
              actually learned something. Too early to have any.
            </p>
          </div>

          <p className="text-xs mt-6" style={{ color: 'var(--text-3)' }}>
            Counted {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </>
  );
}
