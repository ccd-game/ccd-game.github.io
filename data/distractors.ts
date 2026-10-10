// 文言地城：各關干擾字資料及出題盤產生器（自動生成：tools/generate.py；請勿手改資料部分）
// 原文：教育局《指定文言經典學習材料》個別篇章 ks4_*_text.pdf；第十關「茍」依老師決定作「苟」。
// 標點「﹔﹖︰」統一為「；？：」；第六關《論語》十六則已刪去序號及出處括號；段落以 \n 分隔。

// 老師決定：陷阱只收明確錯字；異體字、版本互用字、通假字及編校異文一律不作陷阱。
export type TrapKind = '形近' | '同音' | '形音近' | '義近' | '詞語混淆';
export interface Trap { char: string; target: string; kind: TrapKind; note: string }
export interface LevelDistractorPool { title: string; sheetIds: number[]; source: string; corpus: string; traps: Trap[] }

export const LEVEL_DISTRACTORS: Record<number, LevelDistractorPool> = {
  1: {
    title: "《廉頗藺相如列傳》（節錄）",
    sheetIds: [1],
    source: "ks4_08_text.pdf",
    corpus: "廉頗者，趙之良將也。趙惠文王十六年，廉頗為趙將伐齊，大破之，取陽晉，拜為上卿，以勇氣聞於諸侯。藺相如者，趙人也，為趙宦者令繆賢舍人。\n趙惠文王時，得楚和氏璧。秦昭王聞之，使人遺趙王書，願以十五城請易璧。趙王與大將軍廉頗諸大臣謀：欲予秦，秦城恐不可得，徒見欺；欲勿予，即患秦兵之來。計未定，求人可使報秦者，未得。宦者令繆賢曰：「臣舍人藺相如可使。」王問：「何以知之？」對曰：「臣嘗有罪，竊計欲亡走燕，臣舍人相如止臣，曰：『君何以知燕王？』臣語曰：『臣嘗從大王與燕王會境上，燕王私握臣手，曰：「願結友。」以此知之，故欲往。』相如謂臣曰：『夫趙彊而燕弱，而君幸於趙王，故燕王欲結於君。今君乃亡趙走燕，燕畏趙，其勢必不敢留君，而束君歸趙矣。君不如肉袒伏斧質請罪，則幸得脫矣。』臣從其計，大王亦幸赦臣。臣竊以為其人勇士，有智謀，宜可使。」於是王召見，問藺相如曰：「秦王以十五城請易寡人之璧，可予不？」相如曰：「秦彊而趙弱，不可不許。」王曰：「取吾璧，不予我城，奈何？」相如曰：「秦以城求璧而趙不許，曲在趙；趙予璧而秦不予趙城，曲在秦。均之二策，寧許以負秦曲。」王曰：「誰可使者？」相如曰：「王必無人，臣願奉璧往使。城入趙而璧留秦；城不入，臣請完璧歸趙。」趙王於是遂遣相如奉璧西入秦。\n秦王坐章臺見相如，相如奉璧奏秦王。秦王大喜，傳以示美人及左右，左右皆呼萬歲。相如視秦王無意償趙城，乃前曰：「璧有瑕，請指示王。」王授璧，相如因持璧卻立，倚柱，怒髮上衝冠，謂秦王曰：「大王欲得璧，使人發書至趙王，趙王悉召羣臣議，皆曰：『秦貪，負其彊，以空言求璧，償城恐不可得。』議不欲予秦璧。臣以為布衣之交尚不相欺，況大國乎！且以一璧之故逆彊秦之驩，不可。於是趙王乃齋戒五日，使臣奉璧，拜送書於庭。何者？嚴大國之威以修敬也。今臣至，大王見臣列觀，禮節甚倨；得璧，傳之美人，以戲弄臣。臣觀大王無意償趙王城邑，故臣復取璧。大王必欲急臣，臣頭今與璧俱碎於柱矣！」相如持其璧睨柱，欲以擊柱。秦王恐其破璧，乃辭謝固請，召有司案圖，指從此以往十五都予趙。相如度秦王特以詐佯為予趙城，實不可得，乃謂秦王曰：「和氏璧，天下所共傳寶也。趙王恐，不敢不獻。趙王送璧時，齋戒五日，今大王亦宜齋戒五日，設九賓於廷，臣乃敢上璧。」秦王度之，終不可彊奪，遂許齋五日，舍相如廣成傳。相如度秦王雖齋，決負約不償城，乃使其從者衣褐，懷其璧，從徑道亡，歸璧於趙。\n秦王齋五日後，乃設九賓禮於廷，引趙使者藺相如。相如至，謂秦王曰：「秦自繆公以來二十餘君，未嘗有堅明約束者也。臣誠恐見欺於王而負趙，故令人持璧歸，間至趙矣。且秦彊而趙弱，大王遣一介之使至趙，趙立奉璧來；今以秦之彊而先割十五都予趙，趙豈敢留璧而得罪於大王乎？臣知欺大王之罪當誅，臣請就湯鑊。唯大王與羣臣孰計議之！」秦王與羣臣相視而嘻。左右或欲引相如去，秦王因曰：「今殺相如，終不能得璧也，而絕秦趙之驩，不如因而厚遇之，使歸趙，趙王豈以一璧之故欺秦邪！」卒廷見相如，畢禮而歸之。相如既歸，趙王以為賢大夫，使不辱於諸侯，拜相如為上大夫。秦亦不以城予趙，趙亦終不予秦璧。\n其後秦伐趙，拔石城。明年，復攻趙，殺二萬人。秦王使使者告趙王，欲與王為好會於西河外澠池。趙王畏秦，欲毋行。廉頗、藺相如計曰：「王不行，示趙弱且怯也。」趙王遂行，相如從。廉頗送至境，與王訣曰：「王行，度道里會遇之禮畢，還，不過三十日。三十日不還，則請立太子為王，以絕秦望。」王許之，遂與秦王會澠池。秦王飲酒酣，曰：「寡人竊聞趙王好音，請奏瑟。」趙王鼓瑟。秦御史前書曰：「某年月日，秦王與趙王會飲，令趙王鼓瑟。」藺相如前曰：「趙王竊聞秦王善為秦聲，請奏盆缻秦王，以相娛樂。」秦王怒，不許。於是相如前進缻，因跪請秦王。秦王不肯擊缻。相如曰：「五步之內，相如請得以頸血濺大王矣！」左右欲刃相如，相如張目叱之，左右皆靡。於是秦王不懌，為一擊缻。相如顧召趙御史書曰：「某年月日，秦王為趙王擊缻。」秦之羣臣曰：「請以趙十五城為秦王壽。」藺相如亦曰：「請以秦之咸陽為趙王壽。」秦王竟酒，終不能加勝於趙。趙亦盛設兵以待秦，秦不敢動。\n既罷歸國，以相如功大，拜為上卿，位在廉頗之右。廉頗曰：「我為趙將，有攻城野戰之大功，而藺相如徒以口舌為勞，而位居我上，且相如素賤人，吾羞，不忍為之下。」宣言曰：「我見相如，必辱之。」相如聞，不肯與會。相如每朝時，常稱病，不欲與廉頗爭列。已而相如出，望見廉頗，相如引車避匿。於是舍人相與諫曰：「臣所以去親戚而事君者，徒慕君之高義也。今君與廉頗同列，廉君宣惡言而君畏匿之，恐懼殊甚，且庸人尚羞之，況於將相乎！臣等不肖，請辭去。」藺相如固止之，曰：「公之視廉將軍孰與秦王？」曰：「不若也。」相如曰：「夫以秦王之威，而相如廷叱之，辱其羣臣，相如雖駑，獨畏廉將軍哉？顧吾念之，彊秦之所以不敢加兵於趙者，徒以吾兩人在也。今兩虎共鬥，其勢不俱生。吾所以為此者，以先國家之急而後私讎也。」廉頗聞之，肉袒負荊，因賓客至藺相如門謝罪。曰：「鄙賤之人，不知將軍寬之至此也。」卒相與驩，為刎頸之交。",
    traps: [
      { char: '壁', target: '璧', kind: '形音近', note: "「完璧歸趙」常誤作「完壁」；璧是玉器，壁是牆壁。" },
      { char: '弩', target: '駑', kind: '形音近', note: "「相如雖駑」的「駑」指劣馬、才能低下，常誤作弓弩的「弩」（舊台詞亦曾誤用）。" },
      { char: '吻', target: '刎', kind: '形音近', note: "「刎頸之交」的「刎」是割頸，常誤作「吻」。" },
      { char: '坦', target: '袒', kind: '形音近', note: "「肉袒負荊」的「袒」是裸露上身，從衣，常誤作「坦」。" },
      { char: '蘭', target: '藺', kind: '形近', note: "姓氏「藺」常誤作「蘭」。" },
      { char: '賤', target: '濺', kind: '形音近', note: "「以頸血濺大王」的「濺」從水；「賤」亦見於本文（素賤人），易混。" },
      { char: '獲', target: '鑊', kind: '形音近', note: "「臣請就湯鑊」的「鑊」是烹人的大鍋，從金，易誤作「獲」。" },
    ],
  },
  2: {
    title: "《始得西山宴遊記》",
    sheetIds: [2],
    source: "ks4_13_text.pdf",
    corpus: "自余為僇人，居是州，恒惴慄。其隙也，則施施而行，漫漫而遊。日與其徒上高山，入深林，窮迴溪，幽泉怪石，無遠不到。到則披草而坐，傾壺而醉。醉則更相枕以臥，臥而夢。意有所極，夢亦同趣。覺而起，起而歸。以為凡是州之山有異態者，皆我有也，而未始知西山之怪特。\n今年九月二十八日，因坐法華西亭，望西山，始指異之。遂命僕過湘江，緣染溪，斫榛莽。焚茅茷，窮山之高而止。攀援而登，箕踞而遨，則凡數州之土壤，皆在衽席之下。其高下之勢，岈然窪然，若垤若穴，尺寸千里，攢蹙累積，莫得遯隱。縈青繚白，外與天際，四望如一。然後知是山之特出，不與培塿為類。悠悠乎與顥氣俱，而莫得其涯；洋洋乎與造物者遊，而不知其所窮。引觴滿酌，頹然就醉，不知日之入。蒼然暮色，自遠而至，至無所見，而猶不欲歸。心凝形釋，與萬化冥合。然後知吾嚮之未始遊，遊於是乎始，故為之文以志。是歲元和四年也。",
    traps: [
      { char: '揣', target: '惴', kind: '形近', note: "「惴慄」的「惴」（zhuì）從心，指憂懼，常誤作「揣」。" },
      { char: '殤', target: '觴', kind: '形音近', note: "「引觴滿酌」的「觴」是酒杯，從角，常誤作「殤」。" },
      { char: '疑', target: '凝', kind: '形近', note: "「心凝形釋」的「凝」是凝聚、專注，常漏寫冫旁作「疑」。" },
      { char: '邀', target: '遨', kind: '形近', note: "「箕踞而遨」的「遨」是遨遊，從辵、敖聲，常誤作邀請的「邀」。" },
      { char: '析', target: '斫', kind: '形近', note: "「斫榛莽」的「斫」（zhuó）是砍，從石從斤，易誤作分析的「析」。" },
      { char: '擇', target: '釋', kind: '形近', note: "「心凝形釋」的「釋」是消散、放下，從釆，易誤作選擇的「擇」。" },
    ],
  },
  3: {
    title: "《岳陽樓記》",
    sheetIds: [3],
    source: "ks4_14_text.pdf",
    corpus: "慶曆四年春，滕子京謫守巴陵郡。越明年，政通人和，百廢具興。乃重修岳陽樓，增其舊制，刻唐賢、今人詩賦於其上；屬予作文以記之。\n予觀夫巴陵勝狀，在洞庭一湖。銜遠山，吞長江，浩浩湯湯，橫無際涯；朝暉夕陰，氣象萬千。此則岳陽樓之大觀也，前人之述備矣。然則北通巫峽，南極瀟湘，遷客騷人，多會於此，覽物之情，得無異乎？\n若夫霪雨霏霏，連月不開；陰風怒號，濁浪排空；日星隱耀，山岳潛形；商旅不行，檣傾楫摧；薄暮冥冥，虎嘯猿啼。登斯樓也，則有去國懷鄉，憂讒畏譏，滿目蕭然，感極而悲者矣。\n至若春和景明，波瀾不驚，上下天光，一碧萬頃；沙鷗翔集，錦鱗游泳；岸芷汀蘭，郁郁青青。而或長煙一空，皓月千里，浮光躍金，靜影沉璧；漁歌互答，此樂何極！登斯樓也，則有心曠神怡，寵辱皆忘，把酒臨風，其喜洋洋者矣。\n嗟夫！予嘗求古仁人之心，或異二者之為。何哉？不以物喜，不以己悲。居廟堂之高，則憂其民；處江湖之遠，則憂其君。是進亦憂，退亦憂，然則何時而樂耶？其必曰：「先天下之憂而憂，後天下之樂而樂」歟！噫！微斯人，吾誰與歸！",
    traps: [
      { char: '菲', target: '霏', kind: '形音近', note: "「霪雨霏霏」的「霏」從雨，常誤作「菲」。" },
      { char: '嚎', target: '號', kind: '義近', note: "「陰風怒號」常誤作「怒嚎」。" },
      { char: '揖', target: '楫', kind: '形近', note: "「檣傾楫摧」的「楫」是船槳，從木；「揖」是作揖。" },
      { char: '牆', target: '檣', kind: '形音近', note: "「檣」是船的桅杆，從木，常誤作「牆」。" },
      { char: '饞', target: '讒', kind: '形音近', note: "「憂讒畏譏」的「讒」是讒言，從言，常誤作「饞」。" },
      { char: '麟', target: '鱗', kind: '形近', note: "「錦鱗游泳」的「鱗」指魚，從魚，常誤作「麟」。" },
      { char: '壁', target: '璧', kind: '形音近', note: "「靜影沉璧」的「璧」是圓玉，比喻月影，常誤作「壁」。" },
    ],
  },
  4: {
    title: "《師說》",
    sheetIds: [4],
    source: "ks4_12_text.pdf",
    corpus: "古之學者必有師。師者，所以傳道、受業、解惑也。人非生而知之者，孰能無惑？惑而不從師，其為惑也終不解矣。\n生乎吾前，其聞道也，固先乎吾，吾從而師之；生乎吾後，其聞道也，亦先乎吾，吾從而師之。吾師道也，夫庸知其年之先後生於吾乎？是故無貴無賤，無長無少，道之所存，師之所存也。\n嗟乎！師道之不傳也久矣！欲人之無惑也難矣！古之聖人，其出人也遠矣，猶且從師而問焉；今之眾人，其下聖人也亦遠矣，而恥學於師。是故聖益聖，愚益愚，聖人之所以為聖，愚人之所以為愚，其皆出於此乎！\n愛其子，擇師而教之；於其身也，則恥師焉，惑矣！彼童子之師，授之書而習其句讀者，非吾所謂傳其道、解其惑者也。句讀之不知，惑之不解，或師焉，或不焉，小學而大遺，吾未見其明也。\n巫、醫、樂師、百工之人，不恥相師；士大夫之族，曰師、曰弟子云者，則羣聚而笑之。問之，則曰：「彼與彼年相若也，道相似也。」位卑則足羞，官盛則近諛。嗚呼！師道之不復，可知矣。巫、醫、樂師、百工之人，君子不齒，今其智乃反不能及，其可怪也歟！\n聖人無常師，孔子師郯子、萇弘、師襄、老聃。郯子之徒，其賢不及孔子。孔子曰：「三人行，則必有我師。」是故弟子不必不如師，師不必賢於弟子；聞道有先後，術業有專攻，如是而已。\n李氏子蟠，年十七，好古文，六藝經傳，皆通習之，不拘於時，學於余。余嘉其能行古道，作《師說》以貽之。",
    traps: [
      { char: '齒', target: '恥', kind: '同音', note: "「不恥相師」「恥學於師」與下文「君子不齒」易混。" },
      { char: '恥', target: '齒', kind: '同音', note: "「君子不齒」的「齒」是並列、看得起，易與上文「不恥相師」混淆。" },
      { char: '傅', target: '傳', kind: '形近', note: "「傳道」「師道之不傳」的「傳」，常誤作師傅的「傅」。" },
      { char: '腴', target: '諛', kind: '形音近', note: "「官盛則近諛」的「諛」是奉承，從言，易誤作從肉的「腴」。" },
    ],
  },
  5: {
    title: "《勸學》（節錄）",
    sheetIds: [5],
    source: "ks4_06_text.pdf",
    corpus: "君子曰：學不可以已。青，取之於藍，而青於藍；冰，水為之，而寒於水。木直中繩，輮以為輪，其曲中規；雖有槁暴、不復挺者，輮使之然也。故木受繩則直，金就礪則利，君子博學而日參省乎己，則知明而行無過矣。\n吾嘗終日而思矣，不如須臾之所學也；吾嘗跂而望矣，不如登高之博見也。登高而招，臂非加長也，而見者遠。順風而呼，聲非加疾也，而聞者彰。假輿馬者，非利足也，而致千里；假舟楫者，非能水也，而絕江河。君子生非異也，善假於物也。\n積土成山，風雨興焉；積水成淵，蛟龍生焉；積善成德，而神明自得，聖心備焉。故不積跬步，無以至千里；不積小流，無以成江海。騏驥一躍，不能十步；駑馬十駕，功在不舍。鍥而舍之，朽木不折；鍥而不舍，金石可鏤。螾無爪牙之利，筋骨之強，上食埃土，下飲黃泉，用心一也。蟹六跪而二螯，非蛇蟺之穴無可寄託者，用心躁也。",
    traps: [
      { char: '勵', target: '礪', kind: '形音近', note: "「金就礪則利」的「礪」是磨刀石，從石，常誤作「勵」。" },
      { char: '揖', target: '楫', kind: '形近', note: "「假舟楫者」的「楫」是船槳，從木。" },
      { char: '弩', target: '駑', kind: '形音近', note: "「駑馬十駕」的「駑」是劣馬，從馬，常誤作「弩」。" },
      { char: '縷', target: '鏤', kind: '形音近', note: "「金石可鏤」的「鏤」是雕刻，從金，常誤作「縷」。" },
      { char: '燥', target: '躁', kind: '形音近', note: "「用心躁也」的「躁」是浮躁，從足，常誤作「燥」。" },
    ],
  },
  6: {
    title: "《論仁、論孝、論君子》",
    sheetIds: [6],
    source: "ks4_03_text.pdf",
    corpus: "子曰：「不仁者，不可以久處約，不可以長處樂。仁者安仁，知者利仁。」\n子曰：「富與貴，是人之所欲也；不以其道得之，不處也。貧與賤，是人之所惡也；不以其道得之，不去也。君子去仁，惡乎成名？君子無終食之間違仁，造次必於是，顛沛必於是。」\n顏淵問仁。子曰：「克己復禮為仁。一日克己復禮，天下歸仁焉。為仁由己，而由人乎哉？」顏淵曰：「請問其目。」子曰：「非禮勿視，非禮勿聽，非禮勿言，非禮勿動。」顏淵曰：「回雖不敏，請事斯語矣。」\n子曰：「志士仁人，無求生以害仁，有殺身以成仁。」\n孟懿子問孝。子曰：「無違。」樊遲御，子告之曰：「孟孫問孝於我，我對曰，無違。」樊遲曰：「何謂也？」子曰：「生，事之以禮；死，葬之以禮，祭之以禮。」\n子游問孝。子曰：「今之孝者，是謂能養。至於犬馬，皆能有養；不敬，何以別乎！」\n子曰：「事父母幾諫，見志不從，又敬不違，勞而不怨。」\n子曰：「父母之年，不可不知也。一則以喜，一則以懼。」\n子曰：「君子不重則不威；學則不固。主忠信。無友不如己者。過則勿憚改。」\n子曰：「君子坦蕩蕩，小人長戚戚。」\n司馬牛問君子。子曰：「君子不憂不懼。」曰：「不憂不懼，斯謂之君子已乎？」子曰：「內省不疚，夫何憂何懼？」\n子曰：「君子成人之美，不成人之惡。小人反是。」\n子曰：「君子恥其言而過其行。」\n子曰：「君子義以為質，禮以行之，孫以出之，信以成之。君子哉！」\n子曰：「君子病無能焉，不病人之不己知也。」\n子曰：「君子求諸己，小人求諸人。」",
    traps: [
      { char: '彈', target: '憚', kind: '形近', note: "「過則勿憚改」的「憚」是畏懼，從心，常誤作「彈」。" },
      { char: '咎', target: '疚', kind: '義近', note: "「內省不疚」的「疚」是內心愧疚，易誤作「咎」。" },
      { char: '已', target: '己', kind: '形近', note: "「克己復禮」「為仁由己」「求諸己」的「己」，常誤作「已」。" },
      { char: '己', target: '已', kind: '形近', note: "「斯謂之君子已乎」的「已」是語氣詞，易誤作「己」。" },
    ],
  },
  7: {
    title: "《魚我所欲也》",
    sheetIds: [7],
    source: "ks4_04_text.pdf",
    corpus: "孟子曰：「魚，我所欲也，熊掌，亦我所欲也；二者不可得兼，舍魚而取熊掌者也。生亦我所欲也，義亦我所欲也；二者不可得兼，舍生而取義者也。生亦我所欲，所欲有甚於生者，故不為苟得也；死亦我所惡，所惡有甚於死者，故患有所不辟也。如使人之所欲莫甚於生，則凡可以得生者，何不用也？使人之所惡莫甚於死者，則凡可以辟患者，何不為也？由是則生而有不用也，由是則可以辟患而有不為也，是故所欲有甚於生者，所惡有甚於死者。非獨賢者有是心也，人皆有之，賢者能勿喪耳。\n一簞食，一豆羹，得之則生，弗得則死。嘑爾而與之，行道之人弗受；蹴爾而與之，乞人不屑也。萬鍾則不辯禮義而受之。萬鍾於我何加焉？為宮室之美、妻妾之奉、所識窮乏者得我與？鄉為身死而不受，今為宮室之美為之；鄉為身死而不受，今為妻妾之奉為之；鄉為身死而不受，今為所識窮乏者得我而為之，是亦不可以已乎？此之謂失其本心。」",
    traps: [
      { char: '種', target: '鍾', kind: '形音近', note: "「萬鍾」的「鍾」是古代量器（指優厚俸祿），常誤作「萬種」。" },
      { char: '就', target: '蹴', kind: '形近', note: "「蹴爾而與之」的「蹴」是用腳踐踏，從足，常漏寫足旁作「就」。" },
      { char: '官', target: '宮', kind: '形近', note: "「為宮室之美」的「宮」是房屋，易誤作官職的「官」。" },
    ],
  },
  8: {
    title: "《逍遙遊》（節錄）",
    sheetIds: [8],
    source: "ks4_05_text.pdf",
    corpus: "惠子謂莊子曰：「魏王貽我大瓠之種，我樹之成而實五石。以盛水漿，其堅不能自舉也。剖之以為瓢，則瓠落無所容。非不呺然大也，吾為其無用而掊之。」莊子曰：「夫子固拙於用大矣！宋人有善為不龜手之藥者，世世以洴澼絖為事。客聞之，請買其方百金。聚族而謀曰：『我世世為洴澼絖，不過數金；今一朝而鬻技百金，請與之。』客得之，以說吳王。越有難，吳王使之將，冬與越人水戰，大敗越人，裂地而封之。能不龜手一也；或以封，或不免於洴澼絖，則所用之異也。今子有五石之瓠，何不慮以為大樽而浮於江湖，而憂其瓠落無所容，則夫子猶有蓬之心也夫！」\n惠子謂莊子曰：「吾有大樹，人謂之樗；其大本擁腫而不中繩墨，其小枝卷曲而不中規矩。立之塗，匠者不顧。今子之言，大而無用，衆所同去也。」莊子曰：「子獨不見狸狌乎？卑身而伏，以候敖者；東西跳梁，不辟高下，中於機辟，死於罔罟。今夫斄牛，其大若垂天之雲；此能為大矣，而不能執鼠。今子有大樹，患其無用，何不樹之於無何有之鄉，廣莫之野，彷徨乎無為其側，逍遙乎寢卧其下；不夭斤斧，物無害者。無所可用，安所困苦哉？」",
    traps: [
      { char: '狐', target: '瓠', kind: '形音近', note: "「大瓠之種」的「瓠」是葫蘆，易誤作「狐」。" },
      { char: '僻', target: '澼', kind: '形近', note: "「洴澼絖」的「澼」從水，常誤作「僻」。" },
      { char: '牲', target: '狌', kind: '形近', note: "「狸狌」的「狌」從犬，常誤作「牲」。" },
      { char: '惶', target: '徨', kind: '形音近', note: "「彷徨乎無為其側」的「徨」從彳，常誤作「惶」。" },
      { char: '天', target: '夭', kind: '形近', note: "「不夭斤斧」的「夭」是夭折，與「天」形近；「天」亦見於本文（垂天之雲）。" },
    ],
  },
  9: {
    title: "《出師表》",
    sheetIds: [9],
    source: "ks4_09_text.pdf",
    corpus: "先帝創業未半，而中道崩殂，今天下三分，益州疲弊，此誠危急存亡之秋也。然侍衞之臣，不懈於內；忠志之士，忘身於外者，蓋追先帝之殊遇，欲報之於陛下也。\n誠宜開張聖聽，以光先帝遺德，恢弘志士之氣；不宜妄自菲薄，引喻失義，以塞忠諫之路也。\n宮中、府中，俱為一體，陟罰臧否，不宜異同。若有作姦犯科，及為忠善者，宜付有司，論其刑賞，以昭陛下平明之治；不宜偏私，使內外異法也。\n侍中、侍郎郭攸之、費禕、董允等，此皆良實，志慮忠純，是以先帝簡拔以遺陛下。愚以為宮中之事，事無大小，悉以咨之，然後施行，必能裨補闕漏，有所廣益。將軍向寵，性行淑均，曉暢軍事，試用於昔日，先帝稱之曰「能」，是以眾議舉寵為督。愚以為營中之事，悉以咨之，必能使行陣和睦，優劣得所。\n親賢臣，遠小人，此先漢所以興隆也；親小人，遠賢臣，此後漢所以傾頹也。先帝在時，每與臣論此事，未嘗不歎息痛恨於桓、靈也！侍中、尚書、長史、參軍，此悉貞良死節之臣，願陛下親之、信之，則漢室之隆，可計日而待也。\n臣本布衣，躬耕於南陽，苟全性命於亂世，不求聞達於諸侯。先帝不以臣卑鄙，猥自枉屈，三顧臣於草廬之中，諮臣以當世之事，由是感激，遂許先帝以驅馳。後值傾覆，受任於敗軍之際，奉命於危難之間，爾來二十有一年矣。先帝知臣謹慎，故臨崩寄臣以大事也。受命以來，夙夜憂歎，恐託付不效，以傷先帝之明。故五月渡瀘，深入不毛。今南方已定，兵甲已足，當獎率三軍，北定中原，庶竭駑鈍，攘除姦凶，興復漢室，還於舊都。此臣所以報先帝而忠陛下之職分也。至於斟酌損益，進盡忠言，則攸之、禕、允之任也。\n願陛下託臣以討賊興復之效；不效，則治臣之罪，以告先帝之靈。若無興德之言，則責攸之、禕、允等之慢，以彰其咎。陛下亦宜自謀，以諮諏善道，察納雅言，深追先帝遺詔。臣不勝受恩感激。今當遠離，臨表涕零，不知所言。",
    traps: [
      { char: '阻', target: '殂', kind: '形近', note: "「中道崩殂」的「殂」是死亡，從歹，常誤作「阻」。" },
      { char: '褘', target: '禕', kind: '形近', note: "人名「費禕」的「禕」從示，常誤作從衣的「褘」。" },
      { char: '軀', target: '驅', kind: '同音', note: "「遂許先帝以驅馳」的「驅」從馬，常誤作「軀」。" },
      { char: '弩', target: '駑', kind: '形音近', note: "「庶竭駑鈍」的「駑」從馬，常誤作「弩」。" },
      { char: '恭', target: '躬', kind: '同音', note: "「躬耕於南陽」的「躬」是親自，常誤作「恭」。" },
      { char: '茅', target: '草', kind: '詞語混淆', note: "受成語「三顧茅廬」影響，「三顧臣於草廬之中」常誤作「茅廬」。" },
    ],
  },
  10: {
    title: "《六國論》",
    sheetIds: [10],
    source: "ks4_15_text.pdf（「茍」依老師決定改作「苟」）",
    corpus: "六國破滅，非兵不利，戰不善，弊在賂秦。賂秦而力虧，破滅之道也。或曰：「六國互喪，率賂秦耶？」曰：「不賂者以賂者喪。蓋失強援，不能獨完，故曰『弊在賂秦』也。」\n秦以攻取之外，小則獲邑，大則得城，較秦之所得與戰勝而得者，其實百倍；諸侯之所亡與戰敗而亡者，其實亦百倍。則秦之所大欲，諸侯之所大患，固不在戰矣。思厥先祖父，暴霜露，斬荊棘，以有尺寸之地。子孫視之不甚惜，舉以予人，如棄草芥。今日割五城，明日割十城，然後得一夕安寢，起視四境，而秦兵又至矣。然則諸侯之地有限，暴秦之欲無厭，奉之彌繁，侵之愈急，故不戰而強弱勝負已判矣。至於顛覆，理固宜然。古人云：「以地事秦，猶抱薪救火，薪不盡，火不滅。」此言得之。\n齊人未嘗賂秦，終繼五國遷滅，何哉？與嬴而不助五國也。五國既喪，齊亦不免矣。燕趙之君，始有遠略，能守其土，義不賂秦。是故燕雖小國而後亡，斯用兵之效也。至丹以荊卿為計，始速禍焉。趙嘗五戰于秦，二敗而三勝，後秦擊趙者再，李牧連卻之；洎牧以讒誅，邯鄲為郡，惜其用武而不終也。且燕趙處秦革滅殆盡之際，可謂智力孤危，戰敗而亡，誠不得已。向使三國各愛其地，齊人勿附於秦，刺客不行，良將猶在，則勝負之數，存亡之理，當與秦相較，或未易量。\n嗚呼！以賂秦之地，封天下之謀臣；以事秦之心，禮天下之奇才；幷力西嚮，則吾恐秦人食之不得下嚥也。悲夫！有如此之勢，而為秦人積威之所劫，日削月割，以趨於亡。為國者無使為積威之所劫哉！\n夫六國與秦皆諸侯，其勢弱於秦，而猶有可以不賂而勝之之勢；苟以天下之大，而從六國破亡之故事，是又在六國下矣！",
    traps: [
      { char: '贏', target: '嬴', kind: '形近', note: "「與嬴而不助五國」的「嬴」是秦國國姓，常誤作輸贏的「贏」。" },
      { char: '泊', target: '洎', kind: '形近', note: "「洎牧以讒誅」的「洎」是及、等到，常誤作「泊」。" },
      { char: '饞', target: '讒', kind: '形音近', note: "「洎牧以讒誅」的「讒」是讒言，從言，常誤作「饞」。" },
      { char: '鳴', target: '嗚', kind: '形近', note: "「嗚呼」的「嗚」從口，常誤作鳥鳴的「鳴」。" },
      { char: '剌', target: '刺', kind: '形近', note: "「刺客不行」的「刺」右旁是「朿」，常誤作右旁從「束」的「剌」（là）。" },
      { char: '略', target: '賂', kind: '形近', note: "「弊在賂秦」的「賂」從貝，易誤作「略」；「略」亦見於本文（始有遠略），易混。" },
    ],
  },
  11: {
    title: "唐詩三首：王維《山居秋暝》、李白《月下獨酌》（其一）、杜甫《登樓》",
    sheetIds: [11, 12, 13],
    source: "ks4_16a/16b/16c_text.pdf",
    corpus: "空山新雨後，天氣晚來秋。明月松間照，清泉石上流。竹喧歸浣女，蓮動下漁舟。隨意春芳歇，王孫自可留。\n花間一壺酒，獨酌無相親。舉杯邀明月，對影成三人。月既不解飲，影徒隨我身。暫伴月將影，行樂須及春。我歌月徘徊，我舞影零亂。醒時同交歡，醉後各分散。永結無情遊，相期邈雲漢。\n花近高樓傷客心，萬方多難此登臨。錦江春色來天地，玉壘浮雲變古今。北極朝廷終不改，西山寇盜莫相侵。可憐後主還祠廟，日暮聊為梁甫吟。",
    traps: [
      { char: '暄', target: '喧', kind: '形音近', note: "「竹喧歸浣女」的「喧」是喧鬧，從口，常誤作「暄」。" },
      { char: '遨', target: '邀', kind: '形近', note: "「舉杯邀明月」的「邀」是邀請，常誤作「遨」。" },
      { char: '排', target: '徘', kind: '形音近', note: "「我歌月徘徊」的「徘」從彳，常誤作「排」。" },
      { char: '渺', target: '邈', kind: '義近', note: "「相期邈雲漢」的「邈」是遙遠，易誤作「渺」。" },
      { char: '綿', target: '錦', kind: '形近', note: "「錦江春色來天地」的「錦」從金，易誤作「綿」。" },
      { char: '疊', target: '壘', kind: '形近', note: "「玉壘浮雲變古今」的「壘」是山名用字，易誤作「疊」。" },
      { char: '冠', target: '寇', kind: '形近', note: "「西山寇盜莫相侵」的「寇」是盜賊，易誤作「冠」。" },
      { char: '詞', target: '祠', kind: '形音近', note: "「可憐後主還祠廟」的「祠」從示，易誤作「詞」。" },
    ],
  },
  12: {
    title: "詞三首：蘇軾《念奴嬌‧赤壁懷古》、李清照《聲聲慢‧秋情》、辛棄疾《青玉案‧元夕》",
    sheetIds: [14, 15, 16],
    source: "ks4_17a/17b/17c_text.pdf",
    corpus: "大江東去，浪淘盡、千古風流人物。故壘西邊，人道是、三國周郎赤壁。亂石穿空，驚濤拍岸，捲起千堆雪。江山如畫，一時多少豪傑！遙想公瑾當年，小喬初嫁了，雄姿英發。羽扇綸巾，談笑間、檣櫓灰飛煙滅。故國神遊，多情應笑我，早生華髮。人間如夢，一尊還酹江月。\n尋尋覓覓，冷冷清清，悽悽慘慘戚戚。乍煖還寒時候，最難將息。三杯兩盞淡酒，怎敵他，晚來風急！雁過也，正傷心，卻是舊時相識。滿地黃花堆積，憔悴損，如今有誰堪摘？守着窗兒，獨自怎生得黑！梧桐更兼細雨，到黃昏、點點滴滴。這次第，怎一箇愁字了得！\n東風夜放花千樹，更吹落、星如雨。寶馬雕車香滿路。鳳簫聲動，玉壺光轉，一夜魚龍舞。蛾兒雪柳黃金縷，笑語盈盈暗香去。眾裏尋他千百度；驀然迴首，那人卻在、燈火闌珊處。",
    traps: [
      { char: '濤', target: '淘', kind: '形音近', note: "「浪淘盡」的「淘」是沖洗，易與下文「驚濤拍岸」的「濤」混淆。" },
      { char: '疊', target: '壘', kind: '形近', note: "「故壘西邊」的「壘」是營壘，易誤作「疊」。" },
      { char: '璧', target: '壁', kind: '形音近', note: "「赤壁」是地名（崖壁），從土，常誤作「璧」。" },
      { char: '謹', target: '瑾', kind: '形近', note: "「遙想公瑾當年」的「瑾」從玉，易誤作「謹」。" },
      { char: '牆', target: '檣', kind: '形音近', note: "「檣櫓灰飛煙滅」的「檣」是桅杆，從木，常誤作「牆」。" },
      { char: '發', target: '髮', kind: '形音近', note: "「早生華髮」的「髮」是頭髮，常誤作「發」；「發」亦見於本文（雄姿英發）。" },
      { char: '髮', target: '發', kind: '形音近', note: "「雄姿英發」的「發」是煥發，易與「華髮」的「髮」混淆。" },
      { char: '抵', target: '敵', kind: '義近', note: "「怎敵他，晚來風急」的「敵」是抵擋，易誤作「抵」。" },
      { char: '粹', target: '悴', kind: '形音近', note: "「憔悴損」的「悴」從心，易誤作「粹」。" },
      { char: '暮', target: '驀', kind: '形近', note: "「驀然迴首」的「驀」從馬，常誤作「暮」。" },
    ],
  },
};

