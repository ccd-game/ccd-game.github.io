import { describe, it, expect } from 'vitest';
import { drawerPeekH, progressFromY, CHROME_GREEN_TOP_Y, CHROME_DRAWER_RECT_TOP_Y, CHROME_ZONE_H } from './drawerMath';

const PEEK_MIN_ROWS = 4;

describe('drawerPeekH（設計座標紙緣；495 不是跨態視口神諭）', () => {
  it('390×844 D≈646.2 → peekH≈275.5（rect頂＝493.5→可見紙緣≈495）', () => {
    const H = 844 - CHROME_ZONE_H - 76; // dungeon h
    const peek = drawerPeekH(H, 52, PEEK_MIN_ROWS);
    expect(peek).toBeCloseTo(H - (CHROME_DRAWER_RECT_TOP_Y - CHROME_ZONE_H), 5);
    expect(CHROME_ZONE_H + (H - peek)).toBeCloseTo(CHROME_DRAWER_RECT_TOP_Y, 5);
    expect(CHROME_GREEN_TOP_Y).toBe(495);
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
