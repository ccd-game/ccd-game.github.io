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
  /** 臉框（選填，用於小圓頭像）：額頂（髮際線或帽沿下緣）、下巴（不含鬍鬚）、臉部水平中心；單位為原圖像素 */
  face?: { top: number; chin: number; cx: number };
}

export const PORTRAIT_ANCHORS: Record<string, PortraitAnchor> = {
  liu_zong_yuan: { w: 1280, h: 720,  faceX: 820,  eyeY: 125, faceH: 52,  face: { top: 108, chin: 176, cx: 836 } },
  zhu_ge_liang:  { w: 768,  h: 1344, faceX: 392,  eyeY: 144, faceH: 97,  face: { top: 130, chin: 225, cx: 392 } },
  kong_zi:       { w: 1408, h: 768,  faceX: 610,  eyeY: 177, faceH: 45,  face: { top: 154, chin: 211, cx: 612 } },
  li_bai:        { w: 1645, h: 1503, faceX: 1040, eyeY: 205, faceH: 125, face: { top: 170, chin: 292, cx: 1045 } },
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

/**
 * 個別角色例外（僅在統一目標無法容納必要元素時使用）。
 * 柳宗元：圖鑑立繪須包含飛劍（劍與火焰在臉部左方約 11 個臉高處），
 * 統一目標下劍會被裁掉，故內頁縮小並右移，使整把劍與主要火焰留在框內；眼線高度不變。
 * 外頁卡片使用統一標準特寫（劍可被裁切）。
 */
export const PORTRAIT_TARGET_OVERRIDE: Record<string, Partial<Record<PortraitPage, { faceH: number; eyeY: number; faceX: number }>>> = {
  liu_zong_yuan: {
    // 內頁已改用 LAYERED_PORTRAITS 分層立繪；此值僅在未登錄分層資料時作後備
    inner: { faceH: 0.0609, eyeY: 0.2174, faceX: 0.12 },
  },
};

/**
 * 分層立繪（圖鑑內頁）：背景、人物、特效三層同尺寸（w×h），放在同一容器內逐像素對齊。
 * faceX：臉部中心 X；tipX：特效（劍尖）最左端 X；pivot：飛劍旋轉中心（劍柄中心）；seat：呼吸縮放原點（臀／膝）；bladeMid：飛劍靜候微動的旋轉軸（劍身中點）。
 * 背景使用該角色的 bgImg（需與原合成圖同一張、同尺寸）。
 */
export interface LayeredPortrait { w: number; h: number; character: string; effect: string; faceX: number; tipX: number; pivot: string; seat: string; bladeMid: string }
const AV = `${import.meta.env.BASE_URL}resources/avatar`;
export const LAYERED_PORTRAITS: Record<string, LayeredPortrait> = {
  liu_zong_yuan: {
    w: 1280, h: 720,
    character: `${AV}/liu_zong_yuan/liu_zong_yuan_character.png`,
    effect: `${AV}/liu_zong_yuan/liu_zong_yuan_effect.png`,
    faceX: 820,
    tipX: 229,                       // 劍尖（火焰尾端在 x≈76，可被裁）
    pivot: '47.88% 29.81%',          // 612.9, 214.6
    seat: '64.8% 79.9%',             // 約 829, 575（坐處／雙膝；靴底在 y≈633）
    bladeMid: '32.89% 25.74%',       // 劍身中點（劍尖 229,156 與劍柄 612.9,214.6 之中點 ≈ 421, 185）：飛劍靜候微動的旋轉軸
  },
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
  const t = PORTRAIT_TARGET_OVERRIDE[portraitKey(src)]?.[page] ?? PORTRAIT_TARGET[page];
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
