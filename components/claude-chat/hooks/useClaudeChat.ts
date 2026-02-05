/**
 * useClaudeChat Hook
 * 
 * 核心聊天逻辑，处理与 Python 后端的通信和流式消息
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ChatMessage,
  ExecutionMode,
  SendMessageOptions,
  UseClaudeChatReturn,
  MessagePart,
  ToolCallPart,
  TextPart,
  ServiceStatus,
  SkillInfo,
} from '../types'
import type { SlashCommandOption } from '../commands/types'
import { BUILTIN_COMMANDS, isImmediateCommand, getCommandPrompt } from '../commands/builtin-commands'

// 生成唯一 ID
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 解析 SSE 事件
function parseSSEEvent(data: string): { event?: string; data: string } | null {
  const lines = data.split('\n')
  let event: string | undefined
  let eventData = ''
  
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      eventData = line.slice(5).trim()
    }
  }
  
  if (eventData) {
    return { event, data: eventData }
  }
  return null
}

// 解析工具调用（从 Claude CLI 输出）
function parseToolCalls(content: string): { text: string; toolCalls: ToolCallPart[] } {
  const toolCalls: ToolCallPart[] = []
  let text = content
  
  // 匹配工具调用模式: [Tool: ToolName] ... [/Tool]
  const toolPattern = /\[Tool:\s*(\w+)\]([\s\S]*?)\[\/Tool\]/g
  let match
  
  while ((match = toolPattern.exec(content)) !== null) {
    const [fullMatch, toolName, toolContent] = match
    const toolCallId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    
    // 尝试解析参数
    let args: Record<string, unknown> = {}
    let result: string | undefined
    
    // 解析参数部分
    const argsMatch = toolContent.match(/Args:\s*({[\s\S]*?})/m)
    if (argsMatch) {
      try {
        args = JSON.parse(argsMatch[1])
      } catch {
        args = { raw: argsMatch[1] }
      }
    }
    
    // 解析结果部分
    const resultMatch = toolContent.match(/Result:\s*([\s\S]*?)$/m)
    if (resultMatch) {
      result = resultMatch[1].trim()
    }
    
    toolCalls.push({
      type: 'tool-call',
      toolCallId,
      toolName,
      args,
      result,
      state: result ? 'complete' : 'running',
    })
    
    // 从文本中移除工具调用标记
    text = text.replace(fullMatch, '')
  }
  
  return { text: text.trim(), toolCalls }
}

interface UseClaudeChatOptions {
  projectId?: string
  apiEndpoint?: string
  onError?: (error: string) => void
  onToolCall?: (toolCall: ToolCallPart) => void
}

export function useClaudeChat(options: UseClaudeChatOptions = {}): UseClaudeChatReturn {
  const {
    projectId,
    apiEndpoint = '/api/copywriting',
    onError,
    onToolCall,
  } = options
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentMode, setCurrentMode] = useState<ExecutionMode>('ask')
  const [error, setError] = useState<string | undefined>()
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastMessageRef = useRef<string>('')
  
  // 获取服务状态
  const fetchStatus = useCallback(async () => {
    try {
      // 尝试带 projectId 的端点，回退到通用端点
      // 注意: apiEndpoint 已经包含 /api/copywriting，所以不需要再加 /api
      const statusUrl = projectId 
        ? `${apiEndpoint}/projects/${projectId}/assistant/status`
        : `${apiEndpoint}/assistant/status`
      
      const response = await fetch(statusUrl)
      if (response.ok) {
        const result = await response.json()
        const data: ServiceStatus = result.data || result
        // 如果当前模式不可用，切换到可用模式
        const currentModeInfo = data.available_modes?.find(m => m.id === currentMode)
        if (currentModeInfo && !currentModeInfo.available) {
          const availableMode = data.available_modes?.find(m => m.available)
          if (availableMode) {
            setCurrentMode(availableMode.id)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }, [apiEndpoint, projectId, currentMode])
  
  // 初始化时获取状态
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])
  
  // 发送消息
  const sendMessage = useCallback(async (
    content: string,
    options: SendMessageOptions = {}
  ) => {
    const mode = options.mode || currentMode
    const messageId = generateId()
    const assistantMessageId = generateId()
    
    // 保存最后一条消息用于重试
    lastMessageRef.current = content
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      content,
      status: 'complete',
      createdAt: new Date(),
    }
    
    // 添加助手消息占位符
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      parts: [],
      status: 'pending',
      createdAt: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsStreaming(true)
    setError(undefined)
    
    // 创建 AbortController
    abortControllerRef.current = new AbortController()
    
    try {
      // 构建请求体 - 适配 Python 后端 API
      const requestBody = {
        message: content,  // Python 后端使用 message 字段
        mode,
        skill: options.skill,
        project_context: options.context,
        stream: true,
      }
      
      // 使用带 projectId 的端点
      // 使用带 projectId 的端点
      const chatUrl = projectId
        ? `${apiEndpoint}/projects/${projectId}/assistant/chat`
        : `${apiEndpoint}/assistant/chat`
      
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('text/event-stream')) {
        // SSE 流式响应
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ''
        let accumulatedParts: MessagePart[] = []
        
        if (reader) {
          // 更新状态为 streaming
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, status: 'streaming' }
              : msg
          ))
          
          let buffer = ''
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            buffer += decoder.decode(value, { stream: true })
            const events = buffer.split('\n\n')
            buffer = events.pop() || ''
            
            for (const eventStr of events) {
              if (!eventStr.trim()) continue
              
              const parsed = parseSSEEvent(eventStr)
              if (!parsed) continue
              
              const { data } = parsed
              
              // 处理 SSE 数据
              if (data && data !== '[DONE]') {
                try {
                  const chunk = JSON.parse(data)
                  
                  // Python 后端格式: { type: 'start'|'content'|'log'|'done', content?: string }
                  if (chunk.type === 'error') {
                    throw new Error(chunk.content || chunk.message || 'Stream error')
                  }
                  
                  if (chunk.type === 'done') {
                    // 流结束
                    continue
                  }
                  
                  if (chunk.type === 'start') {
                    // 开始信号，可能包含 mode 和 skill 信息
                    continue
                  }
                  
                  if (chunk.type === 'log') {
                    // 日志信息，追加到内容中
                    // Agent 模式下显示所有日志（包括系统日志）
                    if (chunk.content) {
                      accumulatedContent += chunk.content + '\n'
                      
                      // 更新消息显示
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      ))
                    }
                    continue
                  }
                  
                  if (chunk.type === 'content' && chunk.content) {
                    accumulatedContent += chunk.content
                    
                    // 解析工具调用
                    const { text, toolCalls } = parseToolCalls(accumulatedContent)
                    
                    // 更新 parts
                    accumulatedParts = []
                    if (text) {
                      accumulatedParts.push({ type: 'text', text })
                    }
                    accumulatedParts.push(...toolCalls)
                    
                    // 通知工具调用
                    for (const tc of toolCalls) {
                      onToolCall?.(tc)
                    }
                    
                    // 更新消息
                    setMessages(prev => prev.map(msg =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: text || accumulatedContent,
                            parts: accumulatedParts.length > 0 ? accumulatedParts : undefined,
                          }
                        : msg
                    ))
                  }
                } catch (parseErr) {
                  // 非 JSON 数据，直接追加
                  if (data && !data.startsWith('{')) {
                    accumulatedContent += data
                    setMessages(prev => prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ))
                  }
                }
              }
            }
          }
        }
        
        // 完成
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, status: 'complete' }
            : msg
        ))
        
      } else {
        // 非流式响应
        const data = await response.json()
        
        if (data.success && data.data?.content) {
          const { text, toolCalls } = parseToolCalls(data.data.content)
          
          const parts: MessagePart[] = []
          if (text) {
            parts.push({ type: 'text', text })
          }
          parts.push(...toolCalls)
          
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: text || data.data.content,
                  parts: parts.length > 0 ? parts : undefined,
                  status: 'complete',
                }
              : msg
          ))
        } else {
          throw new Error(data.error || 'Unknown error')
        }
      }
      
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // 用户取消
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, status: 'complete', content: msg.content || '(已取消)' }
            : msg
        ))
      } else {
        const errorMessage = (err as Error).message || 'Unknown error'
        setError(errorMessage)
        onError?.(errorMessage)
        
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, status: 'error', content: `错误: ${errorMessage}` }
            : msg
        ))
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [currentMode, projectId, apiEndpoint, onError, onToolCall])
  
  // 停止生成
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])
  
  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([])
    setError(undefined)
  }, [])
  
  // 设置模式
  const setMode = useCallback((mode: ExecutionMode) => {
    setCurrentMode(mode)
  }, [])
  
  // 重试最后一条消息
  const retry = useCallback(() => {
    if (lastMessageRef.current) {
      // 移除最后两条消息（用户 + 助手）
      setMessages(prev => prev.slice(0, -2))
      sendMessage(lastMessageRef.current)
    }
  }, [sendMessage])
  
  return {
    messages,
    isStreaming,
    currentMode,
    error,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMode,
    retry,
  }
}

// 获取技能列表 Hook
export function useSkills(apiEndpoint = '/api/copywriting') {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchSkills() {
      try {
        const response = await fetch(`${apiEndpoint}/assistant/skills`)
        if (response.ok) {
          const result = await response.json()
          // 支持 { success: true, data: [...] } 或直接数组格式
          const data = result.success ? result.data : (Array.isArray(result) ? result : [])
          setSkills(data || [])
        }
      } catch (err) {
        console.error('Failed to fetch skills:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSkills()
  }, [apiEndpoint])
  
  return { skills, loading }
}

// 获取服务状态 Hook
export function useServiceStatus(apiEndpoint = '/api/copywriting', projectId?: string) {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchStatus() {
      try {
        // 尝试带 projectId 的端点
        // 尝试带 projectId 的端点
        const statusUrl = projectId 
          ? `${apiEndpoint}/projects/${projectId}/assistant/status`
          : `${apiEndpoint}/assistant/status`
        
        const response = await fetch(statusUrl)
        if (response.ok) {
          const result = await response.json()
          // 支持 { success: true, data: {...} } 格式
          const data = result.success ? result.data : result
          setStatus(data)
        }
      } catch (err) {
        console.error('Failed to fetch status:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStatus()
  }, [apiEndpoint, projectId])
  
  return { status, loading }
}

// 获取斜杠命令列表 Hook
export function useSlashCommands(apiEndpoint = '/api/copywriting', projectPath?: string) {
  const [commands, setCommands] = useState<SlashCommandOption[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchCommands() {
      try {
        const url = projectPath
          ? `${apiEndpoint}/assistant/commands?project_path=${encodeURIComponent(projectPath)}`
          : `${apiEndpoint}/assistant/commands`
        
        const response = await fetch(url)
        if (response.ok) {
          const result = await response.json()
          const data = result.success ? result.data : []
          
          // 转换为 SlashCommandOption 格式
          const commandOptions: SlashCommandOption[] = data.map((cmd: any) => ({
            ...cmd,
            command: `/${cmd.name}`,
            argumentHint: cmd.argument_hint,
          }))
          
          setCommands(commandOptions)
        }
      } catch (err) {
        console.error('Failed to fetch commands:', err)
        // 失败时使用内置命令
        setCommands(BUILTIN_COMMANDS)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCommands()
  }, [apiEndpoint, projectPath])
  
  return { commands, loading }
}

/**
 * 解析斜杠命令
 * 
 * @param message 用户输入的消息
 * @returns 解析结果，包含命令名、参数和处理后的消息
 */
