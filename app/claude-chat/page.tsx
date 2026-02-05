/**
 * Claude Chat 页面
 * 
 * 独立的 AI 聊天界面，集成 Claude Code CLI
 */

"use client"

import { Suspense } from "react"
import { ClaudeChat } from "@/components/claude-chat"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Loader2 } from "lucide-react"

function ChatPageContent() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navbar />
      
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ClaudeChat
          apiEndpoint="/api/copywriting"
          initialMode="ask"
          title="Claude Code 助手"
          showHeader={true}
          height="100%"
          onError={(error) => console.error('Chat error:', error)}
        />
      </main>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function ClaudeChatPage() {
  return (
    <AuthGuard 
      requireAuth={true} 
      allowedRoles={['admin', 'super_admin']} 
      unauthorizedMessage="Claude Chat 仅对管理员开放"
    >
      <Suspense fallback={<LoadingFallback />}>
        <ChatPageContent />
      </Suspense>
    </AuthGuard>
  )
}
