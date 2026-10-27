/**
 * 主頁底欄殼高（.home-chrome-shell--bottom／五鍵層，＠390）。
 * 殼 bottom:0、定高 76；nav 盒另加 sab 只墊 home indicator，不把殼往上抬。
 */
export const MENU_NAV_CHROME_PX = 76;

/** Browser 路徑原式。sab＝0 時用值＝76px，與改前同一條 inline。 */
export const MENU_MAIN_PAD_WITH_SAB = 'calc(76px + env(safe-area-inset-bottom, 0px))';

export interface MenuChromeInsets {
  /** html.is-standalone，或 display-mode standalone／fullscreen（與 index.tsx 同源） */
  standalone: boolean;
  /** --sab，即 env(safe-area-inset-bottom) 的用值（px） */
  sab: number;
}

/**
 * `<main>` 的 padding-bottom。
 *
 * 殼始終貼齊畫面底、高 76。nav 盒高是 76+sab，故 sab 落在殼上方的透明區。
 * `<main>` 若再墊 76+sab，列表／外頁格就停在殼頂之上 sab，露出宣紙空帶。
 * standalone 且 sab>0：內容只停在殼頂（76）。sab 留在殼所佔的底段，不計進這條縫。
 * Browser 維持 76+env(sab)（即使 sab>0 也不改）。圖鑑內頁同樣維持，描述霜仍對 nav 盒頂（#4）。
 */
export function menuMainPaddingBottom(opts: {
  summoning: boolean;
  viewingDetail: boolean;
  standalone: boolean;
  sab: number;
}): string {
  if (opts.summoning) return '0';
  const sab = Number.isFinite(opts.sab) ? Math.max(0, opts.sab) : 0;
  if (opts.standalone && sab > 0 && !opts.viewingDetail) return `${MENU_NAV_CHROME_PX}px`;
  return MENU_MAIN_PAD_WITH_SAB;
}

/** 讀與戰鬥 inset 相同的 display-mode／--sab 來源。不改戰鬥幾何。 */
export function readMenuChromeInsets(
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): MenuChromeInsets {
  const none: MenuChromeInsets = { standalone: false, sab: 0 };
  if (!doc?.documentElement) return none;
  const byClass = doc.documentElement.classList.contains('is-standalone');
  let byMode = false;
  try {
    byMode = !!doc.defaultView?.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches;
  } catch {
    byMode = false;
  }
  return { standalone: byClass || byMode, sab: cssSabPx(doc) };
}

function cssSabPx(doc: Document): number {
  const view = doc.defaultView;
  const raw = view?.getComputedStyle(doc.documentElement).getPropertyValue('--sab').trim() ?? '';
  if (/^[\d.]+px$/.test(raw)) return Math.max(0, parseFloat(raw));
  if (!doc.body) return 0;
  const probe = doc.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding:0;border:0;';
  probe.style.paddingTop = 'var(--sab, 0px)';
  doc.body.appendChild(probe);
  const px = parseFloat(view?.getComputedStyle(probe).paddingTop ?? '');
  probe.remove();
  return Number.isFinite(px) ? Math.max(0, px) : 0;
}
