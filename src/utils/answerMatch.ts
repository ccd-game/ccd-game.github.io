/**
 * 答題判定（純函式）
 *
 * - 預填格（locked）不參與判定；只看學生可輸入的格子。
 * - 輸入字串 = 由第一個可輸入格起「連續」已填的字（遇到空格即停），避免中間清空一格後誤判。
 * - 與任何一個可接受答案完全相同 → 'correct'（即使還有空格，例如 2 字答案配 4 格）。
 * - 所有可輸入格都填滿而仍不相符 → 'wrong'（沿用原有做法：未填滿前不判錯，學生可點格子清除重填）。
 * - 其他 → 'incomplete'。
 */
export interface MatchCell { char: string; locked?: boolean }
export type MatchResult = 'correct' | 'wrong' | 'incomplete';

export function editableInput(cells: MatchCell[]): { input: string; full: boolean } {
  const editable = cells.filter(c => !c.locked);
  let input = '';
  for (const c of editable) { if (!c.char) break; input += c.char; }
  return { input, full: editable.length > 0 && editable.every(c => !!c.char) };
}

export function evaluateInput(cells: MatchCell[], answers: string[]): MatchResult {
  const { input, full } = editableInput(cells);
  if (input.length > 0 && answers.some(a => a === input)) return 'correct';
  if (full) return 'wrong';
  return 'incomplete';
}

/** 可輸入格數 = 最長的可接受答案字數（以字元計，不以 UTF-16 計） */
export function editableCellCount(answers: string[]): number {
  return Math.max(0, ...answers.map(a => Array.from(a).length));
}
