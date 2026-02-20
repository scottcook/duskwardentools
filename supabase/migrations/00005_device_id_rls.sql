-- Duskwarden Tools — Device-based Row Level Security
-- Re-enables RLS on entries and projects with device_id-based isolation.
-- Each user's data is scoped to their browser's device_id (stored in localStorage).
--
-- The device_id is passed via the x-device-id header and accessed via
-- current_setting('request.headers')::json->>'x-device-id'
--
-- This provides user isolation WITHOUT requiring authentication.

-- ============================================================
-- 1. Re-enable RLS on tables
-- ============================================================

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_reference_statblocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Create helper function to extract device_id from headers
-- ============================================================

CREATE OR REPLACE FUNCTION get_device_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get from request headers (PostgREST)
  RETURN COALESCE(
    current_setting('request.headers', true)::json->>'x-device-id',
    ''
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. RLS Policies for entries table
-- ============================================================

-- Users can only view their own entries (matching device_id)
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (user_id = get_device_id());

-- Users can only insert entries with their own device_id
CREATE POLICY "Users can create own entries"
  ON entries FOR INSERT
  WITH CHECK (user_id = get_device_id());

-- Users can only update their own entries
CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (user_id = get_device_id());

-- Users can only delete their own entries
CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (user_id = get_device_id());

-- ============================================================
-- 4. RLS Policies for projects table
-- ============================================================

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (user_id = get_device_id());

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (user_id = get_device_id());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (user_id = get_device_id());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (user_id = get_device_id());

-- ============================================================
-- 5. RLS Policies for entry_versions table
-- ============================================================

CREATE POLICY "Users can view own entry versions"
  ON entry_versions FOR SELECT
  USING (user_id = get_device_id());

CREATE POLICY "Users can create own entry versions"
  ON entry_versions FOR INSERT
  WITH CHECK (user_id = get_device_id());

-- ============================================================
-- 6. RLS Policies for device_reference_statblocks table
-- ============================================================

CREATE POLICY "Users can view own reference statblocks"
  ON device_reference_statblocks FOR SELECT
  USING (device_id = get_device_id());

CREATE POLICY "Users can create own reference statblocks"
  ON device_reference_statblocks FOR INSERT
  WITH CHECK (device_id = get_device_id());

CREATE POLICY "Users can update own reference statblocks"
  ON device_reference_statblocks FOR UPDATE
  USING (device_id = get_device_id());

CREATE POLICY "Users can delete own reference statblocks"
  ON device_reference_statblocks FOR DELETE
  USING (device_id = get_device_id());

-- ============================================================
-- 7. Keep anon role grants (RLS will filter the data)
-- ============================================================

-- Grants remain the same, but RLS policies now filter by device_id
-- The anon role can still access the tables, but only sees their own rows
