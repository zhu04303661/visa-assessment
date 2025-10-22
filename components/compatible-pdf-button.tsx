'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface CompatiblePDFButtonProps {
  assessmentData?: any
  className?: string
}

export function CompatiblePDFButton({ assessmentData, className = '' }: CompatiblePDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    
    try {
      console.log('开始生成兼容性PDF，评估数据:', assessmentData)
      
      // 动态导入html2canvas和jsPDF
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])
      
      // 获取评估结果元素
      const element = document.getElementById('assessment-results')
      if (!element) {
        throw new Error('未找到评估结果元素，请确保页面已完全加载')
      }
      
      console.log('开始截取页面...')
      
      // 创建一个临时的简化版本用于PDF生成
      const tempElement = element.cloneNode(true) as HTMLElement
      
      // 移除可能导致问题的元素和样式
      const problematicElements = tempElement.querySelectorAll('[style*="oklch"], [style*="hsl"], [style*="var(--"]')
      problematicElements.forEach(el => {
        const htmlEl = el as HTMLElement
        htmlEl.style.color = '#333333'
        htmlEl.style.backgroundColor = '#ffffff'
        htmlEl.style.borderColor = '#cccccc'
      })
      
      // 添加临时元素到页面（隐藏）
      tempElement.style.position = 'absolute'
      tempElement.style.left = '-9999px'
      tempElement.style.top = '-9999px'
      tempElement.style.width = '800px'
      tempElement.style.backgroundColor = '#ffffff'
      tempElement.style.color = '#333333'
      tempElement.style.fontFamily = 'Arial, sans-serif'
      tempElement.style.fontSize = '14px'
      tempElement.style.lineHeight = '1.5'
      
      document.body.appendChild(tempElement)
      
      try {
        // 使用html2canvas截取页面，使用最兼容的配置
        const canvas = await html2canvas.default(tempElement, {
          scale: 1.5, // 适中的清晰度
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 800,
          height: tempElement.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          // 使用最兼容的配置
          foreignObjectRendering: false,
          removeContainer: true,
          imageTimeout: 0,
          // 忽略可能有问题的元素
          ignoreElements: (element) => {
            const el = element as HTMLElement
            return (
              el.tagName === 'SCRIPT' ||
              el.tagName === 'STYLE' ||
              el.classList?.contains('ignore-pdf') ||
              el.style?.display === 'none' ||
              false
            )
          }
        })
        
        console.log('页面截取完成，开始生成PDF...')
        
        // 创建PDF
        const imgData = canvas.toDataURL('image/png', 0.9)
        const pdf = new jsPDF('p', 'mm', 'a4')
        
        // 计算图片尺寸以适应A4页面
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()
        const imgWidth = canvas.width
        const imgHeight = canvas.height
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
        const imgX = (pdfWidth - imgWidth * ratio) / 2
        const imgY = 0
        
        // 添加图片到PDF
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
        
        // 保存PDF
        const applicantName = assessmentData?.applicantInfo?.name || 'Applicant'
        const filename = `GTV-Assessment-${applicantName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
        pdf.save(filename)
        
        console.log('兼容性PDF生成成功:', filename)
        alert('PDF报告已生成并下载！')
        
      } finally {
        // 清理临时元素
        document.body.removeChild(tempElement)
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
