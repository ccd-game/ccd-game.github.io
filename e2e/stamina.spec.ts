/**
 * 體力煙霧：遊客入陣 −10 → 強制戰敗 +5；低體力顯示「體力不足」視窗。
 * 使用已開放的第 2 關（《始得西山宴遊記》）。
 */
import { test, expect } from '@playwright/test';
import { blockFirebase, enterAsGuest, levelBank, openBattle, pickChapter, waitTurnActive } from './support/battle';

async function readGuestStamina(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('ccd.guest.data.v2');
    if (!raw) return null;
    try { return JSON.parse(raw) as { stamina: number; staminaUpdatedAt: number }; }
    catch { return null; }
  });
}

async function setGuestStaminaLow(page: import('@playwright/test').Page, stamina: number) {
  await page.evaluate((s) => {
    const raw = sessionStorage.getItem('ccd.guest.data.v2');
    const d = raw ? JSON.parse(raw) : { level: 1, jiyuan: 100, exp: 0, score: 0, levels: {} };
    d.stamina = s;
    d.staminaUpdatedAt = Date.now();
    sessionStorage.setItem('ccd.guest.data.v2', JSON.stringify(d));
    sessionStorage.setItem('ccd.guest.v1', '1');
  }, stamina);
  await page.reload();
  await expect(page.getByText('載入中')).toHaveCount(0, { timeout: 20_000 });
  const enter = page.getByRole('button', { name: '進入地城' });
  if (await enter.isVisible().catch(() => false)) {
    await enter.click();
  }
  await expect(page.getByRole('navigation', { name: '主選單' })).toBeVisible({ timeout: 25_000 });
}

test.describe('stamina smoke', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ context }) => {
    await blockFirebase(context);
  });

  test('guest enter −10, forced defeat +5, low stamina shows modal', async ({ page }) => {
    const bank = levelBank(2); // 已開放
    await enterAsGuest(page);
    await expect(page.getByTestId('stamina-val')).toHaveText(/100\/100/, { timeout: 15_000 });

    // 入陣 −10
    await openBattle(page, bank);
    await waitTurnActive(page, bank);
    // 強制戰敗（AUTO → LOSE）
    await page.getByText('AUTO', { exact: true }).click();
    await page.getByText('LOSE', { exact: true }).click();
    await expect(page.getByTestId('stamina-refunded')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('stamina-refunded')).toContainText('已返還 5 點體力');
    await page.getByRole('button', { name: '孰能無惑' }).click();
    await expect(page.getByTestId('stamina-val')).toHaveText(/95\/100/, { timeout: 15_000 });
    const after = await readGuestStamina(page);
    expect(after?.stamina).toBe(95);

    // 低體力：寫 sessionStorage 後重整
    await setGuestStaminaLow(page, 5);
    await expect(page.getByTestId('stamina-val')).toHaveText(/5\/100/, { timeout: 15_000 });

    await pickChapter(page, bank.title);
    const enterLow = page.getByRole('button', { name: new RegExp(`入陣.*${bank.title}`) });
    for (let i = 0; i < 12 && !(await enterLow.isVisible()); i++) await page.getByRole('button', { name: '下一位古人' }).click();
    await enterLow.click();
    const go = page.getByRole('dialog', { name: '選擇入陣方式' }).getByRole('button', { name: '深入不毛' });
    await expect(go).toBeEnabled({ timeout: 15_000 });
    await go.click();
    await expect(page.getByTestId('stamina-modal')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stamina-modal')).toContainText('體力不足');
    await expect(page.getByTestId('stamina-modal')).toContainText('入陣需要 10 點體力');
    await page.getByRole('button', { name: '暫且休整' }).click();
    await expect(page.getByTestId('stamina-modal')).toHaveCount(0);
  });
});
