/**
 * 戰鬥計時器：單調累加器，凍結期間不計時。
 *
 * - 時間來源預設為 performance.now()（單調時鐘，不受系統時間調整影響）；測試可注入假時鐘。
 * - 只在 running 狀態累加；frozen（遊戲真正停頓）期間不累加。
 * - 時鐘倒退（理論上不會發生）時該段以 0 計，累計值永不減少。
 * - stop() 之後時間固定；重複呼叫 stop() 回傳同一數值（冪等）。
 *
 * 「凍結」的定義由呼叫者決定；App.tsx 使用「已暫停 且 正在作答回合」（與回合倒數計時器相同的條件），
 * 因為暫停期間演出動畫（setTimeout）仍會繼續，只有作答回合才真正停住。詳見 README「計時語義」。
 */

export type BattleClockState = 'idle' | 'running' | 'frozen' | 'stopped';

export type MonotonicNow = () => number;

const defaultNow: MonotonicNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

export class BattleClock {
  private readonly now: MonotonicNow;
  private stateValue: BattleClockState = 'idle';
  private accumulatedMs = 0;
  private segmentStart = 0;

  constructor(now: MonotonicNow = defaultNow) {
    this.now = now;
  }

  get state(): BattleClockState {
    return this.stateValue;
  }

  /** 重新開始計時（清除之前的累計） */
  start(frozen = false): void {
    this.accumulatedMs = 0;
    this.segmentStart = this.now();
    this.stateValue = frozen ? 'frozen' : 'running';
  }

  /** 進入／離開凍結；idle 或 stopped 時不起作用 */
  setFrozen(frozen: boolean): void {
    if (this.stateValue === 'running' && frozen) {
      this.closeSegment();
      this.stateValue = 'frozen';
    } else if (this.stateValue === 'frozen' && !frozen) {
      this.segmentStart = this.now();
      this.stateValue = 'running';
    }
  }

  /** 停止並回傳通關時間（毫秒）；未開始時回傳 null */
  stop(): number | null {
    if (this.stateValue === 'idle') return null;
    if (this.stateValue === 'running') this.closeSegment();
    this.stateValue = 'stopped';
    return this.accumulatedMs;
  }

  /** 回到 idle（放棄本場計時，例如退出戰鬥或戰敗） */
  reset(): void {
    this.accumulatedMs = 0;
    this.segmentStart = 0;
    this.stateValue = 'idle';
  }

  /** 目前累計時間（毫秒）；不改變狀態 */
  elapsedMs(): number {
    if (this.stateValue === 'running') return this.accumulatedMs + Math.max(0, this.now() - this.segmentStart);
    return this.accumulatedMs;
  }

  private closeSegment(): void {
    const t = this.now();
    this.accumulatedMs += Math.max(0, t - this.segmentStart);
    this.segmentStart = t;
  }
}
