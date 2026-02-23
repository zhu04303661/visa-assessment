#!/bin/bash

echo "🛑 停止端口80前端服务..."

# 使用PM2停止进程
if command -v pm2 >/dev/null; then
    pm2 stop frontend 2>/dev/null
    pm2 stop frontend-prod 2>/dev/null
    pm2 delete frontend 2>/dev/null
    pm2 delete frontend-prod 2>/dev/null
    echo "✅ PM2 进程已停止"
fi

# 停止可能需要的额外进程
pkill -f "node.*next dev.*--port 80" 2>/dev/null
pkill -f "node.*next start.*--port 80" 2>/dev/null
pkill -f "npm.*--port 80" 2>/dev/null

# 尝试使用sudo终止（如果需要）
sudo pkill -f "node.*next dev.*--port 80" 2>/dev/null || true
sudo pkill -f "node.*next start.*--port 80" 2>/dev/null || true

# 验证端口80是否已释放
if ! netstat -tuln | grep -q ':80 '; then
    echo "✅ 端口80已成功释放"
else
    echo "⚠️  端口80仍被占用，尝试强制释放..."
    # 最终手段
    sudo fuser -k 80/tcp 2>/dev/null || true
    sleep 1
    if ! netstat -tuln | grep -q ':80 '; then
        echo "✅ 端口80已成功释放"
    else
        echo "❌ 无法自动释放端口80，请手动检查"
        lsof -i :80
    fi
fi

echo "🧹 清理完成"