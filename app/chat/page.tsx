"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import OpenClawChatUI from "@/components/openclaw-chat-ui"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { MessageCircle, Globe } from "lucide-react"

export default function ChatAssessmentPage() {
  const { language } = useLanguage()

  return (
    <AuthGuard requireAuth={true}>
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <MessageCircle className="h-4 w-4" />
              <span>{language === "en" ? "AI-Powered Consultation" : "AI智能咨询"}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {language === "en" ? "AI Immigration Consultation" : "AI移民咨询"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {language === "en"
                ? "Get instant answers to your UK immigration questions. Our AI assistant can help with visa eligibility, application processes, and provide personalized guidance."
                : "即时解答您的英国移民问题。我们的AI助手可以帮助您了解签证资格、申请流程，并提供个性化指导。"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card className="h-[calc(100vh-280px)] min-h-[500px] flex flex-col shadow-lg">
                <CardContent className="flex-1 p-0 min-h-0">
                  <OpenClawChatUI />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-emerald-500" />
                    {language === "en" ? "AI Consultant" : "AI移民顾问"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {language === "en"
                      ? "Powered by OpenClaw AI Agent with real-time skills and tools. Ask about any UK visa type, application process, or immigration strategy."
                      : "基于OpenClaw AI Agent驱动，具备实时技能和工具调用能力。可以咨询任何英国签证类型、申请流程或移民策略。"}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">GTV签证</Badge>
                      <Badge variant="outline" className="text-xs">工作签证</Badge>
                      <Badge variant="outline" className="text-xs">学生签证</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">创业签证</Badge>
                      <Badge variant="outline" className="text-xs">永居规划</Badge>
                      <Badge variant="outline" className="text-xs">材料指导</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "en" ? "Quick Actions" : "快捷操作"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => window.location.href = '/assessment'}
                    variant="outline"
                    className="w-full"
                  >
                    {language === "en" ? "Full Assessment Form" : "完整评估表"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
