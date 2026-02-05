/**
 * Mention 相关类型定义
 */

export type MentionType = 'skill' | 'file' | 'folder' | 'agent'

export interface MentionItem {
  id: string
  type: MentionType
  name: string
  description?: string
  path?: string
  icon?: string
}

export interface MentionSearchResult {
  items: MentionItem[]
  query: string
  hasMore: boolean
}

export interface ParsedMention {
  type: MentionType
  name: string
  raw: string
}

export interface MentionParseResult {
  cleanedText: string
  mentions: ParsedMention[]
}
