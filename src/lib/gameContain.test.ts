import { describe, expect, it } from 'vitest';
import { CHROME_DRAWER_RECT_TOP_Y, CHROME_GREEN_TOP_Y, CHROME_ZONE_H } from '../../components/tabs/drawerMath';
import { codexDetailBand } from '../../components/codexDetailLayout';
import { HERO_SCENES, computeHeroFit } from '../../components/home/heroScene';
import { HOME_NAV_H } from '../../data/battleLayout';
import {
  GAME_DESIGN_H,
  GAME_DESIGN_W,
  battlePlayerHpTopY,
  containGameFrame,
  designYToViewport,
  type SafeInsets,
} from './gameContain';

/**
 * SA contain 契約（反方 Q1–Q7）：
 * 同一張 390×844 畫布；standalone 裝進 safe area；黑邊吃 sat／sab。
 * 同模式綠線三角（peek／內頁／戰鬥血條頂）在設計座標與 contain 後視口座標都 |Δ|≤2。
 * 不拿 SA 的絕對視口 Y 去對 Browser。
 * scale 可以 <1，不設下限。
 */

const IPHONE: SafeInsets = { top: 59, right: 0, bottom: 34, left: 0 };

function triadDesignY() {
  const peek = CHROME_GREEN_TOP_Y;
  const band = codexDetailBand(CHROME_ZONE_H, GAME_DESIGN_H - HOME_NAV_H);
  const detail = CHROME_ZONE_H + band.stageH + band.marginTop;
  const battle = battlePlayerHpTopY();
  return { peek, detail, battle };
}

