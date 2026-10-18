
import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LevelConfig } from '../types';
import DungeonTab from './tabs/DungeonTab';
import { subscribeToUser, TEST_USER_ID, UserData, watchAuthState } from '../src/lib/firebase';
import { getRequiredExpForLevel, expIntoLevel } from '../src/lib/levelSystem';
import { MAX_STAMINA } from '../src/lib/playerData';
import { staminaAt } from '../src/lib/stamina';
import { STAMINA_COPY } from '../src/config/staminaCopy';

// Default tab (dungeon) stays eager; other tabs + codex detail are lazy.
const CharacterTab = lazy(() => import('./tabs/CharacterTab'));
const RankTab = lazy(() => import('./tabs/RankTab'));
const GachaTab = lazy(() => import('./tabs/GachaTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));
const CharacterDetailView = lazy(() => import('./CharacterDetailView'));

const TabFallback: React.FC = () => (
  <div className="w-full h-full home-surface" aria-hidden="true" />
);




const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    'input, button, select, textarea, a, label, [role="slider"], [role="switch"], [role="button"]'
  );
};

type MenuTab = 'character' | 'rank' | 'dungeon' | 'gacha' | 'settings';
const TABS: MenuTab[] = ['character', 'rank', 'dungeon', 'gacha', 'settings'];

/** 定稿金線 PNG（nav-v2 icons-line-art1-r2）— 禁灰 currentColor SVG */
const NAV_ICON_BASE = `${import.meta.env.BASE_URL}resources/ui/chrome/nav-icons`;
const NAV_ICONS = {
  character: { idle: `${NAV_ICON_BASE}/codex.png`, active: `${NAV_ICON_BASE}/codex-active.png` },
  rank: { idle: `${NAV_ICON_BASE}/rank.png`, active: `${NAV_ICON_BASE}/rank-active.png` },
  dungeon: { idle: `${NAV_ICON_BASE}/dungeon.png`, active: `${NAV_ICON_BASE}/dungeon-active.png` },
  gacha: { idle: `${NAV_ICON_BASE}/visit.png`, active: `${NAV_ICON_BASE}/visit-active.png` },
  settings: { idle: `${NAV_ICON_BASE}/settings.png`, active: `${NAV_ICON_BASE}/settings-active.png` },
} as const;

const NavIconImg: React.FC<{ tab: MenuTab; active: boolean }> = ({ tab, active }) => {
  const src = active ? NAV_ICONS[tab].active : NAV_ICONS[tab].idle;
  return <img className="home-nav-icon-img" src={src} alt="" draggable={false} width={28} height={28} />;
};

