# 登录 502 Bad Gateway 排查说明

当浏览器访问 `http://xichigroup.com.cn/api/auth/login` 出现 **502 Bad Gateway**、且响应 **Content-Length: 0** 时，说明**反向代理**（如 Nginx/Caddy，例如监听在 127.0.0.1:17890）在把请求转给**上游（Next 或后端）**时失败。

## 可能原因

1. **上游未启动**：Next 或 Python 后端没有运行，或监听端口不对。
2. **代理转错地址/端口**：`/api` 没有正确转发到 Next 应用（例如应转到 `http://127.0.0.1:3000` 或 `http://127.0.0.1:80`）。
3. **超时**：上游处理太慢（如 Next 调后端 5005 超时），代理在等待中超时并返回 502。
4. **上游崩溃**：Next 或后端在处理请求时抛错，连接被关闭，代理得到无效响应。

## 排查步骤

### 1. 确认 Next 应用已启动并可访问

在**运行 Next 的机器**上：

```bash
# 若 Next 监听 80
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/
# 或 3000
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
```

应返回 `200`。也可直接测健康接口（若已部署）：

```bash
curl -s http://127.0.0.1:80/api/health
# 期望: {"ok":true,"service":"next"}
```

若这里就失败，说明 Next 没起来或端口不对，需先修好（如用 `./start_project.sh` 或 `pm2 start`）。

### 2. 确认 Python 后端已启动（Next 登录会调它）

Next 的登录接口会请求后端 `BACKEND_API_URL`（默认 `http://localhost:5005`）：

```bash
curl -s http://127.0.0.1:5005/health
# 期望: 含 "healthy" 或 200
```

若后端未启动或端口不对，Next 在请求后端时会报错或超时，可能导致代理收到异常并返回 502。请在同一台机或后端所在机启动后端，并保证 Next 能访问该地址（本机用 `http://127.0.0.1:5005` 即可）。

### 3. 检查反向代理配置（Nginx 示例）

代理（如监听 17890）需要把 **整站（含 /api）** 都转到 Next，例如：

```nginx
server {
    listen 17890;
    server_name xichigroup.com.cn;

    location / {
        proxy_pass http://127.0.0.1:80;   # 或 Next 实际监听端口，如 3000
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

要点：

- `proxy_pass` 指向**实际运行 Next 的地址和端口**（如 `http://127.0.0.1:80`）。
- 适当增大 `proxy_read_timeout`（如 60s），避免 Next 调后端时稍慢就被代理判超时导致 502。

改完重载 Nginx：`nginx -t && nginx -s reload`。

### 4. 环境变量（Next 所在进程）

Next 在请求认证后端时用 `BACKEND_API_URL`（未设置则用 `NEXT_PUBLIC_API_URL` 或 `http://localhost:5005`）。若后端不在本机，需在**启动 Next 的环境**里设置：

```bash
export BACKEND_API_URL="http://后端地址:5005"
# 例如同机: http://127.0.0.1:5005
```

用 PM2 时可在 `start_project.sh` 或 `ecosystem.config.js` 里配置 `BACKEND_API_URL`。

## 快速自测（本机直连 Next，绕过代理）

在服务器上直接请求 Next（不经过 17890）：

```bash
curl -s -X POST http://127.0.0.1:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xichigroup.com.cn","password":"xichi@123"}'
```

- 若这里返回 JSON（成功或“邮箱或密码错误”），说明 Next 和认证逻辑正常，问题在**代理或代理到 Next 的链路**。
- 若这里就 502/无响应，说明问题在 **Next 或后端未启动/崩溃/端口错误**。

按上面步骤逐项检查后，502 和“登录响应异常”应能对应解决。
