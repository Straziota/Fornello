'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';
import type { HeritageProfile } from '@/lib/types';

export default function GalleryPage() {
  const [profiles, setProfiles] = useState<HeritageProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/heritage/gallery')
      .then(r => r.json())
      .then(d => { setProfiles(d.profiles || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />

      <Link href="/family-kitchens" className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>Family Kitchens</T>
      </Link>

      <div className="mb-10">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          <T>Shared Kitchens</T>
        </h1>
        <p className="mt-2 text-[15px] italic max-w-xl" style={{ color: 'var(--text-2)' }}>
          <T>Family kitchens others have chosen to share with the community. Step in and find recipes to add to your own weekly menu.</T>
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="spinner w-8 h-8" /></div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 rounded-[28px] ring-1 max-w-2xl mx-auto"
             style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>
          <div className="text-6xl mb-4">🌿</div>
          <p className="italic px-6" style={{ color: 'var(--text-2)' }}>
            <T>No kitchens have been shared yet. Share one of yours to be the first.</T>
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {profiles.map(p => (
            <Link key={p.id} href={`/family-kitchens/${p.slug}`}
                  className="block group transition-transform hover:-translate-y-1">
              <div className="rounded-[22px] overflow-hidden ring-1"
                   style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.08)' }}>
                {p.portrait_url ? (
                  <img src={p.portrait_url} alt={p.person_name} className="w-full object-cover block"
                       style={{ aspectRatio: '4 / 3', filter: 'saturate(1.05) sepia(0.05)' }} />
                ) : (
                  <img src="/icons/Heritage kitchen.png" alt=""
                       className="w-full object-cover block"
                       style={{ aspectRatio: '4 / 3', background: 'var(--cream)' }} />
                )}
              </div>
              <div className="text-center mt-3">
                <p className="text-[22px] leading-tight"
                   style={{ fontFamily: 'AbramoSerif, serif', fontStyle: 'italic', color: 'var(--text)' }}>
                  {p.person_name}
                </p>
                <p className="text-xs uppercase tracking-[0.22em] mt-1" style={{ color: 'var(--text-3)' }}>
                  {[p.relationship, p.origin_country].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
                  {p.recipe_count ?? 0} <T>{(p.recipe_count === 1) ? 'recipe' : 'recipes'}</T>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
