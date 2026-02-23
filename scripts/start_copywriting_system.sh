#!/bin/bash

# GTV签证文案制作系统启动脚本

set -e

echo "=========================================="
echo "  GTV签证AI文案制作系统"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 加载环境变量
if [ -f ".env.local" ]; then
    echo -e "${BLUE}加载环境变量...${NC}"
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# 默认配置
COPYWRITING_API_PORT=${COPYWRITING_API_PORT:-5004}
COPYWRITING_PROJECTS_PATH=${COPYWRITING_PROJECTS_PATH:-"./copywriting_projects"}
CASE_LIBRARY_PATH=${CASE_LIBRARY_PATH:-"./success_cases"}

# 创建必要的目录
echo -e "${BLUE}创建必要目录...${NC}"
mkdir -p "$COPYWRITING_PROJECTS_PATH"
mkdir -p "$CASE_LIBRARY_PATH"
mkdir -p "./uploads"

# 检查Python虚拟环境
check_venv() {
    if [ -d ".venv" ]; then
        echo -e "${GREEN}找到Python虚拟环境${NC}"
        source .venv/bin/activate
    else
        echo -e "${YELLOW}未找到虚拟环境，使用系统Python${NC}"
    fi
}

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}检查Python依赖...${NC}"
    
    # 检查必要的包
    python3 -c "import flask" 2>/dev/null || {
        echo -e "${YELLOW}安装 flask...${NC}"
        pip install flask flask-cors
    }
    
    python3 -c "import openai" 2>/dev/null || {
        echo -e "${YELLOW}安装 openai...${NC}"
        pip install openai
    }
    
    python3 -c "import anthropic" 2>/dev/null || {
        echo -e "${YELLOW}安装 anthropic (可选)...${NC}"
        pip install anthropic 2>/dev/null || true
    }
}

# 初始化示例案例
init_sample_cases() {
    echo -e "${BLUE}初始化示例案例库...${NC}"
    
    cd "$PROJECT_ROOT/ace_gtv"
    python3 -c "
from success_case_library import SuccessCaseLibrary
library = SuccessCaseLibrary('$PROJECT_ROOT/$CASE_LIBRARY_PATH')
result = library.add_sample_cases()
print(f'添加了 {result.get(\"added_count\", 0)} 个示例案例')
" 2>/dev/null || echo -e "${YELLOW}跳过示例案例初始化${NC}"
    cd "$PROJECT_ROOT"
}

# 启动后端API服务
start_backend() {
    echo -e "${BLUE}启动文案系统后端API (端口: $COPYWRITING_API_PORT)...${NC}"
    
    cd "$PROJECT_ROOT/ace_gtv"
    
    # 设置环境变量
    export COPYWRITING_API_PORT=$COPYWRITING_API_PORT
    export COPYWRITING_PROJECTS_PATH="$PROJECT_ROOT/$COPYWRITING_PROJECTS_PATH"
    export CASE_LIBRARY_PATH="$PROJECT_ROOT/$CASE_LIBRARY_PATH"
    export FLASK_DEBUG=true
    
    # 启动API服务
    python3 copywriting_api.py &
    BACKEND_PID=$!
    
    echo -e "${GREEN}后端服务已启动 (PID: $BACKEND_PID)${NC}"
    echo $BACKEND_PID > "$PROJECT_ROOT/.copywriting_backend.pid"
    
    cd "$PROJECT_ROOT"
}

# 等待服务就绪
wait_for_service() {
    echo -e "${BLUE}等待服务就绪...${NC}"
    
    for i in {1..30}; do
        if curl -s "http://localhost:$COPYWRITING_API_PORT/health" > /dev/null 2>&1; then
            echo -e "${GREEN}服务已就绪!${NC}"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    echo -e "${RED}服务启动超时${NC}"
    return 1
}

# 显示服务状态
show_status() {
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  服务已启动"
    echo "==========================================${NC}"
    echo ""
    echo -e "文案系统API: ${BLUE}http://localhost:$COPYWRITING_API_PORT${NC}"
    echo -e "健康检查:    ${BLUE}http://localhost:$COPYWRITING_API_PORT/health${NC}"
    echo ""
    echo -e "项目目录:    ${YELLOW}$COPYWRITING_PROJECTS_PATH${NC}"
    echo -e "案例库:      ${YELLOW}$CASE_LIBRARY_PATH${NC}"
    echo ""
    echo -e "${YELLOW}提示: 确保前端服务已启动 (npm run dev)${NC}"
    echo -e "${YELLOW}访问: http://localhost:3000/copywriting${NC}"
    echo ""
    echo -e "按 Ctrl+C 停止服务"
}

# 停止服务
stop_services() {
    echo ""
    echo -e "${YELLOW}正在停止服务...${NC}"
    
    if [ -f "$PROJECT_ROOT/.copywriting_backend.pid" ]; then
        PID=$(cat "$PROJECT_ROOT/.copywriting_backend.pid")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo -e "${GREEN}后端服务已停止 (PID: $PID)${NC}"
        fi
        rm "$PROJECT_ROOT/.copywriting_backend.pid"
    fi
    
    exit 0
}

# 捕获中断信号
trap stop_services SIGINT SIGTERM

# 主流程
main() {
    echo "项目目录: $PROJECT_ROOT"
    echo ""
    
    check_venv
    check_dependencies
    init_sample_cases
    start_backend
    
    if wait_for_service; then
        show_status
        
        # 保持脚本运行
        while true; do
            sleep 1
        done
    else
        echo -e "${RED}服务启动失败${NC}"
        stop_services
        exit 1
    fi
}

# 运行
main "$@"
