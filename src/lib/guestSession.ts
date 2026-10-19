/**
 * Guest (遊客) session for teacher testing — no Firebase Auth, no Firestore writes.
 *
 * sessionStorage（關閉分頁即清除）：
 * - `ccd.guest.v1`      = '1'：遊客身分旗標，重新整理後恢復遊客模式（沿用 v1.2.5）。
 * - `ccd.guest.data.v2` = JSON：遊客的本機遊戲資料（與登入用戶相同的新欄位：
 *                         level／jiyuan／exp／stamina／staminaUpdatedAt／score／levels）。
 * 舊格式（含 gold、或缺 staminaUpdatedAt）會自動遷移為滿格體力並改寫為新格式。
 * Never writes users/{uid} or a fake Google identity.
 */
import {
  ClearInput,
  ClearOutcome,
  MAX_STAMINA,
  PlayerProgress,
  applyClear,
  clampInt,
  migrateGameFields,
  PLAYER_LIMITS,
} from './playerData';
import { StaminaState, planDeduct, planRefund, staminaAt } from './stamina';

export const GUEST_SESSION_KEY = 'ccd.guest.v1';
export const GUEST_SESSION_VALUE = '1';
export const GUEST_DATA_KEY = 'ccd.guest.data.v2';

/** Guest player blob used by HUD / gacha / menu (mirrors UserData fields). */
export interface GuestUserData extends PlayerProgress {
  displayLabel?: string;
  name?: string;
  surname?: string;
  surnameSource?: string | null;
  /** 校名列（可覆寫）；預設示意字串 */
  schoolName?: string;
  schoolDomain?: string | null;
  updatedAt: null;
  /** 本場入陣後可戰敗返還一次（只存記憶體，不寫 sessionStorage） */
  staminaRefundable?: boolean;
}

/** Local-only defaults so HUD / gacha UI work without cloud profile. */
export const GUEST_DEFAULT_USER_DATA: Readonly<GuestUserData> = Object.freeze({
  level: 1,
  jiyuan: 100,
  exp: 0,
  stamina: MAX_STAMINA,
  staminaUpdatedAt: 0,
  score: 0,
  levels: {},
  displayLabel: '遊客',
  /** Header name; the 「遊客」 status tag sits beside it, so don't repeat it here. */
  name: '歐陽同學',
  surname: '',
  surnameSource: null,
  schoolName: '救世軍卜維廉中學',
  schoolDomain: 'wbss.edu.hk',
  updatedAt: null,
  staminaRefundable: false,
});

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    storage()?.setItem(key, value);
  } catch {
    /* private mode / quota — in-memory guest still works for this tab */
  }
}

function remove(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw || raw === GUEST_SESSION_VALUE) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function isGuestSessionStored(): boolean {
  const flag = read(GUEST_SESSION_KEY);
  // 舊版若把資料 JSON 存在旗標 key，亦視為遊客工作階段（之後會被遷移）
  return flag === GUEST_SESSION_VALUE || parseObject(flag) !== null;
}

export function persistGuestSession(): void {
  write(GUEST_SESSION_KEY, GUEST_SESSION_VALUE);
}

/** 清除遊客旗標及本機遊戲資料 */
export function clearGuestSessionStorage(): void {
  remove(GUEST_SESSION_KEY);
  remove(GUEST_DATA_KEY);
}

function progressOf(d: GuestUserData): PlayerProgress {
  return {
    level: d.level,
    jiyuan: d.jiyuan,
    exp: d.exp,
    stamina: d.stamina,
    staminaUpdatedAt: d.staminaUpdatedAt,
    score: d.score,
    levels: d.levels,
  };
}

function persistGuestData(d: GuestUserData): void {
  write(GUEST_DATA_KEY, JSON.stringify(progressOf(d)));
}

/**
 * 由 sessionStorage 讀出遊客資料並遷移（冪等）：
 * 1. 新 key 的資料（可能仍為舊格式，含 gold）
 * 2. 舊版存在旗標 key 的 JSON 資料
 * 3. 都沒有 → 預設值
 */
