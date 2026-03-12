#!/bin/bash
# ============================================================
# visa-assessment 一键部署脚本
# ============================================================
# 用法: ./deploy/setup.sh --domain xichigroup.com.cn
#
# 前置条件:
#   - Ubuntu 20.04+ / Debian 11+
#   - Node.js 20+, npm, pnpm
#   - 域名已解析到服务器 IP
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 默认值
DOMAIN=""
SKIP_SSL=false
SKIP_OPENCLAW=false

usage() {
    echo "用法: $0 --domain <域名> [选项]"
    echo ""
    echo "选项:"
    echo "  --domain <域名>    必填，服务器域名"
    echo "  --skip-ssl         跳过 SSL 证书配置"
    echo "  --skip-openclaw    跳过 OpenClaw 安装配置"
    echo "  -h, --help         显示帮助"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        --skip-ssl) SKIP_SSL=true; shift ;;
        --skip-openclaw) SKIP_OPENCLAW=true; shift ;;
        -h|--help) usage ;;
        *) echo "未知参数: $1"; usage ;;
    esac
done

if [ -z "$DOMAIN" ]; then
    echo "错误: 必须指定 --domain"
    usage
fi

echo "============================================================"
echo "  visa-assessment 部署"
echo "  域名: $DOMAIN"
echo "  项目目录: $PROJECT_DIR"
echo "============================================================"
echo ""

# ----- 1. 系统依赖 -----
echo "[1/7] 安装系统依赖..."
sudo apt-get update -qq
sudo apt-get install -y -qq nginx certbot python3-certbot-nginx > /dev/null

# ----- 2. Node.js 项目构建 -----
echo "[2/7] 安装项目依赖并构建..."
cd "$PROJECT_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm build

# ----- 3. PM2 配置 -----
echo "[3/7] 配置 PM2..."
npm install -g pm2 2>/dev/null || true
cd "$PROJECT_DIR"
pm2 delete frontend-prod 2>/dev/null || true
pm2 start ecosystem.config.js --only frontend-prod
pm2 save

# ----- 4. Nginx 配置 -----
echo "[4/7] 配置 Nginx..."
NGINX_CONF="/etc/nginx/sites-enabled/$DOMAIN"

if [ ! "$SKIP_OPENCLAW" = true ]; then
    GATEWAY_TOKEN=$(openclaw config get gateway.auth.token 2>/dev/null | tr -d '"' || echo "__GATEWAY_TOKEN__")
else
    GATEWAY_TOKEN="__GATEWAY_TOKEN__"
fi

sudo cp "$SCRIPT_DIR/nginx/xichigroup.com.cn.conf" "$NGINX_CONF"
sudo sed -i "s/__DOMAIN__/$DOMAIN/g" "$NGINX_CONF"
sudo sed -i "s/__GATEWAY_TOKEN__/$GATEWAY_TOKEN/g" "$NGINX_CONF"

sudo nginx -t
sudo nginx -s reload
echo "  Nginx 配置完成"

# ----- 5. SSL 证书 -----
if [ "$SKIP_SSL" = true ]; then
    echo "[5/7] 跳过 SSL 配置"
else
    echo "[5/7] 配置 SSL 证书..."
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
        echo "  SSL 配置失败，请手动运行: sudo certbot --nginx -d $DOMAIN"
    }
fi

# ----- 6. OpenClaw -----
if [ "$SKIP_OPENCLAW" = true ]; then
    echo "[6/7] 跳过 OpenClaw 配置"
else
    echo "[6/7] 配置 OpenClaw..."

    if ! command -v openclaw &> /dev/null; then
        echo "  安装 OpenClaw..."
        npm install -g openclaw
    fi

    bash "$SCRIPT_DIR/openclaw/setup-openclaw.sh"

    GATEWAY_TOKEN=$(openclaw config get gateway.auth.token 2>/dev/null | tr -d '"')
    if [ -n "$GATEWAY_TOKEN" ] && [ "$GATEWAY_TOKEN" != "__GATEWAY_TOKEN__" ]; then
        sudo sed -i "s/__GATEWAY_TOKEN__/$GATEWAY_TOKEN/g" "$NGINX_CONF"
        sudo nginx -s reload
        echo "  Nginx 已更新 Gateway Token"
    fi

    openclaw gateway install 2>/dev/null || true
    systemctl --user enable --now openclaw-gateway 2>/dev/null || true

    echo "  同步 Skills..."
    bash "$PROJECT_DIR/openclaw-skills/sync-skills.sh" push

    echo "  OpenClaw 配置完成"
fi

# ----- 7. 创建下载目录 -----
echo "[7/7] 创建文件目录..."
mkdir -p "$PROJECT_DIR/public/downloads/"{assessment,resume,copywriting,recommendation,strategy}
touch "$PROJECT_DIR/public/downloads/.gitkeep"

echo ""
echo "============================================================"
echo "  部署完成！"
echo "============================================================"
echo ""
echo "  前端:       https://$DOMAIN/"
echo "  Chat 页面:  https://$DOMAIN/chat"
echo "  Dashboard:  https://$DOMAIN/openclaw/"
echo ""
echo "  管理命令:"
echo "    pm2 status                    # 查看进程状态"
echo "    pm2 logs frontend-prod        # 查看前端日志"
echo "    systemctl --user status openclaw-gateway  # Gateway 状态"
echo "    journalctl --user -u openclaw-gateway -f  # Gateway 日志"
echo ""
