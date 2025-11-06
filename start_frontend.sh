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

# Set environment variables for the application
export NODE_ENV="development"
export LOG_LEVEL="$LOG_LEVEL"

echo "🛑 停止现有 PM2 进程..."
pm2 stop frontend 2>/dev/null
pm2 delete frontend 2>/dev/null

echo "⚛️ 启动 Next.js 应用..."
# 使用PM2启动应用，确保SSH退出后继续运行
pm2 start --name frontend npm -- run dev

echo "✅ Next.js 应用已通过PM2启动"
echo "🌐 http://0.0.0.0:3000"
echo "📋 PM2 管理命令:"
echo "   pm2 list          # 查看进程状态"
echo "   pm2 logs frontend # 查看日志"
echo "   pm2 stop frontend # 停止进程"
echo "   pm2 restart frontend # 重启进程"
echo "   pm2 delete frontend # 删除进程"

pm2 list


