#!/bin/bash
set -e

# Configuration
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== 開始部署流程 (Custom Domain) ===${NC}"

# 1. 建置前端
echo -e "${BLUE}[1/3] 建置前端 Web...${NC}"
echo "API URL 已固定為: https://zhuyin-battle.marmot0814.com"
cd web
npm run build
cd ..

# 2. 部署後端到 VM
echo -e "${BLUE}[2/3] 部署後端 Server...${NC}"
cd server
./deploy-vm.sh
cd ..

# 3. 部署前端到 GitHub Pages
echo -e "${BLUE}[3/3] 部署前端到 GitHub Pages...${NC}"
cd web
npm run deploy

echo -e "${GREEN}=== 部署完成！ ===${NC}"
echo -e "前端網址 (GitHub Pages): https://marmot0814.github.io/zhuyin-battle/"
echo -e "後端 API: https://zhuyin-battle.marmot0814.com"
