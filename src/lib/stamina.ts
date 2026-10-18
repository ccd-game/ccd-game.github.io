/**
 * 體力（純函式，不依賴 React／Firebase）。常數見 src/lib/playerData.ts。
 *
 * 儲存：stamina（上次寫入時的值）＋ staminaUpdatedAt（回復起點，毫秒）。不用計時器寫雲端，
 * 讀取時推算：
 *   elapsed  = max(0, now − staminaUpdatedAt)            （本機時鐘比起點早＝時鐘偏差 → 視為 0，不倒扣）
 *   regen    = floor(elapsed ÷ 6 分鐘)
 *   current  = min(100, stamina + regen)                 （已滿或以上 → 100）
 * 只有體力改變（扣除／返還）時才寫入「推算後的值＋新起點」：
 *   未滿：新起點 = staminaUpdatedAt + regen × 6 分鐘（＝ now − elapsed % 6 分鐘，保留未滿一格的進度）
 *   已滿：新起點 = now（滿格期間不累積；Firestore 以伺服器時間 serverTimestamp() 寫入）
 */
import { MAX_STAMINA, STAMINA_COST, STAMINA_REFUND, STAMINA_REGEN_INTERVAL_MS, clampInt } from './playerData';

export interface StaminaState {
  stamina: number;
  /** 回復起點（Unix 毫秒） */
  staminaUpdatedAt: number;
  staminaRefundable: boolean;
}

export interface StaminaView {
  /** 現時體力（已計回復，0–100） */
  stamina: number;
  full: boolean;
  /** 距離下一點的毫秒數（已滿 → 0） */
  nextPointInMs: number;
  /** 距離回滿的毫秒數（已滿 → 0） */
  fullInMs: number;
}

const I = STAMINA_REGEN_INTERVAL_MS;

function elapsedMs(anchorMs: number, nowMs: number): number {
  if (!Number.isFinite(anchorMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, nowMs - anchorMs);
}

/** 讀取時推算現時體力及倒數 */
export function staminaAt(s: Pick<StaminaState, 'stamina' | 'staminaUpdatedAt'>, nowMs: number): StaminaView {
  const base = clampInt(s.stamina, 0, MAX_STAMINA, MAX_STAMINA);
  const el = elapsedMs(s.staminaUpdatedAt, nowMs);
  const regen = Math.floor(el / I);
  const stamina = Math.min(MAX_STAMINA, base + regen);
  if (stamina >= MAX_STAMINA) return { stamina: MAX_STAMINA, full: true, nextPointInMs: 0, fullInMs: 0 };
  const nextPointInMs = I - (el % I);
  return { stamina, full: false, nextPointInMs, fullInMs: nextPointInMs + (MAX_STAMINA - stamina - 1) * I };
}

export interface Materialised {
  stamina: number;
  staminaUpdatedAt: number;
  /** 已達上限：新起點為「現在」（Firestore 寫入時改用 serverTimestamp()） */
  capped: boolean;
}

/** 把回復寫實（只在扣除／返還時用）：保留未滿一格的進度 */
export function materialise(s: Pick<StaminaState, 'stamina' | 'staminaUpdatedAt'>, nowMs: number): Materialised {
  const base = clampInt(s.stamina, 0, MAX_STAMINA, MAX_STAMINA);
  const el = elapsedMs(s.staminaUpdatedAt, nowMs);
  const regen = Math.floor(el / I);
  if (base + regen >= MAX_STAMINA) return { stamina: MAX_STAMINA, staminaUpdatedAt: Math.max(nowMs, s.staminaUpdatedAt), capped: true };
  return { stamina: base + regen, staminaUpdatedAt: s.staminaUpdatedAt + regen * I, capped: false };
}

export function canEnterBattle(s: Pick<StaminaState, 'stamina' | 'staminaUpdatedAt'>, nowMs: number): boolean {
  return staminaAt(s, nowMs).stamina >= STAMINA_COST;
}

export type StaminaPlan =
  | { ok: true; next: StaminaState; capped: boolean }
  | { ok: false; reason: 'insufficient' | 'not-refundable'; view: StaminaView };

/** 入陣扣除：回復寫實後扣 STAMINA_COST，並標記可返還一次 */
export function planDeduct(s: StaminaState, nowMs: number): StaminaPlan {
  const m = materialise(s, nowMs);
  if (m.stamina < STAMINA_COST) return { ok: false, reason: 'insufficient', view: staminaAt(s, nowMs) };
  // 由滿格扣除：起點＝現在（capped），下一點在 6 分鐘後
  return { ok: true, capped: m.capped, next: { stamina: m.stamina - STAMINA_COST, staminaUpdatedAt: m.staminaUpdatedAt, staminaRefundable: true } };
}

/** 戰敗返還：只在 staminaRefundable 時返還 STAMINA_REFUND（一次），上限 MAX_STAMINA */
export function planRefund(s: StaminaState, nowMs: number): StaminaPlan {
  if (!s.staminaRefundable) return { ok: false, reason: 'not-refundable', view: staminaAt(s, nowMs) };
  const m = materialise(s, nowMs);
  const stamina = Math.min(MAX_STAMINA, m.stamina + STAMINA_REFUND);
  const capped = m.capped || stamina >= MAX_STAMINA;
  return { ok: true, capped, next: { stamina, staminaUpdatedAt: capped ? Math.max(nowMs, s.staminaUpdatedAt) : m.staminaUpdatedAt, staminaRefundable: false } };
}

/** 「下一點 4:32」用的 m:ss（向上取整到秒） */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * 「約 {time} 後回滿」用的時間：向上取整到分鐘（未滿時不會顯示 0）。
 *   ≥ 1 小時 →「2 小時 15 分」（整點 →「2 小時」）；< 1 小時 →「15 分」；< 1 分鐘 →「1 分」
 */
export function formatFullIn(ms: number): string {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} 分`;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
}

/**
 * 每次入陣的防重複觸發鎖＋冪等（每個 attemptId 只扣一次、最多返還一次）。
 * - tryBegin()：已有扣除進行中 → null（連點、重新渲染）；否則鎖上並發出新的 attemptId。
 * - charged(id)／failed(id)：扣除完成／失敗後解鎖。
 * - settle(id, outcome)：只有 'defeat' 且該次已扣除、未結算時回傳 true（應返還）；勝利、中途離開 → false。
 *   每個 attemptId 只會結算一次，所以返還不會重複。
 */
export type BattleOutcome = 'victory' | 'defeat' | 'exit';
export class StaminaAttemptGuard {
  private inFlight = false;
  private seq = 0;
  private current: { id: number; charged: boolean; settled: boolean } | null = null;

  get busy(): boolean {
    return this.inFlight;
  }

  tryBegin(): number | null {
    if (this.inFlight) return null;
    // 上一場已扣除而未結算（例如重新整理前），不影響新一場：新的 attemptId
    this.inFlight = true;
    this.current = { id: ++this.seq, charged: false, settled: false };
    return this.current.id;
  }

  charged(id: number): void {
    if (this.current?.id === id) this.current.charged = true;
    this.inFlight = false;
  }

  failed(id: number): void {
    if (this.current?.id === id) this.current = null;
    this.inFlight = false;
  }

  /** 本場結算；回傳是否應返還體力 */
  settle(outcome: BattleOutcome): boolean {
    const c = this.current;
    if (!c || !c.charged || c.settled) return false;
    c.settled = true;
    return outcome === 'defeat';
  }

  get attemptId(): number | null {
    return this.current?.id ?? null;
  }
}
