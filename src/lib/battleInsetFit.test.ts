import { describe, expect, it } from 'vitest';
import {
  BATTLE_ANCHORS,
  BATTLE_SCENES,
  computeGroundedBattle,
} from '../../data/battleLayout';
import { BATTLE_HOLD_GEOM_390, HERO_SCENES } from '../../components/home/heroScene';

/**
 * 戰鬥幾何不再讀 standalone inset。
 * SA 的黑邊與縮放在 src/lib/gameContain.ts（整頁一層 contain）。
 * 用較矮的 rootH 重跑 heroSync 會把柳從 ≈0.528 縮到 ≈0.445（舊 H1 refit）。出貨路徑維持全高 844。
 * homeBox 不再因 inset 被丟棄。
 */
const W = 390;
const H = 844;
const SAT = 59;
const SAB = 34;
const liu = BATTLE_SCENES.liu_zong_yuan_battle;
const liuA = BATTLE_ANCHORS.liu_zong_yuan_battle;
const DAY0 = BATTLE_HOLD_GEOM_390.liu_zong_yuan;

describe('戰鬥 fit：SA 不改幾何', () => {
  const browser = computeGroundedBattle(liuA, liu, W, H)!;

  it('全高 844 ＝ Day0 browser hold（scale／left／top／faceX）', () => {
    expect(browser.layout.scale).toBeCloseTo(DAY0.scale, 3);
    expect(browser.layout.scale).toBeCloseTo(0.528, 3);
    expect(browser.layout.scale).toBeCloseTo(
      (browser.sceneBox.scale / (HERO_SCENES.liu_zong_yuan.bgZoom?.[0] ?? 1)) * (HERO_SCENES.liu_zong_yuan.figScale ?? 1),
      6,
    );
    expect(Math.abs(browser.layout.left - DAY0.left)).toBeLessThan(0.2);
    expect(Math.abs(browser.layout.top - DAY0.top)).toBeLessThan(0.2);
    expect(Math.abs(browser.layout.faceX - DAY0.faceX)).toBeLessThan(0.2);
  });

  it('較矮 playH（rootH−sat−sab）會縮 scale；出貨 fit 仍用 844，不做這次 refit', () => {
    const shrunk = computeGroundedBattle(liuA, liu, W, H - SAT - SAB)!;
    expect(shrunk.layout.scale).toBeCloseTo(0.445, 2);
    expect(browser.layout.scale).toBeCloseTo(0.528, 3);
    expect(browser.layout.scale - shrunk.layout.scale).toBeGreaterThan(0.05);
  });

  it('homeBox 沿用凍結幾何（不再因 inset 丟棄後改 letterbox）', () => {
    const stale = { bg: { left: -10, top: 40, scale: 0.5 }, scene: { left: -12, top: 48, scale: 0.5 } };
    const kept = computeGroundedBattle(liuA, liu, W, H, stale)!;
    expect(kept.layout.scale).toBeCloseTo(0.5 * 0.64, 6);
    expect(kept.layout.scale).not.toBeCloseTo(browser.layout.scale, 2);
    expect(kept.layout.top).not.toBeCloseTo(browser.layout.top, 0);
  });
});