export function readStoredGuestProgress(): PlayerProgress | null {
  const blob = parseObject(read(GUEST_DATA_KEY)) ?? parseObject(read(GUEST_SESSION_KEY));
  if (!blob) return null;
  const { progress } = migrateGameFields({ stamina: GUEST_DEFAULT_USER_DATA.stamina, ...blob });
  return progress;
}

let guestData: GuestUserData = { ...GUEST_DEFAULT_USER_DATA, levels: {}, staminaUpdatedAt: Date.now() };
const guestListeners = new Set<(d: GuestUserData) => void>();

function emit(): void {
  guestListeners.forEach((fn) => fn(guestData));
}

/** 新的遊客工作階段：回到預設值並寫入 sessionStorage */
export function resetGuestUserData(): void {
  guestData = { ...GUEST_DEFAULT_USER_DATA, levels: {}, staminaUpdatedAt: Date.now(), staminaRefundable: false };
  if (isGuestSessionStored()) persistGuestData(guestData);
  emit();
}

/** 重新整理後恢復：讀取並遷移本機資料（沒有則用預設值），並以新格式寫回、修正旗標 */
export function restoreGuestUserData(): GuestUserData {
  const stored = readStoredGuestProgress();
  guestData = {
    ...GUEST_DEFAULT_USER_DATA,
    ...(stored ?? {}),
    levels: { ...(stored?.levels ?? {}) },
    staminaUpdatedAt: stored?.staminaUpdatedAt ?? Date.now(),
    staminaRefundable: false,
  };
  persistGuestSession();
  persistGuestData(guestData);
  emit();
  return guestData;
}

export function getGuestUserData(): GuestUserData {
  return guestData;
}

export function subscribeGuestUserData(fn: (d: GuestUserData) => void): () => void {
  guestListeners.add(fn);
  fn(guestData);
  return () => {
    guestListeners.delete(fn);
  };
}

export function patchGuestUserData(patch: Partial<PlayerProgress> & { staminaRefundable?: boolean }): GuestUserData {
  guestData = { ...guestData, ...patch };
  persistGuestData(guestData);
  emit();
  return guestData;
}

/** 設定機緣（尋訪扣除）。只改本機，不碰 Firestore。 */
export function setGuestJiyuan(newJiyuan: number): GuestUserData {
  return patchGuestUserData({ jiyuan: clampInt(newJiyuan, PLAYER_LIMITS.jiyuan.min, PLAYER_LIMITS.jiyuan.max, 0) });
}

function staminaStateOf(d: GuestUserData): StaminaState {
  return {
    stamina: d.stamina,
    staminaUpdatedAt: d.staminaUpdatedAt || Date.now(),
    staminaRefundable: d.staminaRefundable === true,
  };
}

/** 遊客入陣扣除體力；不足時回傳 null */
export function deductGuestStamina(nowMs: number = Date.now()): GuestUserData | null {
  const plan = planDeduct(staminaStateOf(guestData), nowMs);
  if (!plan.ok) return null;
  return patchGuestUserData({
    stamina: plan.next.stamina,
    staminaUpdatedAt: plan.next.staminaUpdatedAt,
    staminaRefundable: plan.next.staminaRefundable,
  });
}

/** 遊客戰敗返還；不可返還時回傳 null */
export function refundGuestStamina(nowMs: number = Date.now()): GuestUserData | null {
  const plan = planRefund(staminaStateOf(guestData), nowMs);
  if (!plan.ok) return null;
  return patchGuestUserData({
    stamina: plan.next.stamina,
    staminaUpdatedAt: plan.next.staminaUpdatedAt,
    staminaRefundable: false,
  });
}

/** 清除可返還旗標（勝利／中途離開） */
export function clearGuestStaminaRefundable(): void {
  if (!guestData.staminaRefundable) return;
  guestData = { ...guestData, staminaRefundable: false };
  emit();
}

export function guestStaminaView(nowMs: number = Date.now()) {
  return staminaAt(staminaStateOf(guestData), nowMs);
}

/** 遊客勝利：與登入用戶相同的經驗及最佳紀錄邏輯，只存本機 sessionStorage */
export function recordGuestClear(input: ClearInput): ClearOutcome {
  const outcome = applyClear(guestData, input);
  if (outcome.recorded) patchGuestUserData(outcome.progress);
  return outcome;
}
