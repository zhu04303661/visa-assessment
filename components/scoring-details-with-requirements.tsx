"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface OfficialRequirement {
  level: string              // 要求级别 (e.g., "最低", "推荐", "理想")
  description: string        // 要求描述
  examples: string[]         // 具体例子
}

interface DeviationAnalysis {
  gap: number               // 偏差程度 (0-100, 100=完全匹配)
  type: "exceed" | "meet" | "gap"  // 超出/满足/不足
  distance: string          // 距离描述 (e.g., "差1分")
  improvementSteps: string[] // 改进步骤
}

interface EnhancedScoringItem {
  name: string
  value: any
  score: number
  maxScore: number
  percentage: number
  criteria: string
  reasoning: string
  improvement: string
  // 新增字段
  officialRequirement: OfficialRequirement
  deviationAnalysis: DeviationAnalysis
}

interface EnhancedScoringDimension {
  name: string
  totalScore: number
  maxScore: number
  percentage: number
  items: EnhancedScoringItem[]
}

interface EnhancedScoringDetailsCardProps {
  dimension: EnhancedScoringDimension
  dimensionKey: string
}

export function EnhancedScoringDetailsCard({ dimension }: EnhancedScoringDetailsCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100 text-green-800"
    if (percentage >= 70) return "bg-blue-100 text-blue-800"
    if (percentage >= 50) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getDimensionColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600"
    if (percentage >= 70) return "text-blue-600"
    if (percentage >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getDeviationColor = (type: string) => {
    switch (type) {
      case "exceed":
        return "bg-green-50 border-green-200"
      case "meet":
        return "bg-blue-50 border-blue-200"
      case "gap":
        return "bg-orange-50 border-orange-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getDeviationIcon = (type: string) => {
    switch (type) {
      case "exceed":
        return "✅"
      case "meet":
        return "✓"
      case "gap":
        return "⚠️"
      default:
        return "ℹ️"
    }
  }

  const getDeviationLabel = (type: string, gap: number) => {
    switch (type) {
      case "exceed":
        return "超出要求"
      case "meet":
        return "符合要求"
      case "gap":
        return `不符合 (差${100 - gap}%)`
      default:
        return "待评估"
    }
  }

  return (
    <Card className="mb-6 border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{dimension.name}</CardTitle>
            <CardDescription>
              {dimension.totalScore} / {dimension.maxScore} 分
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getDimensionColor(dimension.percentage)}`}>
              {dimension.percentage}%
            </div>
            <Progress value={dimension.percentage} className="mt-2 h-2 w-32" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {dimension.items.map((item, index) => (
          <div
            key={index}
            className="border rounded-lg overflow-hidden bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            {/* Item Header */}
            <button
              onClick={() => toggleExpand(index)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-200 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-1">
                  <h4 className="font-semibold text-left">{item.name}</h4>
                  <p className="text-sm text-muted-foreground text-left">
                    {typeof item.value === "string" ? item.value : `${item.value}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={getScoreBadgeColor(item.percentage)}>
                  {item.score}/{item.maxScore}
                </Badge>
                <div className="text-right min-w-[60px]">
                  <div className="font-bold">{item.percentage}%</div>
                </div>
                {expandedItems.has(index) ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </button>

            {/* Item Details - Expandable */}
            {expandedItems.has(index) && (
              <div className="border-t px-4 py-4 space-y-4 bg-white">
                {/* Official Requirement */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-base">📜</span>
                    官方要求依据
                  </h5>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {item.officialRequirement.level}
                      </p>
                      <p className="text-sm text-blue-800 mt-1">
                        {item.officialRequirement.description}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-700 mb-1">具体例子：</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {item.officialRequirement.examples.map((example, i) => (
                          <li key={i}>• {example}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Deviation Analysis */}
                <div className={`p-3 border rounded-lg ${getDeviationColor(item.deviationAnalysis.type)}`}>
                  <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-base">{getDeviationIcon(item.deviationAnalysis.type)}</span>
                    偏差分析
                  </h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">符合度</span>
                      <span className="text-sm font-semibold">{item.deviationAnalysis.gap}%</span>
                    </div>
                    <Progress value={item.deviationAnalysis.gap} className="h-2" />
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span>状态</span>
                      <Badge variant="outline">
                        {getDeviationLabel(item.deviationAnalysis.type, item.deviationAnalysis.gap)}
                      </Badge>
                    </div>
                    {item.deviationAnalysis.type === "gap" && (
                      <div className="mt-3 p-2 bg-white rounded border">
                        <p className="text-xs font-medium text-orange-900 mb-2">差距说明：</p>
                        <p className="text-xs text-orange-800">
                          {item.deviationAnalysis.distance}
                        </p>
                        <p className="text-xs font-medium text-orange-900 mt-2 mb-1">改进步骤：</p>
                        <ol className="text-xs text-orange-800 space-y-1">
                          {item.deviationAnalysis.improvementSteps.map((step, i) => (
                            <li key={i}>{i + 1}. {step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>

                {/* Criteria */}
                <div>
                  <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-base">📋</span>
                    评分标准
                  </h5>
                  <div className="bg-slate-50 p-3 rounded text-sm whitespace-pre-line font-mono">
                    {item.criteria}
                  </div>
                </div>

                {/* Reasoning */}
                <div>
                  <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-base">💡</span>
                    判定逻辑
                  </h5>
                  <div className="bg-blue-50 p-3 rounded text-sm whitespace-pre-line">
                    {item.reasoning}
                  </div>
                </div>

                {/* Improvement */}
                <div>
                  <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-base">📈</span>
                    改进建议
                  </h5>
                  <div
                    className={`p-3 rounded text-sm whitespace-pre-line ${
                      item.improvement.includes("已达到最高水平")
                        ? "bg-green-50"
                        : "bg-yellow-50"
                    }`}
                  >
                    {item.improvement}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Dimension Summary */}
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm">
            <strong>维度总体评分：</strong> {dimension.totalScore}/{dimension.maxScore} ({dimension.percentage}%)
          </p>
          {dimension.percentage === 100 && (
            <p className="text-sm text-green-600 mt-2">✨ 该维度已达到最高水平！</p>
          )}
          {dimension.percentage >= 80 && dimension.percentage < 100 && (
            <p className="text-sm text-blue-600 mt-2">🎯 该维度表现优秀，继续保持！</p>
          )}
          {dimension.percentage >= 60 && dimension.percentage < 80 && (
            <p className="text-sm text-yellow-600 mt-2">⚠️ 该维度还有提升空间，重点关注低分项。</p>
          )}
          {dimension.percentage < 60 && (
            <p className="text-sm text-red-600 mt-2">
              ❌ 该维度需要显著提升，建议制定改进计划。
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 导出用于汇总所有维度的组件
interface AllEnhancedScoringDetailsProps {
  scoringSummary: {
    dimensions: {
      [key: string]: EnhancedScoringDimension
    }
  }
}

export function AllEnhancedScoringDetails({ scoringSummary }: AllEnhancedScoringDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 详细评分明细（含官方要求对标）</h2>
        <p className="text-muted-foreground mb-6">
          每一项都显示了GTV官方要求、当前材料与官方要求的符合度、以及改进方向
        </p>
      </div>

      {Object.entries(scoringSummary.dimensions).map(([key, dimension]) => (
        <EnhancedScoringDetailsCard key={key} dimension={dimension} dimensionKey={key} />
      ))}
    </div>
  )
}
