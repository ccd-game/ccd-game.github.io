
import React from 'react';

interface VictoryScreenProps {
  onRestart: () => void;
}

const VictoryScreen: React.FC<VictoryScreenProps> = ({ onRestart }) => {
  return (
    <div 
      className="absolute inset-0 z-[99999] flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.5s_forwards]" 
      style={{ 
        background: 'rgba(0, 40, 0, 0.88)', 
        backdropFilter: 'blur(24px)',
        fontFamily: "'LXGW WenKai Mono TC', monospace"
      }}
    >
      <div className="w-full flex flex-col items-center">
        {/* 標題 */}
        <h2 className="text-[#22c55e] text-4xl font-bold mb-16 tracking-[8px] drop-shadow-[0_0_20px_rgba(34,197,94,0.5)] whitespace-nowrap">
          大獲全勝
        </h2>
        
        {/* 引言容器：使用 inline-block 確保寬度隨文字自動調整並置中 */}
        <div className="relative inline-block px-10 mb-20">
          {/* 左上引號：調整至 -26px 以確保對稱 */}
          <span className="absolute top-[-26px] left-[-15px] text-[3.5rem] text-[#d4af37] leading-none opacity-60 select-none pointer-events-none"
                style={{ 
                  fontFamily: 'serif',
                }}>
            「
          </span>

          {/* 三行文字內容：新增 transform 以達視覺完全置中 */}
          <p className="text-white text-[16px] tracking-[4px] leading-[2.4] font-medium text-center" 
             style={{ 
               textShadow: '0 0 20px rgba(255,255,255,0.4)',
               fontFamily: "'LXGW WenKai Mono TC', monospace",
               transform: 'translate(5px, 5px)'
             }}>
            <span className="whitespace-nowrap">元和四年九月二十八日，遊西山。</span><br/>
            心凝形釋，得與萬化冥合。<br/>
            故為之文以志。
          </p>

          {/* 右下引號：調整至 -26px 以確保與上方開引號視覺距離一致 */}
          <span className="absolute bottom-[-26px] right-[-15px] text-[3.5rem] text-[#d4af37] leading-none opacity-60 select-none pointer-events-none"
                style={{ 
                  fontFamily: 'serif',
                }}>
            」
          </span>
        </div>
        
        {/* 按鈕容器 */}
        <div className="flex justify-center w-full">
          <button 
            onClick={onRestart}
            className="modern-glass-btn active:scale-95 !bg-white/10 !border-white/20 !text-white"
          >
            還於舊都
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryScreen;
