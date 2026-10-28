/**
 * 整頁只有這一層縮放（低維護）。
 *
 * 設計畫布固定 390×844。Browser 與 Standalone 用同一條公式，對整個視覺視口：
 * 寬優先 scale＝vw/390（畫布左右貼齊，左右黑邊＝0），但前提是縮放後高度仍 ≤ vh；
 * 否則退回 min(vw/390, vh/844)。多出來的高度上下對半，純黑、等厚。
 * 不把 sat／sab 從視口扣掉，也不用 safe-area padding 把畫布擠矮或只留下方黑邊。
 * 畫布內的 zone／導覽／綠線維持 Browser 設計 px。關主不再另乘一層 SA scale。
 * scale 可以小於 1，不設下限。
 */

export const GAME_DESIGN_W = 390;
export const GAME_DESIGN_H = 844;

export interface GameContainFrame {
  /** 無下限。視口比設計畫布窄時小於 1。 */
  scale: number;
  /** 畫布左緣（視口 px）。滿寬時為 0。 */
  x: number;
  /** 畫布上緣（視口 px）。與下緣留白等厚。 */
  y: number;
  width: number;
  height: number;
}

/**
 * 把 390×844 滿寬放進整個視口，垂直置中。
 * 不接受 safe-area inset：瀏海與底條由上下黑邊蓋住，不縮短畫布。
 */
export function containGameFrame(viewportW: number, viewportH: number): GameContainFrame {
  const vw = Number.isFinite(viewportW) ? Math.max(0, viewportW) : 0;
  const vh = Number.isFinite(viewportH) ? Math.max(0, viewportH) : 0;
  if (!(vw > 0) || !(vh > 0)) {
    return { scale: 0, x: 0, y: 0, width: 0, height: 0 };
  }
  const widthFirst = vw / GAME_DESIGN_W;
  const scale = widthFirst * GAME_DESIGN_H <= vh
    ? widthFirst
    : Math.min(widthFirst, vh / GAME_DESIGN_H);
  const width = GAME_DESIGN_W * scale;
  const height = GAME_DESIGN_H * scale;
  return {
    scale,
    x: (vw - width) / 2,
    y: (vh - height) / 2,
    width,
    height,
  };
}

/** 設計座標 Y → 視口 Y。同一 frame 上的點只差 designΔ × scale。 */
export function designYToViewport(designY: number, frame: GameContainFrame): number {
  return frame.y + designY * frame.scale;
}

/**
 * 玩家血條頂（設計 px）。
 * 必須與 App.tsx 玩家 HP 條一致：`bottom: calc(40% + 1px)`、高 10px，父層為滿高 .battle-clip。
 * 390×844 → 495.4，與主頁／內頁綠線 495 同一帶（|Δ|≤2）。
 */
export function battlePlayerHpTopY(designH = GAME_DESIGN_H): number {
  return designH - (designH * 0.4 + 1) - 10;
}
