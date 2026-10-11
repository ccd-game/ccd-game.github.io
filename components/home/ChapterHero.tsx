import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { LevelConfig } from '../../types';
import { portraitKey, LAYERED_PORTRAITS } from '../../data/portraits';
import { anchorStyle, chapterLabel, faceCircleStyle, type Target } from './heroUtils';
import { useGyroParallax, type GyroLayer } from './useGyroParallax';
import { HERO_SCENES, SCENE_TILES, computeHeroFit, heroFigStyle, pct, sceneVars } from './heroScene';

/**
 * 英雄區立繪目標（相對於立繪框 .home-fig-stage：寬 100%、高寬比 47:39，置頂；
 * 以寬度決定大小，英雄區變高時立繪不會跟著放大）。臉約佔框高 7%，偏右；個別寬幅立繪微調。
 */
const HERO_TARGET: Record<string, Target> = {
  default: { faceH: 0.07, eyeY: 0.2, faceX: 0.17 },
  liu_zong_yuan: { faceH: 0.0487, eyeY: 0.168, faceX: 0.074 }, // 人物為主：整個身體入框、靠左置中；伸出的手與飛劍落在篇名下方（可被裁）
  kong_zi: { faceH: 0.06, eyeY: 0.3, faceX: 0.2 },
  zhu_ge_liang: { faceH: 0.06, eyeY: 0.17, faceX: 0.17 },
};

/** 輪播頭像：臉（額頂至下巴）佔圓框內徑 50%（含 2px 邊框的外徑約 45%），置中，露出部分頭髮／帽 */
const THUMB_FACE = 0.5;

/** 陀螺儀視差深度（最大位移 px）：背景反向、立繪順向、火星最近 */
const DEPTH = {
  bg: { x: -8, y: -5 },
  fig: { x: 14, y: 6 },
  embers: { x: 22, y: 10 },
};

const EMBERS = Array.from({ length: 12 }, (_, i) => ({
  left: `${8 + ((i * 37) % 86)}%`,
  delay: `${(i * 0.83) % 7}s`,
  dur: `${6 + (i % 4) * 1.6}s`,
  size: 2 + (i % 3),
  drift: `${(i % 2 ? 1 : -1) * (10 + (i % 5) * 6)}px`,
}));

interface ChapterHeroProps {
  levels: LevelConfig[];          // 全部篇章（用於計算回數）
  featured: LevelConfig[];        // 已開放篇章
  activeId: number;
  onActiveChange: (id: number) => void;
  onEnter: (level: LevelConfig) => void;
}

