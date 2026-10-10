
/**
 * 尋訪系統獎勵定義
 */

export enum Rarity {
  COMMON = 'COMMON',     // 普通 (白色/灰色)
  RARE = 'RARE',         // 稀有 (藍色)
  EPIC = 'EPIC',         // 史詩 (紫色)
  LEGENDARY = 'LEGENDARY' // 傳說 (金色)
}

export interface GachaItem {
  id: string;
  name: string;
  type: 'CHARACTER' | 'WEAPON' | 'ITEM' | 'FRAGMENT';
  rarity: Rarity;
  description: string;
  image?: string;
}

export const GACHA_POOL: GachaItem[] = [
  // 傳說 (LEGENDARY)
  {
    id: 'char_dufu',
    name: '詩聖・杜甫',
    type: 'CHARACTER',
    rarity: Rarity.LEGENDARY,
    description: '「造化鍾神秀，陰陽割昏曉。」',
  },
  {
    id: 'char_libai',
    name: '詩仙・李白',
    type: 'CHARACTER',
    rarity: Rarity.LEGENDARY,
    description: '「大鵬一日同風起，扶搖直上九萬里。」',
  },
  {
    id: 'weapon_zhanlu',
    name: '湛盧劍',
    type: 'WEAPON',
    rarity: Rarity.LEGENDARY,
    description: '五大名劍之首，仁道之劍，玄鐵鑄就，精光貫天。',
  },
  // 史詩 (EPIC)
  {
    id: 'char_sushi',
    name: '東坡居士・蘇軾',
    type: 'CHARACTER',
    rarity: Rarity.EPIC,
    description: '「竹杖芒鞋輕勝馬，誰怕？一蓑煙雨任平生。」',
  },
  {
    id: 'weapon_taie',
    name: '太阿劍',
    type: 'WEAPON',
    rarity: Rarity.EPIC,
    description: '威道之劍，氣勢磅礴，劍氣如虹。',
  },
  {
    id: 'item_lingdan',
    name: '九轉金丹',
    type: 'ITEM',
    rarity: Rarity.EPIC,
    description: '服之可大幅提升悟性與修為。',
  },
  // 稀有 (RARE)
  {
    id: 'item_ink_stone',
    name: '端溪古硯',
    type: 'ITEM',
    rarity: Rarity.RARE,
    description: '以此墨研磨，思如泉湧，文思不絕。',
  },
  {
    id: 'item_calligraphy',
    name: '蘭亭序殘卷',
    type: 'FRAGMENT',
    rarity: Rarity.RARE,
    description: '書聖墨寶殘片，隱約可感悟天地之氣。',
  },
  // 普通 (COMMON)
  {
    id: 'item_brush',
    name: '狼毫筆',
    type: 'ITEM',
    rarity: Rarity.COMMON,
    description: '工欲善其事，必先利其器。普通的書寫工具。',
  },
  {
    id: 'item_tea',
    name: '清心茗茶',
    type: 'ITEM',
    rarity: Rarity.COMMON,
    description: '恢復少量體力。',
  }
];

export function pullGacha(count: number): GachaItem[] {
  const results: GachaItem[] = [];
  for (let i = 0; i < count; i++) {
    const rand = Math.random() * 100;
    let selectedRarity: Rarity;
    
    if (rand < 2) selectedRarity = Rarity.LEGENDARY;      // 2%
    else if (rand < 10) selectedRarity = Rarity.EPIC;     // 8%
    else if (rand < 35) selectedRarity = Rarity.RARE;     // 25%
    else selectedRarity = Rarity.COMMON;                  // 65%

    const possibleItems = GACHA_POOL.filter(item => item.rarity === selectedRarity);
    const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
    results.push(item);
  }
  return results;
}
