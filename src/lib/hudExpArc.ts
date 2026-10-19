/**
 * hud-vnext EXP 弧槽角規（西→東填滿）
 *
 * Pillow：0°＝正東、順時針（與 art-hud-exp-pie-west-east-r5 NOTES 一致）。
 * CSS conic：0°＝正北、順時針 → cssDeg = pillowDeg + 90。
 *
 * 掃向西→東：end 固定西 tip＝186°；start = (186 - p·192) mod 360。
 *   p=0 → 空；p=0.5 → 90→186（半）；p=1 → 354→186 wrap（滿）。
 *
 * 藝術畫布 791×654 弧心 (396.54, 298.08)；orb 顯示為裁窗
 * frame.crop(52,3,742,637)→690×634 → 弧心 (344.54, 295.08)。
 */

export const EXP_ARC_SPAN_DEG = 192;
/** Pillow：西 tip（固定 end） */
export const EXP_ARC_END_PILLOW_DEG = 186;
/** 弧心在 690×634 orb 圖上的位置（百分比，供 conic at） */
export const EXP_ARC_CENTER_X_PCT = (396.54 - 52) / 690 * 100;
export const EXP_ARC_CENTER_Y_PCT = (298.08 - 3) / 634 * 100;

export function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(1, p));
}

/** Pillow start 角；end 恆為 EXP_ARC_END_PILLOW_DEG */
export function expArcPillowStartDeg(p: number): number {
  const t = clamp01(p);
  const raw = EXP_ARC_END_PILLOW_DEG - t * EXP_ARC_SPAN_DEG;
  return ((raw % 360) + 360) % 360;
}

export function expArcPillowEndDeg(_p?: number): number {
  return EXP_ARC_END_PILLOW_DEG;
}

export function expArcSweepDeg(p: number): number {
  return clamp01(p) * EXP_ARC_SPAN_DEG;
}

/** Pillow → CSS conic 角（可 >360，瀏覽器可接受） */
export function pillowToCssConicDeg(pillowDeg: number): number {
  return pillowDeg + 90;
}

/**
 * 給 CSS `conic-gradient(from Xdeg at cx cy, #fff 0deg, #fff Sdeg, transparent Sdeg)` 用。
 * 不透明扇形＝已填弧（西 tip 往東增長）。
 */
export function expArcConicMask(p: number): {
  fromDeg: number;
  sweepDeg: number;
  centerXPct: number;
  centerYPct: number;
} {
  const t = clamp01(p);
  const pillowStart = expArcPillowStartDeg(t);
  return {
    fromDeg: pillowToCssConicDeg(pillowStart),
    sweepDeg: expArcSweepDeg(t),
    centerXPct: EXP_ARC_CENTER_X_PCT,
    centerYPct: EXP_ARC_CENTER_Y_PCT,
  };
}

/** 組出 mask-image 字串（含 -webkit 同源值） */
export function expArcConicMaskImage(p: number): string {
  const { fromDeg, sweepDeg, centerXPct, centerYPct } = expArcConicMask(p);
  return `conic-gradient(from ${fromDeg}deg at ${centerXPct}% ${centerYPct}%, #fff 0deg, #fff ${sweepDeg}deg, transparent ${sweepDeg}deg)`;
}
