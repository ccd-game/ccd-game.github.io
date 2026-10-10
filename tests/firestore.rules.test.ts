/**
 * Firestore 安全規則測試（需於 Firestore 模擬器中執行）：
 *   npm run test:rules
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 模擬器偶爾較慢（例如剛啟動），放寬逾時以免誤報
vi.setConfig({ hookTimeout: 30000, testTimeout: 30000 });
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { MAX_EXP_PER_CLEAR, MAX_LEVEL_SCORE, MIN_CLEAR_TIME_SEC, SCORED_LEVEL_IDS, expScore, levelScoreForTime } from '../src/lib/scoring';
import { LevelBests, applyClear, migrateGameFields } from '../src/lib/playerData';

/** 一小時前（經驗增加須距上次寫入至少 MIN_CLEAR_TIME_SEC 秒） */
const anHourAgo = () => Timestamp.fromMillis(Date.now() - 3600_000);

let env: RulesTestEnvironment;

const google = (email: string, emailVerified = true) => ({
  email,
  email_verified: emailVerified,
  firebase: { sign_in_provider: 'google.com' as const },
});

const ALICE = 'alice';
const BOB = 'bob';

const SCHOOL = '救世軍卜維廉中學';
const label = (surname: string) => `${SCHOOL} ${surname}同學`;

const newProfile = (over: Record<string, unknown> = {}) => ({
  displayLabel: label('林'),
  schoolDomain: 'wbss.edu.hk',
  surname: '林',
  surnameSource: 'auto',
  level: 1,
  jiyuan: 1,
  exp: 0,
  stamina: 100,
  score: 0,
  levels: {},
  updatedAt: serverTimestamp(),
  ...over,
});

const alice = () => env.authenticatedContext(ALICE, google('alice@wbss.edu.hk')).firestore();
// 與排名分頁完全相同的查詢（src/lib/firebase.ts subscribeToRanking）
const rankQuery = (db: ReturnType<typeof alice>) => query(collection(db, 'users'), orderBy('score', 'desc'), limit(50));

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-wenyan-dungeon',
    firestore: { rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'), host, port: Number(port) },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const seed = (level: number, levels: Record<string, { bestTimeMs: number; bestScore: number }> = {}) => ({
      displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto',
      level, jiyuan: 50, exp: 0, stamina: 100,
      score: Object.values(levels).reduce((a, e) => a + e.bestScore, 0), levels, updatedAt: anHourAgo(),
    });
    await setDoc(doc(db, 'users', ALICE), seed(3));
    // Bob 已通過第 2 關（滿分）
    await setDoc(doc(db, 'users', BOB), seed(5, { '2': { bestTimeMs: 60000, bestScore: 1000 } }));
  });
});

describe('允許：已驗證 @wbss.edu.hk Google 帳戶', () => {
  it('可讀取自己的檔案', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'users', ALICE)));
  });
  it('可建立自己的新檔案（初始值）', async () => {
    const db = env.authenticatedContext('carol', google('carol@wbss.edu.hk')).firestore();
    await assertSucceeds(setDoc(doc(db, 'users', 'carol'), newProfile()));
  });
  it('可更新自己的機緣（jiyuan，merge 寫入，與尋訪相同）', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE), { jiyuan: 40, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('可升一級（經驗增加時總分按 floor(exp × 0.3) 同步）', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'users', ALICE), { level: 4, exp: 10, score: 3, updatedAt: serverTimestamp() }));
  });
  it('排名分頁的 list 查詢成功（orderBy score desc, limit 50）', async () => {
    await assertSucceeds(getDocs(rankQuery(alice())));
  });
  it('可讀取別人的檔案（排行榜顯示用）', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'users', BOB)));
  });
  it('電郵大寫亦接受（與客戶端 isAllowedEmail 一致）', async () => {
    const db = env.authenticatedContext(ALICE, google('Alice@WBSS.EDU.HK')).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', ALICE)));
  });
});

