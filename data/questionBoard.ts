/**
 * 遊戲用的出題盤包裝：把題庫 sheet ID 對應到關卡干擾字池，並套用 src/config/board.ts 的設定。
 * App.tsx 只經此函式產生答題格，方便測試覆蓋與 App 完全相同的呼叫。
 *
 * CCD 文案的 buildBoardDetailed 已支援 opts.prefill，並在產生器內排除：
 *   - 預填字及其異體、「…」
 *   - 同一異體／互用字組的兩個干擾字同時出現
 *   - 與答案字或預填字衝突的陷阱（列入 BoardResult.suppressedTraps）
 * 因此本包裝不再做 ≤50 次重抽。includeVariantTraps 已由 CCD 文案刪除，亦不支援。
 */
import { buildBoard, buildBoardDetailed, levelIdForSheet, variantsOf, BoardResult, Rng } from './distractors';
import { BOARD_SIZE } from '../src/config/board';

export interface BoardQuestion {
  id: number;
  /** 只含學生要輸入的部分（不含預填）；須已經 parseAnswerCell 解析，不要傳未解析的「[以…]為恥」 */
  answers: string[];
  question: string;
  /** 預填格（鎖定）；經 opts.prefill 傳給 buildBoardDetailed，「…」會被忽略 */
  prefill?: string[];
}

/** 不屬任何關卡的關卡 ID：buildBoard 會改用全部十二關原文作後備字，仍保證 20 格及安全規則 */
export const UNKNOWN_LEVEL_ID = 0;

const warnedSheets = new Set<number>();
const loggedSuppressed = new Set<string>();

/** sheet ID → 關卡 ID；找不到時記錄一次警告並回傳 UNKNOWN_LEVEL_ID */
export function resolveBoardLevelId(sheetId: number): number {
  const lid = levelIdForSheet(sheetId);
  if (lid === undefined) {
    if (!warnedSheets.has(sheetId)) {
      warnedSheets.add(sheetId);
      console.warn(`[questionBoard] 題庫 sheet ${sheetId} 沒有對應關卡干擾字池，改用全部關卡原文作干擾字。`);
    }
    return UNKNOWN_LEVEL_ID;
  }
  return lid;
}

/** 盤面上的干擾字（不含答案格） */
export function distractorsOf(r: BoardResult): string[] {
  return [...r.traps.map(t => t.char), ...r.nearby, ...r.random, ...r.fallback];
}

/** 干擾字中是否有兩字屬同一異體／互用字組（測試用；產生器本身已排除） */
export function hasVariantPair(chars: string[]): boolean {
  const seen = new Set<string>();
  for (const c of chars) {
    for (const v of variantsOf(c)) if (seen.has(v)) return true;
    seen.add(c);
  }
  return false;
}

/**
 * 產生一題的答題格（詳細版）。
 * answers 只含可輸入部分；prefill 經 opts.prefill 傳入（產生器會排除預填字及其異體）。
 */
export function buildQuestionBoardDetailed(q: BoardQuestion, rng: Rng = Math.random): BoardResult {
  const levelId = resolveBoardLevelId(q.id);
  const r = buildBoardDetailed(q.answers, levelId, BOARD_SIZE, rng, {
    question: q.question,
    prefill: q.prefill,
  });
  // 開發時把被抑制的陷阱記一次（例如 L4「恥」同時是答案字與陷阱字）
  if (r.suppressedTraps.length > 0) {
    const key = `${q.id}|${q.question}|${r.suppressedTraps.map(t => t.char).join('')}`;
    if (!loggedSuppressed.has(key)) {
      loggedSuppressed.add(key);
      if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
        console.info(
          `[questionBoard] sheet ${q.id}「${q.question}」抑制陷阱：` +
            r.suppressedTraps.map(t => `${t.char}→${t.target}（${t.kind}）`).join('、')
        );
      }
    }
  }
  return r;
}

/** 產生一題的答題格（已洗牌，BOARD_SIZE 格） */
export function buildQuestionBoard(q: BoardQuestion, rng: Rng = Math.random): string[] {
  return buildQuestionBoardDetailed(q, rng).tiles;
}

// 方便直接呼叫原函式（與 CCD 文案的說明一致）
export { buildBoard, levelIdForSheet };
