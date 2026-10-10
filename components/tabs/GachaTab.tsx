
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GachaItem, pullGacha, Rarity } from '../../src/lib/gachaSystem';
import { subscribeToUser, CURRENT_USER, updateUserGold, watchAuthState, UserData } from '../../src/lib/firebase';

const RARITY_COLORS = {
  [Rarity.COMMON]: { 
    text: 'text-slate-400', 
    border: 'border-slate-500/30', 
    bg: 'bg-slate-500/10', 
    glow: 'shadow-[0_0_15px_rgba(148,163,184,0.2)]',
    bottomGlow: 'bg-slate-400/20'
  },
  [Rarity.RARE]: { 
    text: 'text-blue-400', 
    border: 'border-blue-500/50', 
    bg: 'bg-blue-500/10', 
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    bottomGlow: 'bg-blue-400/30'
  },
  [Rarity.EPIC]: { 
    text: 'text-purple-400', 
    border: 'border-purple-500/60', 
    bg: 'bg-purple-500/10', 
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
    bottomGlow: 'bg-purple-400/40'
  },
  [Rarity.LEGENDARY]: { 
    text: 'text-amber-400', 
    border: 'border-amber-500/80', 
    bg: 'bg-amber-500/15', 
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.6)]',
    bottomGlow: 'bg-amber-400/50'
  },
};

interface GachaTabProps {
  onIsSummoningChange: (isSummoning: boolean) => void;
}

