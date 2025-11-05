"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { PDFService } from "@/lib/pdf-service"

interface AssessmentPDFButtonProps {
  assessmentData: any
  assessmentId?: string
  applicantName?: string
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * 评估报告PDF下载按钮
 * 使用后端服务生成PDF，确保后台留下记录并提升前台性能
 */
export function AssessmentPDFButton({ 
  assessmentData, 
  assessmentId,
  applicantName = "Applicant",
  className = "",
  variant = "default",
  size = "default"
}: AssessmentPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    if (!assessmentData) {
      alert('没有可用的评估数据')
      return
    }

    setIsGenerating(true)
    
    try {
      console.log('🚀 开始生成PDF报告...')
      
      // 调用后端服务生成PDF
      await PDFService.generateAndDownloadPDF(
        assessmentData,
        `GTV-Assessment-${applicantName}-${new Date().toISOString().split('T')[0]}.pdf`,
        assessmentId
      )
      
      console.log('✅ PDF报告生成并下载成功')
    } catch (error) {
      console.error('❌ PDF生成失败:', error)
      const errorMessage = error instanceof Error ? error.message : '生成失败'
      alert(`PDF生成失败: ${errorMessage}\n\n请检查网络连接或重试。`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating || !assessmentData}
      variant={variant}
      size={size}
      className={className}
      title={!assessmentData ? "没有可用的评估数据" : "生成并下载完整的PDF评估报告"}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          生成中...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          下载PDF报告
        </>
      )}
    </Button>
  )
}
