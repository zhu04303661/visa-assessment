# 服务器部署指南

## 架构概览

```
浏览器 → Nginx (443/HTTPS)
            ├── /              → Next.js (127.0.0.1:3000)   # 前端应用
            ├── /ws/openclaw   → OpenClaw (127.0.0.1:18789) # Chat WebSocket
            ├── /openclaw/     → OpenClaw (127.0.0.1:18789) # Dashboard UI
            └── /openclaw      → OpenClaw (127.0.0.1:18789) # Dashboard WebSocket
```

## 快速部署

```bash
# 克隆项目
git clone <repo-url> visa-assessment
cd visa-assessment

# 一键部署
./deploy/setup.sh --domain xichigroup.com.cn
```

## 手动部署步骤

### 1. 系统环境

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx

# pnpm & pm2
npm install -g pnpm pm2
```

### 2. 项目构建

```bash
cd visa-assessment
pnpm install
pnpm build
pm2 start ecosystem.config.js --only frontend-prod
pm2 save
pm2 startup  # 设置开机自启
```

### 3. OpenClaw 安装

```bash
npm install -g openclaw
openclaw onboard          # 首次初始化，按提示配置 LLM API Key
bash deploy/openclaw/setup-openclaw.sh   # 应用 Gateway 配置
openclaw gateway install  # 安装 systemd service
systemctl --user enable --now openclaw-gateway

# 同步 Skills
cd openclaw-skills && ./sync-skills.sh push
```

### 4. Nginx 配置

```bash
# 获取 Gateway Token
GATEWAY_TOKEN=$(openclaw config get gateway.auth.token | tr -d '"')

# 部署 Nginx 配置
sudo cp deploy/nginx/xichigroup.com.cn.conf /etc/nginx/sites-enabled/xichigroup.com.cn
sudo sed -i "s/__DOMAIN__/xichigroup.com.cn/g" /etc/nginx/sites-enabled/xichigroup.com.cn
sudo sed -i "s/__GATEWAY_TOKEN__/$GATEWAY_TOKEN/g" /etc/nginx/sites-enabled/xichigroup.com.cn

sudo nginx -t && sudo nginx -s reload
```

### 5. SSL 证书

```bash
sudo certbot --nginx -d xichigroup.com.cn
```

## 关键配置说明

### Nginx 中 OpenClaw 代理的三个要点

| 配置 | 作用 | 不配的后果 |
|------|------|------------|
| `location = /openclaw` | Dashboard WebSocket 精确路径代理 | WebSocket 被 301 重定向，握手失败 (1006) |
| `proxy_hide_header Content-Security-Policy` | 移除 Dashboard 的 CSP 头 | 注入的 inline script 被 CSP 拦截，token 无法写入 |
| `sub_filter` 注入 token | 自动将 Gateway Token 写入 `location.hash` | Dashboard 无 token 认证，device identity 错误 |

### OpenClaw Gateway 关键配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `gateway.bind` | `loopback` | 仅监听 127.0.0.1，阻止外部直连 |
| `gateway.controlUi.dangerouslyDisableDeviceAuth` | `true` | 跳过浏览器 device identity 校验 |
| `gateway.controlUi.allowInsecureAuth` | `true` | 允许非 localhost 的 token 认证 |
| `gateway.trustedProxies` | `["127.0.0.1"]` | 信任 Nginx 代理传递的请求头 |

## 文件结构

```
deploy/
├── README.md                         # 本文件
├── setup.sh                          # 一键部署脚本
├── nginx/
│   └── xichigroup.com.cn.conf        # Nginx 配置模板（__DOMAIN__、__GATEWAY_TOKEN__ 占位符）
├── openclaw/
│   ├── openclaw.template.json        # OpenClaw 配置参考（仅供参考，通过命令行配置）
│   └── setup-openclaw.sh             # OpenClaw Gateway 配置脚本
└── systemd/                          # systemd 相关（由 openclaw gateway install 自动生成）

openclaw-skills/                      # OpenClaw Skills（git 管理）
├── sync-skills.sh                    # push/pull 同步脚本
├── gtv-assessment/
├── gtv-copywriting/
├── gtv-recommendation-letter/
├── resume-analyzer/
├── immigration-strategy/
└── uk-immigration-policy/
```

## 常用运维命令

```bash
# 前端
pm2 status                          # 查看进程
pm2 logs frontend-prod              # 实时日志
pm2 restart frontend-prod           # 重启

# OpenClaw Gateway
systemctl --user status openclaw-gateway     # 状态
journalctl --user -u openclaw-gateway -f     # 实时日志
systemctl --user restart openclaw-gateway    # 重启

# Nginx
sudo nginx -t                       # 测试配置
sudo nginx -s reload                # 重载

# SSL 证书续期（自动 cron，也可手动）
sudo certbot renew

# OpenClaw Skills 更新
cd openclaw-skills && ./sync-skills.sh push
```

## 故障排查

### Dashboard 显示 "disconnected (1006)"

1. 检查 Gateway 日志：`journalctl --user -u openclaw-gateway --since "5 min ago" | grep "[ws]"`
2. 如果看到 `device identity required`：确认 Nginx 配置中 `proxy_hide_header Content-Security-Policy` 存在
3. 如果看到 `connect failed`：确认 `location = /openclaw`（无斜杠）的精确匹配存在
4. 确认 token 正确：`openclaw config get gateway.auth.token` 与 Nginx 配置中的 token 一致

### Chat 页面显示 "AI顾问服务已离线"

1. 确认 Gateway 运行中：`systemctl --user status openclaw-gateway`
2. 确认 WebSocket 代理正常：`curl -sI https://domain/ws/openclaw -H "Upgrade: websocket"`（应返回非 301）
3. 检查 `components/openclaw-chat-ui.tsx` 中的 WebSocket URL 配置
