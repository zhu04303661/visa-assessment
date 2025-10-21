"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import ACEChatUIComponent from "@/components/ace-chat-ui"
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
  const { t } = useLanguage()
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({})
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("chat.title")}
          </h1>
          <p className="text-gray-600">
            {t("chat.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 聊天区域 */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col min-h-0">
                <CardContent className="flex-1 p-0">
                  <ACEChatUIComponent />
                </CardContent>
            </Card>
          </div>

          {/* 评估信息侧边栏 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("chat.assessmentInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessmentData.name && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      {t("chat.name")}:
                    </span>
                    <p className="text-sm">{assessmentData.name}</p>
                  </div>
                )}
                {assessmentData.field && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      {t("chat.field")}:
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {assessmentData.field}
                    </Badge>
                  </div>
                )}
                {assessmentData.currentScore && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      {t("chat.currentScore")}:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${assessmentData.currentScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {assessmentData.currentScore}/100
                      </span>
                    </div>
                  </div>
                )}
                {assessmentData.pathway && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      {t("chat.recommendedPathway")}:
                    </span>
                    <Badge 
                      variant={assessmentData.pathway.includes("Exceptional Talent") ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {assessmentData.pathway}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {isAssessmentComplete && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-green-600">
                    {t("chat.assessmentComplete")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    {t("chat.assessmentCompleteDesc")}
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/results'}
                    className="w-full"
                  >
                    {t("chat.viewFullReport")}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("chat.actions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  {t("chat.resetAssessment")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
