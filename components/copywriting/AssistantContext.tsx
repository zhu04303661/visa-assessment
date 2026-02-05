"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

// Skill 定义
export interface SkillInfo {
  name: string
  displayName: string
  description: string
  icon: string
}

// 可用的 Skills
export const AVAILABLE_SKILLS: SkillInfo[] = [
  {
    name: "resume-analysis",
    displayName: "简历分析",
    description: "分析简历内容，提取教育背景、工作经验、技能和成就",
    icon: "📄"
  },
  {
    name: "gtv-eligibility-assessment",
    displayName: "GTV资格评估",
    description: "评估候选人是否符合GTV签证要求，推荐申请路径",
    icon: "🎯"
  },
  {
    name: "scoring-calculation",
    displayName: "评分计算",
    description: "基于三层评估框架计算GTV签证评分",
    icon: "📊"
  },
  {
    name: "evidence-validation",
    displayName: "证据验证",
    description: "验证证据文档的真实性、完整性和相关性",
    icon: "✅"
  },
  {
    name: "recommendations-generation",
    displayName: "建议生成",
    description: "生成个性化的改进建议和申请策略",
    icon: "💡"
  },
  {
    name: "document-processing",
    displayName: "文档处理",
    description: "处理和分析各种格式的文档，提取结构化数据",
    icon: "📁"
  }
]

// 消息类型
export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  skill?: string
  suggestions?: Suggestion[]
  isStreaming?: boolean
}

// 建议类型
export interface Suggestion {
  id: string
  type: "edit" | "add" | "delete"
  targetDocument: string
  originalText?: string
  suggestedText: string
  reason: string
  applied?: boolean
}

// 上下文状态
interface AssistantContextType {
  // 项目信息
  projectId: string | null
  setProjectId: (id: string) => void
  projectContext: Record<string, any>
  setProjectContext: (context: Record<string, any>) => void
  
  // 当前文档
  activeDocument: string | null
  setActiveDocument: (doc: string | null) => void
  documentContents: Record<string, string>
  updateDocumentContent: (docType: string, content: string) => void
  
  // Skill 选择
  skillMode: "auto" | "manual"
  setSkillMode: (mode: "auto" | "manual") => void
  selectedSkill: string | null
  setSelectedSkill: (skill: string | null) => void
  
  // Model 选择
  selectedModel: string
  setSelectedModel: (model: string) => void
  
  // 消息历史
  messages: Message[]
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearMessages: () => void
  
  // 建议管理
  pendingSuggestions: Suggestion[]
  addSuggestion: (suggestion: Omit<Suggestion, "id">) => void
  applySuggestion: (id: string) => void
  dismissSuggestion: (id: string) => void
  
  // 加载状态
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const AssistantContext = createContext<AssistantContextType | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  // 项目信息
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectContext, setProjectContext] = useState<Record<string, any>>({})
  
  // 当前文档
  const [activeDocument, setActiveDocument] = useState<string | null>(null)
  const [documentContents, setDocumentContents] = useState<Record<string, string>>({})
  
  // Skill 选择
  const [skillMode, setSkillMode] = useState<"auto" | "manual">("auto")
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  
  // Model 选择
  const [selectedModel, setSelectedModel] = useState<string>("claude-sonnet-4-20250514")
  
  // 消息历史
  const [messages, setMessages] = useState<Message[]>([])
  
  // 建议管理
  const [pendingSuggestions, setPendingSuggestions] = useState<Suggestion[]>([])
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false)
  
  // 更新文档内容
  const updateDocumentContent = useCallback((docType: string, content: string) => {
    setDocumentContents(prev => ({ ...prev, [docType]: content }))
  }, [])
  
  // 添加消息
  const addMessage = useCallback((message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage.id
  }, [])
  
  // 更新消息
  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }, [])
  
  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])
  
  // 添加建议
  const addSuggestion = useCallback((suggestion: Omit<Suggestion, "id">) => {
    const newSuggestion: Suggestion = {
      ...suggestion,
      id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    setPendingSuggestions(prev => [...prev, newSuggestion])
  }, [])
  
  // 应用建议
  const applySuggestion = useCallback((id: string) => {
    setPendingSuggestions(prev => prev.map(sug => 
      sug.id === id ? { ...sug, applied: true } : sug
    ))
  }, [])
  
  // 忽略建议
  const dismissSuggestion = useCallback((id: string) => {
    setPendingSuggestions(prev => prev.filter(sug => sug.id !== id))
  }, [])

  return (
    <AssistantContext.Provider value={{
      projectId,
      setProjectId,
      projectContext,
      setProjectContext,
      activeDocument,
      setActiveDocument,
      documentContents,
      updateDocumentContent,
      skillMode,
      setSkillMode,
      selectedSkill,
      setSelectedSkill,
      selectedModel,
      setSelectedModel,
      messages,
      addMessage,
      updateMessage,
      clearMessages,
      pendingSuggestions,
      addSuggestion,
      applySuggestion,
      dismissSuggestion,
      isLoading,
      setIsLoading
    }}>
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error("useAssistant must be used within AssistantProvider")
  }
  return context
}
