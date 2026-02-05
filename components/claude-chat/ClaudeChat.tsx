/**
 * ClaudeChat 主容器组件
 * 
 * 集成 Claude Code CLI 的完整聊天界面
 * 支持 Ask/Agent/Plan 三种模式
 */

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { MessagesList } from "./MessagesList"
import { ChatInput } from "./ChatInput"
import { 
  useClaudeChat, 
  useSkills, 
  useServiceStatus,
  useSlashCommands,
  useMemoryInfo,
  processSlashCommand,
} from "./hooks/useClaudeChat"
import { useMentions } from "./mentions/useMentions"
import { usePlanMode } from "./plan/usePlanMode"
import { PlanSidebar } from "./plan/PlanSidebar"
import type { ExecutionMode, SkillInfo, ServiceStatus } from "./types"
import type { SlashCommandOption } from "./commands/types"
import type { MentionItem } from "./mentions/types"
import { ClaudeIcon, ClearIcon, SpinnerIcon } from "./icons"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { BUILTIN_COMMANDS, isImmediateCommand } from "./commands/builtin-commands"

interface ClaudeChatProps {
  /** 项目 ID，用于上下文 */
  projectId?: string
  /** 项目路径（用于加载 Memory 和自定义命令） */
  projectPath?: string
  /** API 端点前缀 */
  apiEndpoint?: string
  /** 初始模式 */
  initialMode?: ExecutionMode
  /** 标题 */
  title?: string
  /** 是否显示头部 */
  showHeader?: boolean
  /** 自定义类名 */
  className?: string
  /** 样式高度 */
  height?: string | number
  /** 错误回调 */
  onError?: (error: string) => void
}

