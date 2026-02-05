/**
 * Claude Chat 组件类型定义
 * 借鉴 1code 的设计，适配 Next.js 环境
 */

// 执行模式
export type ExecutionMode = 'ask' | 'agent' | 'plan'

export interface ModeInfo {
  id: ExecutionMode
  name: string
  description: string
  icon: string
  available: boolean
}

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'

// 消息状态
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'

// 工具调用状态
export type ToolCallState = 'pending' | 'running' | 'complete' | 'error'

// 工具调用类型
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: string
  state: ToolCallState
  duration?: number
}

// 消息部分 - 文本
export interface TextPart {
  type: 'text'
  text: string
}

// 消息部分 - 工具调用
export interface ToolCallPart {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result?: string
  state: ToolCallState
}

// 消息部分 - 思考过程
export interface ThinkingPart {
  type: 'thinking'
  thinking: string
}

// 消息部分联合类型
export type MessagePart = TextPart | ToolCallPart | ThinkingPart

// 聊天消息
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  parts?: MessagePart[]
  status: MessageStatus
  createdAt: Date
  metadata?: MessageMetadata
}

// 消息元数据
export interface MessageMetadata {
  model?: string
  tokensUsed?: number
  duration?: number
  toolCalls?: ToolCall[]
}

// 聊天状态
export interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  currentMode: ExecutionMode
  error?: string
}

// 聊天配置
export interface ChatConfig {
  projectId?: string
  workingDirectory?: string
  skills?: string[]
  model?: string
  maxTokens?: number
}

// 流式事件类型
export type StreamEventType = 
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'tool_use_start'
  | 'tool_use_delta'
  | 'tool_use_stop'
  | 'error'

// 流式事件
export interface StreamEvent {
  type: StreamEventType
  data: unknown
}

// 服务状态
export interface ServiceStatus {
  current_mode: ExecutionMode
  available_modes: ModeInfo[]
  cli_available: boolean
  cli_path?: string
  skills_count: number
  llm_provider: string
}

// 技能信息
export interface SkillInfo {
  name: string
  display_name: string
  description: string
}

// 发送消息选项
export interface SendMessageOptions {
  mode?: ExecutionMode
  skill?: string
  context?: Record<string, unknown>
}

// Hook 返回类型
export interface UseClaudeChatReturn {
  messages: ChatMessage[]
  isStreaming: boolean
  currentMode: ExecutionMode
  error?: string
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>
  stopGeneration: () => void
  clearMessages: () => void
  setMode: (mode: ExecutionMode) => void
  retry: () => void
}

// 工具图标映射
export const TOOL_ICONS: Record<string, string> = {
  'Read': 'file-text',
  'Write': 'file-plus',
  'Edit': 'edit',
  'Bash': 'terminal',
  'Grep': 'search',
  'Glob': 'folder-search',
  'WebSearch': 'globe',
  'WebFetch': 'download',
  'Task': 'list-todo',
  'AskUser': 'message-circle',
  'Think': 'brain',
  'Plan': 'clipboard-list',
}

// 工具名称映射
export const TOOL_NAMES: Record<string, string> = {
  'Read': '读取文件',
  'Write': '写入文件',
  'Edit': '编辑文件',
  'Bash': '执行命令',
  'Grep': '搜索内容',
  'Glob': '查找文件',
  'WebSearch': '网页搜索',
  'WebFetch': '获取网页',
  'Task': '子任务',
  'AskUser': '询问用户',
  'Think': '思考',
  'Plan': '规划',
}
