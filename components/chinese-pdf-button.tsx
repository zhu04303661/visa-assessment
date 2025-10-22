'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface ChinesePDFButtonProps {
  assessmentData?: any
  className?: string
}

export function ChinesePDFButton({ assessmentData, className = '' }: ChinesePDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // 将中文字符转换为Unicode编码
  const encodeChineseText = (text: string): string => {
    if (!text) return ''
    return text.split('').map(char => {
      const code = char.charCodeAt(0)
      if (code > 127) {
        return `\\u${code.toString(16).padStart(4, '0')}`
      }
      return char
    }).join('')
  }

  // 安全地添加文本，处理中文字符
  const addText = (doc: any, text: string, x: number, y: number, options: any = {}) => {
    if (!text) return
    
    try {
      // 对于包含中文的文本，使用Unicode编码
      if (/[\u4e00-\u9fff]/.test(text)) {
        // 将中文转换为Unicode转义序列
        const encodedText = encodeChineseText(text)
        doc.text(encodedText, x, y, options)
      } else {
        // 英文和数字直接添加
        doc.text(text, x, y, options)
      }
    } catch (error) {
      console.warn('文本添加失败，使用备用方法:', error)
      // 备用方法：将中文替换为英文描述
      const fallbackText = text
        .replace(/朱恩庆/g, 'Zhu Enqing')
        .replace(/新奥集团/g, 'ENN Group')
        .replace(/智能技术负责人/g, 'AI Technology Lead')
        .replace(/智能技术架构师/g, 'AI Technology Architect')
        .replace(/数字技术/g, 'Digital Technology')
        .replace(/人工智能/g, 'Artificial Intelligence')
        .replace(/软件工程/g, 'Software Engineering')
        .replace(/技术创新/g, 'Technology Innovation')
        .replace(/强烈建议/g, 'Strongly Recommend')
        .replace(/Exceptional Talent/g, 'Exceptional Talent')
        .replace(/Global Talent Visa/g, 'Global Talent Visa')
        .replace(/申请人/g, 'Applicant')
        .replace(/完全符合/g, 'Fully Meets')
        .replace(/评估标准/g, 'Assessment Criteria')
        .replace(/竞争力/g, 'Competitiveness')
        .replace(/专利/g, 'Patents')
        .replace(/奖项/g, 'Awards')
        .replace(/项目/g, 'Projects')
        .replace(/团队/g, 'Team')
        .replace(/领导力/g, 'Leadership')
        .replace(/行业影响力/g, 'Industry Impact')
        .replace(/技术创新/g, 'Technology Innovation')
        .replace(/专业建议/g, 'Professional Advice')
        .replace(/时间线/g, 'Timeline')
        .replace(/预算/g, 'Budget')
        .replace(/最终建议/g, 'Final Recommendation')
      
      doc.text(fallbackText, x, y, options)
    }
  }

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    
    try {
      console.log('开始生成中文PDF，评估数据:', assessmentData)
      
      // 动态导入jsPDF
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF('p', 'mm', 'a4')
      
      let y = 20
      const margin = 20
      const contentWidth = 170
      
      // 标题
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#1f2937')
      addText(doc, 'UK Global Talent Visa Assessment Report', margin, y)
      y += 15
      
      // 申请人信息
      if (assessmentData?.applicantInfo) {
        const info = assessmentData.applicantInfo
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'Applicant Information', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        addText(doc, `Name: ${info.name || 'N/A'}`, margin, y)
        y += 6
        addText(doc, `Field: ${info.field || 'N/A'}`, margin, y)
        y += 6
        addText(doc, `Current Position: ${info.currentPosition || 'N/A'}`, margin, y)
        y += 6
        addText(doc, `Company: ${info.company || 'N/A'}`, margin, y)
        y += 6
        addText(doc, `Years of Experience: ${info.yearsOfExperience || 'N/A'}`, margin, y)
        y += 15
      }
      
      // 总体评分
      if (assessmentData?.overallScore !== undefined) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'Overall Assessment', margin, y)
        y += 12
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#1f2937')
        addText(doc, `Overall Score: ${assessmentData.overallScore}/100`, margin, y)
        y += 10
      }
      
      // GTV路径建议
      if (assessmentData?.gtvPathway) {
        const pathway = assessmentData.gtvPathway
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'GTV Pathway Recommendation', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        addText(doc, `Recommended Route: ${pathway.recommendedRoute || 'N/A'}`, margin, y)
        y += 6
        addText(doc, `Eligibility Level: ${pathway.eligibilityLevel || 'N/A'}`, margin, y)
        y += 10
      }
      
      // 标准评估
      if (assessmentData?.criteriaAssessment && Array.isArray(assessmentData.criteriaAssessment)) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'Criteria Assessment', margin, y)
        y += 12
        
        const colWidth = contentWidth / 3
        const rowHeight = 8
        
        // 表头
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#ffffff')
        doc.setFillColor('#374151')
        doc.rect(margin, y, colWidth, rowHeight, 'F')
        addText(doc, 'Criteria', margin + 2, y + 5)
        doc.rect(margin + colWidth, y, colWidth, rowHeight, 'F')
        addText(doc, 'Status', margin + colWidth + 2, y + 5)
        doc.rect(margin + colWidth * 2, y, colWidth, rowHeight, 'F')
        addText(doc, 'Score', margin + colWidth * 2 + 2, y + 5)
        y += rowHeight
        
        // 表格内容
        doc.setTextColor('#4b5563')
        doc.setFont('helvetica', 'normal')
        assessmentData.criteriaAssessment.forEach((criteria: any, index: number) => {
          const fillColor = index % 2 === 0 ? '#f9fafb' : '#ffffff'
          doc.setFillColor(fillColor)
          
          doc.rect(margin, y, colWidth, rowHeight, 'F')
          addText(doc, criteria.name || 'N/A', margin + 2, y + 5)
          doc.rect(margin + colWidth, y, colWidth, rowHeight, 'F')
          addText(doc, criteria.status || 'N/A', margin + colWidth + 2, y + 5)
          doc.rect(margin + colWidth * 2, y, colWidth, rowHeight, 'F')
          addText(doc, `${criteria.score || 0}/100`, margin + colWidth * 2 + 2, y + 5)
          y += rowHeight
        })
        y += 10
      }
      
      // 优势
      if (assessmentData?.strengths && Array.isArray(assessmentData.strengths)) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'Strengths', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        assessmentData.strengths.forEach((strength: any) => {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor('#059669')
          addText(doc, `• ${strength.area || 'N/A'}`, margin, y)
          y += 5
          doc.setFont('helvetica', 'normal')
          doc.setTextColor('#4b5563')
          if (strength.description) {
            const lines = doc.splitTextToSize(strength.description, contentWidth)
            lines.forEach((line: string) => {
              addText(doc, line, margin + 5, y)
              y += 5
            })
            y += 3
          }
        })
        y += 5
      }
      
      // 专业建议
      if (assessmentData?.professionalAdvice && Array.isArray(assessmentData.professionalAdvice)) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'Professional Advice', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        assessmentData.professionalAdvice.forEach((advice: string) => {
          addText(doc, `• ${advice}`, margin, y)
          y += 5
        })
        y += 10
      }
      
      // 时间线和预算
      if (assessmentData?.timeline || assessmentData?.estimatedBudget) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'Timeline & Budget', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        if (assessmentData.timeline) {
          addText(doc, `Timeline: ${assessmentData.timeline}`, margin, y)
          y += 6
        }
        if (assessmentData.estimatedBudget) {
          const budget = assessmentData.estimatedBudget
          addText(doc, `Estimated Budget: ${budget.min || 0} - ${budget.max || 0} ${budget.currency || 'GBP'}`, margin, y)
          y += 6
        }
        y += 10
      }
      
      // 最终建议
      if (assessmentData?.recommendation) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        addText(doc, 'Final Recommendation', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        const lines = doc.splitTextToSize(assessmentData.recommendation, contentWidth)
        lines.forEach((line: string) => {
          addText(doc, line, margin, y)
          y += 5
        })
      }
      
      // 保存PDF
      const applicantName = assessmentData?.applicantInfo?.name || 'Applicant'
      const filename = `GTV-Assessment-${applicantName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      
      console.log('中文PDF生成成功:', filename)
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
