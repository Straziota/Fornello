-- ─────────────────────────────────────────────────────────────────────────
-- Family Kitchens: user-created dedicated profiles + their heirloom recipes
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- These are OWNER-SCOPED and separate from the admin-curated `template_recipes`
-- / `heritage_kitchens`. Profiles are private by default; a user opts in to
-- `visibility = 'public'` to appear in the Family Kitchens gallery.
-- ─────────────────────────────────────────────────────────────────────────

-- A dedicated profile for a person (self / mother / grandmother / auntie …)
create table if not exists heritage_profiles (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  slug           text unique not null,
  person_name    text not null,
  relationship   text,                          -- 'Mother','Grandmother','Auntie','Myself', or free text
  origin_country text,
  portrait_url   text,
  bio            text,
  visibility     text not null default 'private' check (visibility in ('private','public')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists heritage_profiles_owner_idx on heritage_profiles(owner_id);
create index if not exists heritage_profiles_public_idx on heritage_profiles(visibility) where visibility = 'public';

-- Heirloom recipes inside a profile — regular recipe fields plus the scanned
-- original card (`original_scan_url`) and its transcription status.
create table if not exists heritage_profile_recipes (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references heritage_profiles(id) on delete cascade,
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  cuisine             text,
  meal_type           text,
  serves              int,
  total_time          text,
  prep_time           text,
  cook_time           text,
  difficulty          text,
  description         text,
  tags                jsonb not null default '[]',
  ingredients         jsonb not null default '[]',   -- [{ amount, item }]
  instructions        jsonb not null default '[]',   -- [string]
  prep_ahead          jsonb not null default '[]',   -- [string]
  nonna_wisdom        jsonb not null default '[]',   -- [string]
  original_scan_url   text,                          -- the keepsake photo of the handwritten card
  photo_url           text,                          -- optional finished-dish photo
  transcription_status text not null default 'none'  -- 'none'|'pending'|'done'|'failed'
                        check (transcription_status in ('none','pending','done','failed')),
  display_order       int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists heritage_profile_recipes_profile_idx on heritage_profile_recipes(profile_id);
create index if not exists heritage_profile_recipes_owner_idx on heritage_profile_recipes(owner_id);

-- ── Row-level security ─────────────────────────────────────────────────────
-- The app writes/reads through the service-role client (bypasses RLS) and
-- scopes by owner_id in code. These policies are a defense-in-depth backstop
-- so the anon/authenticated browser client can never see another user's
-- private data if it ever queries these tables directly.
alter table heritage_profiles enable row level security;
alter table heritage_profile_recipes enable row level security;

-- Owners manage their own profiles; anyone may read a public one.
create policy heritage_profiles_owner_all on heritage_profiles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy heritage_profiles_public_read on heritage_profiles
  for select using (visibility = 'public');

-- Owners manage their own recipes; anyone may read recipes of a public profile.
create policy heritage_profile_recipes_owner_all on heritage_profile_recipes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy heritage_profile_recipes_public_read on heritage_profile_recipes
  for select using (
    exists (
      select 1 from heritage_profiles p
      where p.id = heritage_profile_recipes.profile_id
        and p.visibility = 'public'
    )
  );
