/**
 * Guest (遊客) session for teacher testing — no Firebase Auth, no Firestore writes.
 *
 * Persistence: sessionStorage key `ccd.guest.v1` so a mid-test refresh restores guest
 * mode (tab close clears it). Never writes users/{uid} or a fake Google identity.
 */

export const GUEST_SESSION_KEY = 'ccd.guest.v1';
export const GUEST_SESSION_VALUE = '1';

/** Minimal player blob used by HUD / gacha while guest (mirrors UserData fields). */
export interface GuestUserData {
  level: number;
  gold: number;
  exp: number;
  stamina: number;
  displayLabel?: string;
  name?: string;
  surname?: string;
  surnameSource?: string | null;
  updatedAt: null;
}

/** Local-only defaults so HUD / gacha UI work without cloud profile. */
export const GUEST_DEFAULT_USER_DATA: GuestUserData = {
  level: 1,
  gold: 100,
  exp: 0,
  stamina: 100,
  displayLabel: '遊客',
  /** Header name; the 「遊客」 status tag sits beside it, so don't repeat it here. */
  name: '文言修煉者',
  surname: '',
  surnameSource: null,
  updatedAt: null,
};

function canUseSessionStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch {
    return false;
  }
}

export function isGuestSessionStored(): boolean {
  if (!canUseSessionStorage()) return false;
  try {
    return window.sessionStorage.getItem(GUEST_SESSION_KEY) === GUEST_SESSION_VALUE;
  } catch {
    return false;
  }
}

export function persistGuestSession(): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(GUEST_SESSION_KEY, GUEST_SESSION_VALUE);
  } catch {
    /* private mode / quota — in-memory guest still works for this tab */
  }
}

export function clearGuestSessionStorage(): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

let guestData: GuestUserData = { ...GUEST_DEFAULT_USER_DATA };
const guestListeners = new Set<(d: GuestUserData) => void>();

export function resetGuestUserData(): void {
  guestData = { ...GUEST_DEFAULT_USER_DATA };
  guestListeners.forEach((fn) => fn(guestData));
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

export function patchGuestUserData(patch: Partial<GuestUserData>): GuestUserData {
  guestData = { ...guestData, ...patch };
  guestListeners.forEach((fn) => fn(guestData));
  return guestData;
}

/** Deduct / set gold locally (gacha). Never touches Firestore. */
export function setGuestGold(newGold: number): GuestUserData {
  return patchGuestUserData({ gold: Math.max(0, Math.floor(newGold)) });
}
