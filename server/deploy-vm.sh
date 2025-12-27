#!/bin/bash

# 部署到 GCP VM 的腳本
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

VM_NAME="zhuyin-battle"
ZONE="us-west1-b"

echo -e "${BLUE}=== 部署到 GCP VM: ${VM_NAME} ===${NC}"

# 1. 檢查 .env 檔案
if [ -f ".env" ]; then
  echo -e "${BLUE}使用現有的 .env 檔案...${NC}"
else
  echo -e "${RED}錯誤: 找不到 .env 檔案${NC}"
  echo "請先建立 .env 檔案，包含 DATABASE_URL, ADMIN_PASSWORD 等設定"
  exit 1
fi

# 2. 壓縮專案檔案
echo -e "${BLUE}壓縮專案檔案...${NC}"
tar -czf ../server-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='public' \
  .

# 3. 上傳到 VM
echo -e "${BLUE}上傳檔案到 VM...${NC}"
gcloud compute scp ../server-deploy.tar.gz ${VM_NAME}:~/ --zone=${ZONE}
gcloud compute scp .env ${VM_NAME}:~/ --zone=${ZONE}

# 4. 在 VM 上安裝並啟動
echo -e "${BLUE}在 VM 上安裝並啟動服務...${NC}"
gcloud compute ssh ${VM_NAME} --zone=${ZONE} << 'ENDSSH'
set -e

echo "安裝 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "安裝 PM2..."
sudo npm install -g pm2

echo "解壓專案..."
mkdir -p ~/zhuyin-battle-server
tar -xzf ~/server-deploy.tar.gz -C ~/zhuyin-battle-server
mv ~/server-deploy.tar.gz ~/.server-deploy.tar.gz.bak 2>/dev/null || true

echo "移動 .env 檔案..."
mv ~/.env ~/zhuyin-battle-server/.env

cd ~/zhuyin-battle-server

echo "安裝依賴..."
npm install

echo "編譯 TypeScript..."
npm run build

echo "停止舊服務..."
pm2 delete zhuyin-server 2>/dev/null || true

echo "啟動服務..."
pm2 start dist/server.js --name zhuyin-server
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "服務狀態:"
pm2 status
ENDSSH

# 5. 檢查防火牆規則
echo -e "${BLUE}檢查防火牆規則...${NC}"
if ! gcloud compute firewall-rules describe allow-nodejs-3001 &>/dev/null; then
    echo "建立防火牆規則..."
    gcloud compute firewall-rules create allow-nodejs-3001 \
        --allow tcp:3001 \
        --source-ranges 0.0.0.0/0 \
        --description "Allow Node.js server on port 3001"
fi

# 6. 獲取外部 IP
EXTERNAL_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo -e "${GREEN}=== 部署完成！ ===${NC}"
echo ""
echo "服務 URL: http://${EXTERNAL_IP}:3001"
echo ""
echo "測試 health endpoint:"
sleep 3
curl http://${EXTERNAL_IP}:3001/api/health || echo "服務可能還在啟動中，請稍後再試"
echo ""
echo ""
echo "下一步："
echo "1. 在 web/.env.production 設定:"
echo "   NEXT_PUBLIC_API_URL=http://${EXTERNAL_IP}:3001"
echo ""
echo "2. 查看服務日誌:"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE}"
echo "   pm2 logs zhuyin-server"
echo ""
echo "3. 重新啟動服務:"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE}"
echo "   pm2 restart zhuyin-server"

# 清理
rm -f ../server-deploy.tar.gz
