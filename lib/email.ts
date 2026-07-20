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
