#!/bin/bash

# =============================================================================
# ACE (AI Career Evaluation) System - Highly Reliable Installation Script
# =============================================================================
# 高可靠性一键安装脚本 - 严格版本控制
# 版本要求强制执行：
#   Node.js: 22.12.0 LTS (精确版本)
#   pnpm: 10.10.0 (精确版本)
#   Python: 3.13 (最低要求)
#   npm: 11.4.2+ (最低要求)
# =============================================================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 版本常量（严格版本控制）
NODEJS_REQUIRED_VERSION="22.12.0"
PNPM_REQUIRED_VERSION="10.10.0"
PYTHON_MIN_VERSION="3.13"
NPM_MIN_VERSION="11.4.2"

# 安装配置
INSTALL_LOG="install_$(date +%Y%m%d_%H%M%S).log"
MAX_RETRIES=3
RETRY_DELAY=5

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$INSTALL_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$INSTALL_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$INSTALL_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$INSTALL_LOG"
}

log_version() {
    echo -e "${CYAN}[VERSION]${NC} $1" | tee -a "$INSTALL_LOG"
}

# 检查root权限
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "不建议使用root用户运行此脚本"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$NAME
            VER=$VERSION_ID
        elif [ -f /etc/redhat-release ]; then
            OS="CentOS/RHEL"
        else
            OS="Unknown Linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macOS"
        VER=$(sw_vers -productVersion)
    else
        OS="Unknown"
    fi
    log_info "检测到操作系统: $OS $VER"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 获取sudo权限
get_sudo_access() {
    log_info "需要sudo权限进行系统安装..."

    # 检查是否已经具有sudo权限
    if sudo -n true 2>/dev/null; then
        log_success "已具有sudo权限"
        return 0
    fi

    # 请求sudo权限
    echo "请输入您的sudo密码以继续安装:"
    if sudo -v; then
        log_success "sudo权限获取成功"
        return 0
    else
        log_error "无法获取sudo权限，安装无法继续"
        exit 1
    fi
}

