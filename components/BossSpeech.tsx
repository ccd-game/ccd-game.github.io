
import React from 'react';

interface BossSpeechProps {
  message: string | null;
  bossName: string;
  duration?: number;
  isFatal?: boolean; // 是否為戰敗墨染模式
  theme: 'light' | 'dark';
}

const BossSpeech: React.FC<BossSpeechProps> = ({ message, bossName, duration = 2000, isFatal = false, theme }) => {
  if (!message) return null;

  const quoteColor = theme === 'light' ? '#b8860b' : '#d4af37';

  return (
    <div 
      className={`absolute inset-0 z-[150] flex flex-col items-center justify-center backdrop-blur-xl px-12 text-center ${isFatal ? 'speech-fatal-anim' : 'speech-anim'}`}
      style={{ 
        backgroundColor: 'var(--app-bg)',
        // 如果是戰敗模式，強制使用 0.6s 動畫時長，不隨倍率加速
        animationDuration: isFatal ? '0.6s' : `${duration}ms` 
      }}
    >
      <div className="relative py-6 px-4 transform translate-y-[-25px]">
        <span className="absolute top-0 left-0 text-[3.5rem] leading-none opacity-60 select-none"
              style={{ 
                fontFamily: 'serif', 
                transform: 'translate(-63px, -12px)',
                zIndex: 1,
                color: quoteColor
              }}>
          「
        </span>

        <p className="text-[1.2rem] leading-[2.2] tracking-[6px] font-medium whitespace-pre-wrap word-break-keep-all transition-colors duration-300"
           style={{ 
             color: 'var(--text-main)',
             textShadow: theme === 'dark' ? '0 0 20px rgba(255,255,255,0.4)' : '0 0 10px rgba(0,0,0,0.1)',
             fontFamily: "'LXGW WenKai Mono TC', monospace",
             position: 'relative',
             zIndex: 2
           }}>
          {message}
        </p>

        <span className="absolute bottom-0 right-0 text-[3.5rem] leading-none opacity-60 select-none"
              style={{ 
                fontFamily: 'serif', 
                transform: 'translate(63px, 12px)',
                zIndex: 1,
                color: quoteColor
              }}>
          」
        </span>
      </div>

      <div className="absolute bottom-8 left-0 w-full opacity-70 flex items-center justify-center gap-4">
        <div className="w-8 h-[1px]" style={{ backgroundColor: quoteColor }}></div>
        <span className="text-[12px] tracking-[10px] font-black drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" style={{ color: quoteColor }}>{bossName}</span>
        <div className="w-8 h-[1px]" style={{ backgroundColor: quoteColor }}></div>
      </div>
    </div>
  );
};

export default BossSpeech;
