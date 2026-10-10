/**
 * 遊戲實際讀取的 QUESTION_BANK.md（由 tools/sync-question-bank.mjs 自 CCD 文案題庫同步）：
 * 以遊戲本身的解析器及盤面產生器驗證題數、預填、拼寫、字卡。
 */
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseQuestionBank } from './questionParser';
import { buildQuestionBoard, buildQuestionBoardDetailed, distractorsOf, hasVariantPair, resolveBoardLevelId, UNKNOWN_LEVEL_ID } from '../../data/questionBoard';
import { SHEET_TO_LEVEL, variantsOf } from '../../data/distractors';
import { BOARD_SIZE } from '../config/board';
import { ELLIPSIS } from './answerSyntax';
import { syncBank, readLevels, answerCellProblems } from '../../tools/sync-question-bank.mjs';

const ROOT = path.resolve(__dirname, '../..');
const md = fs.readFileSync(path.join(ROOT, 'QUESTION_BANK.md'), 'utf8');
const warnings: string[] = [];
const bank = parseQuestionBank(md, (w) => warnings.push(w));
const levels: { id: number; sheetIds: number[] }[] = readLevels(fs.readFileSync(path.join(ROOT, 'data/levels.ts'), 'utf8'));

const HAN = /\p{Script=Han}/u;
const isHanChar = (c: string) => HAN.test(c);
/** 盤面能否拼出答案（每張字卡只可用一次） */
function canSpell(answer: string, board: string[]): boolean {
  const left = new Map<string, number>();
  for (const c of board) left.set(c, (left.get(c) ?? 0) + 1);
  for (const c of Array.from(answer)) { const n = left.get(c) ?? 0; if (!n) return false; left.set(c, n - 1); }
  return true;
}

/** 可重現的亂數 */
function mulberry32(a: number) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

