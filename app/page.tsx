'use client';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';

const tiles = [
  { href: '/this-week',      label: 'This Week',       bg: '/backgrounds/this-week-page.png' },
  { href: '/groceries',      label: 'From the Market', bg: '/backgrounds/groceries-page.png' },
  { href: '/pantry',         label: 'Pantry',          bg: '/backgrounds/pantry-page-v2.png' },
  { href: '/recipes',        label: 'Recipes',         bg: '/backgrounds/My recipes-page.png' },
  { href: '/heritage-kitchen', label: 'Heritage Kitchen', bg: '/backgrounds/Nonna\'s kitchen-page.png' },
  { href: '/special-occasion', label: 'Special Occasion', bg: '/backgrounds/Special occasion.png' },
  { href: '/on-the-fly',     label: 'On the Fly',      bg: '/backgrounds/on-the-fly-page.png' },
  { href: '/something-sweet', label: 'Something Sweet', bg: '/backgrounds/Something Sweet.png' },
  { href: '/traditions',     label: 'Traditions',      bg: '/backgrounds/Traditions.png' },
  { href: '/find-a-recipe',  label: 'Find a Recipe',   bg: '/backgrounds/find-a-recipe-page.png' },
  { href: '/history',        label: 'Archive',         bg: '/backgrounds/Archive-page.png' },
  { href: '/settings',       label: 'Settings',        bg: '/backgrounds/Settings-page.png' },
];

export default function HomePage() {
  return (
    <>
      <PageBackground src="/backgrounds/Home page background.png" />

      {/* Logo */}
      <div className="flex justify-center mb-10 mt-4">
        <img src="/Fornello Logo.png" alt="Fornello" style={{ width: '180px', height: 'auto' }} />
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {tiles.map(tile => (
          <Link key={tile.href} href={tile.href}
            className="flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-lg"
            style={{ textDecoration: 'none' }}>

            {/* Image tile */}
            <div className="w-full rounded-[18px] overflow-hidden"
                 style={{
                   backgroundImage: `url("${tile.bg}")`,
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                   aspectRatio: '1 / 1',
                   boxShadow: '0 4px 20px rgba(47,58,50,0.15)',
                   filter: 'saturate(1.0) sepia(0) brightness(0.96)',
                 }} />

            {/* Label below */}
            <span className="mt-2 text-base font-semibold"
                  style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)', letterSpacing: '0.03em', fontSize: '18px' }}>
              {tile.label}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
