import { test, expect } from '@playwright/test';

const GOBLIN_STATBLOCK = `Goblin
Small humanoid (goblinoid), neutral evil

Armor Class 15 (leather armor, shield)
Hit Points 7 (2d6)
Speed 30 ft.

STR 8 (-1)  DEX 14 (+2)  CON 10 (+0)  INT 10 (+0)  WIS 8 (-1)  CHA 8 (-1)

Skills Stealth +6
Senses darkvision 60 ft., passive Perception 9
Languages Common, Goblin
Challenge 1/4 (50 XP)

Nimble Escape. The goblin can take the Disengage or Hide action as a bonus action on each of its turns.

Actions
Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.
Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`;

const SKELETON_OSE = `Skeleton
AC 7 [12], HD 1, Att 1 x weapon (1d6), THAC0 19 [+0], MV 60' (20'), SV F1, ML 12, AL Chaotic`;

test.describe('Conversion Wizard - Full Flow QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/convert');
  });

  test('5e flow uses SRD-backed validation and export provenance', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await expect(page.locator('h1')).toContainText('Create a Duskwarden Stat Card');

    await page.getByLabel('Creature Name').fill('Goblin Scout');
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(GOBLIN_STATBLOCK);
    await page.click('button:has-text("Parse Stat Block")');

    await expect(page.locator('text=Validation Pack:')).toBeVisible();
    await expect(page.locator('text=D&D 5e (SRD)')).toBeVisible();
    await expect(page.getByText('Reference match', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Goblin Scout' })).toBeVisible();

    await page.click('button:has-text("Save to Library")');
    await expect(page.locator('text=Saved Successfully')).toBeVisible();
    await expect(page.locator('text=Attribution Pack:')).toBeVisible();

    await page.click('button:has-text("Copy JSON")');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const json = JSON.parse(clipboardText);

    expect(json.name).toBe('Goblin Scout');
    expect(json.outputPackId).toBe('dnd5e_srd');
    expect(json.provenance.licenseType).toBe('CC-BY-4.0');
    expect(json.tuning.profileId).toBe('osr_generic_v1');
  });

  test('Shadowdark compatibility flow requests a reference and exports verify provenance', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(GOBLIN_STATBLOCK);
    await page.getByLabel('Output System (conversion)').selectOption('shadowdark_compatible_v1');
    await page.click('button:has-text("Parse Stat Block")');

    await expect(page.locator('text=Validation Pack:')).toBeVisible();
    await expect(page.locator('text=Reference Stat Block')).toBeVisible();

    const reference = `Goblin
AC 12
HP 5
Attack: Dagger +2 (1d4)`;
    await page.locator('textarea[placeholder*="reference stat block"]').fill(reference);

    await expect(page.getByText('Reference match', { exact: true })).toBeVisible();
    await page.click('button:has-text("Save to Library")');
    await page.click('button:has-text("Copy JSON")');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const json = JSON.parse(clipboardText);
    expect(json.outputPackId).toBe('shadowdark_private_verify');
    expect(json.provenance.licenseType).toBe('UserProvided');
    expect(json.outputProfile).toBe('shadowdark_compatible');
  });

  test('OSE input uses the old-school parser path', async ({ page }) => {
    await page.getByLabel('Source System').selectOption('ose');
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(SKELETON_OSE);
    await page.click('button:has-text("Advanced options")');
    await page.getByLabel('Threat Tier').selectOption('1');
    await page.click('button:has-text("Parse Stat Block")');

    await expect(page.locator('text=Validation Pack:')).toBeVisible();
    await expect(page.getByText('OSR Generic', { exact: true })).toBeVisible();
    await expect(page.locator('text=Skeleton')).toBeVisible();
    await expect(page.locator('text=How This Was Tuned')).toBeVisible();
  });
});
