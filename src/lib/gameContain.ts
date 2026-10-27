/**
 * SA 整頁 contain（低維護：只有這一層縮放）。
 *
 * Browser：390×844 設計畫布 contain 進整個視口，置中。即使 env(sat/sab) 有值也不扣，
 * 維持既有 letterbox（使用者確認 Browser OK）。
 * Standalone：同一張畫布 contain 進 safe content area（視口扣掉 sat／sab／左右 inset）。
 * 畫布外的空隙是純黑 letterbox，吃掉瀏海與底條；畫布內幾何與 Browser 相同。
 * 關主／場景／chrome 沒有第二層 SA scale：computeHeroFit 只用這張設計畫布，
 * 不吃 sat、不吃 shell scale。禁止 zoneH+=sat、禁止戰鬥單獨 dy。scale 可以小於 1，不設下限。
 */

export const GAME_DESIGN_W = 390;
export const GAME_DESIGN_H = 844;

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface GameContainFrame {
  /** 無下限。safe 區比設計畫布矮或窄時小於 1。 */
  scale: number;
  /** 畫布左緣（視口 px）。Standalone 時 ≥ left inset。 */
  x: number;
  /** 畫布上緣（視口 px）。Standalone 時 ≥ top inset。 */
  y: number;
  width: number;
  height: number;
}

const ZERO_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function nonNeg(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * 把 390×844 裝進可用矩形並置中。
 * standalone 為 false 時忽略 insets（Browser 路徑）。
 */
export function containGameFrame(
  viewportW: number,
  viewportH: number,
  opts?: { standalone?: boolean; insets?: SafeInsets },
): GameContainFrame {
  const standalone = !!opts?.standalone;
  const raw = standalone ? (opts?.insets ?? ZERO_INSETS) : ZERO_INSETS;
  const insets: SafeInsets = {
    top: nonNeg(raw.top),
    right: nonNeg(raw.right),
    bottom: nonNeg(raw.bottom),
    left: nonNeg(raw.left),
  };
  const vw = Number.isFinite(viewportW) ? viewportW : 0;
  const vh = Number.isFinite(viewportH) ? viewportH : 0;
  const availW = Math.max(0, vw - insets.left - insets.right);
  const availH = Math.max(0, vh - insets.top - insets.bottom);
  const scale = availW > 0 && availH > 0
    ? Math.min(availW / GAME_DESIGN_W, availH / GAME_DESIGN_H)
    : 0;
  const width = GAME_DESIGN_W * scale;
  const height = GAME_DESIGN_H * scale;
  return {
    scale,
    x: insets.left + (availW - width) / 2,
    y: insets.top + (availH - height) / 2,
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
