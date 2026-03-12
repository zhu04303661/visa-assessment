#!/bin/bash
# ============================================================
# OpenClaw Gateway 配置脚本
# 在 openclaw onboard 完成后运行此脚本应用所有必要配置
# ============================================================
set -e

echo "=== OpenClaw Gateway 配置 ==="

# Gateway 基础配置
openclaw config set gateway.port 18789
openclaw config set gateway.mode local
openclaw config set gateway.bind loopback

# Control UI 配置（允许通过 Nginx 代理访问 Dashboard）
openclaw config set gateway.controlUi.allowedOrigins '["*"]'
openclaw config set gateway.controlUi.allowInsecureAuth true
openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true

# 信任 Nginx 本地代理
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

echo ""
echo "=== 配置完成 ==="
echo ""
echo "后续步骤："
echo "  1. 配置 LLM 模型: openclaw configure --section model"
echo "  2. 获取 Gateway Token: openclaw doctor --generate-gateway-token"
echo "     或查看现有 token: openclaw config get gateway.auth.token"
echo "  3. 将 token 填入 Nginx 配置的 __GATEWAY_TOKEN__ 占位符"
echo "  4. 安装 systemd service: openclaw gateway install"
echo "  5. 启动: systemctl --user enable --now openclaw-gateway"
echo "  6. 同步 skills: cd ../openclaw-skills && ./sync-skills.sh push"
echo ""
