-- Duskwarden Tools — Conversion Profiles Migration
-- Adds indexes + backfill for the new profile-driven engine (v2).
--
-- Changes in this release:
--   • output_json now contains: outputPackId, conversionProfileId, tuning{}
--   • Existing rows are backfilled with defaults so the app degrades gracefully
--   • New functional indexes for library filtering by profile

-- ============================================================
-- 1. Functional indexes for new JSONB fields
-- ============================================================

-- Index for filtering by conversion profile (e.g. "show all SD-compatible cards")
CREATE INDEX IF NOT EXISTS idx_entries_conversion_profile_id
  ON entries ((output_json->>'conversionProfileId'));

-- Companion to the existing outputPackId index — named clearly
COMMENT ON INDEX idx_entries_output_pack_id IS
  'Supports filtering entries by system pack (dnd5e_srd, osr_generic, etc.)';

-- ============================================================
-- 2. Backfill existing entries that predate the v2 engine
--    Sets safe default values so the UI renders correctly.
-- ============================================================

-- 2a. Set outputPackId = 'osr_generic' where missing
UPDATE entries
SET output_json = jsonb_set(
  output_json,
  '{outputPackId}',
  '"osr_generic"'
)
WHERE output_json IS NOT NULL
  AND output_json->>'outputPackId' IS NULL;

-- 2b. Set conversionProfileId = 'osr_generic_v1' where missing
UPDATE entries
SET output_json = jsonb_set(
  output_json,
  '{conversionProfileId}',
  '"osr_generic_v1"'
)
WHERE output_json IS NOT NULL
  AND output_json->>'conversionProfileId' IS NULL;

-- 2c. Set outputProfile = 'osr_generic' where missing (legacy field)
UPDATE entries
SET output_json = jsonb_set(
  output_json,
  '{outputProfile}',
  '"osr_generic"'
)
WHERE output_json IS NOT NULL
  AND output_json->>'outputProfile' IS NULL;

-- 2d. Set showMorale = true where missing (OSR default)
UPDATE entries
SET output_json = jsonb_set(
  output_json,
  '{showMorale}',
  'true'
)
WHERE output_json IS NOT NULL
  AND output_json->'showMorale' IS NULL;

-- 2e. Set showReaction = false where missing
UPDATE entries
SET output_json = jsonb_set(
  output_json,
  '{showReaction}',
  'false'
)
WHERE output_json IS NOT NULL
  AND output_json->'showReaction' IS NULL;

-- 2f. Inject a minimal tuning block for rows that have none
--     Uses the threat tier already stored to compute plausible targets.
--     (Exact values match osr_generic_v1 skirmisher defaults per tier)
UPDATE entries
SET output_json = jsonb_set(
  output_json,
  '{tuning}',
  jsonb_build_object(
    'profileId',        'osr_generic_v1',
    'role',             'skirmisher',
    'hpMultiplier',     1.0,
    'damageMultiplier', 1.0,
    'targets', jsonb_build_object(
      'acTarget',          CASE (output_json->>'threatTier')::int
                             WHEN 1 THEN 11
                             WHEN 2 THEN 12
                             WHEN 3 THEN 14
                             WHEN 4 THEN 15
                             ELSE 17
                           END,
      'hpTarget',          CASE (output_json->>'threatTier')::int
                             WHEN 1 THEN 5
                             WHEN 2 THEN 10
                             WHEN 3 THEN 18
                             WHEN 4 THEN 32
                             ELSE 58
                           END,
      'attackBonusTarget', CASE (output_json->>'threatTier')::int
                             WHEN 1 THEN 1
                             WHEN 2 THEN 3
                             WHEN 3 THEN 5
                             WHEN 4 THEN 7
                             ELSE 9
                           END,
      'dprTarget',         CASE (output_json->>'threatTier')::int
                             WHEN 1 THEN 3.5
                             WHEN 2 THEN 5.5
                             WHEN 3 THEN 8.5
                             WHEN 4 THEN 13.5
                             ELSE 21.0
                           END,
      'moraleTarget',      CASE (output_json->>'threatTier')::int
                             WHEN 1 THEN 7
                             WHEN 2 THEN 8
                             WHEN 3 THEN 9
                             WHEN 4 THEN 10
                             ELSE 11
                           END
    ),
    'provenance', jsonb_build_object(
      'sourceSystem', COALESCE(parsed_json->>'system', 'unknown'),
      'outputSystem', 'OSR Generic (conversion)',
      'version',      '1.0.0'
    )
  )
)
WHERE output_json IS NOT NULL
  AND output_json->'tuning' IS NULL
  AND output_json->>'threatTier' IS NOT NULL;

-- ============================================================
-- 3. Verify backfill (informational — does not block migration)
-- ============================================================

DO $$
DECLARE
  missing_pack    int;
  missing_profile int;
  missing_tuning  int;
BEGIN
  SELECT COUNT(*) INTO missing_pack
    FROM entries
    WHERE output_json IS NOT NULL
      AND output_json->>'outputPackId' IS NULL;

  SELECT COUNT(*) INTO missing_profile
    FROM entries
    WHERE output_json IS NOT NULL
      AND output_json->>'conversionProfileId' IS NULL;

  SELECT COUNT(*) INTO missing_tuning
    FROM entries
    WHERE output_json IS NOT NULL
      AND output_json->'tuning' IS NULL
      AND output_json->>'threatTier' IS NOT NULL;

  RAISE NOTICE 'Backfill complete — missing outputPackId: %, conversionProfileId: %, tuning: %',
    missing_pack, missing_profile, missing_tuning;
END $$;
