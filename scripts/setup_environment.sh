#!/bin/bash

# =============================================================================
# ACE系统环境设置脚本
# =============================================================================
# 用于快速设置开发环境
# =============================================================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查虚拟环境
check_venv() {
    if [[ ! -d "venv" ]]; then
        log_info "创建Python虚拟环境..."
        python3 -m venv venv
        log_success "虚拟环境创建完成"
    fi

    # 激活虚拟环境
    source venv/bin/activate
    log_success "虚拟环境已激活"
}

# 更新依赖
update_deps() {
    log_info "更新依赖..."

    # 更新pip
    pip install --upgrade pip

    # 安装/更新后端依赖
    if [[ -f "ace_gtv/requirements.txt" ]]; then
        pip install -r ace_gtv/requirements.txt --upgrade
        log_success "后端依赖更新完成"
    fi

    # 更新前端依赖
    if [[ -f "package.json" ]]; then
        pnpm update
        log_success "前端依赖更新完成"
    fi
}

# 创建必要目录
create_dirs() {
    log_info "创建必要目录..."

    mkdir -p ace_gtv/data
    mkdir -p ace_gtv/resumes
    mkdir -p ace_gtv/reports
    mkdir -p ace_gtv/personal_kb
    mkdir -p logs

    log_success "目录创建完成"
}

# 设置环境变量
setup_env() {
    log_info "检查环境变量..."

    if [[ ! -f ".env.local" ]]; then
        if [[ -f ".env.local.example" ]]; then
            cp .env.local.example .env.local
            log_success "环境变量文件已创建"
        else
            log_warning "创建基础环境变量文件"
            cat > .env.local << EOF
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:5001
BACKEND_PORT=5001
RESUME_PROCESSOR_PORT=5002
FRONTEND_PORT=3000
DATABASE_URL=sqlite:///ace_gtv/data/assessments.db
RESUMES_DIR=./ace_gtv/resumes
REPORTS_DIR=./ace_gtv/reports
DATA_DIR=./ace_gtv/data
EOF
        fi
    else
        log_success "环境变量文件已存在"
    fi
}

# 清理缓存
clean_cache() {
    log_info "清理缓存..."

    # Python缓存
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true

    # Node.js缓存
    if [[ -d "node_modules" ]]; then
        pnpm store prune 2>/dev/null || true
    fi

    log_success "缓存清理完成"
}

# 验证安装
validate_install() {
    log_info "验证安装..."

    # 检查Python依赖
    python3 -c "import flask; print('Flask:', flask.__version__)" || {
        log_error "Flask未正确安装"
        return 1
    }

    # 检查Node.js依赖
    node --version || {
        log_error "Node.js未正确安装"
        return 1
    }

    pnpm --version || {
        log_error "pnpm未正确安装"
        return 1
    }

    log_success "安装验证通过"
}

# 显示帮助
show_help() {
    echo "ACE系统环境设置脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -c, --clean    清理缓存"
    echo "  -u, --update   更新依赖"
    echo "  -v, --validate 验证安装"
    echo "  -a, --all      执行所有操作"
    echo
    echo "示例:"
    echo "  $0 --help      显示帮助"
    echo "  $0 --all       执行完整的环境设置"
    echo "  $0 --clean     仅清理缓存"
}

# 主函数
main() {
    local clean=false
    local update=false
    local validate=false
    local all=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean=true
                shift
                ;;
            -u|--update)
                update=true
                shift
                ;;
            -v|--validate)
                validate=true
                shift
                ;;
            -a|--all)
                all=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 如果没有指定参数，显示帮助
    if [[ $# -eq 0 ]] && [[ "$all" == "false" ]]; then
        show_help
        exit 0
    fi

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}     ACE系统环境设置${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo

    # 检查虚拟环境
    check_venv

    # 执行操作
    if [[ "$all" == "true" ]] || [[ "$clean" == "true" ]]; then
        clean_cache
    fi

    if [[ "$all" == "true" ]] || [[ "$update" == "true" ]]; then
        update_deps
    fi

    if [[ "$all" == "true" ]]; then
        create_dirs
        setup_env
    fi

    if [[ "$all" == "true" ]] || [[ "$validate" == "true" ]]; then
        validate_install
    fi

    echo
    log_success "环境设置完成！"
    echo
    echo "下一步:"
    echo "  1. 配置环境变量: 编辑 .env.local 文件"
    echo "  2. 启动服务: ./start_all_services.sh"
    echo "  3. 访问应用: http://localhost:3000"
}

# 运行主函数
main "$@"