/**
 * usePlanMode Hook
 * 
 * 管理 Plan 模式的状态和批准流程
 */

import { useState, useCallback, useEffect } from 'react'
import type { Plan, PlanApprovalState } from './types'

interface UsePlanModeOptions {
  /** 当前执行模式 */
  currentMode: 'ask' | 'agent' | 'plan'
  /** 设置模式回调 */
  onModeChange: (mode: 'ask' | 'agent' | 'plan') => void
  /** 发送消息回调 */
  onSendMessage: (message: string) => void
}

interface UsePlanModeReturn {
  /** 是否为 Plan 模式 */
  isPlanMode: boolean
  /** 是否有待批准的 Plan */
  hasPendingApproval: boolean
  /** 当前 Plan 内容 */
  planContent: string | null
  /** 是否显示 Plan 侧边栏 */
  showPlanSidebar: boolean
  /** 设置 Plan 内容 */
  setPlanContent: (content: string | null) => void
  /** 批准 Plan */
  approvePlan: () => void
  /** 打开 Plan 侧边栏 */
  openPlanSidebar: () => void
  /** 关闭 Plan 侧边栏 */
  closePlanSidebar: () => void
  /** 标记有待批准的 Plan */
  markPendingApproval: (content: string) => void
  /** 清除待批准状态 */
  clearPendingApproval: () => void
}

export function usePlanMode({
  currentMode,
  onModeChange,
  onSendMessage,
}: UsePlanModeOptions): UsePlanModeReturn {
  const [planContent, setPlanContent] = useState<string | null>(null)
  const [showPlanSidebar, setShowPlanSidebar] = useState(false)
  const [approvalState, setApprovalState] = useState<PlanApprovalState>({
    hasPendingApproval: false,
  })
  
  const isPlanMode = currentMode === 'plan'
  
  // 批准 Plan
  const approvePlan = useCallback(() => {
    // 1. 切换到 Agent 模式
    onModeChange('agent')
    
    // 2. 发送执行消息
    onSendMessage('Implement plan')
    
    // 3. 清除待批准状态
    setApprovalState({ hasPendingApproval: false })
    
    // 4. 关闭侧边栏
    setShowPlanSidebar(false)
  }, [onModeChange, onSendMessage])
  
  // 标记有待批准的 Plan
  const markPendingApproval = useCallback((content: string) => {
    setPlanContent(content)
    setApprovalState({
      hasPendingApproval: true,
      planContent: content,
    })
  }, [])
  
  // 清除待批准状态
  const clearPendingApproval = useCallback(() => {
    setApprovalState({ hasPendingApproval: false })
  }, [])
  
  // 打开侧边栏
  const openPlanSidebar = useCallback(() => {
    setShowPlanSidebar(true)
  }, [])
  
  // 关闭侧边栏
  const closePlanSidebar = useCallback(() => {
    setShowPlanSidebar(false)
  }, [])
  
  // Cmd+Enter 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter (Mac) 或 Ctrl+Enter (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (isPlanMode && approvalState.hasPendingApproval) {
          e.preventDefault()
          approvePlan()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPlanMode, approvalState.hasPendingApproval, approvePlan])
  
  return {
    isPlanMode,
    hasPendingApproval: approvalState.hasPendingApproval,
    planContent,
    showPlanSidebar,
    setPlanContent,
    approvePlan,
    openPlanSidebar,
    closePlanSidebar,
    markPendingApproval,
    clearPendingApproval,
  }
}

export default usePlanMode
