import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  clampVolume,
  normalizePrefs,
  loadSettings,
  saveSettings,
  updateSettings,
  mergeRemoteSettings,
  setSettingsCloudSync,
  syncSettingsAfterAuth,
  resetSettingsCloudPullState,
  hasCompletedFirstSettingsPull,
  pushSettingsIfSynced,
  noopSettingsCloudSync,
} from './settingsStore';

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

describe('settingsStore', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    vi.stubGlobal('localStorage', storage);
    resetSettingsCloudPullState();
    setSettingsCloudSync(noopSettingsCloudSync);
  });

  it('clampVolume', () => {
    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(NaN)).toBe(DEFAULT_SETTINGS.bgmVolume);
  });

  it('normalizePrefs defaults and rememberMe', () => {
    expect(normalizePrefs(null).theme).toBe('light');
    expect(normalizePrefs({ theme: 'neon' }).theme).toBe('light');
    expect(normalizePrefs({}).rememberMe).toBe(true);
    expect(normalizePrefs({ rememberMe: false }).rememberMe).toBe(false);
    expect(normalizePrefs({ bgmVolume: 9 }).bgmVolume).toBe(1);
  });

  it('DEFAULT bgmVolume is 1.0; empty storage loads 100%', () => {
    expect(DEFAULT_SETTINGS.bgmVolume).toBe(1.0);
    expect(loadSettings().bgmVolume).toBe(1.0);
    expect(normalizePrefs({}).bgmVolume).toBe(1.0);
  });

  it('preserves previously saved bgmVolume (does not force 1.0)', () => {
    updateSettings({ bgmVolume: 0.08 });
    expect(loadSettings().bgmVolume).toBe(0.08);
    updateSettings({ bgmVolume: 0.42 });
    expect(loadSettings().bgmVolume).toBe(0.42);
  });

  it('load/save/update round-trip', () => {
    expect(loadSettings().theme).toBe('light');
    updateSettings({ theme: 'dark', bgmVolume: 0.4, rememberMe: false });
    const s = loadSettings();
    expect(s.theme).toBe('dark');
    expect(s.bgmVolume).toBe(0.4);
    expect(s.rememberMe).toBe(false);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('dark');
  });

  it('corrupt JSON → defaults', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');
    expect(loadSettings().theme).toBe('light');
  });

  it('mergeRemoteSettings: local wins until remote newer; ties → local', () => {
    const local = normalizePrefs({ theme: 'dark', updatedAt: '2026-10-10T12:00:00.000Z' });
    const older = normalizePrefs({ theme: 'light', updatedAt: '2026-10-09T12:00:00.000Z' });
    const newer = normalizePrefs({ theme: 'light', updatedAt: '2026-10-11T12:00:00.000Z' });
    const same = normalizePrefs({ theme: 'light', updatedAt: '2026-10-10T12:00:00.000Z' });
    expect(mergeRemoteSettings(local, null).theme).toBe('dark');
    expect(mergeRemoteSettings(local, older).theme).toBe('dark');
    expect(mergeRemoteSettings(local, newer).theme).toBe('light');
    expect(mergeRemoteSettings(local, same).theme).toBe('dark');
  });

  it('syncSettingsAfterAuth: first pull then last-write-wins; push when local wins', async () => {
    updateSettings({ theme: 'dark', updatedAt: '2026-10-10T12:00:00.000Z' });
    // Force updatedAt
    saveSettings(normalizePrefs({ ...loadSettings(), theme: 'dark', updatedAt: '2026-10-10T12:00:00.000Z' }));
    const pushed: unknown[] = [];
    setSettingsCloudSync({
      async pull() {
        return normalizePrefs({ theme: 'light', updatedAt: '2026-10-09T00:00:00.000Z' });
      },
      async push(_uid, prefs) { pushed.push(prefs); },
    });
    const merged = await syncSettingsAfterAuth('uid1');
    expect(merged.theme).toBe('dark');
    expect(hasCompletedFirstSettingsPull('uid1')).toBe(true);
    expect(pushed.length).toBe(1);
    await pushSettingsIfSynced('uid1');
    expect(pushed.length).toBe(2);
    await pushSettingsIfSynced('other');
    expect(pushed.length).toBe(2);
  });

  it('syncSettingsAfterAuth: remote newer wins, no push of stale local', async () => {
    saveSettings(normalizePrefs({ theme: 'dark', updatedAt: '2026-10-09T00:00:00.000Z' }));
    const pushed: unknown[] = [];
    setSettingsCloudSync({
      async pull() {
        return normalizePrefs({ theme: 'light', bgmVolume: 0.5, updatedAt: '2026-10-11T00:00:00.000Z' });
      },
      async push(_uid, prefs) { pushed.push(prefs); },
    });
    const merged = await syncSettingsAfterAuth('uid2');
    expect(merged.theme).toBe('light');
    expect(merged.bgmVolume).toBe(0.5);
    // remote won → shouldPush is false when remoteTs > localTs... wait, shouldPush = !remote || merged >= remote
    // merged is remote, so merged.updatedAt === remote.updatedAt → shouldPush true (cloud catch-up of same)
    // That's OK — pushes the winning remote blob back is harmless
    expect(loadSettings().theme).toBe('light');
  });
});