export function ClaudeChat({
  projectId,
  projectPath,
  apiEndpoint = '/api/copywriting',
  initialMode = 'ask',
  title = 'Claude Code 助手',
  showHeader = true,
  className,
  height = '100%',
  onError,
}: ClaudeChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [selectedSkill, setSelectedSkill] = useState<string | undefined>()
  
  // 使用聊天 hook
  const {
    messages,
    isStreaming,
    currentMode,
    error,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMode,
    retry,
  } = useClaudeChat({
    projectId,
    apiEndpoint,
    onError,
  })
  
  // 获取技能列表
  const { skills, loading: skillsLoading } = useSkills(apiEndpoint)
  
  // 获取服务状态
  const { status, loading: statusLoading } = useServiceStatus(apiEndpoint)
  
  // 获取斜杠命令
  const { commands: slashCommands, loading: commandsLoading } = useSlashCommands(apiEndpoint, projectPath)
  
  // 获取 Memory 信息
  const { memoryInfo, loading: memoryLoading } = useMemoryInfo(apiEndpoint, projectPath)
  
  // 获取 Mention 项目
  const { items: mentionItems, loading: mentionsLoading } = useMentions(apiEndpoint, projectPath)
  
  // Plan 模式管理
  const {
    isPlanMode,
    hasPendingApproval,
    planContent,
    showPlanSidebar,
    approvePlan,
    openPlanSidebar,
    closePlanSidebar,
    markPendingApproval,
  } = usePlanMode({
    currentMode,
    onModeChange: setMode,
    onSendMessage: (msg) => sendMessage(msg, { mode: 'agent' }),
  })
  
  // 合并内置命令和自定义命令
  const allCommands = useMemo(() => {
    if (slashCommands.length > 0) {
      return slashCommands
    }
    // 如果 API 还没返回，使用内置命令
    return BUILTIN_COMMANDS
  }, [slashCommands])
  
  // 初始化模式
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode)
    }
  }, [initialMode, setMode])
  
  // 斜杠命令处理
  const handleSlashCommand = useCallback(async (command: SlashCommandOption) => {
    // 处理立即执行的命令
    if (isImmediateCommand(command.name)) {
      switch (command.name.toLowerCase()) {
        case 'clear':
          clearMessages()
          return
        case 'plan':
          setMode('plan')
          return
        case 'agent':
          setMode('agent')
          return
        case 'ask':
          setMode('ask')
          return
        case 'compact':
          // TODO: 实现上下文压缩
          console.log('Compact command triggered')
          return
      }
    }
    
    // 对于 prompt 类型的命令，发送其 prompt
    if (command.prompt) {
      sendMessage(command.prompt, { mode: currentMode, skill: selectedSkill })
    }
  }, [clearMessages, setMode, currentMode, selectedSkill, sendMessage])
  
  // Mention 选择处理
  const handleMentionSelect = useCallback((item: MentionItem) => {
    console.log('Mention selected:', item)
    // TODO: 将 mention 内容添加到上下文
  }, [])
  
  // 发送消息处理
  const handleSend = useCallback(async (content: string, options?: { mode?: ExecutionMode; skill?: string }) => {
    // 处理斜杠命令
    const processedMessage = await processSlashCommand(content, {
      onClear: clearMessages,
      onModeChange: setMode,
      onCompact: () => console.log('Compact triggered'),
      getCommandContent: async (name) => {
        try {
          const response = await fetch(`${apiEndpoint}/assistant/commands/${name}/content`)
          if (response.ok) {
            const result = await response.json()
            return result.success ? result.data?.content : null
          }
        } catch {
          return null
        }
        return null
      },
    })
    
    // 如果命令被处理（返回 null），不发送消息
    if (processedMessage === null) {
      return
    }
    
    sendMessage(processedMessage, {
      mode: options?.mode || currentMode,
      skill: options?.skill || selectedSkill,
    })
  }, [sendMessage, currentMode, selectedSkill, clearMessages, setMode, apiEndpoint])
  
  // 启动 GTV 文案 Agent
  const handleStartAgent = useCallback(() => {
    // 切换到 Agent 模式
    setMode('agent')
    
    // 发送预设的启动 prompt
    const startPrompt = `你好！请帮我分析申请材料：

1. 先用 ls 或 find 命令列出 materials/ 目录中的所有文件
2. 对于 .docx 文件，使用 textutil -convert txt 转换后再读取
3. 对于 .pdf 和 .txt 文件，可以直接读取
4. 概述材料的类型和内容要点
5. 给出初步的 GTV 申请策略建议

请开始。`
    
    sendMessage(startPrompt, { mode: 'agent' })
  }, [setMode, sendMessage])
  
  // 模式变更处理
  const handleModeChange = useCallback((mode: ExecutionMode) => {
    setMode(mode)
  }, [setMode])
  
  // 技能变更处理
  const handleSkillChange = useCallback((skill: string | undefined) => {
    setSelectedSkill(skill)
  }, [])
  
  // 聚焦输入框
  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])
  
  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K 或 Ctrl+K 清空消息
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        clearMessages()
      }
      
      // ⌘/ 或 Ctrl+/ 聚焦输入框
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        focusInput()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearMessages, focusInput])
  
  const agentAvailable = status?.cli_available ?? true
  const isLoading = statusLoading || skillsLoading
  
  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col bg-background",
          className
        )}
        style={{ height }}
      >
        {/* 头部 */}
        {showHeader && (
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <ClaudeIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">{title}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isLoading ? (
                    <SpinnerIcon className="w-3 h-3" />
                  ) : (
                    <>
                      <Badge
                        variant={agentAvailable ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {agentAvailable ? 'CLI 已连接' : 'API 模式'}
                      </Badge>
                      {status && (
                        <span>{status.skills_count} 个技能可用</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* 清空按钮 */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    disabled={messages.length === 0}
                  >
                    <ClearIcon className="w-4 h-4 mr-1" />
                    清空
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认清空对话？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将清空所有消息记录，无法恢复。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={clearMessages}>
                      确认清空
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}
        
        {/* 消息列表 */}
        <MessagesList
          messages={messages}
          isStreaming={isStreaming}
          onRetry={retry}
          onStartAgent={handleStartAgent}
          className="flex-1"
        />
        
        {/* 输入区域 */}
        <ChatInput
          ref={inputRef}
          onSend={handleSend}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          currentMode={currentMode}
          onModeChange={handleModeChange}
          skills={skills}
          selectedSkill={selectedSkill}
          onSkillChange={handleSkillChange}
          agentAvailable={agentAvailable}
          slashCommands={allCommands}
          onSlashCommand={handleSlashCommand}
          mentionItems={mentionItems}
          onMentionSelect={handleMentionSelect}
          hasMemory={memoryInfo?.has_memory}
          memoryFiles={memoryInfo?.files}
          placeholder={
            currentMode === 'agent'
              ? "描述你想要完成的任务... (/ 命令, @ 引用)"
              : currentMode === 'plan'
              ? "描述需要规划的目标... (/ 命令, @ 引用)"
              : "输入你的问题... (/ 命令, @ 引用)"
          }
        />
        
        {/* Plan 侧边栏 */}
        <PlanSidebar
          isOpen={showPlanSidebar}
          content={planContent || ''}
          isPlanMode={isPlanMode}
          onClose={closePlanSidebar}
          onApprove={approvePlan}
        />
      </div>
    </TooltipProvider>
  )
}

// 导出所有子组件
export { MessagesList } from "./MessagesList"
export { ChatInput } from "./ChatInput"
export { ToolCallRenderer, ToolCallGroup } from "./ToolCallRenderer"
export { useClaudeChat, useSkills, useServiceStatus } from "./hooks/useClaudeChat"
export * from "./types"
export * from "./icons"
