'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/check').then(r => r.json()).then(d => setAllowed(!!d.isAdmin)).catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return (
    <p className="italic text-center py-20" style={{ color: 'var(--text-3)' }}>Loading…</p>
  );

  if (!allowed) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Not allowed</h2>
      <p className="italic" style={{ color: 'var(--text-2)' }}>This page is only available to admins.</p>
    </div>
  );

  const cards = [
    {
      href: '/admin/invites',
      icon: '📨',
      title: 'Invites',
      desc: 'Manage the beta allowlist — add new testers, see who has signed up, remove access.',
    },
    {
      href: '/admin/recipes',
      icon: '🌐',
      title: 'Global Library',
      desc: 'Browse and edit the shared recipe library that powers menu generation for all users.',
    },
    {
      href: '/admin/heritage',
      icon: '👵',
      title: 'Heritage & Nonna',
      desc: "Add recipes from grandmothers around the world. Recipes from \"Nonna Ingrid\" land in Nonna's Kitchen, others go to Heritage.",
    },
    {
      href: '/admin/feedback',
      icon: '💬',
      title: 'Feedback',
      desc: 'Messages from beta testers — bug reports, feature requests, compliments. New items show first.',
    },
  ];

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      <div className="mb-10">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
          Admin
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Behind the scenes tools — only you can see this.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 max-w-3xl">
        {cards.map(c => (
          <Link key={c.href} href={c.href}
            className="rounded-[22px] p-6 ring-1 transition-all hover:shadow-md block"
            style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
            <div className="text-4xl mb-3">{c.icon}</div>
            <h2 className="text-xl mb-1" style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
              {c.title}
            </h2>
            <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>
              {c.desc}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
