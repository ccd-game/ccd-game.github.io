/** align-chrome-greenbar-r1：抽屜頂＝戰鬥血條綠線頂 Y=495（css px＠390×844） */
export const CHROME_GREEN_TOP_Y = 495;
/** ≡ --hud-vnext-zone-h／HOME_TOP_BAR_H（無 sat） */
export const CHROME_ZONE_H = 121.8;

/**
 * peek 高（px）：使 dungeon 內抽屜頂緣落在視口 Y=495。
 * peekH = h − (GREEN − zone)；minRows／舊 bar+14+(H−bar−56)/3 由綠線鎖取代。
 */
export const drawerPeekH = (h: number, _bar?: number, _minRows?: number) => {
  return h - (CHROME_GREEN_TOP_Y - CHROME_ZONE_H);
};

/** 拖曳 y→進度（歷史／unit）；卷軸改走獨立 --scroll-p。0＝peek；1＝open。 */
export const progressFromY = (y: number, peekY: number) => {
  if (peekY <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - y / peekY));
};