# 版本比较函数
version_compare() {
    local version1=$1
    local version2=$2

    if [[ "$version1" == "$version2" ]]; then
        return 0
    fi

    local IFS='.'
    local i ver1=($version1) ver2=($version2)

    # 填充较短的版本号
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do
        ver1[i]=0
    done
    for ((i=${#ver2[@]}; i<${#ver1[@]}; i++)); do
        ver2[i]=0
    done

    # 比较版本号
    for ((i=0; i<${#ver1[@]}; i++)); do
        if [[ -z "${ver1[i]}" ]]; then ver1[i]=0; fi
        if [[ -z "${ver2[i]}" ]]; then ver2[i]=0; fi
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            return 1
        elif ((10#${ver1[i]} < 10#${ver2[i]})); then
            return 2
        fi
    done

    return 0
}

# 带重试的命令执行
execute_with_retry() {
    local cmd="$1"
    local description="$2"
    local retry_count=0

    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        log_info "执行: $description (尝试 $((retry_count + 1))/$MAX_RETRIES)"

        if eval "$cmd" 2>&1 | tee -a "$INSTALL_LOG"; then
            log_success "$description 成功"
            return 0
        else
            log_warning "$description 失败"
            retry_count=$((retry_count + 1))

            if [[ $retry_count -lt $MAX_RETRIES ]]; then
                log_info "等待 $RETRY_DELAY 秒后重试..."
                sleep $RETRY_DELAY
            fi
        fi
    done

    log_error "$description 在 $MAX_RETRIES 次尝试后仍然失败"
    return 1
}

# 安装系统依赖
install_system_deps() {
    log_info "安装系统依赖..."
    get_sudo_access

    case "$OS" in
        "Ubuntu"*|"Debian"*)
            execute_with_retry "sudo apt update" "更新包列表"
            execute_with_retry "sudo apt install -y curl wget git build-essential python3 python3-pip python3-venv python3-dev sqlite3 unzip ca-certificates gnupg lsb-release" "安装基础依赖"
            ;;
        "CentOS"*|"RHEL"*)
            execute_with_retry "sudo yum update -y" "更新包列表"
            execute_with_retry "sudo yum install -y curl wget git gcc gcc-c++ make python3 python3-pip python3-devel sqlite unzip ca-certificates" "安装基础依赖"
            ;;
        "macOS")
            if ! command_exists brew; then
                log_info "安装Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            execute_with_retry "brew update" "更新Homebrew"
            execute_with_retry "brew install git python3 sqlite3 wget curl" "安装基础依赖"
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac
}

# 验证Node.js版本
validate_nodejs_version() {
    local current_version=$1

    if [[ "$current_version" == "$NODEJS_REQUIRED_VERSION" ]]; then
        log_success "Node.js版本验证通过: $current_version"
        return 0
    else
        log_error "Node.js版本不符合要求"
        log_version "要求版本: $NODEJS_REQUIRED_VERSION"
        log_version "当前版本: $current_version"
        return 1
    fi
}

# 安装精确版本的Node.js
install_nodejs_exact() {
    log_info "安装Node.js $NODEJS_REQUIRED_VERSION (精确版本)..."

    case "$OS" in
        "Ubuntu"*|"Debian"*)
            # 下载并安装特定版本的Node.js
            local nodejs_url="https://nodejs.org/dist/v${NODEJS_REQUIRED_VERSION}/node-v${NODEJS_REQUIRED_VERSION}-linux-x64.tar.xz"
            local temp_dir="/tmp/nodejs-install"

            execute_with_retry "mkdir -p $temp_dir" "创建临时目录"
            execute_with_retry "wget -q $nodejs_url -O $temp_dir/nodejs.tar.xz" "下载Node.js"
            execute_with_retry "cd $temp_dir && tar -xf nodejs.tar.xz" "解压Node.js"

            get_sudo_access
            execute_with_retry "sudo cp -r $temp_dir/node-v${NODEJS_REQUIRED_VERSION}-linux-x64/* /usr/local/" "安装Node.js"

            # 清理
            rm -rf "$temp_dir"
            ;;
        "CentOS"*|"RHEL"*)
            # 对于CentOS/RHEL，使用NodeSource然后降级到精确版本
            execute_with_retry "curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -" "设置NodeSource仓库"
            execute_with_retry "sudo yum install -y nodejs" "安装Node.js"

            # 如果版本不匹配，使用nvm安装精确版本
            if ! validate_nodejs_version "$(node --version | cut -d'v' -f2)"; then
                install_nodejs_with_nvm
            fi
            ;;
        "macOS")
            # macOS使用Homebrew安装特定版本
            if command_exists brew; then
                # 尝试安装node@22然后链接
                brew install node@22 2>/dev/null || true
                brew link node@22 --force 2>/dev/null || true

                # 验证版本
                local current_version=$(node --version | cut -d'v' -f2)
                if ! validate_nodejs_version "$current_version"; then
                    install_nodejs_with_nvm
                fi
            else
                install_nodejs_with_nvm
            fi
            ;;
    esac
}

# 使用nvm安装Node.js
install_nodejs_with_nvm() {
    log_info "使用nvm安装Node.js $NODEJS_REQUIRED_VERSION..."

    # 安装nvm
    if ! command_exists nvm; then
        execute_with_retry "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash" "安装nvm"

        # 加载nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # 使用nvm安装精确版本
    execute_with_retry "nvm install $NODEJS_REQUIRED_VERSION" "安装Node.js $NODEJS_REQUIRED_VERSION"
    execute_with_retry "nvm use $NODEJS_REQUIRED_VERSION" "使用Node.js $NODEJS_REQUIRED_VERSION"
    execute_with_retry "nvm alias default $NODEJS_REQUIRED_VERSION" "设置默认Node.js版本"
}

# 验证npm版本
validate_npm_version() {
    local current_version=$1

    version_compare "$current_version" "$NPM_MIN_VERSION"
    local result=$?

    if [[ $result -eq 0 ]] || [[ $result -eq 1 ]]; then
        log_success "npm版本验证通过: $current_version"
        return 0
    else
        log_error "npm版本过低"
        log_version "要求最低版本: $NPM_MIN_VERSION"
        log_version "当前版本: $current_version"
        return 1
    fi
}

# 升级npm到最低要求版本
upgrade_npm() {
    log_info "升级npm到最低版本 $NPM_MIN_VERSION..."
    execute_with_retry "npm install -g npm@$NPM_MIN_VERSION" "升级npm"
}

# 验证pnpm版本
validate_pnpm_version() {
    local current_version=$1

    if [[ "$current_version" == "$PNPM_REQUIRED_VERSION" ]]; then
        log_success "pnpm版本验证通过: $current_version"
        return 0
    else
        log_error "pnpm版本不符合要求"
        log_version "要求版本: $PNPM_REQUIRED_VERSION"
        log_version "当前版本: $current_version"
        return 1
    fi
}

# 安装精确版本的pnpm
install_pnpm_exact() {
    log_info "安装pnpm $PNPM_REQUIRED_VERSION (精确版本)..."

    # 首先尝试全局安装
    if execute_with_retry "npm install -g pnpm@$PNPM_REQUIRED_VERSION" "安装pnpm"; then
        return 0
    fi

    # 如果失败，处理权限问题
    log_warning "npm全局安装失败，尝试修复权限问题..."

    # 方案1: 修改npm默认目录
    execute_with_retry "mkdir -p ~/.npm-global" "创建npm全局目录"
    execute_with_retry "npm config set prefix '~/.npm-global'" "设置npm前缀"

    # 更新PATH
    if [ -f ~/.bashrc ]; then
        if ! grep -q 'npm-global' ~/.bashrc; then
            echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
        fi
    fi

    if [ -f ~/.zshrc ]; then
        if ! grep -q 'npm-global' ~/.zshrc; then
            echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
        fi
    fi

    export PATH=~/.npm-global/bin:$PATH

    # 重试安装
    execute_with_retry "npm install -g pnpm@$PNPM_REQUIRED_VERSION" "重新安装pnpm"
}

# 安装Node.js和pnpm
install_nodejs_and_pnpm() {
    log_info "安装Node.js和pnpm..."

    # 检查Node.js
    if command_exists node; then
        local current_node_version=$(node --version | cut -d'v' -f2)
        log_info "检测到Node.js版本: $current_node_version"

        if ! validate_nodejs_version "$current_node_version"; then
            log_warning "当前Node.js版本不符合要求，将安装正确版本"
            install_nodejs_exact
        fi
    else
        log_info "Node.js未安装，将安装版本 $NODEJS_REQUIRED_VERSION"
        install_nodejs_exact
    fi

    # 验证最终Node.js版本
    local final_node_version=$(node --version | cut -d'v' -f2)
    if ! validate_nodejs_version "$final_node_version"; then
        log_error "Node.js版本验证失败"
        exit 1
    fi

    # 检查npm版本
    if command_exists npm; then
        local current_npm_version=$(npm --version)
        log_info "检测到npm版本: $current_npm_version"

        if ! validate_npm_version "$current_npm_version"; then
            upgrade_npm
        fi
    else
        log_error "npm未安装"
        exit 1
    fi

    # 检查pnpm
    if command_exists pnpm; then
        local current_pnpm_version=$(pnpm --version)
        log_info "检测到pnpm版本: $current_pnpm_version"

        if ! validate_pnpm_version "$current_pnpm_version"; then
            log_warning "当前pnpm版本不符合要求，将安装正确版本"
            install_pnpm_exact
        fi
    else
        log_info "pnpm未安装，将安装版本 $PNPM_REQUIRED_VERSION"
        install_pnpm_exact
    fi

    # 验证最终pnpm版本
    local final_pnpm_version=$(pnpm --version)
    if ! validate_pnpm_version "$final_pnpm_version"; then
        log_error "pnpm版本验证失败"
        exit 1
    fi
}

# 验证Python版本
validate_python_version() {
    local current_version=$1

    version_compare "$current_version" "$PYTHON_MIN_VERSION"
    local result=$?

    if [[ $result -eq 0 ]] || [[ $result -eq 1 ]]; then
        log_success "Python版本验证通过: $current_version"
        return 0
    else
        log_error "Python版本过低"
        log_version "要求最低版本: $PYTHON_MIN_VERSION"
        log_version "当前版本: $current_version"
        return 1
    fi
}

# 安装Python 3.13
install_python313() {
    log_info "安装Python $PYTHON_MIN_VERSION..."

    case "$OS" in
        "Ubuntu"*|"Debian"*)
            # 添加deadsnakes PPA
            execute_with_retry "sudo apt update" "更新包列表"
            execute_with_retry "sudo apt install -y software-properties-common" "安装软件属性工具"

            # 尝试添加PPA
            if ! sudo add-apt-repository ppa:deadsnakes/ppa -y 2>/dev/null; then
                log_warning "无法添加PPA，尝试从源码编译Python..."
                compile_python_from_source
                return
            fi

            execute_with_retry "sudo apt update" "更新包列表"
            execute_with_retry "sudo apt install -y python3.13 python3.13-venv python3.13-dev python3.13-pip" "安装Python 3.13"

            # 设置python3.13为默认
            sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.13 1 2>/dev/null || true
            ;;
        "CentOS"*|"RHEL"*)
            # 启用EPEL和remi仓库
            execute_with_retry "sudo yum install -y epel-release" "安装EPEL仓库"
            execute_with_retry "sudo yum install -y gcc openssl-devel bzip2-devel libffi-devel zlib-devel wget make" "安装编译依赖"

            # 从源码编译Python 3.13
            compile_python_from_source
            ;;
        "macOS")
            if command_exists brew; then
                # 尝试使用Homebrew安装Python 3.13
                if brew install python@3.13 2>/dev/null; then
                    brew link python@3.13 --force 2>/dev/null || true
                else
                    log_warning "Homebrew安装失败，尝试从源码编译..."
                    compile_python_from_source
                fi
            else
                compile_python_from_source
            fi
            ;;
    esac
}

