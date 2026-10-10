/**
 * 速度傷害曲線單元測試（移植自 /workspace/battle-rules 的 speedMultiplier.check.ts，改用 vitest）
 */
import { describe, expect, it } from 'vitest';
import { speedMultiplier, formatMultiplier, SPEED_MIN_MULTIPLIER, SPEED_TOTAL_SECONDS } from './speedMultiplier';
import { computeDamage, computeDamageDetail } from './battleRules';
import { CORRECT_ANSWER_DAMAGE, TURN_TIME } from '../../constants';

const near = (actual: number, expected: number, tol = 0.01) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
const dmg = (t: number) => computeDamage({ baseDamage: 100, remainingSeconds: t, totalSeconds: 30 });

describe('速度倍率曲線（r＝剩餘秒數）', () => {
  it('曲線總秒數與 TURN_TIME 一致；基本傷害 100', () => {
    expect(SPEED_TOTAL_SECONDS).toBe(TURN_TIME);
    expect(CORRECT_ANSWER_DAMAGE).toBe(100);
  });
  it.each([
    [30, 3.0], [28, 2.28], [25, 1.5], [22, 1.08], [20, 1.0],
    [15, 0.71], [10, 0.44], [5, 0.22], [3, 0.15], [1, 0.1],
  ])('錨點 %is → %f（±0.01）', (t, m) => near(speedMultiplier(t, 30), m));

  it('邊界 20s：兩段曲線連續，正好 1.00；兩側接近 1 且單調', () => {
    expect(speedMultiplier(20, 30)).toBe(1);
    near(speedMultiplier(19.999, 30), 1);
    near(speedMultiplier(20.001, 30), 1);
    expect(speedMultiplier(19.999, 30)).toBeLessThan(speedMultiplier(20, 30));
    expect(speedMultiplier(20, 30)).toBeLessThanOrEqual(speedMultiplier(20.001, 30));
  });
  it('邊界 1s：正好 0.10；r < 1 為 0.10；1.001s 稍大於 0.10', () => {
    near(speedMultiplier(1, 30), 0.1, 1e-12);
    expect(speedMultiplier(0.999, 30)).toBe(SPEED_MIN_MULTIPLIER);
    expect(speedMultiplier(1.001, 30)).toBeGreaterThan(0.1);
    expect(speedMultiplier(1.001, 30)).toBeLessThan(0.101);
    expect(speedMultiplier(0, 30)).toBe(0.1);
  });
  it('夾值：r 夾在 [0, 30]；NaN 當 0', () => {
    expect(speedMultiplier(-5, 30)).toBe(0.1);
    expect(speedMultiplier(45, 30)).toBe(3);
    expect(speedMultiplier(NaN, 30)).toBe(0.1);
    expect(speedMultiplier(Infinity, 30)).toBe(3);
  });
  it('0–30 秒單調不減', () => {
    let prev = -1;
    for (let t = 0; t <= 30; t += 0.05) {
      const m = speedMultiplier(t, 30);
      expect(m).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = m;
    }
  });
});

describe('傷害＝round(100 × 倍率)', () => {
  it.each([[30, 300], [28, 228], [25, 150], [22, 108], [20, 100], [15, 71], [10, 44], [5, 22], [3, 15], [1, 10], [0, 10], [-3, 10], [99, 300]])(
    '%is → %i', (t, d) => expect(dmg(t)).toBe(d),
  );
  it('傷害為整數', () => {
    for (let t = 0; t <= 30; t += 0.37) expect(Number.isInteger(dmg(t))).toBe(true);
  });
  it('computeDamageDetail 回傳倍率', () => {
    const r = computeDamageDetail({ baseDamage: 100, remainingSeconds: 25, totalSeconds: 30 });
    expect(r.damage).toBe(150);
    near(r.multiplier, 1.5, 1e-9);
  });
  it('可替換倍率函式；NaN 當 1；傷害不為負', () => {
    expect(computeDamage({ baseDamage: 100, remainingSeconds: 3, totalSeconds: 30 }, () => 1)).toBe(100);
    expect(computeDamage({ baseDamage: 100, remainingSeconds: 3, totalSeconds: 30 }, () => NaN)).toBe(100);
    expect(computeDamage({ baseDamage: 100, remainingSeconds: 3, totalSeconds: 30 }, () => -2)).toBe(0);
  });
  it('擊倒 1000 HP Boss 所需答對題數：r=25 → 7、r=20 → 10、r=15 → 15', () => {
    const need = (r: number) => Math.ceil(1000 / dmg(r));
    expect([need(25), need(20), need(15)]).toEqual([7, 10, 15]);
  });
});

describe('顯示格式', () => {
  it('×1.50、×0.44', () => {
    expect(formatMultiplier(1.5)).toBe('×1.50');
    expect(formatMultiplier(speedMultiplier(10, 30))).toBe('×0.44');
  });
});
