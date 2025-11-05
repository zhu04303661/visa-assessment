"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Brain, CheckCircle2, Sparkles } from "lucide-react"

type LoadingStage = "resume" | "analyzing" | "generating" | "preparing"

const stageConfig = {
  resume: {
    label: "上传简历",
    message: "正在处理您的简历...",
    icon: "📄",
  },
  analyzing: {
    label: "分析中",
    message: "AI正在深度分析您的资料...",
    icon: "🔍",
  },
  generating: {
    label: "生成评估",
    message: "正在生成个性化评估报告...",
    icon: "✨",
  },
  preparing: {
    label: "准备结果",
    message: "正在准备展示您的评估结果...",
    icon: "🎯",
  },
}

type AssessmentLoadingProps = {
  isOpen: boolean
  stage?: LoadingStage
}

export function AssessmentLoading({ isOpen, stage = "analyzing" }: AssessmentLoadingProps) {
  const [displayedDots, setDisplayedDots] = useState(1)
  const [completedStages, setCompletedStages] = useState<LoadingStage[]>([])
  const stages: LoadingStage[] = ["resume", "analyzing", "generating", "preparing"]

  // 模拟进度
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedDots((prev) => (prev >= 3 ? 1 : prev + 1))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // 更新已完成的阶段
  useEffect(() => {
    const currentStageIndex = stages.indexOf(stage)
    if (currentStageIndex >= 0) {
      setCompletedStages(stages.slice(0, currentStageIndex))
    }
  }, [stage])

  if (!isOpen) return null

  const currentConfig = stageConfig[stage]
  const dots = "".padEnd(displayedDots, ".")

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="pt-8 pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
              <h2 className="text-lg font-semibold text-gray-900">智能评估进行中</h2>
              <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
            </div>
            <p className="text-sm text-gray-500">
              正在为您生成详细的签证潜力评估
            </p>
          </div>

          {/* Main Animation */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-20 h-20 mb-4">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-300 animate-spin"></div>
              {/* Middle pulsing ring */}
              <div className="absolute inset-2 rounded-full border-2 border-purple-200 animate-pulse"></div>
              {/* Brain icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-8 w-8 text-purple-600 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {currentConfig.message}
              <span className="inline-block w-6 text-left">{dots}</span>
            </p>
          </div>

          {/* Progress Stages */}
          <div className="space-y-3 mb-8">
            {stages.map((stageKey, index) => {
              const isCompleted = completedStages.includes(stageKey)
              const isActive = stage === stageKey
              const config = stageConfig[stageKey]

              return (
                <div
                  key={stageKey}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-purple-50 border border-purple-200"
                      : isCompleted
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isActive ? (
                      <div className="h-5 w-5 rounded-full border-2 border-purple-600 border-t-transparent animate-spin"></div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-purple-700"
                          : isCompleted
                            ? "text-green-700"
                            : "text-gray-500"
                      }`}
                    >
                      {config.label}
                    </p>
                  </div>
                  <div className="text-lg">{config.icon}</div>
                </div>
              )
            })}
          </div>

          {/* Tips Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-700 font-medium mb-2">💡 小贴士</p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• 评估通常需要 30-60 秒</li>
              <li>• 请勿关闭窗口</li>
              <li>• 网络较慢时可能需要更长时间</li>
            </ul>
          </div>

          {/* Estimated Time */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              预计等待时间: <span className="font-semibold text-gray-700">约 1 分钟</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
