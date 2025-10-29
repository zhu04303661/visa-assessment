# 优化版多阶段构建 - 前端和后端

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
FROM python:3.13-slim-bookworm

# 设置构建参数用于灵活性
ARG PIP_INDEX_URL=https://pypi.org/simple
ARG PIP_EXTRA_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# 设置Python环境变量优化
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_EXTRA_INDEX_URL=${PIP_EXTRA_INDEX_URL} \
    FLASK_ENV=production

# 创建非root用户提高安全性
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# 安装系统依赖 - 使用缓存优化
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 复制Python依赖文件
COPY --chown=appuser:appuser ace_gtv/requirements.txt ./requirements.txt

# 安装依赖时使用缓存并添加重试机制
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt || \
    (echo "首次安装失败，尝试使用清华源..." && \
     pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple)

# 复制后端源代码和启动脚本
COPY --chown=appuser:appuser ace_gtv/ ./
COPY --chown=appuser:appuser docker_start_backend.sh ./start.sh
RUN chmod +x ./start.sh

# 复制前端构建结果
COPY --from=frontend-builder --chown=appuser:appuser /app/.next ./.next
COPY --from=frontend-builder --chown=appuser:appuser /app/public ./public
COPY --from=frontend-builder --chown=appuser:appuser /app/package.json ./package.json
COPY --from=frontend-builder --chown=appuser:appuser /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=frontend-builder --chown=appuser:appuser /app/.npmrc ./.npmrc
COPY --from=frontend-builder --chown=appuser:appuser /app/next.config.mjs ./next.config.mjs
COPY --from=frontend-builder --chown=appuser:appuser /app/tsconfig.json ./tsconfig.json
COPY --from=frontend-builder --chown=appuser:appuser /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=frontend-builder --chown=appuser:appuser /app/components.json ./components.json

# 创建必要的目录并设置权限
RUN mkdir -p data personal_kb resumes logs && \
    chown -R appuser:appuser data personal_kb resumes logs

# 安装 pnpm 并配置国内源
RUN set -eux; \
    if command -v corepack >/dev/null 2>&1; then corepack enable; corepack prepare pnpm@10.19.0 --activate; else npm install -g pnpm; fi; \
    pnpm config set registry "https://registry.npmmirror.com"

# 安装前端运行时依赖
RUN pnpm install --frozen-lockfile --prod

# 切换到非root用户
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import requests; exit(0) if requests.get('http://localhost:5001/health', timeout=5).status_code == 200 else exit(1)" || \
      python -c "import urllib.request; exit(0) if urllib.request.urlopen('http://localhost:5001/health', timeout=5).status == 200 else exit(1)"

# 暴露端口
EXPOSE 3000 5001 5002

# 设置环境变量
ENV NODE_ENV=production

# 启动服务
CMD ["./start.sh"]
