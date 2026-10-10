import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GUEST_SESSION_KEY,
  GUEST_SESSION_VALUE,
  GUEST_DEFAULT_USER_DATA,
  isGuestSessionStored,
  persistGuestSession,
  clearGuestSessionStorage,
  resetGuestUserData,
  getGuestUserData,
  setGuestGold,
  subscribeGuestUserData,
  patchGuestUserData,
} from './guestSession';

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

describe('guestSession', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { sessionStorage: storage });
    vi.stubGlobal('sessionStorage', storage);
    clearGuestSessionStorage();
    resetGuestUserData();
  });

  it('defaults match teacher-test defaults (isGuest identity fields)', () => {
    expect(GUEST_DEFAULT_USER_DATA.name).toBe('文言修煉者');
    expect(GUEST_DEFAULT_USER_DATA.displayLabel).toBe('遊客');
    expect(GUEST_DEFAULT_USER_DATA.level).toBe(1);
    expect(GUEST_DEFAULT_USER_DATA.gold).toBe(100);
  });

  it('persist / clear sessionStorage flag for refresh restore', () => {
    expect(isGuestSessionStored()).toBe(false);
    persistGuestSession();
    expect(sessionStorage.getItem(GUEST_SESSION_KEY)).toBe(GUEST_SESSION_VALUE);
    expect(isGuestSessionStored()).toBe(true);
    clearGuestSessionStorage();
    expect(isGuestSessionStored()).toBe(false);
  });

  it('setGuestGold mutates local state only (no throw)', () => {
    resetGuestUserData();
    const next = setGuestGold(42);
    expect(next.gold).toBe(42);
    expect(getGuestUserData().gold).toBe(42);
    expect(setGuestGold(-5).gold).toBe(0);
  });

  it('subscribeGuestUserData notifies on patch', () => {
    const seen: number[] = [];
    const unsub = subscribeGuestUserData((d) => seen.push(d.gold));
    patchGuestUserData({ gold: 77 });
    unsub();
    patchGuestUserData({ gold: 99 });
    expect(seen[0]).toBe(100); // initial emit
    expect(seen).toContain(77);
    expect(seen).not.toContain(99);
  });
});
