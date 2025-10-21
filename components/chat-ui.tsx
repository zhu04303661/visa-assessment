"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage } from "@/lib/i18n"
import { Bot, User, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface Message {
  id: string
  type: "text"
  content: {
    text: string
  }
  user: {
    avatar: string
    name: string
  }
  timestamp?: Date
}

interface AssessmentData {
  name?: string
  field?: string
  experience?: string
  education?: string
  achievements?: string[]
  currentScore?: number
  pathway?: string
}

export default function ChatUIComponent() {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({})
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        type: "text",
        content: {
          text: t("chat.welcome")
        },
        user: {
          avatar: "🤖",
          name: "Assessment Assistant"
        },
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "text",
      content: {
        text: inputValue.trim()
      },
      user: {
        avatar: "👤",
        name: "You"
      },
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    
    setTimeout(() => scrollToBottom(), 50)

    try {
      const response = await fetch("/api/chat-assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          conversationHistory: messages.map(msg => ({
            role: msg.user.name === "You" ? "user" : "assistant",
            content: msg.content.text,
            timestamp: msg.timestamp
          })),
          assessmentData
        }),
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "text",
        content: {
          text: data.message
        },
        user: {
          avatar: "🤖",
          name: "Assessment Assistant"
        },
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      
      if (data.assessmentData) {
        setAssessmentData(prev => ({ ...prev, ...data.assessmentData }))
      }

      if (data.isComplete) {
        setIsAssessmentComplete(true)
      }
      
      setTimeout(() => scrollToBottom(), 100)
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "text",
        content: {
          text: t("chat.error")
        },
        user: {
          avatar: "🤖",
          name: "Assessment Assistant"
        },
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      setTimeout(() => scrollToBottom(), 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.user.name === "You" ? "justify-end" : "justify-start"
            }`}
          >
            {message.user.name === "Assessment Assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <div className="flex flex-col max-w-[80%]">
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.user.name === "You"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {message.content.text}
                </div>
              </div>
              <p className={`text-xs text-gray-500 mt-1 ${
                message.user.name === "You" ? "text-right" : "text-left"
              }`}>
                {message.timestamp?.toLocaleTimeString()}
              </p>
            </div>
            {message.user.name === "You" && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t("chat.thinking")}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2 max-w-[80%]">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("chat.inputPlaceholder")}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}