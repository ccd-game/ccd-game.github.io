import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHROME_DRAWER_RECT_TOP_Y, CHROME_GREEN_TOP_Y } from '../../components/tabs/drawerMath';
import {
  battleDesignBandFloorPx,
  battlePlayerHpTrackTopY,
  battlePlayerHpTrackTopYClipPercent,
} from '../../data/battleLayout';

const DESIGN_H = 844;
const SAT = 59;
const TOL = 2;

describe('standalone 綠線帶：血條頂鎖設計地板，不跟變矮 clip 的 40%', () => {
  const floor = battleDesignBandFloorPx(DESIGN_H);
  const hpTop = battlePlayerHpTrackTopY(DESIGN_H, floor);
  const clipHpTop = battlePlayerHpTrackTopYClipPercent(DESIGN_H, SAT);

  it('設計地板＝0.4×844，血條頂＝0.6×844−11（browser 實測 ≈495.41）', () => {
    expect(floor).toBeCloseTo(337.6, 5);
    expect(hpTop).toBeCloseTo(DESIGN_H * 0.6 - 11, 5);
    expect(hpTop).toBeCloseTo(495.4, 5);
  });

  it('sat＝0 時 clip 百分比與設計地板同一頂（browser 路徑不變）', () => {
    expect(battlePlayerHpTrackTopYClipPercent(DESIGN_H, 0)).toBeCloseTo(hpTop, 5);
  });

  it('修前 SA（sat59、地板＝clip 40%）血條頂＝519，與 peek／detail 脫隊', () => {
    expect(clipHpTop).toBeCloseTo(519, 5);
    expect(Math.abs(clipHpTop - CHROME_DRAWER_RECT_TOP_Y)).toBeGreaterThan(TOL);
    expect(Math.abs(clipHpTop - CHROME_GREEN_TOP_Y)).toBeGreaterThan(TOL);
  });

  it('設計地板後 SA 血條頂與 peek rect 493.5、detail 綠線 495 同帶（|Δ|≤2），且不吃 sat', () => {
    expect(Math.abs(hpTop - CHROME_DRAWER_RECT_TOP_Y)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(hpTop - CHROME_GREEN_TOP_Y)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(CHROME_GREEN_TOP_Y - CHROME_DRAWER_RECT_TOP_Y)).toBeLessThanOrEqual(TOL);
    expect(battlePlayerHpTrackTopY(DESIGN_H, floor)).toBeCloseTo(hpTop, 5);
    expect(Math.abs(hpTop - clipHpTop)).toBeCloseTo(0.4 * SAT, 5);
  });
});

describe('綠線帶接線：CSS 地板與戰鬥疊層', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
  const app = fs.readFileSync(path.join(process.cwd(), 'App.tsx'), 'utf8');

  it('standalone／display-mode 把 --battle-floor 鎖在設計高，browser 預設仍是 40%', () => {
    expect(css).toMatch(/\.battle-clip\s*\{[^}]*--battle-floor:\s*40%;/);
    const pinned = css.match(/--battle-floor:\s*calc\(var\(--game-design-h\) \* 0\.4px\);/g);
    expect(pinned?.length).toBe(2);
    expect(css).toMatch(/html\.is-standalone \.battle-clip\s*\{[^}]*--battle-floor:\s*calc\(var\(--game-design-h\) \* 0\.4px\);/);
    const media = css.slice(css.lastIndexOf('@media (display-mode: standalone), (display-mode: fullscreen)'));
    expect(media).toMatch(/--battle-floor:\s*calc\(var\(--game-design-h\) \* 0\.4px\);/);
  });

  it('血條、分隔線、答槽、輸入區都讀 --battle-floor，browser fallback 仍是 40%', () => {
    expect(app).toContain('data-testid="player-hp-track"');
    expect(app).toContain('bottom: "var(--battle-floor, 40%)"');
    expect(app).toContain('height: "var(--battle-floor, 40%)"');
    expect(app).toContain('bottom: "calc(var(--battle-floor, 40%) + 1px)"');
    expect(app).toContain('bottom: "calc(var(--battle-floor, 40%) + 16px)"');
    expect(app).toContain('bottom: "calc(var(--battle-floor, 40%) + 82px)"');
    expect(app).toContain('bottom: "calc(var(--battle-floor, 40%) + 124px)"');
    expect(app).not.toMatch(/bottom:\s*"calc\(40%/);
    expect(app).not.toMatch(/h-\[40%\]/);
  });
});
