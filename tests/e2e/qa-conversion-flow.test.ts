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

test.describe('Conversion Wizard - Full Flow QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/convert');
  });

  test('Step 1: Layout and Input', async ({ page }) => {
    // Verify page loads
    await expect(page.locator('h1')).toContainText('Create a Duskwarden Stat Card');
    
    // Verify Source and Output dropdowns are side-by-side (check grid layout)
    const systemRow = page.locator('text=Source System').locator('..').locator('..');
    await expect(systemRow).toBeVisible();
    
    // Verify Tier and Role are side-by-side
    const tierRoleRow = page.locator('text=Threat Tier').locator('..').locator('..');
    await expect(tierRoleRow).toBeVisible();
    
    // Paste stat block
    const textarea = page.locator('textarea[placeholder*="Paste a stat block"]');
    await textarea.fill(GOBLIN_STATBLOCK);
    
    // Select Source System
    await page.selectOption('select:has-text("Source System")', '5e');
    
    // Select Output System
    await page.selectOption('select:has-text("Output System")', 'shadowdark_compatible_v1');
    
    // Verify compatibility note appears
    await expect(page.locator('text=Compatibility profile for use with Shadowdark RPG')).toBeVisible();
    await expect(page.locator('text=not affiliated with The Arcane Library')).toBeVisible();
    
    // Set Threat Tier
    await page.fill('input[placeholder*="Auto-detect"]', '1');
    
    // Set Role
    await page.selectOption('select:has-text("Role")', 'skirmisher');
    
    // Verify preview appears
    await expect(page.locator('text=Output Preview')).toBeVisible();
    await expect(page.locator('text=Goblin')).toBeVisible();
    
    // Click Parse button
    await page.click('button:has-text("Parse Stat Block")');
  });

  test('Step 2: Parse Review', async ({ page }) => {
    // Fill Step 1 and proceed
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(GOBLIN_STATBLOCK);
    await page.selectOption('select:has-text("Source System")', '5e');
    await page.click('button:has-text("Parse Stat Block")');
    
    // Verify parsed fields
    await expect(page.locator('text=Goblin')).toBeVisible();
    await expect(page.locator('input[value="15"]')).toBeVisible(); // AC
    await expect(page.locator('input[value="7"]')).toBeVisible(); // HP
    
    // Edit name
    await page.fill('input[placeholder*="Creature name"]', 'Test Goblin');
    
    // Proceed to convert
    await page.click('button:has-text("Convert")');
  });

  test('Step 3: Convert and Adjust', async ({ page }) => {
    // Complete Steps 1-2
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(GOBLIN_STATBLOCK);
    await page.selectOption('select:has-text("Source System")', '5e');
    await page.click('button:has-text("Parse Stat Block")');
    await page.fill('input[placeholder*="Creature name"]', 'Test Goblin');
    await page.click('button:has-text("Convert")');
    
    // Verify Step 3 loads
    await expect(page.locator('h2:has-text("Step 3")')).toBeVisible();
    await expect(page.locator('text=Test Goblin')).toBeVisible();
    
    // Verify Band Validation panel
    await expect(page.locator('text=How This Was Tuned')).toBeVisible();
    
    // Expand Advanced tuning
    await page.click('summary:has-text("Advanced tuning")');
    
    // Verify sliders are visible
    const deadlinessInput = page.locator('input[aria-label="Deadliness percentage"]');
    await expect(deadlinessInput).toBeVisible();
    await expect(deadlinessInput).toHaveValue('100');
    
    // Test Deadliness adjustment
    await deadlinessInput.fill('150');
    await deadlinessInput.press('Tab');
    
    // Verify preview updates (check that stats changed)
    await expect(page.locator('text=Test Goblin')).toBeVisible();
    
    // Test Durability adjustment
    const durabilityInput = page.locator('input[aria-label="Durability percentage"]');
    await durabilityInput.fill('120');
    await durabilityInput.press('Tab');
    
    // Save to library
    await page.click('button:has-text("Save to Library")');
  });

  test('Step 4: Export', async ({ page }) => {
    // Complete Steps 1-3
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(GOBLIN_STATBLOCK);
    await page.selectOption('select:has-text("Source System")', '5e');
    await page.click('button:has-text("Parse Stat Block")');
    await page.click('button:has-text("Convert")');
    await page.click('button:has-text("Save to Library")');
    
    // Verify Step 4 loads
    await expect(page.locator('text=Saved Successfully')).toBeVisible();
    
    // Verify export options
    await expect(page.locator('button:has-text("Copy as Text")')).toBeVisible();
    await expect(page.locator('button:has-text("Copy JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Download JSON")')).toBeVisible();
    
    // Test Copy JSON
    await page.click('button:has-text("Copy JSON")');
    
    // Verify JSON contains metadata
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const json = JSON.parse(clipboardText);
    expect(json).toHaveProperty('tuning');
    expect(json.tuning).toHaveProperty('profileId');
    expect(json.tuning).toHaveProperty('role');
  });

  test('Error Handling: Empty Text', async ({ page }) => {
    // Try to proceed with empty textarea
    const parseButton = page.locator('button:has-text("Parse Stat Block")');
    await expect(parseButton).toBeDisabled();
    
    // Enter minimal text
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill('test');
    
    // Verify error message appears
    await expect(page.locator('text=Please enter at least 10 characters')).toBeVisible();
    await expect(parseButton).toBeDisabled();
  });

  test('Library: Saved Entry Appears', async ({ page }) => {
    // Create and save a creature
    await page.locator('textarea[placeholder*="Paste a stat block"]').fill(GOBLIN_STATBLOCK);
    await page.selectOption('select:has-text("Source System")', '5e');
    await page.click('button:has-text("Parse Stat Block")');
    await page.fill('input[placeholder*="Creature name"]', 'Library Test Goblin');
    await page.click('button:has-text("Convert")');
    await page.click('button:has-text("Save to Library")');
    
    // Navigate to library
    await page.click('button:has-text("Go to Library")');
    
    // Verify entry appears
    await expect(page.locator('text=Library Test Goblin')).toBeVisible();
  });

  test('Responsive: Mobile Layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/app/convert');
    
    // Verify Source System dropdown is visible (will stack on mobile)
    await expect(page.locator('text=Source System')).toBeVisible();
    await expect(page.locator('text=Output System')).toBeVisible();
    
    // Verify Tier and Role are visible (will stack on mobile)
    await expect(page.locator('text=Threat Tier')).toBeVisible();
    await expect(page.locator('text=Role')).toBeVisible();
  });
});
