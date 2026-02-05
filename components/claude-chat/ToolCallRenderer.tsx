/**
 * 工具调用渲染器
 * 展示 Claude CLI 的工具调用过程和结果
 */

"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ToolCallPart } from "./types"
import { TOOL_NAMES } from "./types"
import {
  TerminalIcon,
  FileIcon,
  SearchIcon,
  GlobeIcon,
  ThinkingIcon,
  PlanIcon,
  MessageIcon,
  SpinnerIcon,
  CheckIcon,
  ExpandIcon,
  CollapseIcon,
  CopyIcon,
} from "./icons"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { Button } from "@/components/ui/button"

interface ToolCallRendererProps {
  toolCall: ToolCallPart
  className?: string
}

// 获取工具图标
function getToolIcon(toolName: string) {
  const icons: Record<string, React.ReactNode> = {
    'Read': <FileIcon className="w-4 h-4" />,
    'Write': <FileIcon className="w-4 h-4 text-green-500" />,
    'Edit': <FileIcon className="w-4 h-4 text-yellow-500" />,
    'Bash': <TerminalIcon className="w-4 h-4 text-purple-500" />,
    'Grep': <SearchIcon className="w-4 h-4 text-blue-500" />,
    'Glob': <SearchIcon className="w-4 h-4 text-blue-500" />,
    'WebSearch': <GlobeIcon className="w-4 h-4 text-cyan-500" />,
    'WebFetch': <GlobeIcon className="w-4 h-4 text-cyan-500" />,
    'Task': <PlanIcon className="w-4 h-4 text-orange-500" />,
    'AskUser': <MessageIcon className="w-4 h-4 text-pink-500" />,
    'Think': <ThinkingIcon className="w-4 h-4 text-indigo-500" />,
    'Plan': <PlanIcon className="w-4 h-4 text-emerald-500" />,
  }
  
  return icons[toolName] || <TerminalIcon className="w-4 h-4" />
}

// 获取状态指示器
function getStatusIndicator(state: ToolCallPart['state']) {
  switch (state) {
    case 'pending':
      return <SpinnerIcon className="w-3 h-3 text-muted-foreground" />
    case 'running':
      return <SpinnerIcon className="w-3 h-3 text-blue-500" />
    case 'complete':
      return <CheckIcon className="w-3 h-3 text-green-500" />
    case 'error':
      return <span className="w-3 h-3 text-red-500">✕</span>
    default:
      return null
  }
}

// 格式化参数显示
function formatArgs(args: Record<string, unknown>): string {
  // 提取关键参数
  if (args.path) return String(args.path)
  if (args.command) return String(args.command)
  if (args.query) return String(args.query)
  if (args.url) return String(args.url)
  if (args.pattern) return String(args.pattern)
  
  // 默认显示 JSON
  return JSON.stringify(args, null, 2)
}

// 截断长文本
function truncate(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function ToolCallRenderer({ toolCall, className }: ToolCallRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const toolDisplayName = TOOL_NAMES[toolCall.toolName] || toolCall.toolName
  const argsPreview = formatArgs(toolCall.args)
  const hasResult = Boolean(toolCall.result)
  
  // 复制结果
  const handleCopy = () => {
    if (toolCall.result) {
      navigator.clipboard.writeText(toolCall.result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 overflow-hidden",
        toolCall.state === 'error' && "border-red-500/50",
        className
      )}
    >
      {/* 头部 */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors",
          hasResult && "border-b border-border/50"
        )}
        onClick={() => hasResult && setIsExpanded(!isExpanded)}
      >
        {/* 工具图标 */}
        <div className="flex-shrink-0">
          {getToolIcon(toolCall.toolName)}
        </div>
        
        {/* 工具名称和参数预览 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {toolCall.state === 'running' || toolCall.state === 'pending' ? (
              <TextShimmer className="font-medium text-sm" duration={1.5}>
                {toolDisplayName}
              </TextShimmer>
            ) : (
              <span className="font-medium text-sm">{toolDisplayName}</span>
            )}
            {toolCall.state === 'running' && (
              <TextShimmer className="text-xs" duration={1.2}>
                执行中...
              </TextShimmer>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {truncate(argsPreview, 80)}
          </div>
        </div>
        
        {/* 状态指示器 */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {getStatusIndicator(toolCall.state)}
          {hasResult && (
            <button className="p-1 hover:bg-muted rounded transition-colors">
              {isExpanded ? (
                <CollapseIcon className="w-4 h-4" />
              ) : (
                <ExpandIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* 展开的结果 */}
      {isExpanded && hasResult && (
        <div className="relative">
          {/* 复制按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckIcon className="w-3 h-3 mr-1" />
                已复制
              </>
            ) : (
              <>
                <CopyIcon className="w-3 h-3 mr-1" />
                复制
              </>
            )}
          </Button>
          
          {/* 结果内容 */}
          <pre className="p-3 text-xs overflow-x-auto max-h-[300px] overflow-y-auto bg-background/50">
            <code>{toolCall.result}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

// 工具调用组渲染器（用于探索工具组）
interface ToolCallGroupProps {
  toolCalls: ToolCallPart[]
  title?: string
  className?: string
}

export function ToolCallGroup({ toolCalls, title, className }: ToolCallGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (toolCalls.length === 0) return null
  
  const completedCount = toolCalls.filter(t => t.state === 'complete').length
  const runningCount = toolCalls.filter(t => t.state === 'running').length
  
  return (
    <div className={cn("rounded-lg border bg-muted/20 overflow-hidden", className)}>
      {/* 组头部 */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <SearchIcon className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-sm">
          {title || `探索中`}
        </span>
        <span className="text-xs text-muted-foreground">
          ({completedCount}/{toolCalls.length} 完成)
          {runningCount > 0 && ` · ${runningCount} 执行中`}
        </span>
        <div className="flex-1" />
        <button className="p-1 hover:bg-muted rounded transition-colors">
          {isExpanded ? (
            <CollapseIcon className="w-4 h-4" />
          ) : (
            <ExpandIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      
      {/* 展开的工具列表 */}
      {isExpanded && (
        <div className="border-t border-border/50 p-2 space-y-2">
          {toolCalls.map((toolCall) => (
            <ToolCallRenderer
              key={toolCall.toolCallId}
              toolCall={toolCall}
            />
          ))}
        </div>
      )}
    </div>
  )
}
