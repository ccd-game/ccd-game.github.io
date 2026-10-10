import React from 'react';
import { CHARACTER_DETAILS } from '../data/characters';

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
  
  const isLiuZongyuan = char.id === 2;
  const isConfucius = char.id === 6;
  const isZhugeLiang = char.id === 9;
  const isLiBai = char.id === 12;
  
  // 針對 ID 09 諸葛亮進行精確調整
  // 依照要求，將 baseScale 從 1.0 調整至 1.05
  const baseScale = isConfucius ? 2.3 : (isLiBai ? 1.35 : (isZhugeLiang ? 1.05 : 1.75)); 
  const yOffset = isConfucius ? 118 : (isLiBai ? 120 : (isZhugeLiang ? 85 : 95)); 
  
  let xOffset = 15;
  if (isLiuZongyuan) xOffset = -40; 
  if (isLiBai) xOffset = -35; 
  if (isConfucius) xOffset = 10; 
  // 配合 1.05 縮放略微調整水平位移以保持視覺平衡
  if (isZhugeLiang) xOffset = 22; 
  
  const slideAnimName = 'characterSlideIn';
  const animDuration = '2.5s';
  const animTiming = 'cubic-bezier(0.19, 1, 0.22, 1)';

  const finalX = `${xOffset}px`;
  const finalY = `${yOffset + 24}px`; 
  const finalScale = baseScale;
  const finalRotate = "0.001deg";
  
  const staticTargetTransform = `scale(${finalScale}) translate3d(${finalX}, ${finalY}, 0)`;
  
  // 針對諸葛亮調整遮罩範圍
  const maskStart = isZhugeLiang ? '80%' : (isLiBai ? '40%' : (isConfucius ? '50%' : '60%'));
  const maskEnd = isZhugeLiang ? '95%' : (isLiBai ? '70%' : (isConfucius ? '70%' : '75%'));

  return (
    <div className="flex-1 flex flex-col animate-[fadeIn_0.5s_ease-out_forwards] overflow-y-auto overflow-x-hidden custom-scrollbar relative" style={{ backgroundColor: 'var(--app-bg)' }}>
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
         <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 opacity-[0.8] grayscale-[0.2]" 
              style={{ 
                backgroundImage: `url("${char.bgImg}")`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center bottom' 
              }} 
            />
         </div>
         
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

         <img 
           src={char.img} 
           alt="" 
           draggable="false"
           className="h-[120%] w-auto object-contain filter drop-shadow(0 15px 30px rgba(0,0,0,0.3)) pointer-events-none"
           style={{ 
             transformOrigin: 'bottom center',
             zIndex: 10,
             willChange: 'transform, opacity, -webkit-mask-image, mask-image',
             animation: `
                ${slideAnimName} ${animDuration} ${animTiming} forwards, 
                maskReveal ${animDuration} linear forwards,
                floatDetail 6.5s ease-in-out infinite ${animDuration}
             `
           }}
         />
         
         <div className="absolute inset-0 z-15 bg-gradient-to-b from-transparent via-transparent to-[var(--app-bg)] pointer-events-none"></div>
      </div>

      <div className="relative z-20 px-5 flex flex-col gap-0.5 pb-12" style={{ marginTop: '-12px' }}>
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-[6px] mb-0.5" style={{ color: 'var(--text-main)', fontFamily: "'LXGW WenKai Mono TC', serif" }}>{char.name}</h2>
          <p className="text-[var(--gold-accent)] font-bold tracking-[3px] text-[11px] mb-1">{char.title}</p>
          <div className="w-8 h-[1px] bg-[var(--gold-accent)] mx-auto mb-1 opacity-20"></div>
          <p className="text-[10.5px] leading-snug text-left opacity-75 mb-0" style={{ color: 'var(--text-sub)' }}>
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
                     <span className="text-[9.5px] opacity-60 leading-tight truncate" style={{ color: 'var(--text-sub)' }}>{detailData.leaderSkill.desc}</span>
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
                       <span className="text-[9.5px] opacity-60 leading-tight truncate" style={{ color: 'var(--text-sub)' }}>{skill.desc}</span>
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
        @keyframes maskReveal {
          0%, 100% {
            -webkit-mask-image: linear-gradient(to bottom, black ${maskStart}, transparent ${maskEnd});
            mask-image: linear-gradient(to bottom, black ${maskStart}, transparent ${maskEnd});
          }
        }

        @keyframes characterSlideIn {
          0% { 
            transform: scale(${finalScale * 0.85}) translate3d(${xOffset - 220}px, ${finalY}, 0) rotate(0deg); 
            opacity: 0;
          }
          80% {
            transform: scale(${finalScale}) translate3d(${finalX}, ${finalY}, 0) rotate(0deg);
            opacity: 1;
          }
          100% { 
            transform: ${staticTargetTransform} rotate(${finalRotate}); 
            opacity: 1;
          }
        }
        
        @keyframes floatDetail {
          0% { 
            transform: ${staticTargetTransform} rotate(${finalRotate}); 
          }
          50% { 
            transform: scale(${finalScale + 0.012}) translate3d(${finalX}, ${yOffset + 18}px, 0) rotate(1.2deg); 
          }
          100% { 
            transform: ${staticTargetTransform} rotate(${finalRotate}); 
          }
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