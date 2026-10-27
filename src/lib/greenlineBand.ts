import { codexDetailBand } from '../../components/codexDetailLayout';
import { CHROME_DRAWER_RECT_TOP_Y, CHROME_GREEN_TOP_Y, CHROME_ZONE_H } from '../../components/tabs/drawerMath';

/**
 * 綠線帶一源（tip `0289228`，Browser 已對齊）。
 *
 * 同一次 display mode 內，三條**頂邊**兩兩 `|Δ|≤2px` 才算 ALIGNED。禁止拿一個裸絕對 Y
 * （≈371.7 宿主／≈400.8 N=4 宿主／≈495）當跨態神諭——Browser 與 standalone 的視口 Y
 * 不可互相比。優先同態三邊，或停在設計座標（rect／zone／sat／clip）。
 *
 * - peek：`.home-drawer` `getBoundingClientRect().top`（frost／rect；CSS `493.5px` 代幣）
 * - detail：`[data-testid=codex-info-chrome]`／`.codex-inner-desc` 頂（rect＋紙緣 1.5）
 * - battle hold：玩家**綠**血條 track **頂**（`h-[10px]`、`bottom: calc(40% + 1px)`）。
 *   不量血條底，不量 `.battle-clip`／戰鬥根頂。
 *
 * `heroPeekHeight` ≈400.8 是戰鬥**無** homeBox 的 N=4 公式宿主（`BATTLE_HOLD` scale）。
 * 它不是綠線 CSS 槽（browser host＝rect−zone≈371.7）。PR#6 把 peek 抬到 400.8 已拒。
 * Standalone letterbox（`.battle-clip { top: sat }`）另票，本模組不把它收成對齊。
 */

export const GREENLINE_ALIGN_TOL_PX = 2;

/** 玩家綠血條軌道高（App.tsx `h-[10px]`）。 */
export const PLAYER_HP_TRACK_H = 10;
/** `bottom: calc(40% + 1px)`。 */
export const PLAYER_HP_BOTTOM_RATIO = 0.4;
export const PLAYER_HP_BOTTOM_PAD = 1;

export interface DisplayModeGeom {
  /** 視口高 css px（設計畫布 844） */
  vh: number;
  sat: number;
  /** 記入模式以便文件化；戰鬥 clip `bottom: 0`，sab **不**移動血條頂。 */
  sab: number;
  standalone: boolean;
}

export interface GreenLineTriad {
  /** `.home-drawer` top */
  peekDrawerTop: number;
  /** codex info chrome／`.codex-inner-desc` top */
  detailDescTop: number;
  /** 玩家綠血條 track top */
  battleHpTop: number;
  /** 血條底，只供「量錯邊」測試；不是綠線。 */
  hpBottom: number;
  /** `.battle-clip` top。Browser 0；standalone＝sat。不是綠線。 */
  battleRootTop: number;
  /** rect − zone。設計座標宿主，不是視口 Y，也不是 N=4 的 400.8。 */
  peekHostH: number;
  zoneH: number;
}

export function greenLineTriad(mode: DisplayModeGeom): GreenLineTriad {
  const zoneH = CHROME_ZONE_H + (mode.standalone ? mode.sat : 0);
  const peekDrawerTop = CHROME_DRAWER_RECT_TOP_Y;
  // 描述頂＝設計綠線（codexTop + stageH + marginTop）。scale＝1、root 貼頂時≡視口 Y。
  const navTop = mode.vh - 76 - (mode.standalone ? mode.sab : 0);
  const band = codexDetailBand(zoneH, Math.max(zoneH, navTop));
  const detailDescTop = zoneH + band.stageH + band.marginTop;
  const battleRootTop = mode.standalone ? mode.sat : 0;
  // clip：top sat（僅 standalone）、bottom 0。高＝vh−rootTop；sab 不扣。
  const clipH = mode.vh - battleRootTop;
  const hpBottomFromClipBottom = PLAYER_HP_BOTTOM_RATIO * clipH + PLAYER_HP_BOTTOM_PAD;
  const battleHpTop = battleRootTop + (clipH - hpBottomFromClipBottom - PLAYER_HP_TRACK_H);
  return {
    peekDrawerTop,
    detailDescTop,
    battleHpTop,
    hpBottom: battleHpTop + PLAYER_HP_TRACK_H,
    battleRootTop,
    peekHostH: peekDrawerTop - zoneH,
    zoneH,
  };
}

export function pairwiseAbsDeltas(t: Pick<GreenLineTriad, 'peekDrawerTop' | 'detailDescTop' | 'battleHpTop'>) {
  return {
    'peek-detail': Math.abs(t.peekDrawerTop - t.detailDescTop),
    'peek-battle': Math.abs(t.peekDrawerTop - t.battleHpTop),
    'detail-battle': Math.abs(t.detailDescTop - t.battleHpTop),
  };
}

export function maxAbsDelta(t: Pick<GreenLineTriad, 'peekDrawerTop' | 'detailDescTop' | 'battleHpTop'>): number {
  const d = pairwiseAbsDeltas(t);
  return Math.max(d['peek-detail'], d['peek-battle'], d['detail-battle']);
}

/** 同態三邊。不接受目標絕對 Y。 */
export function greenLineAligned(
  t: Pick<GreenLineTriad, 'peekDrawerTop' | 'detailDescTop' | 'battleHpTop'>,
  tol = GREENLINE_ALIGN_TOL_PX,
): boolean {
  return maxAbsDelta(t) <= tol;
}
