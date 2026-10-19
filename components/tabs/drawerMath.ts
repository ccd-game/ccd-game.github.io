/** 概念綠線（戰鬥血條頂）Y=495 css＠390×844；可見抽屜紙緣對齊此值 */
export const CHROME_GREEN_TOP_Y = 495;
/**
 * rect 鎖：frost／alpha 頂緣至可見不透明紙約 +1.5px，
 * peek 以 493.5 鎖 getBoundingClientRect → 像素紙緣≈495。
 * 中途誤測≈450＝英雄區宣紙左右亮帶，非抽屜紙緣。
 */
export const CHROME_DRAWER_RECT_TOP_Y = 493.5;
/** ≡ --hud-vnext-zone-h／HOME_TOP_BAR_H（無 sat） */
export const CHROME_ZONE_H = 121.8;

/**
 * peek 高（px）：使可見抽屜紙緣落在視口 Y=495（rect 頂＝493.5）。
 * peekH = h − (RECT − zone)。
 */
export const drawerPeekH = (h: number, _bar?: number, _minRows?: number) => {
  return h - (CHROME_DRAWER_RECT_TOP_Y - CHROME_ZONE_H);
};

/** 拖曳 y→進度（歷史／unit）；卷軸改走獨立 --scroll-p。0＝peek；1＝open。 */
export const progressFromY = (y: number, peekY: number) => {
  if (peekY <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - y / peekY));
};
