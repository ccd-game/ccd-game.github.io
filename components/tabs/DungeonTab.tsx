
import React, { useRef, useState, useEffect } from 'react';
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

/** 抽屜裡的作者：去掉篇目（《…》），只留作者名，例如「王維、李白、杜甫」；完整篇目仍在 aria-label 與 title 提示中 */
const shortAuthor = (sub: string) => sub.replace(/《[^》]*》/g, '').trim();

interface DungeonTabProps {
  levels: LevelConfig[];
  onSelect: (l: LevelConfig) => void;
  theme: 'light' | 'dark';
}

const IconChevronUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);

const DungeonTab: React.FC<DungeonTabProps> = ({ levels, onSelect }) => {
  const featured = levels.filter(l => !l.locked);
  const [activeId, setActiveId] = useState<number>(featured[0]?.id ?? levels[0]?.id);
  // 十二篇章入口抽屜：收合時只露出底部一條；展開時占滿首頁（底部分頁列之上），十二篇一次全見、不需捲動
  const [drawerOpen, setDrawerOpen] = useState(false);
  const barRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawerOpen(false); barRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // 選篇：收合抽屜，預覽切換到該篇（不直接入陣；入陣仍由預覽的「入陣」按鈕）
  const pick = (level: LevelConfig) => {
    setActiveId(level.id);
    setDrawerOpen(false);
    barRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="flex-1 tab-slide-active home-surface home-dungeon">
      {featured.length > 0 && (
        <div className="home-hero-slot" inert={drawerOpen || undefined}>
          <ChapterHero levels={levels} featured={featured} activeId={activeId} onActiveChange={setActiveId} onEnter={onSelect} />
        </div>
      )}

      <section className={`home-drawer ${drawerOpen ? 'is-open' : ''}`} aria-label="十二篇章入口">
        <button
          ref={barRef}
          type="button"
          className="home-drawer-bar home-focus"
          aria-expanded={drawerOpen}
          aria-controls="home-chapter-list"
          onClick={() => setDrawerOpen(o => !o)}
        >
          <h3 className="home-section-title">十二篇章入口</h3>
          <span className="home-section-meta">已啟 {featured.length}／{levels.length}</span>
          <span className="home-drawer-chev" aria-hidden="true"><IconChevronUp /></span>
          <span className="sr-only">{drawerOpen ? '（收合）' : '（展開）'}</span>
        </button>

        <ol id="home-chapter-list" className="home-drawer-list" inert={!drawerOpen || undefined}>
          {levels.map((level, index) => {
            const isActive = level.id === activeId;
            const open = !level.locked;
            return (
              <li key={level.id}>
                <div
                  role={open ? 'button' : undefined}
                  tabIndex={open ? 0 : -1}
                  aria-disabled={!open || undefined}
                  aria-current={isActive && open ? 'true' : undefined}
                  aria-label={`${chapterLabel(index)} ${level.title} ${level.subTitle}${open ? '' : '（未開放）'}`}
                  onClick={() => open && pick(level)}
                  onKeyDown={e => { if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(level); } }}
                  className={`home-slip home-focus ${open ? 'is-open' : 'is-locked'} ${isActive && open ? 'is-active' : ''}`}
                >
                  <span className="home-slip-no" aria-hidden="true">{chapterLabel(index).replace('回', '')}</span>
                  <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                    {/* 篇名一律完整顯示（不跑馬燈、不截斷）：字級隨抽屜高度縮放 */}
                    <span className="home-slip-title">{level.title}</span>
                    <span className="home-slip-sub" title={level.subTitle}>{shortAuthor(level.subTitle)}</span>
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
      </section>
    </div>
  );
};

export default DungeonTab;
