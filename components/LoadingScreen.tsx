
import React from 'react';
import { LevelConfig } from '../types';

interface LoadingScreenProps {
  level: LevelConfig | null;
  onConfirm: (isDemo: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ level, onConfirm, onCancel, isLoading = false }) => {
  if (!level) return null;

  // 將數字轉換為中文數字
  const toChineseNumber = (n: number): string => {
    const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    return chineseNums[n] || n.toString();
  };

  // 副標題字數（含標點），用於按容器寬度計算字級，避免寬字距下超出而被裁切
  const subtitleText = `篇章${toChineseNumber(level.id)}：${level.title}`;
  const subtitleLen = Array.from(subtitleText).length;

  return (
    <div 
      className="absolute inset-0 z-[1000] flex flex-col items-center justify-between p-4 text-center bg-[#1a1a1a] animate-fadeIn"
      style={{ color: '#d4af37', fontFamily: "'LXGW WenKai Mono TC', monospace" }}
    >
      {/* 標題區域 */}
      <div className="mt-16 animate-in fade-in slide-in-from-top-10 duration-1000 w-full px-2 flex flex-col items-center" style={{ containerType: 'inline-size' }}>
        <h1 
          className="font-bold tracking-[10px] leading-tight drop-shadow-[0_0_25px_rgba(212,175,55,0.6)] m-0 flex justify-center w-full"
          style={{ 
            fontSize: 'min(13vw, 4rem, calc((100cqw - 40px) / 4))', 
            whiteSpace: 'nowrap',
            marginRight: '-10px' // 抵銷 tracking 的右側餘白
          }}
        >
          文言地城
        </h1>
        {/* 副標題：強制單行顯示，並使用響應式字級確保不超出範圍 */}
        <p 
          className="text-[#aaa] tracking-[6px] mt-4 w-full flex justify-center overflow-hidden" 
          style={{ 
            fontSize: `min(4.5vw, 1.3rem, calc((100cqw - ${subtitleLen * 6}px) / ${subtitleLen}))`,
            whiteSpace: 'nowrap',
            marginRight: '-6px' // 抵銷 tracking 的右側餘白
          }}
        >
          {subtitleText}
        </p>
      </div>
      
      {/* 關卡資訊 */}
      <div className="w-full max-w-xs animate-in fade-in duration-1000 delay-300">
        <h2 className="text-[1.8rem] text-[#ffd700] mb-4 border-b border-[#555] pb-3 inline-block px-4 font-bold">
          敵將──{level.bossName}
        </h2>
        <div className="space-y-4">
           <p className="text-[1.1rem] leading-relaxed text-[#ccc] tracking-widest">
              墮入永恆地城，<br/>
              唯有通曉古聖賢之意，<br/>
              方能破陣而歸。
           </p>
        </div>
      </div>

      {/* 控制按鈕：套用統一規範 modern-glass-btn */}
      <div className="mb-12 w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
        {/* 主要按鈕：深入不毛 */}
        <button 
          onClick={() => onConfirm(false)}
          disabled={isLoading}
          className={`modern-glass-btn active:scale-95 !bg-[#d4af37] !text-black !border-[#d4af37] !py-4 !text-xl !shadow-[0_0_35px_rgba(212,175,55,0.4)] ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
        >
          {isLoading ? '感 應 中' : '深入不毛'}
        </button>
        
        {/* 次要按鈕：驀然回首 (統一底色與樣式) */}
        <button 
          onClick={onCancel}
          className={`modern-glass-btn active:scale-95 !bg-white/10 !border-white/20 !text-white !py-4 !text-xl`}
        >
          驀然回首
        </button>

        {/* 測試按鈕 */}
        <button 
          onClick={() => onConfirm(true)}
          disabled={isLoading}
          className={`px-8 py-2 bg-white/5 text-white/30 border border-white/5 rounded-full font-bold text-xs tracking-[4px] active:scale-95 transition-all mt-2 hover:text-white/50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          測試模式
        </button>
      </div>
    </div>
  );
};

export default LoadingScreen;
