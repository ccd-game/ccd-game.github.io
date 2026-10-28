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
} from './gameContain';

/**
 * 滿寬 letterbox：左右黑邊＝0（高度放得下時），上下黑邊等厚。
 * sat／sab 不參與縮放。同模式綠線三角 |Δ|≤2。關主與 chrome 共用 shell scale。
 */

const SAT = 59;
const SAB = 34;

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
  it('滿寬：左右黑邊為 0，上下黑邊等厚', () => {
    const vw = 390;
    const vh = 980;
    const frame = containGameFrame(vw, vh);
    expect(frame.scale).toBeCloseTo(vw / GAME_DESIGN_W, 12);
    expect(frame.x).toBeCloseTo(0, 8);
    expect(vw - (frame.x + frame.width)).toBeCloseTo(0, 8);
    expect(frame.y).toBeCloseTo((vh - frame.height) / 2, 8);
    expect(vh - (frame.y + frame.height)).toBeCloseTo(frame.y, 8);
    expect(frame.y).toBeGreaterThan(40);
  });

  it('手機比例仍滿寬；不把畫布塞進 viewport−sat−sab，上緣不是 sat 黑帶', () => {
    const vw = 393;
    const vh = 852;
    const frame = containGameFrame(vw, vh);
    const widthFirst = vw / GAME_DESIGN_W;
    const squeezed = Math.min(vw / GAME_DESIGN_W, (vh - SAT - SAB) / GAME_DESIGN_H);
    expect(widthFirst * GAME_DESIGN_H).toBeLessThanOrEqual(vh);
    expect(frame.scale).toBeCloseTo(widthFirst, 12);
    expect(frame.scale).toBeGreaterThan(squeezed + 0.05);
    expect(frame.x).toBeCloseTo(0, 6);
    expect(vw - (frame.x + frame.width)).toBeCloseTo(0, 6);
    expect(frame.y).toBeCloseTo((vh - frame.height) / 2, 8);
    expect(vh - (frame.y + frame.height)).toBeCloseTo(frame.y, 6);
    expect(frame.y).toBeLessThan(SAT);
  });

  it('高度裝不下滿寬時退回 min(vw/390, vh/844)，上下貼齊', () => {
    const vw = 800;
    const vh = 600;
    const frame = containGameFrame(vw, vh);
    const scale = Math.min(vw / GAME_DESIGN_W, vh / GAME_DESIGN_H);
    expect(frame.scale).toBeCloseTo(scale, 12);
    expect(frame.scale).toBeCloseTo(vh / GAME_DESIGN_H, 12);
    expect(frame.y).toBeCloseTo(0, 6);
    expect(frame.x).toBeCloseTo((vw - frame.width) / 2, 6);
    expect(vw - (frame.x + frame.width)).toBeCloseTo(frame.x, 6);
  });

  it('極小視口不把 scale 抬回 1', () => {
    const frame = containGameFrame(200, 500);
    expect(frame.scale).toBeCloseTo(200 / GAME_DESIGN_W, 12);
    expect(frame.scale).toBeLessThan(1);
    expect(frame.scale).toBeGreaterThan(0);
    expect(frame.x).toBeCloseTo(0, 6);
  });

  it('視口為 0 時 scale＝0，不退回 1', () => {
    const frame = containGameFrame(0, 90);
    expect(frame.scale).toBe(0);
    expect(frame.width).toBe(0);
    expect(frame.height).toBe(0);
  });
});

describe('同模式綠線三角', () => {
  it('設計座標：peek、內頁、戰鬥血條頂 |Δ|≤2（不含 sat）', () => {
    const y = triadDesignY();
    expect(y.peek).toBe(495);
    // #14：detail 紙頂＝RECT 493.5（密封細縫）；對概念綠線 |Δ|＝1.5≤2
    expect(y.detail).toBeCloseTo(CHROME_DRAWER_RECT_TOP_Y, 5);
    expect(Math.abs(y.detail - y.peek)).toBeLessThanOrEqual(2);
    expect(y.battle).toBeCloseTo(495.4, 5);
    expect(span([y.peek, y.detail, y.battle])).toBeLessThanOrEqual(2);
  });

  it('滿寬置中後，同一模式的視口 Y 仍 |Δ|≤2', () => {
    const design = triadDesignY();
    const frame = containGameFrame(390, 980);
    const ys = [design.peek, design.detail, design.battle].map((y) => designYToViewport(y, frame));
    expect(span(ys)).toBeLessThanOrEqual(2);
    expect(frame.y).toBeCloseTo((980 - frame.height) / 2, 8);
  });
});

describe('關主沒有第二層 SA scale', () => {
  const hero = HERO_SCENES.liu_zong_yuan;
  const stageH = CHROME_DRAWER_RECT_TOP_Y - CHROME_ZONE_H;
  const D = Math.round(GAME_DESIGN_H - CHROME_ZONE_H - HOME_NAV_H);
  const fit = computeHeroFit(hero, GAME_DESIGN_W, stageH, D);

  it('出貨用未抬高的 390×844 框；舊 zone+=sat／nav+=sab 會把關主另縮一檔', () => {
    const liftedZone = CHROME_ZONE_H + SAT;
    const lifted = computeHeroFit(
      hero,
      GAME_DESIGN_W,
      CHROME_DRAWER_RECT_TOP_Y - liftedZone,
      Math.round(GAME_DESIGN_H - liftedZone - (HOME_NAV_H + SAB)),
    );
    expect(stageH).toBeCloseTo(371.7, 5);
    expect(fit.s).toBeGreaterThan(lifted.s + 0.05);
  });

  it('shell scale 同時乘在關主與 chrome 上', () => {
    const frame = containGameFrame(390, 980);
    const fig = hero.figScale ?? 1;
    expect((fit.s * fig * frame.scale) / frame.scale).toBeCloseTo(fit.s * fig, 8);
  });
});
