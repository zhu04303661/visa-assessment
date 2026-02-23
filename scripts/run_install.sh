#!/bin/bash

# Wrapper script to handle sudo password for install.sh

echo "ACE系统安装程序 - 需要sudo权限"
echo "请输入您的sudo密码以继续安装:"

# 获取sudo权限
sudo -v
if [ $? -ne 0 ]; then
    echo "错误: 无法获取sudo权限"
    exit 1
fi

# 运行主安装脚本
echo "开始执行安装脚本..."
bash install.sh

# 清理
sudo -k