'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface Html2CanvasPDFButtonProps {
  assessmentData?: any
  className?: string
}

export function Html2CanvasPDFButton({ assessmentData, className = '' }: Html2CanvasPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    
    try {
      console.log('开始生成HTML2Canvas PDF，评估数据:', assessmentData)
      
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
      
      // 使用html2canvas截取页面
      const canvas = await html2canvas.default(element, {
        scale: 2, // 提高清晰度
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        // 忽略不支持的CSS属性
        ignoreElements: (element) => {
          // 忽略可能包含不支持的CSS的元素
          return element.classList?.contains('ignore-pdf') || false
        },
        // 处理CSS兼容性
        onclone: (clonedDoc) => {
          // 移除可能包含oklch颜色的样式
          const styleSheets = clonedDoc.styleSheets
          for (let i = 0; i < styleSheets.length; i++) {
            try {
              const sheet = styleSheets[i]
              if (sheet.cssRules) {
                for (let j = 0; j < sheet.cssRules.length; j++) {
                  const rule = sheet.cssRules[j]
                  if (rule.type === CSSRule.STYLE_RULE) {
                    const styleRule = rule as CSSStyleRule
                    if (styleRule.style.cssText.includes('oklch')) {
                      // 替换oklch颜色为兼容的颜色
                      styleRule.style.cssText = styleRule.style.cssText
                        .replace(/oklch\([^)]+\)/g, '#6b7280') // 替换为灰色
                        .replace(/hsl\([^)]+\)/g, '#6b7280') // 替换hsl为灰色
                        .replace(/var\(--[^)]+\)/g, '#6b7280') // 替换CSS变量为灰色
                    }
                  }
                }
              }
            } catch (e) {
              // 忽略跨域样式表错误
              console.warn('无法访问样式表:', e)
            }
          }
        }
      })
      
      console.log('页面截取完成，开始生成PDF...')
      
      // 创建PDF
      const imgData = canvas.toDataURL('image/png', 0.98)
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
      
      console.log('HTML2Canvas PDF生成成功:', filename)
      alert('PDF报告已生成并下载！')
      
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
