import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText('Duskwarden Tools');
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

test.describe('Output System selection', () => {
  test('selecting Shadowdark verify shows compatibility note and Reference textarea', async ({ page }) => {
    await page.goto('/app/convert');

    // Select Shadowdark verify pack
    await page.selectOption('select[aria-describedby="pack-hint"]', 'shadowdark_private_verify');

    // Compatibility note appears
    await expect(page.locator('text=Compatibility profile for use with Shadowdark RPG')).toBeVisible();

    // Reference textarea appears
    await expect(page.locator('text=Reference Stat Block')).toBeVisible();
  });

  test('Shadowdark reference textarea accepts user input and stays on page', async ({ page }) => {
    await page.goto('/app/convert');
    await page.selectOption('select[aria-describedby="pack-hint"]', 'shadowdark_private_verify');

    const refText = 'Goblin\nAC 12\nHP 4\nAttack: Dagger +2 (1d4)';
    // Fill the SECOND textarea (reference, not source)
    const textareas = page.locator('textarea');
    await textareas.nth(1).fill(refText);
    await expect(textareas.nth(1)).toHaveValue(refText);
  });

  test('switching to Shadowdark then back to OSR hides reference textarea', async ({ page }) => {
    await page.goto('/app/convert');
    await page.selectOption('select[aria-describedby="pack-hint"]', 'shadowdark_private_verify');
    await expect(page.locator('text=Reference Stat Block')).toBeVisible();

    await page.selectOption('select[aria-describedby="pack-hint"]', 'osr_generic');
    await expect(page.locator('text=Reference Stat Block')).not.toBeVisible();
    await expect(page.locator('text=Compatibility profile for use with Shadowdark RPG')).not.toBeVisible();
  });

  test('SRD pack shows CC BY 4.0 attribution note', async ({ page }) => {
    await page.goto('/app/convert');
    await page.selectOption('select[aria-describedby="pack-hint"]', 'dnd5e_srd');
    await expect(page.locator('text=CC BY 4.0')).toBeVisible();
  });

  test('output preview updates when source text is pasted', async ({ page }) => {
    await page.goto('/app/convert');
    const statBlock = `Goblin\nAC 15\nHP 7\nSpeed 30 ft.\nMelee Attack: Scimitar +4 to hit, 1d6+2 slashing damage`;
    await page.fill('textarea', statBlock);
    await expect(page.locator('[aria-label="Output preview"]')).toBeVisible();
  });
});
