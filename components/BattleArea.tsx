
import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BossAttackStyle, WeaponLayerConfig, FLYING_SWORD_TIMING, X_SLASH_TIMING } from '../types';
import { BOSS_NAME_SLOT, BattleLayout, BattleScene, BattleSceneBox } from '../data/battleLayout';
import { buildWeave, sampleWeave, WeaveTrack, WEAVE_PERSPECTIVE } from './swordWeave';

/** 鏡射補邊圖塊（不含中央本體） */
const MIRROR_TILES: [number, number][] = [-1, 0, 1].flatMap(i => [-1, 0, 1].map(j => [i, j] as [number, number])).filter(([i, j]) => i || j);

interface BattleAreaProps {
  levelId: number;
  enemyAnim: 'idle' | 'hurt' | 'attack';
  isBossSlashActive: boolean;
  isPlayerSlashActive?: boolean;
  introStage: string;
  /** 入陣無縫轉場：主頁場景交接期間，背景與人物直接顯示（開場其餘照原順序） */
  holdScene?: boolean;
  /** 入陣無縫轉場：待機呼吸改用主頁的 homeSceneBreathe 與同一原點（App 根容器座標），相位由 syncHeroAnimations 接續 */
  inheritBreathOrigin?: [number, number] | null;
  bossName: string;
  /** 戰鬥立繪（level.battleImg ?? level.bossImg） */
  bossImg: string;
  /** 篇章背景；與立繪放在同一個場景容器，逐像素對齊（見 BATTLE_SCENES） */
  bgImg?: string;
  speedMultiplier?: number;
  /** Boss 攻擊演出類型（由 getBossAttackStyle(level) 決定） */
  attackStyle?: BossAttackStyle;
  /** attackStyle 為 'flyingSword' / 'xSlash' 時的分層武器素材 */
  weaponLayers?: WeaponLayerConfig;
  /** 以人物錨點算出的立繪版面（data/battleLayout.ts）；null 時退回舊的置中＋底部對齊 */
  layout?: BattleLayout | null;
  /** 場景落地資料；有則背景 cover 填滿 */
  scene?: BattleScene | null;
  /** 由 computeGroundedBattle 算出的背景框（可與立繪不同縮放） */
  sceneBox?: BattleSceneBox | null;
  /** 背景攻擊時變暗 */
  bgDimmed?: boolean;
  bgDimDuration?: number;
}

/** 飛劍演出在 BattleArea 根座標系中的幾何（每次攻擊開始時量測） */
interface FlyGeom {
  left: number; top: number; width: number; height: number;
  /** 衝擊點（玩家側） */
  tx: number; ty: number;
  vars: Record<string, string>;
}

/** 飛劍：玩家側的衝擊點（畫面水平中央、玩家血條上方） */
const IMPACT_X = 0.5;
const IMPACT_Y = 0.57;
/** 命中時飛劍放大倍率（飛向鏡頭） */
const IMPACT_SCALE = 1.6;

/** 含 CSS 自訂屬性（--xxx）的 inline style */
const cssVars = (style: React.CSSProperties & Record<`--${string}`, string | number>) => style as React.CSSProperties;
const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
const normDeg = (d: number) => { let r = ((d + 180) % 360 + 360) % 360 - 180; if (r === -180) r = 180; return r; };
const fpx = (n: number) => `${n.toFixed(2)}px`, fdeg = (n: number) => `${n.toFixed(2)}deg`;
const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 依量測結果計算飛劍關鍵影格所需的 CSS 變數 */
const computeFlyGeom = (root: DOMRect, layer: DOMRect, cfg: WeaponLayerConfig): FlyGeom => {
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
  return {
    left, top, width: layer.width, height: layer.height, tx, ty,
    vars: {
      '--fs-pull-x': fpx(pullX), '--fs-pull-y': fpx(pullY),
      '--fs-dx': fpx(dx), '--fs-dy': fpx(dy),
      '--fs-rx': fpx(dx - ux * dist * 0.03), '--fs-ry': fpx(dy - uy * dist * 0.03),
      '--fs-mx': fpx(mx), '--fs-my': fpx(my),
      '--fs-rot': fdeg(rot), '--fs-rot-pre': fdeg(rot + overshoot), '--fs-rot-q1': fdeg(rot - overshoot * 0.35), '--fs-rot-q2': fdeg(rot + overshoot * 0.15),
      '--fs-rot-mid': fdeg((rot + endRot) / 2), '--fs-rot-end': fdeg(endRot), '--fs-rot-settle': fdeg(endRot + overshoot * 0.3),
      '--fs-scale': String(IMPACT_SCALE), '--fs-scale-r': String(IMPACT_SCALE * 0.97), '--fs-scale-mid': String((IMPACT_SCALE + 1) / 2),
    }
  };
};

