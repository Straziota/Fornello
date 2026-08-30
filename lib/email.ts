import { Meal, UserRecipe } from './types';
import { Resend } from 'resend';

// Where replies land. The From address (hello@fornello.app) has no inbound MX,
// so without a Reply-To every reply bounces. Point replies at a real mailbox.
export const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'straziota1980@yahoo.com';

type Recipe = Partial<Meal> & Partial<UserRecipe> & { name: string };

function buildHtml(recipe: Recipe): string {
  const meta = [recipe.cuisine, recipe.total_time && `⏱ ${recipe.total_time}`, recipe.serves && `Serves ${recipe.serves}`].filter(Boolean).join('  ·  ');

  const ingredientRows = (recipe.ingredients || []).map(ing =>
    `<tr><td style="padding:6px 12px 6px 0;color:#4A7859;font-weight:bold;white-space:nowrap">${ing.amount || ''}</td><td style="padding:6px 0;color:#2F3A32">${ing.item}</td></tr>`
  ).join('');

  const instructionRows = (recipe.instructions || []).map((step, i) => {
    const clean = step.replace(/^Step \d+:\s*/i, '');
    return `<div style="display:flex;gap:12px;margin-bottom:12px"><span style="background:#4A7859;color:white;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold">${i+1}</span><span style="color:#2F3A32;line-height:1.6">${clean}</span></div>`;
  }).join('');

  const prepRows = (recipe.prep_ahead || []).map(tip =>
    `<div style="background:#EDF4EF;border-radius:8px;padding:10px 14px;margin-bottom:8px;color:#2F3A32"><span style="color:#4A7859;font-weight:bold">✓</span>  ${tip}</div>`
  ).join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F4EE;font-family:Georgia,serif">
  <div style="max-width:600px;margin:24px auto;background:white;border-radius:16px;overflow:hidden">
    <div style="background:#4A7859;padding:36px 40px">
      <div style="color:white;font-size:26px;font-weight:bold;margin-bottom:8px">${recipe.name}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px">${meta}</div>
    </div>
    <div style="padding:32px 40px">
      ${recipe.description ? `<p style="color:#5E6A61;font-style:italic;font-size:15px;margin:0 0 24px">${recipe.description}</p>` : ''}
      ${ingredientRows ? `<h2 style="color:#4A7859;font-size:16px;border-bottom:1px solid #E7E0D6;padding-bottom:8px">Ingredients</h2><table style="width:100%;margin-bottom:24px">${ingredientRows}</table>` : ''}
      ${instructionRows ? `<h2 style="color:#4A7859;font-size:16px;border-bottom:1px solid #E7E0D6;padding-bottom:8px">Instructions</h2><div style="margin-bottom:24px">${instructionRows}</div>` : ''}
      ${prepRows ? `<h2 style="color:#4A7859;font-size:16px;border-bottom:1px solid #E7E0D6;padding-bottom:8px">Prepare Ahead</h2><div style="margin-bottom:24px">${prepRows}</div>` : ''}
      <div style="background:#F7F4EE;border-radius:12px;padding:16px 20px;margin-top:24px">
        <p style="margin:0 0 6px;color:#2F3A32;font-size:14px"><strong>Import into Fornello</strong></p>
        <p style="margin:0;color:#5E6A61;font-size:13px">Double-click the attached <strong>.fornello</strong> file to import this recipe directly. No app? The PDF has everything you need.</p>
      </div>
    </div>
    <div style="background:#4A7859;padding:16px 40px;text-align:center;color:rgba(255,255,255,0.7);font-size:12px">Shared via Fornello · Fatto a Casa</div>
  </div></body></html>`;
}

export async function sendInviteEmail(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  inviterName: string,
) {
  const resend = new Resend(apiKey);
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F4EE;font-family:Georgia,serif">
    <div style="max-width:560px;margin:24px auto;background:white;border-radius:16px;overflow:hidden">
      <div style="background:#4A7859;padding:36px 40px;text-align:center">
        <div style="color:white;font-size:28px;font-weight:bold;margin-bottom:6px">You're invited 🍽</div>
        <div style="color:rgba(255,255,255,0.8);font-size:14px">to join the Fornello beta</div>
      </div>
      <div style="padding:36px 40px;color:#2F3A32;line-height:1.7">
        <p style="margin:0 0 16px;font-size:15px">Hi there,</p>
        <p style="margin:0 0 16px;font-size:15px">
          ${inviterName ? `<strong>${inviterName}</strong>` : 'Someone'} has invited you to be one of the first testers of
          <strong>Fornello</strong> — a family meal planner that creates personalised weekly menus,
          grocery lists, and recipes for your family.
        </p>
        <p style="margin:0 0 24px;font-size:15px">
          Your email is on the allowlist, so you can create your account right away.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="https://www.fornello.app/signup" target="_blank" rel="noopener" style="display:inline-block;background:#4A7859;color:#ffffff !important;text-decoration:none;padding:16px 36px;border-radius:999px;font-size:15px;font-weight:bold;letter-spacing:0.05em;mso-padding-alt:0">
            <!--[if mso]>&nbsp;&nbsp;&nbsp;&nbsp;<![endif]-->Create your account →<!--[if mso]>&nbsp;&nbsp;&nbsp;&nbsp;<![endif]-->
          </a>
        </div>
        <p style="margin:8px 0 0;font-size:13px;color:#5E6A61;text-align:center">
          Button not working? Open this link in your browser:<br/>
          <a href="https://www.fornello.app/signup" target="_blank" rel="noopener" style="color:#4A7859;word-break:break-all">https://www.fornello.app/signup</a>
        </p>
        <p style="margin:24px 0 0;font-size:13px;color:#5E6A61;font-style:italic">
          During the beta we'd love your feedback — what you like, what feels off, what's missing.
          You can always reach Claudia at <a href="mailto:straziota1980@yahoo.com" style="color:#4A7859">straziota1980@yahoo.com</a>.
        </p>
      </div>
      <div style="background:#4A7859;padding:14px 40px;text-align:center;color:rgba(255,255,255,0.7);font-size:12px">
        Fornello · operated by Chez Toi
      </div>
    </div></body></html>`;

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [toEmail],
    subject: `You're invited to test Fornello`,
    html,
  });
  if (error) throw new Error(error.message);
}

