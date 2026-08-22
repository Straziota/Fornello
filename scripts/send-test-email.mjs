// Sends the real weekly menu email to one address, for deliverability testing.
// Uses a live menu so the test scores the actual HTML households would receive.
import { config } from 'dotenv';
// .env.local carries Supabase; the Resend credentials live only in Vercel, so a
// pulled production env is layered on top when one is given.
config({ path: '.env.local' });
if (process.env.ENV_FILE) config({ path: process.env.ENV_FILE, override: true });
const { sendWeeklyMenuEmail } = await import('../lib/email.ts');
const { createClient } = await import('@supabase/supabase-js');

const TO = process.argv[2];
if (!TO) { console.error('usage: node scripts/send-test-email.mjs <address>'); process.exit(1); }

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: menu } = await db.from('menus')
  .select('week_start, data').order('week_start', { ascending: false }).limit(1).maybeSingle();

const meals = (menu?.data?.meals || []).filter(m => !m.isLeftover);
const groceries = Object.entries(menu?.data?.grocery_list || {})
  .map(([category, items]) => ({ category, items: (items || []).map(i => i.item).filter(Boolean) }))
  .filter(g => g.items.length);

const app = 'https://www.fornello.app';
const token = 'deliverability-test';

console.log(`sending to ${TO}`);
console.log(`  week ${menu?.week_start} · ${meals.length} meals · ${groceries.length} aisles`);

await sendWeeklyMenuEmail(
  { resendApiKey: process.env.RESEND_API_KEY, fromEmail: process.env.INVITE_FROM_EMAIL || process.env.FROM_EMAIL,
    fromName: process.env.INVITE_FROM_NAME || 'Fornello' },
  TO,
  {
    meals, groceries,
    weekLabel: `Week of ${menu?.week_start}`,
    unsubscribeUrl: `${app}/unsubscribe?t=${token}`,
    appUrl: `${app}/this-week`,
    rateUrl: `${app}/api/rate?t=${token}`,
    shopUrl: `${app}/shop?t=${token}`,
  },
);
console.log(`  sent from ${process.env.INVITE_FROM_EMAIL || process.env.FROM_EMAIL}`);
