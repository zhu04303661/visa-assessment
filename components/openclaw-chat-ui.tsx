"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useLanguage } from "@/lib/i18n"
import {
  Bot, User, Loader2, Send, Cog, Globe, Square, Zap, Shield,
  FileText, GraduationCap, Briefcase, Plane, Building2, Scale,
  Maximize2, Minimize2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { OpenClawClient } from "@/lib/openclaw-client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  toolCalls?: Array<{ name: string; input: string; output?: string }>
  isStreaming?: boolean
}

const IMMIGRATION_SYSTEM_PROMPT = `你是一位资深的英国移民顾问AI助手，名为"惜池移民顾问"。你的职责是帮助用户解答各类英国移民和签证问题。

## 你的专业领域：
1. **GTV签证 (Global Talent Visa)** - Exceptional Talent / Exceptional Promise / Startup Visa
2. **工作签证** - Skilled Worker Visa、Sponsor Licence、Intra-company Transfer
3. **学生签证** - Student Visa、Graduate Visa、研究生留英路径
4. **家庭签证** - Spouse Visa、Parent Visa、家庭团聚
5. **投资移民** - Innovator Founder Visa、投资者路径
6. **永居和入籍** - ILR (Indefinite Leave to Remain)、英国国籍申请
7. **签证材料准备** - 文案撰写、推荐信指导、证据整理

## 回复要求：
- 用中文回复，语气友好专业
- 提供具体、可操作的建议
- 涉及具体政策时引用最新的移民规则
- 主动询问用户背景以提供更精准的建议
- 在适当时候推荐使用系统的评估功能

请根据用户的问题提供专业的移民咨询服务。`

const QUICK_QUESTIONS = [
  { icon: Shield, label: "GTV签证评估", prompt: "我想了解GTV全球人才签证的申请条件和流程，请帮我评估一下我是否符合要求。" },
  { icon: Briefcase, label: "工作签证咨询", prompt: "我想了解英国工作签证(Skilled Worker Visa)的申请要求和流程。" },
  { icon: GraduationCap, label: "学生签证", prompt: "我想了解英国学生签证的申请流程以及毕业后的留英路径。" },
  { icon: Building2, label: "创业签证", prompt: "我想了解Innovator Founder Visa创新者签证的申请条件。" },
  { icon: Plane, label: "永居规划", prompt: "我想了解如何获得英国永居(ILR)，以及不同签证转永居的条件。" },
  { icon: Scale, label: "签证材料指导", prompt: "我需要准备签证申请材料，请指导我如何准备推荐信和证据材料。" },
]

const OC_PORT = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_PORT || "18789"
const OC_TOKEN = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN || ""

const GATEWAY_URL = typeof window !== "undefined"
  ? window.location.protocol === "https:"
    ? `wss://${window.location.host}/ws/openclaw`
    : `ws://${window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname}:${OC_PORT}`
  : `ws://127.0.0.1:${OC_PORT}`

const GATEWAY_TOKEN = OC_TOKEN

