import { describe, expect, it } from 'vitest';
import { drawerPeekH, progressFromY } from './drawerMath';

/** 收合最低＝4 列（CSS --drawer-min-rows: 4）；進頁默認仍為 open＝12 */
export const PEEK_MIN_ROWS = 4;

describe('drawerPeekH (min-rows collapsed floor)', () => {
  const H = 700;
  const bar = 52;
  const rowH = (H - bar - 56) / 12;

  it('peek min N=4 matches bar + 14 + (H−bar−56)/3', () => {
    expect(PEEK_MIN_ROWS).toBe(4);
    const peek = drawerPeekH(H, bar, PEEK_MIN_ROWS);
    expect(peek).toBeCloseTo(bar + 2 + 3 * 4 + 4 * rowH, 5);
    expect(peek).toBeCloseTo(bar + 14 + (H - bar - 56) / 3, 5);
  });

  it('optional N=6 matches bar + 22 + (H−bar−56)/2', () => {
    const peek = drawerPeekH(H, bar, 6);
    expect(peek).toBeCloseTo(bar + 2 + 5 * 4 + 6 * rowH, 5);
    expect(peek).toBeCloseTo(bar + 22 + (H - bar - 56) / 2, 5);
  });

  it('N=6 peek taller than N=4 by ~2 rows', () => {
    const d = drawerPeekH(H, bar, 6) - drawerPeekH(H, bar, 4);
    expect(d).toBeCloseTo(2 * rowH + 8, 5);
  });
});

describe('progressFromY (scroll sync)', () => {
  it('y=0 → p=1 (open → scroll rolled)', () => {
    expect(progressFromY(0, 200)).toBe(1);
  });
  it('y=peekY → p=0 (collapsed → scroll open)', () => {
    expect(progressFromY(200, 200)).toBe(0);
  });
  it('midpoint', () => {
    expect(progressFromY(100, 200)).toBe(0.5);
  });
});
