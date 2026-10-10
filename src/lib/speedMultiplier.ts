/**
 * 速度加成曲線（純函式）：依「答對當刻的剩餘秒數 t」計算傷害倍率。
 *
 *   t 先夾在 [0, TURN_TOTAL_SECONDS]
 *   t >= 20      : 1 + 2 × ((t − 20) / 10)^2        30s→3.00、28s→2.28、25s→1.50、22s→1.08、20s→1.00
 *   1 <= t < 20  : 0.1 + 0.9 × ((t − 1) / 19)^1.3   15s≈0.71、10s≈0.44、5s≈0.22、3s≈0.15、1s→0.10
 *   t < 1        : 0.1
 */

/** 每回合總秒數（與 constants.tsx 的 TURN_TIME 相同） */
export const SPEED_TOTAL_SECONDS = 30;
/** 高於此秒數（含）為「快答」區，倍率 ≥ 1 */
export const SPEED_FAST_THRESHOLD_SECONDS = 20;
/** 快答區最大額外倍率（30 秒時 1 + 2 = 3） */
export const SPEED_FAST_MAX_BONUS = 2;
/** 最高倍率（剩餘 30 秒）＝ 1 ＋ SPEED_FAST_MAX_BONUS ＝ 3（300%） */
export const SPEED_MAX_MULTIPLIER = 1 + SPEED_FAST_MAX_BONUS;
/** 快答區曲線指數 */
export const SPEED_FAST_EXPONENT = 2;
/** 低於此秒數為最低倍率 */
export const SPEED_SLOW_THRESHOLD_SECONDS = 1;
/** 最低倍率 */
export const SPEED_MIN_MULTIPLIER = 0.1;
/** 慢答區曲線指數 */
export const SPEED_SLOW_EXPONENT = 1.3;

/** 計算速度倍率；totalSeconds 預設 30 */
export function speedMultiplier(remainingSeconds: number, totalSeconds: number = SPEED_TOTAL_SECONDS): number {
  const total = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : SPEED_TOTAL_SECONDS;
  const t = Math.min(Math.max(Number.isNaN(remainingSeconds) ? 0 : remainingSeconds, 0), total);
  const fast = SPEED_FAST_THRESHOLD_SECONDS, slow = SPEED_SLOW_THRESHOLD_SECONDS;
  if (t >= fast) {
    // 以 10 秒（30 − 20）為快答區寬度；保持與規格一致
    const x = (t - fast) / (SPEED_TOTAL_SECONDS - fast);
    return 1 + SPEED_FAST_MAX_BONUS * Math.pow(x, SPEED_FAST_EXPONENT);
  }
  if (t >= slow) {
    const x = (t - slow) / (fast - slow);
    return SPEED_MIN_MULTIPLIER + (1 - SPEED_MIN_MULTIPLIER) * Math.pow(x, SPEED_SLOW_EXPONENT);
  }
  return SPEED_MIN_MULTIPLIER;
}

/** 介面顯示用格式：一律「×」加兩位小數，例如 ×1.50、×0.44 */
export function formatMultiplier(mult: number): string {
  return `×${mult.toFixed(2)}`;
}
