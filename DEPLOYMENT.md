# GitHub Pages 部署指南

## ✅ 已完成的配置

- ✅ Next.js 靜態導出配置
- ✅ GitHub Actions workflow
- ✅ basePath 設定為 `/zhuyin-battle`
- ✅ 圖片優化禁用（靜態導出需要）
- ✅ .nojekyll 文件

## 🚀 部署步驟

### 1. 初始化 Git 並推送到 GitHub

```bash
cd /Users/marmot0814/Documents/zhuyin-battle

# 如果還沒有 git repository
git init
git add .
git commit -m "Initial commit with GitHub Pages config"

# 添加遠端 repository
git remote add origin https://github.com/marmot0814/zhuyin-battle.git

# 推送到 main branch
git branch -M main
git push -u origin main
```

### 2. 配置 GitHub Pages

1. 前往 https://github.com/marmot0814/zhuyin-battle/settings/pages
2. 在 **Source** 下選擇 **GitHub Actions**
3. 儲存設定

### 3. 觸發部署

推送代碼後，GitHub Actions 會自動執行：

1. 前往 https://github.com/marmot0814/zhuyin-battle/actions
2. 查看 "Deploy to GitHub Pages" workflow
3. 等待部署完成（約 2-3 分鐘）
4. 網站將在 https://marmot0814.github.io/zhuyin-battle 上線

## ⚠️ 重要限制

### Battle 頁面暫時移除

`/battle/[id]` 動態路由頁面已暫時移到 `web/battle-page-backup`，因為：
- 靜態導出不支持動態路由（除非預先生成所有路徑）
- 這個頁面需要 WebSocket 連接，不適合靜態託管

**如需恢復**：需要將應用部署到支持 SSR 的平台（如 Vercel）。

### 後端 API 問題

GitHub Pages 只能託管靜態文件，**無法運行後端**。當前所有 API 調用指向 `http://localhost:3001`，在部署後會失敗。

## 📝 後續步驟

### 1. 配置 GitHub Repository

1. 進入你的 GitHub repository 設定頁面
2. 點擊 **Settings** > **Pages**
3. 在 **Source** 選擇 **GitHub Actions**

### 2. 推送代碼

```bash
cd /Users/marmot0814/Documents/zhuyin-battle
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

### 3. 查看部署狀態

1. 進入 repository 的 **Actions** 頁面
2. 等待 workflow 完成（綠色勾勾）
3. 部署完成後，網站會在 `https://marmot0814.github.io/zhuyin-battle` 上線

## 重要注意事項

### 後端 API 設定

GitHub Pages 只能託管靜態網站，**無法運行後端伺服器**。你需要：

**選項 1：使用其他服務部署後端**
- 使用 Render、Railway、Heroku、或 Fly.io 部署後端
- 更新前端的 API URL

**選項 2：修改前端 API 端點**

需要在所有前端文件中將 `http://localhost:3001` 替換為實際的後端 URL。

例如在 `web/app/lobby/page.tsx` 中：
```typescript
// 改為使用環境變數
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 然後在所有 fetch 中使用
fetch(`${API_URL}/api/friends/ping`, { ... })
```

然後在 GitHub repository 設定中添加環境變數：
1. **Settings** > **Secrets and variables** > **Actions**
2. 添加 `NEXT_PUBLIC_API_URL` 變數

### 本地測試

在推送前，先本地測試靜態導出：

```bash
cd web
npm run build
```

檢查 `web/out` 目錄是否正確生成。

## 配置文件說明

- `next.config.ts`: 配置靜態導出和 basePath
- `.github/workflows/deploy.yml`: GitHub Actions 自動部署配置
- `web/public/.nojekyll`: 防止 GitHub Pages 使用 Jekyll 處理

## 後續優化

如果要完整部署應用，建議：

1. **後端部署到 Render**（免費方案）:
   - 前往 https://render.com
   - 連接 GitHub repository
   - 選擇 `server` 目錄
   - 設定環境變數（DATABASE_URL 等）
   - 部署後獲得後端 URL

2. **更新前端 API URL**：
   - 創建 `web/.env.production`
   - 添加 `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
   - 重新部署

3. **配置 CORS**：
   在 `server/src/server.ts` 中更新 CORS 設定：
   ```typescript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://marmot0814.github.io'
     ],
     credentials: true,
   }));
   ```
