
// Fix: Added missing React import to resolve namespace error
import React, { memo } from 'react';

interface BattleAreaProps {
  levelId: number;
  enemyAnim: 'idle' | 'hurt' | 'attack';
  isBossSlashActive: boolean;
  isPlayerSlashActive?: boolean;
  introStage: string;
  isFatigue: boolean;
  bossName: string;
  bossImg: string;
  speedMultiplier?: number;
}

const BattleArea: React.FC<BattleAreaProps> = memo(({ 
  levelId,
  enemyAnim, 
  isBossSlashActive, 
  isPlayerSlashActive, 
  introStage, 
  isFatigue,
  bossName,
  bossImg,
  speedMultiplier = 1
}) => {
  const isCharacterVisible = !['none', 'starting', 'gold_line', 'bg'].includes(introStage);
  const isNameVisible = ['boss_name_show', 'enemy_hp', 'player_hp', 'input_pad', 'ready', 'playing'].includes(introStage);

  const isConfucius = levelId === 6;
  const isZhugeLiang = levelId === 9;
  const isLiBai = levelId === 11;
  const isLiuZongyuan = levelId === 2;

  const effectiveBossImg = isLiuZongyuan ? `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan_battle.png` : bossImg;

  // 計算動態時間係數，用於縮短動畫時長
  const animScale = speedMultiplier > 1 ? (1 / speedMultiplier) : 1;

  // 計算立繪的 Transform 樣式
  const getSpriteTransform = () => {
    if (isLiuZongyuan) {
      // 柳宗元：左移 75px (原 65px) + 縮放 0.95x
      return 'translate3d(-75px, 0, 0) scale(0.95)';
    }
    if (isZhugeLiang) {
      // 諸葛亮：位移（下移 45px，原為 40px） + 縮放微調至 1.15
      return 'translate3d(-130px, 45px, 0) scale(1.15)';
    }
    if (isLiBai) {
      // 李白：左移 110px + 下移 5px (原上移 0px) + 縮放 1
      return 'translate3d(-110px, 5px, 0) scale(1)';
    }
    if (isConfucius) {
      // 孔子：縮放 1.2
      return 'scale(1.2)';
    }
    return 'none';
  };

  return (
    <div className="w-full h-full relative" style={{ 
      overflow: 'visible',
      ['--anim-scale' as any]: animScale,
      ['--breathing-duration' as any]: `${4 * animScale}s`,
      ['--swing-duration' as any]: `${1.6 * animScale}s`,
      ['--hurt-duration' as any]: `${0.4 * animScale}s`,
      ['--name-duration' as any]: `${0.6 * animScale}s`
    }}>
      {/* Boss 攻擊特效容器 */}
      {isBossSlashActive && (
        <div className="absolute inset-0 z-[9000] pointer-events-none overflow-visible">
          {!isConfucius ? (
            <>
              <div className="slash-line-base boss-slash-line" style={{ '--rot': '-45deg', top: '40%', left: '50%', animationDuration: `${0.5 * animScale}s` } as any} />
              <div className="slash-line-base boss-slash-line" style={{ '--rot': '45deg', top: '40%', left: '50%', animationDelay: `${0.64 * animScale}s`, animationDuration: `${0.5 * animScale}s` } as any} />
            </>
          ) : null}
        </div>
      )}

      {/* 玩家攻擊特效容器 */}
      <div className="absolute inset-0 z-[10001] pointer-events-none">
          {isPlayerSlashActive && (
            <>
                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white opacity-0 animate-[energy-pop_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ boxShadow: '0 0 30px #00f2ff', animationDuration: `${0.4 * animScale}s` }} />
                <div className="slash-line-base player-slash-line" style={{ '--rot': '-35deg', top: '40%', left: '50%', animationDuration: `${0.5 * animScale}s` } as any} />
            </>
          )}
      </div>

      {/* 角色層容器 */}
      <div 
        className={`absolute top-0 left-0 w-full h-[62%] transition-opacity duration-[1000ms] ${isCharacterVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ overflow: 'visible', pointerEvents: 'none', transitionDuration: `${1000 * animScale}ms` }}
      >
        <div 
          className={`
            absolute bottom-[3px] left-0 w-full flex flex-col items-center justify-end
            ${!isFatigue && enemyAnim === 'idle' ? 'enemy-breathing' : 'base-offset'}
            ${isFatigue ? 'boss-fatigue-anim' : ''}
          `}
          style={{ height: '88%', transformOrigin: 'bottom center', willChange: 'transform', zIndex: 10 } as any}
        >
          <div 
            className={`
              w-full h-full flex flex-col items-center justify-end
              ${enemyAnim === 'hurt' ? (isFatigue ? 'fatigue-hurt-anim' : 'hurt-anim-base') : ''}
              ${enemyAnim === 'attack' ? (isConfucius ? 'confucius-chariot-charge' : 'enemy-swing-x') : ''}
            `}
            style={{ willChange: 'transform', transformOrigin: 'bottom center' }}
          >
            {/* 名字標籤 - 保持原位 */}
            <div 
              className="absolute z-[100] pointer-events-none"
              style={{ 
                top: '-15%', 
                left: '50%',
                transform: `translateX(-50%) translate3d(-50px, ${isFatigue ? '45px' : '35px'}, 0)`,
                transition: `transform ${0.7 * animScale}s cubic-bezier(0.16, 1, 0.3, 1)`,
                willChange: 'transform'
              }}
            >
              <div className={`flex flex-col items-center transition-opacity duration-500 ${isNameVisible ? 'boss-name-anim opacity-100' : 'opacity-0'}`} style={{ transitionDuration: `${500 * animScale}ms` }}>
                <div className="text-[1.1rem] mb-[-4px] text-white flex justify-center" style={{ lineHeight: 1, transform: 'translate3d(0, -3px, 0) scale(0.325, 0.65)', transformOrigin: 'center bottom', textShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 4px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.8)' }}>◆</div>
                <div className="flex items-center justify-center mr-[-4px]">
                   <span className="mt-[1px] text-white font-black tracking-[4px] text-shadow-sm">{bossName}</span>
                </div>
              </div>
            </div>

            <div className="relative h-full flex items-end justify-center" style={{ 
              width: '100%', 
              maxWidth: '95%', 
              filter: isFatigue ? 'grayscale(0.45) brightness(0.6)' : 'none', 
              transition: `filter ${1.2 * animScale}s ease-in-out`,
              transform: getSpriteTransform()
            }}>
              <div className="relative h-full flex items-end justify-center">
                {/* 李白背影/陰影 */}
                {isLiBai && (
                  <div className="absolute inset-0 pointer-events-none flex justify-center items-end" style={{ zIndex: 8, transform: 'translate3d(135px, 20px, 0)' }}>
                    <img src={`${import.meta.env.BASE_URL}resources/avatar/li_bai/li_bai_shadow.png`} alt="" style={{ height: '100%', width: 'auto', maxWidth: 'none', objectFit: 'contain', opacity: 0.7, filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))', display: 'block' }} />
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none flex justify-center items-end" style={{ opacity: 0.6, zIndex: 5 }}>
                   <img src={effectiveBossImg} alt="" style={{ height: '100%', width: 'auto', maxWidth: 'none', objectFit: 'contain', filter: 'drop-shadow(0 0 15px #ff0000)', display: 'block' }} />
                </div>
                <img src={effectiveBossImg} alt={bossName} style={{ height: '100%', width: 'auto', maxWidth: 'none', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))', display: 'block', position: 'relative', zIndex: 10 }} />
                
                <div className={`absolute inset-0 pointer-events-none flex justify-center items-end ${enemyAnim === 'hurt' ? 'hurt-flash-active' : 'opacity-0'}`} style={{ zIndex: 16 }}>
                  <div style={{
                    height: '100%', width: '100%', backgroundColor: '#ff0000', 
                    maskImage: `url("${effectiveBossImg}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center bottom', 
                    WebkitMaskImage: `url("${effectiveBossImg}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center bottom'
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes enemyBreath { 
            0%, 100% { transform: translate3d(50px, 8px, 0) scale(1); } 
            50% { transform: translate3d(50px, 0px, 0) scale(1.01); } 
          }
          .enemy-breathing { animation: enemyBreath var(--breathing-duration) cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }

          @keyframes swing-attack-x { 
            0% { transform: translate3d(0, 0, 0) scale(1) rotate(0); } 
            25% { transform: translate3d(100px, -128px, 0) scale(0.8) rotate(-14deg); } 
            40% { transform: translate3d(-110px, 132px, 0) scale(1.4) rotate(22deg); } 
            50% { transform: translate3d(0, 0, 0) scale(1.02) rotate(0); }
            68% { transform: translate3d(-115px, -133px, 0) scale(0.78) rotate(7deg); } 
            80% { transform: translate3d(125px, 147px, 0) scale(1.5) rotate(-12deg); }
            100% { transform: translate3d(0, 0, 0) scale(1) rotate(0); } 
          }
          .enemy-swing-x { animation: swing-attack-x var(--swing-duration) cubic-bezier(0.1, 0.8, 0.2, 1) forwards; }

          @keyframes confucius-chariot-charge-anim {
            0% { transform: translate3d(0, 0, 0) scale(1) rotate(0); }
            20% { transform: translate3d(140px, 50px, 0) scale(0.8) rotate(-10deg); }
            40% { transform: translate3d(-400px, 100px, 0) scale(2.6) rotate(15deg); }
            65% { transform: translate3d(0, 0, 0) scale(1) rotate(0); }
            100% { transform: translate3d(0, 0, 0) scale(1) rotate(0); }
          }
          .confucius-chariot-charge { animation: confucius-chariot-charge-anim var(--swing-duration) cubic-bezier(0.15, 0, 0.2, 1) forwards; }

          @keyframes shake-hurt-triple { 
            0%, 100% { transform: translate3d(0, 0, 0) rotate(0); } 
            15% { transform: translate3d(-24px, 0, 0) rotate(-2deg); } 
            30% { transform: translate3d(24px, 0, 0) rotate(2deg); } 
            45% { transform: translate3d(-18px, 0, 0) rotate(-1.5deg); } 
            60% { transform: translate3d(18px, 0, 0) rotate(1.5deg); } 
            75% { transform: translate3d(-8px, 0, 0) rotate(-0.5deg); } 
          }
          .hurt-anim-base { animation: shake-hurt-triple var(--hurt-duration) cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }

          @keyframes flash-red { 0% { opacity: 0.8; } 100% { opacity: 0; } }
          .hurt-flash-active { animation: flash-red var(--hurt-duration) forwards; }

          @keyframes name-slide-up {
            0% { opacity: 0; transform: translate3d(0, 20px, 0) scale(0.95); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          }
          .boss-name-anim { animation: name-slide-up var(--name-duration) cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .text-shadow-sm { text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5); }
        `}</style>
      </div>
    </div>
  );
});

export default BattleArea;