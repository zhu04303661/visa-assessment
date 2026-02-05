/**
 * useMentions Hook
 * 
 * 管理 @ mention 的状态和逻辑
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { MentionItem, MentionParseResult, ParsedMention, MentionType } from './types'

interface UseMentionsOptions {
  apiEndpoint?: string
  projectPath?: string
}

interface UseMentionsReturn {
  /** 可用的 mention 项目（从 API 加载） */
  items: MentionItem[]
  /** 加载中状态 */
  loading: boolean
  /** 搜索项目 */
  search: (query: string) => MentionItem[]
  /** 解析文本中的 mentions */
  parseMentions: (text: string) => MentionParseResult
  /** 格式化 mention 为文本 */
  formatMention: (item: MentionItem) => string
}

/**
 * 解析文本中的 @ mentions
 * 格式：@[type:name]
 */
export function parseMentions(text: string): MentionParseResult {
  const mentions: ParsedMention[] = []
  
  // 匹配 @[type:name] 格式
  const mentionRegex = /@\[(skill|file|folder|agent):([^\]]+)\]/g
  let match
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const [raw, type, name] = match
    mentions.push({
      type: type as MentionType,
      name,
      raw,
    })
  }
  
  // 清理文本，移除 mention 标记
  let cleanedText = text
  for (const mention of mentions) {
    cleanedText = cleanedText.replace(mention.raw, '')
  }
  cleanedText = cleanedText.trim()
  
  return { cleanedText, mentions }
}

/**
 * 格式化 mention 项目为文本
 */
export function formatMention(item: MentionItem): string {
  return `@[${item.type}:${item.name}]`
}

export function useMentions(apiEndpoint = '/api/copywriting', projectPath?: string): UseMentionsReturn {
  
  const [items, setItems] = useState<MentionItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // 获取 skills 作为 mention 项目
  useEffect(() => {
    async function fetchItems() {
      try {
        // 获取 skills
        const skillsUrl = `${apiEndpoint}/assistant/skills`
        const response = await fetch(skillsUrl)
        
        if (response.ok) {
          const result = await response.json()
          const skills = result.success ? result.data : []
          
          // 转换为 MentionItem 格式
          const mentionItems: MentionItem[] = skills.map((skill: any) => ({
            id: `skill:${skill.name}`,
            type: 'skill' as MentionType,
            name: skill.name,
            description: skill.description,
            path: skill.path,
          }))
          
          setItems(mentionItems)
        }
      } catch (err) {
        console.error('Failed to fetch mention items:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchItems()
  }, [apiEndpoint, projectPath])
  
  // 搜索项目
  const search = useCallback((query: string): MentionItem[] => {
    if (!query) return items
    
    const lowerQuery = query.toLowerCase()
    return items.filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery)
    )
  }, [items])
  
  return {
    items,
    loading,
    search,
    parseMentions,
    formatMention,
  }
}

export default useMentions
