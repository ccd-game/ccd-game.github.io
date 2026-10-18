/**
 * 玩家資料模型（純函式）：機緣 jiyuan、經驗 exp、體力 stamina、等級 level、總分 score、各關最佳 levels。
 *
 * - 機緣 jiyuan：舊欄位 gold（介面舊稱「文氣」）改名而來，遷移時沿用原數值。
 * - 等級 level：保留。現時用於主頁等級徽章及經驗條（getRequiredExpForLevel），
 *   亦是規則「等級不可下降、每次最多升一級」的依據；與計分無關。
 * - 經驗 exp：累計值，每次通關 +100（只在勝利時入帳；答對不加經驗）；等級由累計經驗推算。
 * - 體力 stamina：0–100；另存 staminaUpdatedAt（回復起點）。讀取時依經過時間推算回復，只在扣除／返還時寫入。
 * - 總分 score：各關最佳分數之和 ＋ floor(exp × 0.3)（規則以差額方式強制），排行榜依此排序。
 * - levels：{ [levelId]: { bestTimeMs, bestScore } }，只保存個人最佳。
 *
 * ⚠️ 同步點：PUBLIC_PROFILE_FIELDS 必須與 firestore.rules isValidProfile() 的欄位白名單一致；
 *    PLAYER_LIMITS 必須與規則中各欄位的範圍一致。
 */
import { MAX_LEVEL_SCORE, SCORED_LEVEL_IDS, clearExpGain, levelScoreForTime, totalScore } from './scoring';
import { levelForExp } from './levelSystem';

export interface LevelBest {
  /** 最佳通關時間（整數毫秒） */
  bestTimeMs: number;
  /** 最佳分數（整數，1–MAX_LEVEL_SCORE） */
  bestScore: number;
}

/** key 為關卡 id 字串（'1'–'12'） */
export type LevelBests = Record<string, LevelBest>;

export interface PlayerProgress {
  level: number;
  jiyuan: number;
  exp: number;
  stamina: number;
  /** 體力回復起點（Unix 毫秒）；缺欄時遷移為滿格＋現在 */
  staminaUpdatedAt: number;
  score: number;
  levels: LevelBests;
}

/** users/{uid} 公開文件只可包含這些欄位（亦由 firestore.rules 強制） */
export const PUBLIC_PROFILE_FIELDS = [
  'displayLabel', 'schoolDomain', 'surname', 'surnameSource',
  'level', 'jiyuan', 'exp', 'stamina', 'staminaUpdatedAt', 'score', 'levels', 'updatedAt',
] as const;

export const PLAYER_LIMITS = {
  level: { min: 1, max: 999 },
  jiyuan: { min: 0, max: 100_000_000 },
  exp: { min: 0, max: 100_000_000 },
  stamina: { min: 0, max: 100 },
} as const;

/** 體力上限 */
export const MAX_STAMINA = 100;
/** 入陣扣除 */
export const STAMINA_COST = 10;
/** 戰敗返還 */
export const STAMINA_REFUND = 5;
/** 回復一點所需毫秒（6 分鐘） */
export const STAMINA_REGEN_INTERVAL_MS = 6 * 60 * 1000;

