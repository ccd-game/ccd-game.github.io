import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CHARACTER_DETAILS } from '../data/characters';
import { portraitStyle, portraitKey, LAYERED_PORTRAITS } from '../data/portraits';
import { HERO_SCENES, SCENE_TILES, computeHeroFit, heroBgFrameStyle, heroFigStyle, heroPeekHeight, sceneVars } from './home/heroScene';

/** 背景底部羽化的長度（px）：羽化在「名字」那一行結束 */
const CODEX_FADE_PX = 140;

export interface CharacterDetailProps {
  char: {
    id: number;
    name: string;
    img: string;
    title: string;
    bgImg?: string;
  };
  onBack: () => void;
}

const CharacterDetailView: React.FC<CharacterDetailProps> = ({ char, onBack }) => {
  const detailData = CHARACTER_DETAILS[char.id];
  
  const animDuration = '2.5s';
  const animTiming = 'cubic-bezier(0.19, 1, 0.22, 1)';
  const pk = portraitKey(char.img);
  // 有首頁落地場景（HERO_SCENES）的古人：背景與人物的錨點、縮放、位置沿用首頁預覽（同一套幾何、同一個框高），兩頁構圖相同
  const scene = HERO_SCENES[pk];
  const layered = LAYERED_PORTRAITS[pk];
  const nameRef = useRef<HTMLHeadingElement>(null);
  const sceneHostRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ H: number; s: number; left: number; top: number; fadeEnd: number } | null>(null);

  // 分頁隱藏時暫停立繪動畫（飛劍循環、呼吸）
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const sync = () => { el.dataset.hidden = document.hidden ? '1' : '0'; };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // 場景框＝首頁預覽英雄區（抽屜半開）的大小：寬同頁寬、高由內容區高推得；
  // 羽化終點＝名字那一行的下緣（相對場景框）
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!scene || !root || typeof ResizeObserver === 'undefined') { setFit(null); return; }
    const sync = () => {
      // D＝首頁內容區高＝本頁頂到底部導覽列頂（首頁 .home-dungeon 同樣由頂欄下緣延伸到導覽列上緣）
      const nav = document.querySelector<HTMLElement>('.home-bar-bottom');
      const W = root.clientWidth;
      const D = nav ? nav.getBoundingClientRect().top - root.getBoundingClientRect().top : root.clientHeight;
      if (!W || !D) return;
      const H = heroPeekHeight(D);
      const { s, left, top } = computeHeroFit(scene, W, H, D);
      const host = sceneHostRef.current, name = nameRef.current;
      const fadeEnd = host && name ? name.getBoundingClientRect().bottom - host.getBoundingClientRect().top : H;
      setFit(f => (f && f.H === H && f.s === s && f.left === left && f.top === top && Math.abs(f.fadeEnd - fadeEnd) < 0.5) ? f : { H, s, left, top, fadeEnd });
    };
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    if (nameRef.current) ro.observe(nameRef.current);
    sync();
    return () => ro.disconnect();
  }, [scene]);

  return (
    <div ref={rootRef} className="codex-inner flex-1 flex flex-col animate-[fadeIn_0.5s_ease-out_forwards] overflow-y-auto overflow-x-hidden custom-scrollbar relative" style={{ backgroundColor: 'var(--app-bg)' }}>
      <style>{`
        .no-select-drag {
          -webkit-user-select: none;
          -webkit-user-drag: none;
          user-select: none;
        }
      `}</style>
      
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-[100] w-8 h-8 rounded-full border border-[var(--gold-accent)]/20 flex items-center justify-center bg-white/10 backdrop-blur-md active:scale-90 transition-all shadow-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <div className="relative h-[310px] w-full flex items-end justify-center overflow-visible shrink-0 z-10 no-select-drag">
         {!scene && !layered && (
         <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* 背景：不透明度 0.9（原 0.8），淡色洗白減少約兩成；底部淡出不變 */}
            <div 
              className="absolute inset-0 opacity-[0.9] grayscale-[0.2]" 
              style={{ 
                backgroundImage: `url("${char.bgImg}")`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center bottom' 
              }} 
            />
         </div>
         )}
         
         <div className="absolute inset-0 z-1 flex items-center justify-center pointer-events-none select-none overflow-hidden">
           <span className="text-[120px] font-black opacity-[0.015] leading-none" 
                 style={{ 
                   fontFamily: "'LXGW WenKai Mono TC', serif", 
                   writingMode: 'vertical-rl',
                   textOrientation: 'upright',
                   letterSpacing: '0.1em'
                 }}>
             {char.name}
           </span>
         </div>

         {scene && (
           /* 首頁落地場景（HERO_SCENES）：背景＋人物同一套幾何（同首頁預覽的 --fit-s／l／t），框高＝首頁英雄區（抽屜半開）；
              框延伸到名字下方，底部羽化在名字那一行結束（mask，往下才淡到頁底色） */
           <div ref={sceneHostRef} className="codex-scene-host absolute left-0 right-0 top-0 overflow-hidden pointer-events-none"
             style={{
               zIndex: 5, height: fit ? fit.H : 0, visibility: fit ? 'visible' : 'hidden',
               '--fit-s': `${fit?.s ?? 1}px`, '--fit-l': `${fit?.left ?? 0}px`, '--fit-t': `${fit?.top ?? 0}px`,
               WebkitMaskImage: `linear-gradient(to bottom, #000 ${(fit?.fadeEnd ?? 0) - CODEX_FADE_PX}px, transparent ${fit?.fadeEnd ?? 0}px)`,
               maskImage: `linear-gradient(to bottom, #000 ${(fit?.fadeEnd ?? 0) - CODEX_FADE_PX}px, transparent ${fit?.fadeEnd ?? 0}px)`,
             } as React.CSSProperties}>
             <div className="home-scene is-fit" style={heroBgFrameStyle(scene)}>
               {SCENE_TILES.map(([i, j]) => (
                 <img key={`${i}${j}`} src={scene.bg} alt="" className="home-scene-layer" draggable="false"
                   style={i || j ? { left: `${i * 100}%`, top: `${j * 100}%`, transform: `scale(${i ? -1 : 1}, ${j ? -1 : 1})` } : undefined} />
               ))}
             </div>
             <div className="home-scene is-fit" style={sceneVars(scene)}>
               <div className="home-scene-fig" style={heroFigStyle(scene)}>
                 <div className="codex-layer codex-fig-in" style={{ animation: `characterSlideIn ${animDuration} ${animTiming} forwards` }}>
                   <div className="codex-layer codex-breathe" style={{ transformOrigin: layered?.seat ?? scene.breathe, animationDelay: animDuration }}>
                     {layered ? (
                       <>
                         <div className="codex-layer codex-saber is-back" style={{ transformOrigin: layered.pivot, animationDelay: animDuration }}>
                           <div className="codex-layer codex-saber-float">
                             <div className="codex-layer codex-saber-idle" style={{ transformOrigin: layered.bladeMid }}>
                               <img className="codex-layer" src={layered.effect} alt="" draggable="false" />
                             </div>
                           </div>
                         </div>
                         <img className="codex-layer" src={layered.character} alt="" draggable="false" />
                         <div className="codex-layer codex-saber is-front" style={{ transformOrigin: layered.pivot, animationDelay: animDuration }}>
                           <div className="codex-layer codex-saber-float">
                             <div className="codex-layer codex-saber-idle" style={{ transformOrigin: layered.bladeMid }}>
                               <img className="codex-layer" src={layered.effect} alt="" draggable="false" />
                             </div>
                           </div>
                         </div>
                       </>
                     ) : (
                       <>
                         <img className="codex-layer" src={char.img} alt="" draggable="false" />
                         {scene.front && <img className="codex-layer" src={scene.front} alt="" draggable="false" />}
                       </>
                     )}
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {!scene && layered && (
           /* 分層立繪（背景＋人物＋飛劍同一容器，與原合成圖逐像素對齊）。
              容器依原圖比例（16:9）以立繪區高度為準，至少與立繪區同寬；
              水平位置盡量使臉在 65% 處，但不讓劍尖出框，也不露出容器邊緣。 */
           <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 5 }}>
             <div className="codex-stage" style={{ ['--lx' as string]: `${(layered.faceX / layered.w) * 100}`, ['--tip' as string]: `${(layered.tipX / layered.w) * 100}`, aspectRatio: `${layered.w} / ${layered.h}` } as React.CSSProperties}>
               <img className="codex-layer codex-bg" src={char.bgImg} alt="" draggable="false" />
               <div className="codex-layer codex-fig-in" style={{ animation: `characterSlideIn ${animDuration} ${animTiming} forwards` }}>
                 {/* 呼吸套在人物與飛劍的共同父層：靜止時劍隨手一起起伏，不會脫離掌心 */}
                 <div className="codex-layer codex-breathe" style={{ transformOrigin: layered.seat, animationDelay: animDuration }}>
                   {/* 飛劍兩份：後層（人物之下，繞到背後時顯示）與前層（人物之上）；只在劍位於畫面外時以 opacity 切換 */}
                   <div className="codex-layer codex-saber is-back" style={{ transformOrigin: layered.pivot, animationDelay: animDuration }}>
                     <div className="codex-layer codex-saber-float">
                       <div className="codex-layer codex-saber-idle" style={{ transformOrigin: layered.bladeMid }}>
                         <img className="codex-layer" src={layered.effect} alt="" draggable="false" />
                       </div>
                     </div>
                   </div>
                   <img className="codex-layer" src={layered.character} alt="" draggable="false" />
                   <div className="codex-layer codex-saber is-front" style={{ transformOrigin: layered.pivot, animationDelay: animDuration }}>
                     <div className="codex-layer codex-saber-float">
                       <div className="codex-layer codex-saber-idle" style={{ transformOrigin: layered.bladeMid }}>
                         <img className="codex-layer" src={layered.effect} alt="" draggable="false" />
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* 立繪：以臉部錨點統一定位；淡出遮罩依立繪區高度計算，確保名字下方無人物 */}
         {!scene && !layered && <div
           className="absolute inset-0 overflow-hidden pointer-events-none"
           style={{
             zIndex: 10,
             WebkitMaskImage: 'linear-gradient(to bottom, black 62%, transparent 96%)',
             maskImage: 'linear-gradient(to bottom, black 62%, transparent 96%)',
           }}
         >
           <div
             className="absolute inset-0"
             style={{ animation: `characterSlideIn ${animDuration} ${animTiming} forwards`, willChange: 'transform, opacity' }}
           >
             <div
               className="absolute inset-0"
               style={{ transformOrigin: '50% 100%', animation: `floatDetail 6.5s ease-in-out infinite ${animDuration}`, willChange: 'transform' }}
             >
               <img
                 src={char.img}
                 alt=""
                 draggable="false"
                 className="filter drop-shadow(0 15px 30px rgba(0,0,0,0.3)) pointer-events-none"
                 style={portraitStyle(char.img, 'inner')}
               />
             </div>
           </div>
         </div>}
         
         {!scene && <div className="absolute inset-0 z-15 bg-gradient-to-b from-transparent via-transparent to-[var(--app-bg)] pointer-events-none"></div>}
      </div>

      <div className="relative z-20 px-5 flex flex-col gap-0.5 pb-12" style={{ marginTop: '-12px' }}>
        <div className="text-center">
          <h2 ref={nameRef} className="text-3xl font-black tracking-[6px] mb-0.5" style={{ color: 'var(--text-main)', fontFamily: "'LXGW WenKai Mono TC', serif", textShadow: '0 0 2px var(--app-bg), 0 0 8px var(--app-bg), 0 0 16px var(--app-bg)' }}>{char.name}</h2>
          <p className="text-[var(--gold-accent)] font-bold tracking-[3px] text-[11px] mb-1">{char.title}</p>
          <div className="w-8 h-[1px] bg-[var(--gold-accent)] mx-auto mb-1 opacity-20"></div>
          <p className="text-[10.5px] leading-snug text-left opacity-90 mb-0" style={{ color: 'var(--text-sub)' }}>
            {detailData?.bio || "此聖賢境界深邃，其詳細修煉背景尚待考證。"}
          </p>
        </div>

        {detailData && (
          <div className="grid grid-cols-2 gap-x-6 px-1 mb-0">
            <CompactStat label="生命" value={detailData.stats.hp} />
            <CompactStat label="攻擊" value={detailData.stats.atk} />
          </div>
        )}

        <div className="space-y-1.5">
          {detailData ? (
            <>
              <div className="py-1.5 px-3 rounded-xl border border-[var(--gold-accent)]/30 bg-white/5 backdrop-blur-sm shadow-sm">
                 <div className="flex gap-3 items-center">
                   <div className="w-6 h-6 shrink-0 rounded-md bg-[var(--gold-accent)] flex items-center justify-center shadow-md">
                     <span className="text-black font-black text-[8.5px]">領</span>
                   </div>
                   <div className="flex flex-col overflow-hidden">
                     <span className="font-black tracking-widest text-[13px] truncate leading-tight" style={{ color: 'var(--text-main)' }}>{detailData.leaderSkill.name}</span>
                     <span className="text-[9.5px] opacity-90 leading-tight truncate" style={{ color: 'var(--text-sub)' }}>{detailData.leaderSkill.desc}</span>
                   </div>
                 </div>
              </div>

              {detailData.activeSkills.map((skill, i) => (
                <div key={i} className="py-1.5 px-3 rounded-xl border border-[var(--gold-accent)]/30 bg-white/5 backdrop-blur-sm shadow-sm">
                   <div className="flex gap-3 items-center">
                     <div className="w-6 h-6 shrink-0 rounded-md bg-white/10 flex items-center justify-center border border-[var(--gold-accent)]/20 shadow-md">
                       <span className="text-[var(--gold-accent)] font-black text-[8.5px]">技</span>
                     </div>
                     <div className="flex flex-col overflow-hidden">
                       <span className="font-black tracking-widest text-[13px] truncate leading-tight" style={{ color: 'var(--text-main)' }}>{skill.name}</span>
                       <span className="text-[9.5px] opacity-90 leading-tight truncate" style={{ color: 'var(--text-sub)' }}>{skill.desc}</span>
                     </div>
                   </div>
                </div>
              ))}
            </>
          ) : (
            <div className="p-4 text-center opacity-40 italic text-xs">聖賢實力深不可測</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes characterSlideIn {
          0% { transform: translate3d(-220px, 0, 0) scale(0.85); opacity: 0; }
          80% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
          100% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
        }

        /* ── 分層立繪（柳宗元） ── */
        .codex-stage {
          --wc: max(calc(310px * 16 / 9), 100%);
          position: absolute; top: 0; width: var(--wc); height: auto;
          left: clamp(calc(100% - var(--wc)), max(calc(65% - var(--wc) * var(--lx) / 100), calc(4px - var(--wc) * var(--tip) / 100)), 0px);
          -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
        }
        /* 首頁落地場景沿用 .home-scene 幾何（縮放／位置由 JS 算好的 --fit-*，與首頁 .home-hero .home-scene.is-fit 相同） */
        .codex-scene-host .home-scene.is-fit { --s: var(--fit-s, 1px); left: var(--fit-l, 0px); top: var(--fit-t, 0px); }
        .codex-layer { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; }
        .codex-bg { opacity: 0.9; filter: grayscale(0.2); }
        .codex-fig-in { will-change: transform, opacity; }
        .codex-breathe { animation: codexBreathe 4.5s ease-in-out infinite; will-change: transform; }
        .codex-saber { will-change: transform, opacity; }
        .codex-saber.is-back { opacity: 0; animation: codexSaberPath 9.696s infinite, codexSaberBack 9.696s infinite; }
        .codex-saber.is-front { animation: codexSaberPath 9.696s infinite, codexSaberFront 9.696s infinite; }
        /* 飛劍自身的「呼吸」：3.4 秒（與人物 4.5 秒非整數倍）、相位提前 1.1 秒；
           以劍身中點為軸 ±0.9° 微轉，加上極小的反向位移，劍尖與劍柄交替起落（劍柄相對手掌 ≤0.7px，劍尖約 1.6px）。
           持續運行、不需在起飛／落回時切換，因此不會跳動；飛行中這點幅度看不出來。 */
        /* 整把劍上下浮動：幅度略大於人物呼吸；尖／柄微擺仍由 codexSaberIdle 負責 */
        .codex-saber-float { animation: codexSaberFloat 4.5s ease-in-out infinite; will-change: transform; }
        @keyframes codexSaberFloat {
          0%, 100% { transform: translate3d(0, 2px, 0); }
          50% { transform: translate3d(0, -5px, 0); }
        }
        .codex-saber-idle { animation: codexSaberIdle 3.4s ease-in-out -1.1s infinite; will-change: transform; }
        @keyframes codexSaberIdle {
          0%, 100% { transform: translate3d(0, 0.15%, 0) rotate(-0.9deg); }
          50% { transform: translate3d(0, -0.15%, 0) rotate(0.9deg); }
        }
        .codex-inner[data-hidden="1"] .codex-breathe,
        .codex-inner[data-hidden="1"] .codex-saber,
        .codex-inner[data-hidden="1"] .codex-saber-float,
        .codex-inner[data-hidden="1"] .codex-saber-idle { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .codex-breathe, .codex-saber, .codex-saber-float, .codex-saber-idle { animation: none !important; }
          .codex-saber.is-back { opacity: 0 !important; }
        }
        /* 呼吸：坐姿，原點在臀／膝（原圖 y≈575），只做 scaleY，雙膝與靴子幾乎不動（<0.5px） */
        @keyframes codexBreathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.012); }
        }
        /* 飛劍循環 6.432 秒（劍柄中心為原點；位移以容器百分比表示，原圖座標見 NOTES.md）。
           靜候時間為原本兩倍（共 3.264 秒），飛行 3.168 秒的各段時間與速度不變：
           0–1.728s 掌上靜候 → 向左飛出畫面 → 畫面外掉頭 → 縮小（遠）自左向右繞過人物背後、自右方離開
           → 畫面外掉頭並拉近 → 放大（近）自右向左橫越人物前方 → 4.896s 準確回到掌上原位 → 靜候至 6.432s。
           -360deg 與 0deg 為同一姿勢，循環接縫無跳動。 */
        @keyframes codexSaberPath {
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
        /* 前／後層切換點（飛行中段，劍都在畫面外），不會看到跳換 */
        @keyframes codexSaberFront {
          0%, 43.51% { opacity: 1; }
          43.57%, 54.45% { opacity: 0; }
          54.51%, 100% { opacity: 1; }
        }
        @keyframes codexSaberBack {
          0%, 43.51% { opacity: 0; }
          43.57%, 54.45% { opacity: 0.85; }
          54.51%, 100% { opacity: 0; }
        }

        @keyframes floatDetail {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0.001deg); }
          50% { transform: translate3d(0, -8px, 0) scale(1.012) rotate(1.2deg); }
        }
      `}</style>
    </div>
  );
};

const CompactStat: React.FC<{ label: string, value: number }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-0.25 border-b border-[var(--gold-accent)]/15">
    <span className="text-[7.5px] font-black opacity-40 uppercase tracking-[1.5px]">{label}</span>
    <span className="text-[14px] font-black tracking-tighter" style={{ color: 'var(--gold-accent)' }}>{value}</span>
  </div>
);

export default CharacterDetailView;