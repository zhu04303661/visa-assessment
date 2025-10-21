#!/bin/bash

echo "🚀 启动后端服务 (ACE API + 简历处理)..."

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

echo "🛑 停止现有后端进程..."
pkill -f "python3 api_server_working.py" 2>/dev/null
pkill -f "python3 resume_processor.py" 2>/dev/null
sleep 2

echo "🐍 启动ACE API服务器..."
cd ace_gtv || { echo "❌ 找不到 ace_gtv 目录"; exit 1; }
LOG_LEVEL="$LOG_LEVEL" nohup python3 api_server_working.py > ace_server.log 2>&1 &
ACE_PID=$!
echo "ACE API服务器已启动，PID: $ACE_PID"

echo "📄 启动简历处理服务..."
LOG_LEVEL="$LOG_LEVEL" nohup python3 resume_processor.py > resume_processor.log 2>&1 &
RESUME_PID=$!
echo "简历处理服务已启动，PID: $RESUME_PID"

echo "⏳ 等待服务启动..."
sleep 5

echo "🔍 健康检查..."
curl -s http://localhost:5001/health | jq '.status' 2>/dev/null || echo "ACE服务未就绪"
curl -s http://localhost:5002/health | jq '.status' 2>/dev/null || echo "简历处理服务未就绪"

echo "✅ 后端服务已启动！"
echo "📡 ACE API: http://localhost:5001"
echo "📄 简历处理: http://localhost:5002"
echo "🛑 停止后端服务: kill $ACE_PID $RESUME_PID"

# 保持脚本运行（可选）
wait $ACE_PID $RESUME_PID


