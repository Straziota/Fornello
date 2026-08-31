'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import RecipeCardModal from '@/components/RecipeCardModal';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';
import { heritageKitchenHref } from '@/lib/routes';
interface KitchenCard {
  slug: string;
  contributor: string;
  name: string;
  country: string;
  image_url: string;
  href: string | null;
}

interface TemplateRecipe {
  id: number;
  name: string;
  cuisine: string;
  meal_type: string;
  serves: number;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  tags: string[];
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  prep_ahead: string[];
  source: string;
  photo_url?: string;
  background?: string;
  nonna_wisdom?: string[];
  contributor?: string;
}

function toUserRecipe(r: TemplateRecipe) {
  return {
    name: r.name, cuisine: r.cuisine, mealType: r.meal_type,
    serves: r.serves, total_time: r.total_time, prep_time: r.prep_time,
    cook_time: r.cook_time, difficulty: r.difficulty, description: r.description,
    tags: r.tags, ingredients: r.ingredients, instructions: r.instructions,
    prep_ahead: r.prep_ahead, source: r.source, photo_url: r.photo_url,
    background: r.background, nonna_wisdom: r.nonna_wisdom,
    variants: (r as any).variants,
  };
}

export default function HeritageKitchenPage() {
  const [recipes, setRecipes] = useState<TemplateRecipe[]>([]);
  const [kitchens, setKitchens] = useState<KitchenCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRecipe, setViewRecipe] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [inRotation, setInRotation] = useState<Set<number>>(new Set());
  const [canContribute, setCanContribute] = useState(false);

  useEffect(() => {
    fetch('/api/heritage-kitchen').then(r => r.json()).then(d => { setRecipes(d); setLoading(false); });
    fetch('/api/heritage-kitchens').then(r => r.json()).then(d => setKitchens(d.kitchens || [])).catch(() => {});
    fetch('/api/heritage-submit/can-submit').then(r => r.json()).then(d => setCanContribute(!!d.allowed)).catch(() => {});
  }, []);

  const addToRotation = async (e: React.MouseEvent, r: TemplateRecipe) => {
    e.stopPropagation();
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toUserRecipe(r)),
    });
    if (res.ok) {
      setInRotation(prev => new Set([...prev, r.id]));
      setToast({ msg: `${r.name} added to your weekly rotation ✓`, type: 'success' });
    } else {
      setToast({ msg: 'Could not add to rotation', type: 'error' });
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {viewRecipe && <RecipeCardModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} readOnly />}

      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
            <T>Heritage Kitchen</T>
          </h1>
          <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
            <T>Recipes shared by grandmothers from around the world.</T>
          </p>
        </div>
        {canContribute && (
          <Link href="/heritage-kitchen/submit"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
            style={{ background: 'var(--green)', color: '#fff', boxShadow: '0 2px 8px rgba(47,58,50,0.06)' }}>
            🥄 <T>Submit a recipe</T>
          </Link>
        )}
      </div>

      {/* ── Tribute to Nonna ── */}
      <Tribute />

      {/* ── Kitchens of the world ── */}
      <div className="mt-12">
        <h2 className="text-xl mb-1" style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          <T>Kitchens of the world</T>
        </h2>
        <p className="text-sm italic mb-6" style={{ color: 'var(--text-3)' }}>
          <T>Step into each kitchen to find the recipes shared by its grandmother.</T>
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {kitchens.map(k => (
            <Link key={k.slug} href={k.href || heritageKitchenHref(k.slug)}
                  className="block group transition-transform hover:-translate-y-1">
              <div className="rounded-[22px] overflow-hidden ring-1"
                   style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.08)' }}>
                <img src={k.image_url} alt={k.name}
                     className="w-full object-cover block"
                     style={{ aspectRatio: '4 / 3', filter: 'saturate(1.05) sepia(0.05)' }} />
              </div>
              <div className="text-center mt-3">
                <p className="text-[22px] leading-tight"
                   style={{ fontFamily: 'AbramoSerif, serif', fontStyle: 'italic', color: 'var(--text)' }}>
                  <T>{k.name}</T>
                </p>
                <p className="text-xs uppercase tracking-[0.22em] mt-1" style={{ color: 'var(--text-3)' }}>
                  <T>{k.country}</T>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* The green "Your Family Kitchen" card used to sit here. It repeated
          what the tribute above already says, and offered a third route to the
          same place the two buttons in that text already offer — so the page
          ended by asking twice. */}
    </>
  );
}

function Tribute() {
  const para = { color: 'var(--text-2)', lineHeight: 1.85 };

  return (
    <div className="rounded-[28px] overflow-hidden ring-1"
         style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>

      <div className="px-6 md:px-16 py-12" style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="space-y-4 text-[15px]" style={para}>
          <p><T>{`Every family has a kitchen. The place where traditions are quietly passed from one generation to the next. That recipe written on a stained index card. That phone call before hosting a holiday meal to ask, "How long did you bake it?" That dish that somehow never tastes quite the same unless the person who taught you is standing beside you.`}</T></p>
          <p><T>{`These are more than recipes. They are stories, memories, and expressions of love. Heritage Kitchen is a place to preserve them and pass them on.`}</T></p>
          <p><T>{`Here, anyone can create a Kitchen: a private collection of recipes, traditions, photographs, and memories, kept together in one place and shared with the people you choose. You can build it yourself or invite family and friends to contribute, creating the collection together.`}</T></p>
          <p><T>{`Some Kitchens begin with one person whose cooking shaped the family table. Others bring together recipes and traditions from across generations: grandparents and parents, aunts and uncles, siblings, friends, and the children who are creating traditions of their own. Every Kitchen grows differently, shaped by the people whose stories it holds and those who help preserve them.`}</T></p>
          <p><T>{`Whether your recipes come from generations past or are traditions you're creating today, every Kitchen tells a story that is uniquely yours. A Heritage Kitchen is a celebration of the people who nourished us, gathered us around the table, and taught us that feeding someone is one of the simplest and most enduring ways to say: I love you.`}</T></p>
          <p><T>{`Because every story has a beginning, and every kitchen has someone who first taught us what it means to feed the people we love.`}</T></p>
          <p><T>{`For me, that person was my mother, Ingrid, now lovingly known by my children as Nonna. And though most Kitchens stay within a family, she chose to open hers to everyone. I invite you to visit her Kitchen, or to begin creating a Heritage Kitchen of your own.`}</T></p>

          {/* Two buttons, because the closing paragraph names exactly two
              things. Browsing other people's Kitchens is gone: a Kitchen is
              private now and shared with chosen people, so a public gallery
              would contradict the paragraph above it. */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-6 pb-2">
            <Link href="/nonnas-kitchen"
              className="inline-block rounded-full px-7 py-3.5 text-sm uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
              style={{ background: 'var(--green)', color: '#fff', fontFamily: 'Georgia, serif' }}>
              <T>{`Visit Nonna's Kitchen`}</T>
            </Link>
            <Link href="/family-kitchens/new"
              className="inline-block rounded-full px-7 py-3.5 text-sm uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
              style={{ background: 'transparent', border: '1px solid var(--green)', color: 'var(--green)', fontFamily: 'Georgia, serif' }}>
              <T>Start your own</T>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
