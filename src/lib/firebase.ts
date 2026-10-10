import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  connectAuthEmulator,
  getAdditionalUserInfo,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { GOOGLE_HOSTED_DOMAIN_HINT, REJECTION_MESSAGE, isAllowedUser, emailDomainOf, schoolNameForEmail } from '../config/auth';
import {
  NameProfile,
  resolveSurname,
  labelFor,
  sanitizeSurname,
  safeDisplayLabel,
  shortLabelFor,
  validateManualSurname,
} from './displayLabel';
import { CJK_SURNAME_RE } from '../config/surnames';
import { SurnameSource, isSurnameSource, isSurnameValue, planSurnameSync, privateSurnameFor } from './surnameSync';
import {
  SettingsPrefs,
  normalizePrefs,
  loadSettings,
  setSettingsCloudSync,
  syncSettingsAfterAuth,
  resetSettingsCloudPullState,
} from './settingsStore';
import {
  clearGuestSessionStorage,
  isGuestSessionStored,
  persistGuestSession,
  resetGuestUserData,
  setGuestGold,
  subscribeGuestUserData,
} from './guestSession';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

/**
 * Apply Firebase Auth persistence from rememberMe.
 * true  → browserLocalPersistence（關閉瀏覽器後仍保持登入）
 * false → browserSessionPersistence（瀏覽器工作階段結束後清除；Firebase 沒有「單一分頁關閉即清除」的官方 API）
 * 必須在 signIn 之前呼叫；啟動時亦會依 localStorage 的 rememberMe 套用一次。
 */
export async function applyAuthPersistence(rememberMe: boolean): Promise<void> {
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  );
}

// 依本機設定套用 persistence（失敗不阻斷啟動）
applyAuthPersistence(loadSettings().rememberMe).catch((e) => {
  console.warn('applyAuthPersistence on boot failed', e);
});

setSettingsCloudSync({
  async pull(uid: string): Promise<SettingsPrefs | null> {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'settings'));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    // updatedAt may be Timestamp — convert to ISO for merge
    let updatedAt = data.updatedAt;
    if (updatedAt && typeof updatedAt === 'object' && 'toDate' in (updatedAt as object)) {
      try {
        updatedAt = (updatedAt as { toDate: () => Date }).toDate().toISOString();
      } catch {
        updatedAt = new Date().toISOString();
      }
    }
    if (typeof updatedAt !== 'string') updatedAt = new Date().toISOString();
    return normalizePrefs({ ...data, updatedAt });
  },
  async push(uid: string, prefs: SettingsPrefs): Promise<void> {
    const payload = {
      theme: prefs.theme,
      bgmEnabled: prefs.bgmEnabled,
      bgmVolume: prefs.bgmVolume,
      rememberMe: prefs.rememberMe,
      // Keep client ISO for last-write-wins; also stamp server time for audit
      updatedAt: prefs.updatedAt,
      serverUpdatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid, 'private', 'settings'), payload, { merge: true });
  },
});


// 僅限本機開發：VITE_FIREBASE_EMULATORS=1 npm run dev 時連接本機模擬器（正式建置不會包含）
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/**
 * 代表「目前已通過檢查的登入用戶」。
 * 保留舊名稱 TEST_USER_ID 作為別名，避免與其他待合併的修改（MenuScreen.tsx）衝突；
 * 新程式碼請使用 CURRENT_USER。不再存在共用的測試帳戶文件。
 */
export const CURRENT_USER = '__current_user__';
/** @deprecated 請改用 CURRENT_USER */
export const TEST_USER_ID = CURRENT_USER;

// ───────────────────────── 登入狀態 ─────────────────────────

export type AuthStatus = 'loading' | 'signedOut' | 'authorized' | 'rejected' | 'guest';

export interface AuthState {
  status: AuthStatus;
  /** 只有 status === 'authorized' 時才有值 */
  user: User | null;
  /** 顯示給玩家的錯誤訊息（例如網域不符） */
  message: string | null;
  /** true when status === 'guest' (teacher test; no Firebase Auth) */
  isGuest: boolean;
}

let authState: AuthState = { status: 'loading', user: null, message: null, isGuest: false };
const authListeners = new Set<(s: AuthState) => void>();

