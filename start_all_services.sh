#!/bin/bash

echo "🚀 启动所有服务..."

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

echo "📝 日志级别: $LOG_LEVEL"

# 停止现有服务
echo "🛑 停止现有服务..."
pkill -f "python3 api_server_working.py" 2>/dev/null
pkill -f "python3 resume_processor.py" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
sleep 2

# 启动Python ACE API服务器
echo "🐍 启动Python ACE API服务器..."
cd ace_gtv
LOG_LEVEL="$LOG_LEVEL" nohup python3 api_server_working.py > ace_server.log 2>&1 &
ACE_PID=$!
echo "ACE API服务器已启动，PID: $ACE_PID"

# 启动Python简历处理服务
echo "📄 启动Python简历处理服务..."
LOG_LEVEL="$LOG_LEVEL" nohup python3 resume_processor.py > resume_processor.log 2>&1 &
RESUME_PID=$!
echo "简历处理服务已启动，PID: $RESUME_PID"

# 等待Python服务启动
echo "⏳ 等待Python服务启动..."
sleep 5

# 检查Python服务状态
echo "🔍 检查Python服务状态..."
ACE_STATUS=$(curl -s http://localhost:5001/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unhealthy")
RESUME_STATUS=$(curl -s http://localhost:5002/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unhealthy")

if [ "$ACE_STATUS" = "healthy" ]; then
  echo "✅ ACE服务已就绪"
else
  echo "❌ ACE服务未就绪"
fi

if [ "$RESUME_STATUS" = "healthy" ]; then
  echo "✅ 简历处理服务已就绪"
else
  echo "❌ 简历处理服务未就绪"
fi

# 启动Next.js应用
echo "⚛️ 启动Next.js应用..."
cd ..
npm run dev &
NEXTJS_PID=$!
echo "Next.js应用已启动，PID: $NEXTJS_PID"

# 等待Next.js启动
echo "⏳ 等待Next.js应用启动..."
sleep 3

echo ""
echo "✅ 所有服务已启动！"
echo "📡 ACE API: http://localhost:5001"
echo "📄 简历处理: http://localhost:5002"
echo "🌐 Next.js: http://localhost:3000"
echo ""
echo "📋 服务PID:"
echo "  - ACE API: $ACE_PID"
echo "  - 简历处理: $RESUME_PID"
echo "  - Next.js: $NEXTJS_PID"
echo ""
echo "🛑 停止所有服务: kill $ACE_PID $RESUME_PID $NEXTJS_PID"
echo ""
echo "💡 提示: 按 Ctrl+C 停止所有服务"
echo ""

# 设置信号处理
cleanup() {
  echo ""
  echo "🛑 正在停止所有服务..."
  kill $ACE_PID $RESUME_PID $NEXTJS_PID 2>/dev/null
  echo "✅ 所有服务已停止"
  exit 0
}

trap cleanup SIGINT SIGTERM

# 保持脚本运行，但允许正常退出
wait

