
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LevelConfig } from '../../types';
import ChapterHero from '../home/ChapterHero';
import { anchorStyle, chapterLabel } from '../home/heroUtils';

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

const DungeonTab: React.FC<DungeonTabProps> = ({ levels, onSelect }) => {
  const featured = levels.filter(l => !l.locked);
  const [activeId, setActiveId] = useState<number>(featured[0]?.id ?? levels[0]?.id);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar tab-slide-active home-surface">
      {featured.length > 0 && (
        <ChapterHero levels={levels} featured={featured} activeId={activeId} onActiveChange={setActiveId} onEnter={onSelect} />
      )}

      <div className="px-5 pt-6 pb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="home-section-title">十二篇章入口</h3>
          <span className="home-section-meta">已啟 {featured.length}／{levels.length}</span>
        </div>

        <ol className="flex flex-col gap-2.5">
          {levels.map((level, index) => {
            const isActive = level.id === activeId;
            const open = !level.locked;
            return (
              <li key={level.id}>
                <div
                  role={open ? 'button' : undefined}
                  tabIndex={open ? 0 : -1}
                  aria-disabled={!open || undefined}
                  aria-label={`${chapterLabel(index)} ${level.title} ${level.subTitle}${open ? '' : '（未開放）'}`}
                  onClick={() => open && onSelect(level)}
                  onKeyDown={e => { if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(level); } }}
                  onPointerEnter={e => { if (open && e.pointerType === 'mouse') setActiveId(level.id); }}
                  onFocus={() => open && setActiveId(level.id)}
                  className={`home-slip home-focus ${open ? 'is-open' : 'is-locked'} ${isActive && open ? 'is-active' : ''}`}
                >
                  <span className="home-slip-no" aria-hidden="true">{chapterLabel(index).replace('回', '')}</span>
                  <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                    <MarqueeText text={level.title} className="home-slip-title" />
                    <MarqueeText text={level.subTitle} className="home-slip-sub" />
                  </div>
                  <div className="shrink-0 flex items-center pr-1" aria-hidden="true">
                    {open ? (
                      <span className="home-slip-face">
                        <img src={level.bossImg} alt="" style={anchorStyle(level.bossImg, { faceH: 0.42, eyeY: 0.46, faceX: 0 })} draggable={false} />
                      </span>
                    ) : (
                      <span className="home-slip-lock"><IconCircledLock /></span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default DungeonTab;
