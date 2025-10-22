# 多阶段构建 - 前端和后端
FROM node:18-alpine AS frontend-builder

# 设置工作目录
WORKDIR /app

# 复制前端依赖文件
COPY package.json pnpm-lock.yaml .npmrc ./

# 安装pnpm
RUN npm install -g pnpm

# 安装前端依赖（使用.npmrc配置解决React 19兼容性问题）
RUN pnpm install --frozen-lockfile

# 复制前端源代码
COPY . .

# 构建前端
RUN pnpm build

# Python后端阶段
FROM python:3.10-slim AS backend

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制Python依赖文件
COPY ace_gtv/requirements.txt ./

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端源代码
COPY ace_gtv/ ./

# 创建必要的目录
RUN mkdir -p data personal_kb resumes

# 复制前端构建结果
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=frontend-builder /app/.npmrc ./.npmrc
COPY --from=frontend-builder /app/next.config.mjs ./next.config.mjs
COPY --from=frontend-builder /app/tsconfig.json ./tsconfig.json
COPY --from=frontend-builder /app/postcss.config.mjs ./postcss.config.mjs
# Tailwind CSS v4 不需要配置文件
COPY --from=frontend-builder /app/components.json ./components.json
COPY --from=frontend-builder /app/app ./app
COPY --from=frontend-builder /app/components ./components
COPY --from=frontend-builder /app/lib ./lib
COPY --from=frontend-builder /app/hooks ./hooks
COPY --from=frontend-builder /app/styles ./styles

# 安装Node.js和pnpm用于运行Next.js
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

# 安装前端运行时依赖（使用现有的package.json和pnpm-lock.yaml）
RUN pnpm install --frozen-lockfile

# 创建启动脚本
RUN echo '#!/bin/bash\n\
# 启动Python后端服务\n\
cd /app\n\
python resume_processor.py &\n\
python api_server.py &\n\
\n\
# 等待后端服务启动\n\
sleep 5\n\
\n\
# 启动Next.js前端\n\
pnpm start\n\
' > /app/start.sh && chmod +x /app/start.sh

# 暴露端口
EXPOSE 3000 5001 5002

# 设置环境变量
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

# 启动服务
CMD ["/app/start.sh"]
