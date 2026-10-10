import { test, expect, type Page } from '@playwright/test';

async function enterAsGuest(page: Page) {
  await page.goto('./');
  await expect(page.getByText('載入中')).toHaveCount(0, { timeout: 20_000 });
  const guestBtn = page.getByTestId('guest-enter');
  await expect(guestBtn).toBeVisible({ timeout: 10_000 });
  await expect(guestBtn).toHaveText('遊客進入');
  await guestBtn.click();
  // Auto-enter animation, then LoginGate unmounts.
  await expect(page.locator('img[alt="遊戲名稱"]')).toHaveCount(0, { timeout: 25_000 });
  await expect(page.getByRole('navigation', { name: '主選單' })).toBeVisible();
}

test.describe('Guest mode (遊客進入)', () => {
  test('click 遊客進入 → main menu without Google; guest tag shown', async ({ page }) => {
    await enterAsGuest(page);
    await expect(page.getByTestId('guest-badge')).toHaveText('遊客');
    await expect(page.getByTestId('google-sign-in')).toHaveCount(0);
  });

  test('guest button meets 44px touch target', async ({ page }) => {
    await page.goto('./');
    const box = await page.getByTestId('guest-enter').boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('rank tab: empty state CTA returns to LoginGate', async ({ page }) => {
    await enterAsGuest(page);
    await page.getByRole('navigation', { name: '主選單' }).getByRole('button', { name: '排名' }).click();
    await expect(page.getByText('登入學校帳戶即可上榜')).toBeVisible();
    await page.getByTestId('rank-guest-login').click();
    await expect(page.getByTestId('google-sign-in')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('guest-enter')).toBeVisible();
  });

  test('settings: 遊客 account card → 登入學校帳戶 returns to LoginGate', async ({ page }) => {
    await enterAsGuest(page);
    await page.getByRole('navigation', { name: '主選單' }).getByRole('button', { name: '設定' }).click();
    await expect(page.getByTestId('settings-account-label')).toHaveText('遊客');
    await page.getByTestId('guest-login-account').click();
    await expect(page.getByTestId('google-sign-in')).toBeVisible({ timeout: 10_000 });
  });

  test('refresh restores guest session (sessionStorage)', async ({ page }) => {
    await enterAsGuest(page);
    await page.reload();
    await expect(page.getByTestId('login-guest-identity')).toContainText('目前身分：遊客', { timeout: 20_000 });
    // 登入頁已無進場動畫（「跳過動畫」已移除）：按「進入地城」直接進入
    await page.getByRole('button', { name: '進入地城' }).click();
    await expect(page.getByTestId('guest-badge')).toBeVisible({ timeout: 10_000 });
  });
});
