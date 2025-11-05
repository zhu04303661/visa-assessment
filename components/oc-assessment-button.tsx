"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { OCAssessmentDisplay } from "@/components/oc-assessment-display"

interface OCAssessmentButtonProps {
  applicantData?: Record<string, any>
  assessmentData?: Record<string, any>
  onAssessmentComplete?: (results: any) => void
}

export function OCAssessmentButton({
  applicantData,
  assessmentData,
  onAssessmentComplete,
}: OCAssessmentButtonProps) {
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)

  const handleOCAssessment = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      console.log("📊 开始 OC 评估...")

      const response = await fetch("/api/assessment/oc-evaluation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicantData: applicantData || {},
          assessmentData: assessmentData || {},
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`OC 评估失败: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      console.log("✅ OC 评估完成:", data)

      if (!data.success) {
        throw new Error(data.error || "OC 评估失败")
      }

      setResults(data)
      setShowResults(true)
      onAssessmentComplete?.(data)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred"
      console.error("❌ OC 评估出错:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true)
          handleOCAssessment()
        }}
        disabled={isLoading}
        variant="default"
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {language === "en" ? "Assessing..." : "评估中..."}
          </>
        ) : (
          language === "en" ? "Run OC Assessment" : "运行 OC 评估"
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === "en" ? "OC Assessment Results" : "OC 评估结果"}
            </DialogTitle>
            <DialogDescription>
              {language === "en"
                ? "Organizational Capability Assessment"
                : "组织能力评估"}
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3">
                {language === "en" ? "Loading..." : "加载中..."}
              </span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showResults && results && (
            <div className="space-y-4">
              <OCAssessmentDisplay
                ocAssessment={results}
                language={language}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
