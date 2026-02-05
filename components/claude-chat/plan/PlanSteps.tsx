/**
 * Plan 步骤可视化组件
 * 
 * 功能：
 * - 显示计划步骤列表
 * - 步骤状态图标和进度条
 * - 展开/折叠详情
 * - 复杂度标签
 */

"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { PlanStep, PlanStepStatus } from "./types"
import {
  Circle,
  CheckCircle2,
  Loader2,
  SkipForward,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface PlanStepsProps {
  /** 步骤列表 */
  steps: PlanStep[]
  /** 计划标题 */
  title?: string
  /** 计划摘要 */
  summary?: string
  /** 是否显示进度条 */
  showProgress?: boolean
  /** 是否默认展开 */
  defaultExpanded?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 获取步骤状态图标
 */
function StepStatusIcon({ status, isStreaming }: { status: PlanStepStatus; isStreaming?: boolean }) {
  if (isStreaming && status === 'in_progress') {
    return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
  }
  
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case 'in_progress':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    case 'skipped':
      return <SkipForward className="w-4 h-4 text-muted-foreground" />
    default:
      return <Circle className="w-4 h-4 text-muted-foreground" />
  }
}

/**
 * 复杂度颜色
 */
function getComplexityColor(complexity: string): string {
  switch (complexity) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * 单个步骤项
 */
function StepItem({ step, index }: { step: PlanStep; index: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasDetails = step.description || (step.files && step.files.length > 0)
  
  return (
    <div className="group">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          className={cn(
            "w-full flex items-start gap-3 p-2 rounded-md text-left",
            "hover:bg-accent/50 transition-colors",
            hasDetails && "cursor-pointer"
          )}
          disabled={!hasDetails}
        >
          <div className="flex-shrink-0 mt-0.5">
            <StepStatusIcon status={step.status} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {index + 1}.
              </span>
              <span className={cn(
                "text-sm font-medium",
                step.status === 'completed' && "text-muted-foreground line-through",
                step.status === 'skipped' && "text-muted-foreground"
              )}>
                {step.title}
              </span>
              
              {step.estimatedComplexity && (
                <Badge variant="secondary" className={cn(
                  "text-xs px-1.5 py-0",
                  getComplexityColor(step.estimatedComplexity)
                )}>
                  {step.estimatedComplexity}
                </Badge>
              )}
            </div>
          </div>
          
          {hasDetails && (
            <div className="flex-shrink-0 text-muted-foreground">
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </CollapsibleTrigger>
        
        {hasDetails && (
          <CollapsibleContent>
            <div className="ml-7 pl-3 border-l-2 border-border">
              {step.description && (
                <p className="text-sm text-muted-foreground py-2">
                  {step.description}
                </p>
              )}
              
              {step.files && step.files.length > 0 && (
                <div className="py-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    相关文件：
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {step.files.map((file, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        {file}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

export function PlanSteps({
  steps,
  title,
  summary,
  showProgress = true,
  defaultExpanded = true,
  className,
}: PlanStepsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  
  // 计算进度
  const progress = useMemo(() => {
    if (steps.length === 0) return 0
    const completed = steps.filter(s => s.status === 'completed').length
    return Math.round((completed / steps.length) * 100)
  }, [steps])
  
  // 统计
  const stats = useMemo(() => {
    return {
      total: steps.length,
      completed: steps.filter(s => s.status === 'completed').length,
      inProgress: steps.filter(s => s.status === 'in_progress').length,
      pending: steps.filter(s => s.status === 'pending').length,
      skipped: steps.filter(s => s.status === 'skipped').length,
    }
  }, [steps])
  
  if (steps.length === 0) {
    return null
  }
  
  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">
                {title || '执行计划'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{stats.completed}/{stats.total} 完成</span>
              {showProgress && (
                <Progress value={progress} className="w-20 h-2" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3">
            {summary && (
              <p className="text-sm text-muted-foreground mb-3 pb-3 border-b">
                {summary}
              </p>
            )}
            
            <div className="space-y-1">
              {steps.map((step, index) => (
                <StepItem key={step.id} step={step} index={index} />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default PlanSteps
