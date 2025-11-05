"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

interface AssessmentPDFGeneratorProps {
  pageElementId?: string
  fileName?: string
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  openInBrowser?: boolean
}

/**
 * 使用浏览器打印功能生成PDF
 * 避免任何CSS兼容性问题，样式完全一致
 */
export function AssessmentPDFGenerator({ 
  pageElementId = "assessment-results-content",
  fileName = "GTV-Assessment-Report.pdf",
  className = "",
  variant = "default",
  size = "default",
  openInBrowser = true
}: AssessmentPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    
    try {
      console.log('📄 开始生成PDF报告...')
      
      // 获取要转换的元素
      const element = document.getElementById(pageElementId)
      if (!element) {
        alert(`找不到页面元素: #${pageElementId}`)
        return
      }

      // 创建一个隐藏的iframe用于打印
      const printFrame = document.createElement('iframe')
      printFrame.style.display = 'none'
      document.body.appendChild(printFrame)

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow!.document
      
      // 获取当前页面的所有样式
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n')
          } catch {
            return ''
          }
        })
        .join('\n')

      // 构建打印文档
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${fileName}</title>
          <style>
            ${styles}
            @media print {
              body { margin: 0; padding: 20px; }
              * { page-break-inside: avoid; }
              h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
        </html>
      `

      frameDoc.write(printContent)
      frameDoc.close()

      // 等待内容加载完毕
      setTimeout(() => {
        frameDoc.defaultView!.print()
        console.log('✅ PDF生成完成，已打开打印对话框')
        
        // 清理
        setTimeout(() => {
          document.body.removeChild(printFrame)
        }, 1000)
        
        setIsGenerating(false)
      }, 500)
      
    } catch (error) {
      console.error('❌ PDF生成失败:', error)
      alert(`PDF生成失败: ${error instanceof Error ? error.message : '请重试'}`)
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      variant={variant}
      size={size}
      className={className}
      title="生成并在浏览器中查看完整的PDF评估报告"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          生成中...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          查看完整报告
        </>
      )}
    </Button>
  )
}
