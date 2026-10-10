
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameStatus, GameState, Question, QuestionType, LevelConfig } from './types';
import { TEXT_CORPUS, MAX_HP, TURN_TIME, ANIMATION_CONFIG, UI_STATIC_TEXT } from './constants';
import { LEVELS_DATA } from './data/levels';
import { parseBossSpeeches } from './src/utils/speechParser';
import { parseQuestionBank } from './src/utils/questionParser';
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
import BattleArea from './components/BattleArea';
import SkillPanel from './components/SkillPanel';
import InputPad from './components/InputPad';
import LoadingScreen from './components/LoadingScreen';
import GameOverScreen from './components/GameOverScreen';
import VictoryScreen from './components/VictoryScreen';
import HUD from './components/HUD';
import QuestionBox from './components/QuestionBox';
import SlotsInterface from './components/SlotsInterface';
import BossSpeech from './components/BossSpeech';
import MenuScreen from './components/MenuScreen';
import InkSplash from './components/InkSplash';
import BootLoadingMask from './components/BootLoadingMask';
import AudioManager, { AudioManagerHandle } from './components/AudioManager';
import { initializeTestUser } from './src/lib/firebase';

import { motion, AnimatePresence, useAnimation } from 'motion/react';

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

const LoginGate: React.FC<{ onLogin: () => void, isExiting: boolean }> = ({ onLogin, isExiting }) => {
  const bgControls = useAnimation();
  const charControls = useAnimation();
  const uiControls = useAnimation();
  const [isActivating, setIsActivating] = useState(false);

  const handleEnter = async (isTest = false) => {
    setIsActivating(true);
    
    // 重置起始狀態 (僅測試模式需要)
    if (isTest) {
      bgControls.set({ scale: 1, y: 0, rotateX: 0 });
      charControls.set({ scale: 1, y: 0, rotateX: 0, opacity: 1 });
    }

    // 同步執行背景與角色的動畫
    const duration = 2.5;
    
    // 第一階段：初始透視形變與緩慢放大
    await Promise.all([
      bgControls.start({
        rotateX: 15,
        scale: 1.2,
        transition: { duration, ease: "easeInOut" }
      }),
      charControls.start({
        rotateX: 5,
        y: "-7.5vh",
        scale: 1.1,
        transition: { duration, ease: "easeInOut" }
      })
    ]);

    // 第二階段：Dolly In (推軌鏡頭)
    const dollyDuration = 1.5;
    
    // 角色與背景同步開始放大，並將旋轉度數調整至 -5 度
    await Promise.all([
      charControls.start({
        scale: 1.43, // 1.1 (第一階段) * 1.3 (第二階段)
        y: "-16vh", // 修正 y 軸偏差確保過渡平滑，且位置下移以符合視覺需求
        rotateX: -5,
        transition: { duration: dollyDuration, ease: "easeIn" }
      }),
      bgControls.start({
        scale: 1.44, // 1.2 (第一階段) * 1.2 (第二階段)
        y: 25,
        transition: { duration: dollyDuration, ease: "easeIn" }
      })
    ]);

    if (isTest) {
      setIsActivating(false);
    } else {
      onLogin();
    }
  };

  return (
    <div className={`absolute inset-0 z-[99999] flex flex-col items-center justify-start bg-[#0f0f0f] transition-opacity duration-1000 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'} overflow-hidden`} style={{ perspective: "500px" }}>
      <motion.div 
        animate={bgControls}
        initial={{ scale: 1, y: "0%", rotateX: 0 }}
        style={{ originY: 1 }} // 第一步保持錨定底部產生梯形
        className="absolute inset-0 w-full h-full"
      >
        <img 
          src={`${import.meta.env.BASE_URL}resources/background/bg_loginscreen.png`} 
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
      </motion.div>

      <motion.div 
        animate={charControls}
        initial={{ scale: 1, y: "0%", opacity: 1 }}
        className="absolute inset-0 z-10 flex justify-center items-end pointer-events-none"
      >
        <img 
          src={`${import.meta.env.BASE_URL}resources/background/character1.png`} 
          alt="角色" 
          className="h-[52%] w-auto object-contain object-bottom mb-[8vh]"
        />
      </motion.div>

      {/* 底部羽化邊緣 */}
      <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent z-[15] pointer-events-none" />

      <motion.div 
        animate={uiControls}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
        className="relative z-20 mt-[18vh] flex flex-col items-center w-full px-4"
      >
        <img 
          src={`${import.meta.env.BASE_URL}resources/background/bg_logingamename.png`} 
          alt="遊戲名稱" 
          className="w-[95%] max-w-[675px] h-auto drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        />
      </motion.div>

      <motion.div 
        animate={uiControls}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1.0 }}
        className="absolute bottom-[10%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full px-8"
      >
        <div className="relative w-full max-w-[320px] pointer-events-auto">
          <div className="absolute inset-0 bg-[#d4af37]/10 blur-2xl rounded-full"></div>
          <button 
            onClick={() => handleEnter(false)}
            disabled={isActivating}
            className="w-full py-4 bg-black/70 text-[#d4af37] border-2 border-[#d4af37]/40 rounded-full font-bold text-2xl tracking-[16px] indent-[16px] transition-all duration-300 active:scale-95 active:bg-black/90 shadow-[0_0_30px_rgba(0,0,0,0.6)] hover:border-[#d4af37] relative z-30"
            style={{ fontFamily: "'LXGW WenKai Mono TC', monospace" }}
          >
            進入地城
          </button>
        </div>
        
        {/* 跳過動畫按鈕 */}
        <button
          onClick={() => onLogin()}
          disabled={isActivating}
          className="mt-4 pointer-events-auto text-[#d4af37]/60 text-sm underline hover:text-[#d4af37] transition-colors"
        >
          跳過動畫
        </button>
      </motion.div>
    </div>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [bgmEnabled, setBgmEnabled] = useState(true); 
  const [bgmVolume, setBgmVolume] = useState(0.08);
  const [isAppVisible, setIsAppVisible] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginExiting, setIsLoginExiting] = useState(false);
  
  const [levelQuestions, setLevelQuestions] = useState<Question[]>([]);
  const [isQuestionsFetching, setIsQuestionsFetching] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<LevelConfig | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [viewingCharacter, setViewingCharacter] = useState<any | null>(null); 

  const [gameState, setGameState] = useState<GameState>({
    playerHp: 0, maxPlayerHp: MAX_HP, enemyHp: 1000, maxEnemyHp: 1000,
    currentQuestionIndex: 0, timer: TURN_TIME, isTurnActive: false,
    status: GameStatus.MENU, userInput: [], usedIndices: new Set(), isPaused: false, totalDamage: 0
  });

  const [introStage, setIntroStage] = useState<string>('none');
  const [bossSpeechMsg, setBossSpeechMsg] = useState<string | null>(null);
  const [isSpeechDimmed, setIsSpeechDimmed] = useState(false);
  const [bgDimDuration, setBgDimDuration] = useState(400);
  const [triggeredHpThresholds, setTriggeredHpThresholds] = useState<Set<number>>(new Set());
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
  const [isQuitConfirmOpen, setIsQuitConfirmOpen] = useState(false);
  const [isQuitConfirmExiting, setIsQuitConfirmExiting] = useState(false);
  const [isPauseExiting, setIsPauseExiting] = useState(false);
  const [isFatalDefeat, setIsFatalDefeat] = useState(false);
  const [isInkActive, setIsInkActive] = useState(false);
  const [isScreenFadingOut, setIsScreenFadingOut] = useState(false);

  const audioManagerRef = useRef<AudioManagerHandle>(null);

  useEffect(() => {
    // 預設登入並初始化測試用戶
    initializeTestUser();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => setIsAppVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const preloadAssets = useMemo(() => {
    const urls = new Set<string>();
    LEVELS_DATA.forEach(level => {
      if (level.bossImg) urls.add(level.bossImg);
      if (level.bgImg) urls.add(level.bgImg);
    });
    urls.add(`${import.meta.env.BASE_URL}resources/effect/ink_splash.png`);
    urls.add(`${import.meta.env.BASE_URL}resources/background/bg_loginscreen.png`);
    urls.add(`${import.meta.env.BASE_URL}resources/background/bg_logingamename.png`);
    urls.add(`${import.meta.env.BASE_URL}resources/background/character1.png`);
    return Array.from(urls);
  }, []);

  const timerRef = useRef<number | null>(null);
  const gameInstanceIdRef = useRef<number>(0);
  const currentQuestion = useMemo(() => levelQuestions[gameState.currentQuestionIndex] || null, [levelQuestions, gameState.currentQuestionIndex]);
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
    setIsInkActive(false);
    setIsPlayerHurt(false);
    setIsScreenFadingOut(true);
    
    setTimeout(() => {
      gameInstanceIdRef.current++;
      if (timerRef.current) clearInterval(timerRef.current);
      
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
      setIsQuitConfirmOpen(false);
      
      setGameState(p => ({ 
        ...p,
        playerHp: 0, 
        enemyHp: 1000,
        currentQuestionIndex: 0, 
        timer: TURN_TIME, 
        isTurnActive: false,
        status: GameStatus.MENU, 
        userInput: [], 
        usedIndices: new Set(), 
        isPaused: false, 
        totalDamage: 0 
      }));
      
      setTimeout(() => {
        setIsScreenFadingOut(false);
      }, 50);
    }, 200);
  }, [clearVisualEffects]);

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

  const generateDynamicOptions = (answer: string) => {
    // 移除空白與分隔符號 /，取出所有候選答案中的字元
    const chars = answer.replace(/[\s/]/g, '').split('');
    const corpus = TEXT_CORPUS.replace(/[\s\n\r、，。！？：；「」『』]/g, '').split('');
    const distractors = Array.from({ length: Math.max(0, 20 - chars.length) }, () => corpus[Math.floor(Math.random() * corpus.length)]);
    return [...chars, ...distractors].sort(() => Math.random() - 0.5);
  };

  const startLevelSequence = useCallback(async (index: number, id: number, isRetry: boolean = false) => {
    if (gameInstanceIdRef.current !== id) return;
    const target = levelQuestions[index];
    if (!target || !target.answers || target.answers.length === 0) return;
    
    clearVisualEffects();
    if (!isRetry) { setShowInputPadUI(false); setShowQuestionUI(false); setShowSlotsUI(false); }
    await new Promise(r => setTimeout(r, (isRetry ? 50 : 100) * timeScale));
    if (gameInstanceIdRef.current !== id) return;
    
    // 格數以最長的正確答案為準
    const maxLen = Math.max(...target.answers.map(a => a.length));
    
    setIsInputPadExiting(false);
    setGameState(prev => ({ 
      ...prev, timer: TURN_TIME, isTurnActive: false,
      userInput: Array(maxLen).fill(null).map(() => ({ char: "", originIndex: null })),
      usedIndices: new Set()
    }));
    
    setShuffledOptions(target.options && target.options.length > 0 ? target.options : generateDynamicOptions(target.answer));
    
    if (!skillPanelShown) setSkillPanelShown(true);
    setShowInputPadUI(true);
    await new Promise(r => setTimeout(r, (isRetry ? 50 : 250) * timeScale));
    if (gameInstanceIdRef.current !== id) return;
    
    setSuppressExitAnim(isRetry); 
    setShowQuestionUI(true); 
    setShowSlotsUI(true);
    setGameState(p => ({ ...p, isTurnActive: true }));
  }, [levelQuestions, skillPanelShown, timeScale, clearVisualEffects]);

  const fetchQuestionsForLevel = async (level: LevelConfig) => {
    setIsQuestionsFetching(true);
    try {
      // 模擬加載感，讓轉場更自然
      await new Promise(r => setTimeout(r, 400));
      
      const filtered: Question[] = FULL_QUESTION_BANK
        .filter(q => level.sheetIds.includes(Number(q.id)))
        .map(q => ({
          ...q,
          options: generateDynamicOptions(q.answer)
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

  const startGame = useCallback(async (testMode: boolean = false) => {
    if (!currentLevel || levelQuestions.length === 0 || isQuestionsFetching) return;
    
    const instanceId = ++gameInstanceIdRef.current;
    audioManagerRef.current?.resetBattleMusic();
    try {
      setIsDemoMode(testMode); setIsAutoPlaying(false); setSpeedMultiplier(1);
      setGameState(prev => ({ 
        ...prev, status: GameStatus.PLAYING, isTurnActive: false, enemyHp: 1000, 
        playerHp: 0, currentQuestionIndex: 0, totalDamage: 0 
      }));
      setIntroStage('starting');
      await new Promise(r => setTimeout(r, 50)); 
      if (gameInstanceIdRef.current !== instanceId) return;
      setTriggeredHpThresholds(new Set());
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
      await startLevelSequence(0, instanceId);
    } catch (e) { }
  }, [currentLevel, levelQuestions, isQuestionsFetching, triggerBossSpeechAction, startLevelSequence]);

  const onCorrectAnswer = useCallback(async () => {
    if (!currentLevel) return;
    const id = gameInstanceIdRef.current;
    try {
      setGameState(p => ({ ...p, isTurnActive: false }));
      setIsConverging(true); setIsInputPadExiting(true);
      await new Promise(r => setTimeout(r, 400 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      setGameState(p => ({ ...p, userInput: p.userInput.map(s => ({ ...s, char: "" })) }));
      await new Promise(r => setTimeout(r, 200 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      setIsConverging(false); setEnemyAnimState('hurt'); setIsScreenShaking(true); setIsPlayerSlashActive(true);
      const damage = gameState.enemyHp <= 0 ? 150 : 100;
      const newHp = gameState.enemyHp - damage;
      const hpPct = newHp / 1000;
      setGameState(p => ({ ...p, enemyHp: newHp, totalDamage: p.totalDamage + damage }));
      const isLast = gameState.currentQuestionIndex >= levelQuestions.length - 1;
      if (isLast) {
        setTimeout(() => { setShowQuestionUI(false); setShowSlotsUI(false); }, 200 * timeScale);
        await new Promise(r => setTimeout(r, 1000 * timeScale));
        if (gameInstanceIdRef.current !== id) return;
        clearVisualEffects();
        await triggerBossSpeechAction(currentLevel.victorySpeech || "", id);
        setGameState(p => ({ ...p, status: GameStatus.VICTORY }));
        return;
      }
      setTimeout(() => { setShowQuestionUI(false); setShowSlotsUI(false); }, 200 * timeScale);
      await new Promise(r => setTimeout(r, 1000 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      clearVisualEffects();
      let speechToTrigger: string | null = null;
      const thresholds = [80, 60, 40, 20, 0];
      for (const t of thresholds) {
        if (hpPct <= t / 100 && !triggeredHpThresholds.has(t)) {
          speechToTrigger = currentLevel.hpThresholds ? currentLevel.hpThresholds[t] : null;
          setTriggeredHpThresholds(prev => new Set(prev).add(t));
          break; 
        }
      }
      if (speechToTrigger) { await triggerBossSpeechAction(speechToTrigger, id); }
      setGameState(p => { startLevelSequence(p.currentQuestionIndex + 1, id); return { ...p, currentQuestionIndex: p.currentQuestionIndex + 1 }; });
    } catch (e) {}
  }, [gameState.enemyHp, gameState.currentQuestionIndex, gameState.totalDamage, currentLevel, levelQuestions, timeScale, triggeredHpThresholds, startLevelSequence, triggerBossSpeechAction, clearVisualEffects]);

  const triggerEnemyAttack = useCallback(async (isTimeout = false) => {
    if (!currentLevel) return;
    const id = gameInstanceIdRef.current;
    try {
      setGameState(p => ({ ...p, isTurnActive: false }));
      setIsInputErrorDimmed(true); setSuppressExitAnim(false); 
      await new Promise(r => setTimeout(r, 500 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      setEnemyAnimState('attack');
      await new Promise(r => setTimeout(r, 640 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      setIsBossSlashActive(true); setIsScreenShaking(true); setIsScreenFlash(true); setIsPlayerHurt(true);
      setTimeout(() => setIsScreenFlash(false), 150 * timeScale);
      if (currentLevel.id !== 6) {
        await new Promise(r => setTimeout(r, 640 * timeScale));
        if (gameInstanceIdRef.current !== id) return;
        setIsScreenShaking(false); setTimeout(() => setIsScreenShaking(true), 10);
        setIsScreenFlash(true); setTimeout(() => setIsScreenFlash(false), 150 * timeScale);
      }
      setIsSlotsFalling(true); 
      await new Promise(r => setTimeout(r, 300 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      setShowSlotsUI(false); setShowQuestionUI(false); 
      const newPlayerHp = Math.max(0, gameState.playerHp - 1000);
      setGameState(p => ({ ...p, playerHp: newPlayerHp }));
      await new Promise(r => setTimeout(r, 1000 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      if (newPlayerHp <= 0) {
        setIsFatalDefeat(true); setBossSpeechMsg(currentLevel.defeatSpeech || ""); setIsSpeechDimmed(true);
        await new Promise(r => setTimeout(r, 800)); 
        if (gameInstanceIdRef.current !== id) return;
        setIsInkActive(true); 
        await new Promise(r => setTimeout(r, 1750)); 
        if (gameInstanceIdRef.current !== id) return;
        setGameState(x => ({ ...x, status: GameStatus.GAME_OVER }));
        return;
      }
      setGameState(p => ({ ...p, userInput: p.userInput.map(s => ({ ...s, char: "" })), usedIndices: new Set() }));
      await new Promise(r => setTimeout(r, 400 * timeScale));
      if (gameInstanceIdRef.current !== id) return;
      clearVisualEffects();
      startLevelSequence(gameState.currentQuestionIndex, id, true);
    } catch (e) {}
  }, [gameState.playerHp, gameState.currentQuestionIndex, currentLevel, timeScale, startLevelSequence, clearVisualEffects]);

  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING && gameState.isTurnActive && isAutoPlaying && !gameState.isPaused && !bossSpeechMsg && currentQuestion) {
      const autoPlayTimeout = window.setTimeout(() => {
        const nextSlotIndex = gameState.userInput.findIndex(s => !s.char);
        if (nextSlotIndex !== -1 && currentQuestion.answers.length > 0) {
          // 預設以第一個答案為自動填入目標
          const targetChar = currentQuestion.answers[0][nextSlotIndex];
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
      timerRef.current = window.setInterval(() => {
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

    const currentInputStr = gameState.userInput.map(s => s.char).join('');
    const isFull = gameState.userInput.every(s => s.char);
    
    // 檢查是否符合任一正確答案
    const isMatch = currentQuestion.answers.some(ans => ans === currentInputStr);

    if (isMatch) {
      onCorrectAnswer();
    } else if (isFull) {
      // 只有在填滿所有格子且不完全符合任何答案時才判定錯誤
      // 這裡需要多檢閱一次，因為有可能輸入了 XXX 但答案列有 XXX/YYYY
      // 如果 isMatch 為 false 且 isFull 為 true，則代表真的錯了
      triggerEnemyAttack(false);
    }
  }, [gameState.userInput, gameState.isTurnActive, gameState.isPaused, currentQuestion, onCorrectAnswer, triggerEnemyAttack, bossSpeechMsg]);

  const handleLogin = useCallback(() => {
    audioManagerRef.current?.unlockAudio();
    setIsLoginExiting(true);
    setTimeout(() => {
      setIsLoggedIn(true);
    }, 1000);
  }, []);

  const showMenuScreen = (isLoggedIn || isLoginExiting) && (gameState.status === GameStatus.MENU || gameState.status === GameStatus.CHARACTER_DETAIL);

  return (
    <div className={`w-full h-full relative transition-all duration-300 ${isPlayerHurt ? 'bg-red-950/20' : ''} ${isScreenShaking ? 'shake-active' : ''}`} style={{ backgroundColor: 'var(--app-bg)' }}>
      <AudioManager 
        ref={audioManagerRef}
        status={gameState.status} 
        bgmEnabled={bgmEnabled && isAppVisible}
        bgmVolume={bgmVolume}
        isBooting={isBooting} 
        isLoggedIn={isLoggedIn}
      />
      
      {isBooting && <BootLoadingMask assets={preloadAssets} onComplete={() => setIsBooting(false)} />}
      
      {!isLoggedIn && (
        <LoginGate onLogin={handleLogin} isExiting={isLoginExiting} />
      )}
      
      <InkSplash active={isInkActive} />
      <div className={`absolute inset-0 z-[8000] pointer-events-none transition-opacity duration-150 ${isScreenFlash ? 'opacity-50 bg-red-600' : 'opacity-0'}`} />
      
      <div className={`global-scene-bg absolute top-0 left-0 w-full h-[62%] z-[0] ${((enemyAnimState === 'attack' && currentLevel?.id !== 6) || isInputErrorDimmed || isSpeechDimmed) ? 'bg-attack-dim' : ''}`} 
        style={{ backgroundImage: currentLevel ? `url("${currentLevel.bgImg}")` : 'none', backgroundSize: 'auto 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center bottom', opacity: gameState.status === GameStatus.PLAYING && introStage !== 'none' ? 1 : 0, transition: 'opacity 0.7s, filter var(--bg-dim-duration, 400ms)', '--bg-dim-duration': `${bgDimDuration}ms` } as any} />
      
      <div className={`gold-divider ${gameState.status === GameStatus.PLAYING && introStage !== 'none' ? 'active' : ''}`} style={{ bottom: "40%" }} />
      
      {isLoggedIn && gameState.status === GameStatus.PLAYING && (
        <>
          <BattleArea levelId={currentLevel?.id || 0} enemyAnim={enemyAnimState} isBossSlashActive={isBossSlashActive} isPlayerSlashActive={isPlayerSlashActive} introStage={introStage} isFatigue={gameState.enemyHp <= 0} bossName={currentLevel?.bossName || ""} bossImg={currentLevel?.bossImg || ""} speedMultiplier={speedMultiplier} />
          <div className="absolute bottom-0 left-0 w-full z-[80] h-[40%]" style={{ backgroundColor: 'var(--app-bg)' }}>
            <InputPad options={shuffledOptions} usedIndices={gameState.usedIndices} disabled={!gameState.isTurnActive || gameState.isPaused} onOptionClick={handleOptionClickAction} isEnemyAttacking={isInputErrorDimmed} showUI={showInputPadUI} isExiting={isInputPadExiting} suppressExitAnim={suppressExitAnim} />
            <BossSpeech message={bossSpeechMsg} bossName={currentLevel?.bossName || ""} duration={isFatalDefeat ? 99999 : 2000 * timeScale} isFatal={isFatalDefeat} theme={theme} />
          </div>
          <div className="absolute left-0 w-full h-[10px] bg-black z-[90] transition-opacity duration-500" style={{ bottom: "calc(40% + 1px)", opacity: ['player_hp','input_pad','ready','playing'].includes(introStage) && !isFatalDefeat ? 1 : 0 }}>
            <div className="hp-text">{Math.floor(gameState.playerHp)} / {gameState.maxPlayerHp}</div>
            <div className={`absolute inset-0 bg-[#28a745] z-[33] hp-bar-gpu-layer ${introStage === 'player_hp' ? 'hp-fill-slow' : 'hp-fill-hit'}`} style={{ transform: `scaleX(${gameState.playerHp/gameState.maxPlayerHp})` }} />
          </div>
          <div className={`absolute left-0 w-full h-[66px] z-[95] transition-all duration-700 transform ${skillPanelShown && !isFatalDefeat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ bottom: "calc(40% + 14px)" }}>
            <SkillPanel />
            {isAutoPlaying && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-red-600 text-white text-[13px] font-black rounded-lg z-[110] animate-pulse border-2 border-white/40 shadow-[0_0_25px_red] tracking-[4px] uppercase">Auto Playing</div>}
          </div>
          <div className="absolute left-0 w-full h-[42px] z-[100] flex flex-col items-center" style={{ bottom: "calc(40% + 80px)" }}>
             <SlotsInterface userInput={gameState.userInput} showUI={showSlotsUI && !isFatalDefeat} isFalling={isSlotsFalling} isConverging={isConverging} onSlotClear={idx => {
                setGameState(p => {
                  const s = p.userInput[idx]; if (!s.char || p.isPaused) return p;
                  const nUsed = new Set(p.usedIndices); nUsed.delete(s.originIndex!);
                  const nInput = [...p.userInput]; nInput[idx] = { char: "", originIndex: null };
                  return { ...p, userInput: nInput, usedIndices: nUsed };
                });
             }} lastImpactIndex={lastImpactIndex} noExitAnim={suppressExitAnim} />
          </div>
          <div className="absolute left-0 w-full z-[110] flex flex-col items-center" style={{ bottom: "calc(40% + 122px)" }}>
             <QuestionBox question={currentQuestion} showUI={showSlotsUI && !isFatalDefeat} noExitAnim={suppressExitAnim} />
          </div>
          <HUD gameState={gameState} introStage={introStage} onPause={() => setGameState(p => ({...p, isPaused: !p.isPaused}))} isTimerPulse={isTimerPulse} showInputPadUI={showInputPadUI && !isFatalDefeat} questionType={currentQuestion?.type} isDemoMode={isDemoMode} isAutoPlaying={isAutoPlaying} speedMultiplier={speedMultiplier} onSpeedToggle={() => {
              if (!isAutoPlaying) { setIsAutoPlaying(true); setSpeedMultiplier(1); }
              else if (speedMultiplier === 1) setSpeedMultiplier(3);
              else if (speedMultiplier === 3) setSpeedMultiplier(5);
              else setIsAutoPlaying(false);
          }} onDebugVictory={() => setGameState(p => ({ ...p, status: GameStatus.VICTORY }))} onDebugGameOver={() => triggerEnemyAttack(true)} isDimmed={introStage === 'none' || introStage === 'starting'} theme={theme} />
        </>
      )}

      <div className={`absolute inset-0 transition-opacity duration-700 ${showMenuScreen ? 'z-[500] opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'}`}>
        <MenuScreen 
          levels={LEVELS_DATA} 
          onSelect={l => { setCurrentLevel(l); setGameState(p => ({ ...p, status: GameStatus.LOADING })); fetchQuestionsForLevel(l); }} 
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
          onThemeToggle={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
          bgmEnabled={bgmEnabled}
          onBgmToggle={() => setBgmEnabled(prev => !prev)}
          bgmVolume={bgmVolume}
          onVolumeChange={setBgmVolume}
        />
      </div>

      {isLoggedIn && gameState.status === GameStatus.LOADING && <LoadingScreen level={currentLevel} isLoading={isQuestionsFetching} onConfirm={m => startGame(m)} onCancel={resetToStart} />}
      
      {isLoggedIn && gameState.status === GameStatus.GAME_OVER && (
        <GameOverScreen onRestart={resetToStart} />
      )}
      
      {isLoggedIn && gameState.status === GameStatus.VICTORY && (
        <VictoryScreen onRestart={resetToStart} />
      )}
      
      {isLoggedIn && gameState.isPaused && (
        <div className={`pause-overlay ${isPauseExiting ? 'animate-fadeOut' : 'show-pause'}`}>
          {isQuitConfirmOpen && (
            <div className={`absolute inset-0 z-[100000] flex items-center justify-center pointer-events-auto ${isQuitConfirmExiting ? 'animate-simpleFadeOut' : 'animate-simpleFadeIn'}`}>
              <div className={`w-[310px] bg-[#1a1a1a] rounded-[30px] pt-[46px] pb-[46px] px-9 flex flex-col items-center border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] translate-y-[5px] transition-all duration-300 ${isQuitConfirmExiting ? 'scale-95 translate-y-[11px]' : 'scale-100'}`}>
                <div className="w-20 h-20 rounded-full border-[3px] border-[#d4af37] flex items-center justify-center mb-7 animate-icon-glow">
                   <span className="text-[#d4af37] text-4xl font-black translate-x-[-1px]">{UI_STATIC_TEXT.PAUSE.resume[0]}</span>
                </div>
                <h3 className="text-white text-xl font-bold tracking-[4px] mb-8">{UI_STATIC_TEXT.QUIT_CONFIRM.title}</h3>
                <div className="w-full flex flex-col gap-6 items-center">
                  <button onClick={() => { setIsQuitConfirmExiting(true); setTimeout(() => { setIsQuitConfirmOpen(false); setIsQuitConfirmExiting(false); }, 300); }} className="modern-glass-btn active:scale-95 !bg-[#d4af37] !text-black !border-[#d4af37] shadow-[0_4px_15_rgba(212,175,55,0.3)]">{UI_STATIC_TEXT.QUIT_CONFIRM.keep}</button>
                  <button onClick={resetToStart} className="modern-glass-btn active:scale-95 !bg-[#521c1c] !text-white !border-white/5 shadow-[0_4px_15_rgba(82,28,28,0.4)]">{UI_STATIC_TEXT.QUIT_CONFIRM.leave}</button>
                </div>
              </div>
            </div>
          )}
          <div className={`w-full flex flex-col items-center relative transition-opacity duration-300 ${isQuitConfirmOpen ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative inline-block px-10 mb-12">
              <span className="absolute top-[-26px] left-[-15px] text-[3.5rem] text-[#d4af37] text-4xl leading-none opacity-60 select-none pointer-events-none" style={{ fontFamily: 'serif' }}>「</span>
              <p className="text-white text-[16px] tracking-[4px] leading-[2.4] font-medium text-center whitespace-pre-wrap" style={{ textShadow: '0 0 20px rgba(255,255,255,0.4)', fontFamily: "'LXGW WenKai Mono TC', monospace", transform: 'translate(5px, 5px)' }}>{UI_STATIC_TEXT.PAUSE.quote}</p>
              <span className="absolute bottom-[-26px] right-[-15px] text-[3.5rem] text-[#d4af37] text-4xl leading-none opacity-60 select-none pointer-events-none" style={{ fontFamily: 'serif' }}>」</span>
            </div>
            <button className="modern-glass-btn active:scale-95 !bg-[#d4af37] !text-black !border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)] mb-6" onClick={() => { setIsPauseExiting(true); setTimeout(() => { setGameState(p => ({ ...p, isPaused: false })); setIsPauseExiting(false); }, 400); }}>{UI_STATIC_TEXT.PAUSE.resume}</button>
            <button className="modern-glass-btn active:scale-95 !bg-white/10 !border-white/20 !text-white" onClick={() => setIsQuitConfirmOpen(true)}>{UI_STATIC_TEXT.PAUSE.quit}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
