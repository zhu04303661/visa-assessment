#!/bin/bash

echo "🚀 启动后端服务 (ACE API + 简历处理)..."

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
  # 忽略用户级 pip 配置，避免被 global.target 重定向
  export PIP_CONFIG_FILE=/dev/null
  # 设置可靠镜像（如网络受限可切换），并在任何安装失败时退出
  PIP_INDEX_URL=${PIP_INDEX_URL:-https://pypi.org/simple}
  EXTRA_PIP_ARGS=(--find-links "$ROOT_DIR")
  "$PYTHON_BIN" -m pip install --upgrade pip -i "$PIP_INDEX_URL" || { echo "❌ pip 升级失败"; exit 1; }
  if [ -f "$ROOT_DIR/ace_gtv/requirements.txt" ]; then
    # 优先使用本地 wheel（如 openai-*.whl 已随仓库提供），并结合官方索引
    "$PYTHON_BIN" -m pip install --no-cache-dir "${EXTRA_PIP_ARGS[@]}" -r "$ROOT_DIR/ace_gtv/requirements.txt" -i "$PIP_INDEX_URL" || {
      echo "⚠️  依赖安装失败，尝试分步安装 openai 本地 wheel（若存在）...";
      if ls "$ROOT_DIR"/openai-*.whl >/dev/null 2>&1; then
        "$PYTHON_BIN" -m pip install --no-cache-dir "${EXTRA_PIP_ARGS[@]}" "$ROOT_DIR"/openai-*.whl -i "$PIP_INDEX_URL" || { echo "❌ 安装 openai 本地 wheel 失败"; exit 1; }
        # 再次安装其余依赖
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
pkill -f "api_server_working.py" 2>/dev/null
pkill -f "resume_processor.py" 2>/dev/null
sleep 2

echo "🐍 启动ACE API服务器..."
cd "$ROOT_DIR/ace_gtv" || { echo "❌ 找不到 ace_gtv 目录"; exit 1; }
LOG_LEVEL="$LOG_LEVEL" nohup "$PYTHON_BIN" api_server_working.py > ace_server.log 2>&1 &
ACE_PID=$!
echo "ACE API服务器已启动，PID: $ACE_PID"

echo "📄 启动简历处理服务..."
LOG_LEVEL="$LOG_LEVEL" nohup "$PYTHON_BIN" resume_processor.py > resume_processor.log 2>&1 &
RESUME_PID=$!
echo "简历处理服务已启动，PID: $RESUME_PID"

echo "⏳ 等待服务启动..."
sleep 5

echo "🔍 健康检查..."
curl -s http://localhost:5001/health | jq '.status' 2>/dev/null || echo "ACE服务未就绪"
curl -s http://localhost:5002/health | jq '.status' 2>/dev/null || echo "简历处理服务未就绪"

echo "✅ 后端服务已启动！"
echo "📡 ACE API: http://0.0.0.0:5001"
echo "📄 简历处理: http://0.0.0.0:5002"
echo "🛑 停止后端服务: kill $ACE_PID $RESUME_PID"

# 保持脚本运行（可选）
wait $ACE_PID $RESUME_PID


