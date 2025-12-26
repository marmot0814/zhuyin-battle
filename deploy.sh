#!/bin/bash

# GitHub Pages 部署腳本

echo "🚀 開始部署到 GitHub Pages..."

# 檢查是否在正確的目錄
if [ ! -f "DEPLOYMENT.md" ]; then
    echo "❌ 錯誤: 請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 git 狀態
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 發現未提交的更改"
    git status --short
    
    read -p "是否要提交這些更改? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "請輸入 commit 訊息: " commit_msg
        git add .
        git commit -m "$commit_msg"
    else
        echo "❌ 取消部署"
        exit 1
    fi
fi

# 推送到 GitHub
echo "⬆️  推送到 GitHub..."
git push origin main

echo "✅ 推送完成！"
echo ""
echo "📊 查看部署狀態: https://github.com/marmot0814/zhuyin-battle/actions"
echo "🌐 網站將在幾分鐘後上線: https://marmot0814.github.io/zhuyin-battle"
echo ""
echo "💡 提示: 等待 GitHub Actions workflow 完成後才能訪問網站"
