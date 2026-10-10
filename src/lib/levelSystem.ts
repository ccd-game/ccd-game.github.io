
/**
 * RPG 等級經驗值系統
 * 使用指數增長曲線：前期快速提升，後期曲線加劇以減慢進度
 */

const BASE_EXP = 100;
const GROWTH_RATE = 1.25;

/**
 * 獲取升至下一級所需的總經驗值 (Max EXP)
 * @param level 當前等級
 */
export function getRequiredExpForLevel(level: number): number {
  if (level <= 0) return BASE_EXP;
  // 核心公式：基礎值 * (增長率 ^ (等級 - 1))
  return Math.floor(BASE_EXP * Math.pow(GROWTH_RATE, level - 1));
}

/**
 * 獲取 1 至 20 級的經驗值列表
 */
export function getLevelExpList(maxLevel: number = 20) {
  const list = [];
  for (let i = 1; i <= maxLevel; i++) {
    list.push({
      level: i,
      requiredExp: getRequiredExpForLevel(i)
    });
  }
  return list;
}

/** 等級上限（與 firestore.rules 及 PLAYER_LIMITS.level 一致） */
export const MAX_PLAYER_LEVEL = 999;

/**
 * 到達某等級所需的累計經驗（第 1 級為 0）。
 * 經驗 exp 為累計值（計入總分），等級由累計經驗推算，升級不會扣除經驗。
 */
export function cumulativeExpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < Math.min(level, MAX_PLAYER_LEVEL); l++) total += getRequiredExpForLevel(l);
  return total;
}

/** 由累計經驗推算等級（1–999） */
export function levelForExp(totalExp: number): number {
  let level = 1;
  let need = getRequiredExpForLevel(1);
  let remaining = Number.isFinite(totalExp) ? Math.max(0, totalExp) : 0;
  while (level < MAX_PLAYER_LEVEL && remaining >= need) {
    remaining -= need;
    level += 1;
    need = getRequiredExpForLevel(level);
  }
  return level;
}

/** 目前等級內已累積的經驗（0 至該級所需經驗），供經驗條顯示 */
export function expIntoLevel(level: number, totalExp: number): number {
  const into = (Number.isFinite(totalExp) ? totalExp : 0) - cumulativeExpForLevel(level);
  return Math.min(getRequiredExpForLevel(level), Math.max(0, into));
}
