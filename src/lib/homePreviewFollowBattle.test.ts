import { describe, expect, it } from 'vitest';
import { BATTLE_SCENES, HOME_NAV_H, HOME_TOP_BAR_H, BATTLE_ANCHORS, computeGroundedBattle } from '../../data/battleLayout';
import {
  BATTLE_TO_HERO_KEY,
  HERO_SCENES,
  computeHeroFit,
  heroFigScaleFromBattleRel,
  heroFigStyle,
  heroPeekHeight,
} from '../../components/home/heroScene';

/**
 * align-v1315-home-r1：柳 HERO＝v1.3.15（同 homeSync／restOnBg）；孔＝v1.3.15（無 figScale／figOy）。
 * 有 homeSync 的關主，HERO 必須跟戰鬥錨（預覽←戰鬥）。
 */
describe('預覽跟戰鬥（homeSync／restOnBg）', () => {
  const homeSyncBosses = Object.entries(BATTLE_SCENES).filter(([, sc]) => sc.homeSync);

  it('至少有柳宗元帶 homeSync（權威錨）', () => {
    expect(homeSyncBosses.map(([k]) => k)).toContain('liu_zong_yuan_battle');
  });

  it.each(homeSyncBosses)('%s：HERO figScale／X／ax／bgZoom ＝ homeSync＋restOnBg', (battleKey, sc) => {
    const heroKey = BATTLE_TO_HERO_KEY[battleKey] ?? battleKey.replace(/_battle$/, '').replace(/_character$/, '');
    const hero = HERO_SCENES[heroKey];
    expect(hero, `missing HERO_SCENES[${heroKey}]`).toBeTruthy();
    const hs = sc.homeSync!;
    expect(hero.X).toBe(hs.X);
    expect(hero.ax).toBe(hs.ax);
    expect(hero.bgZoom?.[0]).toBe(hs.zoom);
    expect(hero.bgZoom?.[1]).toBe(hs.zoomX);
    expect(hero.topPad ?? 12).toBe(hs.topPad);
    if (sc.restOnBg) {
      const expectedFig = heroFigScaleFromBattleRel(sc.restOnBg.relScale, hs.zoom);
      expect(hero.figScale).toBeCloseTo(expectedFig, 5);
      const headY = hero.rest
        ? hero.rest[1] - (hero.foot - hero.head) * (hero.figScale ?? 1)
        : hero.head;
      expect(headY).toBeCloseTo(hs.headY, 5);
    }
    expect(hero.figOy).toBeUndefined();
  });

  it('柳 390×844 peek：主頁幾何 ≈ 戰鬥 homeSync／restOnBg（無 homeBox）', () => {
    const W = 390, H = 844;
    const D = H - HOME_TOP_BAR_H - HOME_NAV_H;
    const Hp = heroPeekHeight(D);
    const hero = HERO_SCENES.liu_zong_yuan;
    const fit = computeHeroFit(hero, W, Hp, D);
    const zoom = hero.bgZoom![0], zoomX = hero.bgZoom![1];
    const bgScale = fit.s * zoom;
    const bgLeft = fit.left + zoomX * fit.s * (1 - zoom);
    const bgTop = HOME_TOP_BAR_H + fit.top + hero.h * fit.s * (1 - zoom);

    const battle = computeGroundedBattle(
      BATTLE_ANCHORS.liu_zong_yuan_battle,
      BATTLE_SCENES.liu_zong_yuan_battle,
      W, H,
    )!;
    expect(battle.sceneBox.scale).toBeCloseTo(bgScale, 4);
    expect(battle.sceneBox.left).toBeCloseTo(bgLeft, 1);
    expect(battle.sceneBox.top).toBeCloseTo(bgTop, 1);

    const charScale = fit.s * (hero.figScale ?? 1);
    expect(battle.layout.scale).toBeCloseTo(charScale, 4);
  });

  it('liu heroFigStyle：transformOrigin Y＝腳底％（rest 忽略 figOy）', () => {
    const style = heroFigStyle(HERO_SCENES.liu_zong_yuan);
    const oy = String(style.transformOrigin || '');
    // foot 633 / 720 ≈ 87.9167%
    expect(oy).toMatch(/87\.9/);
    expect(String(style.transform || '')).toMatch(/scale\(0\.64\)/);
  });
});

describe('align-v1315-home-r1：柳／孔 HERO ＝ a628cce', () => {
  it('柳：figScale 0.64、X 0.53、ax 867、無 figOy', () => {
    const h = HERO_SCENES.liu_zong_yuan;
    expect(h.figScale).toBeCloseTo(0.64, 5);
    expect(h.X).toBe(0.53);
    expect(h.ax).toBe(867);
    expect(h.figOy).toBeUndefined();
  });

  it('孔：figScale／figOy 皆 undefined（＝v1.3.15）；ax 508；heroSync 仍指向 kong_zi', () => {
    expect(BATTLE_SCENES.kong_zi_character.heroSync).toBe('kong_zi');
    expect(HERO_SCENES.kong_zi.figScale).toBeUndefined();
    expect(HERO_SCENES.kong_zi.figOy).toBeUndefined();
    expect(HERO_SCENES.kong_zi.ax).toBe(508);
    expect(HERO_SCENES.kong_zi.X).toBe(0.5);
    expect(HERO_SCENES.kong_zi.head).toBe(149.5);
    expect(HERO_SCENES.kong_zi.foot).toBe(640.9);
    expect(HERO_SCENES.kong_zi.k).toBe(2.28);
  });
});
