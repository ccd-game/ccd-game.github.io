
import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LevelConfig } from '../types';
import DungeonTab from './tabs/DungeonTab';
import { subscribeToUser, TEST_USER_ID, UserData, watchAuthState } from '../src/lib/firebase';
import { getRequiredExpForLevel } from '../src/lib/levelSystem';

// Default tab (dungeon) stays eager; other tabs + codex detail are lazy.
const CharacterTab = lazy(() => import('./tabs/CharacterTab'));
const RankTab = lazy(() => import('./tabs/RankTab'));
const GachaTab = lazy(() => import('./tabs/GachaTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));
const CharacterDetailView = lazy(() => import('./CharacterDetailView'));

const TabFallback: React.FC = () => (
  <div className="w-full h-full home-surface" aria-hidden="true" />
);

const IconDungeon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21H21"/><path d="M5 21V10L12 4L19 10V21"/><path d="M9 21V15C9 13.3431 10.3431 12 12 12C13.6569 12 15 13.3431 15 15V21"/><path d="M2 10H5M19 10H22"/><path d="M12 4V2"/>
  </svg>
);
const IconUser = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IconRank = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>);
const IconGacha = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>);
const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);


const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    'input, button, select, textarea, a, label, [role="slider"], [role="switch"], [role="button"]'
  );
};

type MenuTab = 'character' | 'rank' | 'dungeon' | 'gacha' | 'settings';
const TABS: MenuTab[] = ['character', 'rank', 'dungeon', 'gacha', 'settings'];

