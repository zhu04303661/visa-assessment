#!/bin/bash

echo "🚀 启动前端 (Next.js)..."

# 解析参数 --debug, --log-level=<LEVEL>, --production/--prod
LOG_LEVEL=${LOG_LEVEL:-INFO}
MODE="development"
BUILD_BEFORE_START=false

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
    --production|--prod)
      MODE="production"
      BUILD_BEFORE_START=true
      shift
      ;;
    *)
      ;;
  esac
done

echo "📝 日志级别(仅记录): $LOG_LEVEL"
echo "🔧 运行模式: $MODE"

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
export NODE_ENV="$MODE"
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

# 清除缓存
echo "🧹 清除缓存..."
CACHE_CLEANED=false

# 清除 Next.js 构建缓存（开发模式下清除，生产模式下保留）
if [ "$MODE" = "development" ]; then
    if [ -d ".next" ]; then
        echo "   📦 清除 .next 构建缓存（开发模式）..."
        rm -rf .next
        CACHE_CLEANED=true
    fi
else
    echo "   ℹ️  生产模式：保留 .next 构建文件"
fi


# 生产模式：先构建应用
if [ "$MODE" = "production" ]; then
    echo "🏗️  生产模式：开始构建..."
    
    # 检查是否安装了 pnpm
    if command -v pnpm >/dev/null 2>&1; then
        echo "   📦 使用 pnpm 构建..."
        BUILD_CMD="pnpm run build"
    else
        echo "   📦 使用 npm 构建..."
        BUILD_CMD="npm run build"
    fi
    
    echo "   📤 执行构建命令: $BUILD_CMD"
    $BUILD_CMD
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败，退出"
        exit 1
    fi
    echo "✅ 构建完成"
    
    # 验证构建结果
    if [ ! -d ".next" ] || [ -z "$(ls -A .next/static 2>/dev/null)" ]; then
        echo "⚠️  警告: 构建目录为空或不完整"
    else
        echo "✅ 构建文件验证通过"
        echo "   📊 静态文件统计:"
        echo "      - CSS文件: $(find .next/static/css -name '*.css' 2>/dev/null | wc -l) 个"
        echo "      - JS文件: $(find .next/static/chunks -name '*.js' 2>/dev/null | wc -l) 个"
    fi
fi

echo "⚛️ 启动 Next.js 应用 (端口 80, 模式: $MODE)..."
# 检查node是否有绑定80端口的权限
NODE_PATH=$(which node)

# 检查是否安装了 pnpm
if command -v pnpm >/dev/null 2>&1; then
    echo "✅ 检测到 pnpm，使用 pnpm 启动"
    START_CMD="pnpm -- run dev"
    if [ "$MODE" = "production" ]; then
        START_CMD="pnpm -- start"
    fi
else
    echo "⚠️  未检测到 pnpm，使用 npm 启动"
    START_CMD="npm -- run dev"
    if [ "$MODE" = "production" ]; then
        START_CMD="npm -- start"
    fi
fi
echo "📝 启动命令: $START_CMD"

if ! getcap "$NODE_PATH" 2>/dev/null | grep -q "cap_net_bind_service"; then
    echo "🔧 设置node绑定80端口权限..."
    sudo setcap 'cap_net_bind_service=+ep' "$NODE_PATH" 2>/dev/null || {
        echo "⚠️  无法设置权限，尝试使用sudo启动PM2..."
        echo "📤 执行启动命令: sudo -E pm2 start --name frontend $START_CMD"
        sudo -E pm2 start --name frontend $START_CMD
        echo "✅ PM2启动命令已执行（使用sudo）"
    }
else
    echo "✅ node已有绑定80端口权限"
    # 使用PM2启动应用，确保SSH退出后继续运行
    echo "📤 执行启动命令: pm2 start --name frontend $START_CMD"
    echo "📋 启动参数:"
    echo "   - 进程名称: frontend"
    echo "   - 运行模式: $MODE"
    echo "   - 端口: 80"
    echo "   - 命令: $START_CMD"
    pm2 start --name frontend $START_CMD
    if [ $? -eq 0 ]; then
        echo "✅ PM2启动命令执行成功"
    else
        echo "❌ PM2启动命令执行失败，退出码: $?"
        exit 1
    fi
fi

echo "✅ Next.js 应用已通过PM2启动 ($MODE 模式)"
echo "🌐 http://0.0.0.0:80"
echo "📋 PM2 管理命令:"
echo "   pm2 list          # 查看进程状态"
echo "   pm2 logs frontend # 查看日志"
echo "   pm2 stop frontend # 停止进程"
echo "   pm2 restart frontend # 重启进程"
echo "   pm2 delete frontend # 删除进程"
echo ""
echo "💡 使用提示:"
echo "   开发模式: ./start_frontend.sh"
echo "   生产模式: ./start_frontend.sh --production"
echo "   调试模式: ./start_frontend.sh --debug"

pm2 list


