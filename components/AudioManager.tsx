
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { GameStatus } from '../types';
import { applyBgmVolume } from './bgmVolume';
import { BGM_FADE_IN_MS, BGM_FADE_OUT_MS, TrackFader, desiredTrack, type BgmTrack as Track } from './bgmFade';

export { applyBgmVolume };

interface AudioManagerProps {
  status: GameStatus;
  bgmEnabled: boolean;
  bgmVolume: number; // 新增屬性
  isBooting: boolean;
  isLoggedIn: boolean;
  /** 戰鬥暫停：戰鬥音樂淡出並暫停，繼續時由原位置淡入 */
  isPaused?: boolean;
}
export interface AudioManagerHandle {
  resetBattleMusic: () => void;
  unlockAudio: () => Promise<void>;
}

const AUDIO_URLS = {
  MENU: `${import.meta.env.BASE_URL}resources/bgm/menu_bgm.mp3`,
  BATTLE: `${import.meta.env.BASE_URL}resources/bgm/battle_bgm.mp3`
};

// 預先建立實例，確保在組件生命週期外存在
const menuAudio = new Audio(AUDIO_URLS.MENU);
const battleAudio = new Audio(AUDIO_URLS.BATTLE);
menuAudio.loop = true;
battleAudio.loop = true;
menuAudio.preload = "auto";
battleAudio.preload = "auto";

/** 使用者設定的 BGM 音量（0–1）；淡入淡出的 gain 乘上此值，所以永不超過設定 */
let userVolume = 1;
const menuFader = new TrackFader(menuAudio, () => userVolume);
const battleFader = new TrackFader(battleAudio, () => userVolume);

function applyVolumeToTracks(volume: number): void {
  userVolume = volume;
  menuFader.apply();
  battleFader.apply();
}

const TRACKS: Record<Track, { el: HTMLAudioElement; fader: TrackFader }> = {
  menu: { el: menuAudio, fader: menuFader },
  battle: { el: battleAudio, fader: battleFader },
};

/** 目前想播放的音軌；淡出完成時用來確認是否仍要暫停（避免與後來的轉場互相干擾） */
let wanted: Track | null = null;

function fadeIn(track: Track): void {
  const { el, fader } = TRACKS[track];
  if (el.paused) {
    fader.set(0);
    el.play()
      .then(() => { if (wanted === track) void fader.fadeTo(1, BGM_FADE_IN_MS); })
      .catch(e => console.warn(`${track} audio play blocked`, e));
  } else if (fader.gain < 1 || fader.isFading) {
    void fader.fadeTo(1, BGM_FADE_IN_MS);
  }
}

function fadeOut(track: Track): void {
  const { el, fader } = TRACKS[track];
  if (el.paused) { fader.cancel(); return; }
  void fader.fadeTo(0, BGM_FADE_OUT_MS).then(done => {
    if (!done || wanted === track) return;
    el.pause(); // 停在 gain 0；下次播放時由 0 淡入
  });
}

/** 立即停止（未解鎖、開機載入中）：沒有在播放，不需要淡出 */
function stopAll(): void {
  wanted = null;
  for (const { el, fader } of Object.values(TRACKS)) { fader.cancel(); el.pause(); fader.set(1); }
}

/** 轉場：想要的音軌淡入（必要時由 0 開始播放），其餘音軌淡出後暫停；新轉場會取消進行中的淡變 */
function transitionTo(track: Track | null): void {
  wanted = track;
  for (const t of Object.keys(TRACKS) as Track[]) {
    if (t === track) fadeIn(t); else fadeOut(t);
  }
}

