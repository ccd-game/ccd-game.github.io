
import { LevelConfig } from '../types';

export const LEVELS_DATA: LevelConfig[] = [
  {
    id: 1, title: "《廉頗藺相如列傳》（節錄）", subTitle: "司馬遷", sheetIds: [1], bossName: "藺相如",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_2.png`, 
    quote: '吾所以為此者，以先國家之急而後私讎也。',
    locked: true
  },
  {
    id: 2, title: "《始得西山宴遊記》", subTitle: "柳宗元", sheetIds: [2], bossName: "柳宗元",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan.png`,
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_2.png`,
    quote: '心凝形釋，與萬化冥合。',
    locked: false
  },
  {
    id: 3, title: "《岳陽樓記》", subTitle: "范仲淹", sheetIds: [3], bossName: "范仲淹",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_2.png`, // 暫代
    quote: '先天下之憂而憂，後天下之樂而樂',
    locked: true
  },
  {
    id: 4, title: "《師說》", subTitle: "韓愈", sheetIds: [4], bossName: "韓愈",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_2.png`, // 暫代
    quote: '師者，所以傳道、受業、解惑也。',
    locked: true
  },
  {
    id: 5, title: "《勸學》（節錄）", subTitle: "荀子", sheetIds: [5], bossName: "荀子",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_6.jpeg`, // 暫代
    quote: '不積跬步，無以至千里；不積小流，無以成江海。',
    locked: true
  },
  { 
    id: 6, title: "《論仁、論孝、論君子》", subTitle: "孔子", sheetIds: [6], bossName: "孔子",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi.png`,
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_6.jpeg`,
    quote: '一日克己復禮，天下歸仁焉。',
    locked: false
  },
  {
    id: 7, title: "《魚我所欲也》", subTitle: "孟子", sheetIds: [7], bossName: "孟子",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_6.jpeg`, // 暫代
    quote: '生亦我所欲也，義亦我所欲也；二者不可得兼，舍生而取義者也。',
    locked: true
  },
  {
    id: 8, title: "《逍遙遊》（節錄）", subTitle: "莊子", sheetIds: [8], bossName: "莊子",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/kong_zi/kong_zi.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_6.jpeg`, // 暫代
    quote: '無所可用，安所困苦哉？',
    locked: true
  },
  {
    id: 9, title: "《出師表》", subTitle: "諸葛亮", sheetIds: [9], bossName: "諸葛亮",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/zhu_ge_liang/zhu_ge_liang.png`,
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_9.jpeg`,
    quote: '受任於敗軍之際，奉命於危難之間。',
    locked: false
  },
  {
    id: 10, title: "《六國論》", subTitle: "蘇洵", sheetIds: [10], bossName: "蘇洵",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/liu_zong_yuan/liu_zong_yuan.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_9.jpeg`, // 暫代
    quote: '六國破滅，非兵不利，戰不善，弊在賂秦。',
    locked: true
  },
  {
    id: 11, title: "《詩三首》", subTitle: "王維《山居秋暝》、李白《月下獨酌》、杜甫《登樓》", sheetIds: [11, 12, 13], bossName: "李白",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/li_bai/li_bai.png`,
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_11_1.png`,
    quote: '舉杯邀明月，對影成三人。',
    locked: false
  },
  {
    id: 12, title: "《詞三首》", subTitle: "蘇軾《念奴嬌．赤壁懷古》、李清照《聲聲慢．秋情》、辛棄疾《青玉案．元夕》", sheetIds: [14, 15, 16], bossName: "三山詞祖",
    bossImg: `${import.meta.env.BASE_URL}resources/avatar/li_bai/li_bai.png`, // 暫代
    bgImg: `${import.meta.env.BASE_URL}resources/background/bg_level_11_1.png`, // 暫代
    quote: '大江東去，浪淘盡、千古風流人物。',
    locked: true
  }
];