function setAuthState(next: AuthState) {
  authState = next;
  authListeners.forEach((fn) => fn(authState));
}

/** 監聽登入狀態；會立即以目前狀態呼叫一次 */
export function watchAuthState(fn: (s: AuthState) => void): () => void {
  authListeners.add(fn);
  fn(authState);
  return () => {
    authListeners.delete(fn);
  };
}

export function isGuestAuth(s: AuthState = authState): boolean {
  return s.status === 'guest' || s.isGuest === true;
}

/** School Google session OR guest — enough to enter menu / battle UI */
export function canEnterGame(s: AuthState = authState): boolean {
  return s.status === 'authorized' || isGuestAuth(s);
}

/**
 * Enter guest mode for teacher testing.
 * Does NOT call Firebase Auth. Persists flag in sessionStorage so refresh mid-test restores guest.
 * Domain gate (@wbss.edu.hk) does not apply.
 */
export function enterGuestMode(): void {
  persistGuestSession();
  resetGuestUserData();
  setAuthState({ status: 'guest', user: null, message: null, isGuest: true });
}

/**
 * Clear guest session and return to LoginGate for real Google sign-in.
 * Does not call Firebase Auth (guest never signed in).
 */
export function exitGuestMode(): void {
  clearGuestSessionStorage();
  resetGuestUserData();
  setAuthState({ status: 'signedOut', user: null, message: null, isGuest: false });
}

/** 只有通過網域及電郵驗證檢查的用戶才會被傳出；其他情況一律為 null */
function watchAuthorizedUser(fn: (u: User | null) => void): () => void {
  let lastUid: string | null | undefined;
  return watchAuthState((s) => {
    const u = s.status === 'authorized' ? s.user : null;
    const uid = u?.uid ?? null;
    if (uid === lastUid) return;
    lastUid = uid;
    fn(u);
  });
}

async function rejectAndSignOut() {
  // 先設定拒絕狀態，確保之後的 signedOut 事件不會覆蓋訊息，亦不會有任何資料讀寫
  setAuthState({ status: 'rejected', user: null, message: REJECTION_MESSAGE, isGuest: false });
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Sign-out after rejection failed', e);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    resetSettingsCloudPullState();
    if (authState.status !== 'rejected') {
      // Restore guest after refresh if sessionStorage flag is set (teacher convenience).
      if (isGuestSessionStored()) {
        resetGuestUserData();
        setAuthState({ status: 'guest', user: null, message: null, isGuest: true });
      } else {
        setAuthState({ status: 'signedOut', user: null, message: null, isGuest: false });
      }
    }
    return;
  }
  // Real Google user wins over guest; never keep a fake guest identity alongside Auth.
  clearGuestSessionStorage();
  if (!isAllowedUser(user)) {
    resetSettingsCloudPullState();
    await rejectAndSignOut();
    return;
  }
  // 已通過檢查：先確保個人檔案存在（並清除舊有的姓名欄位），再開放遊戲資料存取
  await queueProfileSync(user, null);
  if (auth.currentUser?.uid === user.uid) {
    setAuthState({ status: 'authorized', user, message: null, isGuest: false });
    // 設定雲端同步：首次 pull 後 last-write-wins；失敗不阻斷登入
    syncSettingsAfterAuth(user.uid).catch((e) => console.warn('settings sync after auth failed', e));
  }
});

/** 只在記憶體中使用 Google OAuth 個人資料推算姓氏；不會儲存全名 */
function nameProfileFromCredential(result: UserCredential): NameProfile {
  const p = (getAdditionalUserInfo(result)?.profile ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    displayName: str(p.name) ?? result.user.displayName,
    familyName: str(p.family_name),
    givenName: str(p.given_name),
  };
}

async function afterSignIn(result: UserCredential | null) {
  if (!result || !isAllowedUser(result.user)) return; // 不合格者由 onAuthStateChanged 處理
  await queueProfileSync(result.user, nameProfileFromCredential(result));
}

