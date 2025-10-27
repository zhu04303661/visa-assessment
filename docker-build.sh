#!/bin/bash

# GTV Visa Assessment Docker构建脚本

set -e

echo "🐳 开始构建GTV Visa Assessment Docker镜像..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查docker-compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose未安装，请先安装docker-compose"
    exit 1
fi

# 创建环境变量文件（如果不存在）
if [ ! -f .env.local ]; then
    echo "📝 创建环境变量文件..."
    cat > .env.local << EOF
# 前端环境变量
NEXT_PUBLIC_API_URL=http://<your-server-ip-or-domain>:5002
RESUME_API_URL=http://127.0.0.1:5002
NODE_ENV=production

# Python后端环境变量
PYTHONUNBUFFERED=1
FLASK_ENV=production

# LLM配置（请替换为您的实际API密钥）
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# 超时设置
LLM_TIMEOUT_SEC=45
TOTAL_TIMEOUT_SEC=60

# 日志级别
LOG_LEVEL=INFO
EOF
    echo "⚠️  请编辑 .env.local 文件，添加您的API密钥"
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p ace_gtv/data ace_gtv/resumes ace_gtv/personal_kb

# 选择构建模式
echo "请选择构建模式："
echo "1) 生产环境 (单容器)"
echo "2) 生产环境 (多容器)"
echo "3) 开发环境"
read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo "🏗️  构建生产环境单容器镜像..."
        docker build -t gtv-visa-assessment:latest .
        echo "✅ 构建完成！"
        echo "🚀 运行命令: docker run -p 3000:3000 -p 5001:5001 -p 5002:5002 --env-file .env.local gtv-visa-assessment:latest"
        ;;
    2)
        echo "🏗️  构建生产环境多容器镜像..."
        docker-compose build
        echo "✅ 构建完成！"
        echo "🚀 运行命令: docker-compose up -d"
        ;;
    3)
        echo "🏗️  构建开发环境镜像..."
        docker build -f Dockerfile.dev -t gtv-visa-assessment:dev .
        echo "✅ 构建完成！"
        echo "🚀 运行命令: docker run -p 3000:3000 -p 5001:5001 -p 5002:5002 --env-file .env.local -v \$(pwd):/app gtv-visa-assessment:dev"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "📋 可用命令："
echo "  - 查看运行中的容器: docker ps"
echo "  - 查看日志: docker logs <container_id>"
echo "  - 停止容器: docker stop <container_id>"
echo "  - 进入容器: docker exec -it <container_id> /bin/bash"
echo ""
echo "🌐 访问地址："
echo "  - 前端: http://0.0.0.0:3000"
echo "  - ACE API: http://0.0.0.0:5001"
echo "  - 简历处理: http://0.0.0.0:5002"
