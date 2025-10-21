#!/bin/bash
# 简历处理器测试快速启动脚本

echo "🧪 简历处理器测试启动脚本"
echo "================================"

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3"
    exit 1
fi

echo "✅ Python3环境检查通过"

# 检查当前目录
if [ ! -f "resume_processor.py" ]; then
    echo "❌ 错误: 请在ace_gtv目录下运行此脚本"
    exit 1
fi

echo "✅ 目录检查通过"

# 检查依赖
echo "🔍 检查Python依赖..."
python3 -c "
import sys
required_modules = ['flask', 'requests', 'dotenv']
missing_modules = []

for module in required_modules:
    try:
        __import__(module)
    except ImportError:
        missing_modules.append(module)

if missing_modules:
    print(f'❌ 缺少依赖模块: {missing_modules}')
    print('请运行: pip install -r requirements.txt')
    sys.exit(1)
else:
    print('✅ 依赖检查通过')
"

if [ $? -ne 0 ]; then
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p data personal_kb test_data
echo "✅ 目录创建完成"

# 检查配置文件
if [ -f "../.env.local" ]; then
    echo "📋 加载项目配置文件..."
    export $(cat ../.env.local | grep -v '^#' | xargs)
    echo "✅ 项目配置文件加载完成"
elif [ -f "test_config.env" ]; then
    echo "📋 加载测试配置文件..."
    export $(cat test_config.env | grep -v '^#' | xargs)
    echo "✅ 测试配置文件加载完成"
else
    echo "⚠️  未找到配置文件，使用默认配置"
    echo "💡 提示: 确保项目根目录存在 .env.local 文件或创建 test_config.env"
fi

# 运行测试
echo ""
echo "🚀 开始运行测试..."
echo "================================"

python3 test_resume_processor.py

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 测试完成！"
else
    echo ""
    echo "❌ 测试失败，请检查日志文件"
    exit 1
fi
