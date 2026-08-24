'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import { themesExcludedBy } from '@/lib/themes';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const CUISINES = ['Italian','French','Mediterranean','Mexican','Indian','Thai','Japanese','Chinese',
                  'Middle Eastern','Spanish','Greek','American comfort','Vegetarian-forward'];

const COMMON_ALLERGIES = ['Shellfish','Peanuts','Tree nuts','Dairy','Gluten','Eggs','Soy','Fish'];

const TOTAL = 9;

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
  // An explicit no, so an empty list stops meaning both "nobody is allergic"
  // and "they skipped the question". The two need opposite treatment.
  const [noAllergies, setNoAllergies] = useState(false);
  const [cookNights, setCookNights] = useState<string[]>(['Monday','Tuesday','Wednesday','Thursday']);
  const [weeknightMinutes, setWeeknightMinutes] = useState(45);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [skipIngredients, setSkipIngredients] = useState('');
  const [websites, setWebsites] = useState('');
  const [autoPlan, setAutoPlan] = useState(false);
  // True once we know whether this household has answered before. Everyone is
  // being re-onboarded, so most people arriving here are NOT new.
  const [returning, setReturning] = useState(false);
  // Set when the server rewrote what was typed, so it can be shown before the
  // first menu is generated rather than discovered later in Settings.
  const [understood, setUnderstood] = useState<{ from: string[]; to: string[] } | null>(null);

  // Start from what they already told us, rather than from a blank form.
  //
  // Re-onboarding an existing household through an empty questionnaire is a
  // chance to LOSE an allergy: two of these families have nut allergies we had
  // to repair by hand, and a blank form invites them to tap "no allergies"
  // rather than retype what they already said. Prefilled, this is a
  // confirmation pass — which is all a re-onboarding should ever be.
  useEffect(() => {
    fetch('/api/settings').then(r => r.ok ? r.json() : null).then(s => {
      if (!s) return;
      if (typeof s.familySize === 'number') setFamilySize(s.familySize);
      if (Array.isArray(s.restrictions) && s.restrictions.length) setRestrictions(s.restrictions);
      if (s.noAllergiesConfirmedAt && !(s.restrictions || []).length) setNoAllergies(true);
      if (Array.isArray(s.preferences) && s.preferences.length) setPreferences(s.preferences);
      if (Array.isArray(s.skipIngredients) && s.skipIngredients.length) setSkipIngredients(s.skipIngredients.join(', '));
      if (Array.isArray(s.websites) && s.websites.length) setWebsites(s.websites.join(', '));
      if (s.schedule && typeof s.schedule === 'object') {
        const on = Object.entries(s.schedule).filter(([, d]: any) => d?.enabled).map(([day]) => day);
        if (on.length) setCookNights(on);
        const mins = Object.values(s.schedule).find((d: any) => d?.enabled && d?.minutes) as any;
        if (mins?.minutes) setWeeknightMinutes(mins.minutes);
      }
      if (s.autoPlan) setAutoPlan(true);
      // Anyone with settings worth prefilling has been here before, whether or
      // not their onboarded_at stamp was cleared for the re-run.
      if (s.hasSeenTour || s.onboardedAt || (s.restrictions || []).length) setReturning(true);
    }).catch(() => {});
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => {
    setNoAllergies(false);
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  };

  const declareNone = () => {
    const next = !noAllergies;
    setNoAllergies(next);
    if (next) { setRestrictions([]); setRestrictionsFree(''); }
  };

  // The question now has to be answered one way or the other. Not to be
  // officious — it is the only question here where silence is dangerous, and
  // the whole point of the button is to stop treating silence as an answer.
  const allergyAnswered = noAllergies || restrictions.length > 0 || restrictionsFree.trim().length > 0;

  // Real consequence, not flattery: this filters the same theme list the menu
  // generator uses, so the number shown is the number that actually applies.
  const allRestrictions = [...restrictions, restrictionsFree].join(' ');
  const { excluded } = themesExcludedBy(allRestrictions);

  const finish = async (wantsEmail?: boolean) => {
    const emailChoice = typeof wantsEmail === 'boolean' ? wantsEmail : autoPlan;
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familySize,
          restrictions: noAllergies ? [] : [...restrictions, ...restrictionsFree.split(',').map(s => s.trim()).filter(Boolean)],
          noAllergies,
          cookNights, weeknightMinutes, preferences,
          skipIngredients: skipIngredients.split(',').map(s => s.trim()).filter(Boolean),
          websites: websites.split(',').map(s => s.trim()).filter(Boolean),
          autoPlan: emailChoice,
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
              Step {step} of {TOTAL}
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
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>
                {returning ? 'Still the same allergies?' : 'Any allergies or absolute no-gos?'}
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                {returning
                  ? 'Here\'s what we have. Change anything that\'s out of date — these are never included, not as a variation, not as a garnish.'
                  : 'These are never included — not as a variation, not as a garnish.'}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_ALLERGIES.map(a => (
                  <Chip key={a} label={a} on={restrictions.includes(a)} onClick={() => toggle(restrictions, setRestrictions, a)} />
                ))}
              </div>
              <input value={restrictionsFree}
                onChange={e => { setRestrictionsFree(e.target.value); if (e.target.value) setNoAllergies(false); }}
                placeholder="Anything else? Separate with commas"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />

              {/* Set apart from the chips on purpose. It is not another allergy
                  to pick — it is the opposite answer, and it has to be as easy
                  to give as the list above. */}
              <button type="button" onClick={declareNone}
                className="w-full mt-4 rounded-xl px-4 py-3 text-sm text-left transition-all"
                style={{
                  border: `1px solid ${noAllergies ? 'var(--green)' : 'var(--border)'}`,
                  background: noAllergies ? 'var(--green-lt)' : 'transparent',
                  color: noAllergies ? 'var(--green)' : 'var(--text-2)',
                }}>
                <span style={{ marginRight: 8 }}>{noAllergies ? '✓' : '○'}</span>
                No allergies or restrictions in this family
              </button>
              {noAllergies && (
                <p className="text-xs mt-3 italic" style={{ color: 'var(--text-3)' }}>
                  Noted — and you can add one here or in Settings the moment anything changes.
                </p>
              )}
              {excluded.length > 0 && (
                <p className="text-sm mt-4 px-4 py-3 rounded-xl" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                  Noted — that takes {excluded.length} cooking {excluded.length === 1 ? 'direction' : 'directions'} off
                  the table, including {excluded.slice(0, 2).join(' and ')}. I won&apos;t suggest them.
                </p>
              )}
              <Nav disabled={!allergyAnswered} />
              {!allergyAnswered && (
                <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
                  Please answer this one — it&apos;s the only question here where I can&apos;t
                  safely guess.
                </p>
              )}
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
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>How much time do you have every night?</h1>
              <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>Recipes are chosen to genuinely fit — not squeezed to look like they do.</p>
              {/* Above the chips, not below them. This questionnaire replaced
                  thirty-five per-day decisions with two questions, which is right
                  — but only if people know the detail still exists, and anyone
                  who taps a time and hits Continue never scrolls past the
                  control. Below it, this would be read by nobody it is for. */}
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                One night different from the rest? Once you&apos;ve seen a week you can give
                any single day its own time, meal type or method — slow cooker, air fryer,
                grill — in{' '}
                <Link href="/settings?section=cooking-schedule" style={{ color: 'var(--green)', textDecoration: 'underline' }}>
                  Settings → Cooking Schedule
                </Link>.
              </p>
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
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Not allergies — just things nobody enjoys. Mushrooms, olives, blue cheese.
                I&apos;ll avoid recipes built around these, but still allow them as an optional garnish.
              </p>
              <input value={skipIngredients} onChange={e => setSkipIngredients(e.target.value)}
                placeholder="Separate with commas"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />
              <Nav />
            </>
          )}

          {step === 7 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>Where do you usually look for recipes?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                I&apos;ll cook in the spirit of the places you trust. Nothing is copied from them.
                List as many as you like, separated by commas.
              </p>
              <input value={websites} onChange={e => setWebsites(e.target.value)}
                placeholder="e.g. Serious Eats, Giallo Zafferano, Half Baked Harvest"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />
              <Nav />
            </>
          )}

          {step === 8 && (
            <>
              <h1 className="text-3xl mb-4" style={{ fontFamily: 'AbramoSerif, serif' }}>
                One last thing before I cook
              </h1>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
                This first week is my best guess. Tell me what you loved and what you&apos;d
                change, and I&apos;ll get to know your family and tailor the recipes to your
                taste.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                I only asked you a handful of questions; there are plenty more answers I&apos;ll take
                whenever you feel like giving them — favourite and unwanted sides, what&apos;s
                already in your cupboard, cups or grams, holidays, and a method for any
                single night — all in{' '}
                <Link href="/settings" style={{ color: 'var(--green)', textDecoration: 'underline' }}>
                  Settings
                </Link>.
              </p>
              <Nav />
            </>
          )}

          {step === 9 && (
            <>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>
                Shall I email you your week?
              </h1>
              <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
                The day before your week starts, I&apos;ll send the menu and the shopping
                list — so you don&apos;t have to remember to come back for it.
              </p>

              {/* Choosing and committing are two separate actions. A button that
                  both answers and submits means a mis-tap is a decision, on the
                  one screen where there is nothing after it to undo from. */}
              <div className="flex flex-col gap-2">
                {([[true, 'Yes, send me my week'], [false, 'No thanks — I\'ll open the app when I want it']] as const).map(([val, label]) => (
                  <button key={String(val)} type="button" onClick={() => setAutoPlan(val)}
                    className="rounded-xl px-5 py-3.5 text-sm text-left transition-all"
                    style={{
                      border: `1px solid ${autoPlan === val ? 'var(--green)' : 'var(--border)'}`,
                      background: autoPlan === val ? 'var(--green-lt)' : 'transparent',
                      color: autoPlan === val ? 'var(--green)' : 'var(--text-2)',
                    }}>
                    <span style={{ marginRight: 8 }}>{autoPlan === val ? '\u2713' : '\u25CB'}</span>
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                You can change your mind whenever you like:{' '}
                <Link href="/settings?section=weekly-email" style={{ color: 'var(--green)', textDecoration: 'underline' }}>
                  Settings &rarr; First Day of the Week
                </Link>{' '}
                has the switch, and every email has a one-tap link at the bottom that
                stops it for good.
              </p>

              {err && <p className="text-sm mt-4" style={{ color: '#C0392B' }}>{err}</p>}

              <div className="flex items-center gap-3 mt-8">
                <button onClick={() => setStep(s => s - 1)}
                  className="text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-60"
                  style={{ color: 'var(--text-3)' }}>&larr; Back</button>
                <button onClick={() => finish(autoPlan)} disabled={saving}
                  className="rounded-full px-7 py-3 text-sm text-white disabled:opacity-50"
                  style={{ background: 'var(--green)' }}>
                  {saving ? 'Saving\u2026' : 'Finish \u2014 see my first week'}
                </button>
              </div>
            </>
          )}
        </div>}
      </div>
    </>
  );
}