# 从源码编译Python
compile_python_from_source() {
    log_info "从源码编译Python $PYTHON_MIN_VERSION..."

    local python_url="https://www.python.org/ftp/python/${PYTHON_MIN_VERSION}.0/Python-${PYTHON_MIN_VERSION}.0.tgz"
    local temp_dir="/tmp/python-install"

    execute_with_retry "mkdir -p $temp_dir" "创建临时目录"
    execute_with_retry "cd $temp_dir && wget -q $python_url" "下载Python源码"
    execute_with_retry "cd $temp_dir && tar -xzf Python-${PYTHON_MIN_VERSION}.0.tgz" "解压Python源码"

    get_sudo_access
    execute_with_retry "cd $temp_dir/Python-${PYTHON_MIN_VERSION}.0 && ./configure --enable-optimizations" "配置Python编译"
    execute_with_retry "cd $temp_dir/Python-${PYTHON_MIN_VERSION}.0 && make -j$(nproc)" "编译Python"
    execute_with_retry "cd $temp_dir/Python-${PYTHON_MIN_VERSION}.0 && sudo make altinstall" "安装Python"

    # 清理
    rm -rf "$temp_dir"
}

# 检查Python版本
check_python() {
    log_info "检查Python版本..."

    if command_exists python3; then
        local current_python_version=$(python3 --version | cut -d' ' -f2)
        log_info "检测到Python版本: $current_python_version"

        if ! validate_python_version "$current_python_version"; then
            log_warning "当前Python版本不符合要求，将安装Python $PYTHON_MIN_VERSION"
            install_python313

            # 重新检查版本
            if command_exists python3; then
                local new_python_version=$(python3 --version | cut -d' ' -f2)
                if ! validate_python_version "$new_python_version"; then
                    log_error "Python版本仍然不符合要求"
                    exit 1
                fi
            else
                log_error "Python安装失败"
                exit 1
            fi
        fi
    else
        log_info "Python3未安装，将安装Python $PYTHON_MIN_VERSION"
        install_python313

        # 验证安装
        if ! command_exists python3; then
            log_error "Python安装失败"
            exit 1
        fi

        local installed_version=$(python3 --version | cut -d' ' -f2)
        if ! validate_python_version "$installed_version"; then
            log_error "Python版本验证失败"
            exit 1
        fi
    fi
}