/** 全域異體／版本互用字組：答案含其中一字時，同組其他字一律不出現在該題盤面。 */
export const VARIANT_GROUPS: { chars: string; note: string }[] = [
  { chars: "遯遁", note: "異體" },
  { chars: "衞衛", note: "異體" },
  { chars: "迴回廻", note: "異體／通用" },
  { chars: "悽淒凄", note: "異體" },
  { chars: "箇個个", note: "異體" },
  { chars: "裏裡", note: "異體" },
  { chars: "卧臥", note: "異體（兩份教育局文件不一）" },
  { chars: "臺台", note: "通用（Set_text_12 作「台」）" },
  { chars: "着著", note: "通用（兩份教育局文件不一）" },
  { chars: "恒恆", note: "異體" },
  { chars: "咨諮", note: "通用（《出師表》兩字並用）" },
  { chars: "苟茍茗", note: "字形相混／教育局原文誤植" },
  { chars: "彊強", note: "異體" },
  { chars: "驩歡", note: "通用" },
  { chars: "缻缶", note: "異體" },
  { chars: "讎讐仇", note: "版本互用" },
  { chars: "慄栗", note: "通用" },
  { chars: "僇戮", note: "通假" },
  { chars: "冥溟", note: "互用" },
  { chars: "踞倨", note: "互用" },
  { chars: "遊游", note: "通用" },
  { chars: "顥灝", note: "版本異文" },
  { chars: "塿嶁", note: "版本異文" },
  { chars: "嚮向鄉", note: "通用／通假" },
  { chars: "曆歷", note: "通用" },
  { chars: "具俱", note: "通假" },
  { chars: "湯蕩盪", note: "通假／異體" },
  { chars: "暉輝", note: "通用" },
  { chars: "霪淫", note: "版本異文" },
  { chars: "頃傾", note: "通假" },
  { chars: "郁鬱", note: "版本互用" },
  { chars: "屬囑", note: "通假" },
  { chars: "受授", note: "通假" },
  { chars: "讀逗", note: "句讀／句逗" },
  { chars: "萇長", note: "未能確定" },
  { chars: "恥耻", note: "異體" },
  { chars: "羣群", note: "異體" },
  { chars: "歟與", note: "通假" },
  { chars: "輮揉", note: "版本異文" },
  { chars: "暴曝", note: "通假" },
  { chars: "知智", note: "通假" },
  { chars: "跂企", note: "通假" },
  { chars: "槁稿槀稾", note: "字形相混" },
  { chars: "騏麒", note: "互用" },
  { chars: "舍捨", note: "通用" },
  { chars: "鍥契", note: "通假" },
  { chars: "螾蚓", note: "異體" },
  { chars: "蟺鱔", note: "異體" },
  { chars: "顛巔", note: "通用" },
  { chars: "戚慼", note: "異體" },
  { chars: "孫遜", note: "通假" },
  { chars: "辟避", note: "通假" },
  { chars: "嘑呼", note: "通用" },
  { chars: "簞單", note: "未能確定" },
  { chars: "蹴蹙", note: "通用" },
  { chars: "鍾鐘", note: "版本互用" },
  { chars: "辯辨", note: "通假" },
  { chars: "掊剖", note: "未能確定" },
  { chars: "龜皸", note: "通假" },
  { chars: "絖纊", note: "異體" },
  { chars: "樽尊罇", note: "異體" },
  { chars: "擁臃", note: "通假" },
  { chars: "卷捲", note: "通用" },
  { chars: "塗途", note: "通假" },
  { chars: "衆眾", note: "異體" },
  { chars: "敖遨", note: "通假" },
  { chars: "罔網", note: "通假" },
  { chars: "斄犛", note: "異體" },
  { chars: "臧藏", note: "通假" },
  { chars: "弘宏", note: "通用" },
  { chars: "姦奸", note: "通用" },
  { chars: "闕缺", note: "通假" },
  { chars: "歎嘆", note: "異體" },
  { chars: "夙宿", note: "通假" },
  { chars: "託托", note: "通用" },
  { chars: "攘讓", note: "通假" },
  { chars: "賂路", note: "通假" },
  { chars: "弊敝蔽", note: "互用" },
  { chars: "厭饜", note: "通假" },
  { chars: "芥介", note: "通假" },
  { chars: "薪新", note: "本字" },
  { chars: "殆怠", note: "通假" },
  { chars: "嚥咽", note: "通用" },
  { chars: "幷并併並", note: "異體／通用" },
  { chars: "甫父", note: "版本異文" },
  { chars: "喬橋", note: "版本互用" },
  { chars: "煖暖", note: "異體" },
  { chars: "闌欄", note: "通用" },
  { chars: "簫蕭", note: "未能確定" },
  { chars: "蛾娥", note: "通用" },
  { chars: "涯崖", note: "互用" },
  { chars: "蓬篷", note: "未能確定" },
  { chars: "攻功", note: "未能確定" },
];

