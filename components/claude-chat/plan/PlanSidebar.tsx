/**
 * Plan 侧边栏组件
 * 
 * 功能：
 * - 完整的 Plan 内容视图
 * - Rendered / Plaintext 切换
 * - Copy 和 Approve 按钮
 */

"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  X,
  Copy,
  Check,
  Eye,
  Code,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import ReactMarkdown from "react-markdown"

type ViewMode = 'rendered' | 'plaintext'

interface PlanSidebarProps {
  /** 是否显示 */
  isOpen: boolean
  /** Plan 内容 */
  content: string
  /** Plan 标题 */
  title?: string
  /** 当前模式是否为 Plan 模式 */
  isPlanMode?: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 批准 Plan 回调 */
  onApprove?: () => void
  /** 自定义类名 */
  className?: string
}

/**
 * 从 Markdown 内容提取标题
 */
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

export function PlanSidebar({
  isOpen,
  content,
  title,
  isPlanMode = false,
  onClose,
  onApprove,
  className,
}: PlanSidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('rendered')
  const [copied, setCopied] = useState(false)
  
  const displayTitle = title || extractTitle(content) || '执行计划'
  
  // 复制内容
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content])
  
  if (!isOpen) {
    return null
  }
  
  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-96 bg-background border-l shadow-xl z-50",
      "flex flex-col",
      "animate-in slide-in-from-right duration-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">{displayTitle}</h2>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'rendered' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('rendered')}
                className="h-7 text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                渲染
              </Button>
            </TooltipTrigger>
            <TooltipContent>Markdown 渲染视图</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'plaintext' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('plaintext')}
                className="h-7 text-xs"
              >
                <Code className="w-3 h-3 mr-1" />
                源码
              </Button>
            </TooltipTrigger>
            <TooltipContent>纯文本视图</TooltipContent>
          </Tooltip>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 text-xs"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制内容</TooltipContent>
          </Tooltip>
          
          {isPlanMode && onApprove && (
            <Button
              variant="default"
              size="sm"
              onClick={onApprove}
              className="h-7 text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              批准执行
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {viewMode === 'rendered' ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <pre className="text-sm font-mono whitespace-pre-wrap break-words">
              {content}
            </pre>
          )}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      {isPlanMode && onApprove && (
        <div className="p-4 border-t bg-muted/30">
          <Button
            variant="default"
            className="w-full"
            onClick={onApprove}
          >
            <Check className="w-4 h-4 mr-2" />
            批准并执行计划
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            按 ⌘+Enter 快速批准
          </p>
        </div>
      )}
    </div>
  )
}

export default PlanSidebar
