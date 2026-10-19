import { describe, expect, it } from 'vitest';
import {
  buildExpArcAnimPlan,
  easeOutCubic,
  expArcAnimDurationMs,
  expArcVisualEq,
  expPctFromRatio,
  sampleExpArcAnimPlan,
  EXP_ARC_ANIM_MS_MAX,
  EXP_ARC_ANIM_MS_MIN,
} from './hudExpArcAnim';

describe('hudExpArcAnim from→to／跨級', () => {
  it('ease-out：起終點鎖、中段快於線性後半', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('同級：0→0.5 單段；sample 中點約 0.25（線性 u）', () => {
    const plan = buildExpArcAnimPlan({ level: 1, ratio: 0 }, { level: 1, ratio: 0.5 });
    expect(plan.segments).toEqual([{ level: 1, from: 0, to: 0.5 }]);
    expect(sampleExpArcAnimPlan(plan, 0)).toEqual({ level: 1, ratio: 0 });
    expect(sampleExpArcAnimPlan(plan, 1)).toEqual({ level: 1, ratio: 0.5 });
    const mid = sampleExpArcAnimPlan(plan, 0.5);
    expect(mid.level).toBe(1);
    expect(mid.ratio).toBeCloseTo(0.25, 5);
    expect(expPctFromRatio(mid.ratio)).toBe(25);
  });

  it('跨級：L1@0 → L2@0（guest 首通 +100）先滿再落到新級 0', () => {
    const plan = buildExpArcAnimPlan({ level: 1, ratio: 0 }, { level: 2, ratio: 0 });
    expect(plan.segments[0]).toEqual({ level: 1, from: 0, to: 1 });
    expect(plan.segments[plan.segments.length - 1]).toEqual({ level: 2, from: 0, to: 0 });
    expect(sampleExpArcAnimPlan(plan, 0)).toEqual({ level: 1, ratio: 0 });
    // 幾乎走完第一段時仍在 L1 接近滿
    const nearFull = sampleExpArcAnimPlan(plan, 0.99);
    expect(nearFull.level).toBe(1);
    expect(nearFull.ratio).toBeGreaterThan(0.9);
    expect(sampleExpArcAnimPlan(plan, 1)).toEqual({ level: 2, ratio: 0 });
  });

  it('跨級帶餘量：L1@0.5 → L2@0.2；中段滿槽後從 0 走到新進度', () => {
    const plan = buildExpArcAnimPlan({ level: 1, ratio: 0.5 }, { level: 2, ratio: 0.2 });
    expect(plan.segments).toEqual([
      { level: 1, from: 0.5, to: 1 },
      { level: 2, from: 0, to: 0.2 },
    ]);
    // 第一段權重 0.5、第二段 0.2 → 總 0.7；u=0.5/0.7≈0.714 為段界
    const atBoundary = sampleExpArcAnimPlan(plan, 0.5 / 0.7);
    expect(atBoundary.level).toBe(1);
    expect(atBoundary.ratio).toBeCloseTo(1, 5);
    const intoSecond = sampleExpArcAnimPlan(plan, (0.5 + 0.1) / 0.7);
    expect(intoSecond.level).toBe(2);
    expect(intoSecond.ratio).toBeCloseTo(0.1, 5);
    expect(sampleExpArcAnimPlan(plan, 1)).toEqual({ level: 2, ratio: 0.2 });
  });

  it('時長夾在 0.6–1.0s；％跟 ratio', () => {
    const small = buildExpArcAnimPlan({ level: 3, ratio: 0.1 }, { level: 3, ratio: 0.15 });
    const big = buildExpArcAnimPlan({ level: 1, ratio: 0 }, { level: 3, ratio: 0.5 });
    const dSmall = expArcAnimDurationMs(small);
    const dBig = expArcAnimDurationMs(big);
    expect(dSmall).toBeGreaterThanOrEqual(EXP_ARC_ANIM_MS_MIN);
    expect(dSmall).toBeLessThanOrEqual(EXP_ARC_ANIM_MS_MAX);
    expect(dBig).toBeGreaterThanOrEqual(dSmall);
    expect(dBig).toBeLessThanOrEqual(EXP_ARC_ANIM_MS_MAX);
    expect(expPctFromRatio(0)).toBe(0);
    expect(expPctFromRatio(1)).toBe(100);
    expect(expPctFromRatio(0.496)).toBe(50);
  });

  it('visualEq', () => {
    expect(expArcVisualEq({ level: 2, ratio: 0.5 }, { level: 2, ratio: 0.5 })).toBe(true);
    expect(expArcVisualEq({ level: 2, ratio: 0.5 }, { level: 3, ratio: 0.5 })).toBe(false);
  });
});
