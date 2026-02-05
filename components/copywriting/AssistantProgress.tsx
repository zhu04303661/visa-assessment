"use client"

import { useState, useEffect, useCallback } from "react"
import { useAssistant } from "./AssistantContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  Circle,
  Clock,
  Play,
  ChevronRight,
  Loader2,
  AlertCircle
} from "lucide-react"

interface WorkflowStep {
  id: string
  name: string
  name_en: string
  status: "pending" | "in_progress" | "completed" | "error"
  progress?: number
}

interface AssistantProgressProps {
  projectId: string
}

export function AssistantProgress({ projectId }: AssistantProgressProps) {
  const { setIsLoading } = useAssistant()
  
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: "1_collect", name: "材料收集", name_en: "Collect Materials", status: "completed" },
    { id: "2_analyze", name: "材料分析", name_en: "Analyze Materials", status: "completed" },
    { id: "3_framework", name: "GTV框架", name_en: "GTV Framework", status: "completed" },
    { id: "4_draft", name: "初稿生成", name_en: "Generate Drafts", status: "in_progress", progress: 60 },
    { id: "5_optimize", name: "内容优化", name_en: "Optimize Content", status: "pending" },
    { id: "6_review", name: "最终审核", name_en: "Final Review", status: "pending" },
  ])
  
  const [loading, setLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<string | null>("初稿生成中...")

  // 加载工作流状态
  const loadWorkflowStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/copywriting/api/projects/${projectId}/workflow`)
      const data = await response.json()
      
      if (data.success && data.data?.steps) {
        setWorkflowSteps(data.data.steps)
        setCurrentTask(data.data.current_task || null)
      }
    } catch (error) {
      console.error("加载工作流状态失败:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadWorkflowStatus()
  }, [loadWorkflowStatus])

  // 计算总体进度
  const calculateOverallProgress = () => {
    const completed = workflowSteps.filter(s => s.status === "completed").length
    const inProgress = workflowSteps.find(s => s.status === "in_progress")
    const progressValue = inProgress?.progress || 0
    
    return Math.round(((completed + progressValue / 100) / workflowSteps.length) * 100)
  }

  // 获取状态图标
  const getStatusIcon = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "in_progress":
        return "bg-blue-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-muted"
    }
  }

  const overallProgress = calculateOverallProgress()
  const currentStep = workflowSteps.find(s => s.status === "in_progress")
  const completedCount = workflowSteps.filter(s => s.status === "completed").length

  return (
    <div className="p-4 bg-white dark:bg-slate-900">
      {/* 进度概览 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
          <div>
            <div className="text-sm font-medium">打造进度概览</div>
            <div className="text-xs text-muted-foreground">
              已完成 {completedCount}/{workflowSteps.length} 个任务
            </div>
          </div>
        </div>
        
        {currentTask && (
          <Badge variant="secondary" className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {currentTask}
          </Badge>
        )}
      </div>
      
      {/* 进度条 */}
      <Progress value={overallProgress} className="h-2 mb-4" />
      
      {/* 工作流步骤 */}
      <div className="space-y-2">
        {workflowSteps.map((step, index) => (
          <div
            key={step.id}
            className={`
              flex items-center gap-3 p-2 rounded-lg transition-colors
              ${step.status === "in_progress" 
                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" 
                : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }
            `}
          >
            {/* 状态图标和连接线 */}
            <div className="flex flex-col items-center">
              {getStatusIcon(step.status)}
              {index < workflowSteps.length - 1 && (
                <div className={`w-0.5 h-4 mt-1 ${
                  step.status === "completed" ? "bg-green-500" : "bg-muted"
                }`} />
              )}
            </div>
            
            {/* 步骤信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  step.status === "in_progress" ? "text-blue-700 dark:text-blue-300" : ""
                }`}>
                  {step.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.name_en}
                </span>
              </div>
              
              {/* 子进度条 */}
              {step.status === "in_progress" && step.progress !== undefined && (
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress value={step.progress} className="h-1 flex-1" />
                  <span className="text-xs text-muted-foreground w-8">
                    {step.progress}%
                  </span>
                </div>
              )}
            </div>
            
            {/* 操作按钮 */}
            {step.status === "pending" && index === completedCount && (
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Play className="h-3 w-3 mr-1" />
                开始
              </Button>
            )}
            
            {step.status === "completed" && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
      
      {/* 快捷操作 */}
      <div className="mt-4 flex items-center gap-2">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          继续执行当前任务
        </Button>
        
        <Button variant="outline" size="sm">
          任务详情
        </Button>
      </div>
    </div>
  )
}
