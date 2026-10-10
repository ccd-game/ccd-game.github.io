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
  gold: 1,
  exp: 0,
  stamina: 100,
  updatedAt: serverTimestamp(),
  ...over,
});

const alice = () => env.authenticatedContext(ALICE, google('alice@wbss.edu.hk')).firestore();
// 與排名分頁完全相同的查詢（src/lib/firebase.ts subscribeToRanking）
const rankQuery = (db: ReturnType<typeof alice>) => query(collection(db, 'users'), orderBy('level', 'desc'), limit(50));

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
    const seed = (level: number) => ({
      displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto',
      level, gold: 50, exp: 0, stamina: 100, updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'users', ALICE), seed(3));
    await setDoc(doc(db, 'users', BOB), seed(5));
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
  it('可更新自己的文氣（gold，merge 寫入，與抽卡相同）', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE), { gold: 40, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('可升一級', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'users', ALICE), { level: 4, exp: 10, updatedAt: serverTimestamp() }));
  });
  it('排名分頁的 list 查詢成功（orderBy level desc, limit 50）', async () => {
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
    await assertFails(setDoc(doc(gmail(), 'users', ALICE), { gold: 1, updatedAt: serverTimestamp() }, { merge: true }));
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
    await assertFails(setDoc(doc(unverified(), 'users', ALICE), { gold: 1, updatedAt: serverTimestamp() }, { merge: true }));
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
  it('不可寫入別人的文氣', async () => {
    await assertFails(setDoc(doc(alice(), 'users', BOB), { gold: 999999, updatedAt: serverTimestamp() }, { merge: true }));
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
  it('建立時不可直接設定高等級／大量文氣', async () => {
    const db = env.authenticatedContext('carol', google('carol@wbss.edu.hk')).firestore();
    await assertFails(setDoc(doc(db, 'users', 'carol'), newProfile({ level: 99 })));
    await assertFails(setDoc(doc(db, 'users', 'carol'), newProfile({ gold: 1000000 })));
  });
  it('不可一次跳多級或降級', async () => {
    await assertFails(updateDoc(doc(alice(), 'users', ALICE), { level: 9, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice(), 'users', ALICE), { level: 2, updatedAt: serverTimestamp() }));
  });
  it('文氣不可為負數或非整數', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: -5, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: 1.5, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: '100', updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('不可加入額外欄位（例如 isAdmin）', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { isAdmin: true, updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('updatedAt 必須為伺服器時間', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: 10, updatedAt: Timestamp.fromDate(new Date('2030-01-01')) }, { merge: true }));
  });
  it('沒有 limit 或 limit 過大的整個集合查詢被拒', async () => {
    await assertFails(getDocs(collection(alice(), 'users')));
    await assertFails(getDocs(query(collection(alice(), 'users'), orderBy('level', 'desc'), limit(500))));
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
    // 舊文件保留 name 時，任何部分更新（例如扣文氣）都被拒，必須先遷移
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: 40, updatedAt: serverTimestamp() }, { merge: true }));
    // 客戶端 syncUserProfile 的完整覆寫（非 merge）
    await assertSucceeds(
      setDoc(doc(alice(), 'users', ALICE), {
        displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto',
        level: 3, gold: 50, exp: 0, stamina: 100, updatedAt: serverTimestamp(),
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
    await assertFails(setDoc(doc(alice(), 'users', ALICE), { gold: 40, updatedAt: serverTimestamp() }, { merge: true }));
    await assertSucceeds(
      setDoc(doc(alice(), 'users', ALICE), {
        displayLabel: label('陳'), schoolDomain: 'wbss.edu.hk', surname: '陳', surnameSource: 'auto',
        level: 3, gold: 50, exp: 0, stamina: 100, updatedAt: serverTimestamp(),
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
