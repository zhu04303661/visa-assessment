'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2 } from 'lucide-react'
import { generateStructuredPDFReport, generatePDFFromElement } from '@/lib/pdf-generator'

interface PDFDownloadButtonProps {
  assessmentData?: any
  targetElementId?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function PDFDownloadButton({
  assessmentData,
  targetElementId = 'assessment-results',
  className = '',
  variant = 'default',
  size = 'default'
}: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    
    try {
      if (assessmentData) {
        // 使用结构化数据生成PDF
        console.log('开始生成结构化PDF报告...', assessmentData)
        generateStructuredPDFReport(assessmentData)
        console.log('PDF报告生成成功')
        alert('PDF报告已生成并下载')
      } else {
        // 从页面元素生成PDF
        const element = document.getElementById(targetElementId)
        if (!element) {
          throw new Error('未找到目标元素，请确保页面已完全加载')
        }
        
        console.log('开始生成页面截图PDF...')
        await generatePDFFromElement(element, {
          filename: 'GTV-Assessment-Report.pdf',
          quality: 0.98,
          scale: 2
        })
        console.log('页面截图PDF生成成功')
        alert('PDF报告已生成并下载')
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
      disabled={isGenerating}
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
          下载报告
        </>
      )}
    </Button>
  )
}

// 专门用于评估结果页面的PDF下载按钮
export function AssessmentPDFDownloadButton({ 
  assessmentData, 
  className = '' 
}: { 
  assessmentData: any
  className?: string 
}) {
  return (
    <PDFDownloadButton
      assessmentData={assessmentData}
      className={`bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
      variant="default"
      size="lg"
    />
  )
}

// 用于页面截图的PDF下载按钮
export function PagePDFDownloadButton({ 
  targetElementId = 'assessment-results',
  className = '' 
}: { 
  targetElementId?: string
  className?: string 
}) {
  return (
    <PDFDownloadButton
      targetElementId={targetElementId}
      className={`border border-primary text-primary hover:bg-primary hover:text-primary-foreground ${className}`}
      variant="outline"
      size="lg"
    />
  )
}
