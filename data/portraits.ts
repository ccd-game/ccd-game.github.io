import type React from 'react';

/**
 * 圖鑑立繪定位（以臉部為錨點）
 *
 * 每張立繪 PNG 記錄：原圖尺寸，以及臉部中心 X、眼線 Y、臉高（髮際至下巴），單位為「原圖像素」。
 * 所有角色共用同一組目標值（取自用戶標註：外頁卡高相對 eyeY≈0.2198、faceH≈0.1949），
 * 以框架的百分比表示，因此不同手機寬度下比例一致。
 *
 * 新增角色立繪時，只需在 PORTRAIT_ANCHORS 加入一筆資料。
 */
export interface PortraitAnchor {
  w: number;      // 原圖寬
  h: number;      // 原圖高
  faceX: number;  // 臉部中心 X
  eyeY: number;   // 眼線 Y
  faceH: number;  // 臉高（髮際→頦；禁冠／帽上髮）
  /** 臉框（選填，用於小圓頭像）：額頂（髮際線）、下巴（不含鬍鬚）、臉部水平中心；單位為原圖像素 */
  face?: { top: number; chin: number; cx: number };
}

export const PORTRAIT_ANCHORS: Record<string, PortraitAnchor> = {
  // faceH 68＝face.chin−face.top（舊 52 低估致外頁爆大）；cx 對齊鼻樑；髮際→頦不含冠
  liu_zong_yuan: { w: 1280, h: 720,  faceX: 820,  eyeY: 125, faceH: 68,  face: { top: 108, chin: 176, cx: 820 } },
  // 孔子三層立繪 v3（kong_zi_character.webp 1280×720）：額頂 256、眼線 271、下巴（不含鬍）291，臉心 x≈508；faceH 35＝髮際→頦不含髻
  kong_zi:       { w: 1280, h: 720,  faceX: 508,  eyeY: 271, faceH: 35,  face: { top: 256, chin: 291, cx: 508 } },
  // 廉藺 solo（1280×720）；錨＝solo-face-center NOTES；faceH＝肉色髮際→頦不含冠
  // r3：eyeY＝183（源瞳標線≈180，+3 對孔青線肉眼殘差；禁 190）；faceH 50；faceX 495
  lin_xiang_ru:  { w: 1280, h: 720,  faceX: 495,  eyeY: 183, faceH: 50,  face: { top: 155, chin: 205, cx: 495 } },
  // r3：eyeY＝181（源瞳≈178，+3；低於 r2=182）；faceH 50；faceX 800
  lian_po:       { w: 1280, h: 720,  faceX: 800,  eyeY: 181, faceH: 50,  face: { top: 158, chin: 208, cx: 800 } },
};

export type PortraitPage = 'outer' | 'inner';

/**
 * 統一目標（所有角色相同，無個別調整）：
 * faceH = 臉高 / 框架高；eyeY = 眼線 / 框架高；faceX = 臉部中心偏離中線 / 框架寬（正值向右）。
 * outer：外頁卡片內框（165×253 @ 390px 寬）——用戶標註硬鎖 faceH≈0.1949、eyeY≈0.2198、faceX mid＝0。
 * inner：內頁立繪區（寬 100% × 高 310px）——同視覺規則數字；有 HERO_SCENES 者實際由場景 figScale／figOy 換算。
 */
export const PORTRAIT_TARGET: Record<PortraitPage, { faceH: number; eyeY: number; faceX: number }> = {
  outer: { faceH: 0.1949, eyeY: 0.2198, faceX: 0 },
  inner: { faceH: 0.1949, eyeY: 0.2198, faceX: 0 },
};

/**
 * 個別角色例外（僅在統一目標無法容納必要元素時使用）。
 * 外頁：孔 outer 0.126／0.2252／0；柳／蔺／廉 outer 同柳已准 0.126／0.2252／-0.043。
 * 柳宗元內頁：圖鑑立繪須包含飛劍，統一目標下劍會被裁掉，故縮小並右移（後備；現以 LAYERED_PORTRAITS／HERO 為主）。
 */
export const PORTRAIT_TARGET_OVERRIDE: Record<string, Partial<Record<PortraitPage, { faceH: number; eyeY: number; faceX: number }>>> = {
  liu_zong_yuan: {
    // 外頁：同孔尺準 faceH／eyeY；faceX=-0.043（r2 再左≈3px／165；禁改孔／蔺／廉／ANCHOR）
    outer: { faceH: 0.126, eyeY: 0.2252, faceX: -0.043 },
    // 內頁已改用 LAYERED_PORTRAITS 分層立繪；此值僅在未登錄分層資料時作後備
    inner: { faceH: 0.0609, eyeY: 0.2198, faceX: 0.12 },
  },
  // 孔子外頁：鎖 guides-review／v1.3.15 紅格（faceH 0.126／eyeY 0.2252／faceX mid＝0）；禁 0.1949 整卡放大
  kong_zi: {
    outer: { faceH: 0.126, eyeY: 0.2252, faceX: 0 },
  },
  // 外頁蔺／廉：孔尺 faceH/eyeY；r5 再調 faceX（眼／faceH 鎖 r3／r4）
  lin_xiang_ru: {
    outer: { faceH: 0.126, eyeY: 0.2252, faceX: 0.05 },  // r5：+0.01→+0.05 再右移
  },
  lian_po: {
    outer: { faceH: 0.126, eyeY: 0.2252, faceX: -0.12 }, // r5：−0.08→−0.12 再左移
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

/** 由圖片路徑取得立繪鍵值，例如 .../avatar/kong_zi/kong_zi_character.webp → kong_zi */
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
