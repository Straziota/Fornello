'use client';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { createBrowser } from '@/lib/supabase';

// For 3+ word nav labels, join the first two words with a non-breaking space so
// "On the Fly" wraps as "On the / Fly" instead of "On / the / Fly".
function formatNavLabel(label: string): string {
  const words = label.split(' ');
  if (words.length <= 2) return label;
  return words[0] + ' ' + words.slice(1).join(' ');
}

export default function NavBar() {
  const path = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [userName, setUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const links = [
    { href: '/this-week',        label: `🍽 ${t.thisWeek}`,        icon: '/icons/this-week.png',       tour: 'tour-nav-thisweek', sz: 152 },
    { href: '/groceries',        label: `🛒 ${t.groceries}`,       icon: '/icons/groceries.png',       tour: 'tour-nav-groceries', sz: 112 },
    { href: '/pantry',           label: `🥫 ${t.pantry}`,          icon: '/icons/pantry-v2.png',       sz: 152 },
    { href: '/recipes',          label: `📖 ${t.recipes}`,         icon: '/icons/my-recipes.png',      sz: 152 },
    { href: '/heritage-kitchen', label: `👵 ${t.heritageKitchen || 'Heritage Kitchen'}`, icon: '/icons/nonnas-kitchen.png',  tour: 'tour-nav-nonnas', sz: 112 },
    { href: '/special-occasion', label: `🥂 ${t.specialOccasion}`, icon: '/icons/special-occasion.png', sz: 112 },
    { href: '/on-the-fly',       label: `🎲 ${t.onTheFly}`,        icon: '/icons/On the fly.png',      tour: 'tour-nav-onthefly', sz: 112 },
    { href: '/something-sweet',  label: `🍰 ${t.somethingSweet}`,  icon: '/icons/something-sweet.png', sz: 112 },
    { href: '/traditions',       label: `🌍 ${t.traditions}`,      icon: '/icons/traditions.png',      sz: 112 },
    { href: '/find-a-recipe',    label: `🔍 ${t.findARecipe}`,     icon: '/icons/find-a-recipe.png',   sz: 112 },
    { href: '/history',          label: `📅 ${t.archive}`,         icon: '/icons/Archive.png',         sz: 112 },
    { href: '/converter',        label: `⚖️ Converter`,            icon: '/icons/Conversions.png',     sz: 112 },
    { href: '/feedback',         label: `💬 Feedback`,             icon: '/icons/Feedback.png',         sz: 112 },
    { href: '/settings',         label: `⚙️ ${t.settings}`,                                            tour: 'tour-nav-settings' },
  ];

  useEffect(() => {
    const supabase = createBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.user_metadata?.full_name || data.user?.email || '');
    });
    fetch('/api/admin/check').then(r => r.json()).then(d => setIsAdmin(d.isAdmin)).catch(() => {});
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [path]);

  const signOut = async () => {
    const supabase = createBrowser();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const linkStyle = (href: string) => ({
    fontFamily: 'AbramoSerif, serif',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    background: path === href ? 'rgba(255,255,255,0.7)' : 'transparent',
    color: '#1a1a1a',
    textDecoration: 'none',
    border: path === href ? '1px solid var(--border)' : '1px solid transparent',
  });

  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm"
            style={{ background: 'rgba(247,244,238,0.92)', borderBottom: '1px solid var(--border-2)' }}>

      <div className="w-full px-6 h-52 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img src="/Fornello Logo.png" alt="Fornello" style={{ height: '140px', width: 'auto', display: 'block' }} />
        </Link>

        {/* Desktop nav */}
        <nav data-tour="tour-navbar" className="hidden md:flex items-center gap-0.5 flex-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="px-2 py-2 rounded-xl transition-all flex flex-col items-center"
              data-tour={(l as any).tour}
              style={{ ...linkStyle(l.href), gap: 0 }}>
              <div style={{ height: '152px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
                {l.icon
                  ? <NextImage src={l.icon} alt="" width={(l as any).sz ?? 64} height={(l as any).sz ?? 64} style={{ objectFit: 'cover', borderRadius: '10px' }} />
                  : <span style={{ fontSize: '64px', lineHeight: 1 }}>{l.label.split(' ')[0]}</span>}
              </div>
              <span style={{ fontSize: '16px', letterSpacing: '0.06em', maxWidth: '72px', textAlign: 'center', lineHeight: '1.3', minHeight: '2.6em', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginTop: '-8px' }}>{formatNavLabel(l.label.replace(/^[^\s]+ /, ''))}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin"
              className="ml-1 px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-70"
              style={{ color: path.startsWith('/admin') ? 'var(--green)' : 'var(--text-3)', border: '1px solid var(--border)', fontFamily: 'AbramoSerif, serif', background: path.startsWith('/admin') ? 'rgba(255,255,255,0.7)' : 'transparent' }}>
              🛠 Admin
            </Link>
          )}
          {userName && (
            <button onClick={signOut}
              className="ml-2 px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-3)', border: '1px solid var(--border)', fontFamily: 'AbramoSerif, serif' }}>
              {t.signOut}
            </button>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button className="md:hidden flex flex-col gap-1.5 p-2"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Menu">
          <span className="block w-6 h-0.5 transition-all"
                style={{ background: 'var(--text)', transform: menuOpen ? 'rotate(45deg) translate(3px, 3px)' : '' }} />
          <span className="block w-6 h-0.5 transition-all"
                style={{ background: 'var(--text)', opacity: menuOpen ? 0 : 1 }} />
          <span className="block w-6 h-0.5 transition-all"
                style={{ background: 'var(--text)', transform: menuOpen ? 'rotate(-45deg) translate(3px, -3px)' : '' }} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1"
             style={{ background: 'rgba(247,244,238,0.98)', borderColor: 'var(--border-2)' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background: path === l.href ? 'rgba(255,255,255,0.8)' : 'transparent',
                color: 'var(--text)',
                fontFamily: 'AbramoSerif, serif',
                fontSize: '18px',
                fontWeight: '600',
                letterSpacing: '0.08em',
                border: path === l.href ? '1px solid var(--border)' : '1px solid transparent',
              }}>
              {l.icon
                ? <img src={l.icon} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                : <span style={{ fontSize: '32px' }}>{l.label.split(' ')[0]}</span>}
              <span>{l.label.replace(/^[^\s]+ /, '')}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{ background: path.startsWith('/admin') ? 'rgba(255,255,255,0.8)' : 'transparent', color: 'var(--green)', fontFamily: 'AbramoSerif, serif', fontSize: '18px', fontWeight: '600' }}>
              <span style={{ fontSize: '32px' }}>🛠</span>
              <span>Admin</span>
            </Link>
          )}
          {userName && (
            <button onClick={signOut}
              className="w-full text-left px-4 py-3 rounded-xl text-sm mt-2"
              style={{ color: 'var(--text-3)', borderTop: '1px solid var(--border)', fontFamily: 'AbramoSerif, serif' }}>
              {t.signOut}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
