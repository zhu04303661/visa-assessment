#!/bin/bash

# =============================================================================
# 版本验证脚本 / Version Verification Script
# =============================================================================
# 检查当前开发环境是否与项目所需的版本一致
# 
# 使用方式: ./verify-versions.sh
# =============================================================================

# 不使用 set -e，因为需要允许函数继续执行计数器递增

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 版本要求
REQUIRED_NODE_VERSION="22.12.0"
REQUIRED_PNPM_VERSION="10.10.0"
REQUIRED_PYTHON_MIN="3.9"
REQUIRED_PYTHON_RECOMMENDED="3.13"

# 计数器
PASSED=0
WARNED=0
FAILED=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    PASSED=$((PASSED + 1))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    WARNED=$((WARNED + 1))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    FAILED=$((FAILED + 1))
}

log_divider() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 版本比较函数 (简单版本，格式: major.minor.patch)
version_greater_or_equal() {
    local required=$1
    local actual=$2
    local required_major=$(echo $required | cut -d'.' -f1)
    local required_minor=$(echo $required | cut -d'.' -f2)
    local required_patch=$(echo $required | cut -d'.' -f3)
    
    local actual_major=$(echo $actual | cut -d'.' -f1)
    local actual_minor=$(echo $actual | cut -d'.' -f2)
    local actual_patch=$(echo $actual | cut -d'.' -f3)
    
    if [ "$actual_major" -gt "$required_major" ]; then
        return 0
    elif [ "$actual_major" -eq "$required_major" ]; then
        if [ "$actual_minor" -gt "$required_minor" ]; then
            return 0
        elif [ "$actual_minor" -eq "$required_minor" ]; then
            if [ "$actual_patch" -ge "$required_patch" ]; then
                return 0
            fi
        fi
    fi
    return 1
}

# 检查 Node.js
check_nodejs() {
    log_divider
    echo -e "${CYAN}检查 Node.js${NC}"
    log_divider
    
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js 未安装"
        return
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    local node_major=$(echo $node_version | cut -d'.' -f1)
    
    if [ "$node_major" -ge 22 ]; then
        log_success "Node.js $node_version (需要 ≥ $REQUIRED_NODE_VERSION)"
    elif [ "$node_major" -ge 18 ]; then
        log_warning "Node.js $node_version (建议升级到 $REQUIRED_NODE_VERSION)"
    else
        log_error "Node.js $node_version (不符合最低要求 18+)"
    fi
}

# 检查 npm
check_npm() {
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm 未安装"
        return
    fi
    
    local npm_version=$(npm --version)
    log_success "npm $npm_version"
}

# 检查 pnpm
check_pnpm() {
    log_divider
    echo -e "${CYAN}检查 pnpm${NC}"
    log_divider
    
    if ! command -v pnpm >/dev/null 2>&1; then
        log_error "pnpm 未安装 (需要: $REQUIRED_PNPM_VERSION)"
        return
    fi
    
    local pnpm_version=$(pnpm --version)
    
    if version_greater_or_equal "$REQUIRED_PNPM_VERSION" "$pnpm_version"; then
        log_success "pnpm $pnpm_version (推荐: $REQUIRED_PNPM_VERSION)"
    else
        log_warning "pnpm $pnpm_version (建议使用 $REQUIRED_PNPM_VERSION)"
    fi
}

# 检查 Python
check_python() {
    log_divider
    echo -e "${CYAN}检查 Python${NC}"
    log_divider
    
    if ! command -v python3 >/dev/null 2>&1; then
        log_error "Python3 未安装 (需要: ≥ $REQUIRED_PYTHON_MIN)"
        return
    fi
    
    local python_version=$(python3 --version | cut -d' ' -f2)
    local python_major=$(echo $python_version | cut -d'.' -f1)
    local python_minor=$(echo $python_version | cut -d'.' -f2)
    
    if [ "$python_major" -eq 3 ]; then
        if [ "$python_minor" -ge 13 ]; then
            log_success "Python $python_version (最优版本: $REQUIRED_PYTHON_RECOMMENDED)"
        elif [ "$python_minor" -ge 9 ]; then
            log_warning "Python $python_version (符合最低要求，建议升级到 $REQUIRED_PYTHON_RECOMMENDED)"
        else
            log_error "Python $python_version (低于最低要求 $REQUIRED_PYTHON_MIN)"
        fi
    else
        log_error "Python 版本格式错误: $python_version"
    fi
}

