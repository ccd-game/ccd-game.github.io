import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EXP_PER_CLEAR,
  EXP_PER_CORRECT,
  EXP_SCORE_DENOMINATOR,
  EXP_SCORE_NUMERATOR,
  FULL_SCORE_TIME_SEC,
  MAX_EXP_PER_CLEAR,
  MAX_LEVEL_SCORE,
  MAX_LEVEL_UPS_PER_WRITE,
  MAX_QUESTIONS_PER_LEVEL,
  MAX_RECORDABLE_TIME_MS,
  MIN_CLEAR_TIME_SEC,
  SCORED_LEVEL_IDS,
  ANSWER_COLLAPSE_SEC,
  FIXED_OVERHEAD_SEC,
  HIT_ANIM_SEC,
  MIN_ANSWER_SEC,
  MIN_HITS_TO_WIN,
  TURN_START_SEC,
  clearExpGain,
  expScore,
  fastestClearSec,
  isRecordableTime,
  levelScoreForTime,
  timeScore,
  toTimeMs,
  totalScore,
} from './scoring';
import { LEVELS_DATA } from '../../data/levels';
import { parseQuestionBank } from '../utils/questionParser';
import { getRequiredExpForLevel, levelForExp } from './levelSystem';

const root = resolve(__dirname, '../..');
const sec = (s: number) => s * 1000;

