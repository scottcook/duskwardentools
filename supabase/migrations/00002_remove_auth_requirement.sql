-- Duskwarden Tools - Remove auth requirement
-- Drops auth.users FK constraints and replaces with open RLS policies
-- so the app works without login.

-- ============================================================
-- 1. Drop existing RLS policies that reference auth.uid()
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can view own entries" ON entries;
DROP POLICY IF EXISTS "Users can create own entries" ON entries;
DROP POLICY IF EXISTS "Users can update own entries" ON entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON entries;

DROP POLICY IF EXISTS "Users can view own entry versions" ON entry_versions;
DROP POLICY IF EXISTS "Users can create own entry versions" ON entry_versions;

-- ============================================================
-- 2. Drop the auth trigger and function (no longer needed)
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================================
-- 3. Drop FK constraints on user_id that reference auth.users
-- ============================================================

ALTER TABLE projects   DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE entries    DROP CONSTRAINT IF EXISTS entries_user_id_fkey;
ALTER TABLE entry_versions DROP CONSTRAINT IF EXISTS entry_versions_user_id_fkey;

-- profiles is keyed on auth.users.id — we make it standalone
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Change user_id columns to plain TEXT so we can store any identifier
-- (e.g. a browser fingerprint, device ID, or just "local")
ALTER TABLE projects        ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE entries         ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE entry_versions  ALTER COLUMN user_id TYPE TEXT;

-- profiles.id was a UUID PK referencing auth.users — keep as UUID but remove FK
-- (already done above; no type change needed)

-- ============================================================
-- 4. Open RLS policies: all rows visible/writable to anyone
-- ============================================================

-- Disable RLS entirely on tables (simplest no-auth approach)
ALTER TABLE profiles       DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects       DISABLE ROW LEVEL SECURITY;
ALTER TABLE entries        DISABLE ROW LEVEL SECURITY;
ALTER TABLE entry_versions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Grant anon role full access via PostgREST
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles       TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects       TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON entries        TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON entry_versions TO anon;
