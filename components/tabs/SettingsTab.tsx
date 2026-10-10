
import React from 'react';

interface SettingsTabProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  bgmEnabled: boolean;
  onBgmToggle: () => void;
  bgmVolume: number;
  onVolumeChange: (val: number) => void;
}

const AudioVisualizer = ({ active }: { active: boolean }) => (
  <div className="flex items-center gap-[3px] h-3">
    {[0.6, 1, 0.4, 0.8, 0.5].map((s, i) => (
      <div 
        key={i} 
        className={`w-[2px] bg-[var(--gold-accent)] rounded-full transition-all duration-500 ${active ? 'animate-visualizer' : 'h-[2px] opacity-30'}`} 
        style={{ height: active ? '100%' : '2px', animationDelay: `${i * 0.12}s`, animationDuration: `${0.5 + s}s` }}
      />
    ))}
    <style>{`
      @keyframes visualizer {
        0%, 100% { transform: scaleY(0.25); }
        50% { transform: scaleY(1); }
      }
      .animate-visualizer { animation: visualizer linear infinite; }
    `}</style>
  </div>
);

const IconSpeaker = ({ active }: { active: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    {active ? (
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>
    ) : (
      <line x1="23" y1="1" x2="1" y2="23"/>
    )}
  </svg>
);

const SettingsTab: React.FC<SettingsTabProps> = ({ theme, onThemeToggle, bgmEnabled, onBgmToggle, bgmVolume, onVolumeChange }) => {
  return (
    <div className="flex-1 flex flex-col p-5 tab-slide-active overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* 統一標題樣式 */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-[var(--gold-accent)]"></div>
          <span className="text-[12px] font-black tracking-[6px] uppercase" style={{ color: 'var(--text-main)' }}>修煉環境設定</span>
        </div>
        <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--text-sub)' }}>SYSTEM</span>
      </div>

      <div className="w-full space-y-6">
        <div className="flex flex-col gap-4">
           {/* 主題切換 */}
           <div className="flex items-center justify-between p-5 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
             <div className="flex flex-col gap-1">
                <span className="text-lg font-black tracking-[2px]" style={{ color: 'var(--text-main)' }}>境界切換</span>
                <span className="text-[10px] opacity-60 font-bold" style={{ color: 'var(--text-sub)' }}>
                  {theme === 'light' ? '當前：日間模式' : '當前：黑夜模式'}
                </span>
             </div>
             
             <button 
               onClick={onThemeToggle}
               className={`w-[58px] h-8 rounded-full flex items-center px-1 transition-all duration-500 border relative overflow-hidden`}
               style={{ 
                 backgroundColor: theme === 'light' ? '#ffd70033' : '#1a1a1a',
                 borderColor: 'var(--gold-accent)'
               }}
             >
               <div 
                 className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg z-10"
                 style={{ 
                   backgroundColor: theme === 'light' ? '#ffd700' : 'var(--gold-accent)',
                   transform: `translateX(${theme === 'light' ? '0' : '28px'})`
                 }}
               >
                 {theme === 'light' ? (
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round">
                     <circle cx="12" cy="12" r="4"/>
                     <line x1="12" y1="2" x2="12" y2="4"/>
                     <line x1="12" y1="20" x2="12" y2="22"/>
                     <line x1="2" y1="12" x2="4" y2="12"/>
                     <line x1="20" y1="12" x2="22" y2="12"/>
                     <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>
                     <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
                     <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/>
                     <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>
                   </svg>
                 ) : (
                   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                 )}
               </div>
             </button>
           </div>

           {/* 背景音樂切換 */}
           <div className="flex flex-col gap-4 p-5 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <span className="text-lg font-black tracking-[2px]" style={{ color: 'var(--text-main)' }}>播放音樂</span>
                  <div className="mt-1">
                    <AudioVisualizer active={bgmEnabled} />
                  </div>
               </div>
               
               <button 
                 onClick={onBgmToggle}
                 className={`w-[58px] h-8 rounded-full flex items-center px-1 transition-all duration-500 border relative overflow-hidden`}
                 style={{ 
                   backgroundColor: bgmEnabled ? '#ffd70033' : '#1a1a1a',
                   borderColor: 'var(--gold-accent)'
                 }}
               >
                 <div 
                   className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg z-10`}
                   style={{ 
                     backgroundColor: bgmEnabled ? '#ffd700' : '#000',
                     color: bgmEnabled ? '#000' : 'var(--gold-accent)',
                     transform: `translateX(${bgmEnabled ? '28px' : '0'})`,
                     border: bgmEnabled ? 'none' : '1.5px solid var(--gold-accent)'
                   }}
                 >
                   <IconSpeaker active={bgmEnabled} />
                 </div>
               </button>
             </div>

             {/* 音量滑塊 - 僅在開起音樂時顯示 */}
             <div className={`transition-all duration-500 flex flex-col gap-3 overflow-hidden ${bgmEnabled ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-2 opacity-60">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                         <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                      <span className="text-[10px] font-bold tracking-[2px]" style={{ color: 'var(--text-main)' }}>音量調節</span>
                   </div>
                   <span className="text-[12px] font-black tabular-nums" style={{ color: 'var(--gold-accent)' }}>{Math.round(bgmVolume * 100)}%</span>
                </div>
                <div className="px-1 py-2">
                   <input 
                      type="range" 
                      min="0" 
                      max="1"
                      step="0.01" 
                      value={bgmVolume} 
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--gold-accent)]"
                      style={{ 
                        background: `linear-gradient(to right, var(--gold-accent) ${bgmVolume * 100}%, rgba(128,128,128,0.2) ${bgmVolume * 100}%)`,
                        WebkitAppearance: 'none',
                        // 父層 main 為 pan-y；讓滑桿可水平拖曳
                        touchAction: 'none'
                      }}
                   />
                </div>
             </div>
           </div>
        </div>

        <div className="flex items-center justify-between p-5 rounded-2xl border opacity-50" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <span className="text-sm font-bold tracking-[2px]" style={{ color: 'var(--text-main)' }}>版本資訊</span>
          <span className="text-[10px] font-black" style={{ color: 'var(--gold-accent)' }}>v{__APP_VERSION__}</span>
        </div>
      </div>
      
      <div className="mt-auto pb-8 text-center">
         <p className="text-[10px] opacity-40 tracking-[4px] uppercase" style={{ color: 'var(--text-sub)' }}>HKDSE Classics RPG © 2024</p>
         <p className="mt-2 text-[10px] opacity-40 tracking-[2px]" style={{ color: 'var(--text-sub)' }}>版本 v{__APP_VERSION__}</p>
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2px solid var(--gold-accent);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default SettingsTab;
