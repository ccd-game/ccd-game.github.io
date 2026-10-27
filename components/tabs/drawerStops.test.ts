import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { heroPeekHeight } from '../home/heroScene';
import { drawerPeekH, progressFromY, CHROME_FROST_PAPER_GAP, CHROME_GREEN_TOP_Y, CHROME_DRAWER_RECT_TOP_Y, CHROME_PEEK_HOST_H, CHROME_REF_D, CHROME_ZONE_H } from './drawerMath';

const PEEK_MIN_ROWS = 4;

describe('drawerPeekH (hostH ≡ heroPeekHeight @390×844)', () => {
  it('390×844 D≈646.2 → hostH≈400.8（rect≈522.6；可見紙緣再低 1.5）', () => {
    const H = 844 - CHROME_ZONE_H - 76; // dungeon h
    const peek = drawerPeekH(H, 52, PEEK_MIN_ROWS);
    expect(H).toBeCloseTo(CHROME_REF_D, 5);
    expect(peek).toBeCloseTo(H - (CHROME_DRAWER_RECT_TOP_Y - CHROME_ZONE_H), 5);
    expect(CHROME_ZONE_H + (H - peek)).toBeCloseTo(CHROME_DRAWER_RECT_TOP_Y, 5);
    expect(CHROME_PEEK_HOST_H).toBeCloseTo(heroPeekHeight(H), 5);
    expect(CHROME_PEEK_HOST_H).toBeCloseTo(400.8, 5);
    expect(CHROME_DRAWER_RECT_TOP_Y).toBeCloseTo(522.6, 5);
    expect(CHROME_GREEN_TOP_Y).toBeCloseTo(CHROME_DRAWER_RECT_TOP_Y + CHROME_FROST_PAPER_GAP, 5);
    expect(CHROME_GREEN_TOP_Y).toBeCloseTo(524.1, 5);
    // 舊綠線 493.5 → hostH 371.7，禁止再當成 CSS 口徑。
    expect(Math.abs(CHROME_PEEK_HOST_H - 371.7)).toBeGreaterThan(20);
  });

  it('CSS --chrome-drawer-rect-y 與 TS rect 同一數（禁樣式再漂回 493.5）', () => {
    const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
    const declared = css.match(/--chrome-drawer-rect-y:\s*([0-9.]+)px/);
    expect(declared).not.toBeNull();
    expect(Number(declared![1])).toBeCloseTo(CHROME_DRAWER_RECT_TOP_Y, 5);
    expect(css).not.toMatch(/493\.5px/);
    expect(css).toContain('var(--chrome-drawer-rect-y)');
  });

  it('minRows ignored under green lock（N=4／6 同 peek）', () => {
    const H = 646.203125;
    expect(drawerPeekH(H, 52, 4)).toBeCloseTo(drawerPeekH(H, 52, 6), 5);
  });
});

describe('progressFromY', () => {
  it('y=peekY → p=0 (collapsed → scroll open)', () => {
    expect(progressFromY(200, 200)).toBe(0);
  });
  it('y=0 → p=1', () => {
    expect(progressFromY(0, 200)).toBe(1);
  });
  it('mid', () => {
    expect(progressFromY(100, 200)).toBeCloseTo(0.5, 5);
  });
});
