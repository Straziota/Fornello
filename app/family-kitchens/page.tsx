'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';
import type { HeritageProfile } from '@/lib/types';

export default function FamilyKitchensPage() {
  const [profiles, setProfiles] = useState<HeritageProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/heritage/profiles')
      .then(r => r.json())
      .then(d => { setProfiles(d.profiles || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />

      <Link href="/heritage-kitchen" className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>Heritage Kitchen</T>
      </Link>

      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
            <T>Family Kitchens</T>
          </h1>
          <p className="mt-2 text-[15px] italic max-w-xl" style={{ color: 'var(--text-2)' }}>
            <T>Create a dedicated space for someone whose cooking shaped you — your mother, a grandmother, an auntie, or yourself. Scan their original recipe cards and keep their table alive.</T>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/family-kitchens/gallery"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 whitespace-nowrap"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <T>Browse shared</T>
          </Link>
          <Link href="/family-kitchens/new"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 whitespace-nowrap"
            style={{ background: 'var(--green)', color: '#fff', boxShadow: '0 2px 8px rgba(47,58,50,0.06)' }}>
            ✦ <T>Create a profile</T>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="spinner w-8 h-8" /></div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 rounded-[28px] ring-1 max-w-2xl mx-auto"
             style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>
          <div className="text-6xl mb-4">👵</div>
          <h2 className="text-2xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}><T>No kitchens yet</T></h2>
          <p className="italic mb-6 px-6" style={{ color: 'var(--text-2)' }}>
            <T>Start by creating a profile for the person whose recipes you want to preserve.</T>
          </p>
          <Link href="/family-kitchens/new"
            className="inline-block rounded-full px-7 py-3.5 text-sm uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
            style={{ background: 'var(--green)', color: '#fff', fontFamily: 'Georgia, serif' }}>
            ✦ <T>Create your first profile</T> ✦
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {profiles.map(p => (
            <Link key={p.id} href={`/family-kitchens/${p.slug}`}
                  className="block group transition-transform hover:-translate-y-1">
              <div className="rounded-[22px] overflow-hidden ring-1 relative"
                   style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.08)' }}>
                {p.portrait_url ? (
                  <img src={p.portrait_url} alt={p.person_name}
                       className="w-full object-cover block"
                       style={{ aspectRatio: '4 / 3', filter: 'saturate(1.05) sepia(0.05)' }} />
                ) : (
                  <img src="/icons/Heritage kitchen.png" alt=""
                       className="w-full object-cover block"
                       style={{ aspectRatio: '4 / 3', background: 'var(--cream)' }} />
                )}
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.15em]"
                      style={{ background: p.visibility === 'public' ? 'var(--green)' : 'rgba(255,255,255,0.9)',
                               color: p.visibility === 'public' ? '#fff' : 'var(--text-3)' }}>
                  {p.visibility === 'public' ? <T>Shared</T> : <T>Private</T>}
                </span>
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
