import { test, expect } from '@playwright/test';

type BgmHook = {
  menu: { volume: number; muted: boolean };
  battle: { volume: number; muted: boolean };
};

async function readBgm(page: import('@playwright/test').Page): Promise<BgmHook> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __bgmAudio?: { menu: HTMLAudioElement; battle: HTMLAudioElement };
    };
    const a = w.__bgmAudio;
    if (!a) throw new Error('__bgmAudio missing');
    return {
      menu: { volume: a.menu.volume, muted: a.menu.muted },
      battle: { volume: a.battle.volume, muted: a.battle.muted },
    };
  });
}

async function applyVolume(page: import('@playwright/test').Page, v: number): Promise<void> {
  await page.evaluate((vol) => {
    const w = window as unknown as { __applyBgmVolumeForTest?: (n: number) => void };
    if (!w.__applyBgmVolumeForTest) throw new Error('__applyBgmVolumeForTest missing');
    w.__applyBgmVolumeForTest(vol);
  }, v);
}

test.describe('BGM volume silence', () => {
  test('0% → volume 0 + muted; 50% → ~0.5 unmuted', async ({ page }) => {
    await page.goto('./');
    await page.waitForFunction(() => !!(window as unknown as { __bgmAudio?: unknown }).__bgmAudio);

    await applyVolume(page, 0);
    const at0 = await readBgm(page);
    expect(at0.menu.volume).toBe(0);
    expect(at0.battle.volume).toBe(0);
    expect(at0.menu.muted).toBe(true);
    expect(at0.battle.muted).toBe(true);

    await applyVolume(page, 0.5);
    const at50 = await readBgm(page);
    expect(at50.menu.volume).toBeCloseTo(0.5, 5);
    expect(at50.battle.volume).toBeCloseTo(0.5, 5);
    expect(at50.menu.muted).toBe(false);
    expect(at50.battle.muted).toBe(false);

    await applyVolume(page, 1);
    const at100 = await readBgm(page);
    expect(at100.menu.volume).toBeCloseTo(1, 5);
    expect(at100.battle.volume).toBeCloseTo(1, 5);
    expect(at100.menu.muted).toBe(false);
    expect(at100.battle.muted).toBe(false);
  });
});
