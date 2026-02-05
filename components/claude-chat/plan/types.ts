/**
 * Plan Mode 相关类型定义
 */

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface PlanStep {
  id: string
  title: string
  description?: string
  status: PlanStepStatus
  files?: string[]
  estimatedComplexity?: 'low' | 'medium' | 'high'
}

export interface Plan {
  id: string
  title: string
  summary?: string
  steps: PlanStep[]
  content: string
  createdAt: Date
  updatedAt?: Date
}

export interface PlanApprovalState {
  hasPendingApproval: boolean
  planId?: string
  planContent?: string
}
