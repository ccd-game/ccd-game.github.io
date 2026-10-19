
import React, { useMemo } from 'react';
import { LevelConfig } from '../../types';
import { portraitStyle } from '../../data/portraits';

interface CharacterTabProps {
  levels: LevelConfig[];
  onShowDetail: (char: any) => void;
}

type CodexEntry = {
  id: number;
  name: string;
  title: string;
  /** 關聯戰鬥關卡（取 bg）；廉／藺共用 level 1 */
  levelId: number;
  img?: string;
  /** 外頁可選虎／武器層（與人物同幅，同 portraitStyle） */
  weaponImg?: string;
  /** 外頁卡背景（缺省用 level.bgImg） */
  bgImg?: string;
  /** 外頁 bg object-position（同關 bg 分裁：藺偏左、廉偏右） */
  bgObjectPosition?: string;
};

/**
 * 圖鑑格：原「廉頗&藺相如」合併格拆為兩人。
 * 廉＝id 2；柳暫 id＝18（原 2 讓予廉），levelId 仍 2。
 * 顯示順序：藺 → 廉 → 柳 → …
 * 諸葛（09）／李白（12）：無立繪圖（資產已刪）。
 */
const AV = `${import.meta.env.BASE_URL}resources/avatar`;
const BG = `${import.meta.env.BASE_URL}resources/background`;
const CODEX_ENTRIES: CodexEntry[] = [
  { id: 1,  name: '藺相如', title: '《廉頗藺相如列傳》', levelId: 1,
    img: `${AV}/lin_xiang_ru/lin_xiang_ru_character.png`,
    weaponImg: `${AV}/lin_xiang_ru/lin_xiang_ru_weapon.png`,
    bgImg: `${BG}/lian_lin_bg.webp`,
    bgObjectPosition: '37.7% 45%' },  // faceX 482/1280 — 偏左景
  { id: 2,  name: '廉頗',   title: '《廉頗藺相如列傳》', levelId: 1,
    img: `${AV}/lian_po/lian_po_character.png`,
    weaponImg: `${AV}/lian_po/lian_po_weapon.png`,
    bgImg: `${BG}/lian_lin_bg.webp`,
    bgObjectPosition: '66.3% 45%' },  // faceX 848/1280 — 偏右景
  { id: 18, name: '柳宗元', title: '《始得西山宴遊記》', levelId: 2,
    img: `${AV}/liu_zong_yuan/liu_zong_yuan.png` },
  { id: 3,  name: '范仲淹', title: '《岳陽樓記》', levelId: 3 },
  { id: 4,  name: '韓愈',   title: '《師說》', levelId: 4 },
  { id: 5,  name: '荀子',   title: '《勸學》', levelId: 5,
    img: `${AV}/kong_zi/kong_zi_character.webp` },
  { id: 6,  name: '孔子',   title: '《論仁、論孝、論君子》', levelId: 6,
    img: `${AV}/kong_zi/kong_zi_character.webp` },
  { id: 7,  name: '孟子',   title: '《魚我所欲也》', levelId: 7 },
  { id: 8,  name: '莊子',   title: '《逍遙遊》', levelId: 8 },
  { id: 9,  name: '諸葛亮', title: '《出師表》', levelId: 9 },
  { id: 10, name: '蘇洵',   title: '《六國論》', levelId: 10 },
  { id: 11, name: '王維',   title: '《山居秋暝》', levelId: 11 },
  { id: 12, name: '李白',   title: '《月下獨酌》', levelId: 11 },
  { id: 13, name: '杜甫',   title: '《登樓》', levelId: 11 },
  { id: 14, name: '蘇軾',   title: '《念奴嬌．赤壁懷古》', levelId: 12 },
  { id: 15, name: '李清照', title: '《聲聲慢．秋情》', levelId: 12 },
  { id: 16, name: '辛棄疾', title: '《青玉案．元夕》', levelId: 12 },
];

/**
 * 解鎖：廉／藺暫開；柳改認 id 18；既有 6／9／12 邏輯保留。
 */
function isCodexUnlocked(id: number, levels: LevelConfig[]): boolean {
  if (id === 1 || id === 2) return true; // 廉／藺暫開，待關卡邏輯定案
  if (id === 18 || id === 6 || id === 9) return true;
  if (id === 12 && levels.find(l => l.id === 11)?.locked === false) return true;
  if (id === 11 || id === 13) return false;
  return false;
}

const CharacterTab: React.FC<CharacterTabProps> = ({ levels, onShowDetail }) => {

  const allCharacters = useMemo(() => {
    return CODEX_ENTRIES.map((entry) => {
      const levelData = levels.find(l => l.id === entry.levelId);
      const unlocked = isCodexUnlocked(entry.id, levels);
      // 諸葛／李白等無 img：不回落 DEFAULT，避免殘圖
      const img = entry.img ?? (entry.id === 9 || entry.id === 12 ? undefined : (levelData?.bossImg || undefined));
      return {
        id: entry.id,
        name: entry.name,
        img: img || '',
        weaponImg: entry.weaponImg,
        bgImg: entry.bgImg || levelData?.bgImg,
        bgObjectPosition: entry.bgObjectPosition,
        unlocked,
        title: entry.title,
        bgOpacity: 0.6,
        bgFilter: '',  // OFF：無 grayscale／contrast／brightness
        mixBlendMode: 'normal' as const,
        hasArt: Boolean(img),
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
            onClick={() => char.unlocked && char.hasArt && onShowDetail(char)}
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
            {char.unlocked && char.bgImg && char.hasArt && (
              <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ opacity: char.bgOpacity, mixBlendMode: char.mixBlendMode as any }}
              >
                <img 
                  src={char.bgImg} 
                  alt="" 
                  className="w-full h-full object-cover"
                  style={{
                    filter: char.bgFilter,
                    objectPosition: char.bgObjectPosition || '50% 50%',
                  }}
                />
              </div>
            )}
            {/* 米色徑向遮罩已刪：外頁背景只留關卡 bg 一層（opacity 0.6） */}
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
              {char.unlocked && char.hasArt ? (
                <>
                  {char.weaponImg && (
                    <img
                      src={char.weaponImg}
                      alt=""
                      className="pointer-events-none"
                      style={portraitStyle(char.img, 'outer')}
                      draggable={false}
                    />
                  )}
                  <img 
                    src={char.img} 
                    alt="" 
                    className="filter drop-shadow(0 12px 15px rgba(0,0,0,0.4))"
                    style={portraitStyle(char.img, 'outer')}
                    draggable={false}
                  />
                </>
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
              <div className="h-16 bg-gradient-to-t from-[#e8e2d5]/95 via-[#e8e2d5]/50 to-transparent"></div>
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

            {(!char.unlocked || !char.hasArt) && (
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