const ChapterHero: React.FC<ChapterHeroProps> = ({ levels, featured, activeId, onActiveChange, onEnter }) => {
  const reduce = useReducedMotion();
  const idx = Math.max(0, featured.findIndex(l => l.id === activeId));
  const level = featured[idx];
  const order = levels.findIndex(l => l.id === level.id);
  const [dir, setDir] = useState(1);

  // 手機陀螺儀視差：直接寫入各層外框的 transform（不經 React 狀態）
  const heroRef = useRef<HTMLElement>(null);
  const bgGyro = useRef<HTMLDivElement>(null);
  const figGyro = useRef<HTMLDivElement>(null);
  const emberGyro = useRef<HTMLDivElement>(null);
  const gyroLayers = useMemo<GyroLayer[]>(() => [
    { ref: bgGyro, ...DEPTH.bg },
    { ref: figGyro, ...DEPTH.fig },
    { ref: emberGyro, ...DEPTH.embers },
  ], []);
  useGyroParallax(heroRef, gyroLayers);

  // 分頁隱藏時暫停飛劍／呼吸（與圖鑑內頁相同）
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const sync = () => { el.dataset.hidden = document.hidden ? '1' : '0'; };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // 地面線＝篇名區下緣：量一次（尺寸改變時再量），寫入 CSS 變數 --ui（英雄區底至篇名區下緣的距離）
  const titleBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hero = heroRef.current, box = titleBoxRef.current;
    if (!hero || !box || typeof ResizeObserver === 'undefined') return;
    const sync = () => { hero.style.setProperty('--ui', `${Math.round(hero.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom)}px`); };
    const ro = new ResizeObserver(sync);
    ro.observe(hero); ro.observe(box);
    sync();
    return () => ro.disconnect();
  }, []);

  const go = (step: number) => {
    setDir(step);
    const next = featured[(idx + step + featured.length) % featured.length];
    onActiveChange(next.id);
  };

  // 英雄區內左右滑動切換古人（阻止冒泡，避免觸發分頁切換）
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touch.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touch.current) return;
    const dx = touch.current.x - e.changedTouches[0].clientX;
    const dy = touch.current.y - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) go(dx > 0 ? 1 : -1);
    touch.current = null;
  };

  const title = level.title.replace(/[《》]/g, '').replace(/（節錄）/, '');
  const titleChars = useMemo(() => Array.from(title), [title]);
  const key = portraitKey(level.bossImg);
  const figTarget = HERO_TARGET[key] || HERO_TARGET.default;
  const scene = HERO_SCENES[key];
  const layered = scene && LAYERED_PORTRAITS[key]; // 目前僅柳宗元：分層人物＋飛劍（與圖鑑／戰鬥同一組資產）
  /** 新版首頁（老師核可第 2 關後全面套用）：有場景者一律橫排置中篇名＋‹ › 箭頭、無頭像列、無「第 N 回」與引句 */
  const isL2 = !!scene;

  // fit 'headTop'（抽屜半開、英雄區變矮）：人物維持抽屜收合時的螢幕大小（＝舊版 cover 縮放），
  // 背景＋人物一起往下移到「帽頂留白 m」；下半身可被篇名／頭像／入陣與英雄區下緣裁切，背景下緣可延伸到抽屜後方
  const fitKey = scene ? key : '';
  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const clear = () => { ['--fit-s', '--fit-l', '--fit-t'].forEach(v => hero.style.removeProperty(v)); };
    if (!fitKey || !scene || typeof ResizeObserver === 'undefined') { clear(); return; }
    const sc = scene;
    const dungeon = hero.closest<HTMLElement>('.home-dungeon');
    const sync = () => {
      const W = hero.clientWidth, H = hero.clientHeight;
      if (!W || !H) return;
      const bar = dungeon ? parseFloat(getComputedStyle(dungeon).getPropertyValue('--bar-h')) || 52 : 52;
      const D = dungeon ? dungeon.clientHeight : H + bar;
      const { s, left, top } = computeHeroFit(sc, W, H, D, bar);
      hero.style.setProperty('--fit-s', `${s}px`);
      hero.style.setProperty('--fit-l', `${left}px`);
      hero.style.setProperty('--fit-t', `${top}px`);
    };
    const ro = new ResizeObserver(sync);
    ro.observe(hero);
    if (dungeon) ro.observe(dungeon);
    sync();
    return () => { ro.disconnect(); clear(); };
  }, [fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = dir;

  return (
    <section
      ref={heroRef}
      className="home-hero relative w-full overflow-hidden"
      aria-roledescription="篇章展示"
      aria-label={`${chapterLabel(order)} ${level.title} · ${level.bossName}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
    >
      {/* 第一層：篇章場景（外框承載陀螺儀位移） */}
      {/* 無落地場景時才鋪篇章底圖；有 scene 時不再鋪 under-scene 模糊暗底（等同 wash） */}
      {!scene && (
      <div ref={bgGyro} className="absolute inset-0 home-gyro-layer" data-parallax="bg">
      <AnimatePresence initial={false}>
        <motion.div
          key={`bg-${level.id}`}
          className="absolute inset-[-16px]"
          initial={{ opacity: 0, scale: reduce ? 1 : 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.2 : 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <img src={level.bgImg} alt="" className="w-full h-full object-cover home-hero-bg" draggable={false} />
        </motion.div>
      </AnimatePresence>
      </div>
      )}

      {/* 第二層：古人立繪（無 wash／floor／scene-fade） */}
      <div ref={figGyro} className="absolute inset-0 pointer-events-none home-gyro-layer" data-parallax="fig">
      <AnimatePresence initial={false} custom={d}>
        <motion.div
          key={`fig-${level.id}`}
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0, x: reduce ? 0 : 40 * d }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduce ? 0 : -30 * d }}
          transition={{ duration: reduce ? 0.2 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {scene ? (
            <>
              {/* 場景：背景＋立繪同幾何（無墨色收邊） */}
              <div className={`home-scene${scene.fill === 'coverBottom' ? ' is-cover-bottom' : ''}${' is-fit'}`}
                style={{ ...sceneVars(scene), ...(scene.bgZoom ? { transform: `scale(${scene.bgZoom[0]})`, transformOrigin: `${pct(scene.bgZoom[1], scene.w)} 100%` } : {}) }}>
                {/* 背景本體＋左右鏡射：場景比英雄區窄時水平補滿；下方不鏡射 */}
                {SCENE_TILES.map(([i, j]) => (
                  <img key={`${i}${j}`} src={scene.bg} alt="" className="home-scene-layer home-scene-bg" draggable={false}
                    style={i || j ? { left: `${i * 100}%`, top: `${j * 100}%`, transform: `scale(${i ? -1 : 1}, ${j ? -1 : 1})` } : undefined} />
                ))}
              </div>
              <div className={`home-scene${scene.fill === 'coverBottom' ? ' is-cover-bottom' : ''}${' is-fit'}`} style={sceneVars(scene)}>
                <div className="home-scene-fig" style={heroFigStyle(scene)}>
                  {/* 呼吸套在人物與飛劍共同父層：靜候時劍隨手起伏。有 LAYERED 時拆成人物＋飛劍（前／後兩份切 z） */}
                  <div className={`home-scene-layer ${reduce ? '' : 'home-scene-breathe'}`} style={{ transformOrigin: layered?.seat ?? scene.breathe }}>
                    {layered ? (
                      <>
                        <div className={`home-scene-layer home-saber is-back${reduce ? ' is-still' : ''}`} style={{ transformOrigin: layered.pivot }}>
                          <div className="home-scene-layer home-saber-float">
                            <div className="home-scene-layer home-saber-idle" style={{ transformOrigin: layered.bladeMid }}>
                              <img src={layered.effect} alt="" className="home-scene-layer" draggable={false} />
                            </div>
                          </div>
                        </div>
                        <img src={layered.character} alt={level.bossName} className="home-scene-layer" draggable={false} />
                        <div className={`home-scene-layer home-saber is-front${reduce ? ' is-still' : ''}`} style={{ transformOrigin: layered.pivot }}>
                          <div className="home-scene-layer home-saber-float">
                            <div className="home-scene-layer home-saber-idle" style={{ transformOrigin: layered.bladeMid }}>
                              <img src={layered.effect} alt="" className="home-scene-layer" draggable={false} />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <img src={level.bossImg} alt={level.bossName} className="home-scene-layer" draggable={false} />
                        {/* 前景層（孔子：雙馬）疊在人物之上，同框同呼吸 */}
                        {scene.front && <img src={scene.front} alt="" className="home-scene-layer" draggable={false} />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`home-fig-stage ${reduce ? '' : 'home-breathe'}`}>
              <img src={level.bossImg} alt={level.bossName} style={anchorStyle(level.bossImg, figTarget)} className="home-hero-fig" draggable={false} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      </div>

      {/* 底部羽化：柔焦漸層（非硬黑邊、非舊墨黑 fade） */}
      {scene && <div className={`home-scene-feather${isL2 ? ' is-l2' : ''}`} aria-hidden="true" />}

      {/* 第三層：火星（純裝飾；減少動態時隱藏） */}
      {!reduce && (
        <div ref={emberGyro} className="absolute inset-0 pointer-events-none home-embers home-gyro-layer" data-parallax="embers" aria-hidden="true">
          {EMBERS.map((e, i) => (
            <span key={i} style={{ left: e.left, width: e.size, height: e.size, animationDelay: e.delay, animationDuration: e.dur, '--drift': e.drift } as React.CSSProperties} />
          ))}
        </div>
      )}
      {/* 文字層 */}
      <div className="relative z-10 h-full flex flex-col px-5 pt-5 pb-5" style={isL2 ? { paddingBottom: 18 } : undefined}>
        {isL2 ? (
          /* 第 2 關：空白區保留地面線量測（--ui），篇名改在頭像列上方 */
          <div ref={titleBoxRef} className="flex-1 min-h-0" />
        ) : (
        <div ref={titleBoxRef} className="flex-1 flex items-center gap-3 min-h-0 home-vtitle-box" style={{ '--n': titleChars.length } as React.CSSProperties}>
          <div className="home-vtitle-wrap">
          {/* 標題底下的柔焦層：只模糊背後的畫面（backdrop-filter），不加任何暗色；邊緣以遮罩淡出 */}
          <div className="home-vtitle-blur" aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={`t-${level.id}`}
              className="home-vtitle"
              initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: reduce ? 0.15 : 0.6, ease: [0.3, 0.7, 0.2, 1] }}
            >
              {title}
            </motion.h2>
          </AnimatePresence>
          </div>
        </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`m-${level.id}`}
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.35, delay: reduce ? 0 : 0.1 }}
            className={isL2 ? 'home-seal-l2' : 'flex items-end justify-between gap-3'}
          >
            {!isL2 && (
              <div className="min-w-0">
                <p className="home-chapter-no">{chapterLabel(order)}</p>
                {level.quote?.trim() && <p className="home-quote">「{level.quote.trim()}」</p>}
              </div>
            )}
            <span className="home-seal" aria-label={`作者 ${level.bossName}`}>{level.bossName}</span>
          </motion.div>
        </AnimatePresence>

        {isL2 && (
          /* 第 2 關：無頭像列；篇名居中、左右箭頭切換古人（左右滑仍可切；抽屜列表亦可選篇） */
          <div className="l2-title-row">
            <button type="button" className="home-arrow home-focus" onClick={() => go(-1)} aria-label="上一位古人">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={`ht-${level.id}`}
                className="home-htitle"
                style={{ '--n': Array.from(title).length } as React.CSSProperties}
                initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.3, 0.7, 0.2, 1] }}
              >
                {title}
              </motion.h2>
            </AnimatePresence>
            <button type="button" className="home-arrow home-focus" onClick={() => go(1)} aria-label="下一位古人">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        )}

        {!isL2 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" className="home-arrow home-focus" onClick={() => go(-1)} aria-label="上一位古人">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-2.5" role="tablist" aria-label="選擇古人">
            {featured.map(f => {
              const on = f.id === level.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={`${f.bossName}《${f.title.replace(/[《》]/g, '')}》`}
                  onClick={() => { setDir(featured.indexOf(f) >= idx ? 1 : -1); onActiveChange(f.id); }}
                  className={`home-thumb home-focus ${on ? 'is-on' : ''}`}
                >
                  <img src={f.bossImg} alt="" style={faceCircleStyle(f.bossImg, THUMB_FACE)} draggable={false} />
                </button>
              );
            })}
          </div>
          <button type="button" className="home-arrow home-focus" onClick={() => go(1)} aria-label="下一位古人">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        )}

        <button type="button" className={`home-cta home-focus mt-4${isL2 ? ' l2-cta' : ''}`} onClick={() => onEnter(level)}>
          入陣
          <span className="sr-only">：{level.title}</span>
        </button>
      </div>
    </section>
  );
};

export default ChapterHero;