describe('題庫結構', () => {
  it('解析沒有任何警告', () => expect(warnings).toEqual([]));
  it('第 1–10 關各 40 題；第 11、12 關各 60 題（3 篇 × 20，照來源）', () => {
    const counts = Object.fromEntries(levels.map((l) => [l.id, bank.filter((q) => l.sheetIds.includes(q.id)).length]));
    expect(counts).toEqual({ 1: 40, 2: 40, 3: 40, 4: 40, 5: 40, 6: 40, 7: 40, 8: 40, 9: 40, 10: 40, 11: 60, 12: 60 });
    expect(bank.length).toBe(520);
  });
  it('同一 ID 內沒有重複題目；每題屬於某一關', () => {
    const keys = bank.map((q) => `${q.id}|${q.question}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const q of bank) expect(levels.some((l) => l.sheetIds.includes(q.id))).toBe(true);
  });
  it('段落「## ID: n」不重複', () => {
    const ids = [...md.matchAll(/^##\s*ID:\s*(\d+)/gm)].map((m) => +m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it('修訂答案：「不恥相師」的「恥」＝ [以…]為恥（只此一個答案）', () => {
    const q = bank.find((x) => x.question.includes('不恥相師'))!;
    expect(q.answer).toBe('[以…]為恥');
    expect(q.prefill).toEqual(['以', ELLIPSIS]);
    expect(q.answers).toEqual(['為恥']);
  });
  it('使用預填的題目都能解析', () => {
    const withPrefill = bank.filter((q) => (q.prefill ?? []).length > 0);
    expect(withPrefill.length).toBe(4);
    for (const q of withPrefill) expect(q.answers.length).toBeGreaterThan(0);
  });
  it('答案（可輸入部分）只含漢字', () => {
    for (const q of bank) for (const a of q.answers) expect(Array.from(a).every(isHanChar), `${q.id} ${q.question}：${a}`).toBe(true);
  });
  it('答案字數合計不超過 20 格（盤面不會溢出）', () => {
    for (const q of bank) expect(q.answers.join('').length, `${q.id} ${q.question}`).toBeLessThanOrEqual(BOARD_SIZE);
  });
});

describe('字卡盤面（各關干擾字池：data/questionBoard.ts → data/distractors.ts 的 buildBoardDetailed，與 App 相同的呼叫）', () => {
  it('題庫每個 sheet ID 都對應到關卡，且與 data/levels.ts 一致', () => {
    const sheets = [...new Set(bank.map((q) => q.id))].sort((a, b) => a - b);
    expect(sheets).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    const unmapped = sheets.filter((id) => resolveBoardLevelId(id) === UNKNOWN_LEVEL_ID);
    expect(unmapped).toEqual([]);
    for (const l of levels) for (const id of l.sheetIds) expect(SHEET_TO_LEVEL[id]).toBe(l.id);
  });

  it('520 題 × 100 盤：20 格、每個答案都拼得出、干擾字不重複、只有漢字、不是答案字／預填字或其異體、沒有同組異體字對、沒有「…」或標點', () => {
    const rng = mulberry32(20261011);
    const failures: string[] = [];
    let boards = 0;
    for (const q of bank) {
      const prefill = (q.prefill ?? []).filter((c) => c !== ELLIPSIS);
      const answerChars = new Set(q.answers.flatMap((a) => Array.from(a)));
      const banned = new Set<string>();
      for (const c of [...answerChars, ...prefill]) { banned.add(c); for (const v of variantsOf(c)) banned.add(v); }
      for (let i = 0; i < 100; i++) {
        const r = buildQuestionBoardDetailed(q, rng);
        boards++;
        const tag = `${q.id}「${q.question}」`;
        if (r.tiles.length !== BOARD_SIZE) failures.push(`${tag}：${r.tiles.length} 格`);
        for (const t of r.tiles) if (!isHanChar(t)) failures.push(`${tag}：非漢字字卡「${t}」`);
        for (const a of q.answers) if (!canSpell(a, r.tiles)) failures.push(`${tag}：拼不出「${a}」`);
        const d = distractorsOf(r);
        if (new Set(d).size !== d.length) failures.push(`${tag}：干擾字重複 ${d.join('')}`);
        for (const c of d) if (banned.has(c)) failures.push(`${tag}：干擾字「${c}」是答案字／預填字或其異體`);
        if (hasVariantPair(d)) failures.push(`${tag}：同組異體字對 ${d.join('')}`);
        if (r.answerTiles.length + d.length !== r.tiles.length) failures.push(`${tag}：格子數不符`);
      }
    }
    expect(boards).toBe(52_000);
    expect(failures.slice(0, 20)).toEqual([]);
  }, 120_000);

  it('預填字不會成為字卡（L4「恥」題：以、… 都不在盤上）', () => {
    const q = bank.find((x) => x.question.includes('不恥相師'))!;
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const tiles = buildQuestionBoard(q, rng);
      expect(tiles).not.toContain('以');
      expect(tiles).not.toContain(ELLIPSIS);
      expect(canSpell('為恥', tiles)).toBe(true);
    }
  });

  it('未知 sheet：退回全部關卡原文作干擾字，仍是 20 格', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tiles = buildQuestionBoard({ id: 99, question: '測試', answers: ['學而'] }, mulberry32(1));
    expect(tiles.length).toBe(BOARD_SIZE);
    expect(canSpell('學而', tiles)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('tools/sync-question-bank.mjs', () => {
  const levelsSrc = fs.readFileSync(path.join(ROOT, 'data/levels.ts'), 'utf8');
  it('repo 的 QUESTION_BANK.md 已是正規化後的結果（再同步一次沒有改動）', () => {
    const r = syncBank(md, readLevels(levelsSrc));
    expect(r.errors).toEqual([]);
    expect(r.text).toBe(md);
  });
  it('正規化欄位空白', () => {
    const src = '## ID: 4 - 師說\n| 4 | 背誦 | 「位卑則足羞，_____。」 |官盛則近諛 |\n';
    const r = syncBank(src, [{ id: 4, sheetIds: [4] }]);
    expect(r.text).toContain('| 4 | 背誦 | 「位卑則足羞，_____。」 | 官盛則近諛 |');
  });
  it('檢出錯誤：題數不足、ID 不在段落、重複題目、標點', () => {
    const src = '## ID: 1 - 甲\n| 1 | 背誦 | 題 | 答。 |\n| 1 | 背誦 | 題 | 答 |\n| 2 | 背誦 | 乙 | 答 |\n';
    const r = syncBank(src, [{ id: 1, sheetIds: [1, 2] }]);
    const all = r.errors.join('\n');
    expect(all).toMatch(/非漢字「。」/);
    expect(all).toMatch(/題目重複/);
    expect(all).toMatch(/ID 2 不在/);
    expect(all).toMatch(/第 1 關有 3 題，應為 40 題/);
  });
  it('答案欄檢查與遊戲語法一致', () => {
    expect(answerCellProblems('[以…]為恥')).toEqual([]);
    expect(answerCellProblems('［以…］為恥／感到羞恥')).toEqual([]);
    expect(answerCellProblems('全都/都/皆')).toEqual([]);
    expect(answerCellProblems('為[恥]').length).toBeGreaterThan(0);
    expect(answerCellProblems('[以…]為恥/[於…]感到羞恥').length).toBeGreaterThan(0);
    expect(answerCellProblems('[以…]').length).toBeGreaterThan(0);
  });
});
