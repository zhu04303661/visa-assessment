/**
 * 斜杠命令下拉菜单组件
 * 
 * 功能：
 * - 检测输入框中的 / 触发
 * - 搜索过滤和高亮
 * - 键盘导航 (Arrow Up/Down, Enter, Escape)
 * - 位置自适应
 */

"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { SlashCommandOption } from "./types"
import { BUILTIN_COMMANDS, filterBuiltinCommands } from "./builtin-commands"
import { 
  MessageSquare, 
  GitBranch, 
  Code, 
  FileText, 
  Sparkles,
  Trash2,
  ClipboardList,
  Bot,
  Zap,
  RefreshCw,
  TestTube,
  BookOpen,
  Wrench,
  Gauge,
  Command,
} from "lucide-react"

interface SlashCommandDropdownProps {
  /** 是否显示下拉菜单 */
  isOpen: boolean
  /** 搜索查询 */
  query: string
  /** 命令列表 */
  commands?: SlashCommandOption[]
  /** 当前模式（用于隐藏相关命令） */
  currentMode?: 'ask' | 'agent' | 'plan'
  /** 选择命令回调 */
  onSelect: (command: SlashCommandOption) => void
  /** 关闭下拉菜单回调 */
  onClose: () => void
  /** 自定义命令列表（已废弃，使用 commands） */
  customCommands?: SlashCommandOption[]
  /** 锚点元素（用于定位） */
  anchorRef?: React.RefObject<HTMLElement>
  /** 下拉位置 */
  position?: { top: number; left: number }
  /** 自定义类名 */
  className?: string
}

/**
 * 获取命令图标
 */
function getCommandIcon(commandName: string) {
  const iconMap: Record<string, React.ReactNode> = {
    clear: <Trash2 className="w-4 h-4" />,
    plan: <ClipboardList className="w-4 h-4" />,
    agent: <Bot className="w-4 h-4" />,
    ask: <MessageSquare className="w-4 h-4" />,
    compact: <RefreshCw className="w-4 h-4" />,
    review: <Code className="w-4 h-4" />,
    commit: <GitBranch className="w-4 h-4" />,
    explain: <BookOpen className="w-4 h-4" />,
    fix: <Wrench className="w-4 h-4" />,
    test: <TestTube className="w-4 h-4" />,
    docs: <FileText className="w-4 h-4" />,
    refactor: <Sparkles className="w-4 h-4" />,
    optimize: <Gauge className="w-4 h-4" />,
  }
  return iconMap[commandName] || <Command className="w-4 h-4" />
}

/**
 * 获取分类标签
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    builtin: '系统',
    prompt: '快捷',
    custom: '自定义',
  }
  return labels[category] || category
}

export function SlashCommandDropdown({
  isOpen,
  query,
  commands = [],
  currentMode,
  onSelect,
  onClose,
  customCommands = [],
  anchorRef,
  position,
  className,
}: SlashCommandDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  
  // 使用 commands prop 或回退到 customCommands + 内置命令
  const allCommands = commands.length > 0 ? commands : [...customCommands, ...BUILTIN_COMMANDS]
  
  // 过滤命令
  const filteredCommands = useMemo(() => {
    let filtered = allCommands
    
    // 按查询过滤
    if (query) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(cmd =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery)
      )
    }
    
    // 隐藏当前模式的命令
    if (currentMode) {
      filtered = filtered.filter(cmd => {
        if (currentMode === 'plan' && cmd.name === 'plan') return false
        if (currentMode === 'agent' && cmd.name === 'agent') return false
        if (currentMode === 'ask' && cmd.name === 'ask') return false
        return true
      })
    }
    
    // 排序
    return filtered.sort((a, b) => 
      a.name.length - b.name.length || a.name.localeCompare(b.name)
    )
  }, [query, currentMode, allCommands])
  
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
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, filteredCommands, selectedIndex, onSelect, onClose])
  
  // 注册键盘事件
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])
  
  if (!isOpen || filteredCommands.length === 0) {
    return null
  }
  
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
        {filteredCommands.map((command, index) => (
          <button
            key={command.id}
            ref={(el) => { itemRefs.current[index] = el }}
            className={cn(
              "w-full flex items-start gap-3 px-3 py-2 rounded-md text-left",
              "transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
            onClick={() => onSelect(command)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
              {getCommandIcon(command.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">/{command.name}</span>
                {command.argumentHint && (
                  <span className="text-xs text-muted-foreground">
                    {command.argumentHint}
                  </span>
                )}
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  command.category === 'builtin' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                  command.category === 'prompt' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                  command.category === 'custom' && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                )}>
                  {getCategoryLabel(command.category)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {command.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SlashCommandDropdown
