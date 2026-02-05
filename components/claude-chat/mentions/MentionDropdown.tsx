/**
 * @ Mention 下拉菜单组件
 * 
 * 功能：
 * - 检测 @ 触发
 * - 搜索 Skills、Files、Folders
 * - 键盘导航
 * - 插入 @[type:name] 格式
 */

"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { MentionItem, MentionType } from "./types"
import { 
  Sparkles,
  FileText,
  Folder,
  Bot,
  Search,
} from "lucide-react"

interface MentionDropdownProps {
  /** 是否显示下拉菜单 */
  isOpen: boolean
  /** 搜索查询 */
  query: string
  /** 可用的 mention 项目 */
  items: MentionItem[]
  /** 选择 mention 回调 */
  onSelect: (item: MentionItem) => void
  /** 关闭下拉菜单回调 */
  onClose: () => void
  /** 加载中状态 */
  loading?: boolean
  /** 下拉位置 */
  position?: { top: number; left: number }
  /** 自定义类名 */
  className?: string
}

/**
 * 获取 mention 类型图标
 */
function getMentionIcon(type: MentionType) {
  const iconMap: Record<MentionType, React.ReactNode> = {
    skill: <Sparkles className="w-4 h-4 text-purple-500" />,
    file: <FileText className="w-4 h-4 text-blue-500" />,
    folder: <Folder className="w-4 h-4 text-yellow-500" />,
    agent: <Bot className="w-4 h-4 text-green-500" />,
  }
  return iconMap[type] || <Search className="w-4 h-4" />
}

/**
 * 获取类型标签
 */
function getTypeLabel(type: MentionType): string {
  const labels: Record<MentionType, string> = {
    skill: '技能',
    file: '文件',
    folder: '文件夹',
    agent: '代理',
  }
  return labels[type] || type
}

export function MentionDropdown({
  isOpen,
  query,
  items,
  onSelect,
  onClose,
  loading = false,
  position,
  className,
}: MentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  
  // 过滤项目
  const filteredItems = useMemo(() => {
    if (!query) return items
    
    const lowerQuery = query.toLowerCase()
    return items.filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery)
    )
  }, [items, query])
  
  // 分组显示
  const groupedItems = useMemo(() => {
    const groups: Record<MentionType, MentionItem[]> = {
      skill: [],
      file: [],
      folder: [],
      agent: [],
    }
    
    for (const item of filteredItems) {
      if (groups[item.type]) {
        groups[item.type].push(item)
      }
    }
    
    return groups
  }, [filteredItems])
  
  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, isOpen])
  
  // 滚动到选中项
  useEffect(() => {
    const selectedItem = itemRefs.current[selectedIndex]
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])
  
  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        )
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, filteredItems, selectedIndex, onSelect, onClose])
  
  // 注册键盘事件
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])
  
  if (!isOpen) {
    return null
  }
  
  if (loading) {
    return (
      <div
        className={cn(
          "absolute z-50 w-72 p-4",
          "bg-popover border border-border rounded-lg shadow-lg",
          "bottom-full mb-2 left-0",
          className
        )}
      >
        <div className="flex items-center justify-center text-muted-foreground">
          <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
          加载中...
        </div>
      </div>
    )
  }
  
  if (filteredItems.length === 0) {
    return (
      <div
        className={cn(
          "absolute z-50 w-72 p-4",
          "bg-popover border border-border rounded-lg shadow-lg",
          "bottom-full mb-2 left-0",
          className
        )}
      >
        <div className="text-center text-muted-foreground text-sm">
          未找到匹配项
        </div>
      </div>
    )
  }
  
  let globalIndex = 0
  
  return (
    <div
      ref={listRef}
      className={cn(
        "absolute z-50 w-72 max-h-64 overflow-y-auto",
        "bg-popover border border-border rounded-lg shadow-lg",
        "bottom-full mb-2 left-0",
        className
      )}
    >
      <div className="p-1">
        {/* Skills */}
        {groupedItems.skill.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
              技能
            </div>
            {groupedItems.skill.map((item) => {
              const idx = globalIndex++
              return (
                <button
                  key={item.id}
                  ref={(el) => { itemRefs.current[idx] = el }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                    "transition-colors",
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  {getMentionIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
        
        {/* Files */}
        {groupedItems.file.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
              文件
            </div>
            {groupedItems.file.map((item) => {
              const idx = globalIndex++
              return (
                <button
                  key={item.id}
                  ref={(el) => { itemRefs.current[idx] = el }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                    "transition-colors",
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  {getMentionIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.name}</div>
                    {item.path && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.path}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
        
        {/* Folders */}
        {groupedItems.folder.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
              文件夹
            </div>
            {groupedItems.folder.map((item) => {
              const idx = globalIndex++
              return (
                <button
                  key={item.id}
                  ref={(el) => { itemRefs.current[idx] = el }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                    "transition-colors",
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  {getMentionIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.name}</div>
                    {item.path && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.path}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MentionDropdown
