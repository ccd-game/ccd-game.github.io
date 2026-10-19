/**
 * 鎖定「遊戲內音量」契約：滑桿只寫本 App HTML Audio／gain，
 * 不綁、不覆寫裝置硬體／系統音量；prefs 經 settingsStore 持久化。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBgmVolume } from './bgmVolume';
import {
  SETTINGS_STORAGE_KEY,
  loadSettings,
  updateSettings,
  resetSettingsCloudPullState,
  setSettingsCloudSync,
  noopSettingsCloudSync,
} from '../src/lib/settingsStore';

const VOLUME_PIPELINE_FILES = [
  'tabs/SettingsTab.tsx',
  '../App.tsx',
  'AudioManager.tsx',
  'bgmVolume.ts',
  'bgmFade.ts',
  '../src/lib/settingsStore.ts',
] as const;

/** 禁止出現在音量管線的系統／硬體音量 API 字樣 */
const FORBIDDEN_SYSTEM_VOLUME_APIS = [
  'navigator.mediaSession',
  'mediaSession.setActionHandler',
  'chrome.audio',
  'setSinkId',
  // 不監聽 volumechange 去把系統／裝置音量同步回 prefs 或覆寫系統
  "addEventListener('volumechange'",
  'addEventListener("volumechange"',
] as const;

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

describe('遊戲內音量獨立於系統／硬體音量', () => {
  it('音量管線源碼不含系統音量／mediaSession 等 API', () => {
    for (const rel of VOLUME_PIPELINE_FILES) {
      const src = readFileSync(resolve(__dirname, rel), 'utf8');
      for (const api of FORBIDDEN_SYSTEM_VOLUME_APIS) {
        expect(src.includes(api), `${rel} 不應含 ${api}`).toBe(false);
      }
    }
  });

  it('applyBgmVolume 只寫 HTMLAudioElement.volume／muted（不寫其他欄位）', () => {
    const el = { volume: 1, muted: false, other: 'untouched' } as HTMLAudioElement & {
      other: string;
    };
    const keysBefore = Object.keys(el).sort();
    applyBgmVolume(0.37, el);
    expect(el.volume).toBeCloseTo(0.37, 9);
    expect(el.muted).toBe(false);
    expect(el.other).toBe('untouched');
    applyBgmVolume(0, el);
    expect(el.volume).toBe(0);
    expect(el.muted).toBe(true);
    expect(Object.keys(el).sort()).toEqual(keysBefore);
  });

  it('SettingsTab 滑桿經 onVolumeChange；App 同步 applyVolumeToTracks（HTML Audio 路徑）', () => {
    const settings = readFileSync(resolve(__dirname, 'tabs/SettingsTab.tsx'), 'utf8');
    const rangeBlock = settings.slice(
      settings.indexOf('type="range"'),
      settings.indexOf('type="range"') + 900,
    );
    expect(rangeBlock).toMatch(/onInput=\{[^}]*onVolumeChange/);
    expect(rangeBlock).toMatch(/onChange=\{[^}]*onVolumeChange/);

    const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
    expect(app).toMatch(/applyVolumeToTracks\(val\)/);
    const fn = app.slice(
      app.indexOf('const handleVolumeChange'),
      app.indexOf('const handleVolumeChange') + 600,
    );
    expect(fn).toMatch(/updateSettings\(\{\s*bgmVolume:/);
    expect(fn.indexOf('applyVolumeToTracks(val)')).toBeLessThan(fn.indexOf('updateSettings'));
  });

  it('AudioManager 經 TrackFader／applyBgmVolume 寫 el.volume，非系統 API', () => {
    const am = readFileSync(resolve(__dirname, 'AudioManager.tsx'), 'utf8');
    expect(am).toMatch(/export function applyVolumeToTracks/);
    expect(am).toMatch(/applyUserVolumeWithSnap/);
    expect(am).toMatch(/new Audio\(/);
    const fade = readFileSync(resolve(__dirname, 'bgmFade.ts'), 'utf8');
    expect(fade).toMatch(/this\.el\.volume\s*=/);
    expect(fade).toMatch(/applyBgmVolume\(/);
  });
});

describe('遊戲音量持久化 round-trip（localStorage settingsStore）', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    vi.stubGlobal('localStorage', storage);
    resetSettingsCloudPullState();
    setSettingsCloudSync(noopSettingsCloudSync);
  });

  it('updateSettings({ bgmVolume }) → loadSettings 還原；寫入 ccd.settings.v1', () => {
    updateSettings({ bgmVolume: 0.23 });
    expect(loadSettings().bgmVolume).toBe(0.23);
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).bgmVolume).toBe(0.23);

    updateSettings({ bgmVolume: 0.91 });
    expect(loadSettings().bgmVolume).toBe(0.91);
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!).bgmVolume).toBe(0.91);
  });

  it('App 啟動路徑：useState(() => loadSettings().bgmVolume) 自 localStorage 水合', () => {
    const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
    expect(app).toMatch(
      /useState\(\(\)\s*=>\s*loadSettings\(\)\.bgmVolume\)/,
    );
    expect(app).toMatch(/updateSettings\(\{\s*bgmVolume:/);
  });
});
