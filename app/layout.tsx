import type { Metadata } from 'next';
import { Lora, Inter, Dancing_Script } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';
import TourWrapper from '@/components/TourWrapper';
import { LanguageProvider } from '@/components/LanguageProvider';
import PageTourFloating from '@/components/PageTourFloating';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });
const dancing = Dancing_Script({ subsets: ['latin'], variable: '--font-dancing', weight: ['700'] });

export const metadata: Metadata = {
  title: 'Fornello — Family Meal Planner',
  description: 'Personalized weekly dinner planning for your family',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable} ${dancing.variable} min-h-screen`}
            style={{ color: 'var(--text)', fontFamily: 'Georgia, ui-serif, serif' }}>
        <LanguageProvider>
          <TourWrapper>
            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
              <NavBar />
              <main className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8">
                {children}
              </main>
              <PageTourFloating />
            </div>
          </TourWrapper>
        </LanguageProvider>
      </body>
    </html>
  );
}
