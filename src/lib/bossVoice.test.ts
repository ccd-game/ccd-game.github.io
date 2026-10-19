import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BOSS_VOICE_COOLDOWN_MS,
  DEFAULT_VOICE_VOLUME,
  __resetBossVoiceState,
  __setBossVoiceTestHooks,
  bossVoiceUrl,
  canPlayBossVoice,
  hasBossVoice,
  isBossVoiceOnCooldown,
  playBossVoice,
} from './bossVoice';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  normalizePrefs,
  resetSettingsCloudPullState,
  setSettingsCloudSync,
  noopSettingsCloudSync,
} from './settingsStore';

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

function stubSettings(prefs: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const storage = new MemoryStorage();
  const full = normalizePrefs({ ...DEFAULT_SETTINGS, bgmEnabled: true, ...prefs });
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(full));
  vi.stubGlobal('window', { localStorage: storage });
  vi.stubGlobal('localStorage', storage);
  resetSettingsCloudPullState();
  setSettingsCloudSync(noopSettingsCloudSync);
}

type FakeAudio = {
  src: string;
  volume: number;
  muted: boolean;
  currentTime: number;
  preload: "" | "auto" | "none" | "metadata";
  paused: boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
};

function makeFakeAudio(src: string): FakeAudio {
  return {
    src,
    volume: 1,
    muted: false,
    currentTime: 0,
    preload: 'auto' as const,
    paused: true,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  };
}

describe('isBossVoiceOnCooldown (pure)', () => {
  it('false when never played', () => {
    expect(isBossVoiceOnCooldown(undefined, 1000)).toBe(false);
  });

  it('true within window, false after', () => {
    const t0 = 5_000;
    expect(isBossVoiceOnCooldown(t0, t0 + BOSS_VOICE_COOLDOWN_MS - 1)).toBe(true);
    expect(isBossVoiceOnCooldown(t0, t0 + BOSS_VOICE_COOLDOWN_MS)).toBe(false);
    expect(isBossVoiceOnCooldown(t0, t0 + BOSS_VOICE_COOLDOWN_MS + 1)).toBe(false);
  });
});

describe('hasBossVoice / bossVoiceUrl', () => {
  it('wires 柳宗元 (id 3) and 孔子 (id 7)', () => {
    expect(hasBossVoice(3)).toBe(true);
    expect(hasBossVoice(7)).toBe(true);
    expect(hasBossVoice(2)).toBe(false); // id 2 已讓予廉頗（圖鑑 remap）
    expect(hasBossVoice(9)).toBe(false);
    expect(hasBossVoice(1)).toBe(false);
  });

  it('urls end with expected mp3', () => {
    expect(bossVoiceUrl(3)).toMatch(/audio\/boss\/liuzongyuan-quote\.mp3$/);
    expect(bossVoiceUrl(7)).toMatch(/audio\/boss\/kongzi-quote\.mp3$/);
    expect(bossVoiceUrl(2)).toBeNull();
  });
});

describe('playBossVoice cooldown + mute', () => {
  let t: number;
  let created: FakeAudio[];

  beforeEach(() => {
    __resetBossVoiceState();
    stubSettings({ bgmEnabled: true });
    t = 1_000;
    created = [];
    __setBossVoiceTestHooks({
      now: () => t,
      createAudio: (src) => {
        const a = makeFakeAudio(src);
        created.push(a);
        return a;
      },
    });
  });

  it('plays 柳宗元 once, second tap within 10s is cooldown (no restart)', () => {
    expect(playBossVoice(3)).toBe('played');
    expect(created).toHaveLength(1);
    expect(created[0].play).toHaveBeenCalledTimes(1);
    expect(created[0].volume).toBe(DEFAULT_VOICE_VOLUME);
    expect(created[0].currentTime).toBe(0);

    created[0].currentTime = 1.5;
    created[0].play.mockClear();
    expect(playBossVoice(3)).toBe('cooldown');
    expect(created[0].play).not.toHaveBeenCalled();
    expect(created[0].currentTime).toBe(1.5);
    expect(canPlayBossVoice(3)).toBe(false);
  });

  it('after cooldown elapses, plays again from start (reuses Audio)', () => {
    expect(playBossVoice(3)).toBe('played');
    t += BOSS_VOICE_COOLDOWN_MS;
    created[0].currentTime = 2;
    created[0].play.mockClear();

    expect(canPlayBossVoice(3)).toBe(true);
    expect(playBossVoice(3)).toBe('played');
    expect(created).toHaveLength(1);
    expect(created[0].play).toHaveBeenCalledTimes(1);
    expect(created[0].currentTime).toBe(0);
  });

  it('孔子 plays independently of 柳 cooldown', () => {
    expect(playBossVoice(3)).toBe('played');
    expect(playBossVoice(7)).toBe('played');
    expect(created).toHaveLength(2);
  });

  it('unwired bosses are noop', () => {
    expect(playBossVoice(2)).toBe('noop');
    expect(playBossVoice(99)).toBe('noop');
  });

  it('bgmEnabled false → muted, no Audio play', () => {
    stubSettings({ bgmEnabled: false });
    created.length = 0;
    expect(playBossVoice(3)).toBe('muted');
    expect(playBossVoice(7)).toBe('muted');
    expect(created).toHaveLength(0);
  });
});
