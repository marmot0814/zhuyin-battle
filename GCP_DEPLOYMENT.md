# GCP 後端部署指南

## 方法一：使用 Cloud Run（推薦）

### 1. 安裝 Google Cloud CLI
```bash
# macOS
brew install --cask google-cloud-sdk

# 或從官網下載
# https://cloud.google.com/sdk/docs/install
```

### 2. 初始化並登入
```bash
# 登入 Google 帳號
gcloud auth login

# 設定專案（如果還沒有專案，到 https://console.cloud.google.com 建立）
gcloud config set project YOUR_PROJECT_ID

# 啟用必要的 API
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### 3. 部署到 Cloud Run
```bash
cd server

# 一鍵部署（會自動建立 Docker image 並部署）
gcloud run deploy zhuyin-battle-server \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "DATABASE_URL=你的Supabase連接字串,JWT_SECRET=你的JWT密鑰,GOOGLE_CLIENT_ID=你的Google Client ID,ADMIN_PASSWORD=你的管理員密碼"
```

部署完成後會得到一個 URL，例如：
```
https://zhuyin-battle-server-xxxxx-de.a.run.app
```

### 4. 更新環境變數（之後如果需要修改）
```bash
gcloud run services update zhuyin-battle-server \
  --region asia-east1 \
  --set-env-vars "JWT_SECRET=new-secret"
```

### 5. 查看部署狀態和日誌
```bash
# 查看服務狀態
gcloud run services describe zhuyin-battle-server --region asia-east1

# 查看日誌
gcloud run services logs read zhuyin-battle-server --region asia-east1
```

---

## 方法二：使用 App Engine

### 1. 建立 app.yaml
在 `server/` 目錄建立 `app.yaml`：
```yaml
runtime: nodejs20
env: standard
instance_class: F1

automatic_scaling:
  min_instances: 0
  max_instances: 10

env_variables:
  PORT: "8080"
  DATABASE_URL: "你的Supabase連接字串"
  JWT_SECRET: "你的JWT密鑰"
  GOOGLE_CLIENT_ID: "你的Google Client ID"
  ADMIN_PASSWORD: "你的管理員密碼"
```

### 2. 部署
```bash
cd server
gcloud app deploy
```

---

## 方法三：使用 Compute Engine（VM）

### 1. 建立 VM
```bash
gcloud compute instances create zhuyin-server \
  --zone=asia-east1-a \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB \
  --tags=http-server,https-server
```

### 2. SSH 進入 VM
```bash
gcloud compute ssh zhuyin-server --zone=asia-east1-a
```

### 3. 安裝 Node.js 和 PM2
```bash
# 安裝 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安裝 PM2
sudo npm install -g pm2

# Clone 你的專案
git clone https://github.com/marmot0814/zhuyin-battle.git
cd zhuyin-battle/server

# 安裝依賴
npm install

# 建立 .env 檔案
nano .env
# （貼上你的環境變數）

# 編譯 TypeScript
npm run build

# 使用 PM2 啟動
pm2 start dist/server.js --name zhuyin-server
pm2 save
pm2 startup
```

---

## 更新前端 API URLs

部署完成後，需要更新前端的 API URLs：

### 1. 在 `web/` 建立環境變數檔案

創建 `web/.env.production`：
```env
NEXT_PUBLIC_API_URL=https://zhuyin-battle-server-xxxxx-de.a.run.app
```

### 2. 更新 API 呼叫

在前端程式碼中使用：
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 例如：
fetch(`${API_URL}/api/users/me`, ...)
```

### 3. 重新部署前端
```bash
cd web
npm run build
git add .env.production
git commit -m "Add production API URL"
git push origin main
```

---

## 成本估算

### Cloud Run（推薦）
- 免費額度：每月 200 萬次請求
- 超過免費額度：約 $0.4/百萬次請求
- 記憶體：$0.0000025/GB-秒
- **預估：小型專案幾乎免費**

### App Engine
- F1 instance：$0.05/小時（24/7 約 $36/月）
- 免費額度：28 小時/天

### Compute Engine (e2-micro)
- 約 $7-10/月（24/7 運行）
- 台灣/東京區域有免費額度

---

## 推薦流程

1. **使用 Cloud Run**（最簡單、最便宜）
2. 部署後測試 `/health` endpoint
3. 更新前端 API URL
4. 重新部署前端到 GitHub Pages
5. 測試完整流程

需要我幫你執行部署步驟嗎？
