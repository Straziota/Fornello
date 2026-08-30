import { adminClient } from './supabase-admin';

/**
 * The handful of numbers that decide whether Fornello is a business.
 *
 * Deliberately excludes signups, MAU, DAU, session length and recipes
 * generated. At seventeen households those are noise dressed as progress, and
 * session length is worse than noise: the auto-plan email exists so that people
 * never open the product at all, so any metric rewarding time-on-site would be
 * measuring the opposite of success. A number on a dashboard becomes a goal
 * whether or not anyone decided it should.
 */

/** Accounts that belong to the operator, excluded from "external" figures. */
const INTERNAL = ['straziota1980@yahoo.com', 'admin@cheztoi.us', 'istraziota@me.com'];

export interface Threshold {
  /** What this would have to read to keep going. */
  keepGoing: string;
  /** What would make you stop. */
  stop: string;
}

export interface Metric {
  key: string;
  label: string;
  value: string;
  detail: string;
  /** null when there is genuinely nothing to judge yet. */
  threshold?: Threshold;
}

export interface FunnelRow {
  email: string;
  internal: boolean;
  joined: string;
  onboarded: boolean;
  firstMenu: string | null;
  menus: number;
  /** Menus the household generated, or opened after Fornello sent them. */
  humanMenus: number;
  secondMenu: boolean;
  autoPlanned: number;
  autoPlannedOpened: number;
  ratings: number;
  groceriesOpened: boolean | null;
  swaps: number;
  autoPlan: boolean;
  checkInSent: boolean;
  /** Where this household stopped — the first gate it did not pass. */
  stalledAt: string;
  minutesToFirstMenu: number | null;
}