/** 只在特定句子出現的版本異文：答案或題幹含 phrase 時，alt 中的字不得上盤（level 為關卡 ID）。 */
export const PHRASE_ALTERNATES: { level: number; phrase: string; alt: string; note: string }[] = [
  { level: 12, phrase: "人間如夢", alt: "生", note: "版本異文：坊間或作「人生如夢」；教育局本作「人間如夢」" },
  { level: 6, phrase: "君子已乎", alt: "矣", note: "兩份教育局文件不一：「斯謂之君子已乎」／「矣乎」" },
];

export const SHEET_TO_LEVEL: Record<number, number> = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 11, 13: 11, 14: 12, 15: 12, 16: 12};

// ───────────────────────────── 出題盤（20 格）產生器 ─────────────────────────────
// 純函式、無外部依賴。呼叫方式：buildBoard(q.answers, levelId, 20, Math.random, { question: q.question })

export type Rng = () => number;

export interface BuildBoardOptions {
  /** 題幹文字；用來在原文中定位「鄰近字」（答案本身不在原文時，例如語譯題）。 */
  question?: string;
  /** 每題最少陷阱字數（不足時以本關其他陷阱補足）。預設 2。 */
  minTraps?: number;
  /** 每題最多陷阱字數。預設 4。 */
  maxTraps?: number;
  /** 扣除答案字及陷阱字後，餘下格數中「鄰近字」所佔比例（0–1）。預設 0.5。 */
  nearbyRatio?: number;
  /**
   * 'concat'（預設，與現行 generateDynamicOptions 相同）：把所有可接受答案的字逐一放入；
   * 'union'：每個字只放「任一答案所需的最多次數」，可減少重複字及溢出。
   */
  answerTileMode?: 'concat' | 'union';
  /**
   * 題幹中出現的漢字不作干擾字（例如題幹「明月松間照，_____。」時，「明月松間照」各字不會上盤），預設 true。
   * 若排除後無法填滿盤面，會自動放寬（只放寬這一條，其他安全規則不變），並在 BoardResult.stemRelaxed 標示。
   */
  excludeStemChars?: boolean;
  /**
   * 預填格（題庫答案欄開頭的 [ ]，由遊戲的 parseAnswerCell 解析出來）。預填字已顯示在格子上，
   * 不是字卡，亦不會被抽作干擾字或陷阱字；「…」一律忽略。answers 應只含學生要輸入的部分。
   */
  prefill?: string[];
  // 注意：舊版的 includeVariantTraps 選項已刪除，不再支援，亦不建議恢復。
  // 按老師決定，異體字、通假字、互用字及任何版本異文一律不作陷阱；
  // 傳入 includeVariantTraps 不會有任何作用（TypeScript 會報錯：物件常值不可含未知屬性）。
}