/** Test hook: Playwright asserts HTMLMediaElement.volume / muted on both tracks. */
if (typeof window !== "undefined") {
  const w = window as unknown as {
    __bgmAudio?: { menu: HTMLAudioElement; battle: HTMLAudioElement };
    __applyBgmVolumeForTest?: (v: number) => void;
  };
  w.__bgmAudio = {
    menu: menuAudio,
    battle: battleAudio,
  };
  (w as unknown as { __bgmFade?: unknown }).__bgmFade = { menu: menuFader, battle: battleFader };
  w.__applyBgmVolumeForTest = (v: number) => applyVolumeToTracks(v);
}

const AudioManager = forwardRef<AudioManagerHandle, AudioManagerProps>(({ 
  status, 
  bgmEnabled, 
  bgmVolume, // 接收音量
  isBooting, 
  isLoggedIn,
  isPaused = false
}, ref) => {
  const isUnlocked = useRef(false);
  const bgmVolumeRef = useRef(bgmVolume);
  bgmVolumeRef.current = bgmVolume;

  // 當音量狀態變更時，立即更新 Audio 實例（含 muted）
  useEffect(() => {
    applyVolumeToTracks(bgmVolume);
  }, [bgmVolume]);

  // load()/readyState 變更後部分瀏覽器會還原預設 volume — 再套一次
  useEffect(() => {
    const reapply = () => applyVolumeToTracks(bgmVolumeRef.current);
    menuAudio.addEventListener('loadeddata', reapply);
    battleAudio.addEventListener('loadeddata', reapply);
    menuAudio.addEventListener('canplay', reapply);
    battleAudio.addEventListener('canplay', reapply);
    return () => {
      menuAudio.removeEventListener('loadeddata', reapply);
      battleAudio.removeEventListener('loadeddata', reapply);
      menuAudio.removeEventListener('canplay', reapply);
      battleAudio.removeEventListener('canplay', reapply);
    };
  }, []);

  // 封裝播放邏輯：所有頁面／音樂轉場都經 transitionTo() 淡入淡出
  const syncPlayback = () => {
    if (!isUnlocked.current || isBooting) { stopAll(); return; }
    transitionTo(bgmEnabled ? desiredTrack(status, isPaused) : null);
  };

  useImperativeHandle(ref, () => ({
    resetBattleMusic: () => {
      // 新一場戰鬥由頭播放（此時戰鬥音樂應已淡出；若仍在淡出就直接停止）
      battleFader.cancel();
      battleAudio.pause();
      battleAudio.currentTime = 0;
      battleFader.set(1);
    },
    unlockAudio: async () => {
      if (isUnlocked.current) return;
      
      try {
        // 先測試資源是否可達
        const checkResource = async (url: string) => {
          try {
            const resp = await fetch(url, { method: 'HEAD' });
            return resp.ok;
          } catch {
            return false;
          }
        };

        const menuOk = await checkResource(AUDIO_URLS.MENU);
        const battleOk = await checkResource(AUDIO_URLS.BATTLE);
        
        if (!menuOk || !battleOk) {
          console.warn("Audio files might be missing or unreachable:", { menuOk, battleOk });
        }

        // 強制加載（load 後再套用音量+muted，避免部分瀏覽器還原預設 volume）
        menuAudio.load();
        battleAudio.load();
        applyVolumeToTracks(bgmVolumeRef.current);

        // 解鎖用的第一次播放由 gain 0 開始，之後由 syncPlayback 淡入（不會突然全音量響起）
        menuFader.set(0);
        await menuAudio.play();
        applyVolumeToTracks(bgmVolumeRef.current);
        isUnlocked.current = true;
        syncPlayback();
      } catch (e) {
        console.error("Audio unlock failed:", e);
        // 如果是資源問題，嘗試給予更具體的提示
        if (e instanceof Error && e.name === 'NotSupportedError') {
          console.error("The browser does not support the audio format or the file is corrupted.");
        }
      }
    }
  }));

  useEffect(() => {
    if (isLoggedIn && isUnlocked.current) {
      syncPlayback();
    }
  }, [status, bgmEnabled, isBooting, isLoggedIn, isPaused]);

  return null; 
});

export default React.memo(AudioManager);
