#!/bin/bash

# 环境变量验证脚本
# 此脚本用于验证Docker容器中的环境变量配置

set -e

echo "🔍 开始环境变量验证..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 错误计数
ERRORS=0

# 检查.env.local文件是否存在
check_env_file() {
    echo "📋 检查.env.local文件..."

    # 检查多个可能的位置
    if [ -f "/app/.env.local" ]; then
        ENV_FILE="/app/.env.local"
        echo -e "${GREEN}✅ .env.local文件存在: $ENV_FILE${NC}"
    elif [ -f "./.env.local" ]; then
        ENV_FILE="./.env.local"
        echo -e "${GREEN}✅ .env.local文件存在: $ENV_FILE${NC}"
    elif [ -f "../.env.local" ]; then
        ENV_FILE="../.env.local"
        echo -e "${GREEN}✅ .env.local文件存在: $ENV_FILE${NC}"
    else
        echo -e "${RED}❌ 错误: .env.local文件未找到！${NC}"
        echo "   搜索路径: /app/.env.local, ./.env.local, ../.env.local"
        ((ERRORS++))
        return 1
    fi
}

# 尝试加载环境变量
load_env_file() {
    echo "🔧 加载环境变量..."
    set +e
    source "$ENV_FILE" 2>/dev/null
    LOAD_RESULT=$?
    set -e

    if [ $LOAD_RESULT -ne 0 ]; then
        echo -e "${RED}❌ 错误: .env.local文件加载失败！${NC}"
        echo "   可能原因: 文件格式错误、语法错误或权限问题"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ .env.local文件加载成功${NC}"
    fi
}

# 验证关键环境变量
validate_required_vars() {
    echo "🎯 验证必要环境变量..."

    # 定义必要的环境变量
    local required_vars=("DATABASE_URL" "API_KEY" "SECRET_KEY")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ 错误: 以下必要环境变量未设置:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "   ${RED}• $var${NC}"
        done
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ 所有必要环境变量已设置${NC}"
    fi
}

# 验证环境变量格式
validate_var_formats() {
    echo "🔍 验证环境变量格式..."

    # 验证DATABASE_URL格式
    if [ -n "$DATABASE_URL" ]; then
        if [[ "$DATABASE_URL" =~ ^(postgresql|mysql|mongodb|sqlite):// ]]; then
            echo -e "${GREEN}✅ DATABASE_URL格式正确${NC}"
        else
            echo -e "${YELLOW}⚠️ 警告: DATABASE_URL格式可能不正确${NC}"
            echo "   当前值: $DATABASE_URL"
            echo "   期望格式: postgresql://user:pass@host:port/db"
        fi
    fi

    # 验证API_KEY长度
    if [ -n "$API_KEY" ]; then
        key_length=${#API_KEY}
        if [ $key_length -ge 16 ]; then
            echo -e "${GREEN}✅ API_KEY长度符合要求${NC}"
        else
            echo -e "${YELLOW}⚠️ 警告: API_KEY可能太短${NC}"
            echo "   当前长度: $key_length"
            echo "   建议长度: ≥16字符"
        fi
    fi
}

# 生成验证报告
generate_report() {
    echo ""
    echo "📊 环境变量验证报告"
    echo "========================"

    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✅ 所有验证通过！${NC}"
        echo "   环境变量配置正确，容器可以继续启动"
        return 0
    else
        echo -e "${RED}❌ 发现 $ERRORS 个错误${NC}"
        echo "   请修复上述错误后再尝试启动容器"
        echo ""
        echo "🔧 建议的修复步骤:"
        echo "   1. 检查.env.local文件是否存在"
        echo "   2. 验证文件格式是否正确"
        echo "   3. 确保所有必要的环境变量都已设置"
        echo "   4. 重新构建Docker镜像"
        return 1
    fi
}

# 主函数
main() {
    check_env_file
    load_env_file
    validate_required_vars
    validate_var_formats
    generate_report
}

# 运行主函数
main "$@"