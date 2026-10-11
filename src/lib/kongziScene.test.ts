import { describe, expect, it } from 'vitest';
import { BATTLE_ANCHORS, BATTLE_SCENES, HOME_NAV_H, HOME_TOP_BAR_H, battleAnchorKey, computeGroundedBattle } from '../../data/battleLayout';
import { HERO_SCENES, computeHeroFit, heroPeekHeight } from '../../components/home/heroScene';
import { LEVELS_DATA } from '../../data/levels';

describe('孔子 v3 三層場景（第 6 關）', () => {
  const level = LEVELS_DATA.find(l => l.id === 6)!;
  const key = battleAnchorKey(level.battleImg ?? level.bossImg);

  it('首頁、戰鬥使用新三層圖（不再用 kong_zi.png）', () => {
    expect(level.bossImg).toMatch(/kong_zi\/kong_zi_character\.webp$/);
    expect(level.bgImg).toMatch(/kong_zi_bg\.webp$/);
    expect(HERO_SCENES.kong_zi.bg).toBe(level.bgImg);
    expect(HERO_SCENES.kong_zi.front).toMatch(/kong_zi_weapon\.webp$/);
    expect(BATTLE_SCENES[key]?.front).toBe(HERO_SCENES.kong_zi.front);
    expect(LEVELS_DATA.some(l => /kong_zi\.png$/.test(l.bossImg))).toBe(false);
  });

  it.each([[390, 844], [375, 667], [430, 932]])('未經首頁入陣時（%i×%i）戰鬥場景＝首頁預覽同一套縮放與位置；人物與背景同框（輪蹄著地）', (W, H) => {
    const r = computeGroundedBattle(BATTLE_ANCHORS[key], BATTLE_SCENES[key], W, H)!;
    const D = H - HOME_TOP_BAR_H - HOME_NAV_H;
    const fit = computeHeroFit(HERO_SCENES.kong_zi, W, heroPeekHeight(D), D);
    expect(r.sceneBox.scale).toBeCloseTo(fit.s, 6);
    expect(r.sceneBox.left).toBeCloseTo(fit.left, 6);
    expect(r.sceneBox.top).toBeCloseTo(HOME_TOP_BAR_H + fit.top, 6);
    // 三層全幅對齊：人物框＝背景框 → 前輪 (358.9,640.9)、馬蹄 (685,705) 在背景同一點
    expect(r.layout.left).toBeCloseTo(r.sceneBox.left, 6);
    expect(r.layout.top).toBeCloseTo(r.sceneBox.top, 6);
    expect(r.layout.scale).toBeCloseTo(r.sceneBox.scale, 6);
    expect(r.layout.width).toBeCloseTo(r.sceneBox.width, 6);
    // 名字在車蓋頂飾之上
    expect(r.layout.headY).toBeLessThan(r.layout.top + 149.5 * r.layout.scale);
  });

  it('首頁無縫入陣（homeBox）時沿用量到的首頁幾何', () => {
    const hb = { bg: { left: -223.3, top: -9.7, scale: 0.7339 }, scene: { left: -223.3, top: -9.7, scale: 0.7339 } };
    const r = computeGroundedBattle(BATTLE_ANCHORS[key], BATTLE_SCENES[key], 390, 844, hb)!;
    expect(r.layout.left).toBeCloseTo(-223.3, 6);
    expect(r.layout.top).toBeCloseTo(-9.7, 6);
    expect(r.layout.scale).toBeCloseTo(0.7339, 6);
  });
});
