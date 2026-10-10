
export const CHARACTER_DETAILS: Record<number, { 
  bio: string, 
  stats: { hp: number, atk: number },
  leaderSkill: { name: string, desc: string },
  activeSkills: { name: string, desc: string }[] 
}> = {
  2: { 
    bio: "唐代大文學家，謫居永州期間發現西山之美，體悟物我合一之境。其文筆洗鍊，風格峻潔。",
    stats: { hp: 850, atk: 78 },
    leaderSkill: { name: "萬化冥合", desc: "【隊長技】全隊文言題攻擊力提升 50%，無視 20% 防禦。" },
    activeSkills: [
      { name: "西山怪特", desc: "無視敵方防禦力，直接造成等同於答案長度的真實傷害。" }
    ]
  },
  6: { 
    bio: "至聖先師，儒家學說創始人。其言行錄於《論語》，強調仁、義、禮、智。其氣場莊嚴，能感化萬物。",
    stats: { hp: 1200, atk: 90 },
    leaderSkill: { name: "仁者無敵", desc: "【隊長技】全隊生命值提升 30%，回答錯誤時扣血量減半。" },
    activeSkills: [
      { name: "溫故知新", desc: "立即刷新當前題目，並將計時器重置。" }
    ]
  },
  9: { 
    bio: "蜀漢丞相，三國時期卓越的政治家與軍事家。其《出師表》言辭懇切，展現了鞠躬盡瘁、死而後已的高尚情操與忠貞之志。",
    stats: { hp: 920, atk: 98 },
    leaderSkill: { name: "隆中對策", desc: "【隊長技】全隊文言理解力提升 60%，且延長答題時間 5 秒。" },
    activeSkills: [
      { name: "七星北斗", desc: "消耗少量文氣，直接排除題目中的三個錯誤字元。" }
    ]
  },
  12: { 
    bio: "詩仙李太白，性格豪邁浪漫。在月下獨酌中展現出超然孤高的情懷，與明月及影共舞。",
    stats: { hp: 750, atk: 95 },
    leaderSkill: { name: "三位一體", desc: "【隊長技】影、明月屬性共存時，全隊暴擊率提升 40%。" },
    activeSkills: [
      { name: "斗酒百篇", desc: "進入狂狂狀態，回答正確後，立即獲得下一題的提示字母。" }
    ]
  }
};
