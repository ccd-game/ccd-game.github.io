import { CHROME_DRAWER_RECT_TOP_Y, CHROME_GREEN_TOP_Y } from './tabs/drawerMath';

/**
 * 圖鑑內頁帶高（onesource-peek）。
 * 舞台／描述的 CSS 高是設計 px（#root 390×844，再由 --game-scale 整頁縮放）。
 * getBoundingClientRect 是縮放後的視口 px；若直接拿去減 493.5，scale≠1 時
 * 描述卡會變矮（底下露出殼層宣紙虚位）或變高（被 main 裁掉技能）。
 * scale＝1 且 #root 貼視口頂時，設計座標≡視口座標，與既有綠線鎖相同。
 *
 * #14：peek 的「可見紙緣≈495」來自 frost→不透明紙約 +1.5 的光學讀數，
 * rect 鎖仍是 493.5，抽屜紙從 RECT 起蓋住英雄槽底——沒有字面空隙。
 * detail 若把 GREEN−RECT 寫成 marginTop，舞台底與紙頂之間會露出殼山水細縫。
 * 故 marginTop＝0，紙頂＝RECT；對概念綠線 |Δ|＝1.5≤2（onesource）。
 */

/** peek 光學 +1.5（GREEN−RECT）；非 detail 可留空的 gap。 */
export const CHROME_PEEK_OPTICAL_INSET = CHROME_GREEN_TOP_Y - CHROME_DRAWER_RECT_TOP_Y;

/** onesource：detail／peek／戰鬥紙緣對綠線允許 |Δ|≤2。 */
export const CHROME_GREEN_ALIGN_MAX_DELTA = 2;

export function designScaleFromRoot(rootLayoutHeight: number, rootViewportHeight: number): number {
  if (!(rootLayoutHeight > 0) || !(rootViewportHeight > 0) || !Number.isFinite(rootViewportHeight)) return 1;
  const scale = rootViewportHeight / rootLayoutHeight;
  return scale > 0 && Number.isFinite(scale) ? scale : 1;
}

/** 視口 Y → #root 設計 Y。 */
export function viewportYToDesign(viewportY: number, rootViewportTop: number, scale: number): number {
  const s = scale > 0 && Number.isFinite(scale) ? scale : 1;
  return (viewportY - rootViewportTop) / s;
}

export interface CodexBand {
  /** 英雄區高＝493.5 − codex 頂（設計 px）；≡ 主頁 peek 槽；禁改成 495 以免 HERO fit 漂 */
  stageH: number;
  /**
   * 紙頂相對舞台底的間距。#14 起恒為 0（紙從 RECT 起密封接縫）。
   * 概念綠線仍 CHROME_GREEN_TOP_Y；|paperTop−GREEN|≤ CHROME_GREEN_ALIGN_MAX_DELTA。
   */
  marginTop: number;
  /** 描述霜＝nav 頂 − 紙頂（紙頂≡RECT） */
  height: number;
  /** nav 頂 − codex 頂，供 computeHeroFit 的 D */
  D: number;
}

export function codexDetailBand(codexDesignTop: number, navDesignTop: number): CodexBand {
  const stageH = Math.max(0, CHROME_DRAWER_RECT_TOP_Y - codexDesignTop);
  // 禁再寫 GREEN − RECT（＝CHROME_PEEK_OPTICAL_INSET）：那是 peek 光學，不是可留空的 gap（#14）。
  const marginTop = 0;
  const paperTop = codexDesignTop + stageH + marginTop;
  const height = Math.max(0, navDesignTop - paperTop);
  return { stageH, marginTop, height, D: navDesignTop - codexDesignTop };
}