interface MenuScreenProps {
  levels: LevelConfig[];
  onSelect: (level: LevelConfig) => void;
  viewingCharacter?: any | null; 
  onShowCharacterDetail: (char: any) => void;
  onBackFromDetail: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  bgmEnabled: boolean;
  onBgmToggle: () => void;
  bgmVolume: number;
  onVolumeChange: (val: number) => void;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ levels, onSelect, viewingCharacter, onShowCharacterDetail, onBackFromDetail, theme, onThemeToggle, bgmEnabled, onBgmToggle, bgmVolume, onVolumeChange }) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('dungeon');
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right'); 
  const [isSummoning, setIsSummoning] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const [playerData, setPlayerData] = useState<UserData & { maxStamina: number, maxExp: number }>({
    name: "文言修煉者",
    level: 1,
    gold: 0,
    stamina: 0,
    maxStamina: 100,
    exp: 0,
    maxExp: 100,
    updatedAt: null
  });
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => watchAuthState((s) => {
    setIsGuest(s.status === 'guest' || s.isGuest === true);
  }), []);

  useEffect(() => {
    const unsubscribe = subscribeToUser(TEST_USER_ID, (data) => {
      if (data) {
        setPlayerData(prev => ({
          ...prev,
          ...data,
          name: data.name || prev.name,
          maxStamina: 100, // 假設固定為 100
          maxExp: getRequiredExpForLevel(data.level)
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleNavClick = (tab: MenuTab) => {
    if (viewingCharacter) onBackFromDetail();
    const oldIdx = TABS.indexOf(activeTab);
    const newIdx = TABS.indexOf(tab);
    if (newIdx !== oldIdx) {
      setSlideDirection(newIdx > oldIdx ? 'right' : 'left');
    }
    setActiveTab(tab);
  };

  const switchTab = (direction: 'next' | 'prev') => {
    if (isSummoning) return;
    const currentIndex = TABS.indexOf(activeTab);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= TABS.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = TABS.length - 1;
    setSlideDirection(direction === 'next' ? 'right' : 'left');
    setActiveTab(TABS[nextIndex]);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewingCharacter || isSummoning) return;
    // 音量滑桿等互動元件的水平拖曳不可觸發分頁滑動
    if (isInteractiveTarget(e.target)) {
      startX.current = null;
      startY.current = null;
      return;
    }
    startX.current = e.targetTouches[0].clientX;
    startY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (viewingCharacter || isSummoning || startX.current === null || startY.current === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = startX.current - endX;
    const diffY = startY.current - endY;

    // 只有當水平位移明顯大於垂直位移，且超過 80px 閾值時，才判定為分頁切換
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
      switchTab(diffX > 0 ? 'next' : 'prev');
    }

    startX.current = null;
    startY.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewingCharacter || isSummoning) return;
    if (isInteractiveTarget(e.target)) {
      startX.current = null;
      startY.current = null;
      return;
    }
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (viewingCharacter || isSummoning || startX.current === null || startY.current === null) return;
    
    const diffX = startX.current - e.clientX;
    const diffY = startY.current - e.clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
      switchTab(diffX > 0 ? 'next' : 'prev');
    }

    startX.current = null;
    startY.current = null;
  };

  const renderActiveTabContent = () => {
    const style = { '--slide-offset': slideDirection === 'right' ? '40px' : '-40px' } as any;
    return (
      <div key={activeTab} className="w-full h-full tab-slide-dynamic" style={style}>
        <Suspense fallback={<TabFallback />}>
        {(() => {
          switch (activeTab) {
            case 'character': return <CharacterTab levels={levels} onShowDetail={onShowCharacterDetail} />;
            case 'rank': return <RankTab />;
            case 'dungeon': return <DungeonTab levels={levels} onSelect={onSelect} theme={theme} />;
            case 'gacha': return <GachaTab onIsSummoningChange={setIsSummoning} />;
            case 'settings': return <SettingsTab theme={theme} onThemeToggle={onThemeToggle} bgmEnabled={bgmEnabled} onBgmToggle={onBgmToggle} bgmVolume={bgmVolume} onVolumeChange={onVolumeChange} />;
            default: return null;
          }
        })()}
        </Suspense>
      </div>
    );
  };

  return (
    <div 
      className="absolute inset-0 flex flex-col overflow-hidden z-[500] select-none" 
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <style>{`
        @keyframes dynamicTabSlide {
          from { transform: translateX(var(--slide-offset)); opacity: 0; filter: blur(4px); }
          to { transform: translateX(0); opacity: 1; filter: blur(0); }
        }
        .tab-slide-dynamic { 
          animation: dynamicTabSlide 0.55s cubic-bezier(0.2, 1, 0.3, 1) forwards; 
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      {/* 標題欄：玩家牌 */}
      <header className={`home-bar home-bar-top absolute top-0 left-0 right-0 h-[88px] px-4 flex items-center gap-3 z-50 transition-all duration-500 ${isSummoning ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`}>
        <div className="home-lv" aria-label={`等級 ${playerData.level}`}>
          <span className="home-lv-label" aria-hidden="true">等級</span>
          <span className="home-lv-num" aria-hidden="true">{playerData.level}</span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[7px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="home-name truncate">{playerData.name}</span>
              {isGuest && (
                <span data-testid="guest-badge" className="home-guest-tag">遊客</span>
              )}
            </div>
            <div className="home-coin" aria-label={`文氣 ${playerData.gold}`}>
              <span className="home-coin-label" aria-hidden="true">文氣</span>
              <span className="home-coin-icon" aria-hidden="true"></span>
              <span className="home-coin-num" aria-hidden="true">{playerData.gold.toLocaleString()}</span>
            </div>
          </div>
          <div className="home-meter">
            <span className="home-meter-label">經驗</span>
            <div className="home-meter-track" role="progressbar" aria-label="經驗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor((playerData.exp / playerData.maxExp) * 100)}>
              <div className="home-meter-fill is-exp" style={{ width: `${Math.min(100, (playerData.exp / playerData.maxExp) * 100)}%` }}></div>
            </div>
            <span className="home-meter-val">{Math.floor((playerData.exp / playerData.maxExp) * 100)}%</span>
          </div>
          <div className="home-meter">
            <span className="home-meter-label is-jade">體力</span>
            <div className="home-meter-track" role="progressbar" aria-label="體力" aria-valuemin={0} aria-valuemax={playerData.maxStamina} aria-valuenow={playerData.stamina}>
              <div className="home-meter-fill is-stamina" style={{ width: `${(playerData.stamina / playerData.maxStamina) * 100}%` }}></div>
            </div>
            <span className="home-meter-val">{playerData.stamina}/{playerData.maxStamina}</span>
          </div>
        </div>
      </header>
      
      {/* 內容區域：關鍵修復 touch-action: pan-y */}
      <main 
        className="w-full h-full relative z-10 transition-all duration-500"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ 
          paddingTop: isSummoning ? 0 : '88px',
          paddingBottom: isSummoning ? 0 : 'calc(76px + env(safe-area-inset-bottom))',
          touchAction: 'pan-y', // 允許系統接管垂直滾動
          overflow: 'hidden' 
        }}
      >
        {viewingCharacter ? (
          <Suspense fallback={<TabFallback />}>
            <CharacterDetailView char={viewingCharacter} onBack={onBackFromDetail} />
          </Suspense>
        ) : (
          renderActiveTabContent()
        )}
      </main>

      {/* 底部導航欄 */}
      <nav 
        aria-label="主選單"
        className={`home-bar home-bar-bottom absolute bottom-0 left-0 right-0 flex items-stretch justify-around px-1 z-50 transition-all duration-500 ${isSummoning ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`} 
        style={{ 
            paddingBottom: 'max(8px, env(safe-area-inset-bottom))', 
            height: 'calc(76px + env(safe-area-inset-bottom))'
        }}
      >
        <NavButton label="圖鑒" icon={<IconUser />} active={activeTab === 'character'} onClick={() => handleNavClick('character')} />
        <NavButton label="排名" icon={<IconRank />} active={activeTab === 'rank'} onClick={() => handleNavClick('rank')} />
        <NavButton label="地城" icon={<IconDungeon />} active={activeTab === 'dungeon'} onClick={() => handleNavClick('dungeon')} />
        <NavButton label="機緣" icon={<IconGacha />} active={activeTab === 'gacha'} onClick={() => handleNavClick('gacha')} />
        <NavButton label="設定" icon={<IconSettings />} active={activeTab === 'settings'} onClick={() => handleNavClick('settings')} />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ label: string, icon: React.ReactNode, active?: boolean, onClick: () => void }> = ({ label, icon, active = false, onClick }) => {
  const reduce = useReducedMotion();
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} className={`home-nav-btn home-focus ${active ? 'is-active' : ''}`}>
      <span className="home-nav-icon">{icon}</span>
      <span className="home-nav-label">{label}</span>
      {active && (
        <motion.span
          layoutId="home-nav-brush"
          className="home-nav-brush"
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
    </button>
  );
};

export default MenuScreen;
