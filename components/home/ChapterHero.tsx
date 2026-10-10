import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { LevelConfig } from '../../types';
import { portraitKey } from '../../data/portraits';
import { anchorStyle, chapterLabel, faceCircleStyle, type Target } from './heroUtils';
import { useGyroParallax, type GyroLayer } from './useGyroParallax';

/** 英雄區立繪目標：臉約佔畫面高 7.5%，偏右；個別寬幅立繪微調 */
const HERO_TARGET: Record<string, Target> = {
  default: { faceH: 0.07, eyeY: 0.2, faceX: 0.17 },
  liu_zong_yuan: { faceH: 0.056, eyeY: 0.17, faceX: 0.26 }, // 縮小右移，讓左方飛劍完整入框
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

      {/* 墨色收邊：左側讓直書篇名可讀，底部融入列表 */}
      <div className="absolute inset-0 pointer-events-none home-hero-wash" />

      {/* 第二層：古人立繪 */}
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
          <div className={`absolute inset-0 ${reduce ? '' : 'home-breathe'}`}>
            <img src={level.bossImg} alt={level.bossName} style={anchorStyle(level.bossImg, figTarget)} className="home-hero-fig" draggable={false} />
          </div>
        </motion.div>
      </AnimatePresence>
      </div>

      {/* 第三層：火星（純裝飾；減少動態時隱藏） */}
      {!reduce && (
        <div ref={emberGyro} className="absolute inset-0 pointer-events-none home-embers home-gyro-layer" data-parallax="embers" aria-hidden="true">
          {EMBERS.map((e, i) => (
            <span key={i} style={{ left: e.left, width: e.size, height: e.size, animationDelay: e.delay, animationDuration: e.dur, '--drift': e.drift } as React.CSSProperties} />
          ))}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none home-hero-floor" />

      {/* 文字層 */}
      <div className="relative z-10 h-full flex flex-col px-5 pt-5 pb-5">
        <div className="flex-1 flex items-start gap-3 min-h-0 home-vtitle-box" style={{ '--n': titleChars.length } as React.CSSProperties}>
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

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`m-${level.id}`}
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.35, delay: reduce ? 0 : 0.1 }}
            className="flex items-end justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="home-chapter-no">{chapterLabel(order)}</p>
              {level.quote?.trim() && <p className="home-quote">「{level.quote.trim()}」</p>}
            </div>
            <span className="home-seal" aria-label={`作者 ${level.bossName}`}>{level.bossName}</span>
          </motion.div>
        </AnimatePresence>

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

        <button type="button" className="home-cta home-focus mt-4" onClick={() => onEnter(level)}>
          入陣
          <span className="sr-only">：{level.title}</span>
        </button>
      </div>
    </section>
  );
};

export default ChapterHero;