export function parseSlashCommand(message: string): {
  isCommand: boolean
  commandName?: string
  args?: string
  processedMessage?: string
} {
  // 匹配 /command args 格式
  const match = message.match(/^\/(\S+)\s*(.*)$/s)
  
  if (!match) {
    return { isCommand: false }
  }
  
  const [, commandName, args] = match
  
  return {
    isCommand: true,
    commandName,
    args: args.trim(),
  }
}

/**
 * 处理斜杠命令
 * 
 * @param message 用户输入的消息
 * @param handlers 命令处理器
 * @returns 处理后的消息，如果命令被处理则返回 null
 */
export async function processSlashCommand(
  message: string,
  handlers: {
    onClear?: () => void
    onModeChange?: (mode: ExecutionMode) => void
    onCompact?: () => void
    getCommandContent?: (name: string) => Promise<string | null>
  }
): Promise<string | null> {
  const parsed = parseSlashCommand(message)
  
  if (!parsed.isCommand || !parsed.commandName) {
    return message
  }
  
  const { commandName, args } = parsed
  
  // 处理立即执行的命令
  if (isImmediateCommand(commandName)) {
    switch (commandName.toLowerCase()) {
      case 'clear':
        handlers.onClear?.()
        return null
      case 'plan':
        handlers.onModeChange?.('plan')
        return null
      case 'agent':
        handlers.onModeChange?.('agent')
        return null
      case 'ask':
        handlers.onModeChange?.('ask')
        return null
      case 'compact':
        handlers.onCompact?.()
        return null
    }
  }
  
  // 处理 prompt 类型的命令
  const builtinPrompt = getCommandPrompt(commandName)
  if (builtinPrompt) {
    // 替换 $ARGUMENTS 占位符
    return builtinPrompt.replace(/\$ARGUMENTS/g, args || '')
  }
  
  // 尝试获取自定义命令内容
  if (handlers.getCommandContent) {
    const customContent = await handlers.getCommandContent(commandName)
    if (customContent) {
      return customContent.replace(/\$ARGUMENTS/g, args || '')
    }
  }
  
  // 未知命令，返回原始消息
  return message
}

// 获取项目记忆信息 Hook
export function useMemoryInfo(apiEndpoint = '/api/copywriting', projectPath?: string) {
  const [memoryInfo, setMemoryInfo] = useState<{
    files: Array<{ type: string; name: string; path: string; size: number }>
    has_memory: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchMemoryInfo() {
      try {
        const url = projectPath
          ? `${apiEndpoint}/assistant/memory?project_path=${encodeURIComponent(projectPath)}`
          : `${apiEndpoint}/assistant/memory`
        
        const response = await fetch(url)
        if (response.ok) {
          const result = await response.json()
          const data = result.success ? result.data : null
          setMemoryInfo(data)
        }
      } catch (err) {
        console.error('Failed to fetch memory info:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMemoryInfo()
  }, [apiEndpoint, projectPath])
  
  return { memoryInfo, loading }
}
