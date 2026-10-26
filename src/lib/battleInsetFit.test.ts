import { describe, expect, it } from 'vitest';
import {
  BATTLE_ANCHORS,
  BATTLE_SCENES,
  HOME_NAV_H,
  HOME_TOP_BAR_H,
  battleInsetLetterboxDy,
  battleInsetPlayfieldH,
  computeGroundedBattle,
  type BattleInsets,
} from '../../data/battleLayout';
import { BATTLE_HOLD_GEOM_390, HERO_SCENES, computeHeroFit, heroPeekHeight } from '../../components/home/heroScene';

/**
 * standalone+(sat|sab)>0：可玩區變矮，但 hero scale 鎖定無 homeBox 的 Browser 公式（390×844 柳 ≈0.528），
 * 場景在 .battle-clip 內垂直置中，留白不鏡射（黑邊）。Browser／零 inset 仍是 Day0。
 * 不把較矮的 playH 重跑 heroSync（那會縮到 ≈0.445）。不宣稱真機 scale↑。
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

describe('battleInsetLetterboxDy', () => {
  it('置中位移不含 sat；場景較矮則上下留白，較高則上下等裁', () => {
    const bars = battleInsetLetterboxDy(10, 100, 140);
    expect(bars).toBe((140 - 100) / 2 - 10);
    expect(bars).not.toBe(SAT + (140 - 100) / 2 - 10);
    const crop = battleInsetLetterboxDy(20, 100, 80);
    expect(crop).toBe((80 - 100) / 2 - 20);
    expect(crop).toBeLessThan(0);
  });
});

describe('戰鬥 fit：standalone inset 只 letterbox，不縮小 scale', () => {
  const browser = computeGroundedBattle(liuA, liu, W, H)!;
  const browserFit = fitOf(H);

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

  it('standalone＋sat＋sab：scale 停在 Browser 公式，場景在可玩區內上下留白置中', () => {
    const playH = battleInsetPlayfieldH(H, standaloneBoth);
    const r = computeGroundedBattle(liuA, liu, W, H, null, standaloneBoth)!;
    const shrunk = computeGroundedBattle(liuA, liu, W, playH)!;
    const dy = battleInsetLetterboxDy(browser.sceneBox.top, browser.sceneBox.height, playH);
    expect(playH).toBe(H - SAT - SAB);
    expect(shrunk.layout.scale).toBeCloseTo(0.445, 2);
    expect(r.layout.scale).toBe(browser.layout.scale);
    expect(r.layout.scale).toBeCloseTo(0.528, 3);
    expect(r.layout.scale).toBeCloseTo(browserFit.s * (HERO_SCENES.liu_zong_yuan.figScale ?? 1), 6);
    expect(r.layout.scale).not.toBeCloseTo(shrunk.layout.scale, 2);
    expect(r.sceneBox.scale).toBe(browser.sceneBox.scale);
    expect(r.sceneBox.scale).toBeCloseTo(browserFit.s * (HERO_SCENES.liu_zong_yuan.bgZoom?.[0] ?? 1), 6);
    expect(r.sceneBox.height).toBe(browser.sceneBox.height);
    expect(r.sceneBox.left).toBe(browser.sceneBox.left);
    expect(r.layout.left).toBe(browser.layout.left);
    expect(r.layout.faceX).toBe(browser.layout.faceX);
    expect(r.sceneBox.top).toBeCloseTo((playH - r.sceneBox.height) / 2, 6);
    expect(r.sceneBox.top).toBeCloseTo(browser.sceneBox.top + dy, 6);
    expect(r.layout.top).toBeCloseTo(browser.layout.top + dy, 6);
    expect(r.layout.faceY).toBeCloseTo(browser.layout.faceY + dy, 6);
    expect(r.layout.headY).toBeCloseTo(browser.layout.headY + dy, 6);
    expect(Math.abs(r.layout.top - (browser.layout.top + SAT))).toBeGreaterThan(10);
    expect(Math.abs(r.layout.top - (browser.layout.top - SAT))).toBeGreaterThan(10);
    expect(r.sceneBox.top).toBeGreaterThan(0);
    expect(r.sceneBox.top + r.sceneBox.height).toBeLessThan(playH);
    expect(r.sceneBox.mirrorTiles).toBe(false);
    expect(r.sceneBox.mirrorBottom).toBe(false);
    expect(r.sceneBox.gap?.top).toBeCloseTo(r.sceneBox.top, 6);
    expect(r.sceneBox.gap?.bottom).toBeCloseTo(playH - (r.sceneBox.top + r.sceneBox.height), 6);
    expect(r.sceneBox.gap?.top).toBeCloseTo(r.sceneBox.gap?.bottom ?? -1, 4);
  });

  it('只扣 sat 與 sat＋sab：scale 相同，置中跟著可玩區高變', () => {
    const satOnly = computeGroundedBattle(liuA, liu, W, H, null, standaloneSat)!;
    const both = computeGroundedBattle(liuA, liu, W, H, null, standaloneBoth)!;
    const playSat = H - SAT;
    const playBoth = H - SAT - SAB;
    expect(satOnly.layout.scale).toBe(browser.layout.scale);
    expect(both.layout.scale).toBe(browser.layout.scale);
    expect(satOnly.sceneBox.top).toBeCloseTo((playSat - satOnly.sceneBox.height) / 2, 6);
    expect(both.sceneBox.top).toBeCloseTo((playBoth - both.sceneBox.height) / 2, 6);
    expect(both.sceneBox.top).not.toBeCloseTo(satOnly.sceneBox.top, 1);
    expect(both.layout.top).not.toBeCloseTo(satOnly.layout.top, 1);
  });

  it('inset 生效時丟棄凍結的 homeBox，改走 Browser 公式再 letterbox；browser 仍沿用 homeBox', () => {
    const stale = { bg: { left: -10, top: 40, scale: 0.5 }, scene: { left: -12, top: 48, scale: 0.5 } };
    const browserHb = computeGroundedBattle(liuA, liu, W, H, stale, browserInsets)!;
    const kept = computeGroundedBattle(liuA, liu, W, H, stale)!;
    expect(browserHb.layout.scale).toBe(kept.layout.scale);
    expect(browserHb.layout.scale).toBeCloseTo(0.5 * 0.64, 6);
    expect(browserHb.layout.top).toBe(kept.layout.top);

    const refit = computeGroundedBattle(liuA, liu, W, H, stale, standaloneBoth)!;
    const letterboxed = computeGroundedBattle(liuA, liu, W, H, null, standaloneBoth)!;
    const shrunk = computeGroundedBattle(liuA, liu, W, H - SAT - SAB)!;
    expect(refit.layout.scale).toBe(letterboxed.layout.scale);
    expect(refit.layout.scale).toBeCloseTo(0.528, 3);
    expect(refit.layout.top).toBeCloseTo(letterboxed.layout.top, 6);
    expect(refit.sceneBox.top).toBeCloseTo(letterboxed.sceneBox.top, 6);
    expect(refit.layout.scale).not.toBeCloseTo(kept.layout.scale, 2);
    expect(refit.layout.scale).not.toBeCloseTo(shrunk.layout.scale, 2);
  });
});
