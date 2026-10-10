import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GUEST_SESSION_KEY,
  GUEST_SESSION_VALUE,
  GUEST_DATA_KEY,
  GUEST_DEFAULT_USER_DATA,
  isGuestSessionStored,
  persistGuestSession,
  clearGuestSessionStorage,
  resetGuestUserData,
  restoreGuestUserData,
  readStoredGuestProgress,
  getGuestUserData,
  setGuestJiyuan,
  subscribeGuestUserData,
  patchGuestUserData,
  recordGuestClear,
} from './guestSession';

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

let storage: MemoryStorage;

describe('guestSession', () => {
  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', { sessionStorage: storage });
    vi.stubGlobal('sessionStorage', storage);
    clearGuestSessionStorage();
    resetGuestUserData();
  });

  it('defaults match teacher-test defaults (isGuest identity fields) with new fields', () => {
    expect(GUEST_DEFAULT_USER_DATA.name).toBe('文言修煉者');
    expect(GUEST_DEFAULT_USER_DATA.displayLabel).toBe('遊客');
    expect(GUEST_DEFAULT_USER_DATA.level).toBe(1);
    expect(GUEST_DEFAULT_USER_DATA.jiyuan).toBe(100);
    expect(GUEST_DEFAULT_USER_DATA.score).toBe(0);
    expect(GUEST_DEFAULT_USER_DATA.levels).toEqual({});
    expect(GUEST_DEFAULT_USER_DATA).not.toHaveProperty('gold');
  });

  it('persist / clear sessionStorage flag for refresh restore', () => {
    expect(isGuestSessionStored()).toBe(false);
    persistGuestSession();
    expect(sessionStorage.getItem(GUEST_SESSION_KEY)).toBe(GUEST_SESSION_VALUE);
    expect(isGuestSessionStored()).toBe(true);
    clearGuestSessionStorage();
    expect(isGuestSessionStored()).toBe(false);
  });

  it('setGuestJiyuan mutates local state only (no throw); clamps', () => {
    const next = setGuestJiyuan(42);
    expect(next.jiyuan).toBe(42);
    expect(getGuestUserData().jiyuan).toBe(42);
    expect(setGuestJiyuan(-5).jiyuan).toBe(0);
  });

  it('subscribeGuestUserData notifies on patch', () => {
    const seen: number[] = [];
    const unsub = subscribeGuestUserData((d) => seen.push(d.jiyuan));
    patchGuestUserData({ jiyuan: 77 });
    unsub();
    patchGuestUserData({ jiyuan: 99 });
    expect(seen[0]).toBe(100); // initial emit
    expect(seen).toContain(77);
    expect(seen).not.toContain(99);
  });

  it('遊客資料以新欄位存入 sessionStorage，重新整理後恢復', () => {
    persistGuestSession();
    resetGuestUserData();
    setGuestJiyuan(60);
    const r = recordGuestClear({ levelId: 1, timeMs: 90000, correctAnswers: 20 });
    expect(r.recorded).toBe(true);
    const stored = JSON.parse(storage.getItem(GUEST_DATA_KEY)!);
    expect(stored).toEqual({ level: 2, jiyuan: 60, exp: 150, stamina: 100, score: 861, levels: { '1': { bestTimeMs: 90000, bestScore: 816 } } });
    // 模擬重新整理：記憶體回到預設，再由 sessionStorage 恢復
    resetGuestUserData.call(null);
    storage.setItem(GUEST_DATA_KEY, JSON.stringify(stored));
    const restored = restoreGuestUserData();
    expect(restored.score).toBe(861);
    expect(restored.jiyuan).toBe(60);
    expect(restored.name).toBe('文言修煉者');
  });

  it('遊客通關：較慢不刷新紀錄；低於下限不記錄', () => {
    persistGuestSession();
    recordGuestClear({ levelId: 1, timeMs: 90000, correctAnswers: 20 });
    recordGuestClear({ levelId: 1, timeMs: 300000, correctAnswers: 20 });
    expect(getGuestUserData().levels['1']).toEqual({ bestTimeMs: 90000, bestScore: 816 });
    expect(getGuestUserData().exp).toBe(300);
    expect(recordGuestClear({ levelId: 1, timeMs: 1000, correctAnswers: 20 }).recorded).toBe(false);
    expect(getGuestUserData().exp).toBe(300);
  });

  it('遷移：新 key 中的舊格式（含 gold）→ jiyuan = gold，並以新格式寫回', () => {
    persistGuestSession();
    storage.setItem(GUEST_DATA_KEY, JSON.stringify({ level: 1, gold: 33, exp: 0, stamina: 80 }));
    const d = restoreGuestUserData();
    expect(d.jiyuan).toBe(33);
    expect(d.stamina).toBe(80);
    expect(d.score).toBe(0);
    expect(d.levels).toEqual({});
    const stored = JSON.parse(storage.getItem(GUEST_DATA_KEY)!);
    expect(stored).not.toHaveProperty('gold');
    expect(stored.jiyuan).toBe(33);
  });

  it('遷移：舊版把資料 JSON 存在旗標 key（ccd.guest.v1）→ 視為遊客、遷移資料並把旗標改回 "1"', () => {
    storage.setItem(GUEST_SESSION_KEY, JSON.stringify({ level: 2, gold: 55, exp: 10, stamina: 100 }));
    expect(isGuestSessionStored()).toBe(true);
    const d = restoreGuestUserData();
    expect(d.jiyuan).toBe(55);
    expect(d.level).toBe(2);
    expect(d.score).toBe(3);
    expect(storage.getItem(GUEST_SESSION_KEY)).toBe(GUEST_SESSION_VALUE);
    expect(JSON.parse(storage.getItem(GUEST_DATA_KEY)!).jiyuan).toBe(55);
  });

  it('遷移冪等：已是新格式的資料再恢復一次不變', () => {
    persistGuestSession();
    storage.setItem(GUEST_DATA_KEY, JSON.stringify({ level: 1, jiyuan: 20, exp: 0, stamina: 100, score: 0, levels: {} }));
    const once = { ...restoreGuestUserData() };
    const twice = restoreGuestUserData();
    expect(twice).toEqual(once);
    expect(readStoredGuestProgress()).toEqual({ level: 1, jiyuan: 20, exp: 0, stamina: 100, score: 0, levels: {} });
  });

  it('沒有資料或資料損壞 → 預設值', () => {
    persistGuestSession();
    expect(readStoredGuestProgress()).toBeNull();
    storage.setItem(GUEST_DATA_KEY, '{not json');
    expect(restoreGuestUserData().jiyuan).toBe(100);
  });

  it('離開遊客模式會清除旗標及資料', () => {
    persistGuestSession();
    setGuestJiyuan(5);
    clearGuestSessionStorage();
    expect(storage.getItem(GUEST_SESSION_KEY)).toBeNull();
    expect(storage.getItem(GUEST_DATA_KEY)).toBeNull();
  });
});
