"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import ACEChatUIComponent from "@/components/ace-chat-ui"
import { Navbar } from "@/components/navbar"
import { MessageCircle, Sparkles } from "lucide-react"
import { useState } from "react"

interface AssessmentData {
  name?: string
  field?: string
  experience?: string
  education?: string
  achievements?: string[]
  currentScore?: number
  pathway?: string
}

export default function ChatAssessmentPage() {
  const { t, language } = useLanguage()
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({})
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 聊天区域 */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col min-h-0 shadow-lg">
                <CardContent className="flex-1 p-0">
                  <ACEChatUIComponent />
                </CardContent>
              </Card>
            </div>

            {/* 咨询信息侧边栏 */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {language === "en" ? "Consultation Info" : "咨询信息"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessmentData.name && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Name" : "姓名"}:
                      </span>
                      <p className="text-sm text-foreground mt-1">{assessmentData.name}</p>
                    </div>
                  )}
                  {assessmentData.field && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Field" : "领域"}:
                      </span>
                      <Badge variant="secondary" className="ml-2 mt-1">
                        {assessmentData.field}
                      </Badge>
                    </div>
                  )}
                  {assessmentData.currentScore && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Eligibility Score" : "资格评分"}:
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${assessmentData.currentScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {assessmentData.currentScore}/100
                        </span>
                      </div>
                    </div>
                  )}
                  {assessmentData.pathway && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Recommended Pathway" : "推荐路径"}:
                      </span>
                      <Badge 
                        variant={assessmentData.pathway.includes("Exceptional Talent") ? "default" : "secondary"}
                        className="ml-2 mt-1"
                      >
                        {assessmentData.pathway}
                      </Badge>
                    </div>
                  )}
                  {!assessmentData.name && !assessmentData.field && (
                    <p className="text-sm text-muted-foreground">
                      {language === "en"
                        ? "Start chatting to begin your consultation. Our AI will help assess your eligibility and answer your questions."
                        : "开始聊天以开始您的咨询。我们的AI将帮助评估您的资格并回答您的问题。"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {isAssessmentComplete && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600 dark:text-green-400">
                      {language === "en" ? "Consultation Complete" : "咨询完成"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === "en"
                        ? "Your consultation is complete. View your full assessment report for detailed recommendations."
                        : "您的咨询已完成。查看完整评估报告以获取详细建议。"}
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/results'}
                      className="w-full"
                    >
                      {language === "en" ? "View Full Report" : "查看完整报告"}
                    </Button>
                  </CardContent>
                </Card>
              )}

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
                    {language === "en" ? "Start GTV Assessment" : "开始GTV评估"}
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full"
                  >
                    {language === "en" ? "New Consultation" : "新咨询"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
