#!/bin/bash

# GTV ACE服务器启动脚本

echo "🚀 启动GTV ACE自我进化代理服务器..."

# 检查Python版本
python_version=$(python3 --version 2>&1)
echo "Python版本: $python_version"

# 检查是否在虚拟环境中
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ 检测到虚拟环境: $VIRTUAL_ENV"
else
    echo "⚠️  建议在虚拟环境中运行"
fi

# 安装依赖
echo "📦 安装Python依赖..."
pip install -r requirements.txt

# 检查ACE框架
echo "🔍 检查ACE框架..."
if [ -d "../ACE-open" ]; then
    echo "✅ ACE框架已找到"
else
    echo "❌ 未找到ACE框架，请确保ACE-open文件夹存在"
    exit 1
fi

# 启动服务器
echo "🌟 启动ACE API服务器..."
python3 api_server.py
