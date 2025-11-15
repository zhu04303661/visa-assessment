#!/bin/bash

echo "🚀 启动前端 (Next.js)..."

# 解析参数 --debug 或 --log-level=<LEVEL>
LOG_LEVEL=${LOG_LEVEL:-INFO}
for arg in "$@"; do
  case $arg in
    --debug)
      LOG_LEVEL=DEBUG
      shift
      ;;
    --log-level=*)
      LOG_LEVEL="${arg#*=}"
      shift
      ;;
    *)
      ;;
  esac
done

echo "📝 日志级别(仅记录): $LOG_LEVEL"

# 读取 .env.local 配置（如果存在）
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$ROOT_DIR/.env.local" ]; then
  echo "📖 读取 .env.local 配置..."
  # 加载环境变量（使用 export 和 source）
  set -a
  source "$ROOT_DIR/.env.local" 2>/dev/null || true
  set +a
  echo "✅ 环境变量已加载"
fi

# Set environment variables for the application
export NODE_ENV="development"
export LOG_LEVEL="$LOG_LEVEL"
export PORT=80

# 确保后端API URL正确设置（如果未设置，使用默认值）
if [ -z "${NEXT_PUBLIC_API_URL:-}" ] && [ -z "${RESUME_API_URL:-}" ]; then
  export NEXT_PUBLIC_API_URL="http://localhost:5005"
  export RESUME_API_URL="http://localhost:5005"
  echo "⚠️  未找到API URL配置，使用默认值: http://localhost:5005"
else
  echo "✅ API URL配置: ${NEXT_PUBLIC_API_URL:-${RESUME_API_URL:-未设置}}"
fi

# 检查端口80是否被占用
if command -v netstat >/dev/null 2>&1; then
  if netstat -tuln 2>/dev/null | grep -q ':80 '; then
    echo "⚠️  端口80已被占用，正在尝试释放..."
    sudo pkill -f "node.*80" 2>/dev/null || true
    sudo pkill -f "next.*80" 2>/dev/null || true
    sleep 2
  fi
elif command -v ss >/dev/null 2>&1; then
  if ss -tuln 2>/dev/null | grep -q ':80 '; then
    echo "⚠️  端口80已被占用，正在尝试释放..."
    sudo pkill -f "node.*80" 2>/dev/null || true
    sudo pkill -f "next.*80" 2>/dev/null || true
    sleep 2
  fi
fi

echo "🛑 停止现有 PM2 进程..."
pm2 stop frontend 2>/dev/null || true
pm2 delete frontend 2>/dev/null || true

echo "⚛️ 启动 Next.js 应用 (端口 80)..."
# 检查node是否有绑定80端口的权限
NODE_PATH=$(which node)
if ! getcap "$NODE_PATH" 2>/dev/null | grep -q "cap_net_bind_service"; then
    echo "🔧 设置node绑定80端口权限..."
    sudo setcap 'cap_net_bind_service=+ep' "$NODE_PATH" 2>/dev/null || {
        echo "⚠️  无法设置权限，尝试使用sudo启动PM2..."
        sudo -E pm2 start --name frontend npm -- run dev
    }
else
    echo "✅ node已有绑定80端口权限"
    # 使用PM2启动应用，确保SSH退出后继续运行
    pm2 start --name frontend npm -- run dev
fi

echo "✅ Next.js 应用已通过PM2启动"
echo "🌐 http://0.0.0.0:80"
echo "📋 PM2 管理命令:"
echo "   pm2 list          # 查看进程状态"
echo "   pm2 logs frontend # 查看日志"
echo "   pm2 stop frontend # 停止进程"
echo "   pm2 restart frontend # 重启进程"
echo "   pm2 delete frontend # 删除进程"

pm2 list


