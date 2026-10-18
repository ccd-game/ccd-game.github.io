/**
 * 計分設定及算式（唯一的設定檔；純函式，無副作用，不依賴 React／Firebase）。
 *
 * 單關分數（t＝通關時間）：
 *   t ≤ FULL_SCORE_TIME_SEC（60 秒） → MAX_LEVEL_SCORE（1000）
 *   t > 60 秒                        → round(1000 × √(60 / t))，沒有下限（只會趨近 0，不會等於 0）
 *   t < MIN_CLEAR_TIME_SEC           → 無效（防作弊下限），不記錄
 * 總分 ＝ 各關最佳分數之和 ＋ floor(經驗 × 0.3)
 * 經驗 ＝ 每次通關 +100（只在勝利時入帳；答對不加經驗）
 *
 * 時間一律以「整數毫秒」計算及儲存（bestTimeMs），分數一律為整數，
 * 所以 firestore.rules 可以用完全相同的算式重算並核對 bestScore。
 *
 * ⚠️ 同步點：本檔所有常數及 levelScoreForTime()／expScore() 的算式必須與 firestore.rules
 *    「通關計分」一節完全一致；src/lib/scoring.test.ts 會讀取 firestore.rules 自動核對。
 *    修改任何一邊都要同時修改另一邊，並先部署規則、後部署網站。
 */
import { BOSS_MAX_HP, CORRECT_ANSWER_DAMAGE } from '../../constants';
import { SPEED_MAX_MULTIPLIER } from './speedMultiplier';

/** 每關滿分 */
export const MAX_LEVEL_SCORE = 1000;
/** 等於或快於此時間得滿分（秒） */
export const FULL_SCORE_TIME_SEC = 60;
/** 單關最長可記錄時間（毫秒）：防止異常數值；正常一關不會超過（60 題 × 30 秒時限亦只約 32 分鐘） */
export const MAX_RECORDABLE_TIME_MS = 60 * 60 * 1000;

// ── 防作弊下限（「Boss HP 歸零即勝」規則下，人手可能做到的最快通關）────────────
// 計時範圍：開場台詞結束、第一題開始 → 擊倒 Boss 的一擊（之後的勝利台詞不計）；
// Boss 說話（門檻台詞）及作答回合中的暫停都不計時（見 battleRecorder.ts）。
// 以下動畫時間量自 App.tsx（timeScale = 1；自動作答不記錄，所以不用考慮加速）。

/** 最少命中次數＝ceil(Boss HP ÷ 單擊最高傷害)＝ceil(1000 ÷ (100 × 300%))＝4 */
export const MIN_HITS_TO_WIN = Math.ceil(BOSS_MAX_HP / (CORRECT_ANSWER_DAMAGE * SPEED_MAX_MULTIPLIER));
/** 出題演出（startLevelSequence：100 ms ＋ 250 ms）後才可作答 */
export const TURN_START_SEC = 0.35;
/**
 * 人手最快作答（秒）：讀題並點選字卡。題庫有 1 字答案（repo 10 題、最新題庫 22 題），
 * 所以取最有利的情況：最少約 1.1 秒讀題找字 ＋ 點 1 張字卡約 0.4 秒 ＝ 1.5 秒。
 */
export const MIN_ANSWER_SEC = 1.5;
/** 答對後的收合演出（onCorrectAnswer：400 ms ＋ 200 ms），之後才命中 */
export const ANSWER_COLLAPSE_SEC = 0.6;
/** 命中演出（1000 ms），之後才出下一題；致勝一擊時計時已停止，所以只計前 MIN_HITS_TO_WIN − 1 擊 */
export const HIT_ANIM_SEC = 1.0;
/** 固定額外時間（目前沒有：開場演出及開場台詞在計時開始前，勝利台詞在計時停止後） */
export const FIXED_OVERHEAD_SEC = 0;

/**
 * 推算某命中次數下人手最快的通關時間（秒，未取整）：
 *   hits × (出題 0.35 ＋ 作答 ＋ 收合 0.6) ＋ (hits − 1) × 命中演出 1.0 ＋ 固定額外時間
 */
export function fastestClearSec(hits: number, answerSec: number = MIN_ANSWER_SEC): number {
  return hits * (TURN_START_SEC + answerSec + ANSWER_COLLAPSE_SEC) + Math.max(0, hits - 1) * HIT_ANIM_SEC + FIXED_OVERHEAD_SEC;
}

