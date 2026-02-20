-- Duskwarden Tools — System Packs Migration
-- Adds:
--   1. Computed index on output_json->>'outputPackId' for library filtering
--   2. device_reference_statblocks table for private per-device Shadowdark
--      verify references (stored server-side so they survive page refreshes,
--      but scoped to a device_id and never exposed publicly)

-- ============================================================
-- 1. Functional index for outputPackId lookups in entries
-- ============================================================

-- Allows efficient filtering by output system (e.g. WHERE output_json->>'outputPackId' = 'dnd5e_srd')
CREATE INDEX IF NOT EXISTS idx_entries_output_pack_id
  ON entries ((output_json->>'outputPackId'));

-- ============================================================
-- 2. Private reference statblocks table
--    • Keyed on (device_id, entry_id) — one reference per entry per device
--    • Only the device that wrote a row can read/update/delete it (via device_id)
--    • RLS is DISABLED to match the rest of the schema (no-auth mode)
--    • Anon role granted full access (consistent with other tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS device_reference_statblocks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id   TEXT        NOT NULL,
  entry_id    UUID        REFERENCES entries(id) ON DELETE CASCADE,
  -- NULL entry_id = reference saved before the entry is persisted
  raw_text    TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enforce one reference per device per entry (NULL entry_id allows multiple drafts)
  CONSTRAINT uq_device_entry UNIQUE NULLS NOT DISTINCT (device_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_ref_statblocks_device_id ON device_reference_statblocks(device_id);
CREATE INDEX IF NOT EXISTS idx_ref_statblocks_entry_id  ON device_reference_statblocks(entry_id);

-- Apply updated_at trigger (function already exists from migration 00001)
CREATE TRIGGER update_device_reference_statblocks_updated_at
  BEFORE UPDATE ON device_reference_statblocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: disabled (matches schema established in migration 00002)
ALTER TABLE device_reference_statblocks DISABLE ROW LEVEL SECURITY;

-- Grants: anon role (matches other tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON device_reference_statblocks TO anon;
