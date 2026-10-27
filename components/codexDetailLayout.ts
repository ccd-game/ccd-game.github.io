import { CHROME_DRAWER_RECT_TOP_Y, CHROME_GREEN_TOP_Y } from './tabs/drawerMath';

/**
 * 圖鑑內頁帶高（onesource-peek）。
 * 舞台／描述的 CSS 高是設計 px（#root 390×844，再由 --game-scale 整頁縮放）。
 * getBoundingClientRect 是縮放後的視口 px；若直接拿去減 rect，scale≠1 時
 * 描述卡會變矮（底下露出殼層宣紙虚位）或變高（被 main 裁掉技能）。
 * scale＝1 且 #root 貼視口頂時，設計座標≡視口座標，與既有綠線鎖相同。
 */

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
  /** 英雄區高＝rect − codex 頂（設計 px）；≡ 主頁 peek 槽／heroPeekHeight＠zone */
  stageH: number;
  /** 可見紙緣比 rect 低 1.5 */
  marginTop: number;
  /** 描述霜＝nav 頂 − 綠線 */
  height: number;
  /** nav 頂 − codex 頂，供 computeHeroFit 的 D */
  D: number;
}

export function codexDetailBand(codexDesignTop: number, navDesignTop: number): CodexBand {
  const stageH = Math.max(0, CHROME_DRAWER_RECT_TOP_Y - codexDesignTop);
  const marginTop = CHROME_GREEN_TOP_Y - CHROME_DRAWER_RECT_TOP_Y;
  const greenTop = codexDesignTop + stageH + marginTop;
  const height = Math.max(0, navDesignTop - greenTop);
  return { stageH, marginTop, height, D: navDesignTop - codexDesignTop };
}