/** 李白背影層：原本以 0.62×0.88×畫面高 的立繪為基準位移 (135px, 20px)，改以立繪高度比例表示 */
const LI_BAI_SHADOW = { w: 1111, h: 1504, dxRatio: 135 / 460.5, dyRatio: 20 / 460.5 };

const BattleArea: React.FC<BattleAreaProps> = memo(({
  levelId,
  enemyAnim,
  isBossSlashActive,
  isPlayerSlashActive,
  introStage,
  holdScene = false,
  inheritBreathOrigin = null,
  bossName,
  bossImg,
  bgImg,
  speedMultiplier = 1,
  attackStyle = 'swingSlash',
  weaponLayers,
  layout = null,
  scene = null,
  sceneBox: sceneBoxProp = null,
  bgDimmed = false,
  bgDimDuration = 400,
}) => {
  /** 入陣交接：主頁人物沒有紅光／陰影，交接後才淡入（避免瞬間跳出） */
  const auraFade: React.CSSProperties = { transition: 'opacity 700ms ease, filter 700ms ease' };
  const isCharacterVisible = !['none', 'starting', 'gold_line', 'bg'].includes(introStage);
  const isNameVisible = ['boss_name_show', 'enemy_hp', 'player_hp', 'input_pad', 'ready', 'playing'].includes(introStage);
  const isLiBai = levelId === 11;

  // 計算動態時間係數，用於縮短動畫時長
  const animScale = speedMultiplier > 1 ? (1 / speedMultiplier) : 1;

  // ---- 分層武器攻擊（'flyingSword' 飛劍直刺／'xSlash' 飛劍穿梭 X 斬）----
  const isWeaponStyle = (attackStyle === 'flyingSword' || attackStyle === 'xSlash') && !!weaponLayers;
  const isXSlash = isWeaponStyle && attackStyle === 'xSlash';
  const isFlyingSword = isWeaponStyle && attackStyle === 'flyingSword';
  const isSwordAttack = isWeaponStyle && enemyAnim === 'attack';
  const timing = isXSlash ? X_SLASH_TIMING : FLYING_SWORD_TIMING;
  const fxTotal = timing.total * animScale;
  const fxImpact = timing.impact * animScale;
  const burstDur = 460 * animScale;
  const rootRef = useRef<HTMLDivElement>(null);
  const restFxRef = useRef<HTMLImageElement>(null);
  const [measuredGeom, setMeasuredGeom] = useState<FlyGeom | null>(null);
  const [measuredWeave, setMeasuredWeave] = useState<WeaveTrack | null>(null);
  // rAF 直接寫入的節點（飛劍、透視容器）
  const weaveFlyRef = useRef<HTMLDivElement>(null);
  const weaveStageRef = useRef<HTMLDivElement>(null);
  /** 本次攻擊的特效是否已播完（播完即卸載所有覆蓋層，不留任何可能擋住點擊的元素） */
  const [fxDone, setFxDone] = useState(false);
  /** 分頁隱藏時暫停 idle 飛劍（與圖鑑一致） */
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    const sync = () => setTabHidden(document.visibilityState === 'hidden');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  // 攻擊開始的同一影格（繪製前）量測劍在手中的位置，換算成根座標系的路徑
  useLayoutEffect(() => {
    if (!isSwordAttack || !weaponLayers) return;
    const root = rootRef.current?.getBoundingClientRect();
    const layer = restFxRef.current?.getBoundingClientRect();
    if (!root || !layer || layer.width === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 量測版面後同步重繪（useLayoutEffect 的標準用途，繪製前完成，不會閃爍）
    if (isXSlash) setMeasuredWeave(buildWeave(root, layer, weaponLayers));
    else setMeasuredGeom(computeFlyGeom(root, layer, weaponLayers));
    setFxDone(false);
  }, [isSwordAttack, isXSlash, weaponLayers]);
  // 演出（含命中爆光）結束後卸載覆蓋層
  useEffect(() => {
    if (!isSwordAttack) return;
    const t = window.setTimeout(() => setFxDone(true), Math.max(fxTotal, fxImpact + burstDur) + 30);
    return () => window.clearTimeout(t);
  }, [isSwordAttack, fxTotal, fxImpact, burstDur]);
  const flyGeom = isSwordAttack && !fxDone && !isXSlash ? measuredGeom : null;
  const weave = isSwordAttack && !fxDone && isXSlash ? measuredWeave : null;
  // 飛劍穿梭：rAF 依經過時間查 3D 路徑表，直接寫 transform / opacity（不經 React 重繪）
  useEffect(() => {
    if (!weave || prefersReducedMotion()) return;
    const T = X_SLASH_TIMING;
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = (now - start) / animScale;              // 換算回 1x 時間軸
      const v = sampleWeave(weave, t);
      const fly = weaveFlyRef.current, stage = weaveStageRef.current;
      if (fly) {
        // 鏡像時以握柄為軸 scaleX(-1)（最右邊＝最先套用），刀身軸也改用鏡像後的方向
        const ax = v.m ? weave.axisM : weave.axis, pp = v.m ? weave.perpM : weave.perp;
        fly.style.transform = `translate3d(${v.tx.toFixed(2)}px, ${v.ty.toFixed(2)}px, ${v.tz.toFixed(1)}px) rotateZ(${v.rz.toFixed(2)}deg) rotate3d(${ax.x.toFixed(4)}, ${ax.y.toFixed(4)}, 0, ${v.bank.toFixed(2)}deg) rotate3d(${pp.x.toFixed(4)}, ${pp.y.toFixed(4)}, 0, ${v.pitch.toFixed(2)}deg) scale(${v.k.toFixed(3)})${v.m ? ' scaleX(-1)' : ''}`;
        fly.style.opacity = t >= T.total ? '0' : v.op.toFixed(3);
      }
      // 遠離鏡頭時改畫在人物後方（穿到他身後），靠近鏡頭時畫在人物與介面之上
      if (stage) stage.style.zIndex = v.tz < -120 ? '5' : '9002';
      if (t < T.total + 20) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [weave, animScale]);

  /** 全幅圖層疊回戰鬥立繪裁切框的定位 */
  const frameLayerStyle: React.CSSProperties | undefined = weaponLayers ? {
    position: 'absolute',
    left: pct(-weaponLayers.crop.x / weaponLayers.crop.w), top: pct(-weaponLayers.crop.y / weaponLayers.crop.h),
    width: pct(weaponLayers.frameW / weaponLayers.crop.w), height: pct(weaponLayers.frameH / weaponLayers.crop.h),
    maxWidth: 'none', display: 'block', pointerEvents: 'none'
  } : undefined;
  const restFxClass = isSwordAttack ? 'fs-rest-hidden' : '';
  const restFxAnim: React.CSSProperties = isSwordAttack ? { animationDuration: `${fxTotal}ms` } : {};
  /** 第 2 關 idle：圖鑑飛劍繞身迴圈（攻擊時關掉，改走現有 X 斬） */
  const idleSaberLoop = levelId === 2 && isWeaponStyle;
  const idleSaberActive = idleSaberLoop && !isSwordAttack;
  const renderSwordLayers = (withRef: boolean) => weaponLayers && (
    <>
      <img ref={withRef ? restFxRef : undefined} src={weaponLayers.effectImg} alt="" className={restFxClass} style={{ ...frameLayerStyle, ...restFxAnim }} />
      <img src={weaponLayers.characterImg} alt="" style={frameLayerStyle} />
    </>
  );
  /** 全幅框內層（idle 飛劍 % 位移與此對齊） */
  const frameFill: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', display: 'block', pointerEvents: 'none' };
  const pivotOrigin = weaponLayers ? `${pct(weaponLayers.pivot.x / weaponLayers.frameW)} ${pct(weaponLayers.pivot.y / weaponLayers.frameH)}` : undefined;
  const bladeMidOrigin = weaponLayers ? (() => {
    const rad = weaponLayers.tipAngle * Math.PI / 180;
    const mx = weaponLayers.pivot.x + Math.cos(rad) * weaponLayers.bladeLength * 0.5;
    const my = weaponLayers.pivot.y + Math.sin(rad) * weaponLayers.bladeLength * 0.5;
    return `${pct(mx / weaponLayers.frameW)} ${pct(my / weaponLayers.frameH)}`;
  })() : undefined;
  /** 第 2 關：idle 雙層飛劍／攻擊時靜態手中劍（供量測＋隱藏） */
  const renderLiuWeaponStack = (withRef: boolean) => weaponLayers && (
    <div
      className="btl-saber-stage"
      data-hidden={tabHidden ? '1' : '0'}
      data-attacking={isSwordAttack ? '1' : '0'}
      style={frameLayerStyle}
    >
      {idleSaberActive ? (
        <>
          <div className="btl-saber is-back" style={{ transformOrigin: pivotOrigin }}>
            <div className="btl-saber-float">
              <div className="btl-saber-idle" style={{ transformOrigin: bladeMidOrigin }}>
                <img src={weaponLayers.effectImg} alt="" style={frameFill} draggable={false} />
              </div>
            </div>
          </div>
          <img src={weaponLayers.characterImg} alt="" style={frameFill} draggable={false} />
          <div className="btl-saber is-front" style={{ transformOrigin: pivotOrigin }}>
            <div className="btl-saber-float">
              <div className="btl-saber-idle" style={{ transformOrigin: bladeMidOrigin }}>
                <img ref={withRef ? restFxRef : undefined} src={weaponLayers.effectImg} alt="" style={frameFill} draggable={false} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <img ref={withRef ? restFxRef : undefined} src={weaponLayers.effectImg} alt="" className={restFxClass} style={{ ...frameFill, ...restFxAnim }} draggable={false} />
          <img src={weaponLayers.characterImg} alt="" style={frameFill} draggable={false} />
        </>
      )}
    </div>
  );

  // ---- 立繪版面（人物錨點）＋落地場景（背景與立繪同一 transform）----
  const imgFill: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', display: 'block', objectFit: 'contain', objectPosition: 'center bottom' };
  const sceneBox = sceneBoxProp ?? null;
  /** 疊在人物之上的前景層（孔子：雙馬＝武器層） */
  const frontImg = scene?.front;
  const maskSrc = frontImg ? `url("${bossImg}"), url("${frontImg}")` : `url("${bossImg}")`;
  const grounded = !!(scene && sceneBox && bgImg);
  const spriteBoxStyle: React.CSSProperties = layout
    ? { position: 'absolute', left: layout.left, top: layout.top, width: layout.width, height: layout.height }
    : { position: 'absolute', left: 0, right: 0, bottom: 3, height: '88%' };
  const spriteOrigin = layout ? `${layout.centerX}px ${layout.bottomY}px` : 'bottom center';

  return (
    <div ref={rootRef} className="w-full h-full relative" style={cssVars({
      overflow: 'visible',
      '--anim-scale': animScale,
      '--breathing-duration': `${4 * animScale}s`,
      '--breath-y': `${scene?.breathY ?? 8}px`,
      '--swing-duration': `${1.6 * animScale}s`,
      '--hurt-duration': `${0.4 * animScale}s`,
      '--name-duration': `${0.6 * animScale}s`
    })}>
      {/* Boss 攻擊特效容器 */}
      {isBossSlashActive && (
        <div className="absolute inset-0 z-[9000] pointer-events-none overflow-visible" aria-hidden="true">
          {isWeaponStyle ? (
            weave ? (
              <div className="fs-burst xs-burst" style={cssVars({ left: weave.cx, top: weave.cy, '--fs-burst-dur': `${burstDur}ms` })}>
                <div className="fs-burst-core" />
              </div>
            ) : flyGeom && (
              <div className="fs-burst" style={cssVars({ left: flyGeom.tx, top: flyGeom.ty, '--fs-burst-dur': `${burstDur}ms` })}>
                <div className="fs-burst-core" />
                <div className="fs-burst-ring" />
                <div className="fs-burst-streak" />
              </div>
            )
          ) : attackStyle !== 'chariotCharge' ? (
            <>
              <div className="slash-line-base boss-slash-line" style={cssVars({ '--rot': '-45deg', top: '40%', left: '50%', animationDuration: `${0.5 * animScale}s` })} />
              <div className="slash-line-base boss-slash-line" style={cssVars({ '--rot': '45deg', top: '40%', left: '50%', animationDelay: `${0.64 * animScale}s`, animationDuration: `${0.5 * animScale}s` })} />
            </>
          ) : null}
        </div>
      )}

      {/* 飛劍穿梭：CSS 3D 透視舞台（透視原點＝X 中心），劍以 translate3d 在 x/y/z 移動 */}
      {weave && weaponLayers && (
        <div ref={weaveStageRef} className="absolute inset-0 z-[9002] pointer-events-none overflow-visible" aria-hidden="true"
          style={{ perspective: `${WEAVE_PERSPECTIVE}px`, perspectiveOrigin: `${weave.ox}px ${weave.oy}px` }}>
          <div ref={weaveFlyRef} className="xs-fly" style={{
            left: weave.left, top: weave.top, width: weave.width, height: weave.height,
            transformOrigin: pivotOrigin, transformStyle: 'preserve-3d', willChange: 'transform, opacity'
          }}>
            <img src={weaponLayers.effectImg} alt="" />
          </div>
        </div>
      )}

      {/* 分層武器：在根座標系飛行（不受立繪縮放／位移影響），飛行時畫在角色與介面之上 */}
      {isSwordAttack && flyGeom && weaponLayers && (
        <div className="absolute inset-0 z-[9002] pointer-events-none overflow-visible" aria-hidden="true">
          {isFlyingSword && [{ d: 72, o: 0.16 }, { d: 48, o: 0.28 }, { d: 24, o: 0.45 }].map(g => (
            <div key={g.d} className="fs-trail" style={cssVars({ '--fs-trail-o': g.o, animationDuration: `${fxTotal}ms` })}>
              <div className="fs-fly fs-ghost" style={{
                left: flyGeom.left, top: flyGeom.top, width: flyGeom.width, height: flyGeom.height,
                transformOrigin: pivotOrigin, animationDuration: `${fxTotal}ms`, animationDelay: `${g.d * animScale}ms`, ...flyGeom.vars
              } as React.CSSProperties}>
                <img src={weaponLayers.effectImg} alt="" />
              </div>
            </div>
          ))}
          <div className="fs-fly" style={{
            left: flyGeom.left, top: flyGeom.top, width: flyGeom.width, height: flyGeom.height,
            transformOrigin: pivotOrigin, animationDuration: `${fxTotal}ms`, ...flyGeom.vars
          } as React.CSSProperties}>
            <img src={weaponLayers.effectImg} alt="" />
            <img src={weaponLayers.effectImg} alt="" className="fs-flicker" style={{ transformOrigin: pivotOrigin }} />
          </div>
        </div>
      )}

      {/* 玩家攻擊特效容器 */}
      <div className="absolute inset-0 z-[10001] pointer-events-none">
          {isPlayerSlashActive && (
            <>
                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white opacity-0 animate-[energy-pop_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ boxShadow: '0 0 30px #00f2ff', animationDuration: `${0.4 * animScale}s` }} />
                <div className="slash-line-base player-slash-line" style={cssVars({ '--rot': '-35deg', top: '40%', left: '50%', animationDuration: `${0.5 * animScale}s` })} />
            </>
          )}
      </div>

      {/* 落地場景背景：與立繪共用同一位置／縮放（逐像素對齊岩石／地面）；底層 cover 填滿戰鬥區 */}
      {grounded && sceneBox && (
        <div
          className={`absolute top-0 left-0 w-full h-[62%] z-[0] overflow-hidden pointer-events-none transition-opacity duration-[700ms] ${isCharacterVisible || holdScene ? 'opacity-100' : 'opacity-0'} ${bgDimmed ? 'bg-attack-dim' : ''}`}
          style={{ transition: `opacity 0.7s, filter ${bgDimDuration}ms` }}
          aria-hidden="true"
        >
          {/* 場景本體：與立繪同一 left/top/scale（cover 縮放後通常蓋滿戰鬥區；多出的從上方／兩側裁切） */}
          <div style={{ position: 'absolute', left: sceneBox.left, top: sceneBox.top, width: sceneBox.width, height: sceneBox.height }}>
            <img src={bgImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', display: 'block' }} draggable={false} />
            {sceneBox.mirrorTiles && MIRROR_TILES.map(([i, j]) => (
              /* 沿用主頁背景：未蓋滿的邊以鏡射圖塊補滿（與主頁左右鏡射同法；1px 重疊避免接縫） */
              <img key={`${i}${j}`} src={bgImg} alt="" draggable={false} style={{
                position: 'absolute', left: `calc(${i * 100}% ${i < 0 ? '+ 1px' : i > 0 ? '- 1px' : ''})`, top: `calc(${j * 100}% ${j < 0 ? '+ 1px' : j > 0 ? '- 1px' : ''})`,
                width: '100%', height: '100%', maxWidth: 'none', display: 'block', transform: `scale(${i ? -1 : 1}, ${j ? -1 : 1})`,
              }} />
            ))}
            {sceneBox.mirrorBottom && (
              /* 下方鏡射延伸：背景上移後補滿底部（被題目／答案區覆蓋為主） */
              <img src={bgImg} alt="" style={{ position: 'absolute', left: 0, top: 'calc(100% - 1px)', width: '100%', height: '100%', maxWidth: 'none', display: 'block', transform: 'scaleY(-1)' }} draggable={false} />
            )}
          </div>
        </div>
      )}

      {/* 角色層容器（戰鬥區＝畫面上方 62%） */}
      <div
        className={`absolute top-0 left-0 w-full h-[62%] transition-opacity duration-[1000ms] ${isCharacterVisible || holdScene ? 'opacity-100' : 'opacity-0'}`}
        style={{ overflow: 'visible', pointerEvents: 'none', transitionDuration: `${1000 * animScale}ms` }}
      >
        {/* 名字標籤：全體關主固定槽位（BOSS_NAME_SLOT，格式與位置以柳宗元為準；框寬高固定，不隨關主頭頂改變；放在呼吸／受擊位移層之外，畫面位置永遠固定） */}
        <div
          data-boss-name=""
          className="absolute z-[100] pointer-events-none"
          style={layout ? {
            left: layout.headX,
            top: layout.headY,
            width: BOSS_NAME_SLOT.w,
            height: BOSS_NAME_SLOT.h,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            transform: 'translate3d(-50%, -100%, 0)',
            willChange: 'transform',
            zIndex: 100,
          } : {
            top: '-15%',
            left: '50%',
            transform: 'translateX(-50%) translate3d(-50px, 35px, 0)',
            willChange: 'transform'
          }}
        >
          {/* 緊湊格式：名字 12px 在上、◆ 在下；整組水平置中 */}
          <div className={`flex flex-col items-center justify-center gap-[2px] transition-opacity duration-500 ${isNameVisible ? 'boss-name-anim opacity-100' : 'opacity-0'}`} style={{ transitionDuration: `${500 * animScale}ms`, lineHeight: 1 }}>
            <span className="text-white font-black tracking-[2px] mr-[-2px]" style={{ fontSize: 12, lineHeight: 1, WebkitTextStroke: '0.6px rgba(0,0,0,0.85)', paintOrder: 'stroke fill', textShadow: '0 0 2px #000, 0 0 4px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' }}>{bossName}</span>
            {/* 窄菱形 ◆：高 8、寬 4.8（0.6 比例）；外框＝可見形狀，名字底→◆頂 恰 2px */}
            <span data-boss-dia style={{ display: 'block', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8)) drop-shadow(0 0 1.5px rgba(0,0,0,1))' }}>
              <span style={{ display: 'block', width: 4.8, height: 8, background: '#fff', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }} />
            </span>
          </div>
        </div>

        <div
          className={`absolute inset-0 ${enemyAnim === 'idle' ? 'enemy-breathing' : 'base-offset'}`}
          style={inheritBreathOrigin && enemyAnim === 'idle'
            ? { transformOrigin: `${inheritBreathOrigin[0]}px ${inheritBreathOrigin[1]}px`, animation: `homeSceneBreathe ${4.5 * animScale}s ease-in-out infinite`, willChange: 'transform', zIndex: 10 }
            : { transformOrigin: spriteOrigin, willChange: 'transform', zIndex: 10 }}
        >
          <div
            className={`
              absolute inset-0
              ${enemyAnim === 'hurt' ? 'hurt-anim-base' : ''}
              ${enemyAnim === 'attack' ? (isWeaponStyle ? '' : attackStyle === 'chariotCharge' ? 'confucius-chariot-charge' : '') : ''}
            `}
            style={cssVars({ willChange: 'transform', transformOrigin: spriteOrigin, '--cast-duration': `${fxTotal}ms` })}
          >
            <div data-boss-sprite="" style={{
              ...spriteBoxStyle,
            }}>
              {/* 李白背影/陰影 */}
              {isLiBai && layout && (
                <img src={`${import.meta.env.BASE_URL}resources/avatar/li_bai/li_bai_shadow.png`} alt="" style={{
                  position: 'absolute', zIndex: 8, maxWidth: 'none', display: 'block', opacity: 0.7, filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))',
                  height: layout.height * (LI_BAI_SHADOW.h / layout.anchor.h), width: layout.height * (LI_BAI_SHADOW.h / layout.anchor.h) * (LI_BAI_SHADOW.w / LI_BAI_SHADOW.h),
                  left: layout.width / 2 - layout.height * (LI_BAI_SHADOW.h / layout.anchor.h) * (LI_BAI_SHADOW.w / LI_BAI_SHADOW.h) / 2 + layout.height * LI_BAI_SHADOW.dxRatio,
                  top: layout.height - layout.height * (LI_BAI_SHADOW.h / layout.anchor.h) + layout.height * LI_BAI_SHADOW.dyRatio,
                }} />
              )}
              {isWeaponStyle ? (
                <>
                  {/* 分層立繪：effect（劍＋火焰）在下、character 在上；第 2 關 idle 為圖鑑飛劍繞身，攻擊仍走 X 斬 */}
                  <div className="absolute inset-0 pointer-events-none" style={{ opacity: holdScene ? 0 : 0.6, zIndex: 5, filter: 'drop-shadow(0 0 15px #ff0000)', ...auraFade }}>
                    {idleSaberLoop
                      ? <img src={weaponLayers!.characterImg} alt="" style={frameLayerStyle} draggable={false} />
                      : renderSwordLayers(false)}
                  </div>
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10, filter: holdScene ? 'drop-shadow(0 0 0px rgba(0,0,0,0))' : 'drop-shadow(0 0 8px rgba(0,0,0,0.8))', ...auraFade }} role="img" aria-label={bossName}>
                    {idleSaberLoop ? renderLiuWeaponStack(true) : renderSwordLayers(true)}
                    {isSwordAttack && <img src={weaponLayers!.effectImg} alt="" className="fs-reduced-flash" style={{ ...frameLayerStyle, animationDuration: `${fxImpact + 200 * animScale}ms` }} />}
                  </div>
                </>
              ) : (
                <>
                  {frontImg ? (
                    /* 人物＋前景層（孔子：戰車人物在下、雙馬在上），兩層同框；紅光／陰影套在整組上 */
                    <>
                      <div className="absolute inset-0" style={{ opacity: holdScene ? 0 : 0.6, zIndex: 5, filter: 'drop-shadow(0 0 15px #ff0000)', ...auraFade }}>
                        <img src={bossImg} alt="" style={imgFill} />
                        <img src={frontImg} alt="" style={imgFill} />
                      </div>
                      <div className="absolute inset-0" role="img" aria-label={bossName} style={{ zIndex: 10, filter: holdScene ? 'drop-shadow(0 0 0px rgba(0,0,0,0))' : 'drop-shadow(0 0 8px rgba(0,0,0,0.8))', ...auraFade }}>
                        <img src={bossImg} alt="" style={imgFill} />
                        <img src={frontImg} alt="" style={imgFill} />
                      </div>
                    </>
                  ) : (
                    <>
                      <img src={bossImg} alt="" style={{ ...imgFill, opacity: holdScene ? 0 : 0.6, zIndex: 5, filter: 'drop-shadow(0 0 15px #ff0000)', ...auraFade }} />
                      <img src={bossImg} alt={bossName} style={{ ...imgFill, zIndex: 10, filter: holdScene ? 'drop-shadow(0 0 0px rgba(0,0,0,0))' : 'drop-shadow(0 0 8px rgba(0,0,0,0.8))', ...auraFade }} />
                    </>
                  )}
                </>
              )}

              <div className={`absolute inset-0 pointer-events-none ${enemyAnim === 'hurt' ? 'hurt-flash-active' : 'opacity-0'}`} style={{ zIndex: 16 }}>
                <div style={{
                  height: '100%', width: '100%', backgroundColor: '#ff0000',
                  // 受擊紅光遮罩＝人物（＋前景層）的聯集
                  maskImage: maskSrc, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center bottom',
                  WebkitMaskImage: maskSrc, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center bottom'
                }} />
              </div>
            </div>
          </div>
        </div>

        <style>{`

          @keyframes enemyBreath {
            0%, 100% { transform: translate3d(0, var(--breath-y, 8px), 0) scale(1); }
            50% { transform: translate3d(0, 0px, 0) scale(1.01); }
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
          /* 飛劍穿梭：命中只留一個較小的白熱閃光 */
          .xs-burst .fs-burst-core { width: 130px; height: 130px; margin: -65px 0 0 -65px; }
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

          /* ===== 飛劍穿梭 X 斬（attackStyle: 'xSlash'）=====
             動作由 components/swordWeave.ts 的 3D 曲線＋rAF 驅動（只寫 transform / opacity），這裡只放靜態樣式與減少動態的替代 */
          .xs-fly { position: absolute; }
          .xs-fly img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; display: block;
            /* 只在飛行時：暖色外光＋深橙描邊，飛過白色選字盤時火焰仍清楚（不是斬痕） */
            filter: drop-shadow(0 0 2px rgba(150, 40, 0, 0.85)) drop-shadow(0 0 7px rgba(255, 120, 20, 0.75)); }
          /* 減少動態：劍不離手，命中時只有 App 的閃光（不震屏） */
          @media (prefers-reduced-motion: reduce) {
            .xs-fly { display: none !important; }
          }

          /* ===== 第 2 關 idle：圖鑑飛劍繞身（6.432s；攻擊時 data-attacking 卸載迴圈）=====
             路徑／前後層／劍身呼吸與 CharacterDetailView 同款；位移％相對全幅框 */
          .btl-saber-stage { pointer-events: none; }
          .btl-saber { position: absolute; inset: 0; width: 100%; height: 100%; will-change: transform, opacity; }
          .btl-saber.is-back { opacity: 0; animation: btlSaberPath 9.696s infinite, btlSaberBack 9.696s infinite; }
          .btl-saber.is-front { animation: btlSaberPath 9.696s infinite, btlSaberFront 9.696s infinite; }
          /* 整把劍上下浮動：幅度略大於人物呼吸（scaleY 1.012 ≈ 數 px）；尖／柄微擺仍由 btlSaberIdle 負責 */
          .btl-saber-float { position: absolute; inset: 0; width: 100%; height: 100%;
            animation: btlSaberFloat 4.5s ease-in-out infinite; will-change: transform; }
          @keyframes btlSaberFloat {
            0%, 100% { transform: translate3d(0, 2px, 0); }
            50% { transform: translate3d(0, -5px, 0); }
          }
          .btl-saber-idle { position: absolute; inset: 0; width: 100%; height: 100%;
            animation: btlSaberIdle 3.4s ease-in-out -1.1s infinite; will-change: transform; }
          @keyframes btlSaberIdle {
            0%, 100% { transform: translate3d(0, 0.15%, 0) rotate(-0.9deg); }
            50% { transform: translate3d(0, -0.15%, 0) rotate(0.9deg); }
          }
          .btl-saber-stage[data-hidden="1"] .btl-saber,
          .btl-saber-stage[data-hidden="1"] .btl-saber-float,
          .btl-saber-stage[data-hidden="1"] .btl-saber-idle { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) {
            .btl-saber, .btl-saber-float, .btl-saber-idle { animation: none !important; }
            .btl-saber.is-back { opacity: 0 !important; }
          }
          @keyframes btlSaberPath {
            0%     { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); animation-timing-function: ease-in-out; }
            35.65% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); animation-timing-function: cubic-bezier(.55,0,.85,.45); }
            43.57% { transform: translate3d(-40.07%, -8.97%, 0) rotate(-10deg) scale(0.85); animation-timing-function: linear; }
            45.54% { transform: translate3d(-67.41%, -8.97%, 0) rotate(-180deg) scale(0.7); animation-timing-function: linear; }
            49.01% { transform: translate3d(-17.41%, 1.44%, 0) rotate(-178deg) scale(0.65); animation-timing-function: linear; }
            54.45% { transform: translate3d(65.40%, 11.86%, 0) rotate(-172deg) scale(0.62); animation-timing-function: linear; }
            56.44% { transform: translate3d(96.65%, 22.97%, 0) rotate(-356deg) scale(1.25); animation-timing-function: linear; }
            61.39% { transform: translate3d(30.24%, 14.64%, 0) rotate(-352deg) scale(1.28); animation-timing-function: cubic-bezier(.2,.6,.4,1); }
            68.32% { transform: translate3d(0, 0, 0) rotate(-360deg) scale(1); animation-timing-function: linear; }
            100%   { transform: translate3d(0, 0, 0) rotate(-360deg) scale(1); }
          }
          @keyframes btlSaberFront {
            0%, 43.51% { opacity: 1; }
            43.57%, 54.45% { opacity: 0; }
            54.51%, 100% { opacity: 1; }
          }
          @keyframes btlSaberBack {
            0%, 43.51% { opacity: 0; }
            43.57%, 54.45% { opacity: 0.85; }
            54.51%, 100% { opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
});

export default BattleArea;
