import { describe, expect, it } from 'vitest';
import { HERO_SCENES, computeHeroFit } from './home/heroScene';
import { CHROME_DRAWER_RECT_TOP_Y, CHROME_GREEN_TOP_Y, CHROME_ZONE_H } from './tabs/drawerMath';
import {
  CHROME_GREEN_ALIGN_MAX_DELTA,
  CHROME_PEEK_OPTICAL_INSET,
  codexDetailBand,
  designScaleFromRoot,
  viewportYToDesign,
} from './codexDetailLayout';

const NAV_H = 76;
const DESIGN_H = 844;

describe('codexDetailBand：設計 px 綠線鎖', () => {
  it('browser 390×844、無 sat／sab：舞台 371.7、紙從 RECT、D≈646.2', () => {
    const codexTop = CHROME_ZONE_H;
    const navTop = DESIGN_H - NAV_H;
    const band = codexDetailBand(codexTop, navTop);
    // #14：marginTop＝0（紙蓋 RECT）；禁再留 GREEN−RECT＝1.5 空隙
    expect(band.marginTop).toBe(0);
    expect(CHROME_PEEK_OPTICAL_INSET).toBeCloseTo(1.5, 5);
    expect(band.stageH).toBeCloseTo(CHROME_DRAWER_RECT_TOP_Y - CHROME_ZONE_H, 5);
    expect(band.height).toBeCloseTo(navTop - CHROME_DRAWER_RECT_TOP_Y, 5);
    expect(band.D).toBeCloseTo(navTop - codexTop, 5);
    expect(codexTop + band.stageH + band.marginTop + band.height).toBeCloseTo(navTop, 5);
  });

  it('standalone contain 不把 sat／sab 加進帶高；紙頂≡RECT，對綠線 |Δ|≤2', () => {
    const browser = codexDetailBand(CHROME_ZONE_H, DESIGN_H - NAV_H);
    const standalone = codexDetailBand(CHROME_ZONE_H, DESIGN_H - NAV_H);
    expect(standalone).toEqual(browser);
    const paperTop = CHROME_ZONE_H + standalone.stageH + standalone.marginTop;
    expect(paperTop).toBeCloseTo(CHROME_DRAWER_RECT_TOP_Y, 5);
    expect(Math.abs(paperTop - CHROME_GREEN_TOP_Y)).toBeLessThanOrEqual(CHROME_GREEN_ALIGN_MAX_DELTA);
    expect(standalone.height).toBeGreaterThan(200);
  });

  it('nav 在紙頂之上時描述高為 0（不寫負高）', () => {
    const band = codexDetailBand(121.8, 400);
    expect(band.height).toBe(0);
    expect(band.stageH).toBeCloseTo(371.7, 5);
    expect(band.marginTop).toBe(0);
  });
});

describe('視口座標換回設計 px（letterbox scale）', () => {
  it('scale≠1 或畫布置中時，換算後與 scale＝1 同一帶高／同一柳 fit', () => {
    const codexDesign = CHROME_ZONE_H;
    const navDesign = DESIGN_H - NAV_H;
    const canonical = codexDetailBand(codexDesign, navDesign);
    const liu = HERO_SCENES.liu_zong_yuan;
    const fitCanonical = computeHeroFit(liu, 390, canonical.stageH, Math.round(canonical.D));

    for (const [scale, origin] of [[0.75, 0], [1.12, 18], [0.86, 40]] as const) {
      const codexVp = origin + codexDesign * scale;
      const navVp = origin + navDesign * scale;
      const band = codexDetailBand(
        viewportYToDesign(codexVp, origin, scale),
        viewportYToDesign(navVp, origin, scale),
      );
      expect(band.stageH).toBeCloseTo(canonical.stageH, 5);
      expect(band.height).toBeCloseTo(canonical.height, 5);
      expect(band.D).toBeCloseTo(canonical.D, 5);
      expect(band.marginTop).toBe(0);
      const fit = computeHeroFit(liu, 390, band.stageH, Math.round(band.D));
      expect(fit).toEqual(fitCanonical);
    }
  });

  it('scale＝1、原點 0：視口 Y 原樣（不改既有綠線鎖）', () => {
    expect(viewportYToDesign(121.8, 0, 1)).toBeCloseTo(121.8, 5);
    expect(viewportYToDesign(768, 0, 1)).toBeCloseTo(768, 5);
  });

  it('designScaleFromRoot：layout 高比視口高', () => {
    expect(designScaleFromRoot(844, 633)).toBeCloseTo(633 / 844, 5);
    expect(designScaleFromRoot(0, 100)).toBe(1);
    expect(designScaleFromRoot(844, 0)).toBe(1);
  });
});
