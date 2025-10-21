#!/bin/bash

# GTV ACE自我进化系统启动脚本

echo "🚀 启动GTV ACE自我进化系统..."

# 检查Python版本
python_version=$(python3 --version 2>&1)
echo "Python版本: $python_version"

# 检查Node.js版本
node_version=$(node --version 2>&1)
echo "Node.js版本: $node_version"

# 检查pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm未安装，请先安装pnpm"
    exit 1
fi

# 检查ACE框架
if [ ! -d "ACE-open" ]; then
    echo "❌ 未找到ACE-open框架，请确保文件夹存在"
    exit 1
fi

# 安装Python依赖
echo "📦 安装Python依赖..."
cd ace_gtv
pip install -r requirements.txt
cd ..

# 安装Node.js依赖
echo "📦 安装Node.js依赖..."
pnpm install

# 启动Python ACE服务器
echo "🐍 启动Python ACE服务器..."
cd ace_gtv
python3 api_server_working.py &
ACE_PID=$!
cd ..

# 等待ACE服务器启动
echo "⏳ 等待ACE服务器启动..."
sleep 5

# 检查ACE服务器是否启动成功
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ ACE服务器启动成功"
else
    echo "❌ ACE服务器启动失败"
    kill $ACE_PID 2>/dev/null
    exit 1
fi

# 启动Next.js应用
echo "⚛️ 启动Next.js应用..."
pnpm dev &
NEXT_PID=$!

# 等待Next.js应用启动
echo "⏳ 等待Next.js应用启动..."
sleep 10

# 检查Next.js应用是否启动成功
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Next.js应用启动成功"
else
    echo "❌ Next.js应用启动失败"
    kill $ACE_PID 2>/dev/null
    kill $NEXT_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 GTV ACE自我进化系统启动成功！"
echo ""
echo "📡 服务地址："
echo "   - Next.js应用: http://localhost:3000"
echo "   - ACE API服务器: http://localhost:5001"
echo "   - 聊天页面: http://localhost:3000/chat"
echo ""
echo "🔗 API接口："
echo "   - 健康检查: http://localhost:5001/health"
echo "   - ACE聊天: http://localhost:5001/api/ace/chat"
echo "   - 知识库状态: http://localhost:5001/api/ace/playbook"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $ACE_PID 2>/dev/null; kill $NEXT_PID 2>/dev/null; echo "✅ 服务已停止"; exit 0' INT

# 保持脚本运行
wait