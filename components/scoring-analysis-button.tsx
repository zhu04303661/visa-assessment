"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BarChart3, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface ScoringAnalysisButtonProps {
  data: any
  onOpen: () => void
  onClose: () => void
  isOpen: boolean
  setScoringDetails: (data: any) => void
  isLoading?: boolean
  setIsLoading?: (loading: boolean) => void
  className?: string
}

export function ScoringAnalysisButton({
  data,
  onOpen,
  onClose,
  isOpen,
  setScoringDetails,
  isLoading: externalIsLoading = false,
  setIsLoading: externalSetIsLoading,
  className = ""
}: ScoringAnalysisButtonProps) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const actualIsLoading = externalIsLoading || isLoading

  const handleClick = async () => {
    if (!data) {
      setError("评估数据不可用")
      return
    }

    setIsLoading(true)
    externalSetIsLoading?.(true)
    setError(null)
    setSuccess(false)
    onOpen()

    try {
      console.log("🚀 开始调用评分分析API...")
      console.log("📊 评估数据:", data)

      // 构建申请人背景信息
      const background = {
        name: data?.applicantInfo?.name || "Unknown",
        education: data?.educationBackground || {},
        experience: data?.workExperience || {},
        technical: data?.technicalExpertise || {},
        industry: data?.industryBackground || {},
      }

      console.log("👤 申请人背景:", background)

      const response = await fetch("/api/scoring/analyze-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentData: data,
          applicantBackground: background,
        }),
      })

      console.log(`📡 API响应状态: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API错误:", errorText)
        throw new Error(
          `API 请求失败: ${response.status} ${response.statusText}\n${errorText}`
        )
      }

      const results = await response.json()
      console.log("✅ 评分分析完成!", results)

      setScoringDetails(results)
      setSuccess(true)

      // 3秒后隐藏成功提示
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知错误"
      console.error("❌ 评分分析失败:", errorMsg)
      setError(errorMsg)
      onClose()
    } finally {
      setIsLoading(false)
      externalSetIsLoading?.(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleClick}
        disabled={actualIsLoading || !data}
        variant="outline"
        className={`gap-2 ${className}`}
        title={
          language === "en"
            ? "Click to launch detailed scoring analysis"
            : "点击启动详细评分分析"
        }
      >
        {actualIsLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {language === "en" ? "Analyzing..." : "分析中..."}
          </>
        ) : (
          <>
            <BarChart3 className="h-4 w-4" />
            {language === "en"
              ? "Detailed Scoring Analysis"
              : "详细评分分析"}
          </>
        )}
      </Button>

      {/* 成功提示 */}
      {success && (
        <div className="flex gap-2 items-center p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm animate-in fade-in duration-300">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>
            {language === "en"
              ? "Analysis completed successfully!"
              : "评分分析完成！"}
          </span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex gap-2 items-start p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm animate-in fade-in duration-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {language === "en" ? "Analysis Failed" : "分析失败"}
            </p>
            <p className="text-xs mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
