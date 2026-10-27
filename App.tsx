
import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { GameStatus, GameState, Question, QuestionType, LevelConfig, getBossAttackStyle, isWeaponAttackStyle, weaponAttackTiming, X_SLASH_TIMING } from './types';
import { BATTLE_ANCHORS, BATTLE_SCENES, battleAnchorKey, computeBattleLayout, computeGroundedBattle, readBattleInsets, type BattleInsets } from './data/battleLayout';
import { MAX_HP, TURN_TIME, ANIMATION_CONFIG, UI_STATIC_TEXT, BOSS_MAX_HP, CORRECT_ANSWER_DAMAGE, WRONG_ANSWER_DAMAGE, BOSS_HP_SPEECH_THRESHOLDS, QUESTIONS_EXHAUSTED_POLICY } from './constants';
import { computeDamageDetail, playerHpAfterBossHit } from './src/lib/battleRules';
import { newBattleOrder, isQuestionsExhausted } from './src/lib/battleQuestions';
import { deriveCinematicActive, isBattleIntroStage, useCinematicAttribute } from './src/lib/cinematic';
import DamageMultiplierPopup, { DamagePopupData } from './components/DamageMultiplierPopup';
import { LEVELS_DATA } from './data/levels';
import { collectAllArt, preloadAllArtInBackground } from './src/lib/artPreload';
import { parseBossSpeeches } from './src/utils/speechParser';
import { parseQuestionBank } from './src/utils/questionParser';
import { evaluateInput, editableCellCount } from './src/utils/answerMatch';
import { buildQuestionBoard } from './data/questionBoard';
import bossSpeechesMd from './BOSS_SPEECHES.md?raw';
import questionBankMd from './QUESTION_BANK.md?raw';

// 在應用啟動前，解析本地題庫
const FULL_QUESTION_BANK = parseQuestionBank(questionBankMd);

// 在應用啟動前，從 Markdown 注入對話內容
const enrichedSpeeches = parseBossSpeeches(bossSpeechesMd);
LEVELS_DATA.forEach(level => {
  const speeches = enrichedSpeeches[level.id];
  if (speeches) {
    level.startSpeech = speeches.startSpeech;
    level.victorySpeech = speeches.victorySpeech;
    level.defeatSpeech = speeches.defeatSpeech;
    level.hpThresholds = speeches.hpThresholds;
  }
});
import InkSplash from './components/InkSplash';
import BootLoadingMask from './components/BootLoadingMask';
import AudioManager, { AudioManagerHandle, applyVolumeToTracks } from './components/AudioManager';
import { watchAuthState, signInWithGoogle, signOutUser, enterGuestMode, exitGuestMode, AuthState, canEnterGame, watchSurnameState, watchSurnameEditor, setSurnameEditorOpen, SurnameState, applyAuthPersistence, recordLevelClear, deductUserStamina, refundUserStamina, clearStaminaRefundable } from './src/lib/firebase';
import { useBattleRecorder } from './src/lib/useBattleRecorder';
import { ENTER_EXIT_ITEM_MS, ENTER_EXIT_MS, ENTER_EXIT_STAGGER_MS, ENTER_REDUCED_FADE_MS, ENTER_REDUCED_SCENE_FADE_MS, ENTER_SCENE_FADE_MS, enterExitTotalMs, HomeSceneBox, measureHomeScene, preloadBattleImages, prefersReducedMotion, setEnterFreeze, setHomePause, syncHeroAnimations } from './src/lib/enterTransition';
import EnterModeModal from './components/EnterModeModal';
import StaminaModal from './components/StaminaModal';
import { StaminaAttemptGuard } from './src/lib/stamina';
import type { VictoryClear } from './src/lib/battleRecorder';
import { ALLOWED_EMAIL_DOMAINS } from './src/config/auth';
import { loadSettings, updateSettings, subscribeSettings, pushSettingsIfSynced } from './src/lib/settingsStore';

import { motion, AnimatePresence } from 'motion/react';

// 入陣轉場：戰鬥 UI 可先預載；預載完成後直接同步渲染（不經 Suspense，避免交接前多等一個 fallback 週期）
function preloadableLazy<P extends object>(factory: () => Promise<{ default: React.ComponentType<P> }>) {
  let Loaded: React.ComponentType<P> | null = null;
  const Lazy = lazy(factory);
  // 掛載時決定用哪個（之後不切換，避免中途重掛）
  const Wrapped = (props: P) => {
    const [C] = useState<React.ComponentType<P>>(() => Loaded ?? (Lazy as unknown as React.ComponentType<P>));
    return React.createElement(C, props);
  };
  Wrapped.preload = () => factory().then(m => { Loaded = m.default; });
  return Wrapped;
}

// Heavy screens / battle UI — code-split; LoginGate stays in this module for first paint.
const MenuScreen = lazy(() => import('./components/MenuScreen'));
const BattleArea = preloadableLazy(() => import('./components/BattleArea'));
const SkillPanel = preloadableLazy(() => import('./components/SkillPanel'));
const InputPad = preloadableLazy(() => import('./components/InputPad'));
const GameOverScreen = lazy(() => import('./components/GameOverScreen'));
const VictoryScreen = lazy(() => import('./components/VictoryScreen'));
const HUD = preloadableLazy(() => import('./components/HUD'));
const QuestionBox = preloadableLazy(() => import('./components/QuestionBox'));
const SlotsInterface = preloadableLazy(() => import('./components/SlotsInterface'));
const BossSpeech = preloadableLazy(() => import('./components/BossSpeech'));
const SurnamePicker = lazy(() => import('./components/SurnamePicker'));

/** Minimal Suspense fallback matching boot ink (dark, no flash). */
const SoftFallback: React.FC = () => (
  <div className="absolute inset-0 bg-[#0a0a0a]" aria-hidden="true" data-soft-fallback />
);

/** 入陣：交接前先載入戰鬥畫面用到的程式碼分塊 */
const preloadBattleChunks = () => Promise.all([
  BattleArea.preload(), SkillPanel.preload(), InputPad.preload(), HUD.preload(), QuestionBox.preload(), SlotsInterface.preload(), BossSpeech.preload(),
]).then(() => undefined, () => undefined);