function span(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

describe('containGameFrame', () => {
  it('Browser 忽略 sat／sab，scale＝min(vw/390, vh/844)，畫布置中在整個視口', () => {
    const vw = 393;
    const vh = 852;
    const frame = containGameFrame(vw, vh, { standalone: false, insets: IPHONE });
    const bare = containGameFrame(vw, vh);
    const scale = Math.min(vw / GAME_DESIGN_W, vh / GAME_DESIGN_H);
    expect(frame.scale).toBeCloseTo(scale, 12);
    expect(frame.scale).toBeGreaterThan(1);
    expect(frame.x).toBeCloseTo((vw - GAME_DESIGN_W * scale) / 2, 8);
    expect(frame.y).toBeCloseTo((vh - GAME_DESIGN_H * scale) / 2, 8);
    expect(bare).toEqual(frame);
  });

  it('SA：畫布 contain 進 safe area，上下黑邊至少蓋住 sat／sab，scale 可小於 1', () => {
    const vw = 393;
    const vh = 852;
    const frame = containGameFrame(vw, vh, { standalone: true, insets: IPHONE });
    const availW = vw - IPHONE.left - IPHONE.right;
    const availH = vh - IPHONE.top - IPHONE.bottom;
    const scale = Math.min(availW / GAME_DESIGN_W, availH / GAME_DESIGN_H);
    expect(scale).toBeLessThan(1);
    expect(frame.scale).toBeCloseTo(scale, 12);
    expect(frame.scale).not.toBe(1);
    expect(frame.y).toBeGreaterThanOrEqual(IPHONE.top - 1e-6);
    expect(frame.x).toBeGreaterThanOrEqual(IPHONE.left - 1e-6);
    expect(frame.y + frame.height).toBeLessThanOrEqual(vh - IPHONE.bottom + 1e-6);
    expect(frame.x + frame.width).toBeLessThanOrEqual(vw - IPHONE.right + 1e-6);
    expect(vh - (frame.y + frame.height)).toBeGreaterThanOrEqual(IPHONE.bottom - 1e-6);
  });

  it('safe 區有多餘高度時，多餘黑邊在 safe 區內上下平分，inset 仍被黑邊蓋住', () => {
    const vw = 400;
    const vh = 1200;
    const insets: SafeInsets = { top: 10, right: 0, bottom: 80, left: 0 };
    const frame = containGameFrame(vw, vh, { standalone: true, insets });
    const availH = vh - insets.top - insets.bottom;
    const extra = availH - frame.height;
    expect(extra).toBeGreaterThan(0);
    expect(frame.y).toBeCloseTo(insets.top + extra / 2, 8);
    expect(vh - (frame.y + frame.height)).toBeCloseTo(insets.bottom + extra / 2, 8);
  });

  it('極小視口不把 scale 抬回 1', () => {
    const frame = containGameFrame(200, 400, {
      standalone: true,
      insets: { top: 80, right: 0, bottom: 80, left: 0 },
    });
    expect(frame.scale).toBeCloseTo(Math.min(200 / GAME_DESIGN_W, (400 - 160) / GAME_DESIGN_H), 12);
    expect(frame.scale).toBeLessThan(0.3);
    expect(frame.scale).toBeGreaterThan(0);
  });

  it('可用區為 0 時 scale＝0，不退回 1', () => {
    const frame = containGameFrame(100, 90, {
      standalone: true,
      insets: { top: 50, right: 0, bottom: 50, left: 0 },
    });
    expect(frame.scale).toBe(0);
    expect(frame.width).toBe(0);
    expect(frame.height).toBe(0);
  });
});

describe('同模式綠線三角', () => {
  it('設計座標：peek、內頁、戰鬥血條頂 |Δ|≤2（Browser 幾何，不含 sat）', () => {
    const y = triadDesignY();
    expect(y.peek).toBe(495);
    expect(y.detail).toBeCloseTo(495, 5);
    expect(y.battle).toBeCloseTo(495.4, 5);
    expect(span([y.peek, y.detail, y.battle])).toBeLessThanOrEqual(2);
  });

  it('SA contain 之後，同一模式的視口 Y 仍對齊（|Δ|≤2），且不要求等於 Browser 絕對 Y', () => {
    const design = triadDesignY();
    const sa = containGameFrame(393, 852, { standalone: true, insets: IPHONE });
    const browser = containGameFrame(393, 852, { standalone: false, insets: IPHONE });
    const saYs = [design.peek, design.detail, design.battle].map((y) => designYToViewport(y, sa));
    const browserYs = [design.peek, design.detail, design.battle].map((y) => designYToViewport(y, browser));
    expect(span(saYs)).toBeLessThanOrEqual(2);
    expect(span(browserYs)).toBeLessThanOrEqual(2);
    expect(Math.abs(saYs[0] - browserYs[0])).toBeGreaterThan(2);
  });
});

describe('關主沒有第二層 SA scale', () => {
  const hero = HERO_SCENES.liu_zong_yuan;
  const stageH = CHROME_DRAWER_RECT_TOP_Y - CHROME_ZONE_H;
  const D = Math.round(GAME_DESIGN_H - CHROME_ZONE_H - HOME_NAV_H);
  const fit = computeHeroFit(hero, GAME_DESIGN_W, stageH, D);

  it('出貨用未抬高的 390×844 框；舊 zone+=sat／nav+=sab 會把關主另縮一檔', () => {
    const sat = 59;
    const sab = 34;
    const liftedZone = CHROME_ZONE_H + sat;
    const lifted = computeHeroFit(
      hero,
      GAME_DESIGN_W,
      CHROME_DRAWER_RECT_TOP_Y - liftedZone,
      Math.round(GAME_DESIGN_H - liftedZone - (HOME_NAV_H + sab)),
    );
    expect(stageH).toBeCloseTo(371.7, 5);
    expect(fit.s).toBeGreaterThan(lifted.s + 0.05);
  });

  it('shell scale 同時乘在關主與 chrome 上，相對比例與 Browser 相同', () => {
    const sa = containGameFrame(393, 852, { standalone: true, insets: IPHONE });
    const browser = containGameFrame(393, 852, { standalone: false, insets: IPHONE });
    const fig = hero.figScale ?? 1;
    const ratio = (shell: number) => (fit.s * fig * shell) / shell;
    expect(sa.scale).not.toBeCloseTo(browser.scale, 2);
    expect(ratio(sa.scale)).toBeCloseTo(fit.s * fig, 8);
    expect(ratio(browser.scale)).toBeCloseTo(ratio(sa.scale), 8);
  });
});
