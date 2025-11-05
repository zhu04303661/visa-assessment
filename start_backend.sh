#!/bin/bash

echo "🚀 启动GTV评估系统统一后端服务..."

# 设定项目根目录与首选 Python 解释器
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON_BIN="python3"

# 优先使用已存在的虚拟环境，其次尝试创建 .venv
if [ -x "$ROOT_DIR/myenv/bin/python" ]; then
PYTHON_BIN="$ROOT_DIR/myenv/bin/python"
elif [ -x "$ROOT_DIR/.venv/bin/python" ]; then
PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
else
  if command -v python3 >/dev/null 2>&1; then
    echo "🧰 未检测到虚拟环境，正在创建 .venv..."
    python3 -m venv "$ROOT_DIR/.venv" || {
      echo "❌ 创建虚拟环境失败"; exit 1; }
    PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
  elif command -v python >/dev/null 2>&1; then
    echo "🧰 未检测到虚拟环境，正在创建 .venv..."
    python -m venv "$ROOT_DIR/.venv" || {
      echo "❌ 创建虚拟环境失败"; exit 1; }
    PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
  fi
fi

# 安装依赖
if [ -x "$PYTHON_BIN" ]; then
  echo "📦 使用 $PYTHON_BIN 安装依赖..."
  export PIP_CONFIG_FILE=/dev/null
  PIP_INDEX_URL=${PIP_INDEX_URL:-https://pypi.org/simple}
  EXTRA_PIP_ARGS=(--find-links "$ROOT_DIR")
  "$PYTHON_BIN" -m pip install --upgrade pip -i "$PIP_INDEX_URL" || { echo "❌ pip 升级失败"; exit 1; }
  if [ -f "$ROOT_DIR/ace_gtv/requirements.txt" ]; then
    "$PYTHON_BIN" -m pip install --no-cache-dir "${EXTRA_PIP_ARGS[@]}" -r "$ROOT_DIR/ace_gtv/requirements.txt" -i "$PIP_INDEX_URL" || {
      echo "⚠️  依赖安装失败，尝试分步安装...";
      if ls "$ROOT_DIR"/openai-*.whl >/dev/null 2>&1; then
        "$PYTHON_BIN" -m pip install --no-cache-dir "${EXTRA_PIP_ARGS[@]}" "$ROOT_DIR"/openai-*.whl -i "$PIP_INDEX_URL" || { echo "❌ 安装 openai 本地 wheel 失败"; exit 1; }
        "$PYTHON_BIN" -m pip install --no-cache-dir "${EXTRA_PIP_ARGS[@]}" -r "$ROOT_DIR/ace_gtv/requirements.txt" -i "$PIP_INDEX_URL" || { echo "❌ 依赖安装仍失败"; exit 1; }
      else
        echo "❌ 未找到 openai 本地 wheel，依赖安装失败"; exit 1;
      fi
    }
  else
    echo "⚠️  未找到 requirements.txt，跳过依赖安装"
  fi
else
  echo "❌ 未找到可用的 Python 解释器"; exit 1
fi

# 解析参数
LOG_LEVEL=${LOG_LEVEL:-INFO}
BACKGROUND_MODE=false
API_PORT=5005

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
    --background)
      BACKGROUND_MODE=true
      shift
      ;;
    --port=*)
      API_PORT="${arg#*=}"
      shift
      ;;
    *)
      ;;
  esac
done

echo "📝 日志级别: $LOG_LEVEL"
echo "🔌 API端口: $API_PORT"

echo "🛑 停止现有后端进程..."
pkill -f "api_server.py" 2>/dev/null
pkill -f "api_server_working.py" 2>/dev/null
pkill -f "resume_processor.py" 2>/dev/null
pkill -f "scoring_agent_api.py" 2>/dev/null
pkill -f "document_api.py" 2>/dev/null
sleep 2

echo "🚀 启动GTV统一API服务器..."
cd "$ROOT_DIR/ace_gtv" || { echo "❌ 找不到 ace_gtv 目录"; exit 1; }

PORT=$API_PORT LOG_LEVEL="$LOG_LEVEL" nohup "$PYTHON_BIN" api_server.py > /tmp/api_server_unified.log 2>&1 &
API_PID=$!
echo "✅ GTV统一API服务器已启动，PID: $API_PID"

echo "⏳ 等待服务启动..."
sleep 5

echo "🔍 健康检查..."
if command -v curl >/dev/null 2>&1; then
    curl -s http://localhost:$API_PORT/health | grep -q "healthy" && echo "✅ API服务健康检查通过" || echo "⚠️  API服务未就绪"
else
    echo "⚠️  curl 未安装，跳过健康检查"
fi

echo ""
echo "✅ 后端服务已启动！"
echo "════════════════════════════════════════════════════════════════"
echo "🌐 GTV统一API服务"
echo "   HTTP: http://localhost:$API_PORT"
echo "   • 评分分析: /api/scoring/*"
echo "   • 文档分析: /api/documents/*"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "快速命令:"
echo "  healthcheck: curl http://localhost:$API_PORT/health"
echo "  kill server: pkill -f api_server.py"
echo ""

# 获取本地IP地址
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo "📡 API服务: http://$LOCAL_IP:$API_PORT"
echo ""
echo "日志位置: /tmp/api_server_unified.log"
echo ""

if [ "$BACKGROUND_MODE" = true ]; then
    echo "🔄 后台模式运行中，PID: $API_PID"
    exit 0
else
    # 保持脚本运行
    wait $API_PID 2>/dev/null
fi


