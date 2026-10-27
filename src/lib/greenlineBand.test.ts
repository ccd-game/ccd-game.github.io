import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { heroPeekHeight } from '../../components/home/heroScene';
import { CHROME_DRAWER_RECT_TOP_Y, CHROME_GREEN_TOP_Y, CHROME_ZONE_H } from '../../components/tabs/drawerMath';
import { HOME_NAV_H, HOME_TOP_BAR_H } from '../../data/battleLayout';
import {
  GREENLINE_ALIGN_TOL_PX,
  greenLineAligned,
  greenLineTriad,
  maxAbsDelta,
  pairwiseAbsDeltas,
} from './greenlineBand';

/**
 * 綠線帶契約（display mode × 同態三邊）。
 *
 * 絕對 Y 不得寫成裸 ≈371.7／400.8／495 的跨態鎖。Browser 過閘是因為
 * peek 抽屜頂、detail 描述頂、戰鬥玩家血條**頂**兩兩 |Δ|≤2，不是因為某邊等於 495。
 * N=4 host≈400.8 留在戰鬥無 homeBox 公式；禁止把它當成 peek CSS 必須抬高的宿主。
 * SA letterbox 另票：本檔不要求 standalone 三邊對齊，也不要求它的視口 Y 等於 Browser。
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const css = readFileSync(path.join(root, 'src/index.css'), 'utf8');
const app = readFileSync(path.join(root, 'App.tsx'), 'utf8');

const browser = { vh: 844, sat: 0, sab: 0, standalone: false };
const standalone = { vh: 844, sat: 59, sab: 34, standalone: true };

function cssPeekRectPx(): number {
  const declared = [...css.matchAll(/--peek-h:\s*calc\(100%\s*-\s*\(([0-9.]+)px\s*-\s*var\(--hud-vnext-zone-h/g)];
  expect(declared.length).toBeGreaterThanOrEqual(3);
  const values = new Set(declared.map((m) => m[1]));
  expect(values.size).toBe(1);
  return Number([...values][0]);
}

describe('綠線帶：同態三邊（HP 頂），不抬 peek host 到 400.8', () => {
  it('CSS／JS rect 代幣仍是綠線 493.5，不是 PR#6 的 522.6', () => {
    const rect = cssPeekRectPx();
    expect(rect).toBe(CHROME_DRAWER_RECT_TOP_Y);
    expect(rect).toBe(493.5);
    expect(css).not.toMatch(/--chrome-drawer-rect-y\s*:\s*522\.6px/);
    expect(css).not.toMatch(/--peek-h:[^;]*522\.6/);
    expect(css).toMatch(/html\.is-standalone \.battle-clip\s*\{[^}]*top:\s*var\(--sat/s);
    expect(css).toMatch(/html\.is-standalone \.battle-clip\s*\{[^}]*bottom:\s*0/s);
    expect(app).toMatch(/h-\[10px\]/);
    expect(app).toMatch(/bottom:\s*"calc\(40% \+ 1px\)"/);
    expect(app).toMatch(/#28a745/);
  });

  it('Browser 390×844：抽屜頂／描述頂／玩家血條頂 兩兩 |Δ|≤2', () => {
    const t = greenLineTriad(browser);
    const d = pairwiseAbsDeltas(t);
    expect(t.detailDescTop).toBeCloseTo(CHROME_GREEN_TOP_Y, 5);
    expect(d['peek-detail']).toBeCloseTo(1.5, 5);
    expect(d['peek-battle']).toBeCloseTo(1.9, 5);
    expect(d['detail-battle']).toBeCloseTo(0.4, 5);
    expect(maxAbsDelta(t)).toBeLessThanOrEqual(GREENLINE_ALIGN_TOL_PX);
    expect(greenLineAligned(t)).toBe(true);
    // 量錯邊就出閘：血條底、戰鬥根頂都不是綠線。
    expect(maxAbsDelta({ ...t, battleHpTop: t.hpBottom })).toBeGreaterThan(GREENLINE_ALIGN_TOL_PX);
    expect(maxAbsDelta({ ...t, battleHpTop: t.battleRootTop })).toBeGreaterThan(GREENLINE_ALIGN_TOL_PX);
    expect(t.battleRootTop).toBe(0);
  });

  it('綠線宿主≠N=4／BATTLE_HOLD 的 400.8（拒 peek 抬高）', () => {
    const t = greenLineTriad(browser);
    const D = 844 - HOME_TOP_BAR_H - HOME_NAV_H;
    const n4 = heroPeekHeight(D);
    expect(n4).toBeCloseTo(400.8, 1);
    expect(Math.abs(t.peekHostH - n4)).toBeGreaterThan(GREENLINE_ALIGN_TOL_PX);
    expect(Math.abs(t.peekHostH - 400.8)).toBeGreaterThan(GREENLINE_ALIGN_TOL_PX);
    const liftedDrawerTop = CHROME_ZONE_H + n4;
    expect(Math.abs(t.peekDrawerTop - liftedDrawerTop)).toBeGreaterThan(GREENLINE_ALIGN_TOL_PX);
    expect(liftedDrawerTop).toBeGreaterThan(520);
  });

  it('絕對 Y 不是跨態神諭：371.7／400.8／495 不能同時套住 Browser 與 standalone', () => {
    const br = greenLineTriad(browser);
    const sa = greenLineTriad(standalone);
    const oracles = [371.7, 400.8, 495];
    const fitsBothModes = oracles.some((y) =>
      [br, sa].every((mode) =>
        [mode.peekDrawerTop, mode.detailDescTop, mode.battleHpTop].every((edge) => Math.abs(edge - y) <= GREENLINE_ALIGN_TOL_PX),
      ),
    );
    expect(fitsBothModes).toBe(false);
    expect(Math.abs(br.peekHostH - sa.peekHostH)).toBeGreaterThan(GREENLINE_ALIGN_TOL_PX);
    expect(Math.abs(br.battleHpTop - sa.battleHpTop)).toBeGreaterThan(GREENLINE_ALIGN_TOL_PX);
    expect(sa.peekHostH).not.toBeCloseTo(400.8, 0);
  });

  it('standalone 公式對上 tip 血條頂 519（letterbox；本票不要求三邊 ALIGNED）', () => {
    const sa = greenLineTriad(standalone);
    const sabIgnored = greenLineTriad({ ...standalone, sab: 0 });
    expect(sa.battleRootTop).toBe(59);
    expect(sa.battleHpTop).toBeCloseTo(519, 5);
    expect(sa.hpBottom).toBeCloseTo(529, 5);
    expect(sabIgnored.battleHpTop).toBeCloseTo(sa.battleHpTop, 5);
    expect(sa.detailDescTop).toBeCloseTo(CHROME_GREEN_TOP_Y, 5);
    expect(sa.peekDrawerTop).toBe(CHROME_DRAWER_RECT_TOP_Y);
    // 公式對上 tip METRICS 即可。SA 對不對齊不在本閘；letterbox 另票，勿靠抬 peek host 把三邊捏齊。
  });
});
