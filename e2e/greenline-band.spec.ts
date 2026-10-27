/**
 * Browser 綠線帶（390×844）：同態三邊兩兩 |Δ|≤2。
 * peek＝.home-drawer top；detail＝codex-info-chrome／.codex-inner-desc top；
 * battle hold＝玩家綠血條 track **頂**（HP 字在、主選單 opacity≈0）。
 * 不鎖裸絕對 Y，不要求宿主 400.8。SA letterbox 不在本 spec。
 */
import { expect, test } from '@playwright/test';
import { blockFirebase, enterAsGuest, levelBank, openBattle, pickChapter } from './support/battle';

const TOL = 2;

function maxPair(a: number, b: number, c: number) {
  return Math.max(Math.abs(a - b), Math.abs(a - c), Math.abs(b - c));
}

test.describe('green-line band（Browser HP top）', () => {
  test.beforeEach(async ({ context }) => {
    await blockFirebase(context);
  });

  test('peek／detail／battle 血條頂同態 |Δ|≤2；hold＝HP 開且主選單關', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterAsGuest(page);

    const kong = levelBank(6);
    await pickChapter(page, kong.title);
    await expect(page.locator('.home-drawer')).toHaveClass(/is-peek/);
    const peek = await page.evaluate(() => {
      const drawer = document.querySelector('.home-drawer');
      const hero = document.querySelector('.home-hero');
      const root = document.getElementById('root');
      if (!drawer || !hero || !root) return null;
      const scale = root.getBoundingClientRect().height / root.offsetHeight || 1;
      return {
        top: drawer.getBoundingClientRect().top,
        hostDesign: hero.getBoundingClientRect().height / scale,
      };
    });
    expect(peek).toBeTruthy();
    expect(Math.abs(peek!.hostDesign - 400.8)).toBeGreaterThan(TOL);

    await page.getByRole('navigation', { name: '主選單' }).getByRole('button', { name: '豪杰' }).click();
    await page.getByText('孔子', { exact: true }).click();
    const desc = page.locator('[data-testid="codex-info-chrome"].codex-inner-desc');
    await expect(desc).toBeVisible();
    const detailTop = await desc.evaluate((el) => el.getBoundingClientRect().top);

    await page.getByRole('navigation', { name: '主選單' }).getByRole('button', { name: '江湖' }).click();
    await openBattle(page, kong);
    await expect(page.locator('.input-pad-btn:not([disabled])').first()).toBeVisible();

    const battle = await page.evaluate(() => {
      const track = Array.from(document.querySelectorAll('div')).find((el) => {
        return el.classList.contains('h-[10px]')
          && !!el.querySelector(':scope > .hp-text')
          && (el.innerHTML || '').includes('#28a745');
      }) as HTMLElement | undefined;
      const nav = document.querySelector('nav[aria-label="主選單"]');
      const clip = document.querySelector('.battle-clip');
      if (!track || !nav || !clip) return null;
      let menuOpacity = 1;
      let el: HTMLElement | null = nav as HTMLElement;
      while (el) {
        const v = parseFloat(getComputedStyle(el).opacity || '1');
        if (Number.isFinite(v)) menuOpacity *= v;
        el = el.parentElement;
      }
      const rect = track.getBoundingClientRect();
      const hpText = track.querySelector('.hp-text')?.textContent ?? '';
      return {
        hpTop: rect.top,
        hpBottom: rect.bottom,
        hpH: rect.height,
        trackOpacity: parseFloat(getComputedStyle(track).opacity || '1'),
        menuOpacity,
        hasHpText: /\d/.test(hpText),
        battleRootTop: clip.getBoundingClientRect().top,
      };
    });

    expect(battle, 'battle hold probe').toBeTruthy();
    expect(battle!.hasHpText).toBe(true);
    expect(battle!.trackOpacity).toBeGreaterThan(0.9);
    expect(battle!.menuOpacity).toBeLessThan(0.05);
    expect(battle!.hpH).toBeGreaterThan(8);
    expect(battle!.hpH).toBeLessThan(14);
    expect(Math.abs(battle!.hpTop - battle!.battleRootTop)).toBeGreaterThan(TOL);
    expect(maxPair(peek!.top, detailTop, battle!.hpBottom)).toBeGreaterThan(TOL);
    expect(maxPair(peek!.top, detailTop, battle!.hpTop)).toBeLessThanOrEqual(TOL);
  });
});
