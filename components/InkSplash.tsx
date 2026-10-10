
import React, { useMemo, useEffect, useState } from 'react';

interface InkSplashProps {
  active: boolean;
}

/**
 * 墨染組件 V5.2 - 穩定重置版
 * 增加了內部的 render 鎖定邏輯，確保當外部 active 設為 false 時，組件能徹底清除 DOM 殘留。
 */
const InkSplash: React.FC<InkSplashProps> = React.memo(({ active }) => {
  const [shouldRender, setShouldRender] = useState(active);

  useEffect(() => {
    if (active) {
      setShouldRender(true);
    } else {
      // 當 active 關閉時，立即停止顯示
      setShouldRender(false);
    }
  }, [active]);

  const drops = useMemo(() => [
    { tx: '-20px', ty: '-85px', scale: 0.75, delay: 0 },
    { tx: '95px',  ty: '15px',  scale: 0.85, delay: 0.15 },
    { tx: '-75px', ty: '90px',  scale: 0.65, delay: 0.30 }
  ], []);

  const INK_IMAGE = `${import.meta.env.BASE_URL}resources/effect/ink_splash.png`;

  if (!shouldRender && !active) return null;

  return (
    <div className={`ink-master-layer ${active ? 'active' : ''}`}>
      <div className="ink-filter-wrapper">
        {drops.map((drop, i) => (
          <div 
            key={i} 
            className="ink-particle" 
            style={{ 
              ['--tx' as any]: drop.tx, 
              ['--ty' as any]: drop.ty, 
              ['--s' as any]: drop.scale, 
              animationDelay: `${drop.delay}s`,
              backgroundImage: `url("${INK_IMAGE}")`
            }} 
          />
        ))}
        <div 
          className="ink-expansion-core" 
          style={{ backgroundImage: `url("${INK_IMAGE}")` }}
        />
      </div>
      <div className="ink-final-shroud" />

      <style>{`
        .ink-master-layer {
          position: absolute;
          inset: 0;
          z-index: 20000;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease-in;
          overflow: hidden;
          mix-blend-mode: multiply;
        }
        
        .ink-master-layer.active { 
          opacity: 1; 
        }

        .ink-filter-wrapper {
          position: absolute;
          width: 150%;
          height: 150%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ink-particle, .ink-expansion-core {
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          will-change: transform, opacity;
          filter: contrast(1.2) brightness(0.9);
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          transform: translateZ(0);
        }

        .ink-particle {
          position: absolute;
          width: 650px;
          height: 650px;
          transform: translate3d(0, -100px, 0) scale(0);
          opacity: 0;
        }

        .active .ink-particle {
          animation: ink-particle-drop 1s cubic-bezier(0.2, 0, 0, 1) forwards !important;
        }

        .ink-expansion-core {
          position: absolute;
          width: 850px;
          height: 850px;
          opacity: 0;
          z-index: 5;
          transform: translate3d(0, 0, 0) scale(0.1);
        }

        .active .ink-expansion-core {
          animation: ink-organic-grow 5.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important;
          animation-delay: 0.6s !important;
        }

        .ink-final-shroud {
          position: absolute;
          inset: 0;
          background: #000000;
          opacity: 0;
          z-index: 10;
        }

        .active .ink-final-shroud {
          animation: shroud-fade-in 1.5s ease-in forwards !important;
          animation-delay: 3.3s !important;
        }

        @keyframes ink-particle-drop {
          0% { transform: translate3d(var(--tx), -150px, 0) scale(0); opacity: 0; }
          40% { opacity: 1; transform: translate3d(var(--tx), var(--ty), 0) scale(var(--s)); }
          100% { opacity: 1; transform: translate3d(var(--tx), var(--ty), 0) scale(calc(var(--s) * 0.9)); }
        }

        @keyframes ink-organic-grow {
          0% { transform: translate3d(0,0,0) scale(0.1); opacity: 0; }
          15% { transform: translate3d(0,0,0) scale(1.4); opacity: 1; }
          45% { transform: translate3d(0,0,0) scale(3.2); opacity: 1; }
          100% { transform: translate3d(0,0,0) scale(20); opacity: 1; }
        }

        @keyframes shroud-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
});

export default InkSplash;