describe('單關分數：t ≤ 60 秒滿分；之後 round(1000 × √(60 / t))', () => {
  it.each([
    [10, 1000], [12, 1000], [30, 1000], [45, 1000], [60, 1000], [90, 816], [120, 707], [240, 500], [300, 447], [600, 316], [3600, 129],
  ])('%i 秒 → %i 分', (t, pts) => {
    expect(timeScore(sec(t))).toBe(pts);
    // 低於防作弊下限（12 秒）的時間不可記錄
    expect(levelScoreForTime(1, sec(t))).toBe(t >= MIN_CLEAR_TIME_SEC ? pts : null);
  });
  it('90 秒的四捨五入：√(2/3) × 1000 = 816.497 → 816', () => {
    expect(1000 * Math.sqrt(60 / 90)).toBeCloseTo(816.497, 3);
    expect(levelScoreForTime(1, 90000)).toBe(816);
  });
  it('60 秒邊界：60.000 秒滿分，60.001 秒開始遞減', () => {
    expect(levelScoreForTime(1, 60000)).toBe(1000);
    expect(levelScoreForTime(1, 60001)).toBe(1000); // round(999.99…) = 1000
    expect(levelScoreForTime(1, 60200)).toBe(998);
  });
  it('沒有下限：最長可記錄時間仍有正分，且一路遞減', () => {
    expect(levelScoreForTime(1, MAX_RECORDABLE_TIME_MS)).toBe(129);
    let prev = Infinity;
    for (let t = sec(MIN_CLEAR_TIME_SEC); t <= MAX_RECORDABLE_TIME_MS; t += 7919) {
      const s = levelScoreForTime(1, t)!;
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });
  it('防作弊下限：低於 MIN_CLEAR_TIME_SEC 不可記錄（回傳 null），等於下限可記錄', () => {
    expect(levelScoreForTime(1, sec(MIN_CLEAR_TIME_SEC) - 1)).toBeNull();
    expect(levelScoreForTime(1, 0)).toBeNull();
    expect(levelScoreForTime(1, sec(MIN_CLEAR_TIME_SEC))).toBe(MAX_LEVEL_SCORE);
  });
  it('不可記錄：超過上限、非整數毫秒、NaN、未知關卡', () => {
    expect(levelScoreForTime(1, MAX_RECORDABLE_TIME_MS + 1)).toBeNull();
    expect(levelScoreForTime(1, 90000.5)).toBeNull();
    expect(levelScoreForTime(1, NaN)).toBeNull();
    expect(levelScoreForTime(13, 90000)).toBeNull();
    expect(levelScoreForTime('x', 90000)).toBeNull();
    expect(isRecordableTime('12', 90000)).toBe(true);
  });
  it('toTimeMs 四捨五入為整數毫秒', () => {
    expect(toTimeMs(90000.4)).toBe(90000);
    expect(toTimeMs(90000.5)).toBe(90001);
    expect(toTimeMs(Infinity)).toBeNaN();
  });
});

describe('經驗及總分', () => {
  it('經驗：每次通關 +100；答對不加經驗', () => {
    expect(EXP_PER_CORRECT).toBe(0);
    expect(EXP_PER_CLEAR).toBe(100);
    expect(clearExpGain(20)).toBe(100);
    expect(clearExpGain(0)).toBe(100);
    expect(clearExpGain(-3)).toBe(100);
    expect(clearExpGain(2.5)).toBe(100);
  });
  it('經驗計入總分：floor(exp × 0.3)，整數運算沒有浮點誤差', () => {
    expect(expScore(0)).toBe(0);
    expect(expScore(3)).toBe(0);
    expect(expScore(4)).toBe(1);
    expect(expScore(10)).toBe(3);
    expect(expScore(150)).toBe(45);
    for (let e = 0; e <= 5000; e += 10) expect(expScore(e)).toBe((e / 10) * 3);
    expect(expScore(-10)).toBe(0);
    expect(expScore(1.5)).toBe(0);
  });
  it('總分＝各關最佳分數之和＋floor(exp × 0.3)', () => {
    expect(totalScore([], 0)).toBe(0);
    expect(totalScore([816, 1000, 447], 0)).toBe(2263);
    expect(totalScore([816, 1000, 447], 150)).toBe(2263 + 45);
  });
  it('單次經驗上限＝通關 +100；在第 1 級最多升 1 級（規則容許 3 級）', () => {
    expect(MAX_EXP_PER_CLEAR).toBe(EXP_PER_CLEAR);
    expect(levelForExp(MAX_EXP_PER_CLEAR) - 1).toBeLessThanOrEqual(MAX_LEVEL_UPS_PER_WRITE);
    expect(getRequiredExpForLevel(1)).toBe(100);
  });
});

describe('與題庫及關卡設定一致', () => {
  const bank = parseQuestionBank(readFileSync(resolve(root, 'QUESTION_BANK.md'), 'utf8'));
  const counts = LEVELS_DATA.map((l) => ({ id: l.id, n: bank.filter((q) => l.sheetIds.includes(q.id)).length }));

  it('SCORED_LEVEL_IDS 與 data/levels.ts 的關卡 id 相同', () => {
    expect([...SCORED_LEVEL_IDS]).toEqual(LEVELS_DATA.map((l) => String(l.id)));
  });
  it('題庫中確有 1 字答案（MIN_ANSWER_SEC 以點 1 張字卡計）', () => {
    expect(bank.some((q) => q.answers.some((a) => a.length === 1))).toBe(true);
  });
  it('單關最多題數不少於題庫中任何一關（經驗上限足夠）', () => {
    expect(MAX_QUESTIONS_PER_LEVEL).toBeGreaterThanOrEqual(Math.max(...counts.map((c) => c.n)));
  });
});

describe('防作弊下限（HP 歸零即勝）', () => {
  const app = readFileSync(resolve(root, 'App.tsx'), 'utf8');
  it('最少命中次數＝ceil(1000 ÷ 300)＝4', () => {
    expect(MIN_HITS_TO_WIN).toBe(4);
  });
  it('MIN_CLEAR_TIME_SEC ＝ floor(4 × (0.35 ＋ 1.5 ＋ 0.6) ＋ 3 × 1.0) ＝ floor(12.8) ＝ 12', () => {
    expect(fastestClearSec(MIN_HITS_TO_WIN)).toBeCloseTo(12.8, 9);
    expect(MIN_CLEAR_TIME_SEC).toBe(Math.floor(fastestClearSec(MIN_HITS_TO_WIN)));
    expect(MIN_CLEAR_TIME_SEC).toBe(12);
    expect(FIXED_OVERHEAD_SEC).toBe(0);
  });
  it('動畫時間與 App.tsx 一致（出題 100＋250 ms、收合 400＋200 ms、命中 1000 ms）', () => {
    expect(TURN_START_SEC).toBe((100 + 250) / 1000);
    expect(ANSWER_COLLAPSE_SEC).toBe((400 + 200) / 1000);
    expect(HIT_ANIM_SEC).toBe(1);
    expect(app).toContain('setTimeout(r, (isRetry ? 50 : 100) * timeScale)');
    expect(app).toContain('setTimeout(r, (isRetry ? 50 : 250) * timeScale)');
    expect(app).toContain('setTimeout(r, 400 * timeScale)');
    expect(app).toContain('setTimeout(r, 200 * timeScale)');
    expect(app).toContain('setTimeout(r, 1000 * timeScale)');
  });
  it('計時在致勝一擊停止、Boss 說話時暫停（勝利台詞及門檻台詞不計）', () => {
    expect(app).toMatch(/battleRecorder\.markVictoryDecided\(\);\s*\/\/ 勝負已定/);
    expect(app).toContain('isBossSpeaking: bossSpeechMsg !== null');
  });
  it('實際最快的人手通關（每題 1.5 秒 → 剩 28.5 秒 → 245 傷害 → 5 擊）仍高於下限', () => {
    expect(fastestClearSec(5)).toBeGreaterThan(MIN_CLEAR_TIME_SEC);
  });
  it('老師的例子：平均 5 秒 × 7 題可以記錄', () => {
    expect(fastestClearSec(7, 5)).toBeGreaterThan(MIN_CLEAR_TIME_SEC);
    expect(7 * 5).toBeGreaterThan(MIN_CLEAR_TIME_SEC);
  });
  it('舊規則（須答完全部題目，最少 20 題）更慢，仍可通過', () => {
    expect(fastestClearSec(20)).toBeGreaterThan(MIN_CLEAR_TIME_SEC);
  });
  it('MIN_ANSWER_SEC 不高於 2 秒（只作下限，寧鬆勿嚴）', () => {
    expect(MIN_ANSWER_SEC).toBeLessThanOrEqual(2);
  });
});

describe('同步點：firestore.rules 的常數與本檔一致', () => {
  const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8');
  const fn = (name: string) => {
    const m = rules.match(new RegExp(`function ${name}\\(\\)\\s*\\{\\s*return\\s+([^;]+);`));
    if (!m) throw new Error(`firestore.rules 缺少 ${name}()`);
    return m[1].trim();
  };
  it.each([
    ['maxLevelScore', MAX_LEVEL_SCORE],
    ['fullScoreTimeMs', FULL_SCORE_TIME_SEC * 1000],
    ['minClearTimeSec', MIN_CLEAR_TIME_SEC],
    ['maxRecordableTimeMs', MAX_RECORDABLE_TIME_MS],
    ['expScoreNumerator', EXP_SCORE_NUMERATOR],
    ['expScoreDenominator', EXP_SCORE_DENOMINATOR],
    ['maxExpPerClear', MAX_EXP_PER_CLEAR],
    ['maxLevelUpsPerWrite', MAX_LEVEL_UPS_PER_WRITE],
  ])('%s() = %i', (name, value) => {
    expect(Number(fn(name))).toBe(value);
  });
  it('levelIds() 與 SCORED_LEVEL_IDS 相同', () => {
    const ids = [...fn('levelIds').matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(ids).toEqual([...SCORED_LEVEL_IDS]);
  });
  it('onlyKey() 涵蓋所有關卡 id', () => {
    const body = rules.slice(rules.indexOf('function onlyKey('), rules.indexOf('function levelUpdateOk('));
    for (const id of SCORED_LEVEL_IDS) expect(body).toContain(`'${id}'`);
  });
  it('規則以相同算式計分：math.round(… math.sqrt(fullScoreTimeMs() * 1.0 / t))', () => {
    expect(rules).toContain('math.round(maxLevelScore() * math.sqrt(fullScoreTimeMs() * 1.0 / t))');
    expect(rules).toContain('math.floor(e * expScoreNumerator() * 1.0 / expScoreDenominator())');
  });
});
