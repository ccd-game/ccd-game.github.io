import { describe, expect, it } from 'vitest';
import { BATTLE_SCENES, HOME_NAV_H, HOME_TOP_BAR_H, BATTLE_ANCHORS, computeGroundedBattle } from '../../data/battleLayout';
import {
  BATTLE_HOLD_GEOM_390,
  BATTLE_TO_HERO_KEY,
  HERO_SCENES,
  ONE_SOURCE_ACCEPTANCE_HEROES,
  SCENE_GEOMETRY,
  computeHeroFit,
  heroCharScale,
  heroFigStyle,
  heroPeekHeight,
} from '../../components/home/heroScene';

/**
 * one-source-geom-battle-r2b（叠 peek-h）：廢柳 homeSync／restOnBg；有 heroSync 的關只讀 HERO_SCENES。
 * 戰鬥 hold＝主頁 peek（同 viewport 下 computeHeroFit＋bgZoom＋rest／figScale）；peek≡CSS。
 */
describe('one-source：heroSync→HERO（廢 homeSync）', () => {
  const heroSyncBosses = Object.entries(BATTLE_SCENES).filter(([, sc]) => sc.heroSync);
  const homeSyncBosses = Object.entries(BATTLE_SCENES).filter(([, sc]) => sc.homeSync);

  it('柳／孔皆 heroSync；無任何 homeSync 平行真相', () => {
    expect(heroSyncBosses.map(([k]) => k)).toEqual(
      expect.arrayContaining(['liu_zong_yuan_battle', 'kong_zi_character']),
    );
    expect(BATTLE_SCENES.liu_zong_yuan_battle.heroSync).toBe('liu_zong_yuan');
    expect(BATTLE_SCENES.kong_zi_character.heroSync).toBe('kong_zi');
    expect(homeSyncBosses).toHaveLength(0);
    expect(BATTLE_SCENES.liu_zong_yuan_battle.homeSync).toBeUndefined();
    expect(BATTLE_SCENES.liu_zong_yuan_battle.restOnBg).toBeUndefined();
  });

  it.each(heroSyncBosses)('%s：heroSync 鍵存在於 HERO_SCENES；禁並行 homeSync', (battleKey, sc) => {
    expect(sc.homeSync).toBeUndefined();
    const hero = HERO_SCENES[sc.heroSync!];
    expect(hero, `missing HERO_SCENES[${sc.heroSync}]`).toBeTruthy();
    expect(BATTLE_TO_HERO_KEY[battleKey]).toBe(sc.heroSync);
  });

  it('柳 390×844：戰鬥 hold＝peek 幾何（L/T/scale/faceX Δ＝0；peek≡CSS）', () => {
    const W = 390, H = 844;
    const D = H - HOME_TOP_BAR_H - HOME_NAV_H;
    const Hp = heroPeekHeight(D);
    const hero = HERO_SCENES.liu_zong_yuan;
    const fit = computeHeroFit(hero, W, Hp, D);
    const zoom = hero.bgZoom![0], zoomX = hero.bgZoom![1];
    const bgScale = fit.s * zoom;
    const bgLeft = fit.left + zoomX * fit.s * (1 - zoom);
    const bgTop = HOME_TOP_BAR_H + fit.top + hero.h * fit.s * (1 - zoom);
    const charScale = fit.s * (hero.figScale ?? 1);
    const [rx, ry] = hero.rest!;
    const rfx = hero.footX!, rfy = hero.foot;
    const crop = BATTLE_SCENES.liu_zong_yuan_battle.crop!;
    const a = BATTLE_ANCHORS.liu_zong_yuan_battle;
    const left = fit.left + rx * fit.s - (rfx - crop.x) * charScale;
    const top = HOME_TOP_BAR_H + fit.top + ry * fit.s - (rfy - crop.y) * charScale;
    const faceX = left + a.faceX * charScale;

    const battle = computeGroundedBattle(
      BATTLE_ANCHORS.liu_zong_yuan_battle,
      BATTLE_SCENES.liu_zong_yuan_battle,
      W, H,
    )!;
    expect(battle.sceneBox.scale).toBeCloseTo(bgScale, 6);
    expect(battle.sceneBox.left).toBeCloseTo(bgLeft, 6);
    expect(battle.sceneBox.top).toBeCloseTo(bgTop, 6);
    expect(battle.layout.scale).toBeCloseTo(charScale, 6);
    expect(battle.layout.left).toBeCloseTo(left, 6);
    expect(battle.layout.top).toBeCloseTo(top, 6);
    expect(battle.layout.faceX).toBeCloseTo(faceX, 6);
    // 準源 hold：scale≈0.528
    expect(battle.layout.scale).toBeCloseTo(0.528, 3);
    expect(Math.abs(battle.layout.left - (-204.3043122530318))).toBeLessThan(0.2);
    expect(Math.abs(battle.layout.top - 130.63806372829907)).toBeLessThan(0.2);
    expect(Math.abs(battle.layout.faceX - 191.6956765036499)).toBeLessThan(0.2);
  });

  it('孔 390×844：戰鬥 hold＝peek（heroSync；CSS peek→scale≈0.791）', () => {
    const W = 390, H = 844;
    const D = H - HOME_TOP_BAR_H - HOME_NAV_H;
    const fit = computeHeroFit(HERO_SCENES.kong_zi, W, heroPeekHeight(D), D);
    const battle = computeGroundedBattle(
      BATTLE_ANCHORS.kong_zi_character,
      BATTLE_SCENES.kong_zi_character,
      W, H,
    )!;
    expect(battle.sceneBox.scale).toBeCloseTo(fit.s, 6);
    expect(battle.sceneBox.left).toBeCloseTo(fit.left, 6);
    expect(battle.sceneBox.top).toBeCloseTo(HOME_TOP_BAR_H + fit.top, 6);
    expect(battle.layout.scale).toBeCloseTo(fit.s, 6);
    // peek-h：CSS peek → ≈0.791（舊式 peek≈0.7837）
    expect(battle.layout.scale).toBeCloseTo(0.791, 2);
    expect(Math.abs(battle.layout.left - (-206.78125))).toBeLessThan(0.5);
    expect(Math.abs(battle.layout.top - 15.51)).toBeLessThan(0.3);
  });

  it('liu heroFigStyle：transformOrigin Y＝腳底％（rest 忽略 figOy）', () => {
    const style = heroFigStyle(HERO_SCENES.liu_zong_yuan);
    const oy = String(style.transformOrigin || '');
    expect(oy).toMatch(/87\.9/);
    expect(String(style.transform || '')).toMatch(/scale\(0\.64\)/);
  });
});

