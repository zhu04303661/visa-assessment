/**
 * 斜杠命令类型定义
 */

export interface SlashCommand {
  id: string
  name: string
  description: string
  category: 'builtin' | 'prompt' | 'custom'
  source: 'builtin' | 'user' | 'project'
  argumentHint?: string
  prompt?: string
}

export interface SlashCommandOption extends SlashCommand {
  /** 用于 UI 显示的命令字符串 */
  command: string
}

export type SlashCommandCategory = 'builtin' | 'prompt' | 'custom'

export interface SlashCommandSearchResult {
  commands: SlashCommandOption[]
  query: string
  hasMore: boolean
}