/**
 * 防作弊下限（秒）：低於此時間的通關一律不記錄（規則亦拒絕）；所有關卡共用。
 * ＝ floor(4 × (0.35 ＋ 1.5 ＋ 0.6) ＋ 3 × 1.0) ＝ floor(12.8) ＝ 12。
 * 規則需要字面常數，所以寫成 12；scoring.test.ts 核對它等於上式，亦等於 firestore.rules 的 minClearTimeSec()。
 */
export const MIN_CLEAR_TIME_SEC = 12;

/** 每答對一題獲得的經驗（已停用，保留常數供相容） */
export const EXP_PER_CORRECT = 0;
/** 每次通關獲得的經驗 */
export const EXP_PER_CLEAR = 100;
/** 經驗計入總分的比率：分子／分母（0.3），以整數運算避免浮點誤差 */
export const EXP_SCORE_NUMERATOR = 3;
export const EXP_SCORE_DENOMINATOR = 10;
/**
 * 單關最多題數（題庫：第 11、12 關各 60 題）；用於規則的單次經驗上限。
 * HP 歸零即勝：答錯重答同一題、題目用盡判負，所以一場勝利最多答對 min(題數, ceil(1000 ÷ 最低傷害 10)) ＝ 60 題。
 */
export const MAX_QUESTIONS_PER_LEVEL = 60;
/** 單次寫入最多可增加的經驗（＝通關獎勵；答對已不加經驗） */
export const MAX_EXP_PER_CLEAR = EXP_PER_CLEAR;
/** 單次寫入最多可升的等級數（MAX_EXP_PER_CLEAR 在第 1 級最多升 2 級，留餘量） */
export const MAX_LEVEL_UPS_PER_WRITE = 3;

/** 可計分的關卡 id（字串形式，即 Firestore levels map 的 key；scoring.test.ts 核對 data/levels.ts） */
export const SCORED_LEVEL_IDS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export function isScoredLevelId(levelId: number | string): boolean {
  return SCORED_LEVEL_IDS.includes(String(levelId));
}

/** 毫秒 → 整數毫秒（四捨五入）；非有限數回傳 NaN */
export function toTimeMs(ms: number): number {
  return Number.isFinite(ms) ? Math.round(ms) : NaN;
}

/** 此通關時間可否記錄：已知關卡、整數毫秒、不低於下限、不超過上限 */
export function isRecordableTime(levelId: number | string, timeMs: number): boolean {
  return (
    isScoredLevelId(levelId) &&
    Number.isInteger(timeMs) &&
    timeMs >= MIN_CLEAR_TIME_SEC * 1000 &&
    timeMs <= MAX_RECORDABLE_TIME_MS
  );
}

/**
 * 時間分數曲線本身（不檢查防作弊下限）：t ≤ 60000 毫秒 → 1000；否則 round(1000 × √(60000 / t))。
 * 與 firestore.rules levelScoreFor() 相同。
 */
export function timeScore(timeMs: number): number {
  const fullMs = FULL_SCORE_TIME_SEC * 1000;
  if (timeMs <= fullMs) return MAX_LEVEL_SCORE;
  return Math.round(MAX_LEVEL_SCORE * Math.sqrt(fullMs / timeMs));
}

/** 通關時間（整數毫秒）→ 可記錄的分數（整數）。不可記錄的時間（低於下限等）回傳 null。 */
export function levelScoreForTime(levelId: number | string, timeMs: number): number | null {
  return isRecordableTime(levelId, timeMs) ? timeScore(timeMs) : null;
}

/** 經驗計入總分的部分：floor(exp × 0.3)（整數運算） */
export function expScore(exp: number): number {
  return Number.isInteger(exp) && exp > 0 ? Math.floor((exp * EXP_SCORE_NUMERATOR) / EXP_SCORE_DENOMINATOR) : 0;
}

/** 一次通關獲得的經驗 */
export function clearExpGain(correctAnswers: number): number {
  const n = Number.isInteger(correctAnswers) && correctAnswers > 0 ? correctAnswers : 0;
  return n * EXP_PER_CORRECT + EXP_PER_CLEAR;
}

/** 總分 ＝ 各關最佳分數之和 ＋ floor(exp × 0.3) */
export function totalScore(bestScores: Iterable<number>, exp: number): number {
  let sum = 0;
  for (const s of bestScores) sum += s;
  return sum + expScore(exp);
}
