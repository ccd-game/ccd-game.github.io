/**
 * Local settings persistence + authenticated cloud sync.
 *
 * Storage key: `ccd.settings.v1` (localStorage cache)
 * Cloud path: `users/{uid}/private/settings` (owner-only)
 *
 * Merge policy:
 * - Until the first successful authenticated `pull(uid)`, **local wins**
 *   (Remember-me / offline prefs keep working; cloud is not consulted).
 * - After the first authenticated pull, **last-write-wins** by `updatedAt`
 *   (ISO timestamp on the prefs blob). Equal timestamps → prefer local.
 *
 * rememberMe:
 * - Stored in local prefs (and synced when signed in).
 * - Controls Firebase Auth persistence via `applyAuthPersistence` in firebase.ts:
 *   true → browserLocalPersistence (survives browser restart);
 *   false → browserSessionPersistence (cleared when the browser session ends).
 * - Firebase Auth has no reliable “clear on single-tab close” API; session
 *   persistence is the closest supported option. Documented in README.
 */

export type ThemeMode = 'light' | 'dark';

export interface SettingsPrefs {
  theme: ThemeMode;
  bgmEnabled: boolean;
  bgmVolume: number;
  /** Keep Google session across restarts when true (default). */
  rememberMe: boolean;
  /** ISO timestamp; used for last-write-wins once cloud sync is live. */
  updatedAt: string;
}

export const SETTINGS_STORAGE_KEY = 'ccd.settings.v1';

export const DEFAULT_SETTINGS: SettingsPrefs = {
  theme: 'light',
  bgmEnabled: true,
  bgmVolume: 1.0,
  rememberMe: true,
  updatedAt: new Date(0).toISOString(),
};

const THEMES: ReadonlySet<string> = new Set(['light', 'dark']);

export function clampVolume(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_SETTINGS.bgmVolume;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function isTheme(v: unknown): v is ThemeMode {
  return typeof v === 'string' && THEMES.has(v);
}

function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

/** Validate partial/unknown input → full prefs (corrupt/missing → defaults). */
export function normalizePrefs(raw: unknown): SettingsPrefs {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const theme = isTheme(src.theme) ? src.theme : DEFAULT_SETTINGS.theme;
  const bgmEnabled = isBool(src.bgmEnabled)
    ? src.bgmEnabled
    : DEFAULT_SETTINGS.bgmEnabled;
  const bgmVolume = clampVolume(
    src.bgmVolume !== undefined ? src.bgmVolume : DEFAULT_SETTINGS.bgmVolume
  );
  const rememberMe = isBool(src.rememberMe)
    ? src.rememberMe
    : DEFAULT_SETTINGS.rememberMe;
  const updatedAt =
    typeof src.updatedAt === 'string' && src.updatedAt.length > 0
      ? src.updatedAt
      : new Date().toISOString();

  return { theme, bgmEnabled, bgmVolume, rememberMe, updatedAt };
}

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function loadSettings(): SettingsPrefs {
  if (!canUseLocalStorage()) return { ...DEFAULT_SETTINGS };

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw == null || raw === '') return { ...DEFAULT_SETTINGS };
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(prefs: SettingsPrefs): void {
  if (!canUseLocalStorage()) return;
  const next = normalizePrefs({
    ...prefs,
    updatedAt: prefs.updatedAt || new Date().toISOString(),
  });
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore; in-memory state still works.
  }
}

type Listener = (prefs: SettingsPrefs) => void;
const listeners = new Set<Listener>();

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(prefs: SettingsPrefs): void {
  listeners.forEach((fn) => {
    try {
      fn(prefs);
    } catch {
      /* listener errors must not break save */
    }
  });
}

/** Load → merge patch → save → notify. Returns the persisted prefs. */
export function updateSettings(patch: Partial<SettingsPrefs>): SettingsPrefs {
  const current = loadSettings();
  const next = normalizePrefs({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  saveSettings(next);
  notify(next);
  return next;
}

/**
 * Cloud sync interface. Wired from firebase.ts when Google auth is present.
 */
export interface SettingsCloudSync {
  pull(uid: string): Promise<SettingsPrefs | null>;
  push(uid: string, prefs: SettingsPrefs): Promise<void>;
}

/** No-op cloud sync placeholder (does not touch network or Firestore). */
export const noopSettingsCloudSync: SettingsCloudSync = {
  async pull(_uid: string): Promise<SettingsPrefs | null> {
    return null;
  },
  async push(_uid: string, _prefs: SettingsPrefs): Promise<void> {
    /* no-op */
  },
};

let cloudSyncImpl: SettingsCloudSync = noopSettingsCloudSync;
/** After first successful authenticated pull for the current uid. */
let firstPullDoneForUid: string | null = null;

export function getSettingsCloudSync(): SettingsCloudSync {
  return cloudSyncImpl;
}

/** Swap in a real implementation when Google auth is deployed. */
export function setSettingsCloudSync(impl: SettingsCloudSync): void {
  cloudSyncImpl = impl;
}

export function resetSettingsCloudPullState(): void {
  firstPullDoneForUid = null;
}

export function hasCompletedFirstSettingsPull(uid: string): boolean {
  return firstPullDoneForUid === uid;
}

/**
 * Apply remote prefs using the documented merge policy.
 * Call after first authenticated pull (or whenever a remote blob arrives).
 */
export function mergeRemoteSettings(
  local: SettingsPrefs,
  remote: SettingsPrefs | null
): SettingsPrefs {
  if (!remote) return local;
  const localTs = Date.parse(local.updatedAt) || 0;
  const remoteTs = Date.parse(remote.updatedAt) || 0;
  // last-write-wins; ties → local
  return remoteTs > localTs ? normalizePrefs(remote) : local;
}

/**
 * On authorize: pull → merge → save local → optionally push if local won or remote missing.
 * Until first successful pull for this uid, callers should treat local as source of truth
 * without calling this (this function itself performs the first pull).
 */
export async function syncSettingsAfterAuth(uid: string): Promise<SettingsPrefs> {
  const local = loadSettings();
  let remote: SettingsPrefs | null = null;
  try {
    remote = await cloudSyncImpl.pull(uid);
  } catch (e) {
    console.warn('settings cloud pull failed; keeping local', e);
    return local;
  }
  firstPullDoneForUid = uid;
  const merged = mergeRemoteSettings(local, remote);
  saveSettings(merged);
  notify(merged);
  // Push when remote missing or local won the merge (so cloud catches up)
  const shouldPush =
    !remote ||
    (Date.parse(merged.updatedAt) || 0) >= (Date.parse(remote.updatedAt) || 0);
  if (shouldPush) {
    try {
      await cloudSyncImpl.push(uid, merged);
    } catch (e) {
      console.warn('settings cloud push failed after pull', e);
    }
  }
  return merged;
}

/** After first pull for uid, push current prefs (best-effort). */
export async function pushSettingsIfSynced(uid: string | null | undefined): Promise<void> {
  if (!uid || firstPullDoneForUid !== uid) return;
  const prefs = loadSettings();
  try {
    await cloudSyncImpl.push(uid, prefs);
  } catch (e) {
    console.warn('settings cloud push failed', e);
  }
}
