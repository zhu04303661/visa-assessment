#!/bin/bash

# ================================================================
# GTV项目统一启动脚本 - 前后端合并版本
# 支持开发/生产模式，智能端口管理，自修复功能
# ================================================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 默认配置
MODE="production"   # 默认生产模式
PORT=80             # 前端端口 - 生产环境使用80端口
API_PORT=5005       # 后端端口
SKIP_DEPS=false
LOG_LEVEL="INFO"
NO_BACKGROUND=false
CLEAN_START=false
SKIP_BUILD=false    # 跳过构建（如果已有构建产物）

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 显示帮助信息
show_help() {
    cat << EOF
${CYAN}GTV项目统一启动脚本${NC}

${GREEN}用法：${NC} $0 [选项]

${BLUE}选项：${NC}
  --development, -dev   开发模式
  --production, -prod   生产模式（默认）
  --port=PORT          前端端口（默认: 80）
  --api-port=PORT      后端端口（默认: 5005）
  --skip-deps          跳过依赖安装
  --skip-build         跳过构建（使用现有构建产物）
  --clean              清理启动（清除缓存等）
  --no-background      不启动后台服务
  --debug              调试模式
  --help, -h           显示帮助

${BLUE}示例：${NC}
  $0                   # 开发模式启动
  $0 --production     # 生产模式启动
  $0 --port=8080      # 自定义端口
  $0 --clean --debug  # 清理+调试模式

EOF
    exit 0
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --development|-dev)
            MODE="development"
            shift
            ;;
        --production|-prod)
            MODE="production"
            shift
            ;;
        --port=*)
            PORT="${1#*=}"
            shift
            ;;
        --api-port=*)
            API_PORT="${1#*=}"
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --clean)
            CLEAN_START=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --no-background)
            NO_BACKGROUND=true
            shift
            ;;
        --debug)
            LOG_LEVEL="DEBUG"
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            exit 1
            ;;
    esac
done

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC}  $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC}  $1"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC}  $1"
}

# 检查端口占用
check_port() {
    local port=$1
    local name=$2

    if command -v lsof >/dev/null 2>&1; then
        if lsof -i:${port} >/dev/null 2>&1; then
            warn "端口 $port ($name) 被占用，尝试释放..."
            lsof -ti:${port} | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    fi
}

# 检查必要依赖
check_dependencies() {
    log "检查系统依赖..."

    # 检查Node.js
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js未安装，请先安装Node.js"
        exit 1
    fi
    success "Node.js: $(node --version)"

    # 检查npm
    if ! command -v npm >/dev/null 2>&1; then
        error "npm未安装，请先安装npm"
        exit 1
    fi
    success "npm: $(npm --version)"

    # 检查Python
    if ! command -v python3 >/dev/null 2>&1; then
        error "Python3未安装，请先安装Python3"
        exit 1
    fi
    success "Python3: $(python3 --version)"

    # 安装PM2（如果不存在）
    if ! command -v pm2 >/dev/null 2>&1; then
        log "安装PM2进程管理器..."
        npm install -g pm2
        success "PM2安装完成"
    fi

    # 检查并安装pnpm（优选）
    if ! command -v pnpm >/dev/null 2>&1; then
        log "安装pnpm..."
        npm install -g pnpm
        success "pnpm安装完成"
    fi

    # 安装Python虚拟环境依赖
    if ! python3 -m venv --help >/dev/null 2>&1; then
        log "安装Python虚拟环境支持..."
        sudo apt-get update && sudo apt-get install -y python3-venv
    fi
}

# 设置Python虚拟环境
setup_python_env() {
    log "设置Python环境..."

    if [ ! -d "$ROOT_DIR/.venv" ]; then
        log "创建Python虚拟环境..."
        python3 -m venv "$ROOT_DIR/.venv"
        success "虚拟环境创建完成"
    fi

    # 激活虚拟环境
    source "$ROOT_DIR/.venv/bin/activate"

    # 检查并安装依赖
    if [ "$SKIP_DEPS" = false ] && [ -f "$ROOT_DIR/ace_gtv/requirements.txt" ]; then
        log "安装Python依赖..."
        python3 -m pip install --upgrade pip 2>/dev/null || true
        python3 -m pip install -r "$ROOT_DIR/ace_gtv/requirements.txt" 2>/dev/null || {
            warn "部分依赖安装失败，继续启动..."
        }
        success "Python依赖安装完成"
    fi
}

