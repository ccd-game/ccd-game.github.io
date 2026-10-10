
import React from 'react';

interface StartScreenProps {
  onStart: (isDemo?: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, isLoading = false, error = null, onRetry }) => {
  return (
    <div 
      id="start-screen" 
      className="absolute inset-0 z-[99999] flex flex-col items-center justify-between p-4 text-center bg-[#1a1a1a] animate-[fadeIn_0.6s_ease-out_forwards]"
      style={{
        color: '#d4af37',
        fontFamily: "'LXGW WenKai Mono TC', monospace"
      }}
    >
      <div className="mt-16 animate-in fade-in slide-in-from-top-10 duration-1000 w-full px-2">
        <h1 
          className="font-bold tracking-[10px] leading-tight drop-shadow-[0_0_25px_rgba(212,175,55,0.6)] m-0"
          style={{ 
            fontSize: 'min(13vw, 4rem)', 
            whiteSpace: 'nowrap',
            display: 'block',
            width: '100%'
          }}
        >
          文言地城
        </h1>
        <p className="text-[1.3rem] text-[#aaa] tracking-[6px] mt-4">始得西山宴遊記</p>
      </div>
      
      <div className="w-full max-w-xs animate-in fade-in duration-1000 delay-300">
        <h2 className="text-[1.8rem] text-[#ffd700] mb-4 border-b border-[#555] pb-3 inline-block px-4 font-bold">
          第一回：柳宗元
        </h2>
        <div className="space-y-4">
          {error ? (
            <p className="text-[1rem] leading-relaxed text-red-500 font-bold tracking-widest px-4">
              連線失敗<br/>
              <span className="text-[0.8rem] opacity-80">{error}</span>
            </p>
          ) : (
            <p className="text-[1.1rem] leading-relaxed text-[#ccc] tracking-widest">
              墮入永恆地城，<br/>
              唯有通曉古聖賢之意，<br/>
              方能破陣而歸。
            </p>
          )}
        </div>
      </div>

      <div className="mb-12 w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
        {error ? (
          <button 
            onClick={onRetry}
            className="px-16 py-4 bg-white/10 text-white border border-white/20 rounded-full font-bold text-xl tracking-[10px] active:scale-95 transition-all"
          >
            重 新 連 線
          </button>
        ) : (
          <>
            <button 
              onClick={() => onStart(false)}
              disabled={isLoading}
              className={`w-[280px] py-5 bg-[#d4af37] text-black rounded-full font-bold text-2xl tracking-[15px] active:scale-95 transition-all shadow-[0_0_35px_rgba(212,175,55,0.4)] hover:brightness-110 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? '感 應 中' : '開 戰'}
            </button>
            <button 
              onClick={() => onStart(true)}
              disabled={isLoading}
              className={`w-[280px] py-3 bg-white/5 text-white/60 border border-white/10 rounded-full font-bold text-sm tracking-[5px] active:scale-95 transition-all hover:bg-white/10 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              測試模式
            </button>
          </>
        )}
      </div>
      
      <div className="mb-4 opacity-40">
        <p className="text-[0.75rem] tracking-[4px] font-bold text-[#444] uppercase">
          HKDSE CHINESE CLASSICS RPG
        </p>
      </div>
    </div>
  );
};

export default StartScreen;
