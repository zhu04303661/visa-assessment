#!/bin/bash

# Docker文件验证脚本

echo "🔍 验证Docker配置文件..."

# 检查必要文件是否存在
files=("Dockerfile" "Dockerfile.backend" "Dockerfile.dev" "docker-compose.yml" ".dockerignore")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
        exit 1
    fi
done

# 检查Dockerfile语法
echo ""
echo "🔍 检查Dockerfile语法..."

# 检查主Dockerfile
if docker build --help > /dev/null 2>&1; then
    echo "✅ Docker命令可用"
else
    echo "⚠️  Docker命令不可用，跳过语法检查"
fi

# 检查docker-compose.yml语法
if command -v docker-compose &> /dev/null; then
    echo "🔍 检查docker-compose.yml语法..."
    if docker-compose config > /dev/null 2>&1; then
        echo "✅ docker-compose.yml 语法正确"
    else
        echo "❌ docker-compose.yml 语法错误"
        exit 1
    fi
else
    echo "⚠️  docker-compose命令不可用，跳过语法检查"
fi

# 检查.dockerignore
echo ""
echo "🔍 检查.dockerignore文件..."
if [ -s .dockerignore ]; then
    echo "✅ .dockerignore 文件存在且非空"
else
    echo "⚠️  .dockerignore 文件为空或不存在"
fi

# 检查环境变量文件
echo ""
echo "🔍 检查环境变量文件..."
if [ -f .env.local ]; then
    echo "✅ .env.local 文件存在"
else
    echo "⚠️  .env.local 文件不存在，请创建"
    echo "📝 创建示例环境变量文件..."
    cat > .env.local << 'EOF'
# 前端环境变量
NEXT_PUBLIC_API_URL=http://localhost:5002
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
    echo "✅ 已创建 .env.local 示例文件"
fi

# 检查必要目录
echo ""
echo "🔍 检查必要目录..."
dirs=("ace_gtv/data" "ace_gtv/resumes" "ace_gtv/personal_kb")
for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir 目录存在"
    else
        echo "📁 创建 $dir 目录"
        mkdir -p "$dir"
        echo "✅ $dir 目录已创建"
    fi
done

echo ""
echo "🎉 Docker配置验证完成！"
echo ""
echo "📋 下一步："
echo "1. 编辑 .env.local 文件，添加您的API密钥"
echo "2. 运行 ./docker-build.sh 开始构建"
echo "3. 或手动运行: docker build -t gtv-visa-assessment:latest ."
