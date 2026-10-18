/**
 * 一場戰鬥的通關紀錄流程（純邏輯，不依賴 React／Firebase）：
 *
 *   begin(levelId, eligible)  選定關卡、按「深入不毛」開始（測試模式 eligible = false）
 *   startClock()              開場演出及 Boss 開場台詞結束、第一題開始 → 開始計時
 *   sync(...)                 每次暫停／回合／自動作答狀態改變時呼叫
 *   noteCorrectAnswer()       每答對一題（計數保留；經驗改為只按通關 +100）
 *   markVictoryDecided()      最後一擊（勝負已定）→ 停止計時
 *   takeVictoryClear()        進入 VICTORY 畫面時取出一次通關紀錄（只會取出一次）
 *   abandon()                 戰敗、退出或重新開始 → 放棄本場（不記錄）
 *
 * 不記錄的情況：測試模式（WIN／LOSE 調試鍵）、本場曾開啟自動作答（AUTO）、
 * 未經最後一擊而直接進入 VICTORY（例如調試 WIN）、戰敗。
 */
import { BattleClock } from './battleClock';
import { toTimeMs } from './scoring';

export interface BattleSyncState {
  isPaused: boolean;
  isTurnActive: boolean;
  isAutoPlaying: boolean;
  /** Boss 正在說話（開場、門檻、勝利台詞）：回合倒數停止，通關計時亦停止 */
  isBossSpeaking?: boolean;
}

export interface VictoryClear {
  levelId: number;
  timeMs: number;
  correctAnswers: number;
}

interface Session {
  levelId: number;
  eligible: boolean;
  timeMs: number | null;
  correctAnswers: number;
}

export class BattleRecorder {
  readonly clock: BattleClock;
  private session: Session | null = null;
  private lastSync: BattleSyncState = { isPaused: false, isTurnActive: false, isAutoPlaying: false };

  constructor(clock: BattleClock = new BattleClock()) {
    this.clock = clock;
  }

  begin(levelId: number, eligible: boolean): void {
    this.clock.reset();
    this.session = { levelId, eligible, timeMs: null, correctAnswers: 0 };
  }

  startClock(): void {
    if (!this.session) return;
    this.clock.start(BattleRecorder.isFrozen(this.lastSync));
  }

  /**
   * 凍結條件（與 App 的回合倒數計時器相同）：
   * - 已暫停 且 正在作答回合：暫停時演出動畫仍會播完，只有作答回合真正停住，所以只扣除這段時間；
   * - Boss 正在說話：門檻台詞由劇情決定、長度固定（每句約 2.1 秒），與玩家表現無關，所以不計入通關時間。
   */
  static isFrozen(s: BattleSyncState): boolean {
    return (s.isPaused && s.isTurnActive) || s.isBossSpeaking === true;
  }

  sync(state: BattleSyncState): void {
    this.lastSync = { ...state };
    if (state.isAutoPlaying && this.session) this.session.eligible = false;
    this.clock.setFrozen(BattleRecorder.isFrozen(state));
  }

  noteCorrectAnswer(): void {
    if (this.session && this.session.timeMs === null) this.session.correctAnswers += 1;
  }

  markVictoryDecided(): void {
    if (!this.session || this.clock.state === 'idle') return;
    const ms = this.clock.stop();
    if (ms !== null && this.session.timeMs === null) this.session.timeMs = toTimeMs(ms);
  }

  takeVictoryClear(): VictoryClear | null {
    const s = this.session;
    this.session = null;
    this.clock.reset();
    if (!s || !s.eligible || s.timeMs === null || !Number.isFinite(s.timeMs)) return null;
    return { levelId: s.levelId, timeMs: s.timeMs, correctAnswers: s.correctAnswers };
  }

  abandon(): void {
    this.session = null;
    this.clock.reset();
  }
}
