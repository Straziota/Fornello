import PageBackground from '@/components/PageBackground';

export const metadata = {
  title: 'Privacy Policy — Fornello',
};

export default function PrivacyPage() {
  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      <div className="max-w-3xl mx-auto px-4 py-12" style={{ color: 'var(--text)' }}>
        <h1 className="text-[36px] md:text-[48px] leading-[1.05] tracking-[-0.02em] mb-2"
            style={{ fontFamily: 'AbramoSerif, serif' }}>
          Privacy Policy
        </h1>
        <p className="text-sm italic mb-10" style={{ color: 'var(--text-3)' }}>
          Last updated: May 14, 2026
        </p>

        <div className="space-y-6" style={{ lineHeight: 1.7 }}>
          <section>
            <h2 className="text-xl font-bold mb-2">Who we are</h2>
            <p style={{ color: 'var(--text-2)' }}>
              Fornello is a family meal-planning web app and a companion browser extension,
              operated by <strong>Chez Toi</strong>. For any privacy-related questions or
              requests, please contact Claudia Straziota at{' '}
              <a href="mailto:straziota1980@yahoo.com" style={{ color: 'var(--green)' }}>
                straziota1980@yahoo.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">What we collect</h2>
            <p style={{ color: 'var(--text-2)' }}>
              When you create an account, we store your email address and a securely hashed
              password. When you use the app, we store the data you create: meal plans, recipes,
              preferences, pantry items, feedback, and similar meal-planning content — all scoped
              to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">The browser extension</h2>
            <p style={{ color: 'var(--text-2)' }}>
              The Fornello Recipe Importer extension reads the recipe content of the web page
              you are actively viewing only when you click the extension icon. It sends that
              recipe (and optionally a translation request) to your Fornello account on
              www.fornello.app. The extension does not collect or transmit your browsing
              history, page contents from other tabs, or any data when you are not actively
              using it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">How we use your data</h2>
            <p style={{ color: 'var(--text-2)' }}>
              Your data is used solely to operate the Fornello service for you: generating
              meal plans, saving recipes, translating content, and remembering your preferences.
              Recipe content generated within the app may be added to an anonymous shared
              library that helps improve menu suggestions for all users; no personal information
              is attached.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Third parties we use</h2>
            <ul className="list-disc pl-6 space-y-1" style={{ color: 'var(--text-2)' }}>
              <li>Supabase — authentication and database storage</li>
              <li>Anthropic Claude — recipe generation and translation</li>
              <li>Pexels — recipe photo lookups</li>
              <li>Resend — outgoing email (recipe sharing)</li>
              <li>Vercel — application hosting</li>
            </ul>
            <p className="mt-2" style={{ color: 'var(--text-2)' }}>
              Each of these processors handles only the data necessary for their function.
              We do not sell or share your personal data for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Your rights</h2>
            <p style={{ color: 'var(--text-2)' }}>
              You can request export or deletion of your account and data at any time by
              emailing{' '}
              <a href="mailto:straziota1980@yahoo.com" style={{ color: 'var(--green)' }}>
                straziota1980@yahoo.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Changes to this policy</h2>
            <p style={{ color: 'var(--text-2)' }}>
              We may update this policy as the service evolves. The date at the top reflects
              the most recent revision.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