export interface BoardResult {
  tiles: string[];          // 已洗牌的格子
  answerTiles: string[];    // 由答案產生的格子
  traps: Trap[];            // 實際使用的陷阱字
  nearby: string[];         // 取自題目所在句／段的干擾字
  random: string[];         // 取自本關原文的隨機干擾字
  fallback: string[];       // 本關字數不足時取自其他關的干擾字
  overflow: boolean;        // 答案字數已超過 size（不再加干擾字）
  stemRelaxed: boolean;     // 因盤面填不滿而放寬了「題幹字不作干擾字」
  suppressedTraps: Trap[];  // 本關陷阱中，因陷阱字本身是本題答案字（或預填字）而不放的陷阱
}

const PREFIX_RE = /^\s*[[［]([^\]］]*)[\]］]/;
const ELLIPSIS_CHARS_RE = /\.{2,}|．{2,}|[…⋯]+/g;
/**
 * 防呆：若呼叫方誤把未解析的答案（例如「[以…]為恥」）直接傳入，拆出開頭的預填。
 * 正式解析請用遊戲的 parseAnswerCell（src/utils/answerSyntax.ts）；這裏只處理最常見寫法，不處理轉義。
 */
export function stripAnswerPrefix(answer: string): { prefix: string[]; body: string } {
  const m = answer.match(PREFIX_RE);
  if (!m) return { prefix: [], body: answer };
  const prefix = toChars(m[1].replace(/\s/g, '').replace(ELLIPSIS_CHARS_RE, '…'));
  return { prefix, body: answer.slice(m[0].length).trim() };
}

