/**
 * Claude Chat 组件库
 * 
 * 基于 1code 设计，适配 Next.js 的 Claude Code CLI 集成聊天界面
 */

// 主组件
export { ClaudeChat } from "./ClaudeChat"

// 子组件
export { MessagesList } from "./MessagesList"
export { ChatInput } from "./ChatInput"
export { ToolCallRenderer, ToolCallGroup } from "./ToolCallRenderer"

// Hooks
export { 
  useClaudeChat, 
  useSkills, 
  useServiceStatus,
  useSlashCommands,
  useMemoryInfo,
  parseSlashCommand,
  processSlashCommand,
} from "./hooks"

// 命令相关
export { 
  SlashCommandDropdown,
  BUILTIN_COMMANDS,
  filterBuiltinCommands,
  isImmediateCommand,
  getCommandPrompt,
} from "./commands"
export type { SlashCommand, SlashCommandOption, SlashCommandCategory } from "./commands"

// Mention 相关
export { MentionDropdown, useMentions, parseMentions, formatMention } from "./mentions"
export type { MentionItem, MentionType, MentionParseResult } from "./mentions"

// Plan 相关
export { PlanSteps, PlanFileTool, PlanSidebar, usePlanMode } from "./plan"
export type { Plan, PlanStep, PlanStepStatus, PlanApprovalState } from "./plan"

// 图标
export * from "./icons"

// 类型
export * from "./types"
