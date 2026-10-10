
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