const HAN_RE = /\p{Script=Han}/u;
const isHan = (c: string): boolean => HAN_RE.test(c);
const toChars = (s: string): string[] => Array.from(s);

function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let variantMap: Map<string, Set<string>> | null = null;
/** 某字的異體／版本互用字（不含本身）。 */
export function variantsOf(c: string): Set<string> {
  if (!variantMap) {
    variantMap = new Map();
    for (const g of VARIANT_GROUPS) {
      const cs = toChars(g.chars);
      for (const x of cs) {
        const set = variantMap.get(x) ?? new Set<string>();
        cs.forEach(y => { if (y !== x) set.add(y); });
        variantMap.set(x, set);
      }
    }
  }
  return variantMap.get(c) ?? new Set<string>();
}

/** 由可接受答案產生答案格。 */
export function answerTilesOf(answers: string[], mode: 'concat' | 'union' = 'concat'): string[] {
  const clean = answers.map(a => a.replace(/\s/g, '')).filter(a => a.length > 0);
  if (mode === 'concat') return toChars(clean.join(''));
  const need = new Map<string, number>();
  for (const a of clean) {
    const cnt = new Map<string, number>();
    for (const c of toChars(a)) cnt.set(c, (cnt.get(c) ?? 0) + 1);
    cnt.forEach((n, c) => need.set(c, Math.max(need.get(c) ?? 0, n)));
  }
  const out: string[] = [];
  need.forEach((n, c) => { for (let i = 0; i < n; i++) out.push(c); });
  return out;
}

