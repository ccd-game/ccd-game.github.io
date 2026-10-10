import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDocFromServer, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);

// 啟用離線持久化
if (typeof window !== 'undefined') {
  // 在某些受限環境（如 iframe）中，持久化可能導致連線問題，這裡改為選配
  /* 
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: Browser not supported');
    }
  });
  */
}

// 預設測試用戶 ID
export const TEST_USER_ID = 'userid';

// 測試連線連通性
async function testFirestoreConnection() {
  try {
    console.log('Attempting Firestore connection test...');
    // 嘗試從伺服器獲取測試用戶文檔來測試連通性
    const testDoc = doc(db, 'users', TEST_USER_ID);
    await getDocFromServer(testDoc);
    console.log('Firestore connection verified: Successfully contacted backend');
  } catch (error) {
    if (error instanceof Error) {
      // 權限錯誤可能是正常的（如果使用者未登入且規則較嚴格），但連線錯誤則需要警示
      if (error.message.includes('Missing or insufficient permissions')) {
        console.warn('Firestore connection test: Permissions restricted (expected if rules are strict)');
      } else {
        console.error('Firestore connection test failed:', {
          message: error.message,
          name: error.name
        });
      }
      if (error.message.includes('Could not reach Cloud Firestore backend')) {
        console.warn('Network timeout or incorrect database ID. Current ID:', firebaseConfig.firestoreDatabaseId);
      }
    }
  }
}
testFirestoreConnection();

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
  name?: string;
  updatedAt: { seconds: number; nanoseconds: number } | null | any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 初始化測試用戶資料
export async function initializeTestUser() {
  const userRef = doc(db, 'users', TEST_USER_ID);
  
  try {
    // 預期規則允許 'userid' 直接寫入，無需先登入
    // 首先嘗試獲取，看是否已存在
    const docSnap = await getDocFromServer(userRef);
    if (!docSnap.exists()) {
      // 建立預設資料: 等級 1, 金幣 1, 經驗 0, 體力 100
      await setDoc(userRef, {
        name: "修煉者",
        level: 1,
        gold: 1,
        exp: 0,
        stamina: 100,
        updatedAt: serverTimestamp()
      });
      console.log('Test user initialized');
    }
  } catch (error) {
    console.warn('Failed to initialize test user (this might be expected if Anonymous Auth is disabled):', error);
  }
}

// 監聽單一用戶資料
export function subscribeToUser(userId: string, onUpdate: (data: UserData | null) => void) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data() as UserData);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  });
}

// 獲取排行榜資料
export function subscribeToRanking(onUpdate: (data: (UserData & { id: string })[]) => void, limitCount: number = 50) {
  const q = query(collection(db, 'users'), orderBy('level', 'desc'), limit(limitCount));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (UserData & { id: string })[];
    onUpdate(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'users');
  });
}

// 扣除金幣（文氣）
export async function updateUserGold(userId: string, newGold: number) {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, { gold: newGold, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}
