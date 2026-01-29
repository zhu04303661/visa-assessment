# 端口配置说明

## 前端端口配置

前端服务已配置为使用 **80端口**。

### 配置位置

1. **package.json** - 开发和生产环境的启动脚本已添加 `-p 80` 参数
2. **start_frontend.sh** - 启动脚本已更新端口提示信息

### 使用方法

#### 开发环境
```bash
npm run dev
# 或
pnpm dev
```

#### 生产环境
```bash
npm run start
# 或
pnpm start
```

#### 使用启动脚本
```bash
./start_frontend.sh
```

### ⚠️ 重要提示

**80端口权限要求：**

在Linux/macOS系统中，使用80端口（HTTP默认端口）通常需要 **root权限**。

#### 解决方案1：使用sudo运行（推荐用于生产环境）
```bash
sudo npm run dev
# 或
sudo ./start_frontend.sh
```

#### 解决方案2：使用端口转发（推荐用于开发环境）
如果不想使用root权限，可以使用端口转发：
```bash
# 在另一个终端运行
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
```

#### 解决方案3：使用非特权端口（推荐用于开发环境）
如果80端口不可用，可以临时使用其他端口：
```bash
# 临时使用3000端口
PORT=3000 npm run dev
```

### 验证端口是否可用

```bash
# 检查80端口是否被占用
sudo lsof -i :80
# 或
netstat -an | grep 80
```

### 防火墙配置

如果使用防火墙，需要开放80端口：

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### 访问地址

配置完成后，可以通过以下地址访问：
- http://localhost:80
- http://0.0.0.0:80
- http://your-server-ip:80

---

**注意：** 在生产环境中，建议使用Nginx等反向代理服务器来处理80端口，而不是直接让Node.js应用监听80端口。

