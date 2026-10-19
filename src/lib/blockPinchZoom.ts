/**
 * 攔截 iOS Safari 捏合／雙擊放大，以及多指 touchmove。
 * 與 viewport `user-scalable=no`、CSS `touch-action: manipulation` 併用；
 * 不 stopPropagation，單指 pan-y 捲動與按鈕 click 不受影響。
 */

const DOUBLE_TAP_MS = 300;

type Cleanup = () => void;

let uninstallFn: Cleanup | null = null;

function onGesture(e: Event): void {
  e.preventDefault();
}

function onMultiTouchMove(e: TouchEvent): void {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}

/**
 * 短間隔第二次 touchend → 擋瀏覽器雙擊縮放預設行為。
 * 僅 preventDefault，不 stopPropagation；不主動取消 click／按鈕。
 * 測點：兩次觸控結束間隔 ≤ DOUBLE_TAP_MS 時會 preventDefault。
 */
function createDoubleTapGuard(): (e: TouchEvent) => void {
  let lastTouchEnd = 0;
  return (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd > 0 && now - lastTouchEnd <= DOUBLE_TAP_MS) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };
}

function targets(): EventTarget[] {
  const list: EventTarget[] = [document];
  const root = document.getElementById('root');
  if (root) list.push(root);
  return list;
}

/** 掛上攔截；重複呼叫會先卸載再掛。回傳 uninstall。 */
export function installBlockPinchZoom(): Cleanup {
  if (uninstallFn) {
    uninstallFn();
    uninstallFn = null;
  }

  const opts: AddEventListenerOptions = { passive: false };
  const onDoubleTapEnd = createDoubleTapGuard();
  const attached = targets();

  for (const t of attached) {
    t.addEventListener('gesturestart', onGesture, opts);
    t.addEventListener('gesturechange', onGesture, opts);
    t.addEventListener('gestureend', onGesture, opts);
    t.addEventListener('touchmove', onMultiTouchMove as EventListener, opts);
    t.addEventListener('touchend', onDoubleTapEnd as EventListener, opts);
  }

  const uninstall: Cleanup = () => {
    for (const t of attached) {
      t.removeEventListener('gesturestart', onGesture, opts);
      t.removeEventListener('gesturechange', onGesture, opts);
      t.removeEventListener('gestureend', onGesture, opts);
      t.removeEventListener('touchmove', onMultiTouchMove as EventListener, opts);
      t.removeEventListener('touchend', onDoubleTapEnd as EventListener, opts);
    }
    if (uninstallFn === uninstall) uninstallFn = null;
  };

  uninstallFn = uninstall;
  return uninstall;
}

export function uninstallBlockPinchZoom(): void {
  if (uninstallFn) {
    uninstallFn();
    uninstallFn = null;
  }
}

/** 供單元測／文件：雙擊間隔閾值（ms） */
export const BLOCK_PINCH_DOUBLE_TAP_MS = DOUBLE_TAP_MS;