# 清理缓存文件
clean_cache() {
    if [ "$CLEAN_START" = true ] || [ "$MODE" = "development" ]; then
        log "清理缓存文件..."

        # 清理Next.js缓存
        if [ -d "$ROOT_DIR/.next" ]; then
            rm -rf "$ROOT_DIR/.next"
            success "清理Next.js缓存"
        fi

        # 清理Node.js模块缓存
        if [ -d "$ROOT_DIR/node_modules/.cache" ]; then
            rm -rf "$ROOT_DIR/node_modules/.cache"
            success "清理Node模块缓存"
        fi

        # 清理Python缓存
        find "$ROOT_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
        find "$ROOT_DIR" -name "*.pyc" -delete 2>/dev/null || true

        success "清理缓存完成"
    fi
}

# 安装Node.js依赖
install_node_deps() {
    if [ "$SKIP_DEPS" = false ]; then
        log "安装Node.js依赖..."

        if command -v pnpm >/dev/null 2>&1; then
            pnpm install
        else
            npm install
        fi

        success "Node.js依赖安装完成"
    fi
}

# 停止现有服务
stop_existing_services() {
    log "停止现有服务..."

    # 停止PM2进程
    pm2 stop frontend backend 2>/dev/null || true
    pm2 delete frontend backend 2>/dev/null || true

    # 停止Python进程
    pkill -f "api_server.py" 2>/dev/null || true
    pkill -f "api_server_working.py" 2>/dev/null || true

    # 停止Node进程
    pkill -f "next dev\|next start" 2>/dev/null || true
    pkill -f "npm run dev\|npm start" 2>/dev/null || true

    sleep 2
    success "旧服务已停止"
}

# 启动后端服务
start_backend() {
    log "启动后端API服务..."

    cd "$ROOT_DIR/ace_gtv"

    # 创建必要目录
    mkdir -p logs uploads copywriting_projects success_cases

    # 设置环境变量
    export PORT="$API_PORT"
    export LOG_LEVEL="$LOG_LEVEL"
    export DEBUG="true"

    if [ "$NO_BACKGROUND" = true ]; then
        # 前台运行
        log "后端服务将在前台运行..."
        python3 api_server.py &
        BACKEND_PID=$!
        echo "$BACKEND_PID" > "$ROOT_DIR/.backend.pid"
    else
        # 后台运行
        if pm2 list | grep -q "backend"; then
            pm2 restart backend --update-env
        else
            pm2 start --name backend api_server.py
        fi
        success "后端API服务已通过PM2启动"
    fi

    cd "$ROOT_DIR"

    # 等待服务启动
    sleep 3

    # 健康检查
    if curl -s --max-time 5 "http://localhost:${API_PORT}/health" | grep -q "healthy"; then
        success "后端服务启动成功 (端口: $API_PORT)"
    else
        warn "后端服务可能还在启动中..."
    fi
}

