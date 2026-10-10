# 文言地城（Classical Chinese Dungeon）

以香港中學文憑試（HKDSE）中文科十二篇範文為題材的文言文 RPG 地城闖關遊戲。玩家透過回答文言文題目攻擊怪物、深入地城。

**線上試玩：** https://noodlenocup.github.io/ccd/

## 本機執行

需要 Node.js 20 或以上。

```bash
npm ci
npm run dev
```

開發伺服器預設於 http://localhost:3000/ccd/ 啟動。

## 建置

```bash
npm run build
```

輸出位於 `dist/`。

## 自動部署

推送（push）到 `main` 分支後，GitHub Actions（`.github/workflows/deploy.yml`）會自動建置並部署到 GitHub Pages。亦可於 Actions 頁面手動執行。

## 技術

React 19 · Vite 6 · TypeScript · Firebase（Firestore）

## 登入與權限

- 只接受 **Google 帳戶** 登入，並只開放予已驗證的 `@wbss.edu.hk` 電郵（不分大小寫，不接受子網域）。
- 學校及網域名單只定義於 `src/config/auth.ts` 的 `SCHOOLS_BY_EMAIL_DOMAIN`（網域 → 學校名稱），`ALLOWED_EMAIL_DOMAINS` 由它推算。
- 真正的權限閘門是 `firestore.rules` 的 `isSchoolUser()`。**安全規則無法匯入 TypeScript，新增或修改學校時必須同時修改 `firestore.rules` 內 `schools()` 對照表**（內容須完全一致），再部署規則。
- 排行榜只顯示「學校名稱 + 中文姓氏 + 同學」，例如「救世軍卜維廉中學 陳同學」；未選擇或無法判斷時顯示「救世軍卜維廉中學 同學」。英文拼寫按 `src/config/surname_map.json` 對照為中文姓氏（規則見 `src/lib/displayLabel.ts`），須選擇或對照表沒有的拼寫，學生首次登入後會看到姓氏選擇視窗（選項以外可按「其他（自行輸入）」）；之後可在「設定 → 帳戶 → 更改姓氏」更改。
- **更換姓氏對照表**：以新檔覆蓋 `src/config/surname_map.json`（格式 `{ "chan": { "options": ["陳"], "mode": "auto" } }`，鍵值為小寫、無空格及連字號），然後執行 `npm run test:unit`；只有 `src/config/surnames.ts` 載入此檔，程式碼毋須修改。測試中的數量（266／187／79）及個別例子需按新資料更新。
- `users/{uid}` 所有學校用戶都可讀取，所以只存 `displayLabel`、`schoolDomain`、中文 `surname`、`surnameSource` 及遊戲數值，**不存全名、英文拼寫、電郵、相片**（規則以欄位白名單強制）。可供選擇的中文姓氏存於只有本人可讀寫的 `users/{uid}/private/surname`。舊文件的 `name`／`displayName` 等欄位會在該用戶下次登入時自動刪除。
- 規則部署目標（具名資料庫）設定於 `firebase.json`。

## 測試

```bash
npm run test:unit    # isAllowedEmail 等單元測試
npm run test:rules   # Firestore 安全規則測試（需要 Java，會自動啟動 Firestore 模擬器）
npm run typecheck
```

本機以模擬器試玩登入流程（不會連接正式專案）：

```bash
npx firebase-tools emulators:start --only auth,firestore --project gen-lang-client-0566675222
VITE_FIREBASE_EMULATORS=1 npm run dev
```
