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

echo "🛑 停止现有 Next.js 进程..."
pkill -f "next dev" 2>/dev/null
sleep 2

echo "⚛️ 启动 Next.js 应用..."
pnpm dev &
NEXTJS_PID=$!
echo "Next.js 应用已启动，PID: $NEXTJS_PID"
echo "🌐 http://0.0.0.0:3000"
echo "🛑 停止前端: kill $NEXTJS_PID"

wait $NEXTJS_PID


