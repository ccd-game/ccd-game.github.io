import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Login screen first-load', () => {
  test('boot mask clears and login trio renders (webp)', async ({ page }) => {
    await page.goto('./');

    // Wait until boot mask is gone (preload of login trio only; no artificial min delay).
    await expect(page.getByText('載入中')).toHaveCount(0, { timeout: 20_000 });

    const signIn = page.getByTestId('google-sign-in');
    await expect(signIn).toBeVisible({ timeout: 10_000 });

    const bg = page.locator('img[alt="背景"]');
    const char = page.locator('img[alt="角色"]');
    const title = page.locator('img[alt="遊戲名稱"]');
    await expect(bg).toBeVisible();
    await expect(char).toBeVisible();
    await expect(title).toBeVisible();

    await expect(bg).toHaveAttribute('src', /bg_loginscreen\.webp/);
    await expect(char).toHaveAttribute('src', /character1\.webp/);
    await expect(title).toHaveAttribute('src', /bg_logingamename\.webp/);

    for (const loc of [bg, char, title]) {
      await expect
        .poll(async () => loc.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
    }

    await expect(signIn).toContainText('學校 Google');

    const shotPath = path.join(__dirname, 'login-screen.png');
    await page.screenshot({ path: shotPath, fullPage: true });
  });
});
