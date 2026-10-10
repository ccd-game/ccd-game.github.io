import { useEffect, type RefObject } from 'react';

/** 一層視差：ref 指向的元素會以 translate3d(x·nx, y·ny, 0) 位移（nx、ny ∈ [-1, 1]） */
export interface GyroLayer {
  ref: RefObject<HTMLElement | null>;
  x: number; // 水平最大位移（px）；負數＝反向（背景）
  y: number; // 垂直最大位移（px）
}

/** 調校參數 */
const MAX_TILT_DEG = 18;      // 偏離中立角多少度即達到最大位移（之後夾住）
const SMOOTH_TAU = 0.12;      // 位移追隨的時間常數（秒）；rAF 內以 lerp 平滑
const RECENTER_TAU = 4;       // 中立角緩慢回歸的時間常數（秒）：長時間換了握持角度，畫面會自動回中
const EPS = 0.0005;           // 收斂門檻；收斂後停止 rAF

type IOSOrientationEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);
/** 角度差收到 (-180, 180]，避免 beta 跨越 ±180 時跳動 */
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

function screenAngle(): number {
  const so = typeof screen !== 'undefined' ? screen.orientation : undefined;
  if (so && typeof so.angle === 'number') return so.angle;
  const wo = (window as unknown as { orientation?: number }).orientation; // 舊 iOS Safari
  return typeof wo === 'number' ? (wo + 360) % 360 : 0;
}

/** 把裝置座標的 beta/gamma 轉成「螢幕座標」的 x（右正）／y（下正）傾角 */
export function toScreenTilt(beta: number, gamma: number, angle: number): [number, number] {
  switch (((angle % 360) + 360) % 360) {
    case 90: return [beta, -gamma];
    case 180: return [-gamma, -beta];
    case 270: return [-beta, gamma];
    default: return [gamma, beta];
  }
}

/**
 * 手機陀螺儀視差。只寫入 style.transform（translate3d），迴圈內不讀版面、不更新 React 狀態。
 * - 第一筆讀數＝中立角（開始、轉向、回到前景時重新校準），之後中立角緩慢追隨握持角度。
 * - iOS 13+：在使用者首次點擊（touchend／click）時於手勢內呼叫 requestPermission()，不另彈提示；拒絕即靜默停用。
 * - prefers-reduced-motion：完全不啟用，並即時回應設定變更；頁面隱藏時暫停。
 */
export function useGyroParallax(rootRef: RefObject<HTMLElement | null>, layers: GyroLayer[]) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const DOE = window.DeviceOrientationEvent as IOSOrientationEvent;
    const needsPermission = typeof DOE.requestPermission === 'function';
    // 先直接監聽：Android／桌面毋須授權即有讀數；iOS 未授權時只是收不到事件。
    // 若瀏覽器提供 requestPermission（iOS 13+；新版 Chrome 亦有，會直接回 granted），
    // 則在首次點擊且仍未收到讀數時，於手勢內請求一次。
    let permitted = true;
    let gotReading = false;
    let asked = false;
    let listening = false;
    let raf = 0;
    let neutral: [number, number] | null = null; // 螢幕座標的中立傾角
    let lastEvtT = 0;
    let lastFrameT = 0;
    let tx = 0, ty = 0;   // 目標（-1..1）
    let cx = 0, cy = 0;   // 目前（平滑後）

    const setState = (s: string) => { root.dataset.gyro = s; };

    const write = () => {
      for (const l of layers) {
        const el = l.ref.current;
        if (el) el.style.transform = `translate3d(${(cx * l.x).toFixed(2)}px, ${(cy * l.y).toFixed(2)}px, 0)`;
      }
    };
    const reset = () => {
      cx = cy = tx = ty = 0;
      for (const l of layers) { const el = l.ref.current; if (el) el.style.transform = ''; }
    };

    const frame = (t: number) => {
      const dt = lastFrameT ? Math.min(0.1, (t - lastFrameT) / 1000) : 1 / 60;
      lastFrameT = t;
      const k = 1 - Math.exp(-dt / SMOOTH_TAU);
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      if (Math.abs(tx - cx) < EPS && Math.abs(ty - cy) < EPS) {
        cx = tx; cy = ty; write(); raf = 0; lastFrameT = 0; return; // 收斂：停止迴圈，等下一筆讀數
      }
      write();
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return; // 桌面瀏覽器或無感應器
      const [sx, sy] = toScreenTilt(e.beta, e.gamma, screenAngle());
      const now = performance.now();
      gotReading = true;
      if (!neutral) { neutral = [sx, sy]; lastEvtT = now; setState('active'); }
      const dt = Math.min(0.5, (now - lastEvtT) / 1000);
      lastEvtT = now;
      // 中立角緩慢回歸（漂移校正）
      const r = 1 - Math.exp(-dt / RECENTER_TAU);
      neutral[0] += wrap(sx - neutral[0]) * r;
      neutral[1] += wrap(sy - neutral[1]) * r;
      tx = clamp(wrap(sx - neutral[0]) / MAX_TILT_DEG);
      ty = clamp(wrap(sy - neutral[1]) / MAX_TILT_DEG);
      kick();
    };

    const recalibrate = () => { neutral = null; tx = ty = 0; kick(); };

    const start = () => {
      if (listening || !permitted || mq.matches || document.hidden) return;
      listening = true;
      neutral = null;
      setState('waiting');
      window.addEventListener('deviceorientation', onOrient);
    };
    const stop = (state: string) => {
      if (listening) window.removeEventListener('deviceorientation', onOrient);
      listening = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0; lastFrameT = 0; neutral = null;
      reset();
      setState(state);
    };

    const onMotionPref = () => { if (permitted) { if (mq.matches) stop('reduced'); else start(); } };
    const onVisibility = () => { if (permitted) { if (document.hidden) stop('paused'); else start(); } };
    const onOrientationChange = () => recalibrate();

    // iOS：首次點擊時在手勢內請求授權；不阻止、不延遲原本的點擊動作
    const onFirstTap = () => {
      if (asked) return;
      asked = true;
      root.removeEventListener('touchend', onFirstTap);
      root.removeEventListener('click', onFirstTap);
      if (gotReading) return;                                  // 已有讀數（Android 或先前已授權），毋須請求
      if (mq.matches) { asked = false; attachTap(); return; } // 減少動態時不請求；待設定改變後再說
      // 必須在手勢的同步呼叫堆疊內呼叫；不 await、不 preventDefault，原點擊動作照常進行
      DOE.requestPermission!()
        .then(s => { if (s === 'granted') start(); else { permitted = false; stop('denied'); } })
        .catch(() => { permitted = false; stop('denied'); });
    };
    const attachTap = () => {
      root.addEventListener('touchend', onFirstTap, { passive: true });
      root.addEventListener('click', onFirstTap, { passive: true });
    };

    if (needsPermission) attachTap();
    if (mq.matches) setState('reduced');
    else start();

    mq.addEventListener('change', onMotionPref);
    document.addEventListener('visibilitychange', onVisibility);
    screen.orientation?.addEventListener?.('change', onOrientationChange);
    window.addEventListener('orientationchange', onOrientationChange);

    return () => {
      stop('off');
      root.removeEventListener('touchend', onFirstTap);
      root.removeEventListener('click', onFirstTap);
      mq.removeEventListener('change', onMotionPref);
      document.removeEventListener('visibilitychange', onVisibility);
      screen.orientation?.removeEventListener?.('change', onOrientationChange);
      window.removeEventListener('orientationchange', onOrientationChange);
    };
  }, [rootRef, layers]); // 兩者皆應為穩定參照（useRef／useMemo）
}
