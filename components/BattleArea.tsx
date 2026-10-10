
// Fix: Added missing React import to resolve namespace error
import React, { memo, useLayoutEffect, useRef, useState } from 'react';
import { BossAttackStyle, FlyingSwordAttackConfig, FLYING_SWORD_TIMING } from '../types';

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
  /** Boss 攻擊演出類型（由 getBossAttackStyle(level) 決定） */
  attackStyle?: BossAttackStyle;
  /** attackStyle === 'flyingSword' 時的分層素材 */
  flyingSword?: FlyingSwordAttackConfig;
}

/** 飛劍演出在 BattleArea 根座標系中的幾何（每次攻擊開始時量測） */
interface FlyGeom {
  left: number; top: number; width: number; height: number;
  /** 衝擊點（玩家側） */
  tx: number; ty: number;
  vars: Record<string, string>;
}

/** 玩家側的衝擊點：畫面水平中央、玩家血條（bottom: 40%）上方 */
const IMPACT_X = 0.5;
const IMPACT_Y = 0.57;
/** 命中時飛劍放大倍率（飛向鏡頭） */
const IMPACT_SCALE = 1.6;

/** 含 CSS 自訂屬性（--xxx）的 inline style */
const cssVars = (style: React.CSSProperties & Record<`--${string}`, string | number>) => style as React.CSSProperties;
const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
const normDeg = (d: number) => { let r = ((d + 180) % 360 + 360) % 360 - 180; if (r === -180) r = 180; return r; };

/** 依量測結果計算飛劍關鍵影格所需的 CSS 變數 */
const computeFlyGeom = (root: DOMRect, layer: DOMRect, cfg: FlyingSwordAttackConfig): FlyGeom => {
  const s = layer.width / cfg.frameW;
  const left = layer.left - root.left, top = layer.top - root.top;
  const px = left + cfg.pivot.x * s, py = top + cfg.pivot.y * s;
  const tx = root.width * IMPACT_X, ty = root.height * IMPACT_Y;
  const aim = Math.atan2(ty - py, tx - px) * 180 / Math.PI;
  const rot = normDeg(aim - cfg.tipAngle);
  const tipLen = cfg.bladeLength * s;
  const a = aim * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
  // 劍身大半「穿出」衝擊點（飛向鏡頭的感覺），劍柄停在衝擊點前方約 30% 劍長處
  const reach = tipLen * IMPACT_SCALE * 0.3;
  const dx = tx - reach * ux - px, dy = ty - reach * uy - py;
  const dist = Math.hypot(dx, dy);
  // 蓄勢：沿反方向後拉並微微上提
  const pullX = -ux * dist * 0.16, pullY = -uy * dist * 0.16 - 50 * s;
  // 回程弧線：取中點並向行進方向左側偏移
  const side = dx >= 0 ? -1 : 1;
  const mx = dx * 0.5 + (-uy) * dist * 0.2 * side, my = dy * 0.5 + ux * dist * 0.2 * side;
  // 回程多轉一圈（反向）後回到 0°（以 ±360° 收尾，視覺等同 0°）
  const endRot = rot >= 0 ? 360 : -360;
  const overshoot = rot >= 0 ? -10 : 10;
  const f = (n: number) => `${n.toFixed(2)}px`, d = (n: number) => `${n.toFixed(2)}deg`;
  return {
    left, top, width: layer.width, height: layer.height, tx, ty,
    vars: {
      '--fs-pull-x': f(pullX), '--fs-pull-y': f(pullY),
      '--fs-dx': f(dx), '--fs-dy': f(dy),
      '--fs-rx': f(dx - ux * dist * 0.03), '--fs-ry': f(dy - uy * dist * 0.03),
      '--fs-mx': f(mx), '--fs-my': f(my),
      '--fs-rot': d(rot), '--fs-rot-pre': d(rot + overshoot), '--fs-rot-q1': d(rot - overshoot * 0.35), '--fs-rot-q2': d(rot + overshoot * 0.15),
      '--fs-rot-mid': d((rot + endRot) / 2), '--fs-rot-end': d(endRot), '--fs-rot-settle': d(endRot + overshoot * 0.3),
      '--fs-scale': String(IMPACT_SCALE), '--fs-scale-r': String(IMPACT_SCALE * 0.97), '--fs-scale-mid': String((IMPACT_SCALE + 1) / 2),
    }
  };
};


