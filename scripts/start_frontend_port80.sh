#!/bin/bash

echo "🚀 启动前端 (Next.js) 在端口 80..."

# 检查端口80是否被占用
if netstat -tuln | grep -q ':80 '; then
    echo "⚠️  端口80已被占用，正在尝试释放..."
    sudo pkill -f "node.*port 80" 2>/dev/null
    sudo pkill -f "next.*port 80" 2>/dev/null
    sleep 2
fi

# 解析参数 --debug 或 --log-level=<LEVEL>
LOG_LEVEL=${LOG_LEVEL:-INFO}
for arg in "$@"; do
  case $arg in
    --debug)
      LOG_LEVEL=DEBUG
      shift
      ;;
    --log-level=*)
      LOG_LEVEL="${arg#*=}"
      shift
      ;;
    --prod)
      NODE_ENV="production"
      shift
      ;;
    *)
      ;;
  esac
done

echo "📝 日志级别(仅记录): $LOG_LEVEL"

# Set environment variables for the application
export NODE_ENV="${NODE_ENV:-development}"
export LOG_LEVEL="$LOG_LEVEL"

# 检查操作系统
case "$(uname -s)" in
    Linux*)
        # Linux系统
        sudo_required=true
        ;;
    Darwin*)
        # macOS系统，端口80需要sudo
        sudo_required=true
        ;;
    *)
        echo "⚠️  未知操作系统，端口80可能需要sudo权限"
        sudo_required=true
        ;;
esac

echo "🛑 停止现有 PM2 进程..."
pm2 stop frontend 2>/dev/null
pm2 delete frontend 2>/dev/null

# 选择启动模式
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 生产模式启动 Next.js 应用..."
    npm run build
    if [ "$sudo_required" = true ]; then
        echo "👑 使用sudo启动端口80生产服务..."
        sudo pm2 start ecosystem.config.js --only frontend-prod --env production
    else
        pm2 start ecosystem.config.js --only frontend-prod --env production
    fi
    echo "🌐 http://0.0.0.0:80 (生产模式)"
else
    echo "⚛️ 开发模式启动 Next.js 应用..."
    if [ "$sudo_required" = true ]; then
        echo "👑 使用sudo启动端口80开发服务..."
        sudo pm2 start ecosystem.config.js --only frontend --env development
    else
        pm2 start ecosystem.config.js --only frontend --env development
    fi
    echo "🌐 http://0.0.0.0:80 (开发模式)"
fi

echo "✅ Next.js 应用已通过PM2启动"
echo "📋 PM2 管理命令:"
echo "   pm2 list          # 查看进程状态"
echo "   pm2 logs frontend # 查看日志"
echo "   pm2 stop frontend # 停止进程"
echo "   pm2 restart frontend # 重启进程"
echo "   pm2 delete frontend # 删除进程"
echo ""
echo "🛑 停止服务命令:"
echo "   ./stop_frontend_port80.sh"

pm2 list