describe('拒絕：其他網域（@gmail.com）', () => {
  const gmail = () => env.authenticatedContext(ALICE, google('alice@gmail.com')).firestore();
  it('讀取自己的檔案被拒', async () => {
    await assertFails(getDoc(doc(gmail(), 'users', ALICE)));
  });
  it('寫入被拒', async () => {
    await assertFails(setDoc(doc(gmail(), 'users', ALICE), { jiyuan: 1, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('排名查詢被拒', async () => {
    await assertFails(getDocs(rankQuery(gmail())));
  });
  it('仿冒網域 wbss.edu.hk.evil.com / 子網域被拒', async () => {
    for (const email of ['a@wbss.edu.hk.evil.com', 'a@sub.wbss.edu.hk', 'a@evilwbss.edu.hk']) {
      const db = env.authenticatedContext(ALICE, google(email)).firestore();
      await assertFails(getDoc(doc(db, 'users', ALICE)));
    }
  });
});

describe('拒絕：未驗證的 @wbss.edu.hk 電郵', () => {
  const unverified = () => env.authenticatedContext(ALICE, google('alice@wbss.edu.hk', false)).firestore();
  it('讀取被拒', async () => {
    await assertFails(getDoc(doc(unverified(), 'users', ALICE)));
  });
  it('寫入被拒', async () => {
    await assertFails(setDoc(doc(unverified(), 'users', ALICE), { jiyuan: 1, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('排名查詢被拒', async () => {
    await assertFails(getDocs(rankQuery(unverified())));
  });
});

describe('拒絕：非 Google 登入（電郵／密碼、匿名）', () => {
  it('電郵／密碼帳戶即使是已驗證的 @wbss.edu.hk 亦被拒', async () => {
    const db = env
      .authenticatedContext(ALICE, { email: 'alice@wbss.edu.hk', email_verified: true, firebase: { sign_in_provider: 'password' as const } })
      .firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE)));
  });
  it('匿名帳戶被拒', async () => {
    const db = env.authenticatedContext(ALICE, { firebase: { sign_in_provider: 'anonymous' as const } }).firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE)));
    await assertFails(getDocs(rankQuery(db)));
  });
});

describe('拒絕：未登入', () => {
  const anon = () => env.unauthenticatedContext().firestore();
  it('讀取被拒', async () => {
    await assertFails(getDoc(doc(anon(), 'users', ALICE)));
  });
  it('排名查詢被拒', async () => {
    await assertFails(getDocs(rankQuery(anon())));
  });
  it('寫入被拒（包括舊有的共用 userid 文件）', async () => {
    await assertFails(setDoc(doc(anon(), 'users', 'userid'), newProfile()));
  });
});

describe('拒絕：修改他人資料及不合理數值', () => {
  it('不可寫入別人的機緣', async () => {
    await assertFails(setDoc(doc(alice(), 'users', BOB), { jiyuan: 999999, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('不可替別人建立檔案', async () => {
    await assertFails(setDoc(doc(alice(), 'users', 'mallory'), newProfile()));
  });
  it('不可刪除別人的檔案', async () => {
    await assertFails(deleteDoc(doc(alice(), 'users', BOB)));
  });
  it('亦不可刪除自己的檔案', async () => {
    await assertFails(deleteDoc(doc(alice(), 'users', ALICE)));
  });
  it('建立時不可直接設定高等級／大量機緣／分數', async () => {
    const db = env.authenticatedContext('carol', google('carol@wbss.edu.hk')).firestore();
    await assertFails(setDoc(doc(db, 'users', 'carol'), newProfile({ level: 99 })));
    await assertFails(setDoc(doc(db, 'users', 'carol'), newProfile({ jiyuan: 1000000 })));
    await assertFails(setDoc(doc(db, 'users', 'carol'), newProfile({ score: 1000, levels: { '1': { bestTimeMs: 100000, bestScore: 1000 } } })));
  });
  it('不可一次跳多級或降級', async () => {
    await assertFails(updateDoc(doc(alice(), 'users', ALICE), { level: 9, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice(), 'users', ALICE), { level: 2, updatedAt: serverTimestamp() }));
  });
  it('機緣不可為負數或非整數', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { jiyuan: -5, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { jiyuan: 1.5, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { jiyuan: '100', updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('不可加入額外欄位（例如 isAdmin）', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { isAdmin: true, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('updatedAt 必須為伺服器時間', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { jiyuan: 10, updatedAt: Timestamp.fromDate(new Date('2030-01-01')) }, { merge: true }));
  });
  it('沒有 limit 或 limit 過大的整個集合查詢被拒', async () => {
    await assertFails(getDocs(collection(alice(), 'users')));
    await assertFails(getDocs(query(collection(alice(), 'users'), orderBy('score', 'desc'), limit(500))));
  });
  it('其他集合一律拒絕', async () => {
    await assertFails(getDoc(doc(alice(), 'leaderboard', ALICE)));
    await assertFails(setDoc(doc(alice(), 'coins', ALICE), { gold: 1 }));
  });
});

describe('排行榜名稱：不可儲存全名，displayLabel 格式', () => {
  const carol = () => env.authenticatedContext('carol', google('carol@wbss.edu.hk')).firestore();

  it.each(['name', 'displayName', 'fullName', 'email', 'photoURL'])('建立檔案時加入 %s 欄位被拒', async (field) => {
    await assertFails(setDoc(doc(carol(), 'users', 'carol'), newProfile({ [field]: '陳大文' })));
  });
  it('更新時加入全名欄位被拒（merge）', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { name: '陳大文', updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { displayName: 'Chan Tai Man', updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('有效名稱可寫入：單姓、複姓、英文姓氏、無姓氏後備', async () => {
    await assertSucceeds(setDoc(doc(carol(), 'users', 'carol'), newProfile({ surname: '歐陽', displayLabel: label('歐陽') })));
    for (const [surname, surnameSource] of [['黃', 'chosen'], ['歐陽', 'manual'], ['林', 'han'], ['', 'none'], ['', 'pending']]) {
      await assertSucceeds(
        setDoc(doc(alice(), 'users', ALICE), { surname, surnameSource, displayLabel: label(surname), updatedAt: serverTimestamp() }, { merge: true }),
      );
    }
  });
  it.each([
    ['全名', '陳大文', `${SCHOOL} 陳大文同學`],
    ['與 surname 不一致', '林', `${SCHOOL} 陳同學`],
    ['錯誤學校名稱', '林', '某某中學 林同學'],
    ['沒有「同學」', '林', `${SCHOOL} 林`],
    ['英文全名', 'Chan Tai Man', `${SCHOOL} Chan Tai Man同學`],
    ['英文姓氏（v2 格式，已不接受）', 'Chan', `${SCHOOL} Chan同學`],
    ['英文複姓拼寫', 'Auyeung', `${SCHOOL} Auyeung同學`],
    ['小寫拼音', 'chan', `${SCHOOL} chan同學`],
    ['三個中文字', '陳大文', `${SCHOOL} 陳大文同學`],
    ['中英混合', '陳Chan', `${SCHOOL} 陳Chan同學`],
    ['HTML 注入', '<b>', `${SCHOOL} <b>同學`],
    ['過長', 'Abcdefghijklmnopq', `${SCHOOL} Abcdefghijklmnopq同學`],
  ])('不合格名稱被拒：%s', async (_why, surname, displayLabel) => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { surname, displayLabel, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('schoolDomain 必須與登入電郵一致', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { schoolDomain: 'other.edu.hk', updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('displayLabel 不可為非字串', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { displayLabel: 123, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('遷移：含 name/displayName 的舊文件，本人以完整覆寫移除後，排名查詢不再含任何姓名欄位', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), {
        name: '陳大文', displayName: 'Chan Tai Man', level: 3, gold: 50, exp: 0, stamina: 100, updatedAt: Timestamp.now(),
      });
    });
    // 舊文件保留 name 時，任何部分更新（例如扣除機緣）都被拒，必須先遷移
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { jiyuan: 40, updatedAt: serverTimestamp() }, { merge: true }));
    // 客戶端 syncUserProfile 的完整覆寫（非 merge）
    await assertSucceeds(
      setDoc(doc(alice(), 'users', ALICE), {
        displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto',
        level: 3, jiyuan: 50, exp: 0, stamina: 100, score: 0, levels: {}, updatedAt: serverTimestamp(),
      }),
    );
    const snap = await assertSucceeds(getDocs(rankQuery(alice())));
    expect(snap.size).toBe(2);
    for (const d of snap.docs) {
      const keys = Object.keys(d.data());
      for (const banned of ['name', 'displayName', 'fullName', 'email', 'photoURL']) expect(keys).not.toContain(banned);
      expect(d.data().displayLabel).toMatch(/^救世軍卜維廉中學 .*同學$/);
    }
  });
  it('其他用戶不可改寫別人的名稱', async () => {
    await assertFails(setDoc(doc(carol(), 'users', BOB), { surname: '豬', displayLabel: label('豬'), updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('不可讀寫 private 內其他文件', async () => {
    await assertFails(getDoc(doc(alice(), 'users', ALICE, 'private', 'profile')));
    await assertFails(setDoc(doc(alice(), 'users', ALICE, 'private', 'profile'), { fullName: '陳大文' }));
  });
});

describe('中文姓氏選擇（surnameSource 及 private/surname）', () => {
  const bobDb = () => env.authenticatedContext(BOB, google('bob@wbss.edu.hk')).firestore();
  const choose = (surname: string, surnameSource: string) =>
    setDoc(doc(alice(), 'users', ALICE), { surname, surnameSource, displayLabel: label(surname), updatedAt: serverTimestamp() }, { merge: true });

  it('有效的選擇更新：pending → chosen（黃）', async () => {
    await assertSucceeds(choose('', 'pending'));
    await assertSucceeds(choose('黃', 'chosen'));
  });
  it('choose 用戶按「其他（自行輸入）」：pending → manual（陳），私人選項 韋／衛／惠 不變', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'private', 'surname'), { options: ['韋', '衛', '惠'], manual: false, updatedAt: serverTimestamp() }));
    await assertSucceeds(choose('', 'pending'));
    await assertSucceeds(choose('陳', 'manual'));
    await assertFails(choose('Chan', 'manual'));
    await assertFails(choose('', 'manual'));
    const snap = await getDoc(doc(alice(), 'users', ALICE, 'private', 'surname'));
    expect(snap.data()?.options).toEqual(['韋', '衛', '惠']);
  });
  it('由 chosen 改為 manual（設定 → 更改姓氏 → 其他）', async () => {
    await assertSucceeds(choose('韋', 'chosen'));
    await assertSucceeds(choose('陳', 'manual'));
  });
  it('手動輸入：一至兩個中文字', async () => {
    await assertSucceeds(choose('區', 'manual'));
    await assertSucceeds(choose('司徒', 'manual'));
  });
  it.each(['Chan', 'Wong', 'chan', 'Au Yeung', '陳大文', '陳 ', 'A', '1'])('surname %j 被拒', async (surname) => {
    await assertFails(choose(surname, 'manual'));
  });
  it('pending／none 必須沒有姓氏；han／auto／chosen／manual 必須有姓氏', async () => {
    await assertFails(choose('黃', 'pending'));
    await assertFails(choose('黃', 'none'));
    await assertFails(choose('', 'chosen'));
    await assertFails(choose('', 'auto'));
  });
  it('surnameSource 須為合法值，且為必填欄位', async () => {
    await assertFails(choose('黃', 'teacher'));
    const carol = env.authenticatedContext('carol', google('carol@wbss.edu.hk')).firestore();
    const p = newProfile();
    delete (p as Record<string, unknown>).surnameSource;
    await assertFails(setDoc(doc(carol, 'users', 'carol'), p));
  });
  it('v2 英文姓氏文件：本人以完整覆寫遷移為中文姓氏', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), {
        displayLabel: label('Chan'), schoolDomain: 'wbss.edu.hk', surname: 'Chan',
        level: 3, gold: 50, exp: 0, stamina: 100, updatedAt: Timestamp.now(),
      });
    });
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { jiyuan: 40, updatedAt: serverTimestamp() }, { merge: true }));
    await assertSucceeds(
      setDoc(doc(alice(), 'users', ALICE), {
        displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto',
        level: 3, jiyuan: 50, exp: 0, stamina: 100, score: 0, levels: {}, updatedAt: serverTimestamp(),
      }),
    );
  });
  it('private/surname：本人可讀寫（只存中文選項）', async () => {
    const ref = doc(alice(), 'users', ALICE, 'private', 'surname');
    await assertSucceeds(setDoc(ref, { options: ['黃', '王', '汪'], manual: false, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(ref));
  });
  it('private/surname：他人不可讀寫、未驗證帳戶不可讀', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'surname'), { options: ['黃'], manual: true, updatedAt: Timestamp.now() });
    });
    await assertFails(getDoc(doc(bobDb(), 'users', ALICE, 'private', 'surname')));
    await assertFails(setDoc(doc(bobDb(), 'users', ALICE, 'private', 'surname'), { options: [], manual: true, updatedAt: serverTimestamp() }));
    const unverified = env.authenticatedContext(ALICE, google('alice@wbss.edu.hk', false)).firestore();
    await assertFails(getDoc(doc(unverified, 'users', ALICE, 'private', 'surname')));
    await assertFails(getDocs(collection(bobDb(), 'users', ALICE, 'private')));
  });
  it('private/surname：不可加入其他欄位（例如英文姓名）或刪除', async () => {
    const ref = doc(alice(), 'users', ALICE, 'private', 'surname');
    await assertFails(setDoc(ref, { options: [], manual: true, romanised: 'Chan', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { options: 'x', manual: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(ref, { options: [], manual: true, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(ref));
  });
});


describe('private/settings（主題／BGM 雲端同步）', () => {
  const bobDb = () => env.authenticatedContext(BOB, google('bob@wbss.edu.hk')).firestore();
  const good = () => ({
    theme: 'dark',
    bgmEnabled: false,
    bgmVolume: 0.25,
    rememberMe: true,
    updatedAt: '2026-10-10T12:00:00.000Z',
    serverUpdatedAt: serverTimestamp(),
  });

  it('本人可讀寫合法設定', async () => {
    const ref = doc(alice(), 'users', ALICE, 'private', 'settings');
    await assertSucceeds(setDoc(ref, good()));
    await assertSucceeds(getDoc(ref));
  });

  it('他人／未驗證不可讀寫；不可刪除；不可加入全名欄位', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'settings'), {
        theme: 'light', bgmEnabled: true, bgmVolume: 0.08, rememberMe: true,
        updatedAt: '2026-01-01T00:00:00.000Z', serverUpdatedAt: Timestamp.now(),
      });
    });
    await assertFails(getDoc(doc(bobDb(), 'users', ALICE, 'private', 'settings')));
    await assertFails(setDoc(doc(bobDb(), 'users', ALICE, 'private', 'settings'), good()));
    const unverified = env.authenticatedContext(ALICE, google('alice@wbss.edu.hk', false)).firestore();
    await assertFails(getDoc(doc(unverified, 'users', ALICE, 'private', 'settings')));
    const ref = doc(alice(), 'users', ALICE, 'private', 'settings');
    await assertFails(setDoc(ref, { ...good(), email: 'alice@wbss.edu.hk' }));
    await assertFails(setDoc(ref, { ...good(), bgmVolume: 1.5 }));
    await assertFails(setDoc(ref, { ...good(), theme: 'neon' }));
    await assertSucceeds(setDoc(ref, good()));
    await assertFails(deleteDoc(ref));
  });
});

describe('計分改版：機緣 jiyuan 取代 gold（遷移）', () => {
  const oldGoldDoc = { displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto', level: 3, gold: 77, exp: 5, stamina: 90 };
  // 與 syncUserProfile 相同：以 migrateGameFields 推算遊戲欄位，完整覆寫
  const migrated = () => ({
    displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto',
    ...migrateGameFields(oldGoldDoc).progress, updatedAt: serverTimestamp(),
  });
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), { ...oldGoldDoc, updatedAt: Timestamp.now() });
    });
  });

  it('舊 gold 文件：部分更新被拒（必須先遷移）', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { jiyuan: 77, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: 70, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('舊 gold 文件：完整覆寫為 jiyuan = gold、levels {}、score = floor(exp × 0.3) 成功；之後 gold 已不存在', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE), migrated()));
    const snap = await getDoc(doc(alice(), 'users', ALICE));
    expect(snap.data()).not.toHaveProperty('gold');
    expect(snap.data()?.jiyuan).toBe(77);
    expect(snap.data()?.score).toBe(1); // 舊 exp 5 → floor(1.5) = 1；實際舊文件 exp 皆為 0 → 0
    expect(snap.data()?.levels).toEqual({});
  });
  it('遷移時保留 gold 欄位被拒', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { ...migrated(), gold: 77 }));
  });
  it('遷移時不可順便寫入分數（score 須等於各關之和）', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { ...migrated(), score: 500 }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { ...migrated(), score: 0 }));
  });
  it('已遷移文件不可再寫入 gold', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE), migrated()));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: 10, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(updateDoc(doc(alice(), 'users', ALICE), { gold: 10, updatedAt: serverTimestamp() }));
  });
  it('新建檔案不可含 gold', async () => {
    const db = env.authenticatedContext('carol', google('carol@wbss.edu.hk')).firestore();
    await assertFails(setDoc(doc(db, 'users', 'carol'), { ...newProfile(), gold: 1 }));
  });
});