# 创建项目目录
create_project_dir() {
    if [[ ! -d "ace-system" ]]; then
        log_info "创建项目目录..."
        mkdir -p ace-system
    fi
    cd ace-system
}

# 检查项目文件
check_project_files() {
    log_info "检查项目文件..."

    # 检查是否是Git仓库
    if [[ -d ".git" ]] || [[ -f "package.json" ]]; then
        log_success "项目文件已存在"
        return 0
    fi

    # 如果目录为空，需要克隆或下载项目
    if [[ -z "$(ls -A)" ]]; then
        log_info "项目目录为空，请确保您已在正确的位置运行此脚本"
        log_info "或者将项目文件复制到当前目录"
        return 1
    fi

    # 检查必要文件
    if [[ ! -f "package.json" ]]; then
        log_error "未找到package.json文件"
        return 1
    fi

    if [[ ! -f "ace_gtv/requirements.txt" ]]; then
        log_error "未找到requirements.txt文件"
        return 1
    fi

    return 0
}

# 安装前端依赖
install_frontend_deps() {
    log_info "安装前端依赖（使用pnpm $PNPM_REQUIRED_VERSION）..."

    # 检查node_modules是否存在
    if [[ -d "node_modules" ]]; then
        log_warning "node_modules已存在，是否重新安装？(y/N)"
        read -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
        log_info "删除现有的 node_modules 和 pnpm-lock.yaml..."
        rm -rf node_modules pnpm-lock.yaml
    fi

    # 使用冻结lockfile安装依赖以确保版本一致性
    log_info "使用 pnpm install 安装依赖..."
    if pnpm install --frozen-lockfile 2>&1 | tee -a "$INSTALL_LOG"; then
        log_success "前端依赖安装完成（使用冻结lockfile）"
    else
        log_warning "冻结lockfile安装失败，尝试标准安装..."
        execute_with_retry "pnpm install" "标准pnpm安装"
    fi
}

