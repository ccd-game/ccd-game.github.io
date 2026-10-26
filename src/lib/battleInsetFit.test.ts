import { describe, expect, it } from 'vitest';
import {
  BATTLE_ANCHORS,
  BATTLE_SCENES,
  HOME_NAV_H,
  HOME_TOP_BAR_H,
  battleInsetPlayfieldH,
  computeGroundedBattle,
  type BattleInsets,
} from '../../data/battleLayout';
import { BATTLE_HOLD_GEOM_390, HERO_SCENES, computeHeroFit, heroPeekHeight } from '../../components/home/heroScene';

/**
 * H1：standalone 的 sat／sab 改變戰鬥可玩區，heroSync fit 必須重算。
 * Browser（非 standalone）即使帶入 sat 也不改 Day0 幾何。不宣稱真機 scale↑。
 */
const W = 390;
const H = 844;
const SAT = 59;
const SAB = 34;
const liu = BATTLE_SCENES.liu_zong_yuan_battle;
const liuA = BATTLE_ANCHORS.liu_zong_yuan_battle;
const DAY0 = BATTLE_HOLD_GEOM_390.liu_zong_yuan;

const browserInsets: BattleInsets = { standalone: false, sat: SAT, sab: SAB };
const standaloneZero: BattleInsets = { standalone: true, sat: 0, sab: 0 };
const standaloneSat: BattleInsets = { standalone: true, sat: SAT, sab: 0 };
const standaloneBoth: BattleInsets = { standalone: true, sat: SAT, sab: SAB };

function fitOf(rootH: number) {
  const D = rootH - HOME_TOP_BAR_H - HOME_NAV_H;
  return computeHeroFit(HERO_SCENES.liu_zong_yuan, W, heroPeekHeight(D), D);
}

describe('battleInsetPlayfieldH', () => {
  it('browser 與零 inset standalone 維持 rootH', () => {
    expect(battleInsetPlayfieldH(H)).toBe(H);
    expect(battleInsetPlayfieldH(H, browserInsets)).toBe(H);
    expect(battleInsetPlayfieldH(H, standaloneZero)).toBe(H);
    expect(battleInsetPlayfieldH(H, { standalone: false, sat: 0, sab: SAB })).toBe(H);
  });

  it('standalone 可玩區高＝rootH − sat − sab', () => {
    expect(battleInsetPlayfieldH(H, standaloneSat)).toBe(H - SAT);
    expect(battleInsetPlayfieldH(H, standaloneBoth)).toBe(H - SAT - SAB);
  });
});

describe('戰鬥 fit：只在 standalone inset 重算', () => {
  const browser = computeGroundedBattle(liuA, liu, W, H)!;

  it('無 inset ＝ Day0 browser hold（scale／left／top／faceX；容差同既有 hold 鎖）', () => {
    expect(browser.layout.scale).toBeCloseTo(DAY0.scale, 3);
    expect(browser.layout.scale).toBeCloseTo(0.528, 3);
    expect(Math.abs(browser.layout.left - DAY0.left)).toBeLessThan(0.2);
    expect(Math.abs(browser.layout.top - DAY0.top)).toBeLessThan(0.2);
    expect(Math.abs(browser.layout.faceX - DAY0.faceX)).toBeLessThan(0.2);
  });

  it('browser 帶 sat／sab 與 Day0 同一幾何（不改 browser 路徑）', () => {
    const r = computeGroundedBattle(liuA, liu, W, H, null, browserInsets)!;
    expect(r.layout.scale).toBe(browser.layout.scale);
    expect(r.layout.top).toBe(browser.layout.top);
    expect(r.layout.left).toBe(browser.layout.left);
    expect(r.layout.faceX).toBe(browser.layout.faceX);
    expect(r.sceneBox.scale).toBe(browser.sceneBox.scale);
    expect(r.sceneBox.top).toBe(browser.sceneBox.top);
  });

  it('standalone 但 sat＝sab＝0 與 Day0 同一幾何', () => {
    const r = computeGroundedBattle(liuA, liu, W, H, null, standaloneZero)!;
    expect(r.layout.scale).toBe(browser.layout.scale);
    expect(r.layout.top).toBe(browser.layout.top);
    expect(r.sceneBox.top).toBe(browser.sceneBox.top);
  });

  it('standalone＋sat 重算 fit，且等於縮短後可玩區的 heroSync（不是只平移）', () => {
    const playH = battleInsetPlayfieldH(H, standaloneSat);
    const r = computeGroundedBattle(liuA, liu, W, H, null, standaloneSat)!;
    const short = computeGroundedBattle(liuA, liu, W, playH)!;
    const fit = fitOf(playH);
    expect(playH).toBe(H - SAT);
    expect(r.layout.scale).toBe(short.layout.scale);
    expect(r.layout.top).toBe(short.layout.top);
    expect(r.layout.left).toBe(short.layout.left);
    expect(r.layout.faceX).toBe(short.layout.faceX);
    expect(r.sceneBox.scale).toBeCloseTo(fit.s * (HERO_SCENES.liu_zong_yuan.bgZoom?.[0] ?? 1), 6);
    expect(r.layout.scale).toBeCloseTo(fit.s * (HERO_SCENES.liu_zong_yuan.figScale ?? 1), 6);
    expect(r.layout.scale).not.toBe(browser.layout.scale);
    expect(r.layout.top).not.toBe(browser.layout.top);
    expect(r.layout.scale).toBeLessThan(browser.layout.scale);
  });

  it('standalone＋sat＋sab 的可玩區再扣 sab，與只扣 sat 不同', () => {
    const satOnly = computeGroundedBattle(liuA, liu, W, H, null, standaloneSat)!;
    const both = computeGroundedBattle(liuA, liu, W, H, null, standaloneBoth)!;
    const playH = H - SAT - SAB;
    const short = computeGroundedBattle(liuA, liu, W, playH)!;
    expect(battleInsetPlayfieldH(H, standaloneBoth)).toBe(playH);
    expect(both.layout.scale).toBe(short.layout.scale);
    expect(both.layout.top).toBe(short.layout.top);
    expect(both.layout.faceX).toBe(short.layout.faceX);
    expect(both.layout.scale).not.toBe(satOnly.layout.scale);
    expect(both.layout.scale).toBeLessThan(satOnly.layout.scale);
    expect(both.layout.scale).not.toBeCloseTo(0.528, 3);
  });

  it('inset 生效時丟棄凍結的 homeBox，改跟縮短可玩區；browser 仍沿用 homeBox', () => {
    const stale = { bg: { left: -10, top: 40, scale: 0.5 }, scene: { left: -12, top: 48, scale: 0.5 } };
    const browserHb = computeGroundedBattle(liuA, liu, W, H, stale, browserInsets)!;
    const kept = computeGroundedBattle(liuA, liu, W, H, stale)!;
    expect(browserHb.layout.scale).toBe(kept.layout.scale);
    expect(browserHb.layout.scale).toBeCloseTo(0.5 * 0.64, 6);
    expect(browserHb.layout.top).toBe(kept.layout.top);

    const refit = computeGroundedBattle(liuA, liu, W, H, stale, standaloneBoth)!;
    const short = computeGroundedBattle(liuA, liu, W, H - SAT - SAB)!;
    expect(refit.layout.scale).toBe(short.layout.scale);
    expect(refit.layout.top).toBe(short.layout.top);
    expect(refit.layout.scale).not.toBe(kept.layout.scale);
  });
});
