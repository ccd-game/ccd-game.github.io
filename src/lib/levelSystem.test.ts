import { describe, expect, it } from 'vitest';
import { cumulativeExpForLevel, expIntoLevel, getRequiredExpForLevel, levelForExp } from './levelSystem';

describe('累計經驗與等級', () => {
  it('第 1 級 0 經驗；100 經驗升第 2 級；225 升第 3 級', () => {
    expect(cumulativeExpForLevel(1)).toBe(0);
    expect(cumulativeExpForLevel(2)).toBe(100);
    expect(cumulativeExpForLevel(3)).toBe(225);
    expect(levelForExp(0)).toBe(1);
    expect(levelForExp(99)).toBe(1);
    expect(levelForExp(100)).toBe(2);
    expect(levelForExp(224)).toBe(2);
    expect(levelForExp(225)).toBe(3);
  });
  it('levelForExp 與 cumulativeExpForLevel 互相一致', () => {
    for (let level = 1; level <= 40; level++) {
      expect(levelForExp(cumulativeExpForLevel(level))).toBe(level);
      if (level > 1) expect(levelForExp(cumulativeExpForLevel(level) - 1)).toBe(level - 1);
    }
  });
  it('本級內的經驗夾在 0 至該級所需經驗之間', () => {
    expect(expIntoLevel(1, 150)).toBe(100);
    expect(expIntoLevel(2, 150)).toBe(50);
    expect(expIntoLevel(3, 150)).toBe(0); // 舊文件等級高於經驗推算值
    expect(expIntoLevel(2, NaN)).toBe(0);
    expect(getRequiredExpForLevel(2)).toBe(125);
  });
  it('異常輸入：負數、NaN → 第 1 級', () => {
    expect(levelForExp(-5)).toBe(1);
    expect(levelForExp(NaN)).toBe(1);
  });
});