# 检查虚拟环境
check_venv() {
    log_divider
    echo -e "${CYAN}检查 Python 虚拟环境${NC}"
    log_divider
    
    if [ -d "venv" ]; then
        log_success "虚拟环境目录存在 (venv/)"
        
        if [ -f "venv/bin/activate" ]; then
            log_success "虚拟环境配置正确"
        else
            log_error "虚拟环境配置不正确"
        fi
    else
        log_warning "虚拟环境不存在 (需要运行: python3 -m venv venv)"
    fi
}

# 检查前端依赖
check_frontend_deps() {
    log_divider
    echo -e "${CYAN}检查前端依赖${NC}"
    log_divider
    
    if [ -d "node_modules" ]; then
        log_success "node_modules 已安装"
    else
        log_warning "node_modules 不存在 (需要运行: pnpm install)"
    fi
    
    if [ -f "pnpm-lock.yaml" ]; then
        log_success "pnpm-lock.yaml 存在"
    else
        log_warning "pnpm-lock.yaml 不存在"
    fi
}

# 检查后端依赖
check_backend_deps() {
    log_divider
    echo -e "${CYAN}检查后端依赖${NC}"
    log_divider
    
    if [ ! -f "ace_gtv/requirements.txt" ]; then
        log_error "ace_gtv/requirements.txt 不存在"
        return
    fi
    
    log_success "requirements.txt 存在"
    
    # 检查虚拟环境中是否安装了依赖
    if [ -d "venv" ] && [ -f "venv/bin/activate" ]; then
        source venv/bin/activate 2>/dev/null || true
        
        if python3 -c "import flask" 2>/dev/null; then
            log_success "Flask 已安装"
        else
            log_warning "Flask 未安装 (需要运行: pip install -r ace_gtv/requirements.txt)"
        fi
        
        deactivate 2>/dev/null || true
    else
        log_warning "无法检查虚拟环境中的包"
    fi
}

# 检查版本锁定文件
check_version_lock() {
    log_divider
    echo -e "${CYAN}检查版本锁定信息${NC}"
    log_divider
    
    if [ -f ".version-lock.json" ]; then
        log_success "版本锁定文件存在 (.version-lock.json)"
    else
        log_warning "版本锁定文件不存在"
    fi
}

# 显示摘要
show_summary() {
    log_divider
    echo -e "${CYAN}检查摘要${NC}"
    log_divider
    echo
    echo "✓ 通过: $PASSED"
    echo "⚠ 警告: $WARNED"
    echo "✗ 失败: $FAILED"
    echo
    
    if [ $FAILED -eq 0 ]; then
        if [ $WARNED -eq 0 ]; then
            echo -e "${GREEN}🎉 所有检查都通过了！${NC}"
        else
            echo -e "${YELLOW}⚠️  大多数项目已准备好，但有 $WARNED 个警告需要注意${NC}"
        fi
    else
        echo -e "${RED}❌ 有 $FAILED 个检查失败，请解决后重试${NC}"
    fi
    echo
}

# 显示建议
show_recommendations() {
    if [ $FAILED -gt 0 ] || [ $WARNED -gt 0 ]; then
        log_divider
        echo -e "${CYAN}建议${NC}"
        log_divider
        
        if ! command -v node >/dev/null 2>&1; then
            echo "1. 安装 Node.js $REQUIRED_NODE_VERSION:"
            echo "   bash install.sh"
        fi
        
        if ! command -v pnpm >/dev/null 2>&1; then
            echo "2. 安装 pnpm $REQUIRED_PNPM_VERSION:"
            echo "   npm install -g pnpm@$REQUIRED_PNPM_VERSION"
        fi
        
        if [ ! -d "node_modules" ]; then
            echo "3. 安装前端依赖:"
            echo "   pnpm install"
        fi
        
        if [ ! -d "venv" ]; then
            echo "4. 创建 Python 虚拟环境:"
            echo "   python3 -m venv venv"
            echo "   source venv/bin/activate"
            echo "   pip install -r ace_gtv/requirements.txt"
        fi
        
        echo
    fi
}

# 主函数
main() {
    echo
    log_divider
    echo -e "${CYAN}    ACE 系统 - 版本检查工具${NC}"
    log_divider
    echo
    echo "检查您的开发环境是否与项目要求一致..."
    echo
    
    check_nodejs
    check_npm
    check_pnpm
    check_python
    check_venv
    check_frontend_deps
    check_backend_deps
    check_version_lock
    
    show_summary
    show_recommendations
}

# 运行主函数
main "$@"