export default function OpenClawChatUI() {
  const { language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [activeToolCalls, setActiveToolCalls] = useState<Array<{ name: string; input: string }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<OpenClawClient | null>(null)
  const streamingMsgIdRef = useRef<string | null>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const client = new OpenClawClient({
      url: GATEWAY_URL,
      token: GATEWAY_TOKEN,
      sessionKey: "agent:main:visa-consultant",
      onStatusChange: (status) => {
        setConnectionStatus(status)
      },
      onMessage: (text, done) => {
        const msgId = streamingMsgIdRef.current
        if (!msgId) return

        setMessages(prev => prev.map(m =>
          m.id === msgId
            ? { ...m, content: text, isStreaming: !done }
            : m
        ))

        if (done) {
          streamingMsgIdRef.current = null
          setIsLoading(false)
          setActiveToolCalls([])
        }

        scrollToBottom()
      },
      onError: (error) => {
        console.error("OpenClaw error:", error)
        setIsLoading(false)
        setActiveToolCalls([])

        if (streamingMsgIdRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === streamingMsgIdRef.current
              ? { ...m, content: m.content || `抱歉，处理出错：${error}`, isStreaming: false }
              : m
          ))
          streamingMsgIdRef.current = null
        }
      },
      onToolCall: (tool) => {
        if (tool.output) {
          setActiveToolCalls(prev => prev.filter(t => t.name !== tool.name))
        } else {
          setActiveToolCalls(prev => [...prev, { name: tool.name, input: tool.input }])
        }

        if (streamingMsgIdRef.current) {
          setMessages(prev => prev.map(m => {
            if (m.id !== streamingMsgIdRef.current) return m
            const existingTools = m.toolCalls || []
            if (tool.output) {
              return {
                ...m,
                toolCalls: existingTools.map(t =>
                  t.name === tool.name && !t.output
                    ? { ...t, output: tool.output }
                    : t
                ),
              }
            }
            return { ...m, toolCalls: [...existingTools, tool] }
          }))
        }
      },
    })

    clientRef.current = client
    client.connect()

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [scrollToBottom])

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim()
    if (!messageText || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }

    const assistantMsgId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }

    streamingMsgIdRef.current = assistantMsgId
    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const client = clientRef.current
      if (!client?.isConnected) {
        throw new Error("未连接到AI顾问服务")
      }

      const fullMessage = messages.length === 0
        ? `${IMMIGRATION_SYSTEM_PROMPT}\n\n用户问题：${messageText}`
        : messageText

      await client.sendMessage(fullMessage)
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? {
            ...m,
            content: `抱歉，无法处理您的请求。${error instanceof Error ? error.message : "请稍后重试。"}`,
            isStreaming: false,
          }
          : m
      ))
      streamingMsgIdRef.current = null
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    try {
      await clientRef.current?.abort()
    } catch {
      // ignore
    }
    setIsLoading(false)
    if (streamingMsgIdRef.current) {
      setMessages(prev => prev.map(m =>
        m.id === streamingMsgIdRef.current
          ? { ...m, isStreaming: false }
          : m
      ))
      streamingMsgIdRef.current = null
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const statusColor = connectionStatus === "connected"
    ? "bg-green-500"
    : connectionStatus === "connecting"
      ? "bg-yellow-500 animate-pulse"
      : "bg-red-500"

  const statusText = connectionStatus === "connected"
    ? (language === "en" ? "AI Consultant Online" : "AI顾问已上线")
    : connectionStatus === "connecting"
      ? (language === "en" ? "Connecting..." : "连接中...")
      : (language === "en" ? "Offline" : "离线")

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-full"}`}>
      {/* Header status bar */}
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-sm text-muted-foreground">{statusText}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            OpenClaw
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen
              ? (language === "en" ? "Exit Fullscreen" : "退出全屏")
              : (language === "en" ? "Fullscreen" : "全屏")}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">
                {language === "en" ? "Xichi Immigration Consultant" : "惜池移民顾问"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {language === "en"
                  ? "Powered by OpenClaw AI Agent. Ask me anything about UK immigration, visas, and settlement."
                  : "基于OpenClaw AI Agent驱动。向我咨询任何英国移民、签证和定居问题。"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {QUICK_QUESTIONS.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="h-auto py-3 px-4 text-left flex items-start gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                  onClick={() => handleSend(q.prompt)}
                  disabled={connectionStatus !== "connected"}
                >
                  <q.icon className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-xs leading-tight">{q.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="flex flex-col max-w-[80%]">
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-50 dark:bg-gray-800 text-foreground border"
                }`}
              >
                <div className="break-words text-sm leading-relaxed">
                  {message.role === "assistant" && message.content ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-table:my-2 prose-pre:my-2 prose-hr:my-3 prose-blockquote:my-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                  {message.isStreaming && !message.content && (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-muted-foreground">思考中...</span>
                    </span>
                  )}
                  {message.isStreaming && message.content && (
                    <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>

                {/* Tool calls display */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    {message.toolCalls.map((tool, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Cog className={`h-3 w-3 ${!tool.output ? "animate-spin" : ""}`} />
                        <span className="font-mono">{tool.name}</span>
                        {tool.output && <span className="text-green-600">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className={`text-xs text-muted-foreground mt-1 ${
                message.role === "user" ? "text-right" : "text-left"
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {/* Active tool calls indicator */}
        {activeToolCalls.length > 0 && !streamingMsgIdRef.current && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 border">
              <div className="flex items-center gap-2">
                <Cog className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  {language === "en" ? "Using tools..." : "正在使用工具..."}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4 flex-shrink-0">
        {connectionStatus !== "connected" && (
          <div className="mb-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-3 py-2 flex items-center gap-2">
            <Zap className="h-3 w-3" />
            {language === "en"
              ? "Connecting to AI consultant service..."
              : "正在连接AI顾问服务，请稍候..."}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              language === "en"
                ? "Ask me about UK immigration..."
                : "请输入您的移民咨询问题..."
            }
            disabled={isLoading || connectionStatus !== "connected"}
            className="flex-1"
          />
          {isLoading ? (
            <Button onClick={handleStop} size="icon" variant="destructive">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || connectionStatus !== "connected"}
              size="icon"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
