/**
 * 入陣轉場（主頁 → 戰鬥，無縫）
 * - 主頁與戰鬥共用同一個場景：戰鬥背景＝主頁預覽背景（同圖、同縮放、同位置），人物也在同一位置，交接時畫面不變。
 * - 按下入陣：跳出小視窗選「深入不毛／驀然回首」（同時開始讀題庫、預載並解碼戰鬥所需圖片與程式碼）；
 * - 深入不毛：凍結主頁陀螺儀視差（保留當下位移），量測主頁場景，戰鬥頁在主頁底下掛好（同一場景），
 *   並把主頁的動畫進度（呼吸、飛劍路徑／浮動）原樣接到戰鬥頁（syncHeroAnimations），
 *   之後頂欄上滑出畫面、抽屜與底部導覽下滑出畫面（translateY，ease-in），篇名列與入陣鈕隨抽屜淡出下移；
 *   滑出完成即撤下主頁（下面已是相同畫面），再依原順序播戰鬥開場（金線 → 名字 → HP 條 → 題目／鍵盤）。
 * - 減少動態：不滑動，主頁整層淡出（下面即戰鬥畫面，不會閃白）。
 */
import type { LevelConfig } from '../../types';

/** 頂欄／抽屜／導覽滑出畫面的時長 */
export const ENTER_EXIT_MS = 460;
/** 減少動態：主頁整層淡出時長 */
export const ENTER_REDUCED_FADE_MS = 300;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}

/** 主頁預覽場景的螢幕幾何（相對 App 根容器）：bg＝背景圖層（含 bgZoom），scene＝人物所在的場景層 */
export interface HomeSceneBox {
  levelId: number;
  /** 量測時的 App 根容器尺寸（尺寸改變就不再沿用） */
  W: number; H: number;
  bg: { left: number; top: number; scale: number };
  scene: { left: number; top: number; scale: number };
  /** 主頁人物呼吸的縮放原點（App 根容器座標）；戰鬥沿用同一呼吸動畫與原點，交接後持續同相位 */
  breatheOrigin: [number, number] | null;
}

/** 入陣期間凍結主頁陀螺儀視差（保留當下位移，不再更新）：<html data-enter-freeze> */
export const ENTER_FREEZE_ATTR = 'data-enter-freeze';
export function setEnterFreeze(on: boolean) {
  if (typeof document === 'undefined') return;
  if (on) document.documentElement.setAttribute(ENTER_FREEZE_ATTR, '1');
  else document.documentElement.removeAttribute(ENTER_FREEZE_ATTR);
}

/** 主頁 → 戰鬥：同一套關鍵影格的對應（戰鬥呼吸在無縫入陣時直接改用 homeSceneBreathe） */
const ANIM_MAP: Record<string, string> = {
  homeSceneBreathe: 'homeSceneBreathe',
  homeSaberPath: 'btlSaberPath', homeSaberFront: 'btlSaberFront', homeSaberBack: 'btlSaberBack', homeSaberIdle: 'btlSaberIdle',
  homeSaberFloat: 'btlSaberFloat',
};
type NamedAnim = Animation & { animationName?: string };
const delayOf = (a: Animation) => Number((a.effect?.getTiming().delay) ?? 0);
const durOf = (a: Animation) => Number((a.effect?.getTiming().duration) ?? 0) || 1;

/**
 * 把主頁英雄區的 CSS 動畫進度原樣套到戰鬥畫面上對應的動畫（同一關鍵影格）：
 * 以「(currentTime − delay) / duration」的相位對齊，之後兩邊在同一條 document timeline 上同速前進，不會跳格。
 * 回傳對齊了幾個動畫。
 */
export function syncHeroAnimations(hero: Element | null, battle: Element | null): number {
  if (!hero || !battle || typeof hero.getAnimations !== 'function') return 0;
  const src = new Map<string, NamedAnim>();
  for (const a of hero.getAnimations({ subtree: true }) as NamedAnim[]) {
    const to = a.animationName && ANIM_MAP[a.animationName];
    if (to && !src.has(to)) src.set(to, a);
  }
  let n = 0;
  for (const b of battle.getAnimations({ subtree: true }) as NamedAnim[]) {
    const h = b.animationName ? src.get(b.animationName) : undefined;
    if (!h || h.currentTime == null) continue;
    const phase = (Number(h.currentTime) - delayOf(h)) / durOf(h);
    b.currentTime = phase * durOf(b) + delayOf(b);
    n++;
  }
  return n;
}

