# Zhuyin Battle Server

後端服務，使用 Express + PostgreSQL。

## 安裝與設置

### 1. 安裝 PostgreSQL

**macOS (使用 Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**或使用 Docker:**
```bash
docker run --name zhuyin-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

### 2. 建立資料庫

```bash
createdb zhuyin_battle
# 或如果使用 Docker，先連進容器
psql -h localhost -U postgres
# 然後執行：
CREATE DATABASE zhuyin_battle;
```

### 3. 複製環境變數

```bash
cp .env.example .env
```

編輯 `.env`，設置你的資料庫連接字串：
```
DATABASE_URL=postgres://postgres:password@localhost:5432/zhuyin_battle
JWT_SECRET=your-super-secret-key
```

### 4. 安裝依賴

```bash
npm install
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

伺服器會在 `http://localhost:3001` 啟動。

## API 文檔

### User Routes

#### 註冊 (POST `/api/users/register`)
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "secure_password"
  }'
```

**回應:**
```json
{
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "rating": 1500,
    "games_played": 0,
    "games_won": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 登入 (POST `/api/users/login`)
```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "password": "secure_password"
  }'
```

#### 獲取當前用戶 (GET `/api/users/me`)
需要在 Header 中提供 JWT token：
```bash
curl http://localhost:3001/api/users/me \
  -H "Authorization: Bearer <your_token>"
```

#### 獲取公開用戶資料 (GET `/api/users/:username`)
```bash
curl http://localhost:3001/api/users/player1
```

#### 更新個人資料 (PATCH `/api/users/me`)
```bash
curl -X PATCH http://localhost:3001/api/users/me \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_url": "https://example.com/avatar.png",
    "bio": "I love Zhuyin Battle!"
  }'
```

#### 排行榜 (GET `/api/users/leaderboard/top`)
```bash
curl http://localhost:3001/api/users/leaderboard/top?limit=10
```

## 資料庫結構

### users
- `id`: 用戶 ID
- `username`: 用戶名
- `email`: 電子郵件
- `password_hash`: 密碼雜湊值
- `rating`: Elo 評分 (預設 1500)
- `games_played`: 遊玩局數
- `games_won`: 獲勝局數
- `avatar_url`: 頭像 URL
- `bio`: 個人簽名

### rooms
- 房間資訊

### room_players
- 房間裡的玩家和觀戰者

### board_tiles
- 遊戲盤面的格子狀態

### moves
- 遊戲移動歷史

## 下一步

1. 實作房間相關 API (`/api/rooms`)
2. 實作盤面狀態 API (`/api/board`)
3. 實作 WebSocket 即時通訊
4. 實作遊戲邏輯和 Elo 評分計算
5. 加入認證和授權機制