describe('計分：各關最佳紀錄 levels、經驗 exp 與總分 score', () => {
  const ref = () => doc(alice(), 'users', ALICE);
  const bobRef = () => doc(env.authenticatedContext(BOB, google('bob@wbss.edu.hk')).firestore(), 'users', BOB);
  type Bests = Record<string, { bestTimeMs: number; bestScore: number }>;
  const entry = (timeMs: number) => ({ bestTimeMs: timeMs, bestScore: levelScoreForTime(1, timeMs)! });
  /** 把文件的 updatedAt 撥回一小時前（模擬兩次通關之間至少隔了一場戰鬥） */
  const age = async (uid: string) => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'users', uid), { updatedAt: anHourAgo() });
    });
  };
  /** 與 src/lib/firebase.ts recordLevelClear 完全相同的寫法：讀取 → applyClear → transaction 欄位 */
  const clear = async (r: ReturnType<typeof ref>, levelId: number, timeMs: number, correctAnswers = 20) => {
    const d = (await getDoc(r)).data()!;
    const outcome = applyClear({ level: d.level, exp: d.exp, levels: d.levels as LevelBests }, { levelId, timeMs, correctAnswers });
    if (!outcome.recorded) throw new Error('invalid time');
    const { level, exp, score } = outcome.progress;
    return updateDoc(r, {
      ...(outcome.improved ? { [`levels.${outcome.levelId}`]: outcome.entry } : {}),
      level, exp, score, updatedAt: serverTimestamp(),
    });
  };
  /** 直接寫入指定欄位（用於測試不合法的寫入） */
  const raw = (r: ReturnType<typeof ref>, fields: Record<string, unknown>) => updateDoc(r, { ...fields, updatedAt: serverTimestamp() });

  it('合法的新紀錄可寫入：90 秒 → 816 分；經驗 +5×20+50 = 150；總分 816 + 45', async () => {
    expect(entry(90000).bestScore).toBe(816);
    await assertSucceeds(clear(ref(), 1, 90000));
    const d = (await getDoc(ref())).data()!;
    expect(d.levels['1']).toEqual({ bestTimeMs: 90000, bestScore: 816 });
    expect(d.exp).toBe(150);
    expect(d.score).toBe(816 + 45);
  });
  it('90 秒的四捨五入：816 接受，817／815 被拒', async () => {
    await assertFails(raw(ref(), { 'levels.1': { bestTimeMs: 90000, bestScore: 817 }, score: 817 }));
    await assertFails(raw(ref(), { 'levels.1': { bestTimeMs: 90000, bestScore: 815 }, score: 815 }));
    await assertSucceeds(raw(ref(), { 'levels.1': { bestTimeMs: 90000, bestScore: 816 }, score: 816 }));
  });
  it('客戶端與規則的算式一致：600 → 300 → 240 → 120 → 90 → 60 秒逐步改善都被接受', async () => {
    const expected: [number, number][] = [[3600000, 129], [600000, 316], [300000, 447], [240000, 500], [120000, 707], [90000, 816], [60000, 1000]];
    for (const [ms, pts] of expected) {
      expect(levelScoreForTime(1, ms)).toBe(pts);
      await age(ALICE);
      await assertSucceeds(clear(ref(), 1, ms));
    }
    const d = (await getDoc(ref())).data()!;
    expect(d.levels['1'].bestScore).toBe(1000);
    expect(d.exp).toBe(150 * expected.length);
    expect(d.score).toBe(1000 + expScore(150 * expected.length));
  });
  it('分數與時間不符被拒（以慢時間聲稱滿分）', async () => {
    await assertFails(raw(ref(), { 'levels.1': { bestTimeMs: 300000, bestScore: 1000 }, score: 1000 }));
  });
  it('單關分數超過上限被拒', async () => {
    await assertFails(raw(ref(), { 'levels.1': { bestTimeMs: 60000, bestScore: MAX_LEVEL_SCORE + 1 }, score: MAX_LEVEL_SCORE + 1 }));
  });
  it('時間低於防作弊下限被拒；等於下限可寫入', async () => {
    const floor = MIN_CLEAR_TIME_SEC * 1000;
    await assertFails(raw(ref(), { 'levels.1': { bestTimeMs: floor - 1, bestScore: 1000 }, score: 1000 }));
    await assertFails(raw(ref(), { 'levels.1': { bestTimeMs: 1, bestScore: 1000 }, score: 1000 }));
    await assertSucceeds(raw(ref(), { 'levels.1': { bestTimeMs: floor, bestScore: 1000 }, score: 1000 }));
  });
  it('最佳分數下降被拒（以較慢的時間覆寫）', async () => {
    await assertFails(raw(bobRef(), { 'levels.2': entry(300000), score: entry(300000).bestScore }));
  });
  it('同分（例如更快但已滿分）不可覆寫紀錄', async () => {
    await assertFails(raw(bobRef(), { 'levels.2': { bestTimeMs: 50000, bestScore: 1000 }, score: 1000 }));
  });
  it('沒有刷新紀錄的勝利：只增加經驗及總分，紀錄保持不變', async () => {
    await assertSucceeds(clear(bobRef(), 2, 50000, 28));
    const d = (await getDoc(bobRef())).data()!;
    expect(d.levels['2']).toEqual({ bestTimeMs: 60000, bestScore: 1000 });
    expect(d.exp).toBe(5 * 28 + 50);
    expect(d.score).toBe(1000 + expScore(190));
  });
  it('總分不可下降（刪除關卡紀錄或直接改低）', async () => {
    await assertFails(raw(bobRef(), { score: 900 }));
    await assertFails(raw(bobRef(), { levels: {}, score: 0 }));
  });
  it('總分必須等於差額（不可多報；不可只改總分）', async () => {
    const e = entry(90000);
    await assertFails(raw(ref(), { 'levels.1': e, score: e.bestScore + 1 }));
    await assertFails(raw(ref(), { score: 100 }));
    await assertFails(raw(ref(), { exp: 100, score: 31 }));
  });
  it('經驗：不可下降；單次不可超過上限；距上次寫入不足防作弊下限時不可增加', async () => {
    await assertSucceeds(raw(ref(), { exp: 100, score: 30 }));
    // 剛寫入：再加經驗被拒（連續刷經驗）
    await assertFails(raw(ref(), { exp: 200, score: 60 }));
    await age(ALICE);
    await assertFails(raw(ref(), { exp: 50, score: 15 }));
    await assertFails(raw(ref(), { exp: 100 + MAX_EXP_PER_CLEAR + 1, score: expScore(100 + MAX_EXP_PER_CLEAR + 1) }));
    await assertSucceeds(raw(ref(), { exp: 100 + MAX_EXP_PER_CLEAR, score: expScore(100 + MAX_EXP_PER_CLEAR) }));
  });
  it('不合法的關卡紀錄被拒：未知關卡、多餘欄位、非整數時間、缺欄位', async () => {
    await assertFails(raw(ref(), { 'levels.99': { bestTimeMs: 60000, bestScore: 1000 }, score: 1000 }));
    await assertFails(raw(ref(), { 'levels.1': { ...entry(90000), cheat: true }, score: 816 }));
    await assertFails(raw(ref(), { 'levels.1': { bestTimeMs: 90000.5, bestScore: 816 }, score: 816 }));
    await assertFails(raw(ref(), { 'levels.1': { bestScore: 816 }, score: 816 }));
  });
  it('不可替別人寫入通關紀錄', async () => {
    await assertFails(updateDoc(doc(alice(), 'users', BOB), { 'levels.1': entry(90000), score: 1816, updatedAt: serverTimestamp() }));
  });
  it('寫入其他欄位（例如機緣）時，原有各關紀錄不受影響、仍然通過', async () => {
    await assertSucceeds(setDoc(bobRef(), { jiyuan: 10, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('每次寫入最多新增或改善一關：一次寫入多關被拒', async () => {
    const all: Bests = {};
    for (const id of SCORED_LEVEL_IDS) all[id] = entry(400000);
    const total = Object.values(all).reduce((a, e) => a + e.bestScore, 0);
    await assertFails(raw(ref(), { levels: all, score: total }));
    await assertFails(raw(ref(), { levels: { '1': all['1'], '3': all['3'] }, score: all['1'].bestScore * 2 }));
  });
  it('運算量：12 關全滿的文件，完整覆寫（不變）及勝利（改善一關＋經驗）都在規則運算上限內', async () => {
    const full: Bests = {};
    for (const id of SCORED_LEVEL_IDS) full[id] = entry(400000);
    const sum = Object.values(full).reduce((a, e) => a + e.bestScore, 0);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'users', ALICE), { levels: full, score: sum, updatedAt: anHourAgo() });
    });
    const snap = await getDoc(ref());
    await assertSucceeds(setDoc(ref(), { ...snap.data(), jiyuan: 1, updatedAt: serverTimestamp() }));
    await age(ALICE);
    await assertSucceeds(clear(ref(), 12, 100000, 60));
  });
  it('排名查詢依 score 由高至低排序', async () => {
    await assertSucceeds(clear(ref(), 1, 90000));
    const snap = await assertSucceeds(getDocs(rankQuery(alice())));
    expect(snap.docs.map((d) => d.id)).toEqual([BOB, ALICE]);
    expect(snap.docs.map((d) => d.data().score)).toEqual([1000, 861]);
  });
});

describe('排名錯誤重現：舊規則', () => {
  it('舊規則下，同一個排名查詢會因缺少 list 權限而被拒（Missing or insufficient permissions）', async () => {
    const oldRules = readFileSync(resolve(__dirname, 'fixtures/firestore.rules.old'), 'utf8');
    const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
    const oldEnv = await initializeTestEnvironment({
      projectId: 'demo-wenyan-dungeon-old',
      firestore: { rules: oldRules, host, port: Number(port) },
    });
    try {
      const db = oldEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(db, 'users', 'userid'))); // get 有開放
      await assertFails(getDocs(query(collection(db, 'users'), orderBy('level', 'desc'), limit(50)))); // list 沒有
    } finally {
      await oldEnv.cleanup();
    }
  });
});
