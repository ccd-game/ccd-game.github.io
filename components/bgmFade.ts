/**
 * 背景音樂淡入淡出（純邏輯，不依賴 React）。
 *
 * 每條音軌有一個「淡入淡出增益」gain（0–1）；實際音量＝使用者設定的 bgmVolume × gain，
 * 所以任何時候都不會超過使用者的設定。使用者音量為 0 時一律 muted（沿用 v1.2.2 的做法），
 * 與 gain 無關。
 *
 * 以分段計時器（預設每 16 ms 一步）按經過時間（performance.now）計算進度，
 * 分頁在背景時計時器被節流也只會令步數變少，淡出仍會按時完成；不用 requestAnimationFrame，
 * 因為背景分頁的 rAF 會完全停止，淡出永遠不會完成。
 * 新的 fadeTo() 會取消進行中的淡變（由目前的 gain 起算），不會疊加。
 */
import { applyBgmVolume } from './bgmVolume';
import { GameStatus } from '../types';

/** 淡出時間（毫秒）：切換頁面、勝利、戰敗、暫停、返回主頁 */
export const BGM_FADE_OUT_MS = 800;
/** 淡入時間（毫秒）：進入新頁面的音樂、暫停後繼續 */
export const BGM_FADE_IN_MS = 700;
/** 淡變的步長（毫秒） */
export const BGM_FADE_STEP_MS = 16;

export interface FadeClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export const defaultFadeClock: FadeClock = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
};

export type FadeTarget = Pick<HTMLAudioElement, 'volume' | 'muted'>;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export class TrackFader {
  private gainValue = 1;
  private timer: unknown = null;
  private resolveCurrent: ((completed: boolean) => void) | null = null;

  constructor(
    private readonly el: FadeTarget,
    private readonly getUserVolume: () => number,
    private readonly clock: FadeClock = defaultFadeClock,
    private readonly stepMs: number = BGM_FADE_STEP_MS,
  ) {}

  get gain(): number { return this.gainValue; }
  get isFading(): boolean { return this.timer !== null; }

  /** 依目前 gain 及使用者音量重新套用（音量設定改變時呼叫） */
  apply(): void {
    const user = clamp01(this.getUserVolume());
    applyBgmVolume(user, this.el);           // muted ⇔ 使用者音量為 0
    this.el.volume = user * this.gainValue;  // 不超過使用者音量
  }

  /** 立即設定 gain（取消進行中的淡變） */
  set(gain: number): void {
    this.cancel();
    this.gainValue = clamp01(gain);
    this.apply();
  }

  /** 取消進行中的淡變（停在目前的 gain）；該次 fadeTo() 以 false 完成 */
  cancel(): void {
    if (this.timer !== null) { this.clock.clearTimeout(this.timer); this.timer = null; }
    const r = this.resolveCurrent; this.resolveCurrent = null;
    if (r) r(false);
  }

  /**
   * 由目前 gain 線性淡變至 target，歷時 durationMs × |差距|（由一半開始的淡出只需一半時間，速度一致）。
   * 回傳 Promise：完成為 true；被新的淡變或 cancel() 取消為 false。
   */
  fadeTo(target: number, durationMs: number): Promise<boolean> {
    this.cancel();
    const to = clamp01(target);
    const from = this.gainValue;
    const total = Math.max(0, durationMs) * Math.abs(to - from);
    if (total === 0) { this.gainValue = to; this.apply(); return Promise.resolve(true); }
    const start = this.clock.now();
    return new Promise<boolean>((resolve) => {
      this.resolveCurrent = resolve;
      const step = () => {
        const p = Math.min(1, (this.clock.now() - start) / total);
        this.gainValue = from + (to - from) * p;
        this.apply();
        if (p >= 1) {
          this.timer = null; this.resolveCurrent = null;
          resolve(true);
        } else {
          this.timer = this.clock.setTimeout(step, this.stepMs);
        }
      };
      this.timer = this.clock.setTimeout(step, 0);
    });
  }
}

export type BgmTrack = 'menu' | 'battle';

/**
 * 每個頁面／狀態應播放的音軌（null＝靜音）。轉場一覽：
 * - 主頁／圖鑑（MENU、CHARACTER_DETAIL）：主頁音樂
 * - 入陣準備（LOADING）：主頁音樂淡出、靜音
 * - 戰鬥（PLAYING）：戰鬥音樂淡入；暫停時淡出，繼續時淡入
 * - 勝利（VICTORY）、戰敗（GAME_OVER）：戰鬥音樂淡出
 */
export function desiredTrack(status: GameStatus, isPaused: boolean): BgmTrack | null {
  if (status === GameStatus.PLAYING) return isPaused ? null : 'battle';
  if (status === GameStatus.MENU || status === GameStatus.CHARACTER_DETAIL) return 'menu';
  return null;
}