/** 主頁圖殼資產（v1.3.15 r10b：browser 整圖匾殼／standalone 三段拉伸＋獨立玉佩 PNG） */
const CHROME_BASE = `${import.meta.env.BASE_URL}resources/ui/chrome`;
/** browser：整張高清匾殼 PNG（禁三片拼／禁 webp） */
const TOP_SHELL_FULL = `${CHROME_BASE}/top-hud-shell-plate.png`;
/** standalone：三段拉伸吃 sat（PNG only；mid 自 ≥2400 原圖切，禁 2px 預烘焙） */
const TOP_SHELL_TOPCAP = `${CHROME_BASE}/top-hud-shell-topcap.png`;
const TOP_SHELL_MID = `${CHROME_BASE}/top-hud-shell-mid.png`;
const TOP_SHELL_BOTTOM = `${CHROME_BASE}/top-hud-shell-bottom.png`;
/** 等級玉佩獨立 PNG（禁 webp）；定位用 CSS bottom+left（量自 bdb8529） */
const TOP_HUD_JADE = `${CHROME_BASE}/top-hud-level-jade.png`;
const BOTTOM_SHELL_SRC = {
  webp: `${CHROME_BASE}/bottom-bar-shell.webp`,
  png: `${CHROME_BASE}/bottom-bar-shell.png`,
};
const NAV_GOLD_FRAME_SRC = {
  webp: `${CHROME_BASE}/nav-gold-frame.webp`,
  png: `${CHROME_BASE}/nav-gold-frame.png`,
};
/** nav-gold-ring-r1：asset 1264 × (orbOD 88.9 / assetOD 167) ≈ 673；相對 r5 754＝0.893×；金線頂緣貼殼頂 */
const NAV_GOLD_FRAME_W = 673;

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
  const reduceNav = useReducedMotion();
  const activeNavIndex = TABS.indexOf(activeTab);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const [playerData, setPlayerData] = useState<UserData & { maxStamina: number, maxExp: number }>({
    name: "歐陽同學",
    level: 1,
    jiyuan: 0,
    stamina: 0,
    staminaUpdatedAt: 0,
    score: 0,
    levels: {},
    maxStamina: MAX_STAMINA,
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
          name: (!data.name || data.name === "文言修煉者") ? "歐陽同學" : data.name,
          maxStamina: MAX_STAMINA,
          exp: expIntoLevel(data.level, data.exp), // exp 為累計值；經驗條只顯示本級內的進度
          maxExp: getRequiredExpForLevel(data.level)
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // 體力條：讀取時推算回復；至少每分鐘刷新一次倒數
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const staminaView = staminaAt(
    { stamina: playerData.stamina, staminaUpdatedAt: playerData.staminaUpdatedAt || nowMs },
    nowMs,
  );

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
      <header className={`home-bar home-bar-top home-chrome-shell-host absolute top-0 left-0 right-0 h-[88px] flex items-center z-50 transition-all duration-500 ${isSummoning ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`}>
        {/* r10b: browser＝整張 plate PNG；standalone＝三段拉伸吃 sat；禁 webp */}
        <div className="home-chrome-shell home-chrome-shell--top" aria-hidden="true">
          <img className="home-chrome-shell-full" src={TOP_SHELL_FULL} alt="" draggable={false} />
          <div className="home-chrome-shell-segs">
            <div className="home-chrome-shell-seg home-chrome-shell-seg--topcap">
              <img src={TOP_SHELL_TOPCAP} alt="" draggable={false} />
            </div>
            <div className="home-chrome-shell-seg home-chrome-shell-seg--mid">
              <img src={TOP_SHELL_MID} alt="" draggable={false} />
            </div>
            <div className="home-chrome-shell-seg home-chrome-shell-seg--bottom">
              <img src={TOP_SHELL_BOTTOM} alt="" draggable={false} />
            </div>
          </div>
        </div>
        {/* 玉佩：r10d wrap 60.71 left:19.27 bottom:13.15（自 r10c＋5）；底／w／standalone 6.5/7 不動 */}
        <div className="home-lv-jade-wrap" aria-hidden="false">
          <img className="home-lv-jade" src={TOP_HUD_JADE} alt="" draggable={false} width={61} height={62} />
          <div className="home-lv-jade-text" aria-label={`等級 ${playerData.level}`}>
            <span className="home-lv-label" aria-hidden="true">等級</span>
            <span className="home-lv-num" aria-hidden="true">{playerData.level}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 home-hud-mid">
          {/* r9-jiyuan: 金幣＋數與名同列靠右；右緣對齊 meters（含右內距） */}
          <div className="home-hud-stack">
            <div className="home-hud-name-row">
              <span className="home-name truncate">{playerData.name || '歐陽同學'}</span>
              {/* r9-jiyuan: 只留金幣＋數字；無「機緣」字／膠囊邊 */}
              <div className="home-coin" aria-label={`機緣 ${playerData.jiyuan}`}>
                <span className="home-coin-icon" aria-hidden="true"></span>
                <span className="home-coin-num" aria-hidden="true">{playerData.jiyuan.toLocaleString()}</span>
              </div>
            </div>
            {/* r9: home HUD 無「遊客」標 */}
            <div className="home-meter">
              <span className="home-meter-label">經驗</span>
              <div className="home-meter-track" role="progressbar" aria-label="經驗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor((playerData.exp / playerData.maxExp) * 100)}>
                <div className="home-meter-fill is-exp" style={{ width: `${Math.min(100, (playerData.exp / playerData.maxExp) * 100)}%` }}></div>
              </div>
              <span className="home-meter-val">{Math.floor((playerData.exp / playerData.maxExp) * 100)}%</span>
            </div>
            <div className="home-meter">
              <span className="home-meter-label is-jade">體力</span>
              <div className="home-meter-track" role="progressbar" aria-label="體力" aria-valuemin={0} aria-valuemax={playerData.maxStamina} aria-valuenow={staminaView.stamina}>
                <div className="home-meter-fill is-stamina" style={{ width: `${(staminaView.stamina / playerData.maxStamina) * 100}%` }}></div>
              </div>
              <span className="home-meter-val" data-testid="stamina-val">{staminaView.stamina}/{playerData.maxStamina}</span>
            </div>
            <div className="home-stamina-sub text-[10px] tracking-wider opacity-70 -mt-1" data-testid="stamina-next">
              {staminaView.full ? STAMINA_COPY.full : STAMINA_COPY.nextPoint(staminaView.nextPointInMs)}
            </div>
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
        className={`home-bar home-bar-bottom home-chrome-shell-host absolute bottom-0 left-0 right-0 z-50 transition-all duration-500 ${isSummoning ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`}
        data-active-index={activeNavIndex}
        style={{
            /* 殼＋五鍵錨 76 貼底；sab 只墊底不抬內容（修 standalone 五鍵飛起） */
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            height: 'calc(76px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <picture className="home-chrome-shell home-chrome-shell--bottom" aria-hidden="true">
          <source srcSet={BOTTOM_SHELL_SRC.webp} type="image/webp" />
          <img src={BOTTOM_SHELL_SRC.png} alt="" draggable={false} />
        </picture>
        {/* nav-icons-r4 + gold-ring-r1: keys 90%／金框在 keys-layer 內；標籤 美人篆 */}
        <div className="home-nav-keys-layer">
          <motion.div
            className="home-nav-gold-frame"
            aria-hidden="true"
            initial={false}
            animate={{
              /* 框寬 NAV_GOLD_FRAME_W；中心對準當前 tab 中心（相對 keys-layer） */
              left: `calc(${((activeNavIndex + 0.5) / TABS.length) * 100}% - ${NAV_GOLD_FRAME_W / 2}px)`,
            }}
            transition={
              reduceNav
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 32, mass: 0.85 }
            }
          >
            <picture>
              <source srcSet={NAV_GOLD_FRAME_SRC.webp} type="image/webp" />
              <img src={NAV_GOLD_FRAME_SRC.png} alt="" draggable={false} />
            </picture>
          </motion.div>
          <NavButton label="豪杰" tab="character" active={activeTab === 'character'} onClick={() => handleNavClick('character')} />
          <NavButton label="庙堂" tab="rank" active={activeTab === 'rank'} onClick={() => handleNavClick('rank')} />
          <NavButton label="江湖" tab="dungeon" active={activeTab === 'dungeon'} onClick={() => handleNavClick('dungeon')} />
          <NavButton label="殊遇" tab="gacha" active={activeTab === 'gacha'} onClick={() => handleNavClick('gacha')} />
          <NavButton label="通习" tab="settings" active={activeTab === 'settings'} onClick={() => handleNavClick('settings')} />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ label: string; tab: MenuTab; active?: boolean; onClick: () => void }> = ({ label, tab, active = false, onClick }) => (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} data-tab={tab} className={`home-nav-btn home-focus ${active ? 'is-active' : ''}`}>
      {/* r9b: icon+label 共槽；cx ≡ 選中金圓／orb（地城 195）；內容 z 在金框不透明區之上 */}
      <span className="home-nav-slot">
        <span className="home-nav-icon"><NavIconImg tab={tab} active={active} /></span>
        <span className="home-nav-label">{label}</span>
      </span>
    </button>
  );

export default MenuScreen;
