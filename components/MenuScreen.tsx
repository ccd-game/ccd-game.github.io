
import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LevelConfig } from '../types';
import DungeonTab from './tabs/DungeonTab';
import { subscribeToUser, TEST_USER_ID, UserData, watchAuthState } from '../src/lib/firebase';
import { getRequiredExpForLevel, expIntoLevel } from '../src/lib/levelSystem';
import {
  clamp01,
  expArcConicMaskImage,
  EXP_ARC_CENTER_X_PCT,
  EXP_ARC_CENTER_Y_PCT,
  EXP_ARC_END_PILLOW_DEG,
  EXP_ARC_SPAN_DEG,
  pillowToCssConicDeg,
} from '../src/lib/hudExpArc';
import {
  buildExpArcAnimPlan,
  easeOutCubic,
  expArcAnimDurationMs,
  expArcVisualEq,
  expPctFromRatio,
  sampleExpArcAnimPlan,
  type ExpArcVisual,
} from '../src/lib/hudExpArcAnim';
import { MAX_STAMINA } from '../src/lib/playerData';
import { staminaAt } from '../src/lib/stamina';
import { SCHOOLS_BY_EMAIL_DOMAIN, schoolNameForEmail } from '../src/config/auth';
import { shortLabelFor } from '../src/lib/displayLabel';

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

