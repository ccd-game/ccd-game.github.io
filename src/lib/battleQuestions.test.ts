import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { shuffle, newBattleOrder, isQuestionsExhausted } from './battleQuestions';

function mulberry32(a: number) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('shuffle（Fisher–Yates）', () => {
  it('回傳排列：沒有遺失、沒有重複', () => {
    for (const n of [0, 1, 2, 3, 40, 60]) {
      for (let seed = 1; seed <= 50; seed++) {
        const out = shuffle(range(n), mulberry32(seed));
        expect(out.length).toBe(n);
        expect([...out].sort((a, b) => a - b)).toEqual(range(n));
      }
    }
  });

  it('不改動輸入，回傳新陣列', () => {
    const input = Object.freeze(range(40)) as readonly number[];
    const copy = [...input];
    const out = shuffle(input, mulberry32(3));
    expect(input).toEqual(copy);
    expect(out).not.toBe(input);
  });

  it('可注入亂數：同一種子結果相同，不同種子通常不同', () => {
    expect(shuffle(range(40), mulberry32(42))).toEqual(shuffle(range(40), mulberry32(42)));
    expect(shuffle(range(40), mulberry32(42))).not.toEqual(shuffle(range(40), mulberry32(43)));
  });

  it('rng 回傳邊界值（0、接近 1、1）仍安全', () => {
    expect([...shuffle(range(10), () => 0)].sort((a, b) => a - b)).toEqual(range(10));
    expect([...shuffle(range(10), () => 0.9999999)].sort((a, b) => a - b)).toEqual(range(10));
    expect([...shuffle(range(10), () => 1)].sort((a, b) => a - b)).toEqual(range(10));
  });

  it('均勻性：3 個元素的 6 種排列，60,000 個種子的卡方檢定（df=5，p>0.001 臨界 20.52）', () => {
    const counts = new Map<string, number>();
    const N = 60_000;
    for (let seed = 1; seed <= N; seed++) {
      const k = shuffle(['a', 'b', 'c'], mulberry32(seed * 2654435761)).join('');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    const expected = N / 6;
    const chi2 = [...counts.values()].reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(20.52);
  });

  it('均勻性：40 題中每題出現在第一題的頻率（20,000 個種子，卡方 df=39，p>0.001 臨界 72.05）', () => {
    const first = new Array(40).fill(0);
    const N = 20_000;
    for (let seed = 1; seed <= N; seed++) first[shuffle(range(40), mulberry32(seed * 7919))[0]]++;
    const expected = N / 40;
    const chi2 = first.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(72.05);
    expect(Math.min(...first)).toBeGreaterThan(expected * 0.7);
  });
});

/** 模擬 App 的出題流程：每場 newBattleOrder；答對 → 下一題；答錯 → 重答同一題；答完最後一題 → 題目用盡 */
function simulateBattle(questions: string[], script: ('right' | 'wrong')[], rng: () => number) {
  const order = newBattleOrder(questions, rng);
  const asked: string[] = [];
  let index = 0;
  let exhausted = false;
  for (const step of script) {
    asked.push(order[index]);
    if (step === 'wrong') continue;
    if (isQuestionsExhausted(order, index)) { exhausted = true; break; }
    index++;
  }
  return { order, asked, exhausted };
}

describe('戰鬥出題次序', () => {
  const qs = range(40).map((i) => `Q${i}`);

  it('依洗牌後的次序出題；同一場戰鬥內答對的題目不重複；答錯重答同一題', () => {
    const script: ('right' | 'wrong')[] = ['right', 'wrong', 'wrong', 'right', 'right', 'wrong', 'right', 'right'];
    const { order, asked } = simulateBattle(qs, script, mulberry32(11));
    expect(asked).toEqual([order[0], order[1], order[1], order[1], order[2], order[3], order[3], order[4]]);
    const distinctRuns = asked.filter((q, i) => i === 0 || q !== asked[i - 1]);
    expect(new Set(distinctRuns).size).toBe(distinctRuns.length);
  });

  it('全部答對：40 題各出一次後題目用盡（戰敗流程不變）', () => {
    const { order, asked, exhausted } = simulateBattle(qs, new Array(41).fill('right'), mulberry32(5));
    expect(exhausted).toBe(true);
    expect(asked).toEqual(order);
    expect(new Set(asked).size).toBe(40);
  });

  it('新一場戰鬥（含再戰）重新洗牌', () => {
    const rng = mulberry32(99);
    const a = newBattleOrder(qs, rng), b = newBattleOrder(qs, rng);
    expect(a).not.toEqual(b);
    expect([...a].sort()).toEqual([...b].sort());
  });

  it('isQuestionsExhausted', () => {
    expect(isQuestionsExhausted(['a', 'b', 'c'], 1)).toBe(false);
    expect(isQuestionsExhausted(['a', 'b', 'c'], 2)).toBe(true);
    expect(isQuestionsExhausted([], 0)).toBe(true);
  });

  it('App 每場開始時洗牌，並只按洗牌後的次序取題', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    const startGame = src.slice(src.indexOf('const startGame = useCallback'), src.indexOf('const runVictorySequence'));
    expect(startGame).toMatch(/const order = newBattleOrder\(levelQuestions\);\s*battleQuestionsRef\.current = order;\s*setBattleQuestions\(order\);/);
    expect(startGame.indexOf('newBattleOrder')).toBeLessThan(startGame.indexOf('startLevelSequence(0'));
    expect(src).toMatch(/const target = battleQuestionsRef\.current\[index\];/);
    expect(src).toMatch(/battleQuestions\[gameState\.currentQuestionIndex\]/);
    expect(src).toMatch(/isQuestionsExhausted\(battleQuestionsRef\.current, questionIndex\)/);
    expect(src).not.toMatch(/levelQuestions\[/);
  });
});
