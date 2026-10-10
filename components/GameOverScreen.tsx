
import React from 'react';

interface GameOverScreenProps {
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ onRestart }) => {
  return (
    <div 
      className="absolute inset-0 z-[99999] flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.5s_forwards]" 
      style={{ 
        background: '#1a0000', // 精確對齊墨染最終色值
        fontFamily: "'LXGW WenKai Mono TC', monospace"
      }}
    >
      <div className="w-full flex flex-col items-center">
        {/* 標題 */}
        <h2 className="text-[#ff4444] text-4xl font-bold mb-16 tracking-[8px] drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] whitespace-nowrap">
          勝敗乃兵家常事
        </h2>
        
        {/* 引言容器 */}
        <div className="relative inline-block px-10 mb-20">
          <span className="absolute top-[-26px] left-[-15px] text-[3.5rem] text-[#d4af37] leading-none opacity-60 select-none pointer-events-none"
                style={{ fontFamily: 'serif' }}>
            「
          </span>

          <p className="text-white text-[16px] tracking-[4px] leading-[2.4] font-medium text-center" 
             style={{ 
               textShadow: '0 0 20px rgba(255,255,255,0.4)',
               fontFamily: "'LXGW WenKai Mono TC', monospace",
               transform: 'translate(5px, 5px)'
             }}>
            墮入西山之陰，<br/>
            終未能與培塿為類。
          </p>

          <span className="absolute bottom-[-26px] right-[-15px] text-[3.5rem] text-[#d4af37] leading-none opacity-60 select-none pointer-events-none"
                style={{ fontFamily: 'serif' }}>
            」
          </span>
        </div>
        
        {/* 按鈕容器 */}
        <div className="flex justify-center w-full">
          <button 
            onClick={onRestart}
            className="modern-glass-btn active:scale-95 !bg-white/10 !border-white/20 !text-white"
          >
            鍥而不舍
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
