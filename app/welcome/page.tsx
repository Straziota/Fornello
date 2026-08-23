'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import { themesExcludedBy } from '@/lib/themes';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const CUISINES = ['Italian','French','Mediterranean','Mexican','Indian','Thai','Japanese','Chinese',
                  'Middle Eastern','Spanish','Greek','American comfort','Vegetarian-forward'];

const COMMON_ALLERGIES = ['Shellfish','Peanuts','Tree nuts','Dairy','Gluten','Eggs','Soy','Fish'];

const TOTAL = 7;

const card: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 22, padding: 32,
  boxShadow: '0 8px 32px rgba(47,58,50,0.08)',
};

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-full px-4 py-2 text-sm transition-all"
      style={{
        border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
        background: on ? 'var(--green)' : 'transparent',
        color: on ? '#fff' : 'var(--text-2)',
      }}>
      {label}
    </button>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [familySize, setFamilySize] = useState(4);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [restrictionsFree, setRestrictionsFree] = useState('');
  const [cookNights, setCookNights] = useState<string[]>(['Monday','Tuesday','Wednesday','Thursday']);
  const [weeknightMinutes, setWeeknightMinutes] = useState(45);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [skipIngredients, setSkipIngredients] = useState('');
  const [websites, setWebsites] = useState('');
  const [autoPlan, setAutoPlan] = useState(false);
  // Set when the server rewrote what was typed, so it can be shown before the
  // first menu is generated rather than discovered later in Settings.
  const [understood, setUnderstood] = useState<{ from: string[]; to: string[] } | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  // Real consequence, not flattery: this filters the same theme list the menu
  // generator uses, so the number shown is the number that actually applies.
  const allRestrictions = [...restrictions, restrictionsFree].join(' ');
  const { excluded } = themesExcludedBy(allRestrictions);

  const finish = async () => {
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familySize,
          restrictions: [...restrictions, ...restrictionsFree.split(',').map(s => s.trim()).filter(Boolean)],
          cookNights, weeknightMinutes, preferences,
          skipIngredients: skipIngredients.split(',').map(s => s.trim()).filter(Boolean),
          websites: websites.split(',').map(s => s.trim()).filter(Boolean),
          autoPlan,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Could not save');
      if (out.corrected) { setUnderstood(out.corrected); setSaving(false); return; }
      go();
    } catch (e: any) {
      setErr(e.message); setSaving(false);
    }
  };

  // Picked up by /this-week, which generates the first menu immediately.
  const go = () => {
    sessionStorage.setItem('fornello:firstRun', '1');
    router.push('/this-week');
  };

  // Keep exactly what they wrote, and go. Their words are the record; ours were
  // only ever a reading of them.
  const keepMine = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restrictions: understood!.from }),
    }).catch(() => {});
    go();
  };

  const Nav = ({ next, disabled }: { next?: () => void; disabled?: boolean }) => (
    <div className="flex items-center gap-3 mt-8">
      {step > 1 && (
        <button onClick={() => setStep(s => s - 1)}
          className="text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-60"
          style={{ color: 'var(--text-3)' }}>← Back</button>
      )}
      <button onClick={next || (() => setStep(s => s + 1))} disabled={disabled || saving}
        className="ml-auto rounded-full px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ background: 'var(--green)' }}>
        {saving ? 'Saving…' : step === TOTAL ? 'See my first week' : 'Continue'}
      </button>
    </div>
  );

  return (
    <>
      <PageBackground src="/backgrounds/this-week-page.png" />
      <div className="max-w-lg mx-auto py-6">

        {/* Shown once, between the last answer and the first menu. Fornello has
            rewritten what was typed into the ingredient names its checks match
            on; whether that reading is right is not something it can know. */}
        {understood && (
          <div style={card}>
            <h1 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
              Here&apos;s how I understood that
            </h1>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
              Recipes are checked by ingredient name, so I&apos;ve written your
              allergies out as ingredients. Nothing was removed.
            </p>
            <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: 'var(--green-lt)' }}>
              <p className="mb-2" style={{ color: 'var(--text-3)' }}>
                You wrote: <span style={{ color: 'var(--text-2)' }}>{understood.from.join(' · ')}</span>
              </p>
              <p style={{ color: 'var(--text-3)' }}>
                Kept as: <strong style={{ color: 'var(--green)' }}>{understood.to.join(' · ')}</strong>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={go} disabled={saving}
                className="rounded-full px-5 py-2.5 text-sm text-white disabled:opacity-50" style={{ background: 'var(--green)' }}>
                That&apos;s right — make my week
              </button>
              <button onClick={keepMine} disabled={saving}
                className="rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                Use what I wrote
              </button>
            </div>
          </div>
        )}

        {!understood && step <= TOTAL && (
          <>
            <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--text-3)' }}>
              Question {step} of {TOTAL}
            </p>
            <div className="w-full h-1 rounded-full mb-7" style={{ background: 'var(--border)' }}>
              <div style={{ width: `${(step / TOTAL) * 100}%`, height: '100%', background: 'var(--green)', borderRadius: 999, transition: 'width .3s' }} />
            </div>
          </>
        )}

        {!understood && <div style={card}>
          {step === 1 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>How many are you feeding?</h1>
              <p className="text-sm mb-7" style={{ color: 'var(--text-2)' }}>Every recipe gets scaled to this.</p>
              <div className="flex items-center gap-5">
                <button onClick={() => setFamilySize(n => Math.max(1, n - 1))}
                  className="w-11 h-11 rounded-full text-xl" style={{ border: '1px solid var(--border)' }}>−</button>
                <span className="text-4xl" style={{ fontFamily: 'AbramoSerif, serif', minWidth: 56, textAlign: 'center' }}>{familySize}</span>
                <button onClick={() => setFamilySize(n => Math.min(20, n + 1))}
                  className="w-11 h-11 rounded-full text-xl" style={{ border: '1px solid var(--border)' }}>+</button>
              </div>
              <Nav />
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>Any allergies or absolute no-gos?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                These are never included — not as a variation, not as a garnish.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_ALLERGIES.map(a => (
                  <Chip key={a} label={a} on={restrictions.includes(a)} onClick={() => toggle(restrictions, setRestrictions, a)} />
                ))}
              </div>
              <input value={restrictionsFree} onChange={e => setRestrictionsFree(e.target.value)}
                placeholder="Anything else? Separate with commas"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />
              {excluded.length > 0 && (
                <p className="text-sm mt-4 px-4 py-3 rounded-xl" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                  Noted — that takes {excluded.length} cooking {excluded.length === 1 ? 'direction' : 'directions'} off
                  the table, including {excluded.slice(0, 2).join(' and ')}. I won&apos;t suggest them.
                </p>
              )}
              <Nav />
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>Which nights do you cook?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>Skip the nights you don&apos;t. No dinner gets planned for those.</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <Chip key={d} label={d.slice(0, 3)} on={cookNights.includes(d)} onClick={() => toggle(cookNights, setCookNights, d)} />
                ))}
              </div>
              <p className="text-sm mt-4 px-4 py-3 rounded-xl" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                {cookNights.length === 0
                  ? 'Pick at least one night so there’s something to plan.'
                  : `${cookNights.length} ${cookNights.length === 1 ? 'dinner' : 'dinners'} a week. That’s what I’ll plan for.`}
              </p>
              <Nav disabled={cookNights.length === 0} />
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>How long on a weeknight?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>Recipes are chosen to genuinely fit — not squeezed to look like they do.</p>
              <div className="flex flex-wrap gap-2">
                {[20, 30, 45, 60, 90].map(m => (
                  <Chip key={m} label={m >= 60 ? `${m / 60} hr${m > 60 ? '+' : ''}` : `${m} min`}
                    on={weeknightMinutes === m} onClick={() => setWeeknightMinutes(m)} />
                ))}
              </div>
              <Nav />
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>What does your family love?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>Pick as many as you like. I&apos;ll lean this way — and still surprise you.</p>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map(c => (
                  <Chip key={c} label={c} on={preferences.includes(c)} onClick={() => toggle(preferences, setPreferences, c)} />
                ))}
              </div>
              <Nav />
            </>
          )}

          {step === 6 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>Anything you&apos;d rather never see?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                Not allergies — just things nobody enjoys. Mushrooms, olives, blue cheese.
              </p>
              <input value={skipIngredients} onChange={e => setSkipIngredients(e.target.value)}
                placeholder="Separate with commas"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />
              <p className="text-xs mt-3 italic" style={{ color: 'var(--text-3)' }}>
                I&apos;ll avoid recipes built around these, but still allow them as an optional garnish.
              </p>
              <Nav />
            </>
          )}

          {step === 7 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>Where do you usually look for recipes?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                I&apos;ll cook in the spirit of the places you trust. Nothing is copied from them.
              </p>
              <input value={websites} onChange={e => setWebsites(e.target.value)}
                placeholder="e.g. Serious Eats, Giallo Zafferano, Half Baked Harvest"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />
              {err && <p className="text-sm mt-4" style={{ color: '#C0392B' }}>{err}</p>}
              <Nav next={finish} />
            </>
          )}
        </div>}

        {!understood && step === TOTAL && (
          <div className="mt-6 rounded-[22px] px-6 py-5" style={{ background: 'var(--cream)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              This first week is my best guess. Tell me what you loved and what you&apos;d change,
              and by week four I&apos;ll know your family. There&apos;s more to tune whenever you want it —
              sides, pantry, units, holidays — all in <Link href="/settings" style={{ color: 'var(--green)', textDecoration: 'underline' }}>Settings</Link>.
            </p>

            {/* The offer under Generate only reaches households who come back —
                and the ones this feature exists for are precisely those who
                don't. This catches them in the first session. Unticked: it must
                be chosen, never assumed. */}
            <label className="flex items-start gap-3 mt-5 pt-5 cursor-pointer"
                   style={{ borderTop: '1px solid var(--border)' }}>
              <input type="checkbox" checked={autoPlan} onChange={e => setAutoPlan(e.target.checked)}
                     className="mt-1" style={{ accentColor: 'var(--green)', width: 16, height: 16 }} />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                <strong>Email me my week</strong> — sent the day before it starts, with the
                shopping list. You won&apos;t have to come back for it.
              </span>
            </label>
          </div>
        )}
      </div>
    </>
  );
}