export async function sendHeritageContributorInvite(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  displayName: string,
) {
  const resend = new Resend(apiKey);
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F4EE;font-family:Georgia,serif">
    <div style="max-width:580px;margin:24px auto;background:white;border-radius:16px;overflow:hidden">
      <div style="background:#4A7859;padding:36px 40px;text-align:center">
        <div style="color:white;font-size:28px;font-weight:bold;margin-bottom:6px">You're invited 👵🍲</div>
        <div style="color:rgba(255,255,255,0.85);font-size:14px;font-style:italic">to share recipes in Fornello's Heritage Kitchen</div>
      </div>
      <div style="padding:36px 40px;color:#2F3A32;line-height:1.7">
        <p style="margin:0 0 16px;font-size:15px">Hi there,</p>
        <p style="margin:0 0 16px;font-size:15px">
          Claudia has invited you to contribute family recipes to <strong>Fornello's Heritage Kitchen</strong> —
          a growing collection of dishes shared by grandmothers around the world.
        </p>
        <div style="background:#FBF7F0;border-left:3px solid #C4A265;padding:14px 18px;margin:20px 0;border-radius:8px">
          <p style="margin:0;font-size:14px;color:#3D2714">
            Every recipe you submit will appear under the name
            <strong style="color:#8B6A42">${displayName}</strong>.
          </p>
        </div>
        <p style="margin:0 0 12px;font-size:15px"><strong>How it works:</strong></p>
        <ol style="margin:0 0 24px;padding-left:22px;font-size:14px;color:#3D2714">
          <li style="margin-bottom:6px">Sign in (or create a free account) at <a href="https://www.fornello.app" style="color:#4A7859">fornello.app</a></li>
          <li style="margin-bottom:6px">Visit <a href="https://www.fornello.app/heritage-kitchen/submit" style="color:#4A7859">fornello.app/heritage-kitchen/submit</a></li>
          <li style="margin-bottom:6px">Fill out the recipe form — your story, ingredients, instructions, any wisdom</li>
          <li>Claudia reviews each submission before it appears in Heritage Kitchen</li>
        </ol>
        <div style="text-align:center;margin:28px 0">
          <a href="https://www.fornello.app/heritage-kitchen/submit" target="_blank" rel="noopener" style="display:inline-block;background:#4A7859;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:bold;letter-spacing:0.05em">
            🥄 Share your first recipe →
          </a>
        </div>
        <p style="margin:24px 0 0;font-size:13px;color:#5E6A61;font-style:italic">
          Questions? Reply to this email or write Claudia at
          <a href="mailto:straziota1980@yahoo.com" style="color:#4A7859">straziota1980@yahoo.com</a>.
        </p>
      </div>
      <div style="background:#4A7859;padding:14px 40px;text-align:center;color:rgba(255,255,255,0.7);font-size:12px">
        Fornello · Heritage Kitchen · operated by Chez Toi
      </div>
    </div></body></html>`;

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [toEmail],
    subject: `You're invited to share recipes in Fornello's Heritage Kitchen`,
    html,
  });
  if (error) throw new Error(error.message);
}

export async function sendRecipeEmail(
  settings: { resendApiKey: string; fromEmail: string; fromName: string },
  toEmail: string,
  recipe: Recipe,
  pdfBuffer: Buffer,
  fornelloJson: string
) {
  const resend = new Resend(settings.resendApiKey);
  const safeName = recipe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const { error } = await resend.emails.send({
    from: `${settings.fromName || 'Fornello'} <${settings.fromEmail}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [toEmail],
    subject: `Recipe: ${recipe.name}`,
    html: buildHtml(recipe),
    attachments: [
      { filename: `${safeName}.pdf`, content: pdfBuffer },
      { filename: `${safeName}.fornello`, content: Buffer.from(fornelloJson) },
    ],
  });

  if (error) throw new Error(error.message);
}