// 處理 signInWithRedirect 返回（popup 失敗時的後備路徑）。
// 注意：部分 iOS Safari／內建瀏覽器會在 redirect 後丟掉 sessionStorage，
// 導致 auth/missing-initial-state；此時顯示提示，勿讓應用崩潰。
getRedirectResult(auth)
  .then(afterSignIn)
  .catch((e) => {
    const message = describeAuthError(e);
    if (message) setAuthState({ status: 'signedOut', user: null, message, isGuest: false });
  });

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  // hd 只是帳戶選擇畫面的提示，真正的檢查在 isAllowedUser() 及 firestore.rules
  provider.setCustomParameters({ hd: GOOGLE_HOSTED_DOMAIN_HINT, prompt: 'select_account' });
  return provider;
}

/** iOS Safari／內建瀏覽器 redirect 後 sessionStorage 遺失時的提示 */
const REDIRECT_STATE_LOST_MESSAGE =
  '登入未能完成，請用 Safari／Chrome 開啟本頁後再試，或關閉追蹤防護後重試。';

function describeAuthError(e: unknown): string | null {
  const code = (e as { code?: string } | null)?.code ?? '';
  const msg = (e as { message?: string } | null)?.message ?? '';
  // redirect 後備路徑：sessionStorage 遺失（常見於 iOS 內建瀏覽器）
  if (
    code === 'auth/missing-initial-state' ||
    /missing initial state/i.test(msg)
  ) {
    return REDIRECT_STATE_LOST_MESSAGE;
  }
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/user-cancelled':
      return null; // 玩家自行取消，不顯示錯誤
    case 'auth/network-request-failed':
      return '登入失敗，請檢查網絡連線後再試。';
    case 'auth/unauthorized-domain':
      return '此網址尚未獲授權使用 Google 登入，請聯絡老師。';
    case 'auth/operation-not-allowed':
      return 'Google 登入尚未啟用，請聯絡老師。';
    case 'auth/admin-restricted-operation':
    case 'auth/user-disabled':
      return REJECTION_MESSAGE;
    default: {
      // 封鎖函式（beforeUserCreated / beforeUserSignedIn）拒絕時，錯誤訊息含 BLOCKING_FUNCTION
      if (msg.includes('BLOCKING_FUNCTION')) return REJECTION_MESSAGE;
      return '登入失敗，請稍後再試。';
    }
  }
}

/**
 * popup 失敗時是否改走 signInWithRedirect。
 * 注意：redirect 依賴 sessionStorage，在部分 iOS Safari／內建瀏覽器仍可能失敗
 * （見 getRedirectResult → missing-initial-state 處理）。
 */
function shouldFallbackToRedirect(code: string | undefined): boolean {
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/cancelled-popup-request'
  );
}

/** 唯一的登入方式：Google 帳戶（優先 popup，失敗才 redirect） */
export async function signInWithGoogle(): Promise<void> {
  if (authState.status === 'rejected' || authState.status === 'guest') {
    // Leaving guest for Google: clear guest flag so Auth can take over.
    clearGuestSessionStorage();
    setAuthState({ status: 'signedOut', user: null, message: null, isGuest: false });
  }
  // 登入前套用 rememberMe → Firebase Auth persistence（必須在任何 signIn 之前）
  try {
    await applyAuthPersistence(loadSettings().rememberMe);
  } catch (e) {
    console.warn('applyAuthPersistence before sign-in failed', e);
  }
  const provider = createGoogleProvider();
  try {
    // 優先 popup：不依賴跨 redirect 的 sessionStorage，較適合 iOS／內建瀏覽器
    const result = await signInWithPopup(auth, provider);
    // 網域檢查於 onAuthStateChanged 統一處理；此處只用 family_name 更新排行榜名稱
    await afterSignIn(result);
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (shouldFallbackToRedirect(code)) {
      // 後備：redirect 在部分內建瀏覽器仍可能因 sessionStorage 遺失而失敗
      await signInWithRedirect(auth, provider);
      return;
    }
    const message = describeAuthError(e);
    if (message) setAuthState({ status: 'signedOut', user: null, message, isGuest: false });
  }
}

export async function signOutUser(): Promise<void> {
  clearGuestSessionStorage();
  if (authState.status === 'guest') {
    exitGuestMode();
    return;
  }
  await signOut(auth);
}

