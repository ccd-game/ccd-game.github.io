/**
 * 每場戰鬥的出題次序（純函式）。
 * - 每場戰鬥開始時（包括「再戰」）以 Fisher–Yates 洗牌一次，同一場戰鬥內依次出題，不會重複。
 * - 答錯／超時重答同一題（索引不變）；答完最後一題而 Boss 未倒＝題目用盡（戰敗，見 QUESTIONS_EXHAUSTED_POLICY）。
 */
export type Rng = () => number;

/**
 * Fisher–Yates 洗牌：回傳新陣列，不改動輸入。rng 須回傳 [0, 1) 的數（預設 Math.random；測試可注入固定種子）。
 */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const r = rng();
    // 防禦：rng 回傳 1 或越界時仍落在 [0, i]
    const j = Math.min(i, Math.max(0, Math.floor(r * (i + 1))));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 新一場戰鬥的出題次序 */
export function newBattleOrder<T>(levelQuestions: readonly T[], rng: Rng = Math.random): T[] {
  return shuffle(levelQuestions, rng);
}

/** 答對第 index 題後，是否已無下一題 */
export function isQuestionsExhausted(order: readonly unknown[], answeredIndex: number): boolean {
  return answeredIndex >= order.length - 1;
}