const BattleArea: React.FC<BattleAreaProps> = memo(({ 
  levelId,
  enemyAnim, 
  isBossSlashActive, 
  isPlayerSlashActive, 
  introStage, 
  isFatigue,
  bossName,
  bossImg,
  speedMultiplier = 1,
  attackStyle = 'swingSlash',
  flyingSword
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

  // ---- 飛劍（attackStyle: 'flyingSword'）----
  const isFlyingSword = attackStyle === 'flyingSword' && !!flyingSword;
  const isSwordAttack = isFlyingSword && enemyAnim === 'attack';
  const rootRef = useRef<HTMLDivElement>(null);
  const restFxRef = useRef<HTMLImageElement>(null);
  const [measuredGeom, setMeasuredGeom] = useState<FlyGeom | null>(null);
  // 攻擊開始的同一影格（繪製前）量測劍在手中的位置，換算成根座標系的飛行路徑
  useLayoutEffect(() => {
    if (!isSwordAttack || !flyingSword) return;
    const root = rootRef.current?.getBoundingClientRect();
    const layer = restFxRef.current?.getBoundingClientRect();
    if (!root || !layer || layer.width === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 量測版面後同步重繪（useLayoutEffect 的標準用途，繪製前完成，不會閃爍）
    setMeasuredGeom(computeFlyGeom(root, layer, flyingSword));
  }, [isSwordAttack, flyingSword]);
  const flyGeom = isSwordAttack ? measuredGeom : null;
  const fsTotal = FLYING_SWORD_TIMING.total * animScale;
  const fsImpact = FLYING_SWORD_TIMING.impact * animScale;
  /** 全幅圖層疊回戰鬥立繪裁切框的定位 */
  const frameLayerStyle: React.CSSProperties | undefined = flyingSword ? {
    position: 'absolute',
    left: pct(-flyingSword.crop.x / flyingSword.crop.w), top: pct(-flyingSword.crop.y / flyingSword.crop.h),
    width: pct(flyingSword.frameW / flyingSword.crop.w), height: pct(flyingSword.frameH / flyingSword.crop.h),
    maxWidth: 'none', display: 'block', pointerEvents: 'none'
  } : undefined;
  const restFxClass = isSwordAttack ? 'fs-rest-hidden' : '';
  const restFxAnim: React.CSSProperties = isSwordAttack ? { animationDuration: `${fsTotal}ms` } : {};
  const renderSwordLayers = (withRef: boolean) => flyingSword && (
    <>
      <img ref={withRef ? restFxRef : undefined} src={flyingSword.effectImg} alt="" className={restFxClass} style={{ ...frameLayerStyle, ...restFxAnim }} />
      <img src={flyingSword.characterImg} alt="" style={frameLayerStyle} />
    </>
  );

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
    <div ref={rootRef} className="w-full h-full relative" style={{ 
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
          {isFlyingSword ? (
            flyGeom && (
              <div className="fs-burst" style={cssVars({ left: flyGeom.tx, top: flyGeom.ty, '--fs-burst-dur': `${460 * animScale}ms` })}>
                <div className="fs-burst-core" />
                <div className="fs-burst-ring" />
                <div className="fs-burst-streak" />
              </div>
            )
          ) : !isConfucius ? (
            <>
              <div className="slash-line-base boss-slash-line" style={{ '--rot': '-45deg', top: '40%', left: '50%', animationDuration: `${0.5 * animScale}s` } as any} />
              <div className="slash-line-base boss-slash-line" style={{ '--rot': '45deg', top: '40%', left: '50%', animationDelay: `${0.64 * animScale}s`, animationDuration: `${0.5 * animScale}s` } as any} />
            </>
          ) : null}
        </div>
      )}

      {/* 飛劍：在根座標系飛行（不受立繪縮放／位移影響），飛行時畫在角色與介面之上 */}
      {isSwordAttack && flyGeom && flyingSword && (
        <div className="absolute inset-0 z-[9001] pointer-events-none overflow-visible" aria-hidden="true">
          {[{ d: 72, o: 0.16 }, { d: 48, o: 0.28 }, { d: 24, o: 0.45 }].map(g => (
            <div key={g.d} className="fs-trail" style={cssVars({ '--fs-trail-o': g.o, animationDuration: `${fsTotal}ms` })}>
              <div className="fs-fly fs-ghost" style={{
                left: flyGeom.left, top: flyGeom.top, width: flyGeom.width, height: flyGeom.height,
                transformOrigin: `${pct(flyingSword.pivot.x / flyingSword.frameW)} ${pct(flyingSword.pivot.y / flyingSword.frameH)}`,
                animationDuration: `${fsTotal}ms`, animationDelay: `${g.d * animScale}ms`, ...flyGeom.vars
              } as React.CSSProperties}>
                <img src={flyingSword.effectImg} alt="" />
              </div>
            </div>
          ))}
          <div className="fs-fly" style={{
            left: flyGeom.left, top: flyGeom.top, width: flyGeom.width, height: flyGeom.height,
            transformOrigin: `${pct(flyingSword.pivot.x / flyingSword.frameW)} ${pct(flyingSword.pivot.y / flyingSword.frameH)}`,
            animationDuration: `${fsTotal}ms`, ...flyGeom.vars
          } as React.CSSProperties}>
            <img src={flyingSword.effectImg} alt="" />
            <img src={flyingSword.effectImg} alt="" className="fs-flicker" style={{ transformOrigin: `${pct(flyingSword.pivot.x / flyingSword.frameW)} ${pct(flyingSword.pivot.y / flyingSword.frameH)}` }} />
          </div>
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
              ${enemyAnim === 'attack' ? (isFlyingSword ? 'boss-cast-lean' : attackStyle === 'chariotCharge' ? 'confucius-chariot-charge' : 'enemy-swing-x') : ''}
            `}
            style={cssVars({ willChange: 'transform', transformOrigin: 'bottom center', '--cast-duration': `${fsTotal}ms` })}
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
                {isFlyingSword ? (
                  <>
                    {/* 分層立繪：effect（劍＋火焰）在下、character 在上，靜止時與戰鬥立繪逐像素相同；攻擊時手中的劍隱藏、改由飛劍層演出 */}
                    <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6, zIndex: 5, filter: 'drop-shadow(0 0 15px #ff0000)' }}>
                      {renderSwordLayers(false)}
                    </div>
                    {/* 以原戰鬥立繪撐出版面尺寸（不顯示） */}
                    <img src={effectiveBossImg} alt={bossName} style={{ height: '100%', width: 'auto', maxWidth: 'none', objectFit: 'contain', display: 'block', position: 'relative', visibility: 'hidden' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10, filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))' }}>
                      {renderSwordLayers(true)}
                      {isSwordAttack && <img src={flyingSword!.effectImg} alt="" className="fs-reduced-flash" style={{ ...frameLayerStyle, animationDuration: `${fsImpact + 200 * animScale}ms` }} />}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 pointer-events-none flex justify-center items-end" style={{ opacity: 0.6, zIndex: 5 }}>
                       <img src={effectiveBossImg} alt="" style={{ height: '100%', width: 'auto', maxWidth: 'none', objectFit: 'contain', filter: 'drop-shadow(0 0 15px #ff0000)', display: 'block' }} />
                    </div>
                    <img src={effectiveBossImg} alt={bossName} style={{ height: '100%', width: 'auto', maxWidth: 'none', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))', display: 'block', position: 'relative', zIndex: 10 }} />
                  </>
                )}
                
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
          /* ===== 飛劍（attackStyle: 'flyingSword'）時間軸：總長 1100ms（×速度倍率）=====
             0–220 蓄勢（離手、後拉、轉向瞄準）→ 220–520 疾刺（放大＝飛向鏡頭）→ 520 命中
             → 520–660 釘住震顫 → 660–1020 弧線迴旋飛回 → 1020–1100 入手微彈 */
          @keyframes fs-fly-anim {
            0%      { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); opacity: 1; animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1); }
            20.00%    { transform: translate3d(var(--fs-pull-x), var(--fs-pull-y), 0) rotate(var(--fs-rot-pre)) scale(1.06); animation-timing-function: cubic-bezier(0.5, 0, 0.8, 0.55); }
            47.27%    { transform: translate3d(var(--fs-dx), var(--fs-dy), 0) rotate(var(--fs-rot)) scale(var(--fs-scale)); animation-timing-function: ease-out; }
            50.91%    { transform: translate3d(var(--fs-rx), var(--fs-ry), 0) rotate(var(--fs-rot-q1)) scale(var(--fs-scale-r)); }
            55.45%    { transform: translate3d(var(--fs-dx), var(--fs-dy), 0) rotate(var(--fs-rot-q2)) scale(var(--fs-scale)); }
            60.00%    { transform: translate3d(var(--fs-dx), var(--fs-dy), 0) rotate(var(--fs-rot)) scale(var(--fs-scale)); animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1); }
            76.36%    { transform: translate3d(var(--fs-mx), var(--fs-my), 0) rotate(var(--fs-rot-mid)) scale(var(--fs-scale-mid)); animation-timing-function: cubic-bezier(0.3, 0.6, 0.4, 1); }
            92.73%   { transform: translate3d(0, 0, 0) rotate(var(--fs-rot-settle)) scale(1); animation-timing-function: ease-out; }
            99.5%   { transform: translate3d(0, 0, 0) rotate(var(--fs-rot-end)) scale(1); opacity: 1; }
            100%    { transform: translate3d(0, 0, 0) rotate(var(--fs-rot-end)) scale(1); opacity: 0; }
          }
          .fs-fly { position: absolute; will-change: transform, opacity; animation-name: fs-fly-anim; animation-fill-mode: both; animation-timing-function: linear; }
          .fs-fly img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; display: block; }
          .fs-ghost img { mix-blend-mode: screen; }
          /* 殘影只在疾刺與回程時出現 */
          @keyframes fs-trail-anim {
            0%, 16.36% { opacity: 0; }
            22.73%, 45.45% { opacity: var(--fs-trail-o); }
            49.09%, 61.82% { opacity: 0; }
            67.27%, 89.09% { opacity: calc(var(--fs-trail-o) * 0.8); }
            93.64%, 100% { opacity: 0; }
          }
          .fs-trail { position: absolute; inset: 0; opacity: 0; animation-name: fs-trail-anim; animation-fill-mode: both; animation-timing-function: linear; will-change: opacity; }
          /* 火焰閃爍：疊一層 screen 混合的同圖，不規則改變透明度與縱向比例 */
          @keyframes fs-flicker-anim {
            0%   { opacity: 0.15; transform: scale(1, 1); }
            20%  { opacity: 0.55; transform: scale(1.01, 1.05); }
            40%  { opacity: 0.25; transform: scale(1, 0.98); }
            60%  { opacity: 0.7;  transform: scale(1.015, 1.07); }
            80%  { opacity: 0.3;  transform: scale(1, 1.01); }
            100% { opacity: 0.15; transform: scale(1, 1); }
          }
          .fs-fly img.fs-flicker { mix-blend-mode: screen; animation: fs-flicker-anim 180ms steps(1, end) infinite; will-change: opacity, transform; }
          /* 手中原位的劍：攻擊全程隱藏，演出最後一格才恢復（此時飛劍層剛好疊回原位並淡出） */
          @keyframes fs-rest-hide { 0%, 99.5% { opacity: 0; } 100% { opacity: 1; } }
          .fs-rest-hidden { animation-name: fs-rest-hide; animation-fill-mode: both; animation-timing-function: linear; }
          .fs-reduced-flash { display: none !important; }
          /* 施法前傾：角色不離位，只微微傾向出劍方向 */
          @keyframes boss-cast-lean-anim {
            0%   { transform: translate3d(0, 0, 0) rotate(0deg); animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1); }
            20.00% { transform: translate3d(-6px, 2px, 0) rotate(-1.2deg); animation-timing-function: cubic-bezier(0.7, 0, 0.9, 0.5); }
            47.27% { transform: translate3d(-12px, 4px, 0) rotate(-2.2deg); }
            60.00% { transform: translate3d(-10px, 3px, 0) rotate(-1.8deg); animation-timing-function: ease-in-out; }
            92.73%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          }
          .boss-cast-lean { animation: boss-cast-lean-anim var(--cast-duration) linear forwards; }
          /* 玩家側命中：白熱核心＋火環＋橫向光痕 */
          .fs-burst { position: absolute; width: 0; height: 0; }
          .fs-burst > div { position: absolute; left: 0; top: 0; will-change: transform, opacity; }
          .fs-burst-core { width: 220px; height: 220px; margin: -110px 0 0 -110px; border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,230,160,0.95) 18%, rgba(255,140,40,0.7) 40%, rgba(255,60,0,0) 70%);
            animation: fs-burst-core-anim var(--fs-burst-dur) cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .fs-burst-ring { width: 160px; height: 160px; margin: -80px 0 0 -80px; border-radius: 50%; border: 6px solid rgba(255,190,90,0.95);
            box-shadow: 0 0 24px rgba(255,120,30,0.9), inset 0 0 18px rgba(255,200,120,0.8);
            animation: fs-burst-ring-anim var(--fs-burst-dur) cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .fs-burst-streak { width: 420px; height: 10px; margin: -5px 0 0 -210px; border-radius: 50%;
            background: linear-gradient(90deg, rgba(255,160,60,0) 0%, rgba(255,245,220,1) 50%, rgba(255,160,60,0) 100%);
            animation: fs-burst-streak-anim var(--fs-burst-dur) cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          @keyframes fs-burst-core-anim { 0% { transform: scale(0.2); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
          @keyframes fs-burst-ring-anim { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
          @keyframes fs-burst-streak-anim { 0% { transform: rotate(-12deg) scale(0.2, 1); opacity: 1; } 60% { opacity: 0.9; } 100% { transform: rotate(-12deg) scale(1.3, 0.3); opacity: 0; } }

          /* 減少動態效果：劍留在手中，只做原位閃光＋命中閃光（無位移、無縮放、無傾身） */
          @keyframes fs-reduced-flash-anim { 0%, 60% { opacity: 0; } 80% { opacity: 0.9; } 100% { opacity: 0; } }
          @keyframes fs-burst-fade { 0% { opacity: 0.9; } 100% { opacity: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .fs-fly, .fs-trail { display: none !important; }
            .fs-rest-hidden { animation: none !important; opacity: 1 !important; }
            .boss-cast-lean { animation: none !important; }
            .fs-reduced-flash { display: block !important; mix-blend-mode: screen; opacity: 0; animation-name: fs-reduced-flash-anim; animation-fill-mode: both; animation-timing-function: linear; }
            .fs-burst-core { animation-name: fs-burst-fade !important; transform: scale(1.2); }
            .fs-burst-ring, .fs-burst-streak { display: none; }
          }
          .text-shadow-sm { text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5); }
        `}</style>
      </div>
    </div>
  );
});

export default BattleArea;