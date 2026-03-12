"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import OpenClawChatUI from "@/components/openclaw-chat-ui"
import ChatHistorySidebar from "@/components/chat-history-sidebar"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import {
  MessageCircle, Target, FileText, PenTool,
  ScrollText, MapPin, Search, Sparkles, ArrowRight
} from "lucide-react"
import {
  getSessions,
  createSession,
  updateSession,
  getActiveSessionId,
  setActiveSessionId,
} from "@/lib/chat-sessions"

const SIDEBAR_SKILLS = [
  { icon: Target, label: "GTV资格评估", labelEn: "GTV Assessment", desc: "系统化评分与路径推荐", descEn: "Scoring & path recommendation", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { icon: FileText, label: "简历分析", labelEn: "Resume Analysis", desc: "亮点识别与差距分析", descEn: "Highlights & gap analysis", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { icon: PenTool, label: "文案撰写", labelEn: "Copywriting", desc: "个人陈述与证据描述", descEn: "Statement & evidence description", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { icon: ScrollText, label: "推荐信", labelEn: "Recommendation", desc: "四阶段专业流程", descEn: "4-phase professional workflow", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { icon: MapPin, label: "策略规划", labelEn: "Strategy", desc: "路线图与时间表", descEn: "Roadmap & timeline", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { icon: Search, label: "政策查询", labelEn: "Policy Research", desc: "实时政策与规则", descEn: "Live policy & rules", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
]

export default function ChatAssessmentPage() {
  const { language } = useLanguage()
  const [activeSessionId, setActiveId] = useState<string | null>(null)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const existing = getActiveSessionId()
    const sessions = getSessions()
    if (existing && sessions.some(s => s.id === existing)) {
      setActiveId(existing)
    } else if (sessions.length > 0) {
      setActiveId(sessions[0].id)
      setActiveSessionId(sessions[0].id)
    } else {
      const newSession = createSession()
      setActiveId(newSession.id)
    }
  }, [])

  const handleSelectSession = useCallback((id: string) => {
    setActiveId(id)
    setActiveSessionId(id)
  }, [])

  const handleNewSession = useCallback(() => {
    const session = createSession()
    setActiveId(session.id)
    setSidebarRefresh(n => n + 1)
  }, [])

  const handleSessionUpdate = useCallback((info: { messageCount: number; preview: string; title?: string }) => {
    if (!activeSessionId) return
    const updates: Record<string, unknown> = {
      messageCount: info.messageCount,
      preview: info.preview,
    }
    if (info.title) {
      updates.title = info.title
    }
    updateSession(activeSessionId, updates as { messageCount: number; preview: string; title?: string })
    setSidebarRefresh(n => n + 1)
  }, [activeSessionId])

  if (!mounted) return null

  return (
    <AuthGuard requireAuth={true}>
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />
      <div className="flex-1 flex min-h-0">
        {/* Left: History sidebar */}
        <ChatHistorySidebar
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          refreshTrigger={sidebarRefresh}
        />

        {/* Center: Chat area — takes all remaining space */}
        <div className="flex-1 min-w-0 flex flex-col">
          <OpenClawChatUI
            sessionId={activeSessionId}
            onSessionUpdate={handleSessionUpdate}
          />
        </div>

        {/* Right: Skills panel — collapsible on smaller screens */}
        <div className="hidden 2xl:flex w-56 shrink-0 flex-col border-l bg-muted/10 overflow-y-auto">
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-medium px-1">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              {language === "en" ? "AI Skills" : "AI专业技能"}
            </div>
            <div className="space-y-1.5">
              {SIDEBAR_SKILLS.map((skill, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${skill.bg} transition-colors`}>
                  <div className={`p-1 rounded ${skill.color}`}>
                    <skill.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium leading-tight">
                      {language === "en" ? skill.labelEn : skill.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {language === "en" ? skill.descEn : skill.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                {language === "en" ? "Data Flow" : "数据联动"}
              </div>
              <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">简历分析</Badge>
                <ArrowRight className="h-3 w-3 rotate-90" />
                <Badge variant="outline" className="text-xs">资格评估</Badge>
                <ArrowRight className="h-3 w-3 rotate-90" />
                <div className="flex gap-1 flex-wrap justify-center">
                  <Badge variant="outline" className="text-xs">文案撰写</Badge>
                  <Badge variant="outline" className="text-xs">推荐信</Badge>
                  <Badge variant="outline" className="text-xs">策略规划</Badge>
                </div>
              </div>
            </div>

            <Button
              onClick={() => window.location.href = '/assessment'}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {language === "en" ? "Full Assessment Form" : "传统评估表"}
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
