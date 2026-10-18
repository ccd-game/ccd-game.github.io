import { describe, expect, it } from 'vitest';
import {
  NEW_PLAYER_PROGRESS,
  PUBLIC_PROFILE_FIELDS,
  applyClear,
  isLevelBest,
  migrateGameFields,
  normalizeLevels,
  scoreFor,
  sumLevelScores,
} from './playerData';

const base = { level: 1, exp: 0, levels: {} };

describe('applyClear：每關只記個人最佳；經驗及總分', () => {
  it('首次通關：記錄時間及分數；經驗 +100；總分＝最佳之和＋floor(exp×0.3)', () => {
    const r = applyClear(base, { levelId: 1, timeMs: 90000, correctAnswers: 20 });
    if (!r.recorded) throw new Error('expected recorded');
    expect(r.improved).toBe(true);
    expect(r.entry).toEqual({ bestTimeMs: 90000, bestScore: 816 });
    expect(r.previous).toBeNull();
    expect(r.expGained).toBe(100);
    expect(r.progress).toEqual({ level: 2, exp: 100, levels: { '1': { bestTimeMs: 90000, bestScore: 816 } }, score: 816 + 30 });
  });
  it('更快 → 更新最佳；較慢 → 保留最佳但仍得經驗', () => {
    const first = applyClear(base, { levelId: 1, timeMs: 120000, correctAnswers: 20 });
    if (!first.recorded) throw new Error();
    const faster = applyClear(first.progress, { levelId: 1, timeMs: 90000, correctAnswers: 20 });
    if (!faster.recorded) throw new Error();
    expect(faster.improved).toBe(true);
    expect(faster.previous).toEqual({ bestTimeMs: 120000, bestScore: 707 });
    expect(faster.progress.levels['1']).toEqual({ bestTimeMs: 90000, bestScore: 816 });
    const slower = applyClear(faster.progress, { levelId: 1, timeMs: 300000, correctAnswers: 20 });
    if (!slower.recorded) throw new Error();
    expect(slower.improved).toBe(false);
    expect(slower.clearScore).toBe(447);
    expect(slower.progress.levels['1']).toEqual({ bestTimeMs: 90000, bestScore: 816 });
    expect(slower.progress.exp).toBe(300);
    expect(slower.progress.score).toBe(816 + 90);
  });
  it('同分（已滿分再更快）不更新紀錄時間', () => {
    const a = applyClear(base, { levelId: 2, timeMs: 60000, correctAnswers: 28 });
    if (!a.recorded) throw new Error();
    const b = applyClear(a.progress, { levelId: 2, timeMs: 50000, correctAnswers: 28 });
    if (!b.recorded) throw new Error();
    expect(b.improved).toBe(false);
    expect(b.progress.levels['2'].bestTimeMs).toBe(60000);
  });
  it('總分＝各關最佳之和（多關）＋經驗分', () => {
    let p = { ...base, score: 0 } as { level: number; exp: number; levels: Record<string, { bestTimeMs: number; bestScore: number }>; score: number };
    for (const [id, t] of [[1, 90000], [2, 60000], [11, 600000]] as const) {
      const r = applyClear(p, { levelId: id, timeMs: t, correctAnswers: 0 });
      if (!r.recorded) throw new Error();
      p = r.progress;
    }
    expect(sumLevelScores(p.levels)).toBe(816 + 1000 + 316);
    expect(p.exp).toBe(300);
    expect(p.score).toBe(816 + 1000 + 316 + 90);
  });
  it('時間低於防作弊下限、未知關卡：什麼都不記錄（包括經驗）', () => {
    expect(applyClear(base, { levelId: 1, timeMs: 11999, correctAnswers: 20 })).toEqual({ recorded: false, reason: 'invalid-time', levelId: '1' });
    expect(applyClear(base, { levelId: 42, timeMs: 90000, correctAnswers: 20 }).recorded).toBe(false);
  });
  it('等級不會下降（舊文件等級高於經驗推算值時保留）', () => {
    const r = applyClear({ level: 5, exp: 0, levels: {} }, { levelId: 1, timeMs: 90000, correctAnswers: 20 });
    if (!r.recorded) throw new Error();
    expect(r.progress.level).toBe(5);
  });
  it('不改動傳入物件', () => {
    const levels = { '1': { bestTimeMs: 120000, bestScore: 707 } };
    const input = { level: 1, exp: 0, levels };
    applyClear(input, { levelId: 1, timeMs: 90000, correctAnswers: 20 });
    expect(input).toEqual({ level: 1, exp: 0, levels: { '1': { bestTimeMs: 120000, bestScore: 707 } } });
  });
});

