/**
 * 答題格（出題盤）設定
 */

/** 每題答題格數 */
export const BOARD_SIZE = 20;

/**
 * 舊版 INCLUDE_VARIANT_TRAPS 已刪除。
 * CCD 文案的 buildBoard / BuildBoardOptions 不再支援 includeVariantTraps
 * （傳入會令 TypeScript 報「物件常值不可含未知屬性」）；異體／通假／互用字
 * 一律不作陷阱，產生器內亦會排除同一異體字組的兩個干擾字同時出現。
 * 請勿恢復此旗標。
 */
