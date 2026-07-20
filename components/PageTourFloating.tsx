'use client';
import { usePathname } from 'next/navigation';
import PageTourButton, { PAGE_TOURS } from './PageTour';

// Hide on these (unauthenticated / non-tutorial) routes
const HIDDEN_PATHS = ['/login', '/signup', '/privacy', '/admin'];

export default function PageTourFloating() {
  const pathname = usePathname() || '';
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;
  if (!PAGE_TOURS[pathname]) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 100,
    }}>
      <PageTourButton />
    </div>
  );
}
