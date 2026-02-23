#!/bin/bash

# GTV后端服务Systemd安装脚本
# 提供systemd服务管理，增强稳定性

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# 检查是否以root身份运行
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "请以root身份运行此脚本 (使用 sudo)"
        exit 1
    fi
}

# 检查systemd是否可用
check_systemd() {
    if ! command -v systemctl >/dev/null 2>&1; then
        error "systemd不可用"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    local deps=("python3" "pip" "systemctl")
    local missing_deps=()

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            missing_deps+=("$dep")
        fi
    done

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "缺少依赖: ${missing_deps[*]}"
        warning "请安装缺失的依赖项"
        exit 1
    fi
}

# 创建系统用户
create_user() {
    local username="gtv-backend"

    if ! id "$username" &>/dev/null; then
        log "创建系统用户: $username"
        groupadd -r "$username" 2>/dev/null || true
        useradd -r -g "$username" -d /opt/gtv-backend -s /bin/false -c "GTV Backend Service" "$username"
        success "用户 $username 创建成功"
    else
        log "用户 $username 已存在"
    fi
}

# 设置目录权限
setup_permissions() {
    local username="gtv-backend"
    local project_dir="/home/xichi/workspace/visa-assessment"

    log "设置目录权限..."

    # 创建必要的目录
    mkdir -p /var/log/gtv-backend
    mkdir -p /var/run/gtv-backend
    mkdir -p /var/lib/gtv-backend
    mkdir -p /opt/gtv-backend

    # 设置所有权
    chown -R "$username:$username" /var/log/gtv-backend
    chown -R "$username:$username" /var/run/gtv-backend
    chown -R "$username:$username" /var/lib/gtv-backend
    chown -R "$username:$username" /opt/gtv-backend

    # 设置项目目录权限
    if [[ -d "$project_dir" ]]; then
        chown -R "$username:$username" "$project_dir"
        chmod 755 "$project_dir"
        chmod 644 "$project_dir"/*.py
        chmod 755 "$project_dir"/*.sh
    fi

    success "目录权限设置完成"
}

# 安装服务
install_service() {
    local service_file="gtv-backend.service"
    local service_path="/etc/systemd/system/$service_file"
    local service_dir="/etc/systemd/system"

    if [[ ! -f "$service_file" ]]; then
        error "服务文件不存在: $service_file"
        exit 1
    fi

    log "安装systemd服务..."

    # 备份现有的服务文件
    if [[ -f "$service_path" ]]; then
        backup_path="${service_path}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$service_path" "$backup_path"
        warning "已备份服务文件到: $backup_path"
    fi

    # 复制服务文件
    cp "$service_file" "$service_path"

    # 重载systemd配置
    systemctl daemon-reload
    systemctl reset-failed gtv-backend.service 2>/dev/null || true

    success "服务安装完成"
}

# 配置服务
configure_service() {
    local project_dir="/home/xichi/workspace/visa-assessment"
    local config_file="$project_dir/backend_monitor_config.json"

    log "配置服务..."

    # 切到项目目录
    cd "$project_dir" || {
        error "项目目录不存在: $project_dir"
        exit 1
    }

    # 安装Python依赖
    log "安装Python依赖..."

    # 检查虚拟环境
    local python_bin="python3"
    if [[ -x "./myenv/bin/python" ]]; then
        python_bin="./myenv/bin/python"
    elif [[ -x "./.venv/bin/python" ]]; then
        python_bin="./.venv/bin/python"
    else
        warning "未找到虚拟环境，使用系统Python"
    fi

    # 安装依赖
    if ! "$python_bin" -c "import psutil, requests" 2>/dev/null; then
        log "安装监控依赖..."
        "$python_bin" -m pip install --user psutil requests
    fi

    success "服务配置完成"
}

# 启动服务
start_service() {
    log "启动GTV后端服务..."

    if systemctl is-active --quiet gtv-backend.service; then
        warning "服务已在运行，正在重启..."
        systemctl restart gtv-backend.service
    else
        systemctl start gtv-backend.service
    fi

    # 等待服务启动
    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if systemctl is-active --quiet gtv-backend.service; then
            success "服务启动成功"
            return 0
        fi

        log "等待服务启动... (尝试: $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    error "服务启动失败"
    systemctl status gtv-backend.service
    journalctl -u gtv-backend.service -n 50 --no-pager
    return 1
}

# 启用服务自启动
enable_service() {
    log "启用服务自动启动..."
    systemctl enable gtv-backend.service
    success "服务已设置为自动启动"
}

# 显示状态
show_status() {
    log "服务状态:"
    echo "=================================="
    systemctl status gtv-backend.service --no-pager
    echo "=================================="

    if [[ -f "/home/xichi/workspace/visa-assessment/backend_status.json" ]]; then
        log "后端服务状态:"
        cat "/home/xichi/workspace/visa-assessment/backend_status.json" | python3 -m json.tool
    fi
}

# 显示日志
show_logs() {
    log "最近50条服务日志:"
    echo "=================================="
    journalctl -u gtv-backend.service -n 50 --no-pager
    echo "=================================="
}

# 创建监控工具
create_monitor_tool() {
    local monitor_script="/usr/local/bin/gtv-monitor"

    cat > "$monitor_script" << 'EOF'
#!/bin/bash
# GTV服务监控工具

SERVICE_NAME="gtv-backend"
PROJECT_DIR="/home/xichi/workspace/visa-assessment"

usage() {
    echo "用法: gtv-monitor [命令]"
    echo ""
    echo "命令:"
    echo "  status       显示服务状态"
    echo "  restart      重启服务"
    echo "  logs         查看日志"
    echo "  stop         停止服务"
    echo "  start        启动服务"
    echo "  monitor      启动Python监控程序"
    echo "  config       显示配置文件"
    echo "  backup       备份日志"
    echo ""
}

case "${1:-status}" in
    status)
        echo "=== Systemd服务状态 ==="
        systemctl status "$SERVICE_NAME" --no-pager
        echo ""
        echo "=== Python服务状态 ==="
        if [[ -f "$PROJECT_DIR/backend_status.json" ]]; then
            cat "$PROJECT_DIR/backend_status.json"
        else
            echo '{"status": "stopped"}'
        fi
        ;;
    restart)
        echo "重启服务..."
        sudo systemctl restart "$SERVICE_NAME"
        sleep 2
        gtv-monitor status
        ;;
    logs)
        echo "=== 最近日志 ==="
        journalctl -u "$SERVICE_NAME" -n 100 --no-pager
        echo ""
        echo "=== Python监控日志 ==="
        tail -n 50 "$PROJECT_DIR/logs/backend_monitor.log" 2>/dev/null || echo "暂无监控日志"
        ;;
    stop)
        echo "停止服务..."
        sudo systemctl stop "$SERVICE_NAME"
        ;;
    start)
        echo "启动服务..."
        sudo systemctl start "$SERVICE_NAME"
        sleep 2
        gtv-monitor status
        ;;
    monitor)
        echo "启动Python监控程序..."
        cd "$PROJECT_DIR"
        python3 backend_monitor.py start
        ;;
    config)
        echo "=== 服务配置 ==="
        systemctl cat "$SERVICE_NAME" 2>/dev/null | head -20
        echo ""
        echo "=== 监控配置 ==="
        if [[ -f "$PROJECT_DIR/backend_monitor_config.json" ]]; then
            cat "$PROJECT_DIR/backend_monitor_config.json"
        else
            echo "使用默认配置"
        fi
        ;;
    backup)
        echo "备份日志..."
        backup_dir="/var/backups/gtv-$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"

        # 备份日志文件
        cp -r "$PROJECT_DIR/ace_gtv/logs" "$backup_dir/" 2>/dev/null || true
        cp "$PROJECT_DIR/backend_startup.log" "$backup_dir/" 2>/dev/null || true
        cp "$PROJECT_DIR/backend_status.json" "$backup_dir/" 2>/dev/null || true

        # 备份journal日志
        journalctl -u "$SERVICE_NAME" --no-pager > "$backup_dir/journal.log"

        tar -czf "$backup_dir.tar.gz" "$backup_dir"
        rm -rf "$backup_dir"

        echo "备份完成: $backup_dir.tar.gz"
        ;;
    *)
        usage
        exit 1
        ;;
esac
EOF

    chmod +x "$monitor_script"
    success "监控工具已安装到: $monitor_script"
}

# 主函数
main() {
    log "开始安装GTV后端服务systemd管理..."

    case "${1:-install}" in
        install)
            check_root
            check_systemd
            check_dependencies
            create_user
            setup_permissions
            configure_service
            install_service
            enable_service
            create_monitor_tool
            start_service
            show_status
            ;;
        start)
            start_service
            show_status
            ;;
        status)
            show_status
            ;;
        stop)
            log "停止服务..."
            systemctl stop gtv-backend.service
            success "服务已停止"
            ;;
        restart)
            log "重启服务..."
            systemctl restart gtv-backend.service
            show_status
            ;;
        logs)
            show_logs
            ;;
        uninstall)
            log "卸载服务..."
            systemctl stop gtv-backend.service
            systemctl disable gtv-backend.service
            rm -f /etc/systemd/system/gtv-backend.service
            systemctl daemon-reload
            warning "服务已卸载"
            ;;
        *)
            echo "用法: $0 [install|start|stop|restart|status|logs|uninstall]"
            exit 1
            ;;
esac
}

# 执行主函数
main "$@"