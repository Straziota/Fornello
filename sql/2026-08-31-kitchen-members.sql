-- Sharing a Kitchen with named people, rather than with nobody or everybody.
--
-- Until now visibility was binary: private meant the owner alone, public meant
-- every signed-in Fornello user. There was no way to let a sister in without
-- letting in twenty-one households, and no way for her to add the recipes she
-- remembers.

-- ── Who has access, and what they may do ──────────────────────────────────
-- Two roles only. 'view' reads; 'add' also contributes. No matrix: every extra
-- permission is one more thing an owner must reason about while thinking about
-- their grandmother.
CREATE TABLE IF NOT EXISTS kitchen_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES heritage_profiles(id) ON DELETE CASCADE,
  -- Stored lowercased. The email IS the identity: guests sign in passwordless,
  -- so the address is the credential either way.
  email        text NOT NULL,
  role         text NOT NULL CHECK (role IN ('view', 'add')),
  invited_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  -- Revoking removes access, never content. Contributions stay, attributed.
  revoked_at   timestamptz,
  UNIQUE (profile_id, email)
);
CREATE INDEX IF NOT EXISTS kitchen_members_email_idx ON kitchen_members (lower(email));
CREATE INDEX IF NOT EXISTS kitchen_members_profile_idx ON kitchen_members (profile_id);

-- ── Rate limiting for the access page ─────────────────────────────────────
-- By address AND by IP. Without the second, one attacker enumerates addresses
-- freely; without the first, one address can be mailbombed from many IPs.
CREATE TABLE IF NOT EXISTS kitchen_access_requests (
  id         bigserial PRIMARY KEY,
  profile_id uuid REFERENCES heritage_profiles(id) ON DELETE CASCADE,
  email      text,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kitchen_access_requests_recent_idx
  ON kitchen_access_requests (created_at DESC);

-- ── The access page ───────────────────────────────────────────────────────
-- Off by default: the page must reveal nothing until an owner decides it may.
-- A guest who bookmarks it should not be handing a family's name to whoever
-- borrows their phone.
ALTER TABLE heritage_profiles
  ADD COLUMN IF NOT EXISTS access_page_shows_name boolean NOT NULL DEFAULT false;

-- Who contributed a recipe, so removing a member never orphans their work.
ALTER TABLE heritage_profile_recipes
  ADD COLUMN IF NOT EXISTS contributed_by       uuid,
  ADD COLUMN IF NOT EXISTS contributed_by_email text;