describe('align-v1315-home-r1：柳／孔 HERO 數字不變（禁改準源）', () => {
  it('柳：figScale 0.64、X 0.53、ax 867、無 figOy', () => {
    const h = HERO_SCENES.liu_zong_yuan;
    expect(h.figScale).toBeCloseTo(0.64, 5);
    expect(h.X).toBe(0.53);
    expect(h.ax).toBe(867);
    expect(h.figOy).toBeUndefined();
  });

  it('孔：figScale／figOy 皆 undefined；ax 508；heroSync 仍指向 kong_zi', () => {
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

/**
 * home-preview-follow-battle-size-r2＋peek-h：
 * 準源＝戰鬥 hold @390×844（柳 crop box scale≈0.528；孔全幅≈0.791＠CSS peek）。
 * 主頁 peek／圖鑑同讀 HERO；禁 restOnBg 第二套。
 */
describe('size-r2：三頁跟戰鬥 hold 準源（live chrome；peek≡CSS）', () => {
  const W = 390;
  /** PW 實測：hud zone／dungeon 高／英雄區高（browser 非 SA、抽屜 open） */
  const HUD = 121.796875;
  const D = 646.203125; // .home-dungeon.clientHeight
  const HeroH = 400.8125; // .home-hero.clientHeight

  it('heroPeekHeight ≡ CSS --peek-h（N=4：bar+14+(D−bar−56)/3）→ H≈400.802＠D≈646.2', () => {
    const Hp = heroPeekHeight(D);
    expect(Hp).toBeCloseTo(400.80208333333337, 5);
    expect(Math.abs(Hp - HeroH)).toBeLessThanOrEqual(0.02);
    expect(Hp).toBeCloseTo(D - (52 + 14 + (D - 52 - 56) / 3), 10);
  });

  const LIU_TARGET = { left: -204.3043122530318, top: 130.63806372829907, scale: 0.527999985008909, faceX: 191.6956765036499 };
  const KONG_TARGET = { left: -206.78125, top: 15.5625, scale: 0.79093017578125, faceX: 195.011279296875 };

  it('柳：peek 人物 scale／face／cap 跟戰鬥 hold 準源（HERO rest／figScale；禁 restOnBg）', () => {
    const hero = HERO_SCENES.liu_zong_yuan;
    const fit = computeHeroFit(hero, W, HeroH, D);
    const charScale = fit.s * (hero.figScale ?? 1);
    const [rx, ry] = hero.rest!;
    const rfx = hero.footX!, rfy = hero.foot;
    const crop = BATTLE_SCENES.liu_zong_yuan_battle.crop!;
    const a = BATTLE_ANCHORS.liu_zong_yuan_battle;
    const left = fit.left + rx * fit.s - (rfx - crop.x) * charScale;
    const top = HUD + fit.top + ry * fit.s - (rfy - crop.y) * charScale;
    const faceX = left + a.faceX * charScale;
    expect(charScale).toBeCloseTo(LIU_TARGET.scale, 3);
    expect(left).toBeCloseTo(LIU_TARGET.left, 0);
    expect(top).toBeCloseTo(LIU_TARGET.top, 0);
    expect(faceX).toBeCloseTo(LIU_TARGET.faceX, 0);
    expect(fit.s * (hero.figScale ?? 1)).toBeCloseTo(LIU_TARGET.scale, 3);
    const fitCodex = computeHeroFit(hero, W, heroPeekHeight(D), D);
    expect(fitCodex.s).toBeCloseTo(fit.s, 3);
    expect(BATTLE_SCENES.liu_zong_yuan_battle.restOnBg).toBeUndefined();
  });

  it('孔：peek 場景 box 跟戰鬥 hold 準源（heroSync 同源 HERO；CSS peek）', () => {
    const hero = HERO_SCENES.kong_zi;
    const fit = computeHeroFit(hero, W, HeroH, D);
    expect(hero.figScale ?? 1).toBe(1);
    const left = fit.left;
    const top = HUD + fit.top;
    const scale = fit.s;
    const faceX = left + hero.ax * scale;
    expect(scale).toBeCloseTo(KONG_TARGET.scale, 3);
    expect(left).toBeCloseTo(KONG_TARGET.left, 0);
    expect(top).toBeCloseTo(KONG_TARGET.top, 0);
    expect(faceX).toBeCloseTo(KONG_TARGET.faceX, 0);
    const fitCodex = computeHeroFit(hero, W, heroPeekHeight(D), D);
    expect(fitCodex.s).toBeCloseTo(fit.s, 3);
    expect(BATTLE_SCENES.kong_zi_character.heroSync).toBe('kong_zi');
  });

  it('柳／孔：圖鑑內頁與主頁 peek 同讀 HERO（fit.s 同源）', () => {
    for (const key of ['liu_zong_yuan', 'kong_zi'] as const) {
      const home = computeHeroFit(HERO_SCENES[key], W, HeroH, D);
      const codex = computeHeroFit(HERO_SCENES[key], W, heroPeekHeight(D), D);
      expect(codex.s).toBeCloseTo(home.s, 3);
    }
  });
});

describe('one-source：homeBox 入陣亦讀 HERO figScale（禁 scene.s 當人物）', () => {
  it('柳：homeBox.scene.s＝peek fit.s 時，layout.scale＝s×0.64（非 s）', () => {
    const W = 390, H = 844;
    const D = H - HOME_TOP_BAR_H - HOME_NAV_H;
    const hero = HERO_SCENES.liu_zong_yuan;
    const fit = computeHeroFit(hero, W, heroPeekHeight(D), D);
    const zoom = hero.bgZoom![0], zoomX = hero.bgZoom![1];
    const homeBox = {
      bg: {
        left: fit.left + zoomX * fit.s * (1 - zoom),
        top: HOME_TOP_BAR_H + fit.top + hero.h * fit.s * (1 - zoom),
        scale: fit.s * zoom,
      },
      scene: {
        left: fit.left,
        top: HOME_TOP_BAR_H + fit.top,
        scale: fit.s,
      },
    };
    const battle = computeGroundedBattle(
      BATTLE_ANCHORS.liu_zong_yuan_battle,
      BATTLE_SCENES.liu_zong_yuan_battle,
      W, H, homeBox,
    )!;
    expect(battle.layout.scale).toBeCloseTo(fit.s * 0.64, 6);
    expect(battle.layout.scale).toBeCloseTo(0.528, 3);
    expect(battle.sceneBox.scale).toBeCloseTo(fit.s * zoom, 6);
  });
});

/**
 * one-source-geom-home-r1＋battle-r2b：HERO／SCENE_GEOMETRY＝唯一幾何準源。
 * 柳戰鬥已廢 homeSync；預覽／圖鑑／戰鬥同讀；peek≡CSS。
 */
describe('one-source：SCENE_GEOMETRY 唯一準源', () => {
  it('SCENE_GEOMETRY ≡ HERO_SCENES（同一物件參照）', () => {
    expect(SCENE_GEOMETRY).toBe(HERO_SCENES);
  });

  it('驗收關主＝柳＋孔', () => {
    expect([...ONE_SOURCE_ACCEPTANCE_HEROES]).toEqual(['liu_zong_yuan', 'kong_zi']);
  });

  it.each([...ONE_SOURCE_ACCEPTANCE_HEROES])('%s：figScale 只存在於 HERO／SCENE_GEOMETRY（禁第二套）', (key) => {
    const a = HERO_SCENES[key];
    const b = SCENE_GEOMETRY[key];
    expect(a).toBe(b);
    expect(a.figScale).toBe(b.figScale);
    expect(a.ax).toBe(b.ax);
    expect(a.X).toBe(b.X);
    expect(heroCharScale(a, 1)).toBe(a.figScale ?? 1);
  });

  it('柳 HERO.figScale＝0.64；戰鬥無 homeSync／restOnBg（一源）', () => {
    const hero = SCENE_GEOMETRY.liu_zong_yuan;
    const sc = BATTLE_SCENES.liu_zong_yuan_battle;
    expect(sc.homeSync).toBeUndefined();
    expect(sc.restOnBg).toBeUndefined();
    expect(sc.heroSync).toBe('liu_zong_yuan');
    expect(hero.figScale).toBeCloseTo(0.64, 5);
  });

  it('孔無第二 figScale；戰鬥 heroSync 指向同一 HERO', () => {
    expect(SCENE_GEOMETRY.kong_zi.figScale).toBeUndefined();
    expect(BATTLE_SCENES.kong_zi_character.heroSync).toBe('kong_zi');
    expect(BATTLE_TO_HERO_KEY.kong_zi_character).toBe('kong_zi');
  });

  it('BATTLE_HOLD_GEOM_390 鎖準源 scale（柳 0.528／孔 ≈0.791＠CSS peek）', () => {
    expect(BATTLE_HOLD_GEOM_390.liu_zong_yuan.scale).toBeCloseTo(0.528, 3);
    expect(BATTLE_HOLD_GEOM_390.kong_zi.scale).toBeCloseTo(0.791, 2);
  });

  it('預覽／圖鑑同 D：heroCharScale 相同（禁分叉；peek≡CSS）', () => {
    const W = 390, D = 646.203125, HeroH = 400.8125;
    expect(heroPeekHeight(D)).toBeCloseTo(400.80208333333337, 5);
    for (const key of ONE_SOURCE_ACCEPTANCE_HEROES) {
      const sc = SCENE_GEOMETRY[key];
      const home = computeHeroFit(sc, W, HeroH, D);
      const codex = computeHeroFit(sc, W, heroPeekHeight(D), D);
      expect(heroCharScale(sc, codex.s)).toBeCloseTo(heroCharScale(sc, home.s), 5);
      expect(codex.s).toBeCloseTo(home.s, 5);
      expect(codex.left).toBeCloseTo(home.left, 2);
      expect(codex.top).toBeCloseTo(home.top, 2);
    }
  });
});
