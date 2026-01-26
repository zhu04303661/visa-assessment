"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface OCAssessmentResult {
  ocId: string
  title: string
  category: string
  status: "满足" | "部分满足" | "不满足" | "未评估"
  score: number
  maxScore: number
  percentage: number
  evidence: string[]
  reasoning: string
  improvement_suggestions: string[]
  matched_keywords: string[]
}

interface OCAssessmentDisplayProps {
  ocResults?: OCAssessmentResult[]
  ocAssessment?: any  // Support data from analyze-resume API
  summary?: {
    total: number
    satisfied: number
    partially_satisfied: number
    unsatisfied: number
    average_score: number
    fulfillment_rate: string
    recommendation: string
  }
  language?: string
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "满足":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case "部分满足":
      return <AlertCircle className="h-5 w-5 text-yellow-600" />
    case "不满足":
      return <XCircle className="h-5 w-5 text-red-600" />
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "满足":
      return "bg-green-100 text-green-800"
    case "部分满足":
      return "bg-yellow-100 text-yellow-800"
    case "不满足":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getProgressColor = (score: number) => {
  if (score >= 80) return "bg-green-500"
  if (score >= 60) return "bg-yellow-500"
  return "bg-red-500"
}

export function OCAssessmentDisplay({ ocResults, ocAssessment, summary, language: providedLanguage }: OCAssessmentDisplayProps) {
  const { language: contextLanguage } = useLanguage()
  const language = providedLanguage || contextLanguage
  const [expandedOC, setExpandedOC] = useState<string | null>(null)

  // Handle both data structures
  // 支持多种数据结构：
  // 1. 直接的 ocResults 数组
  // 2. ocAssessment.oc_results 数组
  // 3. ocAssessment 是完整响应 {success, oc_results, summary}
  let results: any[] = []
  let summaryData: any = null
  
  if (ocResults && Array.isArray(ocResults)) {
    results = ocResults
  } else if (ocAssessment) {
    // 如果 ocAssessment 包含 success 字段，说明是完整响应
    if (ocAssessment.success !== undefined && ocAssessment.oc_results) {
      results = ocAssessment.oc_results
      summaryData = ocAssessment.summary
    } else if (ocAssessment.oc_results) {
      results = ocAssessment.oc_results
      summaryData = ocAssessment.summary || summary
    } else if (Array.isArray(ocAssessment)) {
      results = ocAssessment
    }
  }
  
  // 如果还没有summary，使用传入的summary
  if (!summaryData && summary) {
    summaryData = summary
  }

  // 调试日志
  console.log("📋 OCAssessmentDisplay Props:", { 
    ocResults, 
    ocAssessment, 
    summary, 
    language: providedLanguage 
  })
  console.log("📊 Processed Results:", { 
    results, 
    resultsLength: results.length,
    summaryData, 
    language: contextLanguage 
  })

  if (!results || results.length === 0) {
    console.warn("⚠️ No OC results to display", { 
      ocResults, 
      ocAssessment, 
      summary,
      processedResults: results,
      processedResultsLength: results.length
    })
    return null
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {summaryData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {language === "en" ? "OC Requirements Summary" : "可选要求(OC)评估总结"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">
                  {language === "en" ? "Total OCs" : "总OC数"}
                </p>
                <p className="text-2xl font-bold">{summaryData.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {language === "en" ? "Satisfied" : "满足"}
                </p>
                <p className="text-2xl font-bold text-green-600">{summaryData.satisfied}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {language === "en" ? "Partial" : "部分满足"}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {summaryData.partially_satisfied}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {language === "en" ? "Not Met" : "不满足"}
                </p>
                <p className="text-2xl font-bold text-red-600">{summaryData.unsatisfied}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {language === "en" ? "Fulfillment Rate" : "满足率"}
              </p>
              <div className="flex items-center gap-4">
                <Progress 
                  value={parseInt(summaryData.fulfillment_rate)} 
                  className="h-3"
                />
                <span className="text-lg font-bold">{summaryData.fulfillment_rate}</span>
              </div>
            </div>

            <Alert className="border-blue-300 bg-white">
              <Lightbulb className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {summaryData.recommendation}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* OC Details */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          {language === "en" ? "Optional Criteria (OC) Assessment Details" : "可选要求详细评估"}
        </h3>

        {results.map((oc) => (
          <Card
            key={oc.ocId}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => setExpandedOC(expandedOC === oc.ocId ? null : oc.ocId)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(oc.status)}
                    <div>
                      <CardTitle className="text-base">{oc.title}</CardTitle>
                      <CardDescription>{oc.category}</CardDescription>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(oc.status)}>{oc.status}</Badge>
                  {expandedOC === oc.ocId ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Score Bar */}
            <CardContent className="space-y-3 pb-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">
                    {language === "en" ? "Score" : "评分"}
                  </span>
                  <span className="text-gray-600">
                    {oc.score}/{oc.maxScore}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full transition-all ${getProgressColor(oc.score)}`}
                    style={{ width: `${oc.percentage * 100}%` }}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOC === oc.ocId && (
                <div className="space-y-4 border-t pt-4">
                  {/* Reasoning */}
                  <div>
                    <p className="mb-2 text-sm font-semibold">
                      {language === "en" ? "Assessment Reasoning" : "评估理由"}
                    </p>
                    <p className="text-sm text-gray-700">{oc.reasoning}</p>
                  </div>

                  {/* Evidence */}
                  {oc.evidence.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">
                        {language === "en" ? "Evidence Provided" : "提供的证据"}
                      </p>
                      <ul className="space-y-1">
                        {oc.evidence.map((ev, idx) => {
                          // 处理 evidence 可能是字符串或对象的情况
                          let evidenceText: string
                          if (typeof ev === 'string') {
                            evidenceText = ev
                          } else if (typeof ev === 'object' && ev !== null) {
                            // 如果是对象，格式化显示
                            if (ev.certificate_id || ev.name || ev.institution || ev.date) {
                              // 证书对象格式
                              const parts: string[] = []
                              if (ev.name) parts.push(ev.name)
                              if (ev.institution) parts.push(`(${ev.institution})`)
                              if (ev.date) parts.push(`- ${ev.date}`)
                              evidenceText = parts.length > 0 ? parts.join(' ') : JSON.stringify(ev)
                            } else {
                              // 其他对象格式，尝试提取常见字段或转换为字符串
                              evidenceText = ev.description || ev.text || ev.title || JSON.stringify(ev)
                            }
                          } else {
                            evidenceText = String(ev)
                          }
                          return (
                            <li key={idx} className="text-sm text-gray-700">
                              • {evidenceText}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Matched Keywords */}
                  {oc.matched_keywords.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">
                        {language === "en" ? "Matched Keywords" : "匹配关键词"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {oc.matched_keywords.map((keyword, idx) => {
                          // 确保 keyword 是字符串
                          const keywordText = typeof keyword === 'string' 
                            ? keyword 
                            : (typeof keyword === 'object' && keyword !== null 
                                ? (keyword.name || keyword.text || keyword.title || JSON.stringify(keyword))
                                : String(keyword))
                          return (
                            <Badge key={idx} variant="outline">
                              {keywordText}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {oc.improvement_suggestions.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-blue-700">
                        {language === "en" ? "Improvement Suggestions" : "改进建议"}
                      </p>
                      <ul className="space-y-2">
                        {oc.improvement_suggestions.map((suggestion, idx) => {
                          // 确保 suggestion 是字符串
                          const suggestionText = typeof suggestion === 'string'
                            ? suggestion
                            : (typeof suggestion === 'object' && suggestion !== null
                                ? (suggestion.description || suggestion.text || suggestion.title || JSON.stringify(suggestion))
                                : String(suggestion))
                          return (
                            <li
                              key={idx}
                              className="rounded bg-blue-50 p-2 text-sm text-blue-900"
                            >
                              {idx + 1}. {suggestionText}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
