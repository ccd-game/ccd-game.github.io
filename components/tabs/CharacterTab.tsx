
import React, { useMemo } from 'react';
import { LevelConfig } from '../../types';
import { portraitStyle } from '../../data/portraits';

interface CharacterTabProps {
  levels: LevelConfig[];
  onShowDetail: (char: any) => void;
}

const CharacterTab: React.FC<CharacterTabProps> = ({ levels, onShowDetail }) => {
  const DEFAULT_IMG = `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan.png`;

  const allCharacters = useMemo(() => {
    const SPECIAL_MAP: Record<number, { name: string; title: string; img?: string }> = {
      1: { name: "廉頗&藺相如", title: "《廉頗藺相如列傳》", img: `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan.png` },
      5: { name: "荀子", title: "《勸學》", img: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi_character.webp` },
      6: { name: "孔子", title: "《論仁、論孝、論君子》", img: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi_character.webp` },
      9: { name: "諸葛亮", title: "《出師表》", img: `${import.meta.env.BASE_URL}resources/avatar/zhu_ge_liang/zhu_ge_liang.png` },
      11: { name: "王維", title: "《山居秋暝》", img: DEFAULT_IMG },
      12: { name: "李白", title: "《月下獨酌》", img: `${import.meta.env.BASE_URL}resources/avatar/li_bai/li_bai.png` },
      13: { name: "杜甫", title: "《登樓》", img: DEFAULT_IMG },
      14: { name: "蘇軾", title: "《念奴嬌．赤壁懷古》" },
      15: { name: "李清照", title: "《聲聲慢．秋情》" },
      16: { name: "辛棄疾", title: "《青玉案．元夕》" }
    };

    return Array.from({ length: 16 }, (_, i) => {
      const id = i + 1;
      let levelData: LevelConfig | undefined;
      if (id <= 10) levelData = levels.find(l => l.id === id);
      else if (id <= 13) levelData = levels.find(l => l.id === 11); 
      else levelData = levels.find(l => l.id === 12);              

      let isUnlocked = (id === 2 || id === 6 || id === 9); 
      if (id === 12 && levels.find(l => l.id === 11)?.locked === false) isUnlocked = true;
      if (id === 11 || id === 13) isUnlocked = false; 

      const charInfo = SPECIAL_MAP[id] || {
        name: levelData?.bossName || "未具名聖賢",
        title: levelData?.title ? `《${levelData.title.replace(/[《》]/g, '')}》` : "《秘傳篇章》"
      };

      const bgOpacity = 0.32; 
      const bgFilter = "grayscale(0.7) contrast(1.6) brightness(1.15)";
      const mixBlendMode = "normal";

      return {
        id,
        name: charInfo.name,
        img: charInfo.img || levelData?.bossImg || DEFAULT_IMG,
        bgImg: levelData?.bgImg,
        unlocked: isUnlocked,
        title: charInfo.title,
        bgOpacity,
        bgFilter,
        mixBlendMode
      };
    });
  }, [levels]);

  return (
    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar tab-slide-active relative" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-[var(--gold-accent)]"></div>
          <span className="text-[12px] font-black tracking-[6px] uppercase" style={{ color: 'var(--text-main)' }}>聖賢珍藏</span>
        </div>
        <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--text-sub)' }}>COLLECTION / {allCharacters.length}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-5 gap-y-7">
        {allCharacters.map((char) => (
          <div 
            key={char.id} 
            onClick={() => char.unlocked && onShowDetail(char)}
            className={`
              aspect-[3/4.6] relative rounded-lg transition-all duration-700 overflow-hidden
              ${char.unlocked 
                ? 'shadow-[0_15px_35px_rgba(0,0,0,0.2)] active:scale-[0.98] cursor-pointer' 
                : 'grayscale-[0.8] opacity-100 shadow-sm'} 
            `}
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              ['--card-bg' as any]: '#e8e2d5',
              border: char.unlocked ? '1.5px solid #c5a059' : '1px solid #d1d1d1',
            }}
          >
            {char.unlocked && char.bgImg && (
              <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ opacity: char.bgOpacity, mixBlendMode: char.mixBlendMode as any }}
              >
                <img 
                  src={char.bgImg} 
                  alt="" 
                  className="w-full h-full object-cover"
                  style={{ filter: char.bgFilter }}
                />
              </div>
            )}
            
            <div className="absolute inset-0 z-[1] bg-[#e8e2d5] opacity-50" style={{ background: 'radial-gradient(circle at center, transparent 0%, #e8e2d5 90%)' }}></div>
            <div className={`absolute inset-[6px] border border-[#c5a059]/30 pointer-events-none rounded-sm z-10`}></div>

            <div 
              className={`absolute top-1 left-1 z-30 flex items-center justify-center transition-opacity duration-500`}
              style={{ opacity: char.unlocked ? 1 : 0.4 }}
            >
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div 
                  className="absolute inset-0 bg-[#a32b2b] shadow-[1px_1px_4px_rgba(0,0,0,0.3)]" 
                  style={{ 
                    clipPath: 'polygon(0% 0%, 100% 0%, 95% 95%, 5% 100%)',
                    opacity: 0.9 
                  }}
                ></div>
                <span className="relative z-10 text-[11px] font-black text-[#f4f1ea] font-mono leading-none transform translate-y-[-1px]">
                  {char.id.toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
              {char.unlocked ? (
                <img 
                  src={char.img} 
                  alt="" 
                  className="filter drop-shadow(0 12px 15px rgba(0,0,0,0.4))"
                  style={portraitStyle(char.img, 'outer')}
                />
              ) : (
                <span 
                  className="text-[24px] font-black select-none pointer-events-none"
                  style={{ 
                    fontFamily: "'LXGW WenKai Mono TC', serif", 
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    letterSpacing: '0.3em',
                    color: '#3a352a',
                    opacity: 0.3,
                    zIndex: 25,
                    transform: 'translateY(-10px)',
                    filter: 'drop-shadow(0 0 10px rgba(184, 134, 11, 0.2))'
                  }}
                >
                  敬請期待
                </span>
              )}
            </div>

            <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none">
              <div className="h-28 bg-gradient-to-t from-[#e8e2d5] via-[#e8e2d5]/90 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full pb-2.5 pt-2 flex flex-col items-center">
                <div className={`w-6 h-[1px] mb-2 bg-[#c5a059] ${char.unlocked ? 'opacity-50' : 'opacity-20'}`}></div>
                
                <div 
                  className="text-[17px] font-black tracking-[4px] mb-0.5 text-center px-2" 
                  style={{ 
                    color: char.unlocked ? '#3a352a' : '#3a352a77', 
                    fontFamily: "'LXGW WenKai Mono TC', serif",
                    lineHeight: 1.2,
                    textShadow: '0 0 2px var(--card-bg), 0 0 6px var(--card-bg), 0 0 12px var(--card-bg)'
                  }}
                >
                  {char.name}
                </div>
                
                <div 
                  className="text-[9.5px] tracking-[1px] font-bold px-3 text-center" 
                  style={{ 
                    color: char.unlocked ? '#a67c00' : '#a67c0055' 
                  }}
                >
                  {char.title}
                </div>
              </div>
            </div>

            {!char.unlocked && (
              <div className="absolute inset-0 z-[25] bg-black/[0.02] pointer-events-none"></div>
            )}
          </div>
        ))}
      </div>
      <div className="h-10"></div>
    </div>
  );
};

export default CharacterTab;
