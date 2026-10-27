import { HOME_NAV_H, HOME_TOP_BAR_H } from '../../data/battleLayout';
import { DRAWER_BAR_H, heroPeekHeight } from '../home/heroScene';

/** ≡ --hud-vnext-zone-h／HOME_TOP_BAR_H（無 sat） */
export const CHROME_ZONE_H = HOME_TOP_BAR_H;

/** 390×844 設計畫布。D＝視窗 − zone − nav，與戰鬥 heroSync 同一組常數。 */
export const CHROME_REF_VIEW_H = 844;
export const CHROME_REF_D = CHROME_REF_VIEW_H - CHROME_ZONE_H - HOME_NAV_H;

/**
 * onesource 英雄區高（browser＠390×844）≡ heroPeekHeight(D) ≈ 400.8。
 * 舊綠線 rect 493.5 令 hostH＝493.5−zone≈371.7（scale≈0.733），與此差約 −29.1px。
 */
export const CHROME_PEEK_HOST_H = heroPeekHeight(CHROME_REF_D, DRAWER_BAR_H);

/** frost／alpha 頂緣至可見不透明紙 */
export const CHROME_FROST_PAPER_GAP = 1.5;

/**
 * 抽屜 rect 頂（設計 px＠390×844 browser）。
 * hostH＝rect−zone ≡ heroPeekHeight。CSS `--chrome-drawer-rect-y` 必須等於此值。
 */
export const CHROME_DRAWER_RECT_TOP_Y = CHROME_ZONE_H + CHROME_PEEK_HOST_H;

/** 可見抽屜紙緣（rect 再低一個 frost 隙） */
export const CHROME_GREEN_TOP_Y = CHROME_DRAWER_RECT_TOP_Y + CHROME_FROST_PAPER_GAP;

/**
 * peek 高（px）：英雄區＝onesource hostH，可見紙緣落在 CHROME_GREEN_TOP_Y。
 * peekH = h − hostH = h − (rect − zone)。
 */
export const drawerPeekH = (h: number, _bar?: number, _minRows?: number) => {
  return h - (CHROME_DRAWER_RECT_TOP_Y - CHROME_ZONE_H);
};

/** 拖曳 y→進度（歷史／unit）；卷軸改走獨立 --scroll-p。0＝peek；1＝open。 */
export const progressFromY = (y: number, peekY: number) => {
  if (peekY <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - y / peekY));
};
