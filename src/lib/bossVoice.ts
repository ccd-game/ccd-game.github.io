/**
 * Boss portrait voice lines (英傑／圖鑑 detail page).
 *
 * Only bosses listed in BOSS_VOICE_SRCS have audio; others are no-ops.
 * Same character: ≥ BOSS_VOICE_COOLDOWN_MS between plays; taps inside the
 * window do nothing (no restart).
 *
 * Volume / mute: settings only expose BGM (`bgmEnabled` / `bgmVolume`).
 * There is no SFX channel. Voice treats `bgmEnabled === false` as mute
 * (skip play) and uses `loadSettings().bgmVolume` (same slider as BGM)
 * when enabled. Mid-play drag: next `playBossVoice` reads the latest
 * prefs (voice elements are not registered in `applyVolumeToTracks`).
 */

import { loadSettings } from './settingsStore';

export const BOSS_VOICE_COOLDOWN_MS = 10_000;

/**
 * Historical default (0.7) from before voice followed the BGM slider.
 * Live play path uses `prefs.bgmVolume`; kept for callers / docs only.
 */
export const DEFAULT_VOICE_VOLUME = 0.7;

/**
 * Character id → path under `public/` (joined with `import.meta.env.BASE_URL`).
 * Extend here to wire more bosses.
 */
export const BOSS_VOICE_SRCS: Readonly<Record<number, string>> = {
  /** 柳宗元 — 《始得西山宴遊記》（圖鑑 id＝3；原 18，舊 03 起後移） */
  3: 'audio/boss/liuzongyuan-quote.mp3',
  /** 孔子 — 《論仁、論孝、論君子》；句：三人行，則必有我師焉。（圖鑑 id＝7） */
  7: 'audio/boss/kongzi-quote.mp3',
};

export type BossVoiceResult = 'played' | 'cooldown' | 'muted' | 'noop';

type AudioLike = Pick<
  HTMLAudioElement,
  'src' | 'volume' | 'muted' | 'currentTime' | 'preload' | 'paused' | 'play' | 'pause'
>;

type AudioFactory = (src: string) => AudioLike;

const lastPlayedAt = new Map<number, number>();
const audioById = new Map<number, AudioLike>();

let nowFn: () => number = () => Date.now();
let createAudio: AudioFactory = (src) => {
  const el = new Audio(src);
  el.preload = 'auto';
  return el;
};

function resolveBaseUrl(): string {
  try {
    const base = import.meta.env?.BASE_URL;
    return typeof base === 'string' && base.length > 0 ? base : '/';
  } catch {
    return '/';
  }
}

/** Absolute (site-rooted) URL for a boss voice asset, or null if unwired. */
export function bossVoiceUrl(id: number): string | null {
  const rel = BOSS_VOICE_SRCS[id];
  if (!rel) return null;
  const base = resolveBaseUrl();
  const path = rel.replace(/^\//, '');
  return `${base.endsWith('/') ? base : `${base}/`}${path}`;
}

export function hasBossVoice(id: number): boolean {
  return Object.prototype.hasOwnProperty.call(BOSS_VOICE_SRCS, id);
}

/** Pure cooldown check — unit-test friendly. */
export function isBossVoiceOnCooldown(
  lastAt: number | undefined,
  now: number,
  cooldownMs: number = BOSS_VOICE_COOLDOWN_MS,
): boolean {
  if (lastAt === undefined) return false;
  return now - lastAt < cooldownMs;
}

export function canPlayBossVoice(id: number, at: number = nowFn()): boolean {
  if (!hasBossVoice(id)) return false;
  return !isBossVoiceOnCooldown(lastPlayedAt.get(id), at);
}

/**
 * Play the voice line for a boss character id.
 * Returns why play did or did not start.
 */
export function playBossVoice(id: number): BossVoiceResult {
  if (!hasBossVoice(id)) return 'noop';

  const prefs = loadSettings();
  if (!prefs.bgmEnabled) return 'muted';

  const at = nowFn();
  if (isBossVoiceOnCooldown(lastPlayedAt.get(id), at)) return 'cooldown';

  const url = bossVoiceUrl(id);
  if (!url) return 'noop';

  let audio = audioById.get(id);
  if (!audio) {
    audio = createAudio(url);
    audioById.set(id, audio);
  }

  audio.volume = prefs.bgmVolume;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {
    /* some environments reject seeking before metadata */
  }

  lastPlayedAt.set(id, at);

  try {
    const p = audio.play();
    if (p && typeof (p as Promise<void>).catch === 'function') {
      void (p as Promise<void>).catch(() => {
        /* autoplay / unlock — ignore; cooldown already recorded to avoid hammering */
      });
    }
  } catch {
    /* same */
  }

  return 'played';
}

/** Test hooks — do not use in production UI. */
export function __setBossVoiceTestHooks(hooks: {
  now?: () => number;
  createAudio?: AudioFactory;
}): void {
  if (hooks.now) nowFn = hooks.now;
  if (hooks.createAudio) createAudio = hooks.createAudio;
}

export function __resetBossVoiceState(): void {
  lastPlayedAt.clear();
  audioById.clear();
  nowFn = () => Date.now();
  createAudio = (src) => {
    const el = new Audio(src);
    el.preload = 'auto';
    return el;
  };
}