// ───────────────────────── 遊戲資料 ─────────────────────────

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface UserData {
  level: number;
  gold: number;
  exp: number;
  stamina: number;
  /** 排行榜名稱，例如「救世軍卜維廉中學 林同學」 */
  displayLabel?: string;
  /** 本人畫面頂部的短稱，例如「林同學」；由 surname 推算，不會寫入資料庫 */
  name?: string;
  /** 中文姓氏（可為空字串） */
  surname?: string;
  surnameSource?: SurnameSource | null;
  updatedAt: { seconds: number; nanoseconds: number } | null | any;
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    providerInfo?: { providerId?: string | null }[];
  };
}

function buildErrorInfo(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    code: (error as { code?: string } | null)?.code,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({ providerId: p.providerId })) || [],
    },
    operationType,
    path,
  };
}

/** 記錄並拋出錯誤（用於 await 的寫入操作） */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = buildErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/** 只記錄錯誤（用於 onSnapshot 回呼，避免未捕捉的例外） */
function logFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', JSON.stringify(buildErrorInfo(error, operationType, path)));
}

/** users/{uid} 只可包含這些欄位（亦由 firestore.rules 強制）；不可存全名、英文拼寫、電郵、相片 */
const PROFILE_FIELDS = ['displayLabel', 'schoolDomain', 'surname', 'surnameSource', 'level', 'gold', 'exp', 'stamina', 'updatedAt'];

export type { SurnameSource } from './surnameSync';
function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

const validSurnameValue = isSurnameValue;
const validSource = isSurnameSource;

/**
 * 建立或遷移個人檔案（只會在通過網域檢查後呼叫）。
 * - 新用戶：推算姓氏；須選擇或輸入時先設為 pending（顯示「學校 同學」）
 * - 學生已決定（chosen／manual／none）：保留，不會被覆寫
 * - 已保存的登入（沒有 family_name）：保留現有有效的 auto／han／pending
 * - 剛以 Google 登入（有 family_name）：重新推算 auto／han／pending
 * - 舊文件含 name / displayName 等欄位，或 v2 的英文姓氏（如 "Chan"）：以完整覆寫（非 merge）遷移
 */
