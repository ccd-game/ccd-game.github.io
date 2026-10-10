
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { GameStatus } from '../types';

interface AudioManagerProps {
  status: GameStatus;
  bgmEnabled: boolean;
  bgmVolume: number; // 新增屬性
  isBooting: boolean;
  isLoggedIn: boolean;
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

/** Test hook: Playwright asserts HTMLMediaElement.volume on both tracks. */
if (typeof window !== "undefined") {
  (window as unknown as { __bgmAudio?: { menu: HTMLAudioElement; battle: HTMLAudioElement } }).__bgmAudio = {
    menu: menuAudio,
    battle: battleAudio,
  };
}

const AudioManager = forwardRef<AudioManagerHandle, AudioManagerProps>(({ 
  status, 
  bgmEnabled, 
  bgmVolume, // 接收音量
  isBooting, 
  isLoggedIn
}, ref) => {
  const isUnlocked = useRef(false);

  // 當音量狀態變更時，立即更新 Audio 實例
  useEffect(() => {
    menuAudio.volume = bgmVolume;
    battleAudio.volume = bgmVolume;
  }, [bgmVolume]);

  // 封裝播放逻辑
  const syncPlayback = () => {
    if (!isUnlocked.current || !bgmEnabled || isBooting) {
      menuAudio.pause();
      battleAudio.pause();
      return;
    }

    const isBattle = status === GameStatus.PLAYING;
    const isMenu = status === GameStatus.MENU || status === GameStatus.CHARACTER_DETAIL;

    if (isBattle) {
      menuAudio.pause();
      if (battleAudio.paused) {
        battleAudio.play().catch(e => console.warn("Battle audio play blocked", e));
      }
    } else if (isMenu) {
      battleAudio.pause();
      if (menuAudio.paused) {
        menuAudio.play().catch(e => console.warn("Menu audio play blocked", e));
      }
    } else {
      menuAudio.pause();
      battleAudio.pause();
    }
  };

  useImperativeHandle(ref, () => ({
    resetBattleMusic: () => {
      battleAudio.pause();
      battleAudio.currentTime = 0;
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

        // 強制加載（load 後再套用音量，避免部分瀏覽器還原預設 volume）
        menuAudio.load();
        battleAudio.load();
        menuAudio.volume = bgmVolume;
        battleAudio.volume = bgmVolume;

        await menuAudio.play();
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
  }, [status, bgmEnabled, isBooting, isLoggedIn]);

  return null; 
});

export default React.memo(AudioManager);
