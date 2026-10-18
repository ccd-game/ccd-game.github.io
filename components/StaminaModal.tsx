import React from 'react';
import { STAMINA_COPY } from '../src/config/staminaCopy';

/**
 * 「體力不足」視窗：沿用暫停頁／入陣小視窗的樣式（.enter-modal-overlay＝.pause-overlay 的半透明底＋模糊、
 * 同一張深色卡片及 modern-glass-btn）。文案集中在 src/config/staminaCopy.ts。
 */
const StaminaModal: React.FC<{ fullInMs: number; onBack: () => void }> = ({ fullInMs, onBack }) => {
  const c = STAMINA_COPY.insufficient;
  const [line1, line2] = c.body(fullInMs);
  return (
    <div className="enter-modal-overlay absolute inset-0 z-[720] flex items-center justify-center px-6 animate-simpleFadeIn"
      onClick={e => { if (e.target === e.currentTarget) onBack(); }}>
      <div role="dialog" aria-modal="true" aria-label={c.title} data-testid="stamina-modal"
        className="w-[320px] max-w-full bg-[#1a1a1a] rounded-[28px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] pt-8 pb-8 px-5 flex flex-col items-center text-center">
        <h2 className="text-[1.45rem] text-[#ffd700] mb-3 border-b border-[#555] pb-2 px-3 font-bold">{c.title}</h2>
        <p className="text-[0.98rem] leading-relaxed text-[#ccc] tracking-widest mb-7">
          {line1}<br />{line2}
        </p>
        <button type="button" onClick={onBack} className="modern-glass-btn active:scale-95 !bg-white/10 !border-white/20 !text-white">
          {c.back}
        </button>
      </div>
    </div>
  );
};

export default StaminaModal;
