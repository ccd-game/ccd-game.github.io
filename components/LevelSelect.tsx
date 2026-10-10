
import React from 'react';
import { LevelConfig } from '../types';

interface LevelSelectProps {
  levels: LevelConfig[];
  onSelect: (level: LevelConfig) => void;
  onBack: () => void;
}

const LevelSelect: React.FC<LevelSelectProps> = ({ levels, onSelect, onBack }) => {
  return (
    <div className="absolute inset-0 z-[500] flex flex-col bg-[#111] animate-fadeIn">
      {/* 標題欄 */}
      <div className="w-full h-[60px] flex items-center justify-between px-6 border-b border-[#d4af37]/30 bg-black/40 backdrop-blur-md shrink-0">
        <button onClick={onBack} className="text-[#d4af37] text-lg font-bold active:scale-90 transition-transform">
          ← 返回
        </button>
        <h2 className="text-[#d4af37] text-xl font-black tracking-[4px]">篇章選取</h2>
        <div className="w-10"></div>
      </div>

      {/* 滾動列表 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar">
        {levels.map((level, index) => (
          <div 
            key={level.id}
            onClick={() => !level.locked && onSelect(level)}
            className={`
              relative w-full h-[84px] rounded-xl flex items-center p-4 border-2 transition-all duration-300
              ${level.locked 
                ? 'bg-black/40 border-[#333] grayscale opacity-60' 
                : 'bg-gradient-to-r from-[#222] to-[#111] border-[#d4af37]/40 active:scale-[0.98] active:border-[#d4af37] shadow-lg'}
            `}
          >
            {/* 編號 */}
            <div className="w-10 h-10 rounded-full bg-black/60 border border-[#d4af37]/30 flex items-center justify-center shrink-0 mr-4">
              <span className="text-[#d4af37] font-black text-sm">{index + 1}</span>
            </div>

            {/* 標題資訊 */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden">
               <h3 className={`text-lg font-bold tracking-[1px] truncate ${level.locked ? 'text-[#888]' : 'text-white'}`}>
                 {level.title}
               </h3>
               <p className={`text-[11px] tracking-[1px] opacity-60 truncate ${level.locked ? 'text-[#666]' : 'text-[#d4af37]'}`}>
                 {level.subTitle}
               </p>
            </div>

            {/* 狀態標籤 */}
            <div className="shrink-0 flex items-center ml-2">
              {level.locked ? (
                <div className="px-3 py-1 rounded-full bg-black/40 border border-[#444] text-[10px] text-[#666] font-bold">
                  修煉中
                </div>
              ) : (
                <div className="text-[#d4af37] animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* 背景裝飾光澤 */}
            {!level.locked && (
              <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-tr from-white/5 to-transparent"></div>
            )}
          </div>
        ))}
        {/* 底部緩衝 */}
        <div className="h-8"></div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d4af3733; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default LevelSelect;