// ── Weekly menu email ──────────────────────────────────────────────────────

interface WeekEmailMeal {
  day: string;
  name: string;
  description?: string;
  total_time?: string;
  prep_ahead?: string[];
  isLeftover?: boolean;
}

/**
 * The week itself, not an invitation to come and get it.
 *
 * A "your new week is ready!" nudge asks something of someone who hasn't
 * returned. This delivers the thing instead: the dinners, what to do the night
 * before, and the shopping list — useful in the inbox whether or not they ever
 * open the app. The single link is an offer, not the point.
 */
export async function sendWeeklyMenuEmail(
  settings: { resendApiKey: string; fromEmail: string; fromName: string },
  toEmail: string,
  data: {
    meals: WeekEmailMeal[];
    groceries: { category: string; items: string[] }[];
    weekLabel: string;
    unsubscribeUrl: string;
    appUrl: string;
    /** Base for one-click rating, already carrying the household token. */
    rateUrl?: string;
    /** The week's list, openable on a phone in the shop without logging in. */
    shopUrl?: string;
    /** Base for opening one dinner's full recipe, token already attached. */
    mealUrl?: string;
    /**
     * The week just finished, so it can be rated. Names only — the email asks
     * about the food, not the plan.
     */
    lastWeek?: { meals: string[]; rateUrl: string };
    /**
     * The week-one check-in, when this household is due one. Folded in here so
     * a subscriber gets one email that week instead of two — the questions ride
     * inside a message they already open for the food.
     */
    checkIn?: {
      /** True when the household has shown no sign of using any of this. */
      silent: boolean;
      questions: { observation: string; question: string }[];
      answerUrl: string;
    };
  },
) {
  const resend = new Resend(settings.resendApiKey);
  const esc = (s = '') => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));

  const cooking = data.meals.filter(m => !m.isLeftover);
  const prepNights = cooking.filter(m => (m.prep_ahead || []).length);

  const mealRows = cooking.map(m => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #EDE3D4;vertical-align:top;width:96px">
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8B6A42">${esc(m.day)}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #EDE3D4">
        <div style="font-family:Georgia,serif;font-size:17px">${
          data.mealUrl
            ? `<a href="${data.mealUrl}${encodeURIComponent(m.day)}" style="color:#3D2714;text-decoration:none;border-bottom:1px solid #EDE3D4">${esc(m.name)}</a>`
            : `<span style="color:#3D2714">${esc(m.name)}</span>`
        }</div>
        ${m.description ? `<div style="font-size:13px;color:#6B5B4B;margin-top:3px">${esc(m.description)}</div>` : ''}
        ${m.total_time ? `<div style="font-size:12px;color:#8B6A42;margin-top:4px">${esc(m.total_time)}</div>` : ''}
        ${''/* No rating links here. These are next week's dinners — nobody has
             cooked them yet, and "did you love this?" about a meal that has not
             happened is a question with no answer. The ask belongs on LAST
             week's food, which is below. */}
      </td>
    </tr>`).join('');

  // Last week's dinners, which they have actually eaten.
  //
  // External ratings have been zero since launch, and the reason was probably
  // structural rather than apathy: the only rating links Fornello ever sent
  // were attached to food nobody had cooked yet. This asks about the week just
  // finished, inside the message they open for the week ahead — the one moment
  // a household is already thinking about dinner.
  //
  // Three answers, not two. "We changed it" is the commonest truth about a
  // family recipe, and forcing it into loved-or-never loses the useful half.
  const lastWeekBlock = data.lastWeek?.meals?.length ? `
      <div style="border-top:1px solid #EDE3D4;margin-top:32px;padding-top:26px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#9A8B7B">
          Last week
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#6B5B4B;line-height:1.6">
          How did these go? One tap each — it is how next week gets closer to your family.
        </p>
        ${data.lastWeek.meals.map(name => `
          <div style="padding:10px 0;border-bottom:1px solid #F3EDE2">
            <div style="font-size:15px;color:#3D2714;margin-bottom:6px">${esc(name)}</div>
            <div>
              <a href="${data.lastWeek!.rateUrl}&m=${encodeURIComponent(name)}&r=liked"
                 style="font-size:12px;color:#4A7859;text-decoration:none;margin-right:14px">👍 Loved it</a>
              <a href="${data.lastWeek!.rateUrl}&m=${encodeURIComponent(name)}&r=liked_adjusted"
                 style="font-size:12px;color:#8B6A42;text-decoration:none;margin-right:14px">✏️ Good, but I changed it</a>
              <a href="${data.lastWeek!.rateUrl}&m=${encodeURIComponent(name)}&r=disliked"
                 style="font-size:12px;color:#B4796A;text-decoration:none">👎 Never again</a>
            </div>
          </div>`).join('')}
      </div>` : '';

  const prepBlock = prepNights.length ? `
    <h2 style="font-family:Georgia,serif;font-size:15px;color:#3D2714;margin:32px 0 10px">Prep ahead</h2>
    ${prepNights.map(m => `
      <div style="margin-bottom:10px">
        <div style="font-size:12px;color:#8B6A42">${esc(m.day)} — ${
          data.mealUrl
            ? `<a href="${data.mealUrl}${encodeURIComponent(m.day)}&tab=prep" style="color:#8B6A42;text-decoration:none;border-bottom:1px solid #EDE3D4">${esc(m.name)}</a>`
            : esc(m.name)
        }</div>
        <ul style="margin:4px 0 0;padding-left:18px;color:#6B5B4B;font-size:13px">
          ${(m.prep_ahead || []).map(p => `<li style="margin-bottom:2px">${esc(p)}</li>`).join('')}
        </ul>
      </div>`).join('')}` : '';

  // An empty "Your shopping list" heading reads as broken. Three of six
  // households in the first dry run had a menu but no generated grocery list.
  const groceryBlock = data.groceries.length ? `
    <div style="margin:32px 0 12px">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="font-family:Georgia,serif;font-size:15px;color:#3D2714;vertical-align:middle">Your shopping list</td>
        ${data.shopUrl ? `<td style="text-align:right;vertical-align:middle">
          <a href="${data.shopUrl}" style="display:inline-block;background:#4A7859;color:#fff;text-decoration:none;padding:8px 16px;border-radius:999px;font-size:12px;white-space:nowrap">
            Open on my phone
          </a>
        </td>` : ''}
      </tr></table>
      ${data.shopUrl ? `<div style="font-size:11px;color:#9A8B7B;margin-top:5px">Tick things off as you shop — no login needed</div>` : ''}
    </div>
    ${data.groceries.map(g => `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8B6A42;margin-bottom:4px">${esc(g.category)}</div>
        <div style="font-size:13px;color:#6B5B4B;line-height:1.7">${g.items.map(esc).join(' · ')}</div>
      </div>`).join('')}` : '';

  // The week-one check-in, folded into a message they already open for the
  // food, rather than sent as a second email in the same week. It rides along
  // ONLY for households that have a weekly email — everyone else still gets it
  // standalone, because the households most in need of a check-in are precisely
  // the ones not subscribed to anything.
  // No signature here, unlike the standalone version. This sits under a
  // Fornello letterhead — logo, week label, seven dinners — and a personal
  // sign-off beneath all that reads as a mismatch rather than as a person. The
  // standalone note has no branding to argue with, so it keeps the signature.
  //
  // "Just reply" is honest on both: every Fornello email sets Reply-To to a
  // real mailbox.
  //
  // Leads with the not-knowing, never with what Fornello has done. Anything
  // shaped like "I've planned these for you and heard nothing back" is a ledger
  // of effort presented before asking for something, which reads as an invoice
  // however gently it is phrased.
  //
  // And three named options rather than an open question: "did it work?" asks
  // someone to compose a sentence, while useful/wrong/badly-timed can be
  // answered in one word. For a household that has not opened the app in weeks,
  // that difference decides whether there is a reply at all.
  const checkInBlock = data.checkIn?.silent ? `
      <div style="border-top:1px solid #EDE3D4;margin-top:30px;padding-top:26px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#9A8B7B">
          Before you go
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#3D2714;line-height:1.65">
          Has Fornello been useful, wrong, or just badly timed?
        </p>
        <p style="margin:0;font-size:15px;color:#6B5B4B;line-height:1.65">
          One word is plenty — just reply.
        </p>
      </div>` : data.checkIn?.questions?.length ? `
      <div style="border-top:1px solid #EDE3D4;margin-top:30px;padding-top:26px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#9A8B7B">
          Before you go
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#3D2714;line-height:1.6">
          Your first week was my best guess. Here's what I've noticed since — tell me
          if I read it right, and I'll remember it for every week after.
        </p>
        ${data.checkIn.questions.map(q => `
          <div style="background:#F7F4EE;border-radius:12px;padding:14px 18px;margin:0 0 10px">
            <p style="margin:0 0 4px;font-size:12px;color:#9A8B7B;line-height:1.5">${esc(q.observation)}</p>
            <p style="margin:0;font-size:15px;color:#3D2714">${esc(q.question)}</p>
          </div>`).join('')}
        <div style="text-align:center;margin-top:16px">
          <a href="${data.checkIn.answerUrl}" style="display:inline-block;background:#4A7859;color:#fff;text-decoration:none;padding:11px 26px;border-radius:999px;font-size:13px">
            Answer these
          </a>
        </div>
      </div>` : '';

  const html = `
  <div style="background:#FBF7F0;padding:28px 0;font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;padding:36px">
      <div style="text-align:center;margin-bottom:26px">
        <div style="font-family:Georgia,serif;font-size:26px;color:#3D2714">Fornello</div>
        <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#8B6A42;margin-top:4px">${esc(data.weekLabel)}</div>
      </div>

      <p style="font-size:14px;color:#6B5B4B;line-height:1.6;margin:0 0 18px">
        Here's what you're cooking this week — ${cooking.length} ${cooking.length === 1 ? 'dinner' : 'dinners'}.
        Everything you need is below, so you don't have to open anything.
      </p>

      <table style="width:100%;border-collapse:collapse">${mealRows}</table>
      ${prepBlock}
      ${groceryBlock}

      ${lastWeekBlock}
      ${checkInBlock}

      <div style="text-align:center;margin-top:34px">
        <a href="${data.appUrl}" style="font-size:13px;color:#8B6A42">Change something, or plan next week</a>
      </div>

      <p style="font-size:12px;color:#9A8B7B;line-height:1.6;margin:26px 0 0;text-align:center">
        Tell Fornello what you loved and what you'd change — that's how the plans get closer to your family each week.
      </p>
    </div>

    <div style="max-width:600px;margin:14px auto 0;text-align:center">
      <a href="${data.unsubscribeUrl}" style="font-size:11px;color:#9A8B7B">Stop sending me this</a>
    </div>
  </div>`;

  const { error } = await resend.emails.send({
    from: `${settings.fromName || 'Fornello'} <${settings.fromEmail}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [toEmail],
    subject: `This week: ${cooking.slice(0, 3).map(m => m.name).join(', ')}${cooking.length > 3 ? '…' : ''}`,
    html,
    headers: {
      // One-click unsubscribe, honoured by Gmail and Apple Mail without opening.
      'List-Unsubscribe': `<${data.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  if (error) throw new Error(error.message);
}

/**
 * "Still want these?" — one question, two buttons, nothing else.
 *
 * Sent after several weeks with no click, instead of silently pausing. Pausing
 * is a guess about someone's behaviour; this is an answer from them. Someone who
 * reads the email every Sunday and cooks from it without ever tapping will
 * happily tap once when asked directly — and a tracking pixel could never have
 * told us apart from someone who stopped caring, because Apple Mail Privacy
 * Protection pre-fetches images and would have reported them both as engaged.
 */
export async function sendCheckInEmail(
  settings: { resendApiKey: string; fromEmail: string; fromName: string },
  toEmail: string,
  data: { weeksSent: number; yesUrl: string; noUrl: string; unsubscribeUrl: string },
) {
  const resend = new Resend(settings.resendApiKey);

  const html = `
  <div style="background:#FBF7F0;padding:28px 0;font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:40px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:24px;color:#3D2714;margin-bottom:20px">Still want your week on Sundays?</div>

      <p style="font-size:15px;color:#6B5B4B;line-height:1.65;margin:0 0 16px">
        Your menu's been arriving for ${data.weeksSent} weeks. If it's useful, do nothing — it'll keep coming.
      </p>
      <p style="font-size:15px;color:#6B5B4B;line-height:1.65;margin:0 0 28px">
        If it isn't, one tap stops it. Your recipes and family kitchens stay exactly where they are.
      </p>

      <div>
        <a href="${data.yesUrl}" style="display:inline-block;background:#4A7859;color:#fff;text-decoration:none;padding:13px 30px;border-radius:999px;font-size:14px;margin:0 6px 10px">
          Keep them coming
        </a>
        <a href="${data.noUrl}" style="display:inline-block;color:#8B6A42;text-decoration:none;padding:13px 26px;border:1px solid #EDE3D4;border-radius:999px;font-size:14px;margin:0 6px 10px">
          Stop sending
        </a>
      </div>
    </div>
    <div style="max-width:520px;margin:14px auto 0;text-align:center">
      <a href="${data.unsubscribeUrl}" style="font-size:11px;color:#9A8B7B">Stop all Fornello email</a>
    </div>
  </div>`;

  const { error } = await resend.emails.send({
    from: `${settings.fromName || 'Fornello'} <${settings.fromEmail}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [toEmail],
    subject: 'Still want your week on Sundays?',
    html,
    headers: {
      'List-Unsubscribe': `<${data.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  if (error) throw new Error(error.message);
}

/**
 * The week-one check-in. Sent seven days after a household's first menu.
 *
 * Email, not in-app: an in-app check-in reaches only the people who came back,
 * which is exactly the wrong half. The households this exists for are the ones
 * drifting, and they are not opening the app.
 *
 * Two shapes. A household that used the week gets up to three questions drawn
 * from what actually happened — never a questionnaire, and never a list of
 * settings. A household that did nothing gets no tuning at all: one honest
 * question, and a reply that comes straight back to a person.
 */
export async function sendWeekOneCheckIn(
  settings: { resendApiKey: string; fromEmail: string; fromName: string },
  toEmail: string,
  data: {
    silent: boolean;
    questions: { id: string; observation: string; question: string; answers: { label: string }[] }[];
    suggestion: { title: string; body: string; cta: string; path: string } | null;
    answerUrl: string;       // token-authenticated, one screen, one tap per answer
    unsubscribeUrl: string;
  },
) {
  const resend = new Resend(settings.resendApiKey);

  const shell = (inner: string) => `
  <div style="background:#FBF7F0;padding:28px 0;font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:40px">${inner}</div>
    <div style="max-width:560px;margin:14px auto 0;text-align:center">
      <a href="${data.unsubscribeUrl}" style="font-size:11px;color:#9A8B7B">Stop sending me this</a>
    </div>
  </div>`;

  if (data.silent) {
    throw new Error('Silent households go through sendSilenceCheckIn, not this.');
  }

  const questions = data.questions.map(q => `
    <div style="background:#F7F4EE;border-radius:12px;padding:16px 20px;margin:0 0 12px">
      <p style="margin:0 0 6px;font-size:13px;color:#9A8B7B;line-height:1.5">${q.observation}</p>
      <p style="margin:0;font-size:16px;color:#3D2714">${q.question}</p>
    </div>`).join('');

  const suggestion = data.suggestion ? `
    <div style="border-top:1px solid #EDE3D4;margin-top:28px;padding-top:24px">
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#9A8B7B">
        Something you haven't tried
      </p>
      <p style="margin:0 0 6px;font-size:16px;color:#3D2714">${data.suggestion.title}</p>
      <p style="margin:0 0 14px;font-size:14px;color:#6B5B4B;line-height:1.6">${data.suggestion.body}</p>
      <a href="${data.suggestion.path}" style="font-size:14px;color:#4A7859">${data.suggestion.cta} &rarr;</a>
    </div>` : '';

  const html = shell(`
    <div style="font-size:23px;color:#3D2714;margin-bottom:18px;line-height:1.3">
      Here's what I noticed
    </div>
    <p style="font-size:15px;color:#6B5B4B;line-height:1.7;margin:0 0 22px">
      Week one was my best guess. Tell me if I read it right — each of these is one
      tap, and I'll remember it for every week after.
    </p>
    ${questions}
    <div style="text-align:center;margin:26px 0 0">
      <a href="${data.answerUrl}" style="display:inline-block;background:#4A7859;color:#fff;text-decoration:none;padding:13px 30px;border-radius:999px;font-size:14px">
        Answer these
      </a>
    </div>
    ${suggestion}`);

  const { error } = await resend.emails.send({
    from: `${settings.fromName || 'Fornello'} <${settings.fromEmail}>`,
    replyTo: REPLY_TO_EMAIL, to: [toEmail],
    subject: "Week one — here's what I noticed", html,
    headers: {
      'List-Unsubscribe': `<${data.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  if (error) throw new Error(error.message);
}

/**
 * The two silence emails: one for a household a week in, one for a household
 * months gone.
 *
 * Deliberately not built on the Fornello template. Both are four lines signed
 * by a person, and wrapping four lines in a branded card with a logo and a
 * green header would make them look like campaigns — which is exactly what
 * someone who has stopped using a product ignores. The formatting is plain
 * because the message is personal, and that is the whole mechanism.
 *
 * Three named options rather than an open question: "did it work?" asks for a
 * composed sentence, useful/wrong/badly-timed can be answered in one word. For
 * someone who has not opened the app in months, that difference decides whether
 * there is a reply at all.
 */
export async function sendSilenceCheckIn(
  settings: { resendApiKey: string; fromEmail: string; fromName: string },
  toEmail: string,
  data: { variant: 'week-one' | 'long-silent'; unsubscribeUrl: string },
) {
  const resend = new Resend(settings.resendApiKey);

  const weekOne = data.variant === 'week-one';
  const subject = weekOne ? 'How was your first week?' : 'Fornello';
  const opening = weekOne
    ? 'Has Fornello been useful, wrong, or just badly timed?'
    : "I'm curious what happened after you tried Fornello: useful, wrong, or just bad timing?";

  const html = `
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2F3A32;line-height:1.6;max-width:520px;margin:0 auto;padding:24px">
    <p style="margin:0 0 18px">${opening}</p>
    <p style="margin:0 0 18px">One word is plenty.</p>
    <p style="margin:0">&mdash; Claudia</p>
    <p style="margin:34px 0 0;font-size:11px;color:#9A8B7B">
      <a href="${data.unsubscribeUrl}" style="color:#9A8B7B">Stop emails from Fornello</a>
    </p>
  </div>`;

  const { error } = await resend.emails.send({
    from: `${settings.fromName || 'Fornello'} <${settings.fromEmail}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [toEmail],
    subject,
    html,
    headers: {
      'List-Unsubscribe': `<${data.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  if (error) throw new Error(error.message);
}
