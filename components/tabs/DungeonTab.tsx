
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LevelConfig } from '../../types';

const IconCircledArrowRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m12 8 4 4-4 4"/>
    <path d="M8 12h8"/>
  </svg>
);

const IconCircledLock = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <rect width="8" height="5" x="8" y="11" rx="1"/>
    <path d="M10 11V9a2 2 0 1 1 4 0v2"/>
  </svg>
);

const MarqueeText: React.FC<{ text: string; className: string; style?: React.CSSProperties }> = ({ text, className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState('none');
  const [isOverflow, setIsOverflow] = useState(false);

  const startAnimation = useCallback((diff: number) => {
    const moveDuration = diff / 12; 
    const pauseTime = 2500; 
    let timeoutId: number;

    const runCycle = () => {
      setTransition('none');
      setOffset(0);
      
      timeoutId = window.setTimeout(() => {
        setTransition(`transform ${moveDuration}s ease-in-out`);
        setOffset(-diff);
        
        timeoutId = window.setTimeout(() => {
          timeoutId = window.setTimeout(() => {
            setTransition(`transform ${moveDuration}s ease-in-out`);
            setOffset(0);
            timeoutId = window.setTimeout(() => {
              runCycle();
            }, (moveDuration * 1000) + 100);
          }, pauseTime);
        }, moveDuration * 1000);
      }, pauseTime);
    };

    runCycle();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        
        if (textWidth > containerWidth) {
          setIsOverflow(true);
          const diff = textWidth - containerWidth + 25; 
          return startAnimation(diff);
        } else {
          setIsOverflow(false);
          setOffset(0);
          setTransition('none');
        }
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [text, startAnimation]);

  return (
    <div ref={containerRef} className="marquee-wrapper w-full">
      <span 
        ref={textRef} 
        className={`${className} marquee-content`}
        style={{ 
          ...style,
          transform: `translateX(${offset}px)`,
          transition: transition,
          paddingLeft: '25px', 
          paddingRight: isOverflow ? '50px' : '0',
          display: 'inline-block',
          willChange: 'transform'
        }}
      >
        {text}
      </span>
    </div>
  );
};

interface DungeonTabProps {
  levels: LevelConfig[];
  onSelect: (l: LevelConfig) => void;
  theme: 'light' | 'dark';
}

const DungeonTab: React.FC<DungeonTabProps> = ({ levels, onSelect, theme }) => {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar tab-slide-active" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* 統一標題樣式 */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-[var(--gold-accent)]"></div>
          <span className="text-[12px] font-black tracking-[6px] uppercase" style={{ color: 'var(--text-main)' }}>十二篇章入口</span>
        </div>
        <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--text-sub)' }}>DUNGEON / {levels.length}</span>
      </div>

      {levels.map((level, index) => (
        <div 
          key={level.id}
          onClick={() => !level.locked && onSelect(level)}
          className={`
            relative w-full h-[84px] rounded-xl flex items-center p-4 border-2 transition-all duration-300
            ${level.locked 
              ? 'opacity-65' 
              : 'active:scale-[0.98] shadow-[0_8px_20px_rgba(184,134,11,0.25)]'}
          `}
          style={{ 
            backgroundColor: level.locked ? 'var(--panel-bg)' : 'var(--gold-accent)',
            borderColor: level.locked ? 'var(--panel-border)' : 'rgba(255, 255, 255, 0.6)',
            boxShadow: level.locked ? `inset 0 1px 1px var(--reflection-tint)` : `inset 0 1px 2px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.1)`
          }}
        >
          {/* 編號圓圈樣式調整：未解鎖時改為灰色（var(--text-sub) 與 var(--panel-border)） */}
          <div 
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 mr-4 transition-colors duration-300" 
            style={{ 
              borderColor: level.locked ? 'var(--panel-border)' : 'rgba(255, 255, 255, 0.4)',
              backgroundColor: level.locked ? 'transparent' : 'rgba(0, 0, 0, 0.1)'
            }}
          >
            <span className="font-black text-sm" style={{ color: level.locked ? 'var(--text-sub)' : '#FFFFFF', opacity: level.locked ? 0.6 : 1 }}>
              {index + 1}
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden pr-3 ml-1">
             <div className="w-full overflow-hidden">
               <MarqueeText 
                 text={level.title} 
                 className={`text-lg font-bold tracking-[1px] ${level.locked ? 'opacity-50' : ''}`}
                 style={{ color: level.locked ? (theme === 'dark' ? '#FFFFFF' : 'var(--text-main)') : '#FFFFFF' }}
               />
             </div>
             <div className="w-full overflow-hidden mt-0.5">
               <MarqueeText 
                 text={level.subTitle} 
                 className={`text-[11px] tracking-[1px] ${level.locked ? 'opacity-40' : ''}`}
                 style={{ color: level.locked ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-sub)') : 'rgba(255, 255, 255, 0.85)' }}
               />
             </div>
          </div>

          <div className="shrink-0 flex items-center ml-auto">
            {level.locked ? (
              <div style={{ color: 'var(--text-sub)', opacity: 0.5 }}>
                <IconCircledLock />
              </div>
            ) : (
              <div style={{ color: '#FFFFFF' }} className="animate-pulse">
                <IconCircledArrowRight />
              </div>
            )}
          </div>

          {/* 已解鎖關卡的額外光澤特效 */}
          {!level.locked && (
            <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/10"></div>
          )}
        </div>
      ))}
      <div className="h-6"></div>
    </div>
  );
};

export default DungeonTab;
