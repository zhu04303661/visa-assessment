"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Zap, TrendingUp, AlertCircle } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface ScoringItem {
  name: string
  value: any
  score: number
  maxScore: number
  percentage: number
  criteria: string
  reasoning: string
  improvement: string
}

interface ScoringDimension {
  name: string
  totalScore: number
  maxScore: number
  percentage: number
  items: ScoringItem[]
}

interface ScoringDetailsCardProps {
  dimension: ScoringDimension
  dimensionKey: string
}

export function ScoringDetailsCard({ dimension, dimensionKey }: ScoringDetailsCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const { t } = useLanguage()

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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500"
    if (percentage >= 70) return "bg-blue-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
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
            <Progress 
              value={dimension.percentage} 
              className="mt-2 h-2 w-32"
            />
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
interface AllScoringDetailsProps {
  scoringSummary: {
    dimensions: {
      [key: string]: ScoringDimension
    }
  }
}

export function AllScoringDetails({ scoringSummary }: AllScoringDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 详细评分明细</h2>
        <p className="text-muted-foreground mb-6">
          点击每一项查看详细的评分标准、判定逻辑和改进建议
        </p>
      </div>

      {Object.entries(scoringSummary.dimensions).map(([key, dimension]) => (
        <ScoringDetailsCard key={key} dimension={dimension} dimensionKey={key} />
      ))}
    </div>
  )
}
