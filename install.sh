#!/bin/bash

# =============================================================================
# ACE (AI Career Evaluation) System - One-Click Installation Script
# =============================================================================
# 一键安装脚本 - 支持Ubuntu/Debian/macOS/CentOS/RHEL
# 使用项目已验证的一致版本确保兼容性
# 
# 已验证的版本:
#   Node.js: 22.12.0 LTS
#   pnpm: 10.10.0
#   Python: 3.13.5
#   npm: 11.4.2
# =============================================================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 版本常量（与项目一致）
NODEJS_MAJOR_VERSION=22
NODEJS_MINOR_VERSION=12
NODEJS_PATCH_VERSION=0
NODEJS_VERSION="${NODEJS_MAJOR_VERSION}.${NODEJS_MINOR_VERSION}.${NODEJS_PATCH_VERSION}"
PNPM_VERSION="10.10.0"
PYTHON_MIN_VERSION="3.9"
PYTHON_REQUIRED_VERSION="3.13"

# 日志函数
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

log_version() {
    echo -e "${CYAN}[VERSION]${NC} $1"
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

# 显示版本信息
show_version_requirements() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}    项目依赖版本要求${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log_version "Node.js: $NODEJS_VERSION (LTS) 或更新版本"
    log_version "pnpm: $PNPM_VERSION"
    log_version "Python: $PYTHON_REQUIRED_VERSION (最低 $PYTHON_MIN_VERSION)"
    log_version "npm: 11.4.2 或更新版本"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
}

# 安装系统依赖
install_system_deps() {
    log_info "安装系统依赖..."

    case "$OS" in
        "Ubuntu"*|"Debian"*)
            sudo apt update
            sudo apt install -y \
                curl \
                wget \
                git \
                build-essential \
                python3 \
                python3-pip \
                python3-venv \
                python3-dev \
                sqlite3 \
                unzip \
                ca-certificates \
                gnupg \
                lsb-release
            ;;
        "CentOS"*|"RHEL"*)
            sudo yum update -y
            sudo yum install -y \
                curl \
                wget \
                git \
                gcc \
                gcc-c++ \
                make \
                python3 \
                python3-pip \
                python3-devel \
                sqlite \
                unzip \
                ca-certificates
            ;;
        "macOS")
            if ! command_exists brew; then
                log_info "安装Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew update
            brew install \
                git \
                python3 \
                sqlite3 \
                wget \
                curl
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac
}

# 安装Node.js和pnpm
install_nodejs() {
    log_info "安装Node.js和pnpm..."

    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 22 ]; then
            log_success "Node.js $NODE_VERSION 已安装（推荐版本: $NODEJS_VERSION）"
        else
            log_warning "Node.js版本: $NODE_VERSION（建议升级到 $NODEJS_VERSION）"
            read -p "是否升级到 Node.js $NODEJS_VERSION？(y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_nodejs_lts
            fi
        fi
    else
        log_warning "Node.js未安装，正在安装 Node.js $NODEJS_VERSION..."
        install_nodejs_lts
    fi

    # 安装pnpm
    if command_exists pnpm; then
        PNPM_INSTALLED=$(pnpm --version)
        log_success "pnpm $PNPM_INSTALLED 已安装（推荐版本: $PNPM_VERSION）"
    else
        log_info "安装pnpm $PNPM_VERSION..."
        npm install -g pnpm@$PNPM_VERSION
        log_success "pnpm $PNPM_VERSION 安装完成"
    fi
}

# 安装Node.js LTS
install_nodejs_lts() {
    log_info "安装Node.js $NODEJS_VERSION LTS..."

    case "$OS" in
        "Ubuntu"*|"Debian"*)
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "CentOS"*|"RHEL"*)
            curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        "macOS")
            brew install node@22
            brew link node@22 --force
            ;;
    esac
    
    log_success "Node.js LTS 安装完成"
}