/** 量測主頁英雄區的場景（背景主圖塊與人物場景層）；沒有落地場景的關卡回傳 null */
export function measureHomeScene(root: HTMLElement | null, levelId: number, sceneW: number): HomeSceneBox | null {
  if (!root) return null;
  const hero = root.querySelector<HTMLElement>('.home-hero');
  if (!hero) return null;
  const bgTile = [...hero.querySelectorAll<HTMLImageElement>('img.home-scene-bg')].find(i => !i.style.transform);
  const figEl = hero.querySelector<HTMLElement>('.home-scene-fig');
  const figScene = figEl?.closest<HTMLElement>('.home-scene');
  if (!bgTile || !figScene) return null;
  const r = root.getBoundingClientRect(), b = bgTile.getBoundingClientRect(), s = figScene.getBoundingClientRect();
  if (!b.width || !s.width) return null;
  // 呼吸層（inset 0 於 .home-scene-fig 內）：transform-origin（區域 px）經 fig 的縮放／平移換到螢幕
  let breatheOrigin: [number, number] | null = null;
  const br = figEl?.querySelector<HTMLElement>('.home-scene-breathe');
  if (figEl && br && figEl.offsetWidth && figEl.offsetHeight) {
    const [ox, oy] = getComputedStyle(br).transformOrigin.split(' ').map(parseFloat);
    const f = figEl.getBoundingClientRect();
    breatheOrigin = [f.left - r.left + (ox / figEl.offsetWidth) * f.width, f.top - r.top + (oy / figEl.offsetHeight) * f.height];
  }
  return {
    breatheOrigin,
    levelId, W: r.width, H: r.height,
    bg: { left: b.left - r.left, top: b.top - r.top, scale: b.width / sceneW },
    scene: { left: s.left - r.left, top: s.top - r.top, scale: s.width / sceneW },
  };
}

const IMG_RE = /\.(png|webp|jpe?g|gif|avif)(\?.*)?$/i;

/** 收集關卡設定中所有圖片（背景、Boss 立繪、戰鬥圖、飛劍／效果層等），再加上戰鬥共用效果圖 */
export function collectBattleImages(level: LevelConfig): string[] {
  const out = new Set<string>();
  const walk = (v: unknown, depth: number) => {
    if (depth > 4 || v == null) return;
    if (typeof v === 'string') { if (IMG_RE.test(v)) out.add(v); return; }
    if (Array.isArray(v)) { v.forEach(x => walk(x, depth + 1)); return; }
    if (typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(x => walk(x, depth + 1));
  };
  walk(level, 0);
  const base = import.meta.env.BASE_URL;
  out.add(`${base}resources/effect/ink_splash.png`);
  if ([...out].some(u => u.includes('/li_bai/'))) out.add(`${base}resources/avatar/li_bai/li_bai_shadow.png`);
  return [...out];
}

const decoded = new Map<string, Promise<void>>();
/** 保留已解碼的 Image，避免被回收後重新解碼 */
const keep: HTMLImageElement[] = [];
/** 預載＋解碼（decode 完成才算就緒）；同一張圖只處理一次；單張失敗不阻擋 */
function decodeOne(url: string): Promise<void> {
  let p = decoded.get(url);
  if (!p) {
    p = new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      keep.push(img);
      const done = () => resolve();
      if (typeof img.decode === 'function') img.decode().then(done, () => { img.onload = done; img.onerror = done; if (img.complete) done(); });
      else { img.onload = done; img.onerror = done; }
    });
    decoded.set(url, p);
  }
  return p;
}

export function preloadBattleImages(level: LevelConfig, timeoutMs = 6000): Promise<void> {
  const all = Promise.all(collectBattleImages(level).map(decodeOne)).then(() => undefined);
  return Promise.race([all, new Promise<void>(r => setTimeout(r, timeoutMs))]);
}