# 安装后端依赖
install_backend_deps() {
    log_info "设置Python虚拟环境..."

    # 创建虚拟环境
    if [[ ! -d "venv" ]]; then
        execute_with_retry "python3 -m venv venv" "创建Python虚拟环境"
        log_success "虚拟环境创建完成"
    fi

    # 激活虚拟环境
    source venv/bin/activate

    # 升级pip
    log_info "升级pip..."
    execute_with_retry "pip install --upgrade pip" "升级pip"

    # 安装后端依赖
    log_info "安装后端依赖（从requirements.txt）..."
    if [[ -f "ace_gtv/requirements.txt" ]]; then
        execute_with_retry "pip install -r ace_gtv/requirements.txt" "安装Python依赖"
    else
        log_warning "未找到requirements.txt文件，跳过后端依赖安装"
    fi

    log_success "后端依赖安装完成"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."

    mkdir -p ace_gtv/data
    mkdir -p ace_gtv/resumes
    mkdir -p ace_gtv/reports
    mkdir -p ace_gtv/personal_kb
    mkdir -p logs

    log_success "目录创建完成"
}

# 设置环境变量
setup_environment() {
    log_info "设置环境变量..."

    if [[ ! -f ".env.local" ]]; then
        if [[ -f ".env.local.example" ]]; then
            cp .env.local.example .env.local
            log_success "环境变量文件已创建，请根据需要编辑 .env.local 文件"
        else
            log_warning "未找到.env.local.example文件，创建基础环境变量文件"
            cat > .env.local << 'EOF'
# 基础环境变量
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:5001
BACKEND_PORT=5001
RESUME_PROCESSOR_PORT=5002
FRONTEND_PORT=3000

# 数据库配置
DATABASE_URL=sqlite:///ace_gtv/data/assessments.db

# 文件路径
RESUMES_DIR=./ace_gtv/resumes
REPORTS_DIR=./ace_gtv/reports
DATA_DIR=./ace_gtv/data

# AI服务配置（需要用户配置）
# AZURE_OPENAI_ENDPOINT=your_azure_endpoint
# AZURE_OPENAI_API_KEY=your_azure_key
# OPENAI_API_KEY=your_openai_key
EOF
        fi
    else
        log_success "环境变量文件已存在"
    fi
}

# 设置脚本权限
set_permissions() {
    log_info "设置脚本权限..."

    chmod +x start_all_services.sh 2>/dev/null || true
    chmod +x start_backend.sh 2>/dev/null || true
    chmod +x start_frontend.sh 2>/dev/null || true
    chmod +x install.sh 2>/dev/null || true

    log_success "脚本权限设置完成"
}

