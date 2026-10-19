
export const CHARACTER_DETAILS: Record<number, { 
  bio: string, 
  stats: { hp: number, atk: number },
  leaderSkill: { name: string, desc: string },
  activeSkills: { name: string, desc: string }[] 
}> = {
  1: {
    bio: "【待文案】戰國趙之上卿。完璧歸趙、澠池之會，以先國家之急而後私讎，終與廉頗為刎頸之交。",
    stats: { hp: 880, atk: 82 },
    leaderSkill: { name: "先國家之急【待文案】", desc: "【隊長技】全隊防禦提升 25%，答對時額外回復少量生命。【待文案】" },
    activeSkills: [
      { name: "完璧歸趙【待文案】", desc: "本回合答題正確時，額外造成一次傷害。【待文案】" }
    ]
  },
  // 廉＝02；柳＝03（原 18）
  2: {
    bio: "【待文案】戰國趙之名將。負荊請罪，以勇氣聞於諸侯；與藺相如為刎頸之交，共保趙國。",
    stats: { hp: 1100, atk: 95 },
    leaderSkill: { name: "負荊請罪【待文案】", desc: "【隊長技】全隊攻擊提升 30%；生命低於半時防禦提高。【待文案】" },
    activeSkills: [
      { name: "一飯斗米【待文案】", desc: "對敵方造成高額傷害，並短暫降低其防禦。【待文案】" }
    ]
  },
  // 柳＝03（原 18；舊 03 起依次後移）
  3: { 
    bio: "唐代大文學家，謫居永州期間發現西山之美，體悟物我合一之境。其文筆洗鍊，風格峻潔。",
    stats: { hp: 850, atk: 78 },
    leaderSkill: { name: "萬化冥合", desc: "【隊長技】全隊文言題攻擊力提升 50%，無視 20% 防禦。" },
    activeSkills: [
      { name: "西山怪特", desc: "無視敵方防禦力，直接造成等同於答案長度的真實傷害。" }
    ]
  },
  7: { 
    bio: "至聖先師，儒家學說創始人。其言行錄於《論語》，強調仁、義、禮、智。其氣場莊嚴，能感化萬物。",
    stats: { hp: 1200, atk: 90 },
    leaderSkill: { name: "仁者無敵", desc: "【隊長技】全隊生命值提升 30%，回答錯誤時扣血量減半。" },
    activeSkills: [
      { name: "溫故知新", desc: "立即刷新當前題目，並將計時器重置。" }
    ]
  },
  10: { 
    bio: "蜀漢丞相，三國時期卓越的政治家與軍事家。其《出師表》言辭懇切，展現了鞠躬盡瘁、死而後已的高尚情操與忠貞之志。",
    stats: { hp: 920, atk: 98 },
    leaderSkill: { name: "隆中對策", desc: "【隊長技】全隊文言理解力提升 60%，且延長答題時間 5 秒。" },
    activeSkills: [
      { name: "七星北斗", desc: "直接排除題目中的三個錯誤字元。" }
    ]
  },
  13: { 
    bio: "詩仙李太白，性格豪邁浪漫。在月下獨酌中展現出超然孤高的情懷，與明月及影共舞。",
    stats: { hp: 750, atk: 95 },
    leaderSkill: { name: "三位一體", desc: "【隊長技】影、明月屬性共存時，全隊暴擊率提升 40%。" },
    activeSkills: [
      { name: "斗酒百篇", desc: "進入狂狂狀態，回答正確後，立即獲得下一題的提示字母。" }
    ]
  }
};
