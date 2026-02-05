/**
 * 聊天输入组件
 * 支持模式切换、技能选择、文件附件、斜杠命令、@ Mention
 */

"use client"

import { useState, useRef, useEffect, useCallback, forwardRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { ExecutionMode, SkillInfo } from "./types"
import {
  SendIcon,
  StopIcon,
  SpinnerIcon,
  MessageIcon,
  BotIcon,
  PlanIcon,
} from "./icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { SlashCommandDropdown } from "./commands/SlashCommandDropdown"
import { MentionDropdown } from "./mentions/MentionDropdown"
import type { SlashCommandOption } from "./commands/types"
import type { MentionItem } from "./mentions/types"
import { FileText } from "lucide-react"

// 模式配置
const MODES: {
  id: ExecutionMode
  name: string
  description: string
  icon: React.ReactNode
  shortcut: string
}[] = [
  {
    id: 'ask',
    name: 'Ask',
    description: '快速问答，直接获取回答',
    icon: <MessageIcon className="w-4 h-4" />,
    shortcut: '⌘1',
  },
  {
    id: 'agent',
    name: 'Agent',
    description: '智能代理，执行复杂任务',
    icon: <BotIcon className="w-4 h-4" />,
    shortcut: '⌘2',
  },
  {
    id: 'plan',
    name: 'Plan',
    description: '规划模式，生成详细计划',
    icon: <PlanIcon className="w-4 h-4" />,
    shortcut: '⌘3',
  },
]

interface ChatInputProps {
  onSend: (message: string, options?: { mode?: ExecutionMode; skill?: string }) => void
  onStop?: () => void
  isStreaming?: boolean
  currentMode: ExecutionMode
  onModeChange: (mode: ExecutionMode) => void
  skills?: SkillInfo[]
  selectedSkill?: string
  onSkillChange?: (skill: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  agentAvailable?: boolean
  /** 斜杠命令列表 */
  slashCommands?: SlashCommandOption[]
  /** 斜杠命令选择回调 */
  onSlashCommand?: (command: SlashCommandOption) => void
  /** Mention 项目列表 */
  mentionItems?: MentionItem[]
  /** Mention 选择回调 */
  onMentionSelect?: (item: MentionItem) => void
  /** 是否有 Memory 文件 */
  hasMemory?: boolean
  /** Memory 文件信息 */
  memoryFiles?: Array<{ type: string; name: string }>
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      onStop,
      isStreaming,
      currentMode,
      onModeChange,
      skills = [],
      selectedSkill,
      onSkillChange,
      placeholder = "输入消息...",
      disabled,
      className,
      agentAvailable = true,
      slashCommands = [],
      onSlashCommand,
      mentionItems = [],
      onMentionSelect,
      hasMemory = false,
      memoryFiles = [],
    },
    ref
  ) {
    const [value, setValue] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const composingRef = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)
    
    // 斜杠命令状态
    const [showSlashDropdown, setShowSlashDropdown] = useState(false)
    const [slashQuery, setSlashQuery] = useState('')
    const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 })
    
    // Mention 状态
    const [showMentionDropdown, setShowMentionDropdown] = useState(false)
    const [mentionQuery, setMentionQuery] = useState('')
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
    
    // 合并 ref
    useEffect(() => {
      if (ref && textareaRef.current) {
        if (typeof ref === 'function') {
          ref(textareaRef.current)
        } else {
          ref.current = textareaRef.current
        }
      }
    }, [ref])
    
    // 自动调整高度
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        const scrollHeight = textareaRef.current.scrollHeight
        textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`
      }
    }, [value])
    
    // 发送消息
    const handleSend = useCallback(() => {
      if (!value.trim() || isStreaming || disabled) return
      
      onSend(value.trim(), {
        mode: currentMode,
        skill: selectedSkill,
      })
      setValue('')
      
      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }, [value, isStreaming, disabled, onSend, currentMode, selectedSkill])
    
    // 处理输入变化，检测斜杠命令和 mention
    const handleValueChange = useCallback((newValue: string) => {
      setValue(newValue)
      
      // 检测斜杠命令触发
      if (newValue.startsWith('/')) {
        const query = newValue.slice(1).split(/\s/)[0] || ''
        setSlashQuery(query)
        setShowSlashDropdown(true)
        setShowMentionDropdown(false)
        
        // 设置下拉位置
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          setSlashPosition({ top: rect.top - 8, left: rect.left + 16 })
        }
      } else {
        setShowSlashDropdown(false)
      }
      
      // 检测 @ mention 触发
      const lastAtIndex = newValue.lastIndexOf('@')
      if (lastAtIndex >= 0 && !newValue.startsWith('/')) {
        const afterAt = newValue.slice(lastAtIndex + 1)
        // 检查 @ 后是否有空格（表示 mention 已完成）
        if (!afterAt.includes(' ') && afterAt.length < 30) {
          setMentionQuery(afterAt)
          setShowMentionDropdown(true)
          setShowSlashDropdown(false)
          
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setMentionPosition({ top: rect.top - 8, left: rect.left + 16 })
          }
        } else {
          setShowMentionDropdown(false)
        }
      } else if (!newValue.includes('@')) {
        setShowMentionDropdown(false)
      }
    }, [])
    
    // 斜杠命令选择处理
    const handleSlashSelect = useCallback((command: SlashCommandOption) => {
      setShowSlashDropdown(false)
      
      // 如果有参数提示，保留命令前缀让用户继续输入
      if (command.argumentHint) {
        setValue(`/${command.name} `)
        textareaRef.current?.focus()
      } else {
        // 无参数命令，立即执行
        onSlashCommand?.(command)
        setValue('')
      }
    }, [onSlashCommand])
    
    // Mention 选择处理
    const handleMentionSelect = useCallback((item: MentionItem) => {
      setShowMentionDropdown(false)
      
      // 替换 @ 之后的内容
      const lastAtIndex = value.lastIndexOf('@')
      if (lastAtIndex >= 0) {
        const before = value.slice(0, lastAtIndex)
        setValue(`${before}@[${item.type}:${item.name}] `)
      }
      
      onMentionSelect?.(item)
      textareaRef.current?.focus()
    }, [value, onMentionSelect])
    
    // 键盘事件
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // IME 输入中不处理
      if (composingRef.current) return
      
      // 下拉菜单打开时，让下拉处理键盘事件
      if (showSlashDropdown || showMentionDropdown) {
        if (['ArrowUp', 'ArrowDown', 'Tab', 'Escape'].includes(e.key)) {
          // 这些键由下拉组件处理
          return
        }
        if (e.key === 'Enter') {
          // Enter 由下拉组件处理选择
          return
        }
      }
      
      // Enter 发送（Shift+Enter 换行）
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
      
      // Escape 关闭下拉
      if (e.key === 'Escape') {
        setShowSlashDropdown(false)
        setShowMentionDropdown(false)
      }
      
      // 快捷键切换模式
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault()
          onModeChange('ask')
        } else if (e.key === '2' && agentAvailable) {
          e.preventDefault()
          onModeChange('agent')
        } else if (e.key === '3') {
          e.preventDefault()
          onModeChange('plan')
        }
      }
    }
    
    // IME 组合事件
    const handleCompositionStart = () => {
      composingRef.current = true
    }
    
    const handleCompositionEnd = () => {
      composingRef.current = false
    }
    
    const currentModeConfig = MODES.find(m => m.id === currentMode)
    
    return (
      <div ref={containerRef} className={cn("border-t bg-background relative", className)}>
        {/* 斜杠命令下拉 */}
        {showSlashDropdown && slashCommands.length > 0 && (
          <SlashCommandDropdown
            isOpen={showSlashDropdown}
            query={slashQuery}
            commands={slashCommands}
            currentMode={currentMode}
            onSelect={handleSlashSelect}
            onClose={() => setShowSlashDropdown(false)}
            position={slashPosition}
          />
        )}
        
        {/* Mention 下拉 */}
        {showMentionDropdown && mentionItems.length > 0 && (
          <MentionDropdown
            isOpen={showMentionDropdown}
            query={mentionQuery}
            items={mentionItems}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentionDropdown(false)}
            position={mentionPosition}
          />
        )}
        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          {/* 模式选择器 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2"
              >
                {currentModeConfig?.icon}
                <span>{currentModeConfig?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>执行模式</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MODES.map((mode) => {
                const isDisabled = mode.id === 'agent' && !agentAvailable
                return (
                  <DropdownMenuItem
                    key={mode.id}
                    onClick={() => !isDisabled && onModeChange(mode.id)}
                    disabled={isDisabled}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {mode.icon}
                      <div>
                        <div className="font-medium">{mode.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {mode.description}
                        </div>
                      </div>
                    </div>
                    <kbd className="text-xs text-muted-foreground">
                      {mode.shortcut}
                    </kbd>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* 技能选择器 */}
          {skills.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2"
                >
                  {selectedSkill ? (
                    <Badge variant="secondary" className="text-xs">
                      {skills.find(s => s.name === selectedSkill)?.display_name || selectedSkill}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">选择技能</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>可用技能</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onSkillChange?.(undefined)}
                >
                  <span className="text-muted-foreground">无（默认）</span>
                </DropdownMenuItem>
                {skills.map((skill) => (
                  <DropdownMenuItem
                    key={skill.name}
                    onClick={() => onSkillChange?.(skill.name)}
                  >
                    <div>
                      <div className="font-medium">{skill.display_name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {skill.description}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <div className="flex-1" />
          
          {/* Memory 指示器 */}
          {hasMemory && memoryFiles.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs gap-1">
                  <FileText className="w-3 h-3" />
                  {memoryFiles.map(f => f.name).join(', ')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>已加载项目记忆文件</p>
                <ul className="text-xs mt-1">
                  {memoryFiles.map((f, i) => (
                    <li key={i}>{f.type}: {f.name}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* 状态指示 */}
          {!agentAvailable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                  CLI 未安装
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Claude CLI 未安装，Agent 模式不可用</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="flex items-end gap-2 p-4">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary",
              "rounded-xl px-4 py-3"
            )}
            rows={1}
          />
          
          {/* 发送/停止按钮 */}
          {isStreaming ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-11 w-11 rounded-xl flex-shrink-0"
                  onClick={onStop}
                >
                  <StopIcon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>停止生成</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-11 w-11 rounded-xl flex-shrink-0"
                  onClick={handleSend}
                  disabled={!value.trim() || disabled}
                >
                  {disabled ? (
                    <SpinnerIcon className="w-5 h-5" />
                  ) : (
                    <SendIcon className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>发送消息 (Enter)</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* 底部提示 */}
        <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Enter 发送 · Shift+Enter 换行 · / 命令 · @ 引用
          </span>
          <span>
            ⌘1/2/3 切换模式
          </span>
        </div>
      </div>
    )
  }
)
