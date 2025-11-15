#!/bin/bash

# GTV评估系统统一后端服务 - 增强版
# 包含进程守护、自动重启、健康监控、资源限制等功能

set -euo pipefail  # 严格的错误处理

# 配置参数
MAX_RESTARTS=5              # 最大重启次数
RESTART_INTERVAL=10         # 重启间隔(秒)
HEALTH_CHECK_INTERVAL=30    # 健康检查间隔(秒)
MAX_LOG_SIZE=100M           # 日志文件最大大小
MAX_LOG_FILES=5             # 保留的日志文件数量
MEMORY_LIMIT=2G             # 内存限制
CPU_LIMIT=1.0               # CPU限制 (100%)
STARTUP_TIMEOUT=60          # 启动超时时间(秒)

echo "🚀 启动GTV评估系统统一后端服务 - 优化版..."

# 设定项目根目录与首选 Python 解释器
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
# 查找可用的 Python 解释器
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  PYTHON_BIN=""
fi

# 日志函数
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$ROOT_DIR/backend_startup.log"
}

info() { log "INFO" "$@"; }
warn() { log "WARN" "$@"; }
error() { log "ERROR" "$@"; }
debug() { [[ "${LOG_LEVEL:-INFO}" == "DEBUG" ]] && log "DEBUG" "$@"; }

# 错误处理函数
handle_error() {
    local line_number=$1
    error "脚本在 $line_number 行执行失败"
    cleanup_processes
    exit 1
}

trap 'handle_error $LINENO' ERR

# 清理函数
cleanup_processes() {
    info "正在清理后端进程..."
    local processes=("api_server.py" "api_server_working.py" "resume_processor.py" "scoring_agent_api.py" "document_api.py")

    for proc in "${processes[@]}"; do
        if pgrep -f "$proc" >/dev/null 2>&1; then
            pkill -f "$proc" 2>/dev/null || true
            sleep 2
            pkill -9 -f "$proc" 2>/dev/null || true  # 强制终止
        fi
    done
}

# 日志轮转函数
rotate_logs() {
    local log_file=$1
    if [[ -f "$log_file" ]] && [[ -s "$log_file" ]] && [[ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0) -gt $(numfmt --from=iec "$MAX_LOG_SIZE" 2>/dev/null || echo 104857600) ]]; then
        local log_dir=$(dirname "$log_file")
        local log_name=$(basename "$log_file" .log)

        # 删除最老的日志文件
        if [[ -f "${log_dir}/${log_name}.${MAX_LOG_FILES}.log" ]]; then
            rm -f "${log_dir}/${log_name}.${MAX_LOG_FILES}.log"
        fi

        # 轮转现有日志文件
        for ((i=MAX_LOG_FILES-1; i>=1; i--)); do
            if [[ -f "${log_dir}/${log_name}.${i}.log" ]]; then
                mv "${log_dir}/${log_name}.${i}.log" "${log_dir}/${log_name}.$((i+1)).log"
            fi
        done

        # 重命名当前日志文件
        mv "$log_file" "${log_dir}/${log_name}.1.log"
        info "日志文件已轮转: $log_file"
    fi
}

# 系统资源检查
check_system_resources() {
    info "检查系统资源..."

    # 检查内存
    if command -v free >/dev/null 2>&1; then
        local available_mem=$(free -b 2>/dev/null | awk 'NR==2{print $7}' || echo 0)
        local required_mem=$(numfmt --from=iec "${MEMORY_LIMIT}" 2>/dev/null || echo 2147483648)
        if [[ $available_mem -lt $required_mem ]]; then
            warn "可用内存不足，可能需要更多内存"
        fi
    fi

    # 检查磁盘空间
    local available_space=$(df -B1 "$ROOT_DIR" 2>/dev/null | awk 'NR==2 {print $4}' || echo 0)
    local required_space=$((1 * 1024 * 1024 * 1024))  # 1GB
    if [[ $available_space -lt $required_space ]]; then
        error "磁盘空间不足，需要至少 1GB"
        return 1
    fi

    info "系统资源检查通过"
}

# 健康检查函数
health_check() {
    local port=$1
    local max_attempts=3
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if command -v curl >/dev/null 2>&1; then
            if curl -s --max-time 10 "http://localhost:${port}/health" 2>/dev/null | grep -q "healthy"; then
                info "健康检查通过 (端口: $port)"
                return 0
            fi
        elif command -v wget >/dev/null 2>&1; then
            if wget -q -O - --timeout=10 "http://localhost:${port}/health" 2>/dev/null | grep -q "healthy"; then
                info "健康检查通过 (端口: $port)"
                return 0
            fi
        fi

        debug "健康检查失败 (端口: $port, 尝试: $attempt/$max_attempts)"
        sleep 3
        ((attempt++))
    done

    error "健康检查失败 (端口: $port)"
    return 1
}

