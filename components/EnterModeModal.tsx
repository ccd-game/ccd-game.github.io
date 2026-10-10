import React from 'react';
import { LevelConfig } from '../types';
import { UI_STATIC_TEXT } from '../constants';

/**
 * 入陣：選擇方式的小視窗（取代原本整頁的 LoadingScreen）。
 * 深入不毛＝開始無縫入陣轉場；驀然回首＝關閉視窗、留在主頁（主頁音樂一直播放，預覽動畫由暫停處繼續）。測試模式已併入戰鬥畫面常駐的 AUTO。
 */
const EnterModeModal: React.FC<{
  level: LevelConfig | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** 深入不毛後：主頁 UI 滑出時淡出 */
  closing?: boolean;
  /** 已按深入不毛：不再接受點擊 */
  busy?: boolean;
}> = ({ level, isLoading, onConfirm, onCancel, closing = false, busy = false }) => (
  // 遮罩與暫停頁相同（.enter-modal-overlay＝.pause-overlay 的半透明底＋模糊）
  <div className={`enter-modal-overlay absolute inset-0 z-[700] flex items-center justify-center px-6 ${closing ? 'animate-simpleFadeOut' : 'animate-simpleFadeIn'} ${busy ? 'pointer-events-none' : ''}`}
    onClick={e => { if (!busy && e.target === e.currentTarget) onCancel(); }}>
    <div role="dialog" aria-modal="true" aria-label="選擇入陣方式"
      className="w-[320px] max-w-full bg-[#1a1a1a] rounded-[28px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] pt-8 pb-8 px-5 flex flex-col items-center text-center">
      <h2 className="text-[1.45rem] text-[#ffd700] mb-3 border-b border-[#555] pb-2 px-3 font-bold">敵將──{level?.bossName}</h2>
      <p className="text-[0.98rem] leading-relaxed text-[#ccc] tracking-widest mb-7">
        墮入永恆地城，<br />唯有通曉古聖賢之意，<br />方能破陣而歸。
      </p>
      <div className="w-full flex flex-col items-center gap-5">
        <button type="button" onClick={onConfirm} disabled={isLoading}
          className={`modern-glass-btn whitespace-nowrap active:scale-95 !bg-[#d4af37] !text-black !border-[#d4af37] !shadow-[0_0_35px_rgba(212,175,55,0.4)] ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}>
          {isLoading ? '感 應 中' : UI_STATIC_TEXT.LOADING.startBtn}
        </button>
        <button type="button" onClick={onCancel} className="modern-glass-btn active:scale-95 !bg-white/10 !border-white/20 !text-white">
          {UI_STATIC_TEXT.LOADING.cancelBtn}
        </button>
      </div>
    </div>
  </div>
);

export default EnterModeModal;
