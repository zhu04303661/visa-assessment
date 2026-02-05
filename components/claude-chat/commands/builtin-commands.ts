/**
 * 内置斜杠命令定义
 * 
 * 命令类型：
 * - builtin: 立即执行的命令（如 /clear, /plan）
 * - prompt: 插入 prompt 文本的命令（如 /review, /commit）
 */

import type { SlashCommandOption } from './types'

/**
 * 内置命令列表
 */
export const BUILTIN_COMMANDS: SlashCommandOption[] = [
  // 状态切换命令（立即执行，不发送消息）
  {
    id: 'builtin:clear',
    name: 'clear',
    command: '/clear',
    description: '开始新对话（清空当前会话）',
    category: 'builtin',
    source: 'builtin',
  },
  {
    id: 'builtin:plan',
    name: 'plan',
    command: '/plan',
    description: '切换到规划模式（先规划后执行）',
    category: 'builtin',
    source: 'builtin',
  },
  {
    id: 'builtin:agent',
    name: 'agent',
    command: '/agent',
    description: '切换到代理模式（直接执行更改）',
    category: 'builtin',
    source: 'builtin',
  },
  {
    id: 'builtin:ask',
    name: 'ask',
    command: '/ask',
    description: '切换到问答模式（快速回答）',
    category: 'builtin',
    source: 'builtin',
  },
  {
    id: 'builtin:compact',
    name: 'compact',
    command: '/compact',
    description: '压缩上下文以减少 token 使用',
    category: 'builtin',
    source: 'builtin',
  },
  
  // Prompt 命令（插入 prompt 文本，需要发送）
  {
    id: 'builtin:review',
    name: 'review',
    command: '/review',
    description: '代码审查当前更改',
    category: 'prompt',
    source: 'builtin',
    prompt: `请审查当前代码更改，检查以下方面：
1. 代码质量和可读性
2. 潜在的 bug 或错误
3. 性能问题
4. 安全隐患
5. 最佳实践

$ARGUMENTS`,
  },
  {
    id: 'builtin:commit',
    name: 'commit',
    command: '/commit',
    description: '为暂存的更改生成提交信息',
    category: 'prompt',
    source: 'builtin',
    prompt: `请为当前暂存的 git 更改生成一个清晰、简洁的提交信息。

格式要求：
- 使用英文
- 遵循 Conventional Commits 规范
- 第一行不超过 72 个字符
- 如需要，添加详细描述

$ARGUMENTS`,
  },
  {
    id: 'builtin:explain',
    name: 'explain',
    command: '/explain',
    description: '解释选中的代码',
    category: 'prompt',
    source: 'builtin',
    argumentHint: '[code or question]',
    prompt: `请详细解释以下代码的功能、逻辑和设计思路：

$ARGUMENTS`,
  },
  {
    id: 'builtin:fix',
    name: 'fix',
    command: '/fix',
    description: '修复代码中的问题',
    category: 'prompt',
    source: 'builtin',
    argumentHint: '[error or issue]',
    prompt: `请分析并修复以下代码中的问题：

$ARGUMENTS`,
  },
  {
    id: 'builtin:test',
    name: 'test',
    command: '/test',
    description: '为代码生成测试用例',
    category: 'prompt',
    source: 'builtin',
    argumentHint: '[code or function]',
    prompt: `请为以下代码生成全面的测试用例：

$ARGUMENTS`,
  },
  {
    id: 'builtin:docs',
    name: 'docs',
    command: '/docs',
    description: '为代码生成文档',
    category: 'prompt',
    source: 'builtin',
    argumentHint: '[code]',
    prompt: `请为以下代码生成清晰的文档注释：

$ARGUMENTS`,
  },
  {
    id: 'builtin:refactor',
    name: 'refactor',
    command: '/refactor',
    description: '重构代码以提高质量',
    category: 'prompt',
    source: 'builtin',
    argumentHint: '[code or area]',
    prompt: `请重构以下代码，重点关注：
1. 提高可读性
2. 优化性能
3. 减少重复
4. 改善结构

$ARGUMENTS`,
  },
  {
    id: 'builtin:optimize',
    name: 'optimize',
    command: '/optimize',
    description: '优化代码性能',
    category: 'prompt',
    source: 'builtin',
    argumentHint: '[code]',
    prompt: `请分析并优化以下代码的性能：

$ARGUMENTS`,
  },
]

/**
 * 根据查询过滤内置命令
 */
export function filterBuiltinCommands(query: string): SlashCommandOption[] {
  if (!query) {
    return BUILTIN_COMMANDS
  }
  
  const lowerQuery = query.toLowerCase()
  return BUILTIN_COMMANDS.filter(cmd => 
    cmd.name.toLowerCase().includes(lowerQuery) ||
    cmd.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * 检查是否为立即执行的命令
 */
export function isImmediateCommand(commandName: string): boolean {
  const immediateCommands = ['clear', 'plan', 'agent', 'ask', 'compact']
  return immediateCommands.includes(commandName.toLowerCase())
}

/**
 * 获取命令的 prompt 内容
 */
export function getCommandPrompt(commandName: string): string | undefined {
  const command = BUILTIN_COMMANDS.find(
    cmd => cmd.name.toLowerCase() === commandName.toLowerCase()
  )
  return command?.prompt
}
