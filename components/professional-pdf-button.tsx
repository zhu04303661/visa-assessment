"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

interface ProfessionalPDFButtonProps {
  assessmentData?: any
  assessmentId?: string
  markdownFilePath?: string  // 保留向后兼容
  pdfFilePath?: string       // 新增：已生成的PDF文件路径
  pdfFilename?: string       // 新增：已生成的PDF文件名
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ProfessionalPDFButton({ 
  assessmentData, 
  assessmentId,
  markdownFilePath,
  pdfFilePath,
  pdfFilename,
  className = '',
  variant = 'default',
  size = 'default'
}: ProfessionalPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002').replace(/\/$/, '')

  const handleDownloadPDF = async () => {
    // 如果已有生成的PDF文件，直接下载
    if (pdfFilename) {
      console.log('直接下载已生成的PDF文件:', pdfFilename)
      try {
        const downloadUrl = `${API_BASE}/api/resume/download-pdf/${pdfFilename}`
        
        // 创建隐藏的下载链接
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = pdfFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        alert('PDF报告下载成功！')
        return
      } catch (error) {
        console.error('PDF下载失败:', error)
        alert('PDF下载失败，请重试')
        return
      }
    }

    // 如果没有已生成的PDF，则生成新的PDF
    if (!assessmentData && !assessmentId && !markdownFilePath) {
      alert('没有评估数据、评估ID或Markdown文件路径，无法生成PDF报告')
      return
    }

    setIsGenerating(true)
    
    try {
      console.log('开始生成专业PDF报告...', { assessmentData, assessmentId, markdownFilePath })
      
      // 准备请求数据
      const requestData: any = {}
      if (assessmentData) {
        requestData.assessmentData = assessmentData
      }
      if (assessmentId) {
        requestData.assessment_id = assessmentId
      }
      if (markdownFilePath) {
        requestData.markdown_filepath = markdownFilePath
      }
      
      // 调用后台Python服务生成PDF
      const response = await fetch(`${API_BASE}/api/resume/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'PDF生成失败')
      }

      const result = await response.json()
      console.log('PDF生成成功:', result)

      // 下载生成的PDF文件
      if (result.success && result.file_name) {
        const downloadUrl = `${API_BASE}/api/resume/download-pdf/${result.file_name}`
        
        // 创建隐藏的下载链接
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = result.file_name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        alert('专业PDF报告已生成并下载！')
      } else {
        throw new Error('PDF生成响应格式错误')
      }
      
    } catch (error) {
      console.error('PDF生成失败:', error)
      const errorMessage = error instanceof Error ? error.message : '请重试'
      alert(`PDF生成失败: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
        <Button
          onClick={handleDownloadPDF}
          disabled={isGenerating || (!pdfFilename && !assessmentData && !assessmentId && !markdownFilePath)}
          variant={variant}
          size={size}
          className={`${className} ${isGenerating ? 'cursor-not-allowed' : ''}`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {pdfFilename ? '下载PDF报告' : '下载专业报告'}
            </>
          )}
        </Button>
      )
}

// 专门用于评估结果页面的PDF下载按钮
export function AssessmentProfessionalPDFButton({ 
  assessmentData, 
  assessmentId,
  markdownFilePath,
  pdfFilePath,
  pdfFilename,
  className = '' 
}: { 
  assessmentData: any
  assessmentId?: string
  markdownFilePath?: string
  pdfFilePath?: string
  pdfFilename?: string
  className?: string 
}) {
  return (
    <ProfessionalPDFButton
      assessmentData={assessmentData}
      assessmentId={assessmentId}
      markdownFilePath={markdownFilePath}
      pdfFilePath={pdfFilePath}
      pdfFilename={pdfFilename}
      className={className}
      variant="default"
      size="lg"
    />
  )
}
