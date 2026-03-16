import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Duskwarden | 5e/OSE to OSR Monster Converter')).toBeVisible();
    await expect(page.locator('text=Open App')).toBeVisible();
    await expect(page.locator('text=independent product')).toBeVisible();
  });

  test('navigation to app from landing', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Open App');
    await expect(page).toHaveURL('/app');
  });

  test('footer disclaimer is present on landing', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer');
    await expect(footer).toContainText('Duskwarden Tools is an independent product');
    await expect(footer).toContainText('not affiliated with The Arcane Library');
  });
});

test.describe('App Pages Load', () => {
  test('dashboard page loads', async ({ page }) => {
    await page.goto('/app');
    
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('projects page loads', async ({ page }) => {
    await page.goto('/app/projects');
    
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('library page loads', async ({ page }) => {
    await page.goto('/app/library');
    
    await expect(page.locator('h1')).toContainText('Library');
  });

  test('convert page loads with new heading', async ({ page }) => {
    await page.goto('/app/convert');

    await expect(page.locator('h1')).toContainText('Create a Duskwarden Stat Card');
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/app/settings');

    await expect(page.locator('h1')).toContainText('Settings');
  });
});

test.describe('Conversion page smoke', () => {
  test('selecting Shadowdark output shows compatibility note', async ({ page }) => {
    await page.goto('/app/convert');
    await page.getByLabel('Output System (conversion)').selectOption('shadowdark_compatible_v1');

    await expect(page.locator('text=Compatibility profile for use with Shadowdark RPG')).toBeVisible();
  });

  test('parsing 5e goblin reaches review step with SRD validation', async ({ page }) => {
    await page.goto('/app/convert');
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(
      'Goblin\nArmor Class 15\nHit Points 7 (2d6)\nSpeed 30 ft.\nScimitar. Melee Weapon Attack: +4 to hit, Hit: 5 (1d6 + 2) slashing damage.'
    );
    await page.click('button:has-text("Parse Stat Block")');

    await expect(page.locator('text=Validation Pack:')).toBeVisible();
    await expect(page.locator('text=D&D 5e (SRD)')).toBeVisible();
    await expect(page.locator('text=How This Was Tuned')).toBeVisible();
  });

  test('pasting old-school text auto-detects and applies the source system before manual override', async ({ page }) => {
    await page.goto('/app/convert');
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(
      'Skeleton\nAC 7 [12], HD 1, Att 1 x weapon (1d6), THAC0 19 [+0], MV 60\' (20\'), SV F1, ML 12'
    );

    await expect(page.getByLabel('Source System')).toHaveValue('ose');
    await expect(page.locator('text=Detected from pasted text:')).toBeVisible();
  });

  test('full-word OSE table wording auto-detects as OSE', async ({ page }) => {
    await page.goto('/app/convert');
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(
      'Skeleton\nArmour Class 7 [12]\nHit Dice 1 (4hp)\nAttacks 1 × weapon (1d6 or by weapon)\nTHAC0 19 [0]\nMovement 60\' (20\')\nSaving Throws D12 W13 P14 B15 S16 (1)\nMorale 12\nNumber Appearing 3d4 (3d10)\nTreasure Type None'
    );

    await expect(page.getByLabel('Source System')).toHaveValue('ose');
    await expect(page.locator('text=Detected from pasted text: OSE')).toBeVisible();
  });

  test('manual source selection is preserved after detection and offers a switch suggestion', async ({ page }) => {
    await page.goto('/app/convert');
    await page.getByLabel('Source System').selectOption('other');
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(
      'Goblin\nArmor Class 15\nHit Points 7 (2d6)\nChallenge 1/4\nActions\nScimitar. Melee Weapon Attack: +4 to hit, Hit: 5 (1d6 + 2) slashing damage.'
    );

    await expect(page.getByLabel('Source System')).toHaveValue('other');
    await expect(page.locator('text=Use detected system')).toBeVisible();
  });

  test('generic narrative traits stay out of saves and appear as special actions', async ({ page }) => {
    await page.goto('/app/convert');
    await page.getByLabel('Source System').selectOption('other');
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(
      'Bandit\n4 HP, 1 Armor, 12 STR, 12 DEX, 9 WIL, short sword (d6) or short bow (d6)\nLoyal: When testing Morale, save using the leader\'s WIL (13). If the leader dies, the others will flee.'
    );
    await page.click('button:has-text("Parse Stat Block")');

    await expect(page.locator('text=Special Actions')).toBeVisible();
    await expect(page.locator('text=Loyal')).toBeVisible();
    await expect(page.getByText('+3 vs physical effects', { exact: true })).toBeVisible();
  });
});