async function syncUserProfile(user: User, oauthProfile: NameProfile | null) {
  const domain = emailDomainOf(user.email);
  const school = schoolNameForEmail(user.email);
  if (!domain || !school) return;
  const ref = doc(db, 'users', user.uid);
  const privRef = doc(db, 'users', user.uid, 'private', 'surname');
  const [snap, privSnap] = await Promise.all([getDoc(ref), getDoc(privRef)]);
  const resolution = resolveSurname(oauthProfile ?? { displayName: user.displayName });

  const d = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  const { surname, source, rewritePrivate } = planSurnameSync(d, resolution, oauthProfile !== null);

  // 私人選項：重新推算時更新；不存在時補上
  if (rewritePrivate || !privSnap.exists()) {
    await setDoc(privRef, { ...privateSurnameFor(resolution), updatedAt: serverTimestamp() });
  }

  const label = labelFor(school, surname);
  if (!d) {
    await setDoc(ref, {
      displayLabel: label,
      schoolDomain: domain,
      surname,
      surnameSource: source,
      level: 1,
      gold: 1,
      exp: 0,
      stamina: 100,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const hasLegacyFields = Object.keys(d).some((k) => !PROFILE_FIELDS.includes(k));
  const upToDate =
    !hasLegacyFields &&
    d.surname === surname &&
    d.surnameSource === source &&
    d.schoolDomain === domain &&
    d.displayLabel === label;
  if (upToDate) return;

  // 完整覆寫：未列出的欄位（name、displayName、photoURL、email…）會被刪除
  await setDoc(ref, {
    displayLabel: label,
    schoolDomain: domain,
    surname,
    surnameSource: source,
    level: clampInt(d.level, 1, 999, 1),
    gold: clampInt(d.gold, 0, 100000000, 0),
    exp: clampInt(d.exp, 0, 100000000, 0),
    stamina: clampInt(d.stamina, 0, 1000, 100),
    updatedAt: serverTimestamp(),
  });
}

// 依次執行，避免 onAuthStateChanged 與彈出視窗結果同時寫入
let profileQueue: Promise<void> = Promise.resolve();
function queueProfileSync(user: User, oauthProfile: NameProfile | null): Promise<void> {
  profileQueue = profileQueue
    .then(() => syncUserProfile(user, oauthProfile))
    .catch((e) => console.error('Failed to sync user profile', e));
  return profileQueue;
}

// ───────────────────────── 姓氏選擇 ─────────────────────────

export interface SurnameState {
  /** 已載入公開及私人文件 */
  ready: boolean;
  surname: string;
  source: SurnameSource | null;
  /** 可供選擇的中文姓氏（只有本人可見） */
  options: string[];
  /** true：以文字輸入；false：在 options 中選擇 */
  manual: boolean;
  /** 本人的排行榜名稱預覽用學校名稱 */
  school: string | null;
}

/** 設定頁「更改姓氏」：要求 App 開啟姓氏選擇視窗 */
let surnameEditorOpen = false;
const surnameEditorListeners = new Set<(open: boolean) => void>();
export function setSurnameEditorOpen(open: boolean) {
  surnameEditorOpen = open;
  surnameEditorListeners.forEach((fn) => fn(open));
}
export function watchSurnameEditor(fn: (open: boolean) => void): () => void {
  surnameEditorListeners.add(fn);
  fn(surnameEditorOpen);
  return () => {
    surnameEditorListeners.delete(fn);
  };
}

const EMPTY_SURNAME_STATE: SurnameState = { ready: false, surname: '', source: null, options: [], manual: true, school: null };
let surnameState: SurnameState = EMPTY_SURNAME_STATE;
const surnameListeners = new Set<(s: SurnameState) => void>();
let surnameUnsubs: Array<() => void> = [];

function setSurnameState(next: SurnameState) {
  surnameState = next;
  surnameListeners.forEach((fn) => fn(surnameState));
}

function startSurnameWatch(user: User | null) {
  surnameUnsubs.forEach((u) => u());
  surnameUnsubs = [];
  setSurnameState(EMPTY_SURNAME_STATE);
  if (surnameEditorOpen) setSurnameEditorOpen(false);
  if (!user) return;
  let pub: Record<string, unknown> | null | undefined;
  let priv: Record<string, unknown> | null | undefined;
  const school = schoolNameForEmail(user.email);
  const emit = () => {
    if (pub === undefined || priv === undefined) return;
    const options = Array.isArray(priv?.options) ? (priv!.options as unknown[]).filter((o): o is string => typeof o === 'string' && CJK_SURNAME_RE.test(o)) : [];
    setSurnameState({
      ready: pub !== null,
      surname: validSurnameValue(pub?.surname) ? (pub!.surname as string) : '',
      source: validSource(pub?.surnameSource) ? (pub!.surnameSource as SurnameSource) : null,
      options,
      manual: priv?.manual !== false || options.length < 2,
      school,
    });
  };
  surnameUnsubs.push(
    onSnapshot(doc(db, 'users', user.uid), (s) => { pub = s.exists() ? s.data() : null; emit(); },
      (e) => logFirestoreError(e, OperationType.GET, `users/${user.uid}`)),
    onSnapshot(doc(db, 'users', user.uid, 'private', 'surname'), (s) => { priv = s.exists() ? s.data() : null; emit(); },
      (e) => logFirestoreError(e, OperationType.GET, `users/${user.uid}/private/surname`)),
  );
}

// 只在通過檢查後監聽（與遊戲資料相同的閘門）
watchAuthorizedUser(startSurnameWatch);

/** 監聽本人的姓氏狀態；會立即以目前狀態呼叫一次 */
export function watchSurnameState(fn: (s: SurnameState) => void): () => void {
  surnameListeners.add(fn);
  fn(surnameState);
  return () => {
    surnameListeners.delete(fn);
  };
}

/**
 * 儲存學生的選擇。
 * - chosen：surname 必須是本人選項之一
 * - manual：一至兩個中文字
 * - none：不顯示姓氏（「學校 同學」）
 */
export async function saveSurnameChoice(input: string, source: 'chosen' | 'manual' | 'none'): Promise<void> {
  const user = authState.status === 'authorized' ? authState.user : null;
  const school = schoolNameForEmail(user?.email);
  if (!user || !school) throw new Error('尚未登入');
  let surname = '';
  if (source === 'chosen') {
    if (!surnameState.options.includes(input)) throw new Error('請在選項中選擇。');
    surname = input;
  } else if (source === 'manual') {
    const r = validateManualSurname(input);
    if (r.ok === false) throw new Error((r as { message: string }).message);
    surname = (r as { surname: string }).surname;
  }
  const ref = doc(db, 'users', user.uid);
  try {
    await setDoc(
      ref,
      { surname: sanitizeSurname(surname), surnameSource: source, displayLabel: labelFor(school, surname), updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
  }
}

/** 只把公開、已清理的欄位交給介面；絕不轉交 name / displayName 等舊欄位 */
function toPublicUserData(raw: Record<string, unknown>): UserData {
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    level: num(raw.level, 1),
    gold: num(raw.gold, 0),
    exp: num(raw.exp, 0),
    stamina: num(raw.stamina, 0),
    displayLabel: safeDisplayLabel(raw),
    name: shortLabelFor(typeof raw.surname === 'string' ? raw.surname : ''),
    surname: sanitizeSurname(typeof raw.surname === 'string' ? raw.surname : ''),
    surnameSource: validSource(raw.surnameSource) ? raw.surnameSource : null,
    updatedAt: raw.updatedAt ?? null,
  };
}

function resolveUid(userId: string, user: User) {
  return userId === CURRENT_USER ? user.uid : userId;
}

/**
 * 監聽單一用戶資料。只有在登入並通過檢查後才會連線 Firestore；
 * 登出或被拒絕時會自動中斷並回傳 null。
 */
export function subscribeToUser(
  userId: string,
  onUpdate: (data: UserData | null) => void,
  onError?: (error: unknown) => void,
) {
  let unsubDoc: (() => void) | null = null;
  let unsubGuest: (() => void) | null = null;
  const unsubAuth = watchAuthState((s) => {
    unsubDoc?.();
    unsubDoc = null;
    unsubGuest?.();
    unsubGuest = null;
    if (isGuestAuth(s)) {
      // Guest: in-memory / session defaults only — never open Firestore.
      unsubGuest = subscribeGuestUserData((d) => onUpdate({ ...d } as UserData));
      return;
    }
    if (s.status !== 'authorized' || !s.user) {
      onUpdate(null);
      return;
    }
    const user = s.user;
    const uid = resolveUid(userId, user);
    unsubDoc = onSnapshot(
      doc(db, 'users', uid),
      (snap) => onUpdate(snap.exists() ? toPublicUserData(snap.data()) : null),
      (error) => {
        logFirestoreError(error, OperationType.GET, `users/${uid}`);
        onError?.(error);
      },
    );
  });
  return () => {
    unsubAuth();
    unsubDoc?.();
    unsubGuest?.();
  };
}

/** 排行榜：users 集合依等級排序（只在通過檢查後才查詢） */
export function subscribeToRanking(
  onUpdate: (data: (UserData & { id: string })[]) => void,
  limitCount: number = 50,
  onError?: (error: unknown) => void,
) {
  let unsubQuery: (() => void) | null = null;
  const unsubAuth = watchAuthState((s) => {
    unsubQuery?.();
    unsubQuery = null;
    if (isGuestAuth(s)) {
      // Guest cannot read ranking — UI shows 「需登入學校帳戶」.
      onUpdate([]);
      return;
    }
    if (s.status !== 'authorized' || !s.user) return;
    const q = query(collection(db, 'users'), orderBy('level', 'desc'), limit(limitCount));
    unsubQuery = onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map((d) => ({ id: d.id, ...toPublicUserData(d.data()) }));
        onUpdate(users);
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'users');
        onError?.(error);
      },
    );
  });
  return () => {
    unsubAuth();
    unsubQuery?.();
  };
}

/** 扣除金幣（文氣）：只可修改自己的文件 */
export async function updateUserGold(userId: string, newGold: number) {
  if (isGuestAuth()) {
    // Local-only temp gold — never write Firestore as guest.
    setGuestGold(newGold);
    return;
  }
  const user = authState.status === 'authorized' ? authState.user : null;
  if (!user) throw new Error('尚未登入');
  const uid = resolveUid(userId, user);
  const userRef = doc(db, 'users', uid);
  try {
    await setDoc(userRef, { gold: Math.max(0, Math.floor(newGold)), updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}
