#!/bin/bash

# 部署到 GCP Cloud Run 的快速腳本
# 使用方法: ./deploy-gcp.sh

set -e

# 顏色輸出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== GCP Cloud Run 部署腳本 ===${NC}"

# 檢查是否已登入 gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
    echo "請先登入 Google Cloud:"
    gcloud auth login
fi

# 獲取專案 ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "請先設定 GCP 專案:"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}使用專案: ${PROJECT_ID}${NC}"

# 讀取環境變數
echo ""
echo "請輸入環境變數（留空使用預設值）："
read -p "DATABASE_URL: " DATABASE_URL
read -p "JWT_SECRET [隨機生成]: " JWT_SECRET
read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -sp "ADMIN_PASSWORD: " ADMIN_PASSWORD
echo ""

# 設定預設值
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}

if [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ 錯誤: 必須設定 ADMIN_PASSWORD"
    exit 1
fi

# 部署到 Cloud Run
echo -e "${BLUE}開始部署到 Cloud Run...${NC}"

gcloud run deploy zhuyin-battle-server \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "DATABASE_URL=${DATABASE_URL},JWT_SECRET=${JWT_SECRET},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},ADMIN_PASSWORD=${ADMIN_PASSWORD}"

echo -e "${GREEN}=== 部署完成！ ===${NC}"
echo ""
echo "取得服務 URL:"
SERVICE_URL=$(gcloud run services describe zhuyin-battle-server --region asia-east1 --format="value(status.url)")
echo -e "${GREEN}${SERVICE_URL}${NC}"
echo ""
echo "測試 health endpoint:"
curl "${SERVICE_URL}/health"
echo ""
echo ""
echo "下一步："
echo "1. 複製上面的 URL"
echo "2. 在 web/.env.production 中設定 NEXT_PUBLIC_API_URL=${SERVICE_URL}"
echo "3. 重新部署前端到 GitHub Pages"