# 显示安装结果
show_installation_result() {
    log_success "🎉 ACE系统安装完成！"
    echo
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}         ACE系统安装成功！${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo "📋 安装摘要："
    echo "  ✓ 系统依赖: 已安装"
    echo "  ✓ Node.js: $(node --version) (要求: v$NODEJS_REQUIRED_VERSION)"
    echo "  ✓ npm: $(npm --version) (最低要求: $NPM_MIN_VERSION)"
    echo "  ✓ pnpm: $(pnpm --version) (要求: $PNPM_REQUIRED_VERSION)"
    echo "  ✓ Python: $(python3 --version) (最低要求: $PYTHON_MIN_VERSION)"
    echo "  ✓ 前端依赖: 已安装"
    echo "  ✓ 后端依赖: 已安装"
    echo "  ✓ 虚拟环境: 已创建"
    echo "  ✓ 必要目录: 已创建"
    echo
    echo "📦 版本验证："

    # 验证所有版本
    local node_ok=$(node --version | grep -q "$NODEJS_REQUIRED_VERSION" && echo "✓" || echo "✗")
    local pnpm_ok=$(pnpm --version | grep -q "$PNPM_REQUIRED_VERSION" && echo "✓" || echo "✗")
    local python_version=$(python3 --version | cut -d' ' -f2)
    local python_ok=$(validate_python_version "$python_version" >/dev/null 2>&1 && echo "✓" || echo "✗")

    echo "  $node_ok Node.js $NODEJS_REQUIRED_VERSION"
    echo "  $pnpm_ok pnpm $PNPM_REQUIRED_VERSION"
    echo "  $python_ok Python $PYTHON_MIN_VERSION+"
    echo
    echo "🚀 快速开始："
    echo "  1. 激活Python虚拟环境:"
    echo "     source venv/bin/activate"
    echo
    echo "  2. 配置环境变量（必需）:"
    echo "     编辑 .env.local 文件，添加AI服务配置"
    echo "     AZURE_OPENAI_ENDPOINT=your_endpoint"
    echo "     AZURE_OPENAI_API_KEY=your_key"
    echo "     OPENAI_API_KEY=your_key"
    echo
    echo "  3. 启动服务："
    echo "     ./start_all_services.sh"
    echo
    echo "  4. 访问应用："
    echo "     前端: http://localhost:3000"
    echo "     后端API: http://localhost:5001"
    echo "     简历处理: http://localhost:5002"
    echo
    echo "📖 详细文档："
    echo "  查看 install.log 获取详细安装日志"
    echo "  查看 INSTALLATION.md 获取完整安装指南"
    echo
    echo "🔧 故障排除："
    echo "  如果安装失败，请检查 install.log 文件中的错误信息"
    echo "  可以重新运行此脚本进行修复安装"
    echo
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 显示版本要求
show_version_requirements() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}    严格版本要求${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log_version "Node.js: $NODEJS_REQUIRED_VERSION (必须精确版本)"
    log_version "pnpm: $PNPM_REQUIRED_VERSION (必须精确版本)"
    log_version "Python: $PYTHON_MIN_VERSION+ (最低要求)"
    log_version "npm: $NPM_MIN_VERSION+ (最低要求)"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
}

# 主安装函数
main() {
    # 创建安装日志
    touch "$INSTALL_LOG"

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}     ACE系统高可靠性安装程序${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo

    # 显示版本要求
    show_version_requirements

    # 检查root权限
    check_root

    # 检测操作系统
    detect_os

    # 显示安装选项
    log_info "即将开始安装ACE系统..."
    echo
    read -p "是否继续安装？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "安装已取消"
        exit 0
    fi

    # 开始安装
    log_info "开始安装系统依赖..."
    install_system_deps

    log_info "安装Node.js和pnpm..."
    install_nodejs_and_pnpm

    log_info "检查Python版本..."
    check_python

    log_info "进入项目目录..."
    create_project_dir

    log_info "检查项目文件..."
    if ! check_project_files; then
        log_error "项目文件检查失败，请确保在正确的目录中运行脚本"
        exit 1
    fi

    log_info "安装前端依赖..."
    install_frontend_deps

    log_info "安装后端依赖..."
    install_backend_deps

    log_info "创建必要目录..."
    create_directories

    log_info "设置环境变量..."
    setup_environment

    log_info "设置脚本权限..."
    set_permissions

    # 显示安装结果
    show_installation_result
}

# 错误处理
trap 'log_error "脚本执行失败，请查看 $INSTALL_LOG 获取详细错误信息"; exit 1' ERR

# 运行主函数
main "$@"