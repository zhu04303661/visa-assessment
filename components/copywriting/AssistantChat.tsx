"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Chat, Select, Switch, Space, Tag, Typography, Tooltip, RadioGroup, Radio } from "@douyinfe/semi-ui"
import { IconServer, IconBolt, IconSetting } from "@douyinfe/semi-icons"
import { MessageSquare, Bot, ClipboardList } from "lucide-react"
import { useAssistant, AVAILABLE_SKILLS } from "./AssistantContext"
import { AssistantProgress } from "./AssistantProgress"
import { SuggestionCard } from "./SuggestionCard"

const { Text } = Typography

// 执行模式定义
type ExecutionMode = 'ask' | 'agent' | 'plan'

interface ModeInfo {
  id: ExecutionMode
  name: string
  description: string
  icon: React.ReactNode
  available: boolean
}

const EXECUTION_MODES: ModeInfo[] = [
  {
    id: 'ask',
    name: 'Ask',
    description: '快速问答，直接获取回答',
    icon: <MessageSquare className="h-4 w-4" />,
    available: true
  },
  {
    id: 'agent',
    name: 'Agent',
    description: '智能代理，执行复杂任务',
    icon: <Bot className="h-4 w-4" />,
    available: true // 将在运行时检查
  },
  {
    id: 'plan',
    name: 'Plan',
    description: '规划模式，生成详细计划',
    icon: <ClipboardList className="h-4 w-4" />,
    available: true
  }
]

// 抑制 Semi UI 与 React 19 的 ref 兼容性警告的 hook
function useSuppressReact19Warning() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      const message = args[0]
      if (typeof message === 'string' && message.includes('Accessing element.ref was removed in React 19')) {
        return // 抑制这个特定警告
      }
      originalError.apply(console, args)
    }
    
    return () => {
      console.error = originalError
    }
  }, [])
}

// 消息类型
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  id: string
  content: string
  createAt?: number
  status?: 'loading' | 'incomplete' | 'complete' | 'error'
  // 自定义消息类型
  customType?: 'progress' | 'suggestion'
}

interface AssistantChatProps {
  projectId: string
  clientName: string
}

// 模型选项
const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" }
]

// Skill 选项
const SKILL_OPTIONS = AVAILABLE_SKILLS.map(skill => ({
  value: skill.name,
  label: `${skill.icon} ${skill.displayName}`
}))

