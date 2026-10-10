
import React, { useMemo } from 'react';
import { GameState } from '../types';
import { TURN_TIME } from '../constants';

interface HUDProps {
  gameState: GameState;
  introStage: string;
  onPause: () => void;
  isTimerPulse: boolean;
  showInputPadUI: boolean;
  questionType?: string;
  isDemoMode?: boolean;
  isAutoPlaying?: boolean;
  speedMultiplier?: number;
  onSpeedToggle?: () => void;
  /** AUTO 開／關（開啟後才顯示 倍數／WIN／LOSE） */
  onAutoToggle?: () => void;
  onDebugVictory?: () => void;
  onDebugGameOver?: () => void;
  isDimmed?: boolean;
  theme: 'light' | 'dark';
}

const HUD: React.FC<HUDProps> = React.memo(({ 
  gameState, 
  introStage, 
  onPause, 
  isTimerPulse, 
  showInputPadUI,
  questionType,
  isDemoMode = false,
  isAutoPlaying = false,
  speedMultiplier = 1,
  onSpeedToggle,
  onAutoToggle,
  onDebugVictory,
  onDebugGameOver,
  isDimmed = false,
  theme
}) => {
  const timerColor = useMemo(() => {
    const t = gameState.timer;
    if (t > 20) return '#22c55e'; // 綠
    if (t > 10) return '#eab308'; // 黃
    return '#ef4444'; // 紅
  }, [gameState.timer]);

  const showEnemyHpBar = ['enemy_hp', 'player_hp', 'input_pad', 'ready', 'playing'].includes(introStage);
  const enemyHpPercent = Math.max(0, gameState.enemyHp / gameState.maxEnemyHp);
  const isEnemyHpIntro = introStage === 'enemy_hp';
  const timerVisible = showInputPadUI;

  const isTimerWarning = gameState.timer <= 10 && !isDimmed;

  // 圓環參數
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = useMemo(() => {
    const progress = Math.max(0, Math.min(gameState.timer, TURN_TIME)) / TURN_TIME;
    return circumference * (1 - progress);
  }, [gameState.timer, circumference]);

  // 恢復基礎不透明度為 1.0，Dim 模式恢復為 0.2
  const controlOpacity = timerVisible ? (isDimmed ? 0.2 : 1) : 0;

  return (
    <>
      <div className={`absolute top-0 left-0 w-full h-[12px] z-[100] transition-all duration-500 ${showEnemyHpBar ? 'opacity-100' : 'opacity-0'} bg-black/40`}>
          <div className="hp-text transition-all duration-300">
            {`${Math.max(0, Math.floor(gameState.enemyHp))} / ${gameState.maxEnemyHp}`}
          </div>
              <div className={`absolute inset-0 bg-white opacity-30 z-[1] hp-bar-gpu-layer ${isEnemyHpIntro ? 'hp-buffer-slow' : 'hp-buffer-hit'}`} 
                   style={{ transform: showEnemyHpBar ? (isEnemyHpIntro ? 'scaleX(1)' : `scaleX(${enemyHpPercent})`) : 'scaleX(0)' }} />
              <div className={`absolute inset-0 bg-gradient-to-r from-[#ff0000] to-[#b30000] z-[2] hp-bar-gpu-layer ${isEnemyHpIntro ? 'hp-fill-slow' : 'hp-fill-hit'}`} 
                   style={{ transform: showEnemyHpBar ? (isEnemyHpIntro ? 'scaleX(1)' : `scaleX(${enemyHpPercent})`) : 'scaleX(0)' }} />
      </div>

      {/* 計時器 */}
      <div 
        onClick={onPause} 
        className={`absolute top-[28px] left-[12px] z-[200] cursor-pointer flex items-center justify-center transition-all duration-300 touch-manipulation ${isTimerWarning ? 'timer-warning' : ''} ${isDimmed ? 'opacity-40 grayscale-[0.5] scale-90' : 'opacity-100 grayscale-0 scale-100'}`} 
        style={{ 
          width: '50px',
          height: '50px',
          opacity: controlOpacity, 
          pointerEvents: timerVisible ? 'auto' : 'none', 
        }}
      >
        <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-sm shadow-lg"></div>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r={radius} fill="none" stroke={`${timerColor}22`} strokeWidth="1" />
          <circle 
            cx="25" cy="25" r={radius} fill="none" stroke={timerColor} strokeWidth="1" 
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className={`ease-linear ${gameState.timer === 0 ? 'transition-none' : 'transition-[stroke-dashoffset] duration-1000'}`}
          />
        </svg>
        <span className={`relative z-10 font-black text-[18px] ${isTimerWarning ? 'timer-text-active' : ''}`} style={{ color: timerColor }}>
          {gameState.timer}
        </span>
      </div>

      {/* 題型標籤 */}
      <div 
        className={`absolute top-[28px] right-[12px] rounded-full z-[200] flex items-center justify-center border font-black transition-all duration-300 ${isDimmed ? 'opacity-40 grayscale-[0.5] scale-90' : 'opacity-100 grayscale-0 scale-100'}`} 
        style={{ 
          color: 'var(--gold-accent)', 
          borderColor: 'rgba(212, 175, 55, 0.2)',
          width: `50px`, 
          height: `50px`,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          opacity: controlOpacity, 
          pointerEvents: 'none', 
          boxShadow: '0 0 10px rgba(212, 175, 55, 0.1)', 
          backdropFilter: 'blur(8px)', 
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        <span style={{ fontSize: '18px', letterSpacing: '-0.5px', transform: 'translate3d(-1px, 0, 0)', display: 'block' }}>
          {questionType || '--'}
        </span>
      </div>

      {/* 戰鬥控制欄 (自動/速度) */}
      {isAutoPlaying !== undefined && (
        <div 
          className="absolute top-[85px] left-[12px] z-[200] flex flex-col gap-2 transition-opacity duration-300"
          style={{ 
            opacity: controlOpacity, 
            pointerEvents: timerVisible ? 'auto' : 'none',
            willChange: 'backdrop-filter, opacity, transform'
          }}
        >
          {/* 自動開關（每關常駐） */}
          <div 
            onClick={onAutoToggle}
            className={`rounded-lg cursor-pointer flex flex-col items-center justify-center border transition-all active:scale-90 touch-manipulation ${isAutoPlaying ? 'bg-amber-500/80 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-black/40 border-white/10'}`}
            style={{ 
              width: '50px', 
              height: '40px', 
              backdropFilter: 'blur(4px)', 
              WebkitBackdropFilter: 'blur(4px)',
              willChange: 'backdrop-filter'
            }}
          >
            <span className={`text-[9px] font-bold mb-[1px] ${isAutoPlaying ? 'text-black' : 'text-gray-500'}`}>AUTO</span>
            <div className="flex items-center justify-center">
              {isAutoPlaying ? (
                 <span className="text-[13px] text-black font-black animate-pulse">ON</span>
              ) : (
                 <span className="text-[11px] text-[#ffd700] font-black tracking-tighter">OFF</span>
              )}
            </div>
          </div>

          {/* AUTO 開啟時才顯示：倍數／WIN／LOSE（AUTO 開過的這場不計分、不入排行，見 battleRecorder eligible） */}
          {isAutoPlaying && (
            <>
              <button 
                onClick={onSpeedToggle}
                aria-label={`倍數 ${speedMultiplier}X`}
                className="w-[50px] h-[32px] rounded-lg bg-black/40 border border-white/10 text-[#ffd700] text-[12px] font-black tracking-tighter active:scale-90 flex items-center justify-center"
                style={{ 
                  backdropFilter: 'blur(4px)', 
                  WebkitBackdropFilter: 'blur(4px)',
                  willChange: 'backdrop-filter'
                }}
              >
                {speedMultiplier}X
              </button>

              <button 
                onClick={onDebugVictory}
                className="w-[50px] h-[32px] rounded-lg bg-black/40 border border-white/10 text-emerald-400 text-[10px] font-black tracking-widest active:scale-90 flex items-center justify-center"
                style={{ 
                  backdropFilter: 'blur(4px)', 
                  WebkitBackdropFilter: 'blur(4px)',
                  willChange: 'backdrop-filter'
                }}
              >
                WIN
              </button>

              <button 
                onClick={onDebugGameOver}
                className="w-[50px] h-[32px] rounded-lg bg-black/40 border border-white/10 text-rose-400 text-[10px] font-black tracking-widest active:scale-90 flex items-center justify-center"
                style={{ 
                  backdropFilter: 'blur(4px)', 
                  WebkitBackdropFilter: 'blur(4px)',
                  willChange: 'backdrop-filter'
                }}
              >
                LOSE
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
});

export default HUD;