/** 新登入用戶的初始值（規則：create 時 level 1、exp 0、jiyuan ≤ 100、score 0、levels 空） */
export const NEW_PLAYER_PROGRESS: Readonly<PlayerProgress> = Object.freeze({
  level: 1,
  jiyuan: 1,
  exp: 0,
  stamina: MAX_STAMINA,
  staminaUpdatedAt: 0, // 建立時由 Firestore serverTimestamp() 覆寫
  score: 0,
  levels: {},
});

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (!isFiniteNumber(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

/** 結構檢查：只含 bestTimeMs／bestScore 兩個整數欄位，分數在範圍內 */
export function isLevelBest(v: unknown): v is LevelBest {
  if (!isPlainObject(v)) return false;
  const keys = Object.keys(v);
  return (
    keys.length === 2 &&
    Number.isInteger(v.bestTimeMs) && (v.bestTimeMs as number) > 0 &&
    Number.isInteger(v.bestScore) &&
    (v.bestScore as number) >= 1 && (v.bestScore as number) <= MAX_LEVEL_SCORE
  );
}

/** 只保留已知關卡及結構正確的紀錄（其他一律捨棄） */
export function normalizeLevels(raw: unknown): LevelBests {
  const out: LevelBests = {};
  if (!isPlainObject(raw)) return out;
  for (const id of SCORED_LEVEL_IDS) {
    const entry = raw[id];
    if (isLevelBest(entry)) out[id] = { bestTimeMs: entry.bestTimeMs, bestScore: entry.bestScore };
  }
  return out;
}

/** 各關最佳分數之和 */
export function sumLevelScores(levels: LevelBests): number {
  return Object.values(levels).reduce((sum, e) => sum + e.bestScore, 0);
}

/** 總分 ＝ 各關最佳分數之和 ＋ floor(exp × 0.3) */
export function scoreFor(levels: LevelBests, exp: number): number {
  return totalScore(Object.values(levels).map((e) => e.bestScore), exp);
}

export interface ClearInput {
  levelId: number | string;
  /** 通關時間（整數毫秒） */
  timeMs: number;
  /** 本場答對題數（經驗已改為只按通關入帳；保留供紀錄） */
  correctAnswers: number;
}

export type ClearOutcome =
  | {
      recorded: true;
      levelId: string;
      /** 是否刷新該關最佳紀錄（分數高於原有最佳） */
      improved: boolean;
      /** 該關現時的最佳紀錄 */
      entry: LevelBest;
      previous: LevelBest | null;
      /** 本次通關的分數（未必是最佳） */
      clearScore: number;
      expGained: number;
      progress: Pick<PlayerProgress, 'level' | 'exp' | 'score' | 'levels'>;
    }
  | { recorded: false; reason: 'invalid-time'; levelId: string };

/**
 * 套用一次勝利（不改動傳入物件）：
 * - 時間無效（低於下限等）→ 不記錄任何東西（包括經驗）。
 * - 經驗：+100（通關）；等級＝max(原等級, 由累計經驗推算的等級)。
 * - 最佳紀錄：只在新分數「高於」原有最佳分數時更新（同分不更新，保留原時間；與規則一致）。
 * - 總分＝各關最佳之和＋floor(exp × 0.3)。
 */
export function applyClear(current: Pick<PlayerProgress, 'level' | 'exp' | 'levels'>, input: ClearInput): ClearOutcome {
  const id = String(input.levelId);
  const clearScore = levelScoreForTime(id, input.timeMs);
  if (clearScore === null) return { recorded: false, reason: 'invalid-time', levelId: id };
  const levels = normalizeLevels(current.levels);
  const previous = levels[id] ?? null;
  const improved = !previous || clearScore > previous.bestScore;
  const nextLevels: LevelBests = improved ? { ...levels, [id]: { bestTimeMs: input.timeMs, bestScore: clearScore } } : levels;
  const expGained = clearExpGain(input.correctAnswers);
  const exp = Math.min(PLAYER_LIMITS.exp.max, clampInt(current.exp, PLAYER_LIMITS.exp.min, PLAYER_LIMITS.exp.max, 0) + expGained);
  const level = Math.max(clampInt(current.level, PLAYER_LIMITS.level.min, PLAYER_LIMITS.level.max, 1), levelForExp(exp));
  return {
    recorded: true,
    levelId: id,
    improved,
    entry: nextLevels[id],
    previous,
    clearScore,
    expGained,
    progress: { level, exp, levels: nextLevels, score: scoreFor(nextLevels, exp) },
  };
}

function sameLevels(a: unknown, b: LevelBests): boolean {
  if (!isPlainObject(a)) return false;
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length || ak.some((k, i) => k !== bk[i])) return false;
  return bk.every((k) => {
    const e = a[k];
    return isPlainObject(e) && Object.keys(e).length === 2 && e.bestTimeMs === b[k].bestTimeMs && e.bestScore === b[k].bestScore;
  });
}

function toMillis(v: unknown, fallback: number): number {
  if (isFiniteNumber(v)) return Math.floor(v);
  if (v && typeof v === 'object') {
    const o = v as { toMillis?: () => number; seconds?: number };
    if (typeof o.toMillis === 'function') {
      const ms = o.toMillis();
      if (Number.isFinite(ms)) return Math.floor(ms);
    }
    if (isFiniteNumber(o.seconds)) return Math.floor(o.seconds * 1000);
  }
  return fallback;
}

/**
 * 由任何版本的文件取得遊戲欄位（冪等）。
 * - 舊文件（有 gold、沒有 jiyuan）：jiyuan = gold；levels {}；score ＝ floor(exp × 0.3)
 * - 缺 staminaUpdatedAt：遷移為滿格 100，起點＝現在（needsRewrite）
 * - 已遷移文件：原樣保留（數值只作範圍夾取）
 */
export function migrateGameFields(raw: Record<string, unknown> | null | undefined, nowMs: number = Date.now()): { progress: PlayerProgress; needsRewrite: boolean } {
  const d = raw ?? {};
  const L = PLAYER_LIMITS;
  const levels = normalizeLevels(d.levels);
  const legacyJiyuan = isFiniteNumber(d.jiyuan) ? d.jiyuan : d.gold;
  const hasAnchor = 'staminaUpdatedAt' in d && d.staminaUpdatedAt != null;
  const stamina = hasAnchor
    ? clampInt(d.stamina, L.stamina.min, L.stamina.max, MAX_STAMINA)
    : MAX_STAMINA;
  const staminaUpdatedAt = hasAnchor ? toMillis(d.staminaUpdatedAt, nowMs) : nowMs;
  const progress: PlayerProgress = {
    level: clampInt(d.level, L.level.min, L.level.max, 1),
    jiyuan: clampInt(legacyJiyuan, L.jiyuan.min, L.jiyuan.max, 0),
    exp: clampInt(d.exp, L.exp.min, L.exp.max, 0),
    stamina,
    staminaUpdatedAt,
    score: 0,
    levels,
  };
  progress.score = scoreFor(levels, progress.exp);
  const needsRewrite =
    'gold' in d ||
    !hasAnchor ||
    d.level !== progress.level ||
    d.jiyuan !== progress.jiyuan ||
    d.exp !== progress.exp ||
    d.stamina !== progress.stamina ||
    toMillis(d.staminaUpdatedAt, -1) !== progress.staminaUpdatedAt ||
    d.score !== progress.score ||
    !sameLevels(d.levels, levels);
  return { progress, needsRewrite };
}