const FlickeringFire: React.FC<{ top: string, left: string, size?: string }> = ({ top, left, size = "40px" }) => {
  const duration = useMemo(() => 1.5 + Math.random() * 2, []);
  const delay = useMemo(() => Math.random() * -2, []); // 使用負數延遲讓動畫立即開始但相位不同

  return (
    <motion.div
      style={{ top, left, width: size, height: size }}
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[6]"
      animate={{
        opacity: [0.4, 0.8, 0.5, 0.9, 0.4],
        scale: [1, 1.2, 0.9, 1.15, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {/* 外圍火光暈 */}
      <div className="w-full h-full bg-[#ff6b00]/30 blur-2xl rounded-full" />
      {/* 核心亮點 */}
      <div className="absolute inset-0 m-auto w-1/2 h-1/2 bg-[#ffcc00]/50 blur-xl rounded-full" />
    </motion.div>
  );
};

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>
);

const ALLOWED_DOMAIN_LABEL = ALLOWED_EMAIL_DOMAINS.map(d => `@${d}`).join('、');

const LoginGate: React.FC<{ onLogin: () => void, isExiting: boolean, authState: AuthState }> = ({ onLogin, isExiting, authState }) => {
  const [isActivating, setIsActivating] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => loadSettings().rememberMe);
  const enterAfterSignIn = useRef(false);
  const isAuthorized = canEnterGame(authState);
  const isGuest = authState.status === 'guest' || authState.isGuest;

  const handleRememberMeChange = async (checked: boolean) => {
    setRememberMe(checked);
    updateSettings({ rememberMe: checked });
    try { await applyAuthPersistence(checked); } catch (e) { console.warn('applyAuthPersistence failed', e); }
  };

  // 登入頁不再播進場動畫（原本的透視形變＋推軌鏡頭已移除）：直接進入遊戲
  const handleEnter = () => {
    if (isActivating) return;
    setIsActivating(true);
    onLogin();
  };

  // 只使用 Google 登入；網域及電郵驗證檢查於 src/lib/firebase.ts 統一處理
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    enterAfterSignIn.current = true;
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  /** Teacher guest path: no Firebase Auth; domain gate does not apply. 按下即直接進入遊戲（按鈕不會先變成「進入地城」） */
  const handleGuestEnter = () => {
    if (isActivating || isSigningIn) return;
    setIsActivating(true);
    enterAfterSignIn.current = true;
    enterGuestMode();
  };

  // 新登入／遊客進入後（身分已生效）直接進入遊戲，不播動畫
  useEffect(() => {
    if (canEnterGame(authState) && enterAfterSignIn.current) {
      enterAfterSignIn.current = false;
      setIsActivating(true);
      onLogin();
    } else if (authState.status === 'rejected' || authState.status === 'signedOut') {
      if (!isSigningIn) enterAfterSignIn.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status]);

  return (
    <div className={`absolute inset-0 z-[99999] flex flex-col items-center justify-start bg-[#0f0f0f] transition-opacity duration-1000 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'} overflow-hidden`}>
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={`${import.meta.env.BASE_URL}resources/background/bg_loginscreen.webp`} 
          alt="背景" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 z-[5]"></div>
        
        {/* 地城火光閃爍效果 */}
        <FlickeringFire top="13.5%" left="24.5%" size="60px" />  {/* 左上吊燈 */}
        <FlickeringFire top="38.5%" left="13.2%" size="50px" />  {/* 左中吊燈 */}
        <FlickeringFire top="48.5%" left="5.5%" size="40px" />   {/* 左壁火炬 */}
        <FlickeringFire top="32.5%" left="88.2%" size="40px" />  {/* 右壁火炬 */}
        <FlickeringFire top="59.5%" left="74.2%" size="80px" />  {/* 右下大型火盆 */}
        <FlickeringFire top="57.5%" left="24.2%" size="30px" />  {/* 背景左側小火 */}
        <FlickeringFire top="46.5%" left="27.8%" size="30px" />  {/* 背景深處小火 */}
        <FlickeringFire top="43.5%" left="32.5%" size="30px" />  {/* 右側柱子小火 */}
      </div>

      <div className="absolute inset-0 z-10 flex justify-center items-end pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}resources/background/character1.webp`} 
          alt="角色" 
          className="h-[52%] w-auto object-contain object-bottom mb-[8vh]"
        />
      </div>

      {/* 底部羽化邊緣 */}
      <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent z-[15] pointer-events-none" />
      {/* 控制區墨色襯底：登入按鈕與說明文字不直接壓在立繪上 */}
      <div className={`login-scrim transition-opacity duration-700 ${isActivating ? 'opacity-0' : 'opacity-100'}`} aria-hidden="true" />

      <div className="relative z-20 mt-[18vh] flex flex-col items-center w-full px-4">
        <img 
          src={`${import.meta.env.BASE_URL}resources/background/bg_logingamename.webp`} 
          alt="遊戲名稱" 
          className="w-[95%] max-w-[675px] h-auto drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        />
      </div>

      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full px-8"
      >
        {authState.message && (
          <div
            role="alert"
            data-testid="login-error"
            className="pointer-events-auto mb-4 w-full max-w-[360px] rounded-2xl border border-[#e0675a]/70 bg-black/80 px-5 py-4 text-center text-[15px] leading-relaxed text-[#ffd9d2] shadow-[0_0_30px_rgba(0,0,0,0.6)]"
          >
            {authState.message}
          </div>
        )}

        {isAuthorized && !isActivating && !enterAfterSignIn.current ? (
          <>
            <div className="relative w-full max-w-[320px] pointer-events-auto">
              <div className="absolute inset-0 bg-[#d4af37]/10 blur-2xl rounded-full"></div>
              <button 
                onClick={handleEnter}
                disabled={isActivating}
                className="w-full py-4 bg-black/70 text-[#d4af37] border-2 border-[#d4af37]/40 rounded-full font-bold text-2xl tracking-[16px] indent-[16px] transition-all duration-300 active:scale-95 active:bg-black/90 shadow-[0_0_30px_rgba(0,0,0,0.6)] hover:border-[#d4af37] relative z-30"
                style={{ fontFamily: "'LXGW WenKai Mono TC', monospace" }}
              >
                進入地城
              </button>
            </div>


            {!isActivating && (isGuest ? (
              <p className="login-identity pointer-events-auto" data-testid="login-guest-identity">
                目前身分：遊客
                <button type="button" onClick={() => exitGuestMode()} className="login-link">改用學校帳戶登入</button>
              </p>
            ) : (
              <p className="mt-3 pointer-events-auto text-center text-xs text-[#d4af37]/70">
                已登入：{authState.user?.email}
                <button onClick={() => signOutUser()} className="ml-2 underline hover:text-[#d4af37]">切換帳戶</button>
              </p>
            ))}
          </>
        ) : (
          <>
            <div className="relative w-full max-w-[320px] pointer-events-auto">
              <div className="absolute inset-0 bg-[#d4af37]/10 blur-2xl rounded-full"></div>
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn || authState.status === 'loading'}
                data-testid="google-sign-in"
                className="w-full py-4 px-4 bg-black/70 text-[#d4af37] border-2 border-[#d4af37]/40 rounded-full font-bold text-base tracking-[1px] whitespace-nowrap transition-all duration-300 active:scale-95 active:bg-black/90 shadow-[0_0_30px_rgba(0,0,0,0.6)] hover:border-[#d4af37] disabled:opacity-60 relative z-30 flex items-center justify-center gap-3"
                style={{ fontFamily: "'LXGW WenKai Mono TC', monospace" }}
              >
                <span className="shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center"><GoogleIcon /></span>
                {authState.status === 'loading' ? '正在確認登入狀態…' : isSigningIn ? '登入中…' : '以學校 Google 帳戶登入'}
              </button>
            </div>
            <label className="mt-4 pointer-events-auto flex items-center gap-2 text-sm text-[#d4af37]/80 cursor-pointer select-none">
              <input type="checkbox" data-testid="remember-me" checked={rememberMe} onChange={(e) => handleRememberMeChange(e.target.checked)} className="accent-[#d4af37] w-4 h-4" />
              記住我（關閉瀏覽器後保持登入）
            </label>
            <p className="mt-2 text-center text-sm text-[#d4af37]/70">只限 {ALLOWED_DOMAIN_LABEL} 學生帳戶</p>

            {/* 次要入口：遊客（不經 Firebase Auth） */}
            <div className="login-or" aria-hidden="true">或</div>
            <button
              type="button"
              onClick={handleGuestEnter}
              disabled={isSigningIn || isActivating || authState.status === 'loading'}
              data-testid="guest-enter"
              aria-describedby="guest-enter-caption"
              className="login-guest-btn pointer-events-auto"
            >
              遊客進入
            </button>
            <p id="guest-enter-caption" className="login-guest-caption">遊客模式不會保存進度，亦不會登上排行榜</p>
          </>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Settings prefs: hydrate from localStorage before first paint/audio
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadSettings().theme);
  const [bgmEnabled, setBgmEnabled] = useState(() => loadSettings().bgmEnabled);
  const [bgmVolume, setBgmVolume] = useState(() => loadSettings().bgmVolume);
  const volumePersistTimerRef = useRef<number | null>(null);
  const pendingVolumeRef = useRef<number | null>(null);

  const [authState, setAuthState] = useState<AuthState>({ status: 'loading', user: null, message: null, isGuest: false });
  const authStateRef = useRef(authState);
  authStateRef.current = authState;

  const pushCloud = () => {
    const uid = authStateRef.current.status === 'authorized' ? authStateRef.current.user?.uid : null;
    void pushSettingsIfSynced(uid);
  };

  const handleThemeToggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      updateSettings({ theme: next });
      pushCloud();
      return next;
    });
  }, []);

  const handleBgmToggle = useCallback(() => {
    setBgmEnabled(prev => {
      const next = !prev;
      updateSettings({ bgmEnabled: next });
      pushCloud();
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((val: number) => {
    setBgmVolume(val);
    // 同步寫入 Audio（不仰賴 useEffect 多一幀）；persist 仍 150ms debounce
    applyVolumeToTracks(val);
    pendingVolumeRef.current = val;
    if (volumePersistTimerRef.current != null) {
      window.clearTimeout(volumePersistTimerRef.current);
    }
    volumePersistTimerRef.current = window.setTimeout(() => {
      if (pendingVolumeRef.current != null) {
        updateSettings({ bgmVolume: pendingVolumeRef.current });
        pendingVolumeRef.current = null;
        pushCloud();
      }
      volumePersistTimerRef.current = null;
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (volumePersistTimerRef.current != null) {
        window.clearTimeout(volumePersistTimerRef.current);
        volumePersistTimerRef.current = null;
      }
      if (pendingVolumeRef.current != null) {
        updateSettings({ bgmVolume: pendingVolumeRef.current });
        pendingVolumeRef.current = null;
      }
    };
  }, []);

  useEffect(() => subscribeSettings((prefs) => {
    setTheme(prefs.theme);
    setBgmEnabled(prefs.bgmEnabled);
    setBgmVolume(prefs.bgmVolume);
  }), []);

  const [isAppVisible, setIsAppVisible] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginExiting, setIsLoginExiting] = useState(false);

  const [levelQuestions, setLevelQuestions] = useState<Question[]>([]);
  /** 本場戰鬥的出題次序（每場開始時洗牌；見 src/lib/battleQuestions.ts）。ref 供非同步流程讀取最新值 */
  const [battleQuestions, setBattleQuestions] = useState<Question[]>([]);
  const battleQuestionsRef = useRef<Question[]>([]);
  const [isQuestionsFetching, setIsQuestionsFetching] = useState(false);
  /** 體力不足視窗：fullInMs 供文案「約 {time} 後回滿」 */
  const [staminaModalFullInMs, setStaminaModalFullInMs] = useState<number | null>(null);
  /** 本場戰敗已實際返還體力（供戰敗畫面一行提示） */
  const [staminaRefunded, setStaminaRefunded] = useState(false);
  const staminaGuardRef = useRef(new StaminaAttemptGuard());

  const [currentLevel, setCurrentLevel] = useState<LevelConfig | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [viewingCharacter, setViewingCharacter] = useState<any | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    playerHp: 0, maxPlayerHp: MAX_HP, enemyHp: BOSS_MAX_HP, maxEnemyHp: BOSS_MAX_HP,
    currentQuestionIndex: 0, timer: TURN_TIME, isTurnActive: false,
    status: GameStatus.MENU, userInput: [], usedIndices: new Set(), isPaused: false
  });

  const [introStage, setIntroStage] = useState<string>('none');
  /** 入陣無縫轉場：prep＝預載中；mount＝戰鬥頁已在主頁底下掛好；exit＝頂欄／抽屜／導覽滑出；done＝撤下主頁 */
  const [enterPhase, setEnterPhase] = useState<'idle' | 'prep' | 'mount' | 'exit' | 'done'>('idle');
  const [enterReduced, setEnterReduced] = useState(false);
  /** 主頁預覽場景幾何（戰鬥背景與人物沿用） */
  const [homeBox, setHomeBox] = useState<HomeSceneBox | null>(null);
  /** 交接期間背景與人物直接顯示；開場進到 Boss 現身時交回原流程 */
  const [enterHold, setEnterHold] = useState(false);
  const [enterAssetsReady, setEnterAssetsReady] = useState(false);
  const battleClipRef = useRef<HTMLDivElement>(null);
  const exitDoneRef = useRef<(() => void) | null>(null);
  const [bossSpeechMsg, setBossSpeechMsg] = useState<string | null>(null);
  const [isSpeechDimmed, setIsSpeechDimmed] = useState(false);
  const [bgDimDuration, setBgDimDuration] = useState(400);
  const [showInputPadUI, setShowInputPadUI] = useState(false);
  const [showQuestionUI, setShowQuestionUI] = useState(false);
  const [showSlotsUI, setShowSlotsUI] = useState(false);
  const [isInputPadExiting, setIsInputPadExiting] = useState(false);
  const [suppressExitAnim, setSuppressExitAnim] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [enemyAnimState, setEnemyAnimState] = useState<'idle' | 'hurt' | 'attack'>('idle');
  const [isPlayerHurt, setIsPlayerHurt] = useState(false);
  const [isBossSlashActive, setIsBossSlashActive] = useState(false);
  const [isPlayerSlashActive, setIsPlayerSlashActive] = useState(false);
  const [isConverging, setIsConverging] = useState(false);
  const [isScreenFlash, setIsScreenFlash] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isSlotsFalling, setIsSlotsFalling] = useState(false);
  const [isInputErrorDimmed, setIsInputErrorDimmed] = useState(false);
  const [isTimerPulse, setIsTimerPulse] = useState(false);
  const [skillPanelShown, setSkillPanelShown] = useState(false);
  const [lastImpactIndex, setLastImpactIndex] = useState<number | null>(null);
  const [isPauseExiting, setIsPauseExiting] = useState(false);
  const [isFatalDefeat, setIsFatalDefeat] = useState(false);
  const [isInkActive, setIsInkActive] = useState(false);
  const [isScreenFadingOut, setIsScreenFadingOut] = useState(false);

  const audioManagerRef = useRef<AudioManagerHandle>(null);

  // 戰鬥區尺寸（ResizeObserver；Boss 版面只由此尺寸與已知的立繪錨點計算，不讀取其他 DOM 版面）
  const appRootRef = useRef<HTMLDivElement>(null);
  const [appSize, setAppSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = appRootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setAppSize(prev => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // standalone inset：戰鬥場景改 letterbox 置中（scale 仍是 Browser 全高公式）。Browser 無 standalone 時 insets 不進可玩區。
  const [battleInsets, setBattleInsets] = useState<BattleInsets>(() => readBattleInsets());
  useEffect(() => {
    let raf = 0;
    const pull = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = readBattleInsets();
        setBattleInsets(prev => (
          prev.standalone === next.standalone && prev.sat === next.sat && prev.sab === next.sab ? prev : next
        ));
      });
    };
    pull();
    const mq = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)');
    mq.addEventListener('change', pull);
    window.addEventListener('resize', pull);
    window.visualViewport?.addEventListener('resize', pull);
    const mo = new MutationObserver(pull);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener('change', pull);
      window.removeEventListener('resize', pull);
      window.visualViewport?.removeEventListener('resize', pull);
      mo.disconnect();
    };
  }, []);

  useEffect(() => watchAuthState(setAuthState), []);
  const isAuthorized = canEnterGame(authState);
  const isGuest = authState.status === 'guest' || authState.isGuest;

  const [surnameState, setSurnameStateLocal] = useState<SurnameState | null>(null);
  const [surnameEditorOpen, setSurnameEditorOpenLocal] = useState(false);
  useEffect(() => watchSurnameState(setSurnameStateLocal), []);
  useEffect(() => watchSurnameEditor(setSurnameEditorOpenLocal), []);

  useEffect(() => {
    if (!isAuthorized) {
      setIsLoggedIn(false);
      setIsLoginExiting(false);
      setCurrentLevel(null);
      setGameState(p => ({ ...p, status: GameStatus.MENU, isPaused: false, isTurnActive: false }));
    }
  }, [isAuthorized]);

  useEffect(() => {
    const handleVisibilityChange = () => setIsAppVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 登入頁三張圖載完（開機遮罩結束）後，所有關卡背景與人物圖在背景以低優先度同時預載＋解碼（不擋登入按鈕）
  useEffect(() => {
    if (isBooting) return;
    void preloadAllArtInBackground(collectAllArt(LEVELS_DATA));
  }, [isBooting]);

  // Boot preload: login screen trio first (level art follows in the background after boot, low priority).
  const preloadAssets = useMemo(() => [
    `${import.meta.env.BASE_URL}resources/background/bg_loginscreen.webp`,
    `${import.meta.env.BASE_URL}resources/background/bg_logingamename.webp`,
    `${import.meta.env.BASE_URL}resources/background/character1.webp`,
  ], []);

  const timerRef = useRef<number | null>(null);
  const gameInstanceIdRef = useRef<number>(0);
  // 通關計時及紀錄（只在 VICTORY 記錄；見 src/lib/battleRecorder.ts）
  /** 結算畫面顯示的實際入帳經驗（未達防作弊下限／調試 WIN 為 0） */
  const [victoryExpGained, setVictoryExpGained] = useState(0);
  /** 備援：若 VICTORY 時 session 尚未被 runVictorySequence 取走，仍寫入 */
  const handleVictoryClear = useCallback((clear: VictoryClear) => {
    recordLevelClear(clear)
      .then((outcome) => {
        if (outcome?.recorded) setVictoryExpGained(outcome.expGained);
      })
      .catch((e) => console.error('通關紀錄寫入失敗', e));
  }, []);
  // 速度傷害：完成作答（最後一次點選）當刻的剩餘秒數（小數），由倒數計時器的整數秒＋上次跳秒後經過的時間推算
  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  const lastTickAtRef = useRef<number>(0);
  const answerRemainingRef = useRef<number | null>(null);
  const [damagePopup, setDamagePopup] = useState<DamagePopupData | null>(null);
  const damagePopupIdRef = useRef<number>(0);
  // 戰鬥判定（HP 歸零即勝）：避免 useCallback 閉包讀到舊 state，以及同一回合被答題／超時重複結算
  /** 本場已說過的 HP 門檻台詞 */
  const triggeredHpThresholdsRef = useRef<Set<number>>(new Set());
  /** 本回合已在結算（答對／答錯／超時），在下一回合開始前不再接受其他結算 */
  const turnLockRef = useRef<boolean>(false);
  /** 本場已分勝負（勝利或戰敗演出進行中），不再出題、不再結算 */
  const battleEndedRef = useRef<boolean>(false);
  const resetBattleRefs = useCallback(() => {
    battleEndedRef.current = false; turnLockRef.current = false;
    triggeredHpThresholdsRef.current = new Set();
    answerRemainingRef.current = null; setDamagePopup(null);
  }, []);
  const settleStamina = useCallback((outcome: 'victory' | 'defeat' | 'exit') => {
    const shouldRefund = staminaGuardRef.current.settle(outcome);
    if (outcome !== 'defeat') clearStaminaRefundable();
    return shouldRefund;
  }, []);
  /** 嘗試取得本回合的結算權；成功時同時停止倒數計時器 */
  const acquireTurnLock = useCallback(() => {
    if (turnLockRef.current || battleEndedRef.current) return false;
    turnLockRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    return true;
  }, []);
  /** 取出這一擊越過、而本場尚未說過的門檻台詞（由高至低；一擊越過多個門檻時逐一說出，每個只說一次） */
  const collectThresholdSpeeches = useCallback((level: LevelConfig, newEnemyHp: number): string[] => {
    const pct = newEnemyHp / BOSS_MAX_HP;
    const speeches: string[] = [];
    for (const t of BOSS_HP_SPEECH_THRESHOLDS) {
      if (pct <= t / 100 && !triggeredHpThresholdsRef.current.has(t)) {
        triggeredHpThresholdsRef.current.add(t);
        const msg = level.hpThresholds?.[t];
        if (msg) speeches.push(msg);
      }
    }
    return speeches;
  }, []);
  /** 演出中（載入動畫、Boss 台詞、Boss 受擊）：暫停 idle 飛劍，見 src/lib/cinematic.ts */
  const isCinematicActive = deriveCinematicActive({
    isBooting,
    isQuestionsFetching,
    isBattleIntro: gameState.status === GameStatus.PLAYING && isBattleIntroStage(introStage),
    isBossSpeaking: bossSpeechMsg !== null,
    isBossHitReaction: gameState.status === GameStatus.PLAYING && enemyAnimState === 'hurt',
  });
  useCinematicAttribute(isCinematicActive);
  // Boss 說話期間（開場、門檻、勝利台詞）通關計時暫停，與回合倒數相同
  const battleRecorder = useBattleRecorder({ status: gameState.status, isPaused: gameState.isPaused, isTurnActive: gameState.isTurnActive, isAutoPlaying, isBossSpeaking: bossSpeechMsg !== null }, handleVictoryClear);
  const currentQuestion = useMemo(() => battleQuestions[gameState.currentQuestionIndex] || null, [battleQuestions, gameState.currentQuestionIndex]);
  const timeScale = useMemo(() => isAutoPlaying ? 1.0 / speedMultiplier : 1.0, [isAutoPlaying, speedMultiplier]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      if (theme === 'dark') root.classList.add('dark-mode');
      else root.classList.remove('dark-mode');
    }
  }, [theme]);

  const clearVisualEffects = useCallback(() => {
    setIsScreenShaking(false); setIsScreenFlash(false); setIsBossSlashActive(false);
    setIsPlayerSlashActive(false); setIsPlayerHurt(false); setIsInputErrorDimmed(false);
    setIsConverging(false); setIsSlotsFalling(false); setEnemyAnimState('idle');
    setBossSpeechMsg(null); setIsSpeechDimmed(false); setLastImpactIndex(null);
    setIsFatalDefeat(false); setIsInkActive(false);
  }, []);

  const resetToStart = useCallback(() => {
    // 驀然回首／還於舊都／孰能無惑：中途離開或離開結算畫面 — 不返還體力
    settleStamina('exit');
    setStaminaRefunded(false);
    setIsInkActive(false);
    setIsPlayerHurt(false);
    setIsScreenFadingOut(true);

    setTimeout(() => {
      gameInstanceIdRef.current++;
      if (timerRef.current) clearInterval(timerRef.current);
      resetBattleRefs();

      clearVisualEffects();
      setIntroStage('none');
      setIsDemoMode(false);
      setIsAutoPlaying(false);
      setSpeedMultiplier(1);
      setShowInputPadUI(false);
      setShowQuestionUI(false);
      setShowSlotsUI(false);
      setSkillPanelShown(false);
      setShuffledOptions([]);
      setCurrentLevel(null);
      setLevelQuestions([]);
      battleQuestionsRef.current = [];
      setBattleQuestions([]);
      setHomePause(false);

      setGameState(p => ({
        ...p,
        playerHp: 0,
        enemyHp: BOSS_MAX_HP,
        currentQuestionIndex: 0,
        timer: TURN_TIME,
        isTurnActive: false,
        status: GameStatus.MENU,
        userInput: [],
        usedIndices: new Set(),
        isPaused: false
      }));

      setTimeout(() => {
        setIsScreenFadingOut(false);
      }, 50);
    }, 200);
  }, [clearVisualEffects, resetBattleRefs, settleStamina]);

  const triggerBossSpeechAction = useCallback(async (msg: string, id: number) => {
    if (gameInstanceIdRef.current !== id) return;
    setBossSpeechMsg(msg);
    const scale = timeScale;
    setBgDimDuration(Math.floor(400 * scale));
    setIsSpeechDimmed(true);
    await new Promise(r => setTimeout(r, 2000 * scale * 0.8));
    if (gameInstanceIdRef.current !== id) return;
    setIsSpeechDimmed(false);
    await new Promise(r => setTimeout(r, 2000 * scale * 0.2));
    if (gameInstanceIdRef.current !== id) return;
    setBossSpeechMsg(null);
    await new Promise(r => setTimeout(r, 100));
  }, [timeScale]);

  const handleOptionClickAction = useCallback((char: string, idx: number) => {
    // 記錄點選當刻的精確剩餘秒數（最後一次點選即為完成作答的時刻）；暫停時計時器不走，不更新
    const gs = gameStateRef.current;
    if (gs.isTurnActive && !gs.isPaused) {
      const elapsed = Math.min(Math.max((performance.now() - lastTickAtRef.current) / (1000 * timeScale), 0), 1);
      answerRemainingRef.current = Math.min(Math.max(gs.timer - elapsed, 0), TURN_TIME);
    }
    setGameState(p => {
      const n = p.userInput.findIndex(s => !s.char);
      if (n === -1 || p.usedIndices.has(idx)) return p;
      const nInput = [...p.userInput];
      nInput[n] = { char, originIndex: idx };
      setLastImpactIndex(n);
      setTimeout(() => setLastImpactIndex(null), 400 * timeScale);
      return { ...p, userInput: nInput, usedIndices: new Set(p.usedIndices).add(idx) };
    });
  }, [timeScale]);

  const startLevelSequence = useCallback(async (index: number, id: number, isRetry: boolean = false) => {
    if (gameInstanceIdRef.current !== id || battleEndedRef.current) return;
    const target = battleQuestionsRef.current[index];
    if (!target || !target.answers || target.answers.length === 0) return;

    clearVisualEffects();
    if (!isRetry) { setShowInputPadUI(false); setShowQuestionUI(false); setShowSlotsUI(false); }
    await new Promise(r => setTimeout(r, (isRetry ? 50 : 100) * timeScale));
    if (gameInstanceIdRef.current !== id) return;

    // 格數 = 預填格 + 最長的可接受答案字數（較短的答案在輸入完成時即判定正確）
    const maxLen = editableCellCount(target.answers);
    const prefillSlots = (target.prefill ?? []).map(c => ({ char: c, originIndex: null, locked: true }));

    setIsInputPadExiting(false);
    answerRemainingRef.current = null;
    setGameState(prev => ({
      ...prev, timer: TURN_TIME, isTurnActive: false,
      userInput: [...prefillSlots, ...Array(maxLen).fill(null).map(() => ({ char: "", originIndex: null }))],
      usedIndices: new Set()
    }));

    setShuffledOptions(target.options && target.options.length > 0 ? target.options : buildQuestionBoard(target));

    if (!skillPanelShown) setSkillPanelShown(true);
    setShowInputPadUI(true);
    await new Promise(r => setTimeout(r, (isRetry ? 50 : 250) * timeScale));
    if (gameInstanceIdRef.current !== id) return;

    if (battleEndedRef.current) return;
    setSuppressExitAnim(isRetry);
    setShowQuestionUI(true);
    setShowSlotsUI(true);
    turnLockRef.current = false; // 新回合開始，重新接受結算
    answerRemainingRef.current = null;
    setGameState(p => ({ ...p, isTurnActive: true }));
  }, [skillPanelShown, timeScale, clearVisualEffects]);

  const fetchQuestionsForLevel = async (level: LevelConfig, delayMs = 0) => {
    setIsQuestionsFetching(true);
    try {
      // 入陣小視窗須立刻可按「深入不毛」：預設不再假裝感應延遲（delayMs 可覆寫）
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

      const filtered: Question[] = FULL_QUESTION_BANK
        .filter(q => level.sheetIds.includes(Number(q.id)))
        .map(q => ({
          ...q,
          options: buildQuestionBoard(q)
        }))
        .sort((a, b) => a.id - b.id);

      setLevelQuestions(filtered);
    } catch (e) {
      console.error("題庫讀取失敗:", e);
      alert("題庫讀取失敗，請檢查題庫文件格式");
    } finally {
      setIsQuestionsFetching(false);
    }
  };

  const startGame = useCallback(async (testMode: boolean = false, waitBeforeIntro?: Promise<void>) => {
    if (!currentLevel || levelQuestions.length === 0 || isQuestionsFetching) return;

    const instanceId = ++gameInstanceIdRef.current;
    setVictoryExpGained(0);
    battleRecorder.begin(currentLevel.id, !testMode);
    audioManagerRef.current?.resetBattleMusic();
    try {
      setIsDemoMode(testMode); setIsAutoPlaying(false); setSpeedMultiplier(1);
      resetBattleRefs();
      // 每場戰鬥（含再戰）重新洗牌；同一場內依次出題，不重複
      const order = newBattleOrder(levelQuestions);
      battleQuestionsRef.current = order;
      setBattleQuestions(order);
      setGameState(prev => ({
        ...prev, status: GameStatus.PLAYING, isTurnActive: false, enemyHp: BOSS_MAX_HP, maxEnemyHp: BOSS_MAX_HP,
        playerHp: 0, maxPlayerHp: MAX_HP, currentQuestionIndex: 0
      }));
      if (waitBeforeIntro) {
        // 入陣轉場：主頁滑出、交接完成後，才開始原有開場動畫
        setIntroStage('none');
        await waitBeforeIntro;
        if (gameInstanceIdRef.current !== instanceId) return;
      }
      setIntroStage('starting');
      await new Promise(r => setTimeout(r, 50));
      if (gameInstanceIdRef.current !== instanceId) return;
      const introSequence = [
        { stage: 'gold_line', delay: ANIMATION_CONFIG.INTRO.GOLD_LINE },
        { stage: 'bg', delay: ANIMATION_CONFIG.INTRO.BG_FADE },
        { stage: 'enemy', delay: ANIMATION_CONFIG.INTRO.BOSS_SPRITE },
        { stage: 'boss_name_show', delay: ANIMATION_CONFIG.INTRO.BOSS_NAME },
        { stage: 'enemy_hp', delay: ANIMATION_CONFIG.INTRO.ENEMY_HP },
        { stage: 'player_hp', delay: ANIMATION_CONFIG.INTRO.PLAYER_HP },
        { stage: 'input_pad', delay: ANIMATION_CONFIG.INTRO.INPUT_PAD },
        { stage: 'ready', delay: ANIMATION_CONFIG.INTRO.READY_START }
      ];
      let lastTime = 0;
      for (const step of introSequence) {
        await new Promise(r => setTimeout(r, step.delay - lastTime));
        if (gameInstanceIdRef.current !== instanceId) return;
        setIntroStage(step.stage);
        if (step.stage === 'player_hp') { setGameState(p => ({ ...p, playerHp: MAX_HP })); }
        lastTime = step.delay;
      }
      await new Promise(r => setTimeout(r, 400));
      if (gameInstanceIdRef.current !== instanceId) return;
      await triggerBossSpeechAction(currentLevel.startSpeech || "", instanceId);
      setIntroStage('playing');
      battleRecorder.startClock();
      await startLevelSequence(0, instanceId);
    } catch (e) { }
  }, [currentLevel, levelQuestions, isQuestionsFetching, triggerBossSpeechAction, startLevelSequence, battleRecorder, resetBattleRefs]);

  /** 勝利演出：門檻／勝利台詞 → 結算寫入 EXP（guest／Firebase）→ VICTORY 畫面 */
  const runVictorySequence = useCallback(async (id: number, preSpeeches: string[] = []) => {
    if (!currentLevel) return;
    for (const msg of preSpeeches) {
      await triggerBossSpeechAction(msg, id);
      if (gameInstanceIdRef.current !== id) return;
    }
    await triggerBossSpeechAction(currentLevel.victorySpeech || "", id);
    if (gameInstanceIdRef.current !== id) return;
    settleStamina('victory');
    setStaminaRefunded(false);
    // 結算當刻入帳：先 takeVictoryClear，再 recordLevelClear（與 useBattleRecorder 備援互斥，只寫一次）
    const clear = battleRecorder.takeVictoryClear();
    let gained = 0;
    if (clear) {
      try {
        const outcome = await recordLevelClear(clear);
        if (outcome?.recorded) gained = outcome.expGained;
      } catch (e) {
        console.error('通關紀錄寫入失敗', e);
      }
    }
    if (gameInstanceIdRef.current !== id) return;
    setVictoryExpGained(gained);
    setGameState(p => ({ ...p, status: GameStatus.VICTORY, isTurnActive: false }));
  }, [currentLevel, triggerBossSpeechAction, settleStamina, battleRecorder]);

  /** 戰敗演出：沿用原有戰敗流程（戰敗台詞 → 墨染 → GAME_OVER 畫面） */
  const runDefeatSequence = useCallback(async (id: number) => {
    if (!currentLevel) return;
    setIsFatalDefeat(true); setBossSpeechMsg(currentLevel.defeatSpeech || ""); setIsSpeechDimmed(true);
    await new Promise(r => setTimeout(r, 800));
    if (gameInstanceIdRef.current !== id) return;
    setIsInkActive(true);
    await new Promise(r => setTimeout(r, 1750));
    if (gameInstanceIdRef.current !== id) return;
    let refunded = false;
    if (settleStamina('defeat')) {
      try {
        const r = await refundUserStamina();
        refunded = r.ok === true;
      } catch (e) {
        console.error('體力返還失敗', e);
      }
    }
    if (gameInstanceIdRef.current !== id) return;
    setStaminaRefunded(refunded);
    setGameState(x => ({ ...x, status: GameStatus.GAME_OVER, isTurnActive: false }));
  }, [currentLevel, settleStamina]);

  const onCorrectAnswer = useCallback(async () => {
    if (!currentLevel) return;
    if (!acquireTurnLock()) return;
    const id = gameInstanceIdRef.current;
    // 速度傷害：以完成作答當刻的剩餘秒數計算（不受其後動畫延遲影響）
    const remainingSeconds = answerRemainingRef.current ?? gameStateRef.current.timer;
    answerRemainingRef.current = null;
    const { damage, multiplier: speedMult } = computeDamageDetail({ baseDamage: CORRECT_ANSWER_DAMAGE, remainingSeconds, totalSeconds: TURN_TIME });
    battleRecorder.noteCorrectAnswer(); // 答對計數（經驗改為通關 +100）
    try {
      setGameState(p => ({ ...p, isTurnActive: false }));
      setIsConverging(true); setIsInputPadExiting(true);
      await new Promise(r => setTimeout(r, 400 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      setGameState(p => ({ ...p, userInput: p.userInput.map(s => ({ ...s, char: "" })) }));
      await new Promise(r => setTimeout(r, 200 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      setIsConverging(false); setEnemyAnimState('hurt'); setIsScreenShaking(true); setIsPlayerSlashActive(true);
      const popupId = ++damagePopupIdRef.current;
      setDamagePopup({ id: popupId, damage, multiplier: speedMult });
      setTimeout(() => setDamagePopup(p => (p && p.id === popupId ? null : p)), 1400 * timeScale);
      const newHp = Math.max(0, gameStateRef.current.enemyHp - damage);
      const isBossDefeated = newHp <= 0;
      if (isBossDefeated) {
        battleEndedRef.current = true; // 立即封鎖計時器／其他結算
        battleRecorder.markVictoryDecided(); // 勝負已定：停止通關計時
      }
      setGameState(p => ({ ...p, enemyHp: newHp }));
      const thresholdSpeeches = collectThresholdSpeeches(currentLevel, newHp);
      const questionIndex = gameStateRef.current.currentQuestionIndex;
      const questionsExhausted = isQuestionsExhausted(battleQuestionsRef.current, questionIndex);
      // 收起題目與格子，並保留原有的命中演出時間
      setTimeout(() => { setShowQuestionUI(false); setShowSlotsUI(false); }, 200 * timeScale);
      await new Promise(r => setTimeout(r, 1000 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      clearVisualEffects();

      // Boss HP 歸零即勝（即使仍有題目）；0% 等門檻台詞先說，再接勝利台詞
      if (isBossDefeated) {
        await runVictorySequence(id, thresholdSpeeches);
        return;
      }

      for (const msg of thresholdSpeeches) {
        await triggerBossSpeechAction(msg, id);
        if (gameInstanceIdRef.current !== id) return;
      }

      // 題目用盡而 Boss 仍未倒下：依 QUESTIONS_EXHAUSTED_POLICY（老師決定為戰敗）
      if (questionsExhausted && QUESTIONS_EXHAUSTED_POLICY !== 'loop') {
        battleEndedRef.current = true;
        if (QUESTIONS_EXHAUSTED_POLICY === 'victory') {
          battleRecorder.markVictoryDecided();
          await runVictorySequence(id);
        } else {
          await runDefeatSequence(id);
        }
        return;
      }
      const nextIndex = questionsExhausted ? 0 : questionIndex + 1; // 'loop'：由第一題重新開始
      setGameState(p => ({ ...p, currentQuestionIndex: nextIndex }));
      startLevelSequence(nextIndex, id);
    } catch (e) {}
  }, [currentLevel, timeScale, acquireTurnLock, collectThresholdSpeeches, runVictorySequence, runDefeatSequence, startLevelSequence, triggerBossSpeechAction, clearVisualEffects, battleRecorder]);

  /**
   * Boss 反擊（答錯或超時）：玩家損失 WRONG_ANSWER_DAMAGE HP；HP 歸零才戰敗，否則重答同一題。
   * damageOverride 只供測試模式的「直接戰敗」按鈕使用。
   */
  const triggerEnemyAttack = useCallback(async (isTimeout = false, damageOverride?: number) => {
    if (!currentLevel) return;
    if (!acquireTurnLock()) return;
    const id = gameInstanceIdRef.current;
    try {
      setGameState(p => ({ ...p, isTurnActive: false }));
      setIsInputErrorDimmed(true); setSuppressExitAnim(false);
      await new Promise(r => setTimeout(r, 500 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      const attackStyle = getBossAttackStyle(currentLevel);
      const newPlayerHp = playerHpAfterBossHit(gameStateRef.current.playerHp, damageOverride ?? WRONG_ANSWER_DAMAGE);
      if (newPlayerHp <= 0) battleEndedRef.current = true;
      setEnemyAnimState('attack');
      if (isWeaponAttackStyle(attackStyle)) {
        // 分層武器攻擊（飛劍／飛劍穿梭 X 斬）：一段命中；扣血與命中特效同步（時間點與 BattleArea 的動畫共用 types.ts 的時間表）
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        if (attackStyle === 'xSlash') {
          // X 斬：第一刀劈完 → 震屏＋紅閃（只有演出，不扣血）；第二刀（impact）照原流程扣血，並再震一次
          await new Promise(r => setTimeout(r, X_SLASH_TIMING.impact1 * timeScale));
          if (gameInstanceIdRef.current !== id) return;
          setIsScreenFlash(true); setTimeout(() => setIsScreenFlash(false), 150 * timeScale);
          if (!reduceMotion) { setIsScreenShaking(true); setTimeout(() => setIsScreenShaking(false), 320 * timeScale); } // 震完收掉，第二刀才能再觸發
          await new Promise(r => setTimeout(r, (X_SLASH_TIMING.impact - X_SLASH_TIMING.impact1) * timeScale));
        } else {
          await new Promise(r => setTimeout(r, weaponAttackTiming(attackStyle).impact * timeScale));
        }
        if (gameInstanceIdRef.current !== id) return;
        setIsBossSlashActive(true); setIsScreenFlash(true); setIsPlayerHurt(true);
        if (!reduceMotion) setIsScreenShaking(true);
        setGameState(p => ({ ...p, playerHp: newPlayerHp }));
        setTimeout(() => setIsScreenFlash(false), 150 * timeScale);
        await new Promise(r => setTimeout(r, 300 * timeScale));
        if (gameInstanceIdRef.current !== id) return;
        setIsSlotsFalling(true);
        await new Promise(r => setTimeout(r, 300 * timeScale));
        if (gameInstanceIdRef.current !== id) return;
        setShowSlotsUI(false); setShowQuestionUI(false);
      } else {
        await new Promise(r => setTimeout(r, 640 * timeScale));
        if (gameInstanceIdRef.current !== id) return;
        setIsBossSlashActive(true); setIsScreenShaking(true); setIsScreenFlash(true); setIsPlayerHurt(true);
        setTimeout(() => setIsScreenFlash(false), 150 * timeScale);
        if (attackStyle !== 'chariotCharge') {
          await new Promise(r => setTimeout(r, 640 * timeScale));
          if (gameInstanceIdRef.current !== id) return;
          setIsScreenShaking(false); setTimeout(() => setIsScreenShaking(true), 10);
          setIsScreenFlash(true); setTimeout(() => setIsScreenFlash(false), 150 * timeScale);
        }
        setIsSlotsFalling(true);
        await new Promise(r => setTimeout(r, 300 * timeScale));
        if (gameInstanceIdRef.current !== id) return;
        setShowSlotsUI(false); setShowQuestionUI(false);
        setGameState(p => ({ ...p, playerHp: newPlayerHp }));
      }
      await new Promise(r => setTimeout(r, 1000 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      if (newPlayerHp <= 0) {
        await runDefeatSequence(id);
        return;
      }
      setGameState(p => ({ ...p, userInput: p.userInput.map(s => (s.locked ? s : { ...s, char: "" })), usedIndices: new Set() }));
      await new Promise(r => setTimeout(r, 400 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      clearVisualEffects();
      startLevelSequence(gameStateRef.current.currentQuestionIndex, id, true);
    } catch (e) {}
  }, [currentLevel, timeScale, acquireTurnLock, runDefeatSequence, startLevelSequence, clearVisualEffects]);

  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING && gameState.isTurnActive && isAutoPlaying && !gameState.isPaused && !bossSpeechMsg && currentQuestion) {
      const autoPlayTimeout = window.setTimeout(() => {
        const nextSlotIndex = gameState.userInput.findIndex(s => !s.char);
        if (nextSlotIndex !== -1 && currentQuestion.answers.length > 0) {
          // 預設以第一個答案為自動填入目標（扣除前面的預填格）
          const editableIndex = gameState.userInput.slice(0, nextSlotIndex).filter(s => !s.locked).length;
          const targetChar = Array.from(currentQuestion.answers[0])[editableIndex];
          if (targetChar) {
            // 在選項中尋找尚未被使用的目標字元
            const optionIndex = shuffledOptions.findIndex((char, idx) => char === targetChar && !gameState.usedIndices.has(idx));
            if (optionIndex !== -1) {
              handleOptionClickAction(targetChar, optionIndex);
            }
          }
        }
      }, 500 * timeScale); // 根據速度倍率調整自動填入的間隔
      return () => clearTimeout(autoPlayTimeout);
    }
  }, [gameState.status, gameState.isTurnActive, isAutoPlaying, gameState.isPaused, bossSpeechMsg, currentQuestion, gameState.userInput, gameState.usedIndices, shuffledOptions, handleOptionClickAction, timeScale]);

  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING && gameState.isTurnActive && !gameState.isPaused && !bossSpeechMsg) {
      lastTickAtRef.current = performance.now();
      timerRef.current = window.setInterval(() => {
        lastTickAtRef.current = performance.now();
        setGameState(p => {
          const newTime = p.timer <= 1 ? 0 : p.timer - 1;
          if (newTime <= 10 && newTime > 0) { setIsTimerPulse(true); setTimeout(() => setIsTimerPulse(false), 500 * timeScale); }
          return { ...p, timer: newTime };
        });
      }, 1000 * timeScale);
    }
    return () => clearInterval(timerRef.current!);
  }, [gameState.status, gameState.isTurnActive, gameState.isPaused, bossSpeechMsg, timeScale]);

  useEffect(() => { if (gameState.timer === 0 && gameState.isTurnActive) triggerEnemyAttack(true); }, [gameState.timer, gameState.isTurnActive, triggerEnemyAttack]);

  useEffect(() => {
    if (!gameState.isTurnActive || gameState.isPaused || bossSpeechMsg || !currentQuestion) return;

    // 判定見 src/utils/answerMatch.ts：預填格不參與；與任一可接受答案完全相同即正確；
    // 可輸入格全部填滿仍不相符才判錯（較短的答案無須填滿所有格子）
    const result = evaluateInput(gameState.userInput, currentQuestion.answers);
    if (result === 'correct') {
      onCorrectAnswer();
    } else if (result === 'wrong') {
      triggerEnemyAttack(false);
    }
  }, [gameState.userInput, gameState.isTurnActive, gameState.isPaused, currentQuestion, onCorrectAnswer, triggerEnemyAttack, bossSpeechMsg]);

  const handleLogin = useCallback(() => {
    if (!isAuthorized) return;
    audioManagerRef.current?.unlockAudio();
    setIsLoginExiting(true);
    setTimeout(() => {
      setIsLoggedIn(true);
    }, 1000);
  }, [isAuthorized]);

  // Boss 立繪版面＋落地場景（cover 填滿戰鬥區；背景與立繪同一 transform）
  const battleImg = currentLevel ? (currentLevel.battleImg ?? currentLevel.bossImg) : '';
  const battleKey = battleAnchorKey(battleImg);
  const battleAnchor = BATTLE_ANCHORS[battleKey];
  const battleScene = BATTLE_SCENES[battleKey] ?? null;
  // 入陣無縫轉場：戰鬥背景／人物／呼吸沿用主頁預覽（同關、同尺寸時）
  const activeHomeBox = homeBox && currentLevel && homeBox.levelId === currentLevel.id && Math.abs(homeBox.W - appSize.w) < 1 && Math.abs(homeBox.H - appSize.h) < 1 ? homeBox : null;
  const grounded = useMemo(
    () => battleScene ? computeGroundedBattle(battleAnchor, battleScene, appSize.w, appSize.h, activeHomeBox, battleInsets) : null,
    [battleAnchor, battleScene, appSize.w, appSize.h, activeHomeBox, battleInsets]
  );
  const battleLayout = useMemo(
    () => grounded?.layout ?? computeBattleLayout(battleAnchor, appSize.w, appSize.h),
    [grounded, battleAnchor, appSize.w, appSize.h]
  );
  const battleSceneBox = grounded?.sceneBox ?? null;

  // ── 入陣無縫轉場 ──
  // 主頁出現時先在背景載入戰鬥程式碼分塊
  const battleChunksWarmRef = useRef(false);
  useEffect(() => {
    if (!(isAuthorized && isLoggedIn && gameState.status === GameStatus.MENU) || battleChunksWarmRef.current) return;
    battleChunksWarmRef.current = true;
    const id = setTimeout(() => { preloadBattleChunks(); }, 1200);
    return () => clearTimeout(id);
  });

  // 入陣：先跳出「深入不毛／驀然回首」小視窗（狀態 LOADING：讀題庫；主頁音樂照常播放），同時背景預載戰鬥資源。
  // 視窗開著時主頁預覽動畫原地暫停、陀螺儀凍結（取消後由同一位置繼續；深入不毛則由此進度接到戰鬥）
  const handleEnterLevel = useCallback((l: LevelConfig) => {
    if (enterPhase !== 'idle') return;
    setHomePause(true);
    setEnterFreeze(true);
    setEnterAssetsReady(false);
    setHomeBox(null);
    setCurrentLevel(l);
    setGameState(p => ({ ...p, status: GameStatus.LOADING }));
    fetchQuestionsForLevel(l, 0);
    Promise.all([preloadBattleImages(l), preloadBattleChunks()]).then(() => setEnterAssetsReady(true));
  }, [enterPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // 驀然回首：只關閉小視窗、留在主頁（不淡出整頁）；主頁音樂未曾停，預覽動畫與陀螺儀由暫停處繼續
  const handleEnterCancel = useCallback(() => {
    if (enterPhase !== 'idle') return;
    setHomePause(false);
    setEnterFreeze(false);
    setCurrentLevel(null);
    setLevelQuestions([]);
    setGameState(p => ({ ...p, status: GameStatus.MENU }));
  }, [enterPhase]);

  // 深入不毛：先扣體力（防連點），再開始無縫入陣；狀態轉為 PLAYING 時主頁音樂淡出、戰鬥音樂同時淡入
  const handleDeepIn = useCallback(async () => {
    if (enterPhase !== 'idle' || isQuestionsFetching) return;
    const attemptId = staminaGuardRef.current.tryBegin();
    if (attemptId == null) return;
    try {
      const result = await deductUserStamina();
      if (result.ok === false) {
        staminaGuardRef.current.failed(attemptId);
        if (result.reason === 'insufficient') {
          // 關閉入陣小視窗，避免與體力不足視窗兩層 overlay 互擋
          setHomePause(false);
          setEnterFreeze(false);
          setCurrentLevel(null);
          setLevelQuestions([]);
          setGameState(p => ({ ...p, status: GameStatus.MENU }));
          setStaminaModalFullInMs(result.fullInMs ?? 6 * 60 * 1000);
        }
        return;
      }
      staminaGuardRef.current.charged(attemptId);
      setStaminaRefunded(false);
      setEnterFreeze(true);
      setEnterReduced(prefersReducedMotion());
      setEnterPhase('prep');
    } catch (e) {
      staminaGuardRef.current.failed(attemptId);
      console.error('體力扣除失敗', e);
    }
  }, [enterPhase, isQuestionsFetching]);

  // 題目＋圖片＋程式碼就緒 → 量測主頁場景 → 戰鬥頁在主頁底下掛好（背景／人物與主頁同位置），開場等交接完成才播
  useEffect(() => {
    if (enterPhase !== 'prep' || !enterAssetsReady || isQuestionsFetching || levelQuestions.length === 0 || !currentLevel) return;
    const sc = BATTLE_SCENES[battleAnchorKey(currentLevel.battleImg ?? currentLevel.bossImg)];
    setHomeBox(sc ? measureHomeScene(appRootRef.current, currentLevel.id, sc.bgW) : null);
    const exitDone = new Promise<void>(res => { exitDoneRef.current = res; });
    setEnterHold(true);
    setEnterPhase('mount');
    startGame(false, exitDone);
  }, [enterPhase, enterAssetsReady, isQuestionsFetching, levelQuestions, currentLevel, startGame]);

  // 戰鬥頁真正畫好（沒有 Suspense fallback）後，主頁才開始滑出
  useEffect(() => {
    if (enterPhase !== 'mount') return;
    let raf = 0, cancelled = false;
    const t0 = performance.now();
    const tick = () => {
      if (cancelled) return;
      const el = battleClipRef.current;
      const pending = !el || !el.querySelector('[data-boss-sprite], .global-scene-bg') || !!el.querySelector('[data-soft-fallback]');
      if (pending && performance.now() - t0 < 2000) { raf = requestAnimationFrame(tick); return; }
      raf = requestAnimationFrame(() => {
        if (cancelled) return;
        // 主頁動畫進度（呼吸、飛劍路徑／浮動）原樣接到戰鬥頁，之後同一 timeline 同速前進
        syncHeroAnimations(appRootRef.current?.querySelector('.home-hero') ?? null, battleClipRef.current);
        // 戰鬥已掛好並對齊相位；解除暫停，進入 exit：先場景淡出再 HUD 滑走
        setHomePause(false);
        setEnterPhase('exit');
      });
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [enterPhase]);

  useEffect(() => {
    if (enterPhase === 'exit') {
      // 等主頁 UI 的滑出／淡出動畫真正播完才撤下主頁（主執行緒忙時動畫會晚開始，不能只靠計時），最多多等 600ms
      let cancelled = false;
      const names = new Set(['eeUp', 'eeDown', 'eeFadeDown', 'eeFade']);
      const raf = requestAnimationFrame(() => {
        const anims = document.getAnimations().filter(an => names.has((an as Animation & { animationName?: string }).animationName ?? ''));
        const all = Promise.all(anims.map(an => an.finished.catch(() => undefined)));
        const cap = new Promise(r => setTimeout(r, enterExitTotalMs(enterReduced) + 600));
        Promise.race([all, cap]).then(() => { if (!cancelled) setEnterPhase('done'); });
      });
      return () => { cancelled = true; cancelAnimationFrame(raf); };
    }
    if (enterPhase === 'done') {
      exitDoneRef.current?.(); exitDoneRef.current = null;
      const id = setTimeout(() => { setEnterPhase('idle'); setEnterFreeze(false); }, 50);
      return () => clearTimeout(id);
    }
  }, [enterPhase, enterReduced]);

  useEffect(() => {
    if (!enterHold) return;
    if (gameState.status !== GameStatus.PLAYING || !['none', 'starting', 'gold_line', 'bg'].includes(introStage)) setEnterHold(false);
  }, [enterHold, gameState.status, introStage]);

  const enterMenuHeld = enterPhase === 'prep' || enterPhase === 'mount' || enterPhase === 'exit' || gameState.status === GameStatus.LOADING;
  const showMenuScreen = isAuthorized && (isLoggedIn || isLoginExiting) && (gameState.status === GameStatus.MENU || gameState.status === GameStatus.CHARACTER_DETAIL || enterMenuHeld);

  // 底層畫框顏色：顯示不透明深色全屏畫面時，底層改用相同深色，
  // 避免淺色主題的米色底 (--app-bg) 在圓角抗鋸齒邊緣透出
  const frameBg =
    isBooting ? '#0a0a0a' :
    (!isLoggedIn && !isLoginExiting) ? '#0f0f0f' :
    (isLoggedIn && gameState.status === GameStatus.GAME_OVER) ? '#1a0000' :
    // 戰鬥中改深色墊：speech／attack dim 的 filter 若貼 --app-bg 宣紙色，右緣會抗鋸齒出 ≈1px 亮縫
    (isLoggedIn && (gameState.status === GameStatus.PLAYING || enterHold)) ? '#0a0a0a' :
    'var(--app-bg)';

  return (
    <div ref={appRootRef} className={`w-full h-full relative transition-all duration-300 ${isPlayerHurt ? 'bg-red-950/20' : ''} ${isScreenShaking ? 'shake-active' : ''}`} style={{ backgroundColor: frameBg }}>
      <AudioManager
        ref={audioManagerRef}
        status={gameState.status}
        bgmEnabled={bgmEnabled && isAppVisible}
        bgmVolume={bgmVolume}
        isBooting={isBooting}
        isLoggedIn={isLoggedIn}
        isPaused={gameState.isPaused}
      />

      {isBooting && <BootLoadingMask assets={preloadAssets} onComplete={() => setIsBooting(false)} />}

      {!isLoggedIn && (
        <LoginGate onLogin={handleLogin} isExiting={isLoginExiting} authState={authState} />
      )}

      {isAuthorized && !isGuest && isLoggedIn && surnameState?.ready && (surnameEditorOpen || surnameState.source === 'pending') && (
        <Suspense fallback={<SoftFallback />}>
          <SurnamePicker
            key={`${surnameEditorOpen ? 'settings' : 'first'}-${surnameState.options.join('')}-${surnameState.manual}`}
            state={surnameState}
            mode={surnameEditorOpen ? 'settings' : 'first'}
            onClose={() => setSurnameEditorOpen(false)}
          />
        </Suspense>
      )}

      <InkSplash active={isInkActive} />
      <div className={`absolute inset-0 z-[8000] pointer-events-none transition-opacity duration-150 ${isScreenFlash ? 'opacity-50 bg-red-600' : 'opacity-0'}`} />

      {/* 戰鬥頁容器（入陣轉場時用來確認已畫好；不建立堆疊環境） */}
      <div ref={battleClipRef} className="battle-clip absolute inset-0 overflow-hidden" style={{ backgroundColor: (gameState.status === GameStatus.PLAYING || enterHold) ? '#0a0a0a' : undefined }}>
      {/* 無落地場景資料時，沿用舊式獨立背景；有 BATTLE_SCENES 時改由 BattleArea 與立繪共用容器 */}
      {!battleScene && (
        <div className={`global-scene-bg battle-scene-layer absolute top-0 left-0 w-full h-[62%] z-[0] ${((enemyAnimState === 'attack' && currentLevel?.id !== 6) || isInputErrorDimmed || isSpeechDimmed) ? 'bg-attack-dim' : ''}`}
          style={{ backgroundImage: currentLevel ? `url("${currentLevel.bgImg}")` : 'none', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center 40%', backgroundColor: '#0a0a0a', opacity: gameState.status === GameStatus.PLAYING && (introStage !== 'none' || enterHold) ? 1 : 0, transition: 'opacity 0.7s, filter var(--bg-dim-duration, 400ms)', '--bg-dim-duration': `${bgDimDuration}ms` } as any} />
      )}

      <div className={`gold-divider ${gameState.status === GameStatus.PLAYING && introStage !== 'none' ? 'active' : ''}`} style={{ bottom: "var(--battle-floor, 40%)" }} />

      {isLoggedIn && gameState.status === GameStatus.PLAYING && (
        <Suspense fallback={<SoftFallback />}>
        <>
          <BattleArea levelId={currentLevel?.id || 0} enemyAnim={enemyAnimState} isBossSlashActive={isBossSlashActive} isPlayerSlashActive={isPlayerSlashActive} introStage={introStage} bossName={currentLevel?.bossName || ""} bossImg={battleImg} bgImg={currentLevel?.bgImg} speedMultiplier={speedMultiplier} attackStyle={getBossAttackStyle(currentLevel)} weaponLayers={currentLevel?.weaponLayers} layout={battleLayout} scene={battleScene} sceneBox={battleSceneBox} bgDimmed={((enemyAnimState === 'attack' && currentLevel?.id !== 6) || isInputErrorDimmed || isSpeechDimmed)} bgDimDuration={bgDimDuration} holdScene={enterHold} inheritBreathOrigin={activeHomeBox?.breatheOrigin ?? null} />
          <DamageMultiplierPopup popup={damagePopup} timeScale={timeScale} />
          <div className="battle-input-zone absolute bottom-0 left-0 w-full z-[80] overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', height: "var(--battle-floor, 40%)" }}>
            <InputPad options={shuffledOptions} usedIndices={gameState.usedIndices} disabled={!gameState.isTurnActive || gameState.isPaused} onOptionClick={handleOptionClickAction} isEnemyAttacking={isInputErrorDimmed} showUI={showInputPadUI} isExiting={isInputPadExiting} suppressExitAnim={suppressExitAnim} />
            <BossSpeech message={bossSpeechMsg} bossName={currentLevel?.bossName || ""} duration={isFatalDefeat ? 99999 : 2000 * timeScale} isFatal={isFatalDefeat} theme={theme} />
          </div>
          <div data-testid="player-hp-track" className="absolute left-0 w-full h-[10px] bg-black z-[90] transition-opacity duration-500" style={{ bottom: "calc(var(--battle-floor, 40%) + 1px)", opacity: ['player_hp','input_pad','ready','playing'].includes(introStage) && !isFatalDefeat ? 1 : 0 }}>
            <div className="hp-text">{Math.floor(gameState.playerHp)} / {gameState.maxPlayerHp}</div>
            <div className={`absolute inset-0 bg-[#28a745] z-[33] hp-bar-gpu-layer ${introStage === 'player_hp' ? 'hp-fill-slow' : 'hp-fill-hit'}`} style={{ transform: `scaleX(${gameState.playerHp/gameState.maxPlayerHp})` }} />
          </div>
          <div className={`absolute left-0 w-full h-[66px] z-[95] transition-all duration-700 transform ${skillPanelShown && !isFatalDefeat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ bottom: "calc(var(--battle-floor, 40%) + 16px)" }}>
            <SkillPanel />
            {isAutoPlaying && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-red-600 text-white text-[13px] font-black rounded-lg z-[110] animate-pulse border-2 border-white/40 shadow-[0_0_25px_red] tracking-[4px] uppercase">Auto Playing</div>}
          </div>
          <div className="absolute left-0 w-full h-[42px] z-[100] flex flex-col items-center" style={{ bottom: "calc(var(--battle-floor, 40%) + 82px)" }}>
             <SlotsInterface userInput={gameState.userInput} showUI={showSlotsUI && !isFatalDefeat} isFalling={isSlotsFalling} isConverging={isConverging} onSlotClear={idx => {
                setGameState(p => {
                  const s = p.userInput[idx]; if (!s || !s.char || s.locked || p.isPaused) return p; // 預填格不能清除
                  const nUsed = new Set(p.usedIndices); nUsed.delete(s.originIndex!);
                  const nInput = [...p.userInput]; nInput[idx] = { char: "", originIndex: null };
                  return { ...p, userInput: nInput, usedIndices: nUsed };
                });
             }} lastImpactIndex={lastImpactIndex} noExitAnim={suppressExitAnim} />
          </div>
          <div className="absolute left-0 w-full z-[110] flex flex-col items-center" style={{ bottom: "calc(var(--battle-floor, 40%) + 124px)" }}>
             <QuestionBox question={currentQuestion} showUI={showSlotsUI && !isFatalDefeat} noExitAnim={suppressExitAnim} />
          </div>
          <HUD gameState={gameState} introStage={introStage} onPause={() => setGameState(p => ({...p, isPaused: !p.isPaused}))} isTimerPulse={isTimerPulse} showInputPadUI={showInputPadUI && !isFatalDefeat} questionType={currentQuestion?.type} isDemoMode={isDemoMode} isAutoPlaying={isAutoPlaying} speedMultiplier={speedMultiplier} onAutoToggle={() => {
              if (!isAutoPlaying) { setIsAutoPlaying(true); setSpeedMultiplier(1); }
              else setIsAutoPlaying(false);
          }} onSpeedToggle={() => {
              // 倍數：1X → 3X → 5X → 1X（AUTO 開啟時才可見）
              setSpeedMultiplier(m => m === 1 ? 3 : m === 3 ? 5 : 1);
          }} onDebugVictory={() => { setVictoryExpGained(0); setGameState(p => ({ ...p, status: GameStatus.VICTORY })); }} onDebugGameOver={() => triggerEnemyAttack(true, MAX_HP)} isDimmed={introStage === 'none' || introStage === 'starting'} theme={theme} />
        </>
        </Suspense>
      )}
      </div>

      {isAuthorized && (
      <div className={`absolute inset-0 transition-opacity ${enterPhase !== 'idle' ? 'duration-0' : 'duration-700'} ${showMenuScreen ? 'z-[500] opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'}${enterPhase !== 'idle' ? ' enter-busy' : ''}${enterPhase === 'exit' ? (enterReduced ? ' enter-exit-reduced' : ' enter-exit') : ''}`}
        style={enterPhase === 'exit' ? { '--ee-dur': `${enterReduced ? ENTER_REDUCED_FADE_MS : ENTER_EXIT_MS}ms`, '--ee-item': `${ENTER_EXIT_ITEM_MS}ms`, '--ee-step': `${ENTER_EXIT_STAGGER_MS}ms`, '--ee-scene': `${enterReduced ? ENTER_REDUCED_SCENE_FADE_MS : ENTER_SCENE_FADE_MS}ms` } as React.CSSProperties : undefined}>
        <Suspense fallback={<SoftFallback />}>
        <MenuScreen
          levels={LEVELS_DATA}
          onSelect={handleEnterLevel}
          hudLive={showMenuScreen}
          viewingCharacter={gameState.status === GameStatus.CHARACTER_DETAIL ? viewingCharacter : null}
          onShowCharacterDetail={(char) => {
            setViewingCharacter(char);
            setGameState(p => ({ ...p, status: GameStatus.CHARACTER_DETAIL }));
          }}
          onBackFromDetail={() => {
            setViewingCharacter(null);
            setGameState(p => ({ ...p, status: GameStatus.MENU }));
          }}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          bgmEnabled={bgmEnabled}
          onBgmToggle={handleBgmToggle}
          bgmVolume={bgmVolume}
          onVolumeChange={handleVolumeChange}
        />
        </Suspense>
      </div>
      )}


      {isLoggedIn && gameState.status === GameStatus.GAME_OVER && (
        <Suspense fallback={<SoftFallback />}>
          <GameOverScreen onRestart={resetToStart} staminaRefunded={staminaRefunded} />
        </Suspense>
      )}

      {isLoggedIn && gameState.status === GameStatus.VICTORY && (
        <Suspense fallback={<SoftFallback />}>
          <VictoryScreen onRestart={resetToStart} expGained={victoryExpGained} />
        </Suspense>
      )}

      {staminaModalFullInMs != null && (
        <StaminaModal fullInMs={staminaModalFullInMs} onBack={() => setStaminaModalFullInMs(null)} />
      )}

      {isLoggedIn && (gameState.status === GameStatus.LOADING || (enterPhase !== 'idle' && enterPhase !== 'done')) && (
        // 深入不毛後小視窗留到主頁 UI 開始滑出才淡出：場景由主頁換成（同位置的）戰鬥畫面就在視窗的模糊遮罩底下完成
        <EnterModeModal level={currentLevel} isLoading={isQuestionsFetching} onConfirm={handleDeepIn} onCancel={handleEnterCancel}
          closing={enterPhase === 'exit'} busy={enterPhase !== 'idle'} />
      )}

      {isLoggedIn && gameState.isPaused && (
        <div className={`pause-overlay ${isPauseExiting ? 'animate-fadeOut' : 'show-pause'}`}>
          <div className="w-full flex flex-col items-center relative">
            <div className="relative inline-block px-10 mb-12">
              <span className="absolute top-[-26px] left-[-15px] text-[3.5rem] text-[#d4af37] text-4xl leading-none opacity-60 select-none pointer-events-none" style={{ fontFamily: 'serif' }}>「</span>
              <p className="text-white text-[16px] tracking-[4px] leading-[2.4] font-medium text-center whitespace-pre-wrap" style={{ textShadow: '0 0 20px rgba(255,255,255,0.4)', fontFamily: "'LXGW WenKai Mono TC', monospace", transform: 'translate(5px, 5px)' }}>{UI_STATIC_TEXT.PAUSE.quote}</p>
              <span className="absolute bottom-[-26px] right-[-15px] text-[3.5rem] text-[#d4af37] text-4xl leading-none opacity-60 select-none pointer-events-none" style={{ fontFamily: 'serif' }}>」</span>
            </div>
            <button className="modern-glass-btn active:scale-95 !bg-[#d4af37] !text-black !border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)] mb-6" onClick={() => { setIsPauseExiting(true); setTimeout(() => { setGameState(p => ({ ...p, isPaused: false })); setIsPauseExiting(false); }, 400); }}>{UI_STATIC_TEXT.PAUSE.resume}</button>
            <button className="modern-glass-btn active:scale-95 !bg-white/10 !border-white/20 !text-white" onClick={resetToStart}>{UI_STATIC_TEXT.PAUSE.quit}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
