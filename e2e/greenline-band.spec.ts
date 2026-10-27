import { expect, test, type Page } from '@playwright/test';
import { blockFirebase, enterAsGuest, levelBank, openBattle } from './support/battle';

/**
 * 同態綠線：peek .home-drawer 頂、detail codex-info-chrome 頂、戰鬥玩家血條頂。
 * |Δ|≤2。禁跨態拿絕對 Y 當對齊閘。SA 模擬 sat59／sab34（≠真機）。
 * peek host 維持設計鎖（SA ≈312.7），禁止抬回 heroPeekHeight 400.8。
 */
const TOL = 2;
const PEEK_RECT = 493.5;
const DETAIL_GREEN = 495;

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

function align(peek: number, detail: number, battle: number) {
  const deltas = {
    'peek-detail': Math.abs(peek - detail),
    'peek-battle': Math.abs(peek - battle),
    'detail-battle': Math.abs(detail - battle),
  };
  const maxAbsDelta = Math.max(deltas['peek-detail'], deltas['peek-battle'], deltas['detail-battle']);
  return { deltas, maxAbsDelta, aligned: maxAbsDelta <= TOL };
}

async function applyStandalone(page: Page) {
  await page.evaluate(() => {
    document.documentElement.classList.add('is-standalone');
    document.documentElement.style.setProperty('--sat', '59px');
    document.documentElement.style.setProperty('--sab', '34px');
  });
}

async function measureHome(page: Page) {
  const bar = page.locator('.home-drawer-bar');
  await expect(bar).toBeVisible();
  if (await bar.getAttribute('aria-expanded') !== 'false') {
    await bar.click();
  }
  await expect(page.locator('.home-drawer')).toHaveClass(/is-peek/);
  await expect.poll(async () => page.locator('.home-drawer').evaluate((el) => el.getBoundingClientRect().top), { timeout: 5_000 }).toBeLessThan(520);
  await page.waitForTimeout(550);

  const peek = await page.locator('.home-drawer').evaluate((el) => ({
    top: el.getBoundingClientRect().top,
    hostH: (el.parentElement?.querySelector('.home-hero-slot') as HTMLElement | null)?.getBoundingClientRect().height ?? null,
  }));

  await page.locator('[data-tab="character"]').click();
  await page.getByText('孔子', { exact: true }).first().click();
  const chrome = page.getByTestId('codex-info-chrome');
  await expect(chrome).toBeVisible();
  await expect.poll(async () => chrome.evaluate((el) => getComputedStyle(el).visibility)).toBe('visible');
  const detail = await chrome.evaluate((el) => el.getBoundingClientRect().top);

  await page.locator('[data-testid="codex-inner"] > button').click();
  await expect(chrome).toBeHidden();
  return { peekY: peek.top, hostH: peek.hostH, detailY: detail };
}

async function measureBattle(page: Page) {
  await page.locator('[data-tab="dungeon"]').click();
  await openBattle(page, levelBank(6));
  const track = page.getByTestId('player-hp-track');
  await expect.poll(async () => track.evaluate((el) => {
    const text = el.querySelector('.hp-text')?.textContent ?? '';
    const nav = document.querySelector('[aria-label="主選單"]');
    const shell = nav?.parentElement;
    const menuOpacity = shell ? parseFloat(getComputedStyle(shell).opacity) : 1;
    const opacity = parseFloat(getComputedStyle(el).opacity);
    return /\d/.test(text) && menuOpacity < 0.05 && opacity > 0.9;
  }), { timeout: 40_000 }).toBe(true);
  return track.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const root = document.getElementById('root');
    const rootTop = root?.getBoundingClientRect().top ?? 0;
    return { top: r.top, h: r.height, rootTop, designTop: r.top - rootTop };
  });
}

test.describe('綠線帶同態對齊', () => {
  test('Browser：peek／detail／血條頂 |Δ|≤2', async ({ page }) => {
    await blockFirebase(page.context());
    await enterAsGuest(page);
    const home = await measureHome(page);
    const battle = await measureBattle(page);
    const gate = align(home.peekY, home.detailY, battle.top);
    console.log(JSON.stringify({ mode: 'browser', ...home, battleHpTop: battle.top, battle, gate }));
    expect(gate.aligned, JSON.stringify(gate)).toBe(true);
    expect(Math.abs(home.peekY - PEEK_RECT)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(home.detailY - DETAIL_GREEN)).toBeLessThanOrEqual(TOL);
    expect(home.hostH).not.toBeNull();
    expect(Math.abs((home.hostH ?? 0) - 371.7)).toBeLessThan(3);
  });

  test('Standalone sat59／sab34：同帶 |Δ|≤2，peek host 維持 ≈313 而非 400.8', async ({ page }) => {
    await blockFirebase(page.context());
    await enterAsGuest(page);
    await applyStandalone(page);
    const home = await measureHome(page);
    await applyStandalone(page);
    const battle = await measureBattle(page);
    const gate = align(home.peekY, home.detailY, battle.top);
    console.log(JSON.stringify({ mode: 'standalone', ...home, battleHpTop: battle.top, battle, gate }));
    expect(gate.aligned, JSON.stringify(gate)).toBe(true);
    expect(Math.abs(home.peekY - PEEK_RECT)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(home.detailY - DETAIL_GREEN)).toBeLessThanOrEqual(TOL);
    expect(battle.top).toBeLessThan(510);
    expect(home.hostH).not.toBeNull();
    expect(Math.abs((home.hostH ?? 0) - 312.7)).toBeLessThan(3);
    expect(Math.abs((home.hostH ?? 0) - 400.8)).toBeGreaterThan(20);
  });
});
