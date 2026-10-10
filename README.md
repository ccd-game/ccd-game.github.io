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
