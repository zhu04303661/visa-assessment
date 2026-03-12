#!/bin/bash
# 同步 OpenClaw Skills
# 将项目中的 skill 文件同步到 OpenClaw workspace，或反向同步
#
# 用法:
#   ./sync-skills.sh push    # 项目 → OpenClaw workspace
#   ./sync-skills.sh pull    # OpenClaw workspace → 项目
#   ./sync-skills.sh         # 默认 push

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OC_SKILLS_DIR="$HOME/.openclaw/workspace/skills"

SKILLS=(
  gtv-assessment
  gtv-copywriting
  gtv-recommendation-letter
  resume-analyzer
  immigration-strategy
  uk-immigration-policy
)

ACTION="${1:-push}"

case "$ACTION" in
  push)
    echo "推送 skill 文件到 OpenClaw workspace..."
    for skill in "${SKILLS[@]}"; do
      if [ -d "$SCRIPT_DIR/$skill" ]; then
        mkdir -p "$OC_SKILLS_DIR/$skill"
        cp -r "$SCRIPT_DIR/$skill/"* "$OC_SKILLS_DIR/$skill/"
        echo "  ✓ $skill"
      else
        echo "  ✗ $skill (项目中不存在)"
      fi
    done
    echo "完成。运行 'openclaw skills list' 验证加载状态。"
    ;;
  pull)
    echo "从 OpenClaw workspace 拉取 skill 文件..."
    for skill in "${SKILLS[@]}"; do
      if [ -d "$OC_SKILLS_DIR/$skill" ]; then
        mkdir -p "$SCRIPT_DIR/$skill"
        cp -r "$OC_SKILLS_DIR/$skill/"* "$SCRIPT_DIR/$skill/"
        echo "  ✓ $skill"
      else
        echo "  ✗ $skill (OpenClaw中不存在)"
      fi
    done
    echo "完成。记得 git add 和 commit 变更。"
    ;;
  *)
    echo "用法: $0 [push|pull]"
    echo "  push - 将项目中的 skill 推送到 OpenClaw workspace"
    echo "  pull - 从 OpenClaw workspace 拉取 skill 到项目"
    exit 1
    ;;
esac
