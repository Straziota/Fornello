import type { Metadata, Viewport } from 'next';
import { Lora, Inter, Dancing_Script } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';
import TourWrapper from '@/components/TourWrapper';
import { LanguageProvider } from '@/components/LanguageProvider';
import PageTourFloating from '@/components/PageTourFloating';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import NativeBridge from '@/components/NativeBridge';
import NativeAuthGate from '@/components/NativeAuthGate';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });
const dancing = Dancing_Script({ subsets: ['latin'], variable: '--font-dancing', weight: ['700'] });

export const metadata: Metadata = {
  title: 'Fornello — Family Meal Planner',
  description: 'Personalized weekly dinner planning for your family',
  appleWebApp: {
    // Launches full-screen from the iOS home screen instead of in Safari.
    capable: true,
    title: 'Fornello',
    // 'default' keeps dark status-bar text, which is what reads correctly
    // against the app's light parchment background.
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#F7F4EE',
  // Fill the whole screen including behind the notch and home indicator; the
  // safe-area padding in globals.css is what keeps content clear of them.
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  // Deliberately no maximumScale: the usual "stop iOS zooming on input focus"
  // trick also takes pinch-zoom away from anyone who needs it. globals.css
  // enforces 16px inputs instead, which fixes the same problem accessibly.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable} ${dancing.variable} min-h-screen`}
            style={{ color: 'var(--text)', fontFamily: 'Georgia, ui-serif, serif' }}>
        <NativeBridge />
        <NativeAuthGate />
        <ServiceWorkerRegistrar />
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