export interface Traction {
  generatedAt: string;
  tier1: Metric[];
  tier2: Metric[];
  tier3: Metric[];
  funnel: FunnelRow[];
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

export async function computeTraction(): Promise<Traction> {
  const db = adminClient;
  const [{ data: list }, { data: settings }, { data: menus }, { data: feedback }, { data: usage }] =
    await Promise.all([
      db.auth.admin.listUsers({ perPage: 1000 }),
      db.from('settings').select('*'),
      db.from('menus').select('*'),
      db.from('meal_feedback').select('user_id, rating'),
      db.from('ai_usage').select('user_id, cost_usd, feature, payer'),
    ]);

  const users = list?.users || [];
  const email = Object.fromEntries(users.map((u: any) => [u.id, (u.email || '').toLowerCase()]));
  const settingsBy = Object.fromEntries((settings || []).map((s: any) => [s.user_id, s]));

  const menusBy: Record<string, any[]> = {};
  for (const m of menus || []) (menusBy[m.user_id] ||= []).push(m);
  for (const k of Object.keys(menusBy)) {
    menusBy[k].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }

  const ratingsBy: Record<string, number> = {};
  for (const f of feedback || []) ratingsBy[f.user_id] = (ratingsBy[f.user_id] || 0) + 1;

  const funnel: FunnelRow[] = users.map((u: any) => {
    const s = settingsBy[u.id];
    const ms = menusBy[u.id] || [];
    const first = ms[0];
    const internal = INTERNAL.includes(email[u.id]);
    const minutes = first
      ? Math.round((new Date(first.created_at).getTime() - new Date(u.created_at).getTime()) / 60000)
      : null;

    // The first gate this household did not pass.
    //
    // Menus are checked BEFORE onboarding, which looks backwards and is not.
    // Every account was reset on 24 Aug so everyone would see the rebuilt
    // questionnaire, which set onboarded_at to null — including households that
    // had already generated menus. Reading that as "never finished onboarding"
    // told the wrong story about the people furthest along: J O'Connor
    // generated a week, and the honest stall is that he never came back.
    const stalledAt =
      !s ? 'never opened the app'
      : ms.filter(m => !m.auto_planned || m.engaged_at).length >= 2
        ? ((ratingsBy[u.id] || 0) === 0 ? 'returning, but never rated anything' : '—')
      : ms.filter(m => !m.auto_planned || m.engaged_at).length === 1
        ? ((Date.now() - new Date(first.created_at).getTime()) / 86_400_000 < 7
            ? 'first week in progress'
            : 'one menu, never came back')
      : !s.onboarded_at ? 'signed up, never finished onboarding'
      : 'onboarded, never generated a menu';

    return {
      email: email[u.id] || u.id,
      internal,
      joined: String(u.created_at).slice(0, 10),
      onboarded: Boolean(s?.onboarded_at),
      firstMenu: first ? String(first.created_at).slice(0, 10) : null,
      menus: ms.length,
      // A "return" has to be something a HUMAN did.
      //
      // Counting menus alone counts the weeks Fornello planned and emailed
      // unprompted, so the retention number would climb every Sunday whether or
      // not a single household came back — the auto-plan feature marking its own
      // homework. A menu counts only if the household generated it themselves,
      // or opened one Fornello made for them.
      humanMenus: ms.filter(m => !m.auto_planned || m.engaged_at).length,
      secondMenu: ms.filter(m => !m.auto_planned || m.engaged_at).length >= 2,
      autoPlanned: ms.filter(m => m.auto_planned).length,
      autoPlannedOpened: ms.filter(m => m.auto_planned && m.engaged_at).length,
      ratings: ratingsBy[u.id] || 0,
      groceriesOpened:
        !first || String(first.created_at).slice(0, 10) < '2026-08-24'
          ? null                                  // nothing was recording yet
          : Boolean(first.groceries_opened_at),
      swaps: ms.reduce((n, m) => n + (Number(m.swaps) || 0), 0),
      autoPlan: Boolean(s?.auto_plan),
      checkInSent: Boolean(s?.week_one_checkin_sent_at),
      stalledAt,
      minutesToFirstMenu: minutes,
    };
  }).sort((a, b) => b.joined.localeCompare(a.joined));

  const ext = funnel.filter(r => !r.internal);
  const extWithMenu = ext.filter(r => r.menus > 0);
  const extSecond = ext.filter(r => r.secondMenu);
  // Only households whose first week has actually elapsed can have returned for
  // a second. Counting today's five signups as failures would make the number
  // look worse every time someone new arrives, which is exactly backwards.
  const extDue = extWithMenu.filter(r => r.firstMenu && (Date.now() - new Date(r.firstMenu).getTime()) / 86_400_000 >= 7);
  const extRatings = ext.reduce((n, r) => n + r.ratings, 0);
  const internalRatings = funnel.filter(r => r.internal).reduce((n, r) => n + r.ratings, 0);

  // Only menus generated since grocery-open instrumentation can answer this. A
  // menu from July has groceries_opened_at NULL because nothing was recording,
  // not because nobody opened the list — counting those as "not opened" would
  // understate the number and look like evidence.
  const INSTRUMENTED_FROM = '2026-08-24';
  const measurable = ext.filter(r => r.firstMenu && r.firstMenu >= INSTRUMENTED_FROM);
  const cooked = measurable.filter(r => r.groceriesOpened);

  const medianMinutes = (() => {
    const v = extWithMenu.map(r => r.minutesToFirstMenu).filter((n): n is number => n != null).sort((a, b) => a - b);
    if (!v.length) return null;
    return v[Math.floor(v.length / 2)];
  })();

  const tier1: Metric[] = [
    {
      key: 'week2',
      label: 'Week-2 return rate',
      value: `${extSecond.length} / ${extDue.length}`,
      detail: `Households whose first week has elapsed, and how many came back for a second. Counts only weeks a person caused — generated themselves, or opened after Fornello sent them — so the auto-plan cron cannot mark its own homework. ${extWithMenu.length - extDue.length} more are still inside week one and are not counted yet.`,
      threshold: {
        keepGoing: 'Any non-zero at all is the first real signal. Roughly a third of first-menu households returning means the product works.',
        stop: 'Twenty external households through a fixed onboarding, and still zero second menus.',
      },
    },
    {
      key: 'ratings',
      label: 'External ratings',
      value: `${extRatings}`,
      detail: `From anyone who isn't you. ${internalRatings} internal ratings are excluded. The first non-zero means the engine is being fed by someone other than its author.`,
      threshold: {
        keepGoing: 'The first one. It is the moment week four can be better than week one for someone else.',
        stop: 'Households returning for second menus but still never rating — the compounding claim has no fuel.',
      },
    },
    {
      key: 'signup-to-menu',
      label: 'Signup → first menu',
      value: `${extWithMenu.length} / ${ext.length} · ${pct(extWithMenu.length, ext.length)}`,
      detail: 'The dead end that used to lose most people before they saw any food.',
      threshold: {
        keepGoing: 'Most new invites reaching a menu. Anything near 80% means the flow lands people in one sitting.',
        stop: 'Still under a third after the rebuilt onboarding — the problem is upstream of the product.',
      },
    },
  ];

  const tier2: Metric[] = [
    {
      key: 'menu-to-kitchen',
      label: 'Menu → kitchen',
      value: measurable.length ? `${cooked.length} / ${measurable.length}` : 'no data yet',
      detail: 'First menus where the shopping list was actually opened — separating a menu that was looked at from one that was cooked from. Only menus from 24 Aug 2026 count: before that nothing was recording, so an empty value means "unknown", not "no".',
    },
    {
      key: 'time-to-menu',
      label: 'Time to first menu (median)',
      value: medianMinutes == null ? '—' : medianMinutes < 90 ? `${medianMinutes} min` : `${Math.round(medianMinutes / 60)} hr`,
      detail: 'Should be minutes. Hours or days means people are leaving and coming back, so the flow is not landing them in one sitting.',
    },
    {
      key: 'feedback-rate',
      label: 'Feedback actions per external household',
      value: ext.length ? (extRatings / ext.length).toFixed(1) : '0',
      detail: 'The engine’s fuel gauge. Not "did they rate once" — the rate.',
    },
  ];

  const spend = (usage || []).reduce((n: number, r: any) => n + Number(r.cost_usd || 0), 0);
  const company = (usage || []).filter((r: any) => r.payer === 'company')
    .reduce((n: number, r: any) => n + Number(r.cost_usd || 0), 0);
  const illustration = (usage || []).filter((r: any) => r.feature === 'illustration')
    .reduce((n: number, r: any) => n + Number(r.cost_usd || 0), 0);

  const tier3: Metric[] = [
    { key: 'cost', label: 'AI cost per household', value: ext.length ? `$${(spend / ext.length).toFixed(2)}` : '—',
      detail: `$${spend.toFixed(2)} total across all features.` },
    { key: 'company', label: 'Company-paid', value: `$${company.toFixed(2)}`,
      detail: `Of which $${illustration.toFixed(2)} is illustrations.` },
    { key: 'autoplan', label: 'Auto-plan opt-in', value: `${ext.filter(r => r.autoPlan).length} / ${ext.filter(r => r.onboarded).length}`,
      detail: 'Among external households that finished onboarding and therefore saw the offer.' },
    { key: 'autoplan-opened',
      label: 'Auto-planned weeks opened',
      value: `${ext.reduce((n, r) => n + r.autoPlannedOpened, 0)} / ${ext.reduce((n, r) => n + r.autoPlanned, 0)}`,
      detail: 'Weeks Fornello planned and emailed, and how many were actually opened. This is the auto-plan feature working or not — a sent week nobody opens is a menu written to nobody.' },
    { key: 'checkins', label: 'Check-ins sent', value: `${ext.filter(r => r.checkInSent).length}`,
      detail: 'Week-one and long-silent notes, by either path.' },
  ];

  return { generatedAt: new Date().toISOString(), tier1, tier2, tier3, funnel };
}
