"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { Bot, User, Loader2, Globe, Share2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OpenClawClient } from "@/lib/openclaw-client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Navbar } from "@/components/navbar"

const OC_PORT = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_PORT || "18789"
const OC_TOKEN = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN || ""

const GATEWAY_URL = typeof window !== "undefined"
  ? window.location.protocol === "https:"
    ? `wss://${window.location.host}/ws/openclaw`
    : `ws://${window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname}:${OC_PORT}`
  : `ws://127.0.0.1:${OC_PORT}`

interface SharedMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map(block => {
        if (typeof block === "string") return block
        if (block && typeof block === "object") {
          if (typeof (block as Record<string, unknown>).text === "string") return (block as Record<string, unknown>).text as string
          if (typeof (block as Record<string, unknown>).content === "string") return (block as Record<string, unknown>).content as string
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>
    if (typeof obj.text === "string") return obj.text
    if (typeof obj.content === "string") return obj.content
  }
  return ""
}

export default function SharedChatPage() {
  const params = useParams()
  const token = params.token as string

  const [messages, setMessages] = useState<SharedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const clientRef = useRef<OpenClawClient | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/chat-share?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error === "Invalid token" ? "分享链接无效或已过期" : data.error)
          setLoading(false)
          return
        }
        setSessionKey(data.sessionKey)
      })
      .catch(() => {
        setError("无法解析分享链接")
        setLoading(false)
      })
  }, [token])

  useEffect(() => {
    if (!sessionKey) return

    const client = new OpenClawClient({
      url: GATEWAY_URL,
      token: OC_TOKEN,
      sessionKey,
      onStatusChange: (status) => {
        if (status === "connected") {
          setConnected(true)
        }
      },
      onMessage: () => {},
      onError: (err) => {
        console.error("Share view WS error:", err)
      },
    })

    clientRef.current = client
    client.connect()

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [sessionKey])

  useEffect(() => {
    if (!connected || !sessionKey) return
    const client = clientRef.current
    if (!client) return

    client.getHistory(200, sessionKey)
      .then(history => {
        if (Array.isArray(history) && history.length > 0) {
          const restored: SharedMessage[] = history
            .filter(m => m && (m.role === "user" || m.role === "assistant"))
            .map((m, i) => ({
              id: `shared-${i}`,
              role: m.role as "user" | "assistant",
              content: extractTextContent(m.content),
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            }))
            .filter(m => m.content.length > 0)
          setMessages(restored)
        }
        setLoading(false)

        client.disconnect()
        clientRef.current = null
      })
      .catch(err => {
        console.error("Failed to load shared history:", err)
        setError("无法加载对话内容")
        setLoading(false)
      })
  }, [connected, sessionKey])

  const title = useMemo(() => {
    const firstUser = messages.find(m => m.role === "user")
    return firstUser ? firstUser.content.slice(0, 40) : "共享对话"
  }, [messages])

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold mb-2">无法打开分享</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => window.location.href = "/chat"} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回聊天
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <Share2 className="h-4 w-4 text-emerald-600" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{title}</div>
            <div className="text-xs text-muted-foreground">
              共享对话 · {messages.length} 条消息 · 只读
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            <Globe className="w-3 h-3 mr-1" />
            OpenClaw
          </Badge>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-6 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>加载对话中...</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-muted-foreground">此对话暂无消息</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col max-w-[85%]">
              <div
                className={`rounded-xl px-5 py-3 ${
                  message.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-50 dark:bg-gray-800/80 text-foreground border"
                }`}
              >
                <div className="break-words text-[15px] leading-relaxed">
                  {message.role === "assistant" ? (
                    <div className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:my-2.5 prose-pre:my-2.5 prose-hr:my-3 prose-blockquote:my-2.5 prose-code:text-[13px] prose-h2:text-lg prose-h3:text-base">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
              </div>
              <p className={`text-xs text-muted-foreground mt-1 ${
                message.role === "user" ? "text-right" : "text-left"
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {message.role === "user" && (
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        由惜池移民顾问 AI 生成 · <a href="/chat" className="text-emerald-600 hover:underline">开始您的咨询</a>
      </div>
    </div>
  )
}