# 启动前端服务
start_frontend() {
    log "启动前端服务..."

    # 设置环境变量
    export NODE_ENV="$MODE"
    export PORT="$PORT"
    export NEXT_PUBLIC_API_URL="http://localhost:$API_PORT"

    # 生产模式：先构建再启动（除非跳过构建）
    if [ "$MODE" = "production" ] && [ "$SKIP_BUILD" = false ]; then
        # 检查是否已有构建产物
        if [ -d ".next/static" ] && [ -n "$(ls -A .next/static 2>/dev/null)" ]; then
            log "检测到现有构建产物，跳过构建"
        else
            log "构建生产版本..."
            if command -v pnpm >/dev/null 2>&1; then
                pnpm run build
            else
                npm run build
            fi
            success "构建完成"
        fi
    elif [ "$MODE" = "production" ] && [ "$SKIP_BUILD" = true ]; then
        log "跳过构建（使用现有构建产物）"
    fi

    # 验证生产模式下的构建产物
    if [ "$MODE" = "production" ]; then
        if [ ! -d ".next/static" ] || [ -z "$(ls -A .next/static 2>/dev/null)" ]; then
            error "未找到构建产物，请先运行构建"
            log "执行构建..."
            if command -v pnpm >/dev/null 2>&1; then
                pnpm run build
            else
                npm run build
            fi
        fi
        # 检查 CSS 文件是否存在
        CSS_COUNT=$(find .next/static -name "*.css" 2>/dev/null | wc -l)
        if [ "$CSS_COUNT" -eq 0 ]; then
            warn "警告：未检测到 CSS 文件，可能存在样式问题"
        else
            success "检测到 $CSS_COUNT 个 CSS 文件"
        fi
    fi

    # 设置80端口权限（生产环境需要）
    if [ "$PORT" -lt 1024 ]; then
        NODE_PATH=$(which node 2>/dev/null || echo "/usr/bin/node")
        if ! getcap "$NODE_PATH" 2>/dev/null | grep -q "cap_net_bind_service"; then
            log "设置 Node.js 低端口绑定权限..."
            sudo setcap 'cap_net_bind_service=+ep' "$NODE_PATH" 2>/dev/null || {
                warn "无法设置权限，尝试使用 sudo..."
            }
        fi
    fi

    if [ "$NO_BACKGROUND" = true ]; then
        # 前台运行
        log "前端服务将在前台运行..."
        if [ "$MODE" = "production" ]; then
            pnpm run start &
        else
            if command -v pnpm >/dev/null 2>&1; then
                pnpm dev &
            else
                npm run dev &
            fi
        fi
        FRONTEND_PID=$!
        echo "$FRONTEND_PID" > "$ROOT_DIR/.frontend.pid"
    else
        # 后台运行（使用 PM2）
        if [ "$MODE" = "production" ]; then
            # 生产模式
            pm2 delete frontend 2>/dev/null || true
            pm2 start --name frontend "pnpm run start"
        else
            # 开发模式
            if command -v pnpm >/dev/null 2>&1; then
                CMD="pnpm dev"
            else
                CMD="npm run dev"
            fi
            pm2 delete frontend 2>/dev/null || true
            pm2 start --name frontend "$CMD"
        fi
        success "前端服务已通过 PM2 启动"
    fi

    # 等待服务启动
    sleep 5

    # 健康检查（最多重试3次）
    for i in 1 2 3; do
        if curl -s --max-time 10 "http://localhost:${PORT}" >/dev/null 2>&1; then
            success "前端服务启动成功 (端口: $PORT)"
            return 0
        fi
        log "等待服务启动... ($i/3)"
        sleep 3
    done
    warn "前端服务可能还在启动中，请检查日志: pm2 logs frontend"
}

# 显示服务状态
show_service_status() {
    echo ""
    echo -e "${PURPLE}════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  服务状态                                            ${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}🌐 前端服务${NC}"
    echo "   地址: http://localhost:$PORT"
    echo "   模式: $MODE"
    echo ""
    echo -e "${GREEN}🐍 后端API${NC}"
    echo "   地址: http://localhost:$API_PORT"
    echo "   日志级别: $LOG_LEVEL"
    echo ""
    echo -e "${BLUE}快捷命令：${NC}"
    echo "  查看进程: pm2 list"
    echo "  查看日志: pm2 logs [frontend|backend]"
    echo "  停止服务: pm2 stop [frontend|backend]"
    echo "  重启服务: pm2 restart [frontend|backend]"
    echo ""

    if [ "$NO_BACKGROUND" = false ]; then
        echo -e "${YELLOW}💡 提示：服务在后台运行，使用 pm2 命令管理${NC}"
    else
        echo -e "${YELLOW}💡 提示：服务在前台运行，按 Ctrl+C 停止${NC}"
    fi
    echo ""
}

# 主函数
main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              GTV项目统一启动脚本                       ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    log "启动参数:"
    log "  模式: $MODE"
    log "  前端端口: $PORT"
    log "  后端端口: $API_PORT"
    log "  日志级别: $LOG_LEVEL"
    log "  跳过构建: $SKIP_BUILD"
    log "  清理启动: $CLEAN_START"

    # 检查依赖
    check_dependencies

    # 检查端口
    check_port "$PORT" "前端服务"
    check_port "$API_PORT" "后端API"

    # 停止现有服务
    stop_existing_services

    # 清理缓存
    clean_cache

    # 设置Python环境
    setup_python_env

    # 安装依赖
    install_node_deps

    # 创建必要目录
    mkdir -p "$ROOT_DIR/logs"

    # 启动后端
    start_backend

    # 启动前端
    start_frontend

    # 显示状态
    show_service_status

    # 如果前台运行，等待用户中断
    if [ "$NO_BACKGROUND" = true ]; then
        trap 'echo ""; log "正在停止服务..."; kill $(cat "$ROOT_DIR/.backend.pid" 2>/dev/null) 2>/dev/null; kill $(cat "$ROOT_DIR/.frontend.pid" 2>/dev/null) 2>/dev/null; success "服务已停止"; exit 0' INT
        wait
    fi
}

# 运行主函数
main "$@"