/** 主頁圖殼資產（v1.3.15 r10b＋standalone-black-sat：browser／standalone 皆整圖匾殼＋獨立玉佩 PNG） */
const CHROME_BASE = `${import.meta.env.BASE_URL}resources/ui/chrome`;
/* r4：頂欄素殼已移除（懸浮 HUD） */
/** hud-vnext-hollow-home-r9：懸浮；真刪素殼；量測 r2；短匣；單字族＋全形數值；EXP 弧下間隙 */
const HUD_VNEXT_ORB_ARC = `${CHROME_BASE}/hud-vnext-orb-arc.png`;
/** exp-west-east-r1：材質×trough（無玉框）；runtime conic 西→東 clip */
const HUD_VNEXT_TROUGH_FILL = `${CHROME_BASE}/hud-vnext-exp-trough-fill.png`;
/** tip-mask-r4：弧槽 α（裁至 orb 690×634）；sheen／tip 對齊遮罩 */
const HUD_VNEXT_TROUGH_ALPHA = `${CHROME_BASE}/hud-vnext-exp-trough-alpha.png`;
const HUD_VNEXT_STA_SHORT = `${CHROME_BASE}/hud-vnext-sta-short.png`;
const HUD_VNEXT_COIN_SHORT = `${CHROME_BASE}/hud-vnext-coin-short.png`;
/** r9：數值用全形數字，與「歐陽同學」同 face 明體字形（禁半形拉丁數字視覺異體） */
const fwDigits = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0xff10 + Number(d)));
/** HUD 名列：優先 profile.name（＝shortLabelFor(surname)）；示意 fallback 可覆寫 */
function resolveHudName(data: Pick<UserData, 'name' | 'surname'>): string {
  if (data.name && data.name !== '文言修煉者' && data.name !== '同學') return data.name;
  if (data.surname) return shortLabelFor(data.surname);
  return '歐陽同學';
}
/** HUD 校列：schoolDomain→SCHOOLS／displayLabel 拆分／email；示意 fallback 可覆寫 */
function resolveHudSchool(
  data: Pick<UserData, 'displayLabel' | 'schoolDomain'> & { schoolName?: string },
  email?: string | null,
): string {
  if (typeof data.schoolName === 'string' && data.schoolName.trim()) return data.schoolName.trim();
  const dom = data.schoolDomain;
  if (typeof dom === 'string' && Object.prototype.hasOwnProperty.call(SCHOOLS_BY_EMAIL_DOMAIN, dom)) {
    return SCHOOLS_BY_EMAIL_DOMAIN[dom];
  }
  const fromEmail = schoolNameForEmail(email);
  if (fromEmail) return fromEmail;
  const label = data.displayLabel;
  if (typeof label === 'string') {
    const m = label.match(/^(.+?)\s+\S*同學$/u);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return '救世軍卜維廉中學';
}
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
  /** 主頁 HUD 可見（MENU／角色詳情）；通關入帳時若為 false 則延至回主頁再播弧填動畫 */
  hudLive?: boolean;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ levels, onSelect, viewingCharacter, onShowCharacterDetail, onBackFromDetail, theme, onThemeToggle, bgmEnabled, onBgmToggle, bgmVolume, onVolumeChange, hudLive = true }) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('dungeon');
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [isSummoning, setIsSummoning] = useState(false);
  const reduceNav = useReducedMotion();
  const activeNavIndex = TABS.indexOf(activeTab);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const [playerData, setPlayerData] = useState<UserData & { maxStamina: number; maxExp: number; schoolName: string }>({
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
    schoolName: "救世軍卜維廉中學",
    schoolDomain: "wbss.edu.hk",
    updatedAt: null
  });
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => watchAuthState((s) => {
    setIsGuest(s.status === 'guest' || s.isGuest === true);
    setAuthEmail(s.user?.email ?? null);
  }), []);

  useEffect(() => {
    const unsubscribe = subscribeToUser(TEST_USER_ID, (data) => {
      if (data) {
        setPlayerData(prev => {
          const merged = { ...prev, ...data } as UserData & { schoolName?: string };
          return {
            ...prev,
            ...data,
            name: resolveHudName(data),
            schoolName: resolveHudSchool(merged, authEmail),
            maxStamina: MAX_STAMINA,
            exp: expIntoLevel(data.level, data.exp), // 累計→本級內；EXP％同源
            maxExp: getRequiredExpForLevel(data.level),
          };
        });
      }
    });
    return () => unsubscribe();
  }, [authEmail]);

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
  // r4：滿格强制 100%（禁浮點 99.x）；與顯示值同源 staminaView.stamina / maxStamina
  const staPct =
    staminaView.full || staminaView.stamina >= playerData.maxStamina
      ? 100
      : playerData.maxStamina > 0
        ? Math.min(100, (staminaView.stamina / playerData.maxStamina) * 100)
        : 0;

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

  const targetExp: ExpArcVisual = {
    level: playerData.level,
    ratio: clamp01(playerData.exp / Math.max(1, playerData.maxExp)),
  };

  const [displayExp, setDisplayExp] = useState<ExpArcVisual>(targetExp);
  const displayExpRef = useRef(displayExp);
  displayExpRef.current = displayExp;
  const animGenRef = useRef(0);
  const primedRef = useRef(false);
  const pendingTargetRef = useRef<ExpArcVisual | null>(null);
  const reduceExpMotion = useReducedMotion();

  const runExpArcAnim = React.useCallback((from: ExpArcVisual, to: ExpArcVisual) => {
    if (expArcVisualEq(from, to)) {
      setDisplayExp(to);
      return;
    }
    if (reduceExpMotion) {
      setDisplayExp(to);
      return;
    }
    const plan = buildExpArcAnimPlan(from, to);
    const dur = expArcAnimDurationMs(plan);
    const gen = ++animGenRef.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (animGenRef.current !== gen) return;
      const u = Math.min(1, (now - t0) / dur);
      const eased = easeOutCubic(u);
      setDisplayExp(sampleExpArcAnimPlan(plan, eased));
      if (u < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [reduceExpMotion]);

  useEffect(() => {
    const to = targetExp;
    if (!primedRef.current) {
      primedRef.current = true;
      setDisplayExp(to);
      pendingTargetRef.current = null;
      return;
    }
    if (expArcVisualEq(displayExpRef.current, to) && !pendingTargetRef.current) return;
    if (!hudLive) {
      // 結算當刻入帳：主頁隱藏，凍結顯示於入帳前，待回主頁再播
      pendingTargetRef.current = to;
      return;
    }
    const from = displayExpRef.current;
    const dest = pendingTargetRef.current ?? to;
    pendingTargetRef.current = null;
    runExpArcAnim(from, dest);
    // target 以 level/ratio 為依賴；playerData 物件本身不列入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetExp.level, targetExp.ratio, hudLive, runExpArcAnim]);

  const expRatio = displayExp.ratio;
  const expPct = expPctFromRatio(expRatio);
  const expArcMask = expArcConicMaskImage(expRatio);
  const displayLevel = displayExp.level;

  return (
    <div
      className="home-menu-shell absolute inset-0 flex flex-col overflow-hidden z-[500] select-none"
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
      <header className={`home-bar home-bar-top home-hud-vnext-host absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${isSummoning ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`}>
        {/* r6：真刪頂欄素殼；懸浮；量測 measure-tophud-r2 */}
        <div className="home-hud-vnext" data-testid="home-hud-vnext">
          <div className="home-hud-vnext-orb" aria-label={`等級 ${displayLevel}`}>
            <div className="home-hud-vnext-orb-stack" aria-hidden="true">
              <img className="home-hud-vnext-orb-img" src={HUD_VNEXT_ORB_ARC} alt="" draggable={false} width={690} height={634} />
              <img
                className="home-hud-vnext-arc-fill"
                src={HUD_VNEXT_TROUGH_FILL}
                alt=""
                draggable={false}
                width={690}
                height={634}
                data-testid="hud-exp-arc-fill"
                style={{
                  opacity: expRatio <= 0 ? 0 : 1,
                  WebkitMaskImage: expArcMask,
                  maskImage: expArcMask,
                }}
              />
              {/* exp-sheen-tip-wire-r1：半透明羽化平行四邊形；只亮 trough；西 tip→東 tip；峰 α 0.68 */}
              <div
                className="home-hud-vnext-sheen"
                aria-hidden="true"
                data-testid="hud-exp-sheen"
                style={{
                  WebkitMaskImage: `url(${HUD_VNEXT_TROUGH_ALPHA})`,
                  maskImage: `url(${HUD_VNEXT_TROUGH_ALPHA})`,
                  ['--exp-arc-cx' as string]: `${EXP_ARC_CENTER_X_PCT}%`,
                  ['--exp-arc-cy' as string]: `${EXP_ARC_CENTER_Y_PCT}%`,
                  ['--hud-sheen-from' as string]: `${pillowToCssConicDeg(EXP_ARC_END_PILLOW_DEG)}deg`,
                  ['--hud-sheen-span' as string]: `${EXP_ARC_SPAN_DEG}deg`,
                }}
              >
                <span className="home-hud-vnext-sheen-band" />
              </div>
            </div>
            <div className="home-hud-vnext-orb-text">
              <span className="home-hud-vnext-lv-label">等級</span>
              <span className="home-hud-vnext-lv-num">{fwDigits(displayLevel)}</span>
            </div>
            <svg className="home-hud-vnext-exp-svg" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                {/* r9＋exp-name-tighten-r1：path 維持；垂直上移 4px 見 CSS translateY */}
                <path id="hud-vnext-exp-arc-path" d="M 14 108 A 42 18 0 0 0 86 108" fill="none" />
              </defs>
              <text
                className="home-hud-vnext-exp-text" data-testid="hud-exp-text"
                style={{ fontFamily: 'var(--hud-vnext-font)', fontWeight: 700 }}
              >
                <textPath href="#hud-vnext-exp-arc-path" startOffset="50%" textAnchor="middle" dy="4">
                  {`EXP ${expPct}%`}
                </textPath>
              </text>
            </svg>
          </div>
          <div className="home-hud-vnext-mid">
            <span className="home-hud-vnext-name" data-testid="hud-name">{playerData.name || '歐陽同學'}</span>
            <span className="home-hud-vnext-school" data-testid="hud-school">{playerData.schoolName || '救世軍卜維廉中學'}</span>
          </div>
          <div className="home-hud-vnext-row home-hud-vnext-row--sta">
            <span className="home-hud-vnext-row-label">體力</span>
            <div className="home-hud-vnext-box home-hud-vnext-box--sta" aria-label={`體力 ${staminaView.stamina}／${playerData.maxStamina}`}>
              <img className="home-hud-vnext-short" src={HUD_VNEXT_STA_SHORT} alt="" draggable={false} />
              <span className="home-hud-vnext-box-val" data-testid="stamina-val">{staminaView.stamina}/{playerData.maxStamina}</span>
            </div>
          </div>
          <div className="home-hud-vnext-row home-hud-vnext-row--coin">
            <span className="home-hud-vnext-row-label">銅錢</span>
            <div className="home-hud-vnext-box home-hud-vnext-box--coin" aria-label={`銅錢 ${playerData.jiyuan}`}>
              <img className="home-hud-vnext-short" src={HUD_VNEXT_COIN_SHORT} alt="" draggable={false} />
              <span className="home-hud-vnext-box-val">{playerData.jiyuan}</span>
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
          paddingTop: isSummoning ? 0 : 'var(--hud-vnext-zone-h)', /* zone-lock-r1：內容區 top＝HUD 鎖區高 */
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