interface HanIndex { han: string[]; pos: number[]; text: string[] }
const indexCache = new Map<number, HanIndex>();
function hanIndex(levelId: number, corpus: string): HanIndex {
  const hit = indexCache.get(levelId);
  if (hit) return hit;
  const text = toChars(corpus);
  const han: string[] = []; const pos: number[] = [];
  text.forEach((c, i) => { if (isHan(c)) { han.push(c); pos.push(i); } });
  const idx = { han, pos, text };
  indexCache.set(levelId, idx);
  return idx;
}

const SENT_END = new Set(['。', '！', '？', '；', '\n']);

/** 在原文中找出答案（或題幹引文）所在的句子窗口及段落；找不到則回傳 null。 */
export function locateContext(levelId: number, answers: string[], question?: string): { window: string; paragraph: string } | null {
  const pool = LEVEL_DISTRACTORS[levelId];
  if (!pool) return null;
  const { han, pos, text } = hanIndex(levelId, pool.corpus);
  const hanStr = han.join('');
  const keys: string[] = [];
  for (const a of answers) { const k = toChars(a).filter(isHan).join(''); if (toChars(k).length >= 2) keys.push(k); }
  if (question) {
    const runs = question.split(/_{2,}|[^\p{Script=Han}]+/u).filter(r => toChars(r).length >= 2);
    runs.sort((x, y) => toChars(y).length - toChars(x).length);
    keys.push(...runs);
  }
  for (const key of keys) {
    const at = hanStr.indexOf(key);
    if (at < 0) continue;
    // hanStr 以 UTF-16 計位；轉回字元序號
    const hanAt = toChars(hanStr.slice(0, at)).length;
    const keyLen = toChars(key).length;
    const start = pos[hanAt];
    const end = pos[Math.min(hanAt + keyLen - 1, pos.length - 1)];
    // 句子窗口：向前、向後各多取一句
    let s = start, e = end, back = 0, fwd = 0;
    while (s > 0) { if (SENT_END.has(text[s - 1])) { if (text[s - 1] === '\n' || ++back > 1) break; } s--; }
    while (e < text.length - 1) { if (SENT_END.has(text[e])) { if (text[e] === '\n' || ++fwd > 1) break; } e++; }
    let ps = start, pe = end;
    while (ps > 0 && text[ps - 1] !== '\n') ps--;
    while (pe < text.length - 1 && text[pe + 1] !== '\n') pe++;
    return { window: text.slice(s, e + 1).join(''), paragraph: text.slice(ps, pe + 1).join('') };
  }
  return null;
}

