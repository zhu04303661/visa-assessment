/**
 * 消息列表组件
 * 展示聊天消息，支持流式更新
 */

"use client"

import { useRef, useEffect, memo } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage, MessagePart, ToolCallPart, TextPart } from "./types"
import { ToolCallRenderer } from "./ToolCallRenderer"
import { SpinnerIcon, ClaudeIcon, CopyIcon, CheckIcon, RetryIcon, ThinkingDots, StreamingCursor } from "./icons"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import ReactMarkdown from "react-markdown"
import { useState } from "react"

interface MessagesListProps {
  messages: ChatMessage[]
  isStreaming?: boolean
  onRetry?: () => void
  onStartAgent?: () => void
  className?: string
}

// 用户消息组件
const UserMessage = memo(function UserMessage({
  message,
}: {
  message: ChatMessage
}) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2.5">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          U
        </AvatarFallback>
      </Avatar>
    </div>
  )
})

// 助手消息组件
const AssistantMessage = memo(function AssistantMessage({
  message,
  isLast,
  onRetry,
}: {
  message: ChatMessage
  isLast?: boolean
  onRetry?: () => void
}) {
  const [copied, setCopied] = useState(false)
  
  // 提取文本部分和工具调用
  const textParts: TextPart[] = []
  const toolCalls: ToolCallPart[] = []
  
  if (message.parts) {
    for (const part of message.parts) {
      if (part.type === 'text') {
        textParts.push(part)
      } else if (part.type === 'tool-call') {
        toolCalls.push(part)
      }
    }
  }
  
  const textContent = textParts.length > 0 
    ? textParts.map(p => p.text).join('\n')
    : message.content
  
  // 复制消息
  const handleCopy = () => {
    navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const isError = message.status === 'error'
  const isStreaming = message.status === 'streaming'
  const isPending = message.status === 'pending'
  
  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white">
          <ClaudeIcon className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 space-y-2">
        {/* 工具调用 */}
        {toolCalls.length > 0 && (
          <div className="space-y-2">
            {toolCalls.map((toolCall) => (
              <ToolCallRenderer
                key={toolCall.toolCallId}
                toolCall={toolCall}
              />
            ))}
          </div>
        )}
        
        {/* 文本内容 */}
        {(textContent || isPending) && (
          <div
            className={cn(
              "rounded-2xl bg-muted/50 px-4 py-2.5 prose prose-sm dark:prose-invert max-w-none",
              isError && "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800",
              isPending && "animate-pulse"
            )}
          >
            {isPending ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <SpinnerIcon className="w-4 h-4" />
                <TextShimmer className="text-sm font-medium" duration={1.5}>
                  思考中
                </TextShimmer>
                <ThinkingDots className="text-muted-foreground" />
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  // 自定义代码块样式
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match
                    
                    if (isInline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    }
                    
                    return (
                      <pre className="bg-muted rounded-lg p-3 overflow-x-auto">
                        <code className={cn("font-mono text-sm", className)} {...props}>
                          {children}
                        </code>
                      </pre>
                    )
                  },
                  // 链接在新标签打开
                  a({ href, children, ...props }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        {...props}
                      >
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {textContent}
              </ReactMarkdown>
            )}
          </div>
        )}
        
        {/* 操作按钮 */}
        {message.status === 'complete' && textContent && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3 h-3 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <CopyIcon className="w-3 h-3 mr-1" />
                  复制
                </>
              )}
            </Button>
            
            {isLast && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={onRetry}
              >
                <RetryIcon className="w-3 h-3 mr-1" />
                重试
              </Button>
            )}
          </div>
        )}
        
        {/* 流式光标 */}
        {isStreaming && <StreamingCursor />}
      </div>
    </div>
  )
})

export function MessagesList({
  messages,
  isStreaming,
  onRetry,
  onStartAgent,
  className,
}: MessagesListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  
  // 自动滚动到底部
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming])
  
  if (messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
            <ClaudeIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-200">GTV 签证文案助手</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              专业的英国全球人才签证申请顾问，帮你分析材料、撰写文案、评估资格
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => onStartAgent?.()}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-amber-600 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              开始分析我的申请材料
            </button>
            
            <p className="text-xs text-muted-foreground">
              或在下方输入框中提出你的问题
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-medium text-slate-700 dark:text-slate-300">📄 材料分析</div>
              <div className="text-muted-foreground mt-1">分析简历、推荐信等</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-medium text-slate-700 dark:text-slate-300">✍️ 文案撰写</div>
              <div className="text-muted-foreground mt-1">个人陈述、申请信</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-medium text-slate-700 dark:text-slate-300">📊 资格评估</div>
              <div className="text-muted-foreground mt-1">Talent vs Promise</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-medium text-slate-700 dark:text-slate-300">💡 策略建议</div>
              <div className="text-muted-foreground mt-1">证据补充方案</div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div
      ref={containerRef}
      className={cn("flex-1 overflow-y-auto p-4 space-y-4", className)}
    >
      {messages.map((message, index) => (
        <div key={message.id} className="group">
          {message.role === 'user' ? (
            <UserMessage message={message} />
          ) : (
            <AssistantMessage
              message={message}
              isLast={index === messages.length - 1}
              onRetry={onRetry}
            />
          )}
        </div>
      ))}
      
      {/* 底部锚点 */}
      <div ref={bottomRef} />
    </div>
  )
}