describe('normalizeLevels／isLevelBest', () => {
  it('只保留已知關卡及結構正確的紀錄', () => {
    expect(normalizeLevels({
      '1': { bestTimeMs: 90000, bestScore: 816 },
      '2': { bestTimeMs: 90000, bestScore: 1001 },
      '3': { bestTimeMs: 1.5, bestScore: 500 },
      '4': { bestTimeMs: 90000, bestScore: 816, extra: 1 },
      '99': { bestTimeMs: 90000, bestScore: 816 },
    })).toEqual({ '1': { bestTimeMs: 90000, bestScore: 816 } });
    expect(normalizeLevels(null)).toEqual({});
    expect(normalizeLevels([1, 2])).toEqual({});
    expect(isLevelBest({ bestTimeMs: 90000, bestScore: 0 })).toBe(false);
  });
  it('scoreFor', () => {
    expect(scoreFor({}, 0)).toBe(0);
    expect(scoreFor({ '1': { bestTimeMs: 90000, bestScore: 816 } }, 10)).toBe(819);
  });
});

describe('migrateGameFields：遷移（冪等）', () => {
  it('舊 gold 文件（無 staminaUpdatedAt）→ jiyuan = gold、體力滿格 100，需要改寫', () => {
    const { progress, needsRewrite } = migrateGameFields({ level: 3, gold: 77, exp: 0, stamina: 90, displayLabel: 'x' }, 1_700_000_000_000);
    expect(progress.level).toBe(3);
    expect(progress.jiyuan).toBe(77);
    expect(progress.stamina).toBe(100);
    expect(progress.staminaUpdatedAt).toBe(1_700_000_000_000);
    expect(progress.score).toBe(0);
    expect(needsRewrite).toBe(true);
  });
  it('舊文件 exp 不為 0 時，score = floor(exp × 0.3)', () => {
    expect(migrateGameFields({ level: 1, gold: 5, exp: 5, stamina: 100 }).progress.score).toBe(1);
    expect(migrateGameFields({ level: 1, gold: 5, exp: 5, stamina: 100 }).progress.stamina).toBe(100);
  });
  it('已遷移文件：原樣保留，不需改寫（冪等）', () => {
    const doc = { level: 2, jiyuan: 40, exp: 150, stamina: 100, staminaUpdatedAt: 1_700_000_000_000, score: 861, levels: { '1': { bestTimeMs: 90000, bestScore: 816 } } };
    const first = migrateGameFields(doc);
    expect(first.needsRewrite).toBe(false);
    expect(first.progress).toEqual(doc);
    expect(migrateGameFields({ ...first.progress } as Record<string, unknown>).needsRewrite).toBe(false);
  });
  it('遷移結果再遷移一次不再需要改寫', () => {
    const once = migrateGameFields({ level: 1, gold: 9, exp: 0, stamina: 100 }, 1000);
    const again = migrateGameFields({ ...once.progress } as Record<string, unknown>);
    expect(again.needsRewrite).toBe(false);
    expect(again.progress).toEqual(once.progress);
  });
  it('同時有 gold 及 jiyuan：以 jiyuan 為準並刪除 gold', () => {
    const r = migrateGameFields({ level: 1, gold: 9, jiyuan: 30, exp: 0, stamina: 100, staminaUpdatedAt: 5, score: 0, levels: {} });
    expect(r.progress.jiyuan).toBe(30);
    expect(r.needsRewrite).toBe(true);
  });
  it('缺欄位或數值異常：夾在範圍內並改寫；無 staminaUpdatedAt → 滿格', () => {
    const r = migrateGameFields({ level: 0, jiyuan: -5, exp: 1.7, stamina: 5000, score: 999, levels: { '1': { bestTimeMs: 90000, bestScore: 816 } } }, 42);
    expect(r.progress.level).toBe(1);
    expect(r.progress.jiyuan).toBe(0);
    expect(r.progress.exp).toBe(1);
    expect(r.progress.stamina).toBe(100);
    expect(r.progress.staminaUpdatedAt).toBe(42);
    expect(r.progress.score).toBe(816);
    expect(r.needsRewrite).toBe(true);
    const n = migrateGameFields(null, 99).progress;
    expect(n.stamina).toBe(100);
    expect(n.staminaUpdatedAt).toBe(99);
  });
});

describe('公開欄位', () => {
  it('白名單：jiyuan 取代 gold；新增 score、levels', () => {
    expect(PUBLIC_PROFILE_FIELDS).toContain('jiyuan');
    expect(PUBLIC_PROFILE_FIELDS).toContain('score');
    expect(PUBLIC_PROFILE_FIELDS).toContain('levels');
    expect(PUBLIC_PROFILE_FIELDS).not.toContain('gold');
  });
  it('新用戶初始值符合規則（level 1、exp 0、jiyuan ≤ 100、stamina 100、score 0、levels 空）', () => {
    expect(NEW_PLAYER_PROGRESS.level).toBe(1);
    expect(NEW_PLAYER_PROGRESS.exp).toBe(0);
    expect(NEW_PLAYER_PROGRESS.jiyuan).toBe(1);
    expect(NEW_PLAYER_PROGRESS.stamina).toBe(100);
    expect(NEW_PLAYER_PROGRESS.score).toBe(0);
    expect(NEW_PLAYER_PROGRESS.levels).toEqual({});
  });
  it('白名單含 staminaUpdatedAt', () => {
    expect(PUBLIC_PROFILE_FIELDS).toContain('staminaUpdatedAt');
  });
});