/** 詳細版：回傳各類干擾字來源，方便除錯及驗證。 */
export function buildBoardDetailed(
  answers: string[],
  levelId: number,
  size = 20,
  rng: Rng = Math.random,
  opts: BuildBoardOptions = {},
): BoardResult {
  const { question, minTraps = 2, maxTraps = 4, nearbyRatio = 0.5, answerTileMode = 'concat', excludeStemChars = true } = opts;
  // 預填：先取呼叫方傳入的 prefill；再以防呆方式拆出答案開頭殘留的 [ ]（預填字不是字卡）。
  const prefillChars = new Set<string>((opts.prefill ?? []).filter(c => c !== '…'));
  answers = answers.map(a => { const { prefix, body } = stripAnswerPrefix(a); prefix.forEach(c => { if (c !== '…') prefillChars.add(c); }); return body; })
    .map(a => a.replace(ELLIPSIS_CHARS_RE, '')).filter(a => a.replace(/\s/g, '').length > 0);
  const answerTiles = answerTilesOf(answers, answerTileMode);
  const result: BoardResult = { tiles: [], answerTiles, traps: [], nearby: [], random: [], fallback: [], overflow: false, stemRelaxed: false, suppressedTraps: [] };
  let remaining = size - answerTiles.length;
  if (remaining <= 0) {
    result.overflow = answerTiles.length > size;
    result.tiles = shuffleInPlace([...answerTiles], rng);
    return result;
  }

  // 安全規則一：任何可接受答案中出現過的字（含標點）一律不能作干擾字。
  // 由於答案判定是「與可接受答案逐字完全相同」，凡含有干擾字的輸入都不可能構成正確答案。
  const answerChars = new Set<string>();
  answers.forEach(a => toChars(a).forEach(c => answerChars.add(c)));
  // 安全規則二：答案字的異體／版本互用字（VARIANT_GROUPS）亦一律不得出現（陷阱、鄰近、隨機、後備皆然）。
  const banned = new Set<string>(answerChars);
  answerChars.forEach(c => variantsOf(c).forEach(v => banned.add(v)));
  // 預填字及其異體亦不上盤（已顯示在格子上）。
  prefillChars.forEach(c => { banned.add(c); variantsOf(c).forEach(v => banned.add(v)); });
  // 安全規則三：只在特定句子出現的版本異文（PHRASE_ALTERNATES），答案或題幹含該句時排除另一寫法。
  for (const pa of PHRASE_ALTERNATES) {
    if (pa.level !== levelId) continue;
    if (answers.some(a => a.includes(pa.phrase)) || (question ?? '').includes(pa.phrase)) toChars(pa.alt).forEach(c => banned.add(c));
  }
  // 題幹字（可放寬）：題幹已顯示的字不作干擾字。
  const stemChars = new Set<string>(excludeStemChars && question ? toChars(question).filter(isHan) : []);
  const picked = new Set<string>();
  const take = (c: string, bucket: string[], allowStem = false): boolean => {
    if (remaining <= 0 || !isHan(c) || banned.has(c) || picked.has(c)) return false;
    if (!allowStem && stemChars.has(c)) return false;
    // 安全規則四：同一盤面不得同時出現同一異體／互用字組的兩個字（即使兩者都不是答案字）。
    for (const v of variantsOf(c)) if (picked.has(v)) return false;
    picked.add(c); bucket.push(c); remaining--; return true;
  };

  const pool = LEVEL_DISTRACTORS[levelId];

  // 1) 陷阱字（只收明確錯字，不收異體／通假／版本異文）：先取「正字出現在答案中」者，再以本關其他陷阱補足至 minTraps。
  if (pool) {
    // 逐題排除：陷阱字本身若是本題答案字（或預填字、或其異體），該陷阱本題不放。
    // 例：第四關有「齒→恥」「恥→齒」兩個陷阱（「不恥相師」「君子不齒」兩字都在原文）；答案「感到羞恥」時，
    // 「恥→齒」不放（否則盤上的「恥」既是答案字又是陷阱），「齒→恥」照放。陷阱表本身不改。
    result.suppressedTraps = pool.traps.filter(t => banned.has(t.char));
    const usable = pool.traps.filter(t => !banned.has(t.char));
    const targeted = shuffleInPlace(usable.filter(t => answerChars.has(t.target)), rng);
    for (const t of targeted) {
      if (result.traps.length >= maxTraps) break;
      const dummy: string[] = [];
      if (take(t.char, dummy)) result.traps.push(t);
    }
    if (result.traps.length < minTraps) {
      const levelWide = shuffleInPlace(usable.filter(t => !result.traps.includes(t)), rng);
      for (const t of levelWide) {
        if (result.traps.length >= Math.min(minTraps, maxTraps)) break;
        const dummy: string[] = [];
        if (take(t.char, dummy)) result.traps.push(t);
      }
    }
  }

  // 2) 鄰近字：題目所在句子（前後各一句），不足再取同段。
  if (pool && remaining > 0) {
    const quota = Math.round(remaining * nearbyRatio);
    const ctx = locateContext(levelId, answers, question);
    if (ctx && quota > 0) {
      const tiers = [shuffleInPlace(toChars(ctx.window), rng), shuffleInPlace(toChars(ctx.paragraph), rng)];
      for (const tier of tiers) for (const c of tier) { if (result.nearby.length >= quota) break; take(c, result.nearby); }
    }
  }

  // 3) 本關原文隨機字（按出現頻率抽樣，再以逐字掃描保證填滿）。
  const fillFrom = (levelKey: number, bucket: string[], allowStem = false) => {
    const p = LEVEL_DISTRACTORS[levelKey];
    if (!p || remaining <= 0) return;
    const { han } = hanIndex(levelKey, p.corpus);
    for (let tries = 0; tries < han.length * 2 && remaining > 0; tries++) take(han[Math.floor(rng() * han.length)], bucket, allowStem);
    if (remaining > 0) for (const c of shuffleInPlace(Array.from(new Set(han)), rng)) { if (remaining <= 0) break; take(c, bucket, allowStem); }
  };
  if (pool) fillFrom(levelId, result.random);

  // 4) 後備：其他關卡原文。
  if (remaining > 0) {
    const others = shuffleInPlace(Object.keys(LEVEL_DISTRACTORS).map(Number).filter(k => k !== levelId), rng);
    for (const k of others) { if (remaining <= 0) break; fillFrom(k, result.fallback); }
  }

  // 5) 仍未填滿（理論上極少見）：放寬「題幹字」一條，再以本關原文補足。
  if (remaining > 0 && stemChars.size > 0) {
    result.stemRelaxed = true;
    if (pool) fillFrom(levelId, result.random, true);
    if (remaining > 0) for (const k of Object.keys(LEVEL_DISTRACTORS).map(Number)) { if (remaining <= 0) break; fillFrom(k, result.fallback, true); }
  }

  result.tiles = shuffleInPlace([...answerTiles, ...result.traps.map(t => t.char), ...result.nearby, ...result.random, ...result.fallback], rng);
  return result;
}

/** 產生已洗牌的答題格（預設 20 格）。 */
export function buildBoard(answers: string[], levelId: number, size = 20, rng: Rng = Math.random, opts: BuildBoardOptions = {}): string[] {
  return buildBoardDetailed(answers, levelId, size, rng, opts).tiles;
}

/** 題庫 sheet ID（QUESTION_BANK.md 第一欄）→ 關卡 ID。 */
export function levelIdForSheet(sheetId: number): number | undefined {
  return SHEET_TO_LEVEL[sheetId];
}
