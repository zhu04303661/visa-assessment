#!/bin/bash

# ============================================================================
# GTV评估系统 - 统一后端API服务启动脚本
# 单一服务整合：GTV评估 + AI文案 + 材料收集
# ============================================================================

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
API_PORT=${PORT:-5005}
LOG_LEVEL=${LOG_LEVEL:-INFO}
BACKGROUND_MODE=false
SKIP_DEPS=false

echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}     GTV签证评估系统 - 统一后端API服务                          ${NC}"
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# 设定项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 解析参数
for arg in "$@"; do
    case $arg in
        --debug)
            LOG_LEVEL=DEBUG
            ;;
        --log-level=*)
            LOG_LEVEL="${arg#*=}"
            ;;
        --background)
            BACKGROUND_MODE=true
            ;;
        --skip-deps)
            SKIP_DEPS=true
            ;;
        --port=*)
            API_PORT="${arg#*=}"
            ;;
        --help|-h)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --debug              启用调试模式"
            echo "  --log-level=LEVEL    设置日志级别 (DEBUG/INFO/WARN/ERROR)"
            echo "  --background         后台运行"
            echo "  --skip-deps          跳过依赖安装"
            echo "  --port=PORT          API端口 (默认: 5005)"
            echo ""
            exit 0
            ;;
        *)
            ;;
    esac
done

# 查找Python解释器
find_python() {
    if [ -d "$ROOT_DIR/.venv" ]; then
        echo "$ROOT_DIR/.venv/bin/python"
    elif [ -d "$ROOT_DIR/venv" ]; then
        echo "$ROOT_DIR/venv/bin/python"
    elif command -v python3 >/dev/null 2>&1; then
        echo "python3"
    elif command -v python >/dev/null 2>&1; then
        echo "python"
    else
        echo ""
    fi
}

PYTHON_BIN=$(find_python)
if [ -z "$PYTHON_BIN" ]; then
    echo -e "${RED}错误: 未找到Python解释器${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Python: $PYTHON_BIN"

# 激活虚拟环境
if [ -d "$ROOT_DIR/.venv" ]; then
    source "$ROOT_DIR/.venv/bin/activate"
    echo -e "${GREEN}✓${NC} 虚拟环境: .venv"
elif [ -d "$ROOT_DIR/venv" ]; then
    source "$ROOT_DIR/venv/bin/activate"
    echo -e "${GREEN}✓${NC} 虚拟环境: venv"
fi

# 加载环境变量
if [ -f "$ROOT_DIR/.env.local" ]; then
    set -a
    source "$ROOT_DIR/.env.local"
    set +a
    echo -e "${GREEN}✓${NC} 环境变量: .env.local"
fi

# 安装依赖
if [ "$SKIP_DEPS" = false ] && [ -f "$ROOT_DIR/ace_gtv/requirements.txt" ]; then
    echo -e "${BLUE}检查依赖...${NC}"
    "$PYTHON_BIN" -m pip install -q --upgrade pip 2>/dev/null || true
    "$PYTHON_BIN" -m pip install -q -r "$ROOT_DIR/ace_gtv/requirements.txt" 2>/dev/null || {
        echo -e "${YELLOW}⚠ 部分依赖安装失败，继续启动...${NC}"
    }
fi

# 停止现有服务
echo ""
echo -e "${BLUE}停止现有进程...${NC}"
pkill -f "api_server.py" 2>/dev/null || true
pkill -f "copywriting_api.py" 2>/dev/null || true
sleep 2

# 检查端口
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i:${port} >/dev/null 2>&1; then
            echo -e "${YELLOW}端口 $port 已被占用，尝试释放...${NC}"
            lsof -ti:${port} | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    fi
}
check_port $API_PORT

# 确保目录存在
mkdir -p "$ROOT_DIR/ace_gtv/logs"
mkdir -p "$ROOT_DIR/ace_gtv/uploads"
mkdir -p "$ROOT_DIR/ace_gtv/copywriting_projects"
mkdir -p "$ROOT_DIR/ace_gtv/success_cases"

# 启动服务
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  启动统一API服务                                              ${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

LOG_FILE="$ROOT_DIR/ace_gtv/logs/api_server.log"
cd "$ROOT_DIR/ace_gtv"

if [ "$BACKGROUND_MODE" = true ]; then
    # 后台运行
    PORT=$API_PORT LOG_LEVEL="$LOG_LEVEL" DEBUG=true nohup "$PYTHON_BIN" api_server.py > "$LOG_FILE" 2>&1 &
    API_PID=$!
    echo "$API_PID" > "$ROOT_DIR/.api_server.pid"
    
    echo -e "  ${GREEN}✓${NC} 服务已在后台启动"
    echo "  PID: $API_PID"
    echo ""
    
    # 等待服务启动
    echo "等待服务启动..."
    sleep 5
    
    # 健康检查
    if command -v curl >/dev/null 2>&1; then
        if curl -s --max-time 10 "http://localhost:${API_PORT}/health" 2>/dev/null | grep -q "healthy"; then
            echo -e "  ${GREEN}✓${NC} 健康检查通过"
        else
            echo -e "  ${YELLOW}⚠${NC} 服务可能仍在启动中..."
        fi
    fi
else
    # 前台运行
    PORT=$API_PORT LOG_LEVEL="$LOG_LEVEL" DEBUG=true "$PYTHON_BIN" api_server.py
    exit 0
fi

# 输出服务信息
echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  服务已启动                                                    ${NC}"
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}┌────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│  GTV统一API服务                                                │${NC}"
echo -e "${GREEN}├────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}│  ${NC}地址: http://localhost:$API_PORT"
echo -e "${GREEN}│  ${NC}PID:  $API_PID"
echo -e "${GREEN}│  ${NC}日志: $LOG_FILE"
echo -e "${GREEN}├────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}│  ${NC}功能模块:"
echo -e "${GREEN}│  ${NC}  • GTV评估    /api/scoring/*, /api/documents/*"
echo -e "${GREEN}│  ${NC}  • 项目管理   /api/projects/*"
echo -e "${GREEN}│  ${NC}  • 材料收集   /api/material-collection/*"
echo -e "${GREEN}│  ${NC}  • 内容提取   /api/projects/*/extraction/*"
echo -e "${GREEN}│  ${NC}  • 框架构建   /api/projects/*/framework/*"
echo -e "${GREEN}│  ${NC}  • 文件服务   /api/files/*"
echo -e "${GREEN}└────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${CYAN}快捷命令:${NC}"
echo "  健康检查: curl http://localhost:$API_PORT/health"
echo "  查看日志: tail -f $LOG_FILE"
echo "  停止服务: kill $API_PID 或 pkill -f api_server.py"
echo ""
