
import React, { useEffect, useState } from 'react';

interface BootLoadingMaskProps {
  onComplete: () => void;
  assets: string[];
}

const BootLoadingMask: React.FC<BootLoadingMaskProps> = ({ onComplete, assets }) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const total = assets.length;

    const finish = () => {
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(onComplete, 800);
      }, 500);
    };

    if (total === 0) {
      setTimeout(finish, 1000);
      return;
    }

    const onLoad = () => {
      loadedCount++;
      setProgress(Math.floor((loadedCount / total) * 100));
      if (loadedCount === total) finish();
    };

    assets.forEach(url => {
      const img = new Image();
      img.src = url;
      img.onload = onLoad;
      img.onerror = onLoad;
    });
  }, [assets, onComplete]);

  return (
    <div className={`absolute inset-0 z-[100000] flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-700 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-6">
        {/* 文案與動態省略號 */}
        <div className="flex items-baseline">
          <span className="text-[#d4af37] text-2xl font-black tracking-[12px] filter drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
            載入中
          </span>
          <span className="dot-animation text-[#d4af37] text-2xl font-black tracking-[4px]"></span>
        </div>

        {/* 進度條 */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-56 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-[#8a6d1d] via-[#d4af37] to-[#8a6d1d] transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white/30 text-[10px] font-mono tracking-widest">{progress}%</span>
        </div>
      </div>

      <style>{`
        .dot-animation::after {
          content: '...';
          display: inline-block;
          width: 0;
          overflow: hidden;
          vertical-align: bottom;
          animation: dots 1.8s steps(4, end) infinite;
        }

        @keyframes dots {
          from { width: 0; }
          to { width: 48px; }
        }
      `}</style>
    </div>
  );
};

export default BootLoadingMask;
