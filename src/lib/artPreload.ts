/**
 * 登入頁：所有關卡背景與人物圖在背景以低優先度同時預載＋解碼。
 * 登入頁三張圖（背景、遊戲名稱、人物）由開機遮罩先載完；這裡在其後才開始，不擋登入按鈕。
 * 有同名 .webp 版本時優先用 WebP（目前關卡圖只有 PNG／JPEG，即直接用原檔）。
 */
import type { LevelConfig } from '../../types';
import { LAYERED_PORTRAITS } from '../../data/portraits';
import { HERO_SCENES } from '../../components/home/heroScene';

const IMG_RE = /\.(png|jpe?g|webp)(\?.*)?$/i;

/** 由關卡資料（含巢狀欄位）與分層立繪收集所有圖片網址（去重） */
export function collectAllArt(levels: LevelConfig[], webp: ReadonlySet<string> = new Set()): string[] {
  const out = new Set<string>();
  const walk = (v: unknown, depth: number) => {
    if (depth > 4 || v == null) return;
    if (typeof v === 'string') { if (IMG_RE.test(v)) out.add(v); return; }
    if (Array.isArray(v)) { v.forEach(x => walk(x, depth + 1)); return; }
    if (typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(x => walk(x, depth + 1));
  };
  levels.forEach(l => walk(l, 0));
  Object.values(LAYERED_PORTRAITS).forEach(p => { out.add(p.character); out.add(p.effect); });
  Object.values(HERO_SCENES).forEach(h => { out.add(h.bg); if (h.front) out.add(h.front); });
  return [...out].map(u => { const w = u.replace(IMG_RE, '.webp'); return w !== u && webp.has(w) ? w : u; });
}

const held: HTMLImageElement[] = [];
let started = false;

/** 低優先度、同時發出；只啟動一次。回傳全部完成（成功或失敗）的 Promise */
export function preloadAllArtInBackground(urls: string[]): Promise<void> {
  if (started || typeof Image === 'undefined') return Promise.resolve();
  started = true;
  return Promise.all(urls.map(src => new Promise<void>(done => {
    const img = new Image();
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
    img.decoding = 'async';
    img.src = src;
    held.push(img); // 保留參照：解碼結果留在記憶體快取
    if (typeof img.decode === 'function') img.decode().then(() => done(), () => done());
    else { img.onload = () => done(); img.onerror = () => done(); }
  }))).then(() => undefined);
}
