# 多阶段构建 - 前端和后端

# Stage 1: 前端构建
FROM node:18-bookworm-slim AS frontend-builder

# 设置环境变量用于国内加速源
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

WORKDIR /app

# 复制前端依赖文件
COPY package.json pnpm-lock.yaml .npmrc ./

# 安装pnpm（优先使用 corepack）
RUN set -eux; \
    if command -v corepack >/dev/null 2>&1; then corepack enable; corepack prepare pnpm@10.19.0 --activate; else npm install -g pnpm; fi; \
    pnpm config set registry "https://registry.npmmirror.com"

# 安装前端依赖（缓存 pnpm store 加速二次构建）
RUN pnpm install --frozen-lockfile

# 复制前端源代码
COPY . .

# 构建前端
RUN pnpm build

# Stage 2: Python后端阶段
FROM node:18-bookworm-slim AS backend

# 设置国内源和Python环境变量
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
    PIP_EXTRA_INDEX_URL=https://pypi.org/simple

# 切换 apt 源到阿里镜像
RUN set -eux; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i 's|http://deb.debian.org|http://mirrors.aliyun.com|g; s|http://security.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list || true; \
      sed -i 's|http://archive.ubuntu.com|http://mirrors.aliyun.com|g; s|http://security.ubuntu.com|http://mirrors.aliyun.com|g' /etc/apt/sources.list || true; \
    fi

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# 复制Python依赖文件
COPY ace_gtv/requirements.txt ./

# 安装Python依赖（使用缓存加速）
RUN pip install -r requirements.txt

# 创建必要的目录
RUN mkdir -p data personal_kb resumes

# 复制后端源代码
COPY ace_gtv/ ./

# 复制环境变量文件
COPY .env.local ./

# 复制前端构建结果
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=frontend-builder /app/.npmrc ./.npmrc
COPY --from=frontend-builder /app/next.config.mjs ./next.config.mjs
COPY --from=frontend-builder /app/tsconfig.json ./tsconfig.json
COPY --from=frontend-builder /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=frontend-builder /app/components.json ./components.json
COPY --from=frontend-builder /app/app ./app
COPY --from=frontend-builder /app/components ./components
COPY --from=frontend-builder /app/lib ./lib
COPY --from=frontend-builder /app/hooks ./hooks
COPY --from=frontend-builder /app/styles ./styles

# 安装 Node.js 运行时依赖（使用 NodeSource 源加速）
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# 安装 pnpm 并配置国内源
RUN set -eux; \
    if command -v corepack >/dev/null 2>&1; then corepack enable; corepack prepare pnpm@10.19.0 --activate; else npm install -g pnpm; fi; \
    pnpm config set registry "https://registry.npmmirror.com"

# 安装前端运行时依赖（缓存 pnpm store）
RUN pnpm install --frozen-lockfile --prod

# 创建启动脚本
RUN cat > /app/start.sh <<'SH'
#!/bin/bash
set -ex

# 启动Python后端服务
cd /app
python resume_processor.py &
python api_server_working.py &

# 等待后端服务启动
sleep 5

# 启动Next.js前端
cd /app
pnpm start
SH
RUN chmod +x /app/start.sh

# 暴露端口
EXPOSE 3000 5001 5002

# 设置环境变量
ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1

# 启动服务
CMD ["/app/start.sh"]