const GachaTab: React.FC<GachaTabProps> = ({ onIsSummoningChange }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isSummoning, setIsSummoning] = useState(false);
  const [results, setResults] = useState<GachaItem[] | null>(null);
  const [charging, setCharging] = useState(false);
  const [lastCount, setLastCount] = useState<number>(1);

  useEffect(() => watchAuthState((s) => {
    setIsGuest(s.status === 'guest' || s.isGuest === true);
  }), []);

  useEffect(() => {
    const unsubscribe = subscribeToUser(CURRENT_USER, (data) => {
      setUserData(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    onIsSummoningChange(isSummoning);
  }, [isSummoning, onIsSummoningChange]);

  const handleSummon = async (count: number) => {
    const cost = count === 1 ? 10 : 45; 
    const isTestMode = !userData || userData.gold < cost; 

    setLastCount(count);
    setIsSummoning(true);
    setCharging(true);
    setResults(null); 
    
    if (!isTestMode && userData) {
      try {
        await updateUserGold(CURRENT_USER, userData.gold - cost);
      } catch (e) {
        console.error('扣除文氣失敗', e);
      }
    }

    setTimeout(() => {
      setCharging(false);
      const newItems = pullGacha(count);
      setResults(newItems);
    }, 1500);
  };

  const closeResults = () => {
    setResults(null);
    setIsSummoning(false);
  };

  const hasEnoughOne = (userData?.gold || 0) >= 10;
  const hasEnoughFive = (userData?.gold || 0) >= 45;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 px-6 tab-slide-active relative overflow-hidden" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* 背景裝飾法陣 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="w-[600px] h-[600px] rounded-full border border-dashed"
          style={{ borderColor: 'var(--gold-accent)' }}
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute w-[450px] h-[450px] rounded-full border border-double border-2"
          style={{ borderColor: 'var(--gold-accent)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm mb-6">
        {/* 召喚中心裝飾 */}
        <div className="w-56 h-56 relative mb-8 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360, scale: charging ? 1.2 : 1 }}
              transition={{ rotate: { duration: 15, repeat: Infinity, ease: "linear" }, scale: { duration: 0.5 } }}
              className="absolute inset-0 rounded-full border-2 flex items-center justify-center" 
              style={{ borderColor: 'var(--panel-border)', boxShadow: charging ? '0 0 50px var(--gold-accent)' : 'none' }}
            >
               <div className="w-48 h-48 rounded-full border border-dashed opacity-30" style={{ borderColor: 'var(--gold-accent)' }}></div>
            </motion.div>
            
            <AnimatePresence>
              {charging && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 2 }}
                  className="absolute inset-0 rounded-full bg-white blur-3xl z-0"
                />
              )}
            </AnimatePresence>

            <div className="absolute inset-4 rounded-full shadow-inner flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
               <motion.div 
                 animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
                 transition={{ duration: 3, repeat: Infinity }}
                 className="absolute w-32 h-32 rounded-full blur-xl" 
                 style={{ backgroundColor: 'var(--gold-accent)' }}
               />
               <div className="text-6xl font-black opacity-80 relative z-10" style={{ color: 'var(--gold-accent)', textShadow: '0 0 20px var(--gold-accent)' }}>緣</div>
            </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h3 className="text-2xl font-black tracking-[8px] mb-1" style={{ color: 'var(--text-main)' }}>文墨機緣</h3>
          <p className="text-[11px] tracking-[3px] opacity-50" style={{ color: 'var(--text-sub)' }}>
            天命感召 ・ 聖賢歸位
          </p>
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
          <span className="text-[11px] font-bold" style={{ color: 'var(--gold-accent)' }}>當前文氣</span>
          <span className="text-[14px] font-black text-white">{userData?.gold || 0}</span>
        </div>
        {isGuest && (
          <p className="gacha-guest-note" data-testid="gacha-guest-hint">
            遊客的文氣只在本機暫存，不會保存
          </p>
        )}

        <div className="flex gap-4 w-full">
          <button 
            onClick={() => handleSummon(1)}
            disabled={isSummoning}
            className="flex-1 h-16 rounded-xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden active:scale-95 transition-all disabled:opacity-60 disabled:scale-100"
            style={{ backgroundColor: 'var(--panel-bg)' }}
          >
            <span className="text-[15px] font-bold text-white relative z-10">{hasEnoughOne ? '探索一次' : '測試召喚'}</span>
            <span className={`text-[11px] font-medium mt-0.5 relative z-10 ${!hasEnoughOne ? 'opacity-50 line-through' : ''}`} style={{ color: 'var(--gold-accent)' }}>✨ 10 文氣</span>
          </button>
          
          <button 
            onClick={() => handleSummon(5)}
            disabled={isSummoning}
            className="flex-1 h-16 rounded-xl border border-amber-500/30 flex flex-col items-center justify-center relative overflow-hidden active:scale-95 transition-all disabled:opacity-60 disabled:scale-100 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)' }}
          >
            <span className="text-[15px] font-bold text-black relative z-10">{hasEnoughFive ? '探索五次' : '測試召喚'}</span>
            <span className={`text-[11px] font-black text-black/60 mt-0.5 relative z-10 ${!hasEnoughFive ? 'opacity-30 line-through' : ''}`}>✨ 45 文氣</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {results && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-4 bg-black/98 backdrop-blur-2xl"
            >
              <motion.h4 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-black text-white tracking-[8px] mb-8"
              >
                機緣揭曉
              </motion.h4>
              
              <div className="w-full relative py-2 group">
                {/* 滾動容器感應區 */}
                <div 
                  className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 items-center"
                  style={{ 
                    scrollPadding: '0 4rem',
                    maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
                  }}
                >
                  <div className={`flex py-10 px-[15vw] gap-4 ${results.length <= 2 ? 'mx-auto justify-center' : ''}`}>
                    {results.map((item, idx) => (
                      <motion.div
                        key={`${item.id}-${idx}`}
                        initial={{ scale: 0.5, x: 50, opacity: 0, rotateY: 45 }}
                        animate={{ scale: 1, x: 0, opacity: 1, rotateY: 0 }}
                        transition={{ 
                          delay: idx * 0.1, 
                          type: "spring", 
                          stiffness: 100, 
                          damping: 15 
                        }}
                        whileHover={{ 
                          scale: 1.05, 
                          zIndex: 50,
                          y: -10,
                          transition: { duration: 0.2 }
                        }}
                        className={`relative shrink-0 snap-center w-56 aspect-[0.7] rounded-[2rem] border-2 p-6 flex flex-col items-center justify-center text-center overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-shadow ${RARITY_COLORS[item.rarity].border} ${RARITY_COLORS[item.rarity].bg} ${RARITY_COLORS[item.rarity].glow}`}
                      >
                      {/* 地部發光特效 */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1/2 blur-2xl opacity-40 ${RARITY_COLORS[item.rarity].bottomGlow}`} />
                      
                      {/* 稀有度標籤 */}
                      <div className={`absolute top-3 left-3 text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-black/60 backdrop-blur-md z-10 border border-white/10 ${RARITY_COLORS[item.rarity].text}`}>
                        {item.rarity === Rarity.LEGENDARY ? '傳說' : item.rarity === Rarity.EPIC ? '史詩' : item.rarity === Rarity.RARE ? '稀有' : '普通'}
                      </div>
                      
                      <div className={`text-base font-black mb-1 relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${RARITY_COLORS[item.rarity].text}`}>
                        {item.name}
                      </div>
                      
                      <div className="text-[11px] text-white/50 font-bold tracking-[2px] relative z-10">
                        {item.type === 'CHARACTER' ? '人物' : item.type === 'WEAPON' ? '神兵' : '道具'}
                      </div>

                      {item.rarity === Rarity.LEGENDARY && (
                        <motion.div 
                          animate={{ opacity: [0.1, 0.4, 0.1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute inset-0 bg-gradient-to-t from-amber-400/20 to-transparent pointer-events-none z-0"
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* 滑動提示 */}
              {results.length > 1 && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-30">
                  {results.map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: results.length * 0.1 + 0.5 }}
                onClick={closeResults}
                className="mt-8 px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm tracking-[2px] active:scale-95 transition-all"
              >
                收下機緣
              </motion.button>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: results.length * 0.1 + 0.6 }}
                onClick={() => handleSummon(lastCount)}
                className="mt-8 px-10 py-3 rounded-xl bg-[#d4af37] text-black font-black text-sm tracking-[2px] active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center gap-3"
              >
                <div className="flex items-center gap-1.5 pr-3 border-r border-black/20">
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 border border-white/20 shadow-sm"></div>
                  <span className="text-[13px] font-bold tabular-nums">{userData?.gold || 0}</span>
                </div>
                <span>再試一次</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GachaTab;
