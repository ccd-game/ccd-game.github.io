import type React from 'react';

/**
 * 圖鑑立繪定位（以臉部為錨點）
 *
 * 每張立繪 PNG 記錄：原圖尺寸，以及臉部中心 X、眼線 Y、臉高（髮際/帽沿至下巴），單位為「原圖像素」。
 * 所有角色共用同一組目標值（取自柳宗元原本在外頁與內頁的位置與大小），
 * 以框架的百分比表示，因此不同手機寬度下比例一致。
 *
 * 新增角色立繪時，只需在 PORTRAIT_ANCHORS 加入一筆資料。
 */
export interface PortraitAnchor {
  w: number;      // 原圖寬
  h: number;      // 原圖高
  faceX: number;  // 臉部中心 X
  eyeY: number;   // 眼線 Y
  faceH: number;  // 臉高
}

export const PORTRAIT_ANCHORS: Record<string, PortraitAnchor> = {
  liu_zong_yuan: { w: 2760, h: 1504, faceX: 1735, eyeY: 245, faceH: 140 },
  zhu_ge_liang:  { w: 768,  h: 1344, faceX: 392,  eyeY: 144, faceH: 97 },
  kong_zi:       { w: 1408, h: 768,  faceX: 610,  eyeY: 177, faceH: 45 },
  li_bai:        { w: 1645, h: 1503, faceX: 1040, eyeY: 205, faceH: 125 },
};

export type PortraitPage = 'outer' | 'inner';

/**
 * 統一目標（所有角色相同，無個別調整）：
 * faceH = 臉高 / 框架高；eyeY = 眼線 / 框架高；faceX = 臉部中心偏離中線 / 框架寬（正值向右）。
 * outer：外頁卡片內框（162×250 @ 390px 寬）；inner：內頁立繪區（寬 100% × 高 310px）。
 */
export const PORTRAIT_TARGET: Record<PortraitPage, { faceH: number; eyeY: number; faceX: number }> = {
  outer: { faceH: 0.126, eyeY: 0.2252, faceX: 0.0741 },
  inner: { faceH: 0.1116, eyeY: 0.2174, faceX: 0.0456 },
};

/** 由圖片路徑取得立繪鍵值，例如 .../avatar/zhu_ge_liang/zhu_ge_liang.png → zhu_ge_liang */
export const portraitKey = (src: string): string => src.split('/').slice(-2, -1)[0] || '';

/**
 * 回傳讓臉部錨點落在統一目標位置的 CSS（絕對定位，需放在 position:relative/absolute 的框架內）。
 * 高度以框架高的百分比計算；left/top 定位錨點，translate 以圖片自身百分比把錨點對齊。
 */
export function portraitStyle(src: string, page: PortraitPage): React.CSSProperties {
  const a = PORTRAIT_ANCHORS[portraitKey(src)];
  if (!a) {
    // 未登錄錨點的圖片：置中、底部對齊
    return { position: 'absolute', height: '90%', width: 'auto', maxWidth: 'none', left: '50%', bottom: 0, transform: 'translateX(-50%)' };
  }
  const t = PORTRAIT_TARGET[page];
  const heightPct = (t.faceH * a.h / a.faceH) * 100;
  return {
    position: 'absolute',
    height: `${heightPct}%`,
    width: 'auto',
    maxWidth: 'none',
    maxHeight: 'none',
    left: `${(0.5 + t.faceX) * 100}%`,
    top: `${t.eyeY * 100}%`,
    transform: `translate(${(-a.faceX / a.w) * 100}%, ${(-a.eyeY / a.h) * 100}%)`,
  };
}