# 检查Python版本
check_python() {
    log_info "检查Python版本..."

    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f1)
        MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f2)

        if [ "$MAJOR_VERSION" -eq 3 ]; then
            if [ "$MINOR_VERSION" -ge 13 ]; then
                log_success "Python $PYTHON_VERSION 已安装（最优版本: $PYTHON_REQUIRED_VERSION）"
            elif [ "$MINOR_VERSION" -ge 9 ]; then
                log_success "Python $PYTHON_VERSION 符合最低要求 ($PYTHON_MIN_VERSION+)"
                log_warning "建议升级到 Python $PYTHON_REQUIRED_VERSION 获得更好的兼容性"
            else
                log_error "Python版本过低，需要 $PYTHON_MIN_VERSION+，当前版本: $PYTHON_VERSION"
                exit 1
            fi
        else
            log_error "Python版本格式错误: $PYTHON_VERSION"
            exit 1
        fi
    else
        log_error "未找到Python3，请先安装Python $PYTHON_MIN_VERSION+"
        exit 1
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
    log_info "安装前端依赖（使用pnpm $PNPM_VERSION）..."

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
    pnpm install --frozen-lockfile || {
        log_warning "冻结lockfile安装失败，尝试标准安装..."
        pnpm install
    }
    
    log_success "前端依赖安装完成"
}

# 安装后端依赖
install_backend_deps() {
    log_info "设置Python虚拟环境..."

    # 创建虚拟环境
    if [[ ! -d "venv" ]]; then
        python3 -m venv venv
        log_success "虚拟环境创建完成"
    fi

    # 激活虚拟环境
    source venv/bin/activate

    # 升级pip
    log_info "升级pip..."
    pip install --upgrade pip

    # 安装后端依赖
    log_info "安装后端依赖（从requirements.txt）..."
    pip install -r ace_gtv/requirements.txt

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
            cat > .env.local << EOF
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

# 安装Docker（可选）
install_docker() {
    log_info "检查Docker..."

    if command_exists docker; then
        log_success "Docker已安装"
        return 0
    fi

    log_info "Docker未安装，是否安装Docker？(y/N)"
    read -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi

    case "$OS" in
        "Ubuntu"*|"Debian"*)
            curl -fsSL https://get.docker.com | sh
            sudo usermod -aG docker $USER
            ;;
        "CentOS"*|"RHEL"*)
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io
            sudo systemctl start docker
            sudo usermod -aG docker $USER
            ;;
        "macOS")
            brew install docker
            brew install docker-compose
            ;;
    esac

    log_success "Docker安装完成，请重新登录以应用权限更改"
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
    echo "  ✓ Node.js: $(node --version)"
    echo "  ✓ npm: $(npm --version)"
    echo "  ✓ pnpm: $(pnpm --version)"
    echo "  ✓ Python: $(python3 --version)"
    echo "  ✓ 前端依赖: 已安装"
    echo "  ✓ 后端依赖: 已安装"
    echo "  ✓ 虚拟环境: 已创建"
    echo "  ✓ 必要目录: 已创建"
    echo
    echo "📦 依赖版本验证："
    echo "  ✓ Node.js 推荐版本: $NODEJS_VERSION"
    echo "  ✓ pnpm 版本: $PNPM_VERSION"
    echo "  ✓ Python 推荐版本: $PYTHON_REQUIRED_VERSION"
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
    echo "  查看 INSTALLATION.md 获取完整安装指南"
    echo
    echo "🐳 Docker支持："
    echo "  如需使用Docker，运行: docker-compose up -d"
    echo
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 主安装函数
main() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}     ACE系统一键安装程序${NC}"
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
    install_nodejs

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

    log_info "可选：安装Docker..."
    install_docker

    log_info "设置脚本权限..."
    set_permissions

    # 显示安装结果
    show_installation_result
}

# 错误处理
trap 'log_error "脚本执行失败，请查看错误信息"; exit 1' ERR

# 运行主函数
main "$@"