# 检查端口占用
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i:${port} >/dev/null 2>&1; then
            warn "端口 $port 已被占用，尝试释放..."
            # 尝试释放端口相关的进程
            local pids=$(lsof -ti:${port} 2>/dev/null || true)
            if [[ -n "$pids" ]]; then
                kill $pids 2>/dev/null || true
                sleep 2
                kill -9 $pids 2>/dev/null || true
            fi
        fi
    fi

    # 再次检查端口
    sleep 3
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost $port 2>/dev/null; then
            error "端口 $port 仍被占用"
            return 1
        fi
    fi

    return 0
}

info "🚀 启动GTV评估系统统一后端服务..."

# 优先使用已存在的虚拟环境，其次尝试创建 .venv

# 从 .env.local 读取配置（如果存在）
if [ -f "$ROOT_DIR/.env.local" ]; then
  echo "📖 读取 .env.local 配置..."
  # 使用 grep 和 awk 安全地读取环境变量（不执行任何代码）
  # 只读取 PIP_MIRROR 变量以避免意外加载其他变量
  ENV_PIP_MIRROR=$(grep "^PIP_MIRROR=" "$ROOT_DIR/.env.local" | cut -d'=' -f2 | tr -d ' "'"'"'')
  if [ -n "$ENV_PIP_MIRROR" ]; then
    # 如果命令行未指定 PIP_MIRROR，则使用 .env.local 中的值
    if [ -z "${PIP_MIRROR:-}" ]; then
      PIP_MIRROR="$ENV_PIP_MIRROR"
      echo "✅ 从 .env.local 读取 PIP_MIRROR=$PIP_MIRROR"
    fi
  fi
fi

# 安装依赖
if [ -n "$PYTHON_BIN" ] && command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "📦 使用 $PYTHON_BIN 安装依赖..."
  export PIP_CONFIG_FILE=/dev/null
  
  # 国内源加速配置
  # 支持三种方式配置 PIP_MIRROR（优先级从高到低）：
  # 1. 命令行环境变量: PIP_MIRROR=aliyun ./start_backend.sh
  # 2. .env.local 文件: PIP_MIRROR=aliyun
  # 3. 默认使用官方源
  if [ "${PIP_MIRROR:-}" = "domestic" ] || [ "${PIP_MIRROR:-}" = "aliyun" ] || [ "${PIP_MIRROR:-}" = "douban" ] || [ "${PIP_MIRROR:-}" = "tsinghua" ]; then
    case "${PIP_MIRROR:-}" in
      aliyun|domestic)
        echo "🚀 使用阿里云加速源"
        PIP_INDEX_URL="https://mirrors.aliyun.com/pypi/simple/"
        ;;
      douban)
        echo "🚀 使用豆瓣加速源"
        PIP_INDEX_URL="https://pypi.douban.com/simple"
        ;;
      tsinghua)
        echo "🚀 使用清华大学加速源"
        PIP_INDEX_URL="https://pypi.tuna.tsinghua.edu.cn/simple"
        ;;
    esac
  else
    echo "📡 使用官方 PyPI 源 (如需加速，设置 PIP_MIRROR=domestic/aliyun/douban/tsinghua)"
    PIP_INDEX_URL=${PIP_INDEX_URL:-https://pypi.org/simple}
  fi
  
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
  echo "❌ 未找到可用的 Python 解释器"
  echo "   请确保已安装 Python 3，并且 python3 或 python 命令在 PATH 中"
  echo "   可以通过以下命令检查："
  echo "     which python3"
  echo "     which python"
  exit 1
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
pkill -f "api_server.py" 2>/dev/null || true
pkill -f "api_server_working.py" 2>/dev/null || true
pkill -f "resume_processor.py" 2>/dev/null || true
pkill -f "scoring_agent_api.py" 2>/dev/null || true
pkill -f "document_api.py" 2>/dev/null || true
sleep 2

echo "🚀 启动GTV统一API服务器..."
cd "$ROOT_DIR/ace_gtv" || { echo "❌ 找不到 ace_gtv 目录"; exit 1; }

# 确保日志目录存在
mkdir -p "$ROOT_DIR/ace_gtv/logs"
LOG_FILE="$ROOT_DIR/ace_gtv/logs/api_server_unified.log"

PORT=$API_PORT LOG_LEVEL="$LOG_LEVEL" nohup "$PYTHON_BIN" api_server.py > "$LOG_FILE" 2>&1 &
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
echo "📋 日志位置:"
echo "   • 统一日志: $LOG_FILE"
echo "   • 模块日志目录: $ROOT_DIR/ace_gtv/logs/"
echo ""
echo "📂 查看日志命令:"
echo "   • tail -f $LOG_FILE"
echo "   • ls -la $ROOT_DIR/ace_gtv/logs/"
echo ""

if [ "$BACKGROUND_MODE" = true ]; then
    echo "🔄 后台模式运行中，PID: $API_PID"
    exit 0
else
    # 保持脚本运行
    wait $API_PID 2>/dev/null
fi


