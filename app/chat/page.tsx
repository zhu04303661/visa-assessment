"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import OpenClawChatUI, { type OpenClawChatUIHandle } from "@/components/openclaw-chat-ui"
import ChatHistorySidebar from "@/components/chat-history-sidebar"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth/auth-context"
import {
  MessageCircle, Target, FileText, PenTool,
  ScrollText, MapPin, Search, Sparkles, ArrowRight
} from "lucide-react"
import {
  getSessions,
  createSession,
  updateSession,
  setActiveSessionId,
} from "@/lib/chat-sessions"

const GTV_WELCOME = `您好，欢迎找到我们，很高兴为您评估。

请根据个人情况和所属行业领域详细填写以下信息，不适用的情况写"无"即可。

**我们深知您的信息属于重要隐私，我们郑重承诺对所有信息严格保密。**

请依次提供以下信息，我将为您进行专业的 GTV 资格评估：`

const SIDEBAR_SKILLS = [
  { icon: Target, label: "GTV资格评估", labelEn: "GTV Assessment", desc: "系统化评分与路径推荐", descEn: "Scoring & path recommendation", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", prompt: "请使用 gtv-assessment 技能帮我做一次完整的GTV资格评估。请先引导我提供所需的背景信息。", welcomeMessage: GTV_WELCOME },
  { icon: FileText, label: "简历分析", labelEn: "Resume Analysis", desc: "亮点识别与差距分析", descEn: "Highlights & gap analysis", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", prompt: "请使用 resume-analyzer 技能帮我分析简历，识别GTV申请相关的亮点和不足。我可以粘贴简历内容给你。" },
  { icon: PenTool, label: "文案撰写", labelEn: "Copywriting", desc: "个人陈述与证据描述", descEn: "Statement & evidence description", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", prompt: "请使用 gtv-copywriting 技能帮我撰写GTV申请的个人陈述(Personal Statement)。请先了解我的背景信息。" },
  { icon: ScrollText, label: "推荐信", labelEn: "Recommendation", desc: "四阶段专业流程", descEn: "4-phase professional workflow", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", prompt: "请使用 gtv-recommendation-letter 技能帮我撰写GTV推荐信。请先引导我提供推荐人信息和申请人材料。" },
  { icon: MapPin, label: "策略规划", labelEn: "Strategy", desc: "路线图与时间表", descEn: "Roadmap & timeline", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30", prompt: "请使用 immigration-strategy 技能帮我制定GTV签证的申请策略和时间规划。" },
  { icon: Search, label: "政策查询", labelEn: "Policy Research", desc: "实时政策与规则", descEn: "Live policy & rules", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", prompt: "请使用 uk-immigration-policy 技能帮我查询最新的英国移民政策和GTV签证规则变化。" },
]

export default function ChatAssessmentPage() {
  const { language } = useLanguage()
  const { user, isSuperAdmin } = useAuth()
  const chatRef = useRef<OpenClawChatUIHandle>(null)
  const [activeSessionId, setActiveId] = useState<string | null>(null)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)
  const [mounted, setMounted] = useState(false)

  const userId = user?.id || "anonymous"
  const userEmail = user?.email

  useEffect(() => {
    if (!user) return
    setMounted(true)
    const newSession = createSession(userId, userEmail)
    setActiveId(newSession.id)
  }, [user, userId, userEmail])

  const handleSelectSession = useCallback((id: string) => {
    setActiveId(id)
    setActiveSessionId(userId, id)
  }, [userId])

  const handleNewSession = useCallback(() => {
    const session = createSession(userId, userEmail)
    setActiveId(session.id)
    setSidebarRefresh(n => n + 1)
  }, [userId, userEmail])

  const handleSessionUpdate = useCallback((info: { messageCount: number; preview: string; title?: string }) => {
    if (!activeSessionId) return
    const updates: Record<string, unknown> = {
      messageCount: info.messageCount,
      preview: info.preview,
    }
    if (info.title) {
      updates.title = info.title
    }
    updateSession(userId, activeSessionId, updates as { messageCount: number; preview: string; title?: string })
    setSidebarRefresh(n => n + 1)
  }, [activeSessionId, userId])

  if (!mounted) return null

  return (
    <AuthGuard requireAuth={true}>
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />
      <div className="flex-1 flex min-h-0">
        <ChatHistorySidebar
          userId={userId}
          isSuperAdmin={isSuperAdmin()}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          refreshTrigger={sidebarRefresh}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <OpenClawChatUI
            ref={chatRef}
            sessionId={activeSessionId}
            onSessionUpdate={handleSessionUpdate}
          />
        </div>

        <div className="hidden 2xl:flex w-56 shrink-0 flex-col border-l bg-muted/10 overflow-y-auto">
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-medium px-1">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              {language === "en" ? "AI Skills" : "AI专业技能"}
            </div>
            <div className="space-y-1.5">
              {SIDEBAR_SKILLS.map((skill, i) => (
                <button
                  key={i}
                  onClick={() => chatRef.current?.sendMessage(skill.prompt, {
                    welcomeMessage: (skill as typeof SIDEBAR_SKILLS[0]).welcomeMessage,
                    displayLabel: language === "en" ? skill.labelEn : skill.label,
                  })}
                  className={`w-full flex items-start gap-2 p-2 rounded-lg ${skill.bg} transition-all cursor-pointer hover:opacity-80 hover:scale-[1.02] active:scale-[0.98] text-left`}
                >
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
                </button>
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