export function AssistantChat({ projectId, clientName }: AssistantChatProps) {
  // 抑制 Semi UI 与 React 19 的兼容性警告
  useSuppressReact19Warning()
  
  const {
    skillMode,
    setSkillMode,
    selectedSkill,
    setSelectedSkill,
    selectedModel,
    setSelectedModel,
    activeDocument,
    documentContents,
    projectContext,
    isLoading,
    setIsLoading,
    pendingSuggestions
  } = useAssistant()

  const [chats, setChats] = useState<ChatMessage[]>([])
  const [showProgress, setShowProgress] = useState(true)
  const [hints, setHints] = useState<string[]>([
    "帮我优化这个个人陈述的开头",
    "分析我的工作经历是否符合GTV要求",
    "为这份推荐信提供改进建议"
  ])
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // 执行模式状态
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('ask')
  const [agentAvailable, setAgentAvailable] = useState(true)
  const [modeLoading, setModeLoading] = useState(false)
  
  // CLI 执行日志
  const [cliLogs, setCliLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(true)
  
  // 获取执行模式状态
  useEffect(() => {
    const fetchModeStatus = async () => {
      try {
        const response = await fetch(`/api/copywriting/api/projects/${projectId}/assistant/status`)
        const data = await response.json()
        if (data.success && data.data) {
          setExecutionMode(data.data.current_mode || 'ask')
          setAgentAvailable(data.data.cli_available || false)
        }
      } catch (error) {
        console.error('获取执行模式状态失败:', error)
      }
    }
    fetchModeStatus()
  }, [projectId])
  
  // 切换执行模式
  const handleModeChange = useCallback(async (mode: ExecutionMode) => {
    if (mode === 'agent' && !agentAvailable) {
      return
    }
    
    setModeLoading(true)
    try {
      const response = await fetch(`/api/copywriting/api/projects/${projectId}/assistant/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      const data = await response.json()
      if (data.success) {
        setExecutionMode(mode)
      }
    } catch (error) {
      console.error('切换执行模式失败:', error)
    } finally {
      setModeLoading(false)
    }
  }, [projectId, agentAvailable])

  // 角色配置
  const roleConfig = useMemo(() => ({
    user: {
      name: clientName || '用户',
      avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/docs-icon.png'
    },
    assistant: {
      name: 'AI 文案助手',
      avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/other/logo.png'
    },
    system: {
      name: '系统',
      avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/other/logo.png'
    }
  }), [clientName])

  // 初始化欢迎消息（包含进度卡片）
  useEffect(() => {
    if (chats.length === 0) {
      setChats([
        // 进度卡片作为第一条消息
        {
          role: 'system',
          id: 'progress-card',
          createAt: Date.now(),
          content: '__PROGRESS_CARD__', // 特殊标记，用于自定义渲染
          status: 'complete',
          customType: 'progress'
        },
        // 欢迎消息
        {
          role: 'assistant',
          id: 'welcome',
          createAt: Date.now() + 1,
          content: `您好！我是 ${clientName || '您'} 的 AI 文案助手。

我可以帮助您：
- 撰写和优化个人陈述、推荐信等文档
- 基于项目材料回答问题
- 提供文档修改建议
- 分析和评估申请材料

请在右侧选择要编辑的文档，然后告诉我您需要什么帮助。`,
          status: 'complete'
        }
      ])
    }
  }, [chats.length, clientName])

  // 自动检测 skill
  const detectSkill = useCallback((input: string): string | null => {
    const lowercaseInput = input.toLowerCase()
    
    if (lowercaseInput.includes("简历") || lowercaseInput.includes("cv") || lowercaseInput.includes("resume")) {
      return "resume-analysis"
    }
    if (lowercaseInput.includes("评估") || lowercaseInput.includes("资格") || lowercaseInput.includes("eligibility")) {
      return "gtv-eligibility-assessment"
    }
    if (lowercaseInput.includes("评分") || lowercaseInput.includes("分数") || lowercaseInput.includes("score")) {
      return "scoring-calculation"
    }
    if (lowercaseInput.includes("证据") || lowercaseInput.includes("验证") || lowercaseInput.includes("evidence")) {
      return "evidence-validation"
    }
    if (lowercaseInput.includes("建议") || lowercaseInput.includes("改进") || lowercaseInput.includes("recommend")) {
      return "recommendations-generation"
    }
    if (lowercaseInput.includes("文档") || lowercaseInput.includes("处理") || lowercaseInput.includes("document")) {
      return "document-processing"
    }
    
    return null
  }, [])

  // 发送消息
  const onMessageSend = useCallback(async (content: string, attachment?: any[]) => {
    console.warn("[DEBUG] onMessageSend 被调用:", { content, attachment })
    if (!content.trim()) return

    setIsLoading(true)
    setHints([])

    // 确定使用的 skill
    const skillToUse = skillMode === "manual" ? selectedSkill : detectSkill(content)

    // 添加 AI 消息占位符
    const assistantMessageId = `msg-${Date.now()}-assistant`
    setChats(prev => [...prev, {
      role: 'assistant',
      id: assistantMessageId,
      createAt: Date.now(),
      content: '',
      status: 'loading'
    }])

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch(`/api/copywriting/api/projects/${projectId}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          skill: skillToUse,
          model: selectedModel,
          document_context: activeDocument ? documentContents[activeDocument] : null,
          active_document: activeDocument,
          project_context: projectContext,
          conversation_history: chats.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      console.warn("[DEBUG] 开始读取流式响应, reader:", !!reader)
      
      if (reader) {
        let buffer = "" // 用于处理跨 chunk 的数据
        
        while (true) {
          const { done, value } = await reader.read()
          console.warn("[DEBUG] 读取 chunk:", { done, valueLength: value?.length })
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          console.warn("[DEBUG] 解码后的 chunk:", chunk.substring(0, 200))
          buffer += chunk
          
          // 按行分割，但保留未完成的行
          const lines = buffer.split("\n")
          buffer = lines.pop() || "" // 最后一个可能是不完整的行
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine) {
              console.warn("[DEBUG] 处理行:", trimmedLine.substring(0, 100))
            }
            if (trimmedLine.startsWith("data: ")) {
              try {
                const jsonStr = trimmedLine.slice(6)
                console.warn("[DEBUG] JSON 字符串:", jsonStr.substring(0, 100))
                if (jsonStr) {
                  const data = JSON.parse(jsonStr)
                  console.warn("[DEBUG] 解析后的数据:", data)
                  
                  // 根据消息类型处理
                  switch (data.type) {
                    case 'start':
                      // 开始执行，清空之前的日志
                      setCliLogs([`[开始] 模式: ${data.mode}, 技能: ${data.skill || '自动'}`])
                      break
                      
                    case 'log':
                      // 日志消息
                      if (data.content) {
                        setCliLogs(prev => [...prev, data.content])
                      }
                      break
                      
                    case 'content':
                      // 内容消息
                      if (data.content) {
                        fullContent += data.content
                        console.warn("[DEBUG] 更新 fullContent, 长度:", fullContent.length)
                        setChats(prev => prev.map(msg => 
                          msg.id === assistantMessageId 
                            ? { ...msg, content: fullContent, status: 'incomplete' as const }
                            : msg
                        ))
                      }
                      break
                      
                    case 'done':
                      // 完成
                      console.warn("[DEBUG] 收到 done 信号")
                      setCliLogs(prev => [...prev, `[完成] 模式: ${data.mode}`])
                      setChats(prev => prev.map(msg => 
                        msg.id === assistantMessageId 
                          ? { ...msg, status: 'complete' as const }
                          : msg
                      ))
                      break
                      
                    default:
                      // 兼容旧格式
                      if (data.content) {
                        fullContent += data.content
                        setChats(prev => prev.map(msg => 
                          msg.id === assistantMessageId 
                            ? { ...msg, content: fullContent, status: 'incomplete' as const }
                            : msg
                        ))
                      }
                      if (data.done) {
                        setChats(prev => prev.map(msg => 
                          msg.id === assistantMessageId 
                            ? { ...msg, status: 'complete' as const }
                            : msg
                        ))
                      }
                  }
                }
              } catch (e) {
                console.warn("[DEBUG] SSE 解析错误:", e, "行内容:", line)
              }
            }
          }
        }
        
        // 处理 buffer 中剩余的数据
        if (buffer.trim().startsWith("data: ")) {
          try {
            const jsonStr = buffer.trim().slice(6)
            if (jsonStr) {
              const data = JSON.parse(jsonStr)
              if (data.content) {
                fullContent += data.content
              }
            }
          } catch {
            // 忽略
          }
        }
      }

      // 如果流式响应结束但没有内容
      console.log("流式响应结束, fullContent 长度:", fullContent.length)
      if (!fullContent) {
        console.warn("没有收到有效内容!")
        setChats(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: "抱歉，没有收到有效的响应内容。",
                status: 'complete' as const 
              }
            : msg
        ))
      } else {
        // 确保最终状态为 complete
        setChats(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, status: 'complete' as const }
            : msg
        ))
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setChats(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: msg.content || "已停止生成", status: 'complete' as const }
            : msg
        ))
      } else {
        console.error("发送消息失败:", error)
        setChats(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: "抱歉，处理您的请求时出现了问题。请稍后重试。", status: 'error' as const }
            : msg
        ))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [projectId, skillMode, selectedSkill, selectedModel, activeDocument, documentContents, projectContext, chats, setIsLoading, detectSkill])

  // 停止生成
  const onStopGenerator = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // 清除上下文
  const onClear = useCallback(() => {
    setChats([{
      role: 'assistant',
      id: `clear-${Date.now()}`,
      createAt: Date.now(),
      content: '上下文已清除。您可以开始新的对话。',
      status: 'complete'
    }])
    setHints([
      "帮我优化这个个人陈述的开头",
      "分析我的工作经历是否符合GTV要求",
      "为这份推荐信提供改进建议"
    ])
  }, [])

  // 对话变更
  const onChatsChange = useCallback((newChats?: ChatMessage[]) => {
    if (newChats) {
      setChats(newChats)
    }
  }, [])

  // 点击提示
  const onHintClick = useCallback((hint: string) => {
    onMessageSend(hint)
  }, [onMessageSend])

  // 自定义输入区域 - 精致设计
  const renderInputArea = useCallback((props: any) => {
    const { detailProps, onSend } = props
    const { clearContextNode, uploadNode, inputNode, sendNode, onClick } = detailProps || {}

    return (
      <div style={{ 
        padding: '12px 16px',
        background: 'linear-gradient(to bottom, rgba(248,250,252,0.8), white)',
        borderTop: '1px solid rgba(226,232,240,0.6)'
      }}>
        {/* 执行模式选择 - 顶部卡片 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          marginBottom: 10,
          padding: '8px 12px',
          background: 'rgba(248,250,252,0.95)',
          borderRadius: 12,
          border: '1px solid rgba(226,232,240,0.8)'
        }}>
          <span style={{ fontSize: 12, color: 'rgb(100,116,139)', marginRight: 4 }}>模式：</span>
          {EXECUTION_MODES.map((mode) => {
            const isActive = executionMode === mode.id
            const isDisabled = mode.id === 'agent' && !agentAvailable
            
            return (
              <Tooltip key={mode.id} content={isDisabled ? 'Agent 模式需要安装 Claude CLI' : mode.description}>
                <button
                  onClick={() => !isDisabled && handleModeChange(mode.id)}
                  disabled={isDisabled || modeLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    background: isActive 
                      ? 'linear-gradient(135deg, rgb(99,102,241), rgb(139,92,246))' 
                      : 'white',
                    color: isActive ? 'white' : isDisabled ? 'rgb(203,213,225)' : 'rgb(71,85,105)',
                    boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                >
                  {mode.icon}
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500 }}>{mode.name}</span>
                </button>
              </Tooltip>
            )
          })}
          
          <div style={{ flex: 1 }} />
          
          {/* 模式说明标签 */}
          <Tag 
            size="small"
            style={{
              background: executionMode === 'agent' 
                ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15))'
                : executionMode === 'plan'
                ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.15))'
                : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
              border: 'none',
              color: executionMode === 'agent' 
                ? 'rgb(22,163,74)'
                : executionMode === 'plan'
                ? 'rgb(217,119,6)'
                : 'rgb(79,70,229)',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 11
            }}
          >
            {executionMode === 'ask' && '快速问答'}
            {executionMode === 'agent' && '智能代理'}
            {executionMode === 'plan' && '规划模式'}
          </Tag>
        </div>
        
        {/* 配置区域 - Skill 和 Model */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '8px 12px',
          background: 'rgba(248,250,252,0.7)',
          borderRadius: 10,
          border: '1px solid rgba(226,232,240,0.6)'
        }}>
          {/* 左侧：Skill 选择 */}
          <Space align="center">
            <Space align="center" spacing={4}>
              <div style={{
                padding: '3px 6px',
                borderRadius: 6,
                background: skillMode === 'auto' ? 'rgba(99,102,241,0.1)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <IconBolt style={{ 
                  color: skillMode === 'auto' ? 'rgb(99,102,241)' : 'var(--semi-color-text-2)',
                  fontSize: 12
                }} />
                <span style={{ fontSize: 11, color: skillMode === 'auto' ? 'rgb(99,102,241)' : 'var(--semi-color-text-2)' }}>自动</span>
              </div>
              <Switch
                checked={skillMode === 'manual'}
                onChange={(checked) => {
                  setSkillMode(checked ? 'manual' : 'auto')
                  if (!checked) {
                    setSelectedSkill(null)
                  }
                }}
                size="small"
              />
              <div style={{
                padding: '3px 6px',
                borderRadius: 6,
                background: skillMode === 'manual' ? 'rgba(99,102,241,0.1)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <IconSetting style={{ 
                  color: skillMode === 'manual' ? 'rgb(99,102,241)' : 'var(--semi-color-text-2)',
                  fontSize: 12
                }} />
                <span style={{ fontSize: 11, color: skillMode === 'manual' ? 'rgb(99,102,241)' : 'var(--semi-color-text-2)' }}>手动</span>
              </div>
            </Space>
            
            <Select
              placeholder="选择技能"
              style={{ width: 140 }}
              value={selectedSkill || undefined}
              onChange={(value) => setSelectedSkill(value as string)}
              disabled={skillMode === 'auto'}
              showClear
              optionList={SKILL_OPTIONS}
              size="small"
            />
          </Space>
          
          {/* 右侧：Model 选择 */}
          <Select
            prefix={<IconServer style={{ color: 'rgb(100,116,139)', fontSize: 12 }} />}
            style={{ width: 160 }}
            value={selectedModel || MODEL_OPTIONS[0].value}
            onChange={(value) => setSelectedModel(value as string)}
            optionList={MODEL_OPTIONS}
            size="small"
          />
        </div>
        
        {/* 当前文档提示 - 精致设计 */}
        {activeDocument && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            marginBottom: 12,
            padding: '8px 12px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
            borderRadius: 10,
            fontSize: 12,
            color: 'rgb(79,70,229)',
            border: '1px solid rgba(99,102,241,0.15)'
          }}>
            <span style={{ fontSize: 14 }}>📄</span>
            <span style={{ fontWeight: 500 }}>当前文档：</span>
            <span style={{ 
              background: 'white',
              padding: '2px 8px',
              borderRadius: 6,
              color: 'rgb(51,65,85)'
            }}>{activeDocument}</span>
          </div>
        )}
        
        {/* 输入区域 - 精致设计 */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'flex-end',
            gap: 10,
            border: '1px solid rgba(226,232,240,0.8)',
            borderRadius: 14,
            padding: '10px 12px',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}
          onClick={onClick}
        >
          {uploadNode}
          <div style={{ flex: 1 }}>{inputNode}</div>
          {clearContextNode}
          {sendNode}
        </div>
      </div>
    )
  }, [skillMode, setSkillMode, selectedSkill, setSelectedSkill, selectedModel, setSelectedModel, activeDocument, executionMode, agentAvailable, modeLoading, handleModeChange])

  // 自定义渲染内容（用于进度卡片）
  const chatBoxRenderConfig = useMemo(() => ({
    renderChatBoxContent: (props: any) => {
      const { message, defaultContent } = props
      
      // 如果是进度卡片消息（通过 ID 识别），渲染自定义内容
      if (message?.id === 'progress-card') {
        return (
          <div style={{ marginTop: 8 }}>
            <AssistantProgress projectId={projectId} />
          </div>
        )
      }
      
      // 其他消息使用默认渲染
      return defaultContent
    },
    // 对于进度卡片，隐藏头像和标题
    renderChatBoxAvatar: (props: any) => {
      const { message, defaultAvatar } = props
      if (message?.id === 'progress-card') {
        return null
      }
      return defaultAvatar
    },
    renderChatBoxTitle: (props: any) => {
      const { message, defaultTitle } = props
      if (message?.id === 'progress-card') {
        return null
      }
      return defaultTitle
    },
    renderChatBoxAction: (props: any) => {
      const { message, defaultActions } = props
      if (message?.id === 'progress-card') {
        return null
      }
      return defaultActions
    }
  }), [projectId])

  // 待处理建议作为顶部提示 - 精致设计
  const topSlot = useMemo(() => (
    pendingSuggestions.length > 0 ? (
      <div style={{ 
        padding: '14px 16px', 
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.08))',
        borderBottom: '1px solid rgba(139,92,246,0.15)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10, 
          marginBottom: 10
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgb(139,92,246), rgb(99,102,241))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(139,92,246,0.3)'
          }}>
            <span style={{ fontSize: 14 }}>✨</span>
          </div>
          <span style={{ 
            fontWeight: 600,
            color: 'rgb(109,40,217)',
            fontSize: 14
          }}>
            待处理建议
          </span>
          <span style={{
            background: 'rgba(139,92,246,0.15)',
            color: 'rgb(109,40,217)',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500
          }}>
            {pendingSuggestions.filter(s => !s.applied).length}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 130, overflowY: 'auto', paddingRight: 4 }}>
          {pendingSuggestions.filter(s => !s.applied).slice(0, 3).map(suggestion => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} compact />
          ))}
        </div>
      </div>
    ) : null
  ), [pendingSuggestions])

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(180deg, rgba(248,250,252,0.9), rgba(241,245,249,0.9))'
    }}>
      {/* 聊天区域头部 */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(226,232,240,0.6)',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, rgb(99,102,241), rgb(139,92,246))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
        }}>
          <span style={{ color: 'white', fontSize: 18 }}>🤖</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'rgb(30,41,59)', fontSize: 15 }}>AI 文案助手</div>
          <div style={{ fontSize: 12, color: 'rgb(100,116,139)' }}>智能写作 · 实时协作</div>
        </div>
        
        {/* 日志开关按钮 */}
        <button
          onClick={() => setShowLogs(!showLogs)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            fontSize: 11,
            color: showLogs ? 'rgb(99,102,241)' : 'rgb(100,116,139)',
            background: showLogs ? 'rgba(99,102,241,0.1)' : 'transparent',
            border: '1px solid',
            borderColor: showLogs ? 'rgba(99,102,241,0.3)' : 'rgba(203,213,225,0.5)',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <span>📋</span>
          <span>日志</span>
          {cliLogs.length > 0 && (
            <span style={{
              background: 'rgb(99,102,241)',
              color: 'white',
              borderRadius: 10,
              padding: '1px 5px',
              fontSize: 10,
              fontWeight: 600
            }}>{cliLogs.length}</span>
          )}
        </button>
      </div>
      
      {/* CLI 执行日志面板 */}
      {showLogs && cliLogs.length > 0 && (
        <div style={{
          maxHeight: 120,
          overflow: 'auto',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(51,65,85,0.97))',
          borderBottom: '1px solid rgba(99,102,241,0.3)',
          padding: '8px 12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 11
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 6 
          }}>
            <span style={{ color: 'rgb(148,163,184)', fontWeight: 600 }}>执行日志</span>
            <button
              onClick={() => setCliLogs([])}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgb(148,163,184)',
                cursor: 'pointer',
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              清除
            </button>
          </div>
          {cliLogs.map((log, index) => (
            <div 
              key={index} 
              style={{ 
                color: log.startsWith('[错误]') 
                  ? 'rgb(248,113,113)' 
                  : log.startsWith('[系统]') 
                  ? 'rgb(147,197,253)'
                  : log.startsWith('[完成]')
                  ? 'rgb(134,239,172)'
                  : 'rgb(226,232,240)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}
            >
              {log}
            </div>
          ))}
        </div>
      )}
      
      <Chat
        style={{ 
          flex: 1,
          border: 'none',
          borderRadius: 0,
          background: 'transparent'
        }}
        chats={chats as any}
        roleConfig={roleConfig}
        onChatsChange={onChatsChange as any}
        onMessageSend={onMessageSend}
        onStopGenerator={onStopGenerator}
        onClear={onClear}
        showStopGenerate={isLoading}
        showClearContext
        hints={hints}
        onHintClick={onHintClick}
        renderInputArea={renderInputArea}
        topSlot={topSlot}
        chatBoxRenderConfig={chatBoxRenderConfig}
        placeholder="输入您的问题或指令..."
        sendHotKey="enter"
      />
    </div>
  )
}
