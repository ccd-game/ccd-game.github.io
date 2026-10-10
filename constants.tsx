

export const TEXT_CORPUS = `
先帝創業未半而中道崩殂。今天下三分，益州疲弊，此誠危急存亡之秋也。然侍衛之臣不懈於內，忠志之士忘身於外者。宮中府中，俱為一體；陟罰臧否，不宜異同。六國破滅，非兵不利，戰不善，弊在賂秦。古之學者必有師。師者，所以傳道、受業、解惑也。以為凡是州之山水有異態者，皆我有也，而未始知西山之怪特。今年九月二十八日，因坐法華西亭，望西山，始指異之。遂命僕過湘江，緣染溪，斫榛莽，焚茅茷，窮山之高而止。攀援長登，箕踞而遨，則凡數州之土壤，皆在衽席之下。其高下之勢，岈然窪然，若垤若穴，尺寸千里，攢蹙累積，莫得遁隱。縈青繚白，外與天際，四望如一。然後知是山之特立，不與培塿為類。悠悠乎與顥氣俱，而莫得其涯；洋洋乎與造物者遊，而不知其所窮。
`;

export const MAX_HP = 1000;
export const TURN_TIME = 30;

export const UI_STATIC_TEXT = {
  LOADING: { title: "文言地城", sub: "感應雲端中...", startBtn: "深入不毛", cancelBtn: "驀然回首" },
  PAUSE: { quote: "夫戰，勇氣也。\n一鼓作氣，再而衰，三而竭。\n《曹劌論戰》", resume: "學不可已", quit: "驀然回首" },
  QUIT_CONFIRM: { title: "中止修煉？", keep: "鍥而不舍", leave: "鍥而舍之" },
  WARNING: { timer: "時間將盡！", lowHp: "命懸一線！" }
};

export const ANIMATION_CONFIG = {
  INTRO: {
    GOLD_LINE: 0,
    BG_FADE: 300,
    BOSS_SPRITE: 750,
    BOSS_NAME: 1000,
    ENEMY_HP: 1150,
    PLAYER_HP: 1300,
    INPUT_PAD: 1500, 
    READY_START: 2000
  },
  TURN_START: {
    ANNOUNCE_IN: 0,
    ANNOUNCE_OUT: 1500,
    INPUT_PAD_SHOW: 2400,
    QUESTION_SHOW: 3600,
    SLOTS_DROP: 4500
  },
  ATTACK: {
    DIM_INPUT: 0,
    ANIM_START: 500,  
    SLASH_LINE: 1140, 
    SCREEN_HIT: 1780, 
    RECOVER: 2600    
  }
};
