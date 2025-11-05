"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

type AssessmentProgressProps = {
  progress: number
  stage: string
  showLabel?: boolean
}

export function AssessmentProgress({ progress, stage, showLabel = true }: AssessmentProgressProps) {
  const stageLabels: Record<string, string> = {
    resume: "处理简历",
    analyzing: "深度分析",
    generating: "生成报告",
    preparing: "准备结果",
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {showLabel && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                {stageLabels[stage as keyof typeof stageLabels] || "处理中"}
              </span>
              <span className="text-xs font-medium text-gray-500">{progress}%</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-blue-400 transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>

          {/* Sub-stages */}
          <div className="flex items-center justify-between text-xs text-gray-600 mt-4">
            {["resume", "analyzing", "generating", "preparing"].map((s, index) => {
              const stages = ["resume", "analyzing", "generating", "preparing"]
              const currentIndex = stages.indexOf(stage)
              const isCompleted = index < currentIndex
              const isActive = index === currentIndex

              return (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all duration-300 ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-purple-500 text-white ring-2 ring-purple-300"
                          : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={isActive ? "font-semibold text-gray-700" : ""}>
                    {["①", "②", "③", "④"][index]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
