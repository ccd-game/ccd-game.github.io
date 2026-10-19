import { describe, expect, it } from 'vitest';
import {
  EXP_ARC_END_PILLOW_DEG,
  EXP_ARC_SPAN_DEG,
  clamp01,
  expArcConicMask,
  expArcPillowEndDeg,
  expArcPillowStartDeg,
  expArcSweepDeg,
  pillowToCssConicDeg,
} from './hudExpArc';

describe('hudExpArc 西→東角規（NOTES r5）', () => {
  it('clamp01', () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(NaN)).toBe(0);
  });

  it('p=0／0.5／1 → Pillow start／end／弧長對齊 NOTES', () => {
    expect(EXP_ARC_SPAN_DEG).toBe(192);
    expect(EXP_ARC_END_PILLOW_DEG).toBe(186);

    expect(expArcPillowStartDeg(0)).toBe(186);
    expect(expArcPillowEndDeg(0)).toBe(186);
    expect(expArcSweepDeg(0)).toBe(0);

    expect(expArcPillowStartDeg(0.5)).toBe(90);
    expect(expArcPillowEndDeg(0.5)).toBe(186);
    expect(expArcSweepDeg(0.5)).toBe(96);

    expect(expArcPillowStartDeg(1)).toBe(354);
    expect(expArcPillowEndDeg(1)).toBe(186);
    expect(expArcSweepDeg(1)).toBe(192);
  });

  it('CSS conic：pillow+90；p=0.5 from=180；p=1 from=444', () => {
    expect(pillowToCssConicDeg(0)).toBe(90);
    expect(pillowToCssConicDeg(90)).toBe(180);
    expect(pillowToCssConicDeg(186)).toBe(276);
    expect(pillowToCssConicDeg(354)).toBe(444);

    const half = expArcConicMask(0.5);
    expect(half.fromDeg).toBe(180);
    expect(half.sweepDeg).toBe(96);

    const full = expArcConicMask(1);
    expect(full.fromDeg).toBe(444);
    expect(full.sweepDeg).toBe(192);

    const empty = expArcConicMask(0);
    expect(empty.fromDeg).toBe(276);
    expect(empty.sweepDeg).toBe(0);
  });

  it('連續％：start = (186 - p·192) mod 360', () => {
    for (const p of [0.25, 0.75, 1 / 3]) {
      const expectStart = ((186 - p * 192) % 360 + 360) % 360;
      expect(expArcPillowStartDeg(p)).toBeCloseTo(expectStart, 10);
      expect(expArcSweepDeg(p)).toBeCloseTo(p * 192, 10);
    }
  });
});
