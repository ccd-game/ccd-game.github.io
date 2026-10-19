import { describe, expect, it } from 'vitest';
import { BATTLE_ANCHORS, BATTLE_SCENES, HOME_NAV_H, HOME_TOP_BAR_H, battleAnchorKey, bossNameSlotY, computeGroundedBattle } from '../../data/battleLayout';
import { HERO_SCENES, computeHeroFit, heroPeekHeight } from '../../components/home/heroScene';
import { PORTRAIT_ANCHORS } from '../../data/portraits';
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

  it('390×844：背景頂高出畫面（三頁皆不露鏡像）；孔 figScale 缺省＝1（v1.3.15）', () => {
    const W = 390, H = 844, D = H - HOME_TOP_BAR_H - HOME_NAV_H, Hp = heroPeekHeight(D);
    const kz = computeHeroFit(HERO_SCENES.kong_zi, W, Hp, D);
    const lz = computeHeroFit(HERO_SCENES.liu_zong_yuan, W, Hp, D);
    expect(HOME_TOP_BAR_H + kz.top).toBeLessThan(0);              // 戰鬥頁（同幾何、自畫面頂起算）
    expect(kz.top + 720 * kz.s).toBeGreaterThanOrEqual(Hp - 0.5); // 首頁／圖鑑底不露
    expect(kz.top + 149.5 * kz.s).toBeGreaterThanOrEqual(11.9);    // 車蓋頂飾不出框
    const r = computeGroundedBattle(BATTLE_ANCHORS[key], BATTLE_SCENES[key], W, H)!;
    expect(r.sceneBox.mirrorTiles).toBe(false);
    // align-v1315-home-r1：孔無 figScale（缺省 1）、柳 0.64；不再要求臉高 ±5% face-lock（1.548 時代）
    expect(HERO_SCENES.kong_zi.figScale).toBeUndefined();
    expect(HERO_SCENES.kong_zi.figOy).toBeUndefined();
    expect(HERO_SCENES.liu_zong_yuan.figScale).toBeCloseTo(0.64, 5);
    const kzFace = PORTRAIT_ANCHORS.kong_zi.faceH * kz.s * (HERO_SCENES.kong_zi.figScale ?? 1);
    const lzFace = PORTRAIT_ANCHORS.liu_zong_yuan.faceH * lz.s * (HERO_SCENES.liu_zong_yuan.figScale ?? 1);
    expect(kzFace).toBeGreaterThan(0);
    expect(lzFace).toBeGreaterThan(0);
  });
});

describe('關主名字＋圖標固定槽位（BOSS_NAME_SLOT）', () => {
  it.each([[390, 844], [375, 667], [430, 932]])('%i×%i：全體關主名字位置相同、水平置中、等於柳宗元基準', (W, H) => {
    const ys = Object.keys(BATTLE_SCENES).map(k => computeGroundedBattle(BATTLE_ANCHORS[k], BATTLE_SCENES[k], W, H)!.layout);
    for (const l of ys) { expect(l.headX).toBe(W / 2); expect(l.headY).toBe(bossNameSlotY(W, H)); }
  });
  it('柳宗元 390×844 位置不變（v1.3.6：標籤底 y≈89.49）', () => {
    expect(bossNameSlotY(390, 844)).toBeCloseTo(89.494, 2);
  });
});
