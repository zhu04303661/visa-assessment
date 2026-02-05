/**
 * Plan 文件工具组件
 * 
 * 功能：
 * - 显示 Plan 文件内容（Markdown 渲染）
 * - 展开/折叠
 * - "View Plan" 按钮
 * - "Approve" 按钮（仅在 Plan 模式）
 */

"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Check,
  Copy,
  FileText,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PlanFileToolProps {
  /** Plan 内容 */
  content: string
  /** 文件名 */
  fileName?: string
  /** 是否正在创建/更新 */
  isStreaming?: boolean
  /** 是否为编辑操作 */
  isEdit?: boolean
  /** 当前模式是否为 Plan 模式 */
  isPlanMode?: boolean
  /** 查看 Plan 回调 */
  onViewPlan?: () => void
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

export function PlanFileTool({
  content,
  fileName = 'plan.md',
  isStreaming = false,
  isEdit = false,
  isPlanMode = false,
  onViewPlan,
  onApprove,
  className,
}: PlanFileToolProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const title = extractTitle(content) || fileName
  
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
  
  // 预览内容（前几行）
  const previewLines = content.split('\n').slice(0, 5).join('\n')
  const hasMoreContent = content.split('\n').length > 5
  
  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden",
      isStreaming && "border-blue-500/50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
          
          {isStreaming && (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {isEdit ? '更新中...' : '创建中...'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Copy */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制内容</TooltipContent>
          </Tooltip>
          
          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Content Preview / Full */}
      <div className={cn(
        "relative transition-all duration-200",
        isExpanded ? "max-h-96 overflow-y-auto" : "max-h-[72px] overflow-hidden"
      )}>
        <pre className="p-3 text-sm font-mono whitespace-pre-wrap break-words">
          {isExpanded ? content : previewLines}
        </pre>
        
        {/* Fade gradient when collapsed */}
        {!isExpanded && hasMoreContent && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2 p-2 border-t bg-muted/20">
        {/* View Plan */}
        {onViewPlan && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewPlan}
            className="h-7 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            查看计划
          </Button>
        )}
        
        {/* Approve (only in Plan mode) */}
        {isPlanMode && onApprove && !isStreaming && (
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
  )
}

export default PlanFileTool
