'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface PurePDFButtonProps {
  assessmentData?: any
  className?: string
}

export function PurePDFButton({ assessmentData, className = '' }: PurePDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // 将中文转换为英文描述
  const translateToEnglish = (text: string): string => {
    if (!text) return ''
    
    const translations: { [key: string]: string } = {
      '朱恩庆': 'Zhu Enqing',
      '新奥集团': 'ENN Group',
      '智能技术负责人': 'AI Technology Lead',
      '智能技术架构师': 'AI Technology Architect',
      '智能产品研发群资深技术总监': 'Senior Technical Director of AI Product R&D',
      '数字技术': 'Digital Technology',
      '人工智能': 'Artificial Intelligence',
      '软件工程': 'Software Engineering',
      '技术创新': 'Technology Innovation',
      '强烈建议': 'Strongly Recommend',
      'Exceptional Talent': 'Exceptional Talent',
      'Global Talent Visa': 'Global Talent Visa',
      '申请人': 'Applicant',
      '完全符合': 'Fully Meets',
      '评估标准': 'Assessment Criteria',
      '竞争力': 'Competitiveness',
      '专利': 'Patents',
      '奖项': 'Awards',
      '项目': 'Projects',
      '团队': 'Team',
      '领导力': 'Leadership',
      '行业影响力': 'Industry Impact',
      '专业建议': 'Professional Advice',
      '时间线': 'Timeline',
      '预算': 'Budget',
      '最终建议': 'Final Recommendation',
      '杰出人才': 'Exceptional Talent',
      '创新贡献': 'Innovation Contribution',
      '行业背景': 'Industry Background',
      '工作经验': 'Work Experience',
      '技术专长': 'Technical Expertise',
      '教育背景': 'Education Background',
      '标准评估': 'Criteria Assessment',
      '优势': 'Strengths',
      '需要改进的领域': 'Areas for Improvement',
      '所需文档': 'Required Documents',
      '材料准备': 'Document Preparation',
      '递交后评审': 'Post-submission Review',
      '整体周期': 'Overall Timeline',
      '个月': ' months',
      '周': ' weeks',
      '年': ' years',
      'GBP': 'GBP',
      '元': ' Yuan'
    }
    
    let result = text
    Object.entries(translations).forEach(([chinese, english]) => {
      result = result.replace(new RegExp(chinese, 'g'), english)
    })
    
    return result
  }

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    
    try {
      console.log('开始生成纯PDF，评估数据:', assessmentData)
      
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
      doc.text('UK Global Talent Visa Assessment Report', margin, y)
      y += 15
      
      // 申请人信息
      if (assessmentData?.applicantInfo) {
        const info = assessmentData.applicantInfo
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        doc.text('Applicant Information', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        doc.text(`Name: ${translateToEnglish(info.name || 'N/A')}`, margin, y)
        y += 6
        doc.text(`Field: ${translateToEnglish(info.field || 'N/A')}`, margin, y)
        y += 6
        doc.text(`Current Position: ${translateToEnglish(info.currentPosition || 'N/A')}`, margin, y)
        y += 6
        doc.text(`Company: ${translateToEnglish(info.company || 'N/A')}`, margin, y)
        y += 6
        doc.text(`Years of Experience: ${info.yearsOfExperience || 'N/A'}`, margin, y)
        y += 15
      }
      
      // 总体评分
      if (assessmentData?.overallScore !== undefined) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        doc.text('Overall Assessment', margin, y)
        y += 12
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#1f2937')
        doc.text(`Overall Score: ${assessmentData.overallScore}/100`, margin, y)
        y += 10
      }
      
      // GTV路径建议
      if (assessmentData?.gtvPathway) {
        const pathway = assessmentData.gtvPathway
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        doc.text('GTV Pathway Recommendation', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        doc.text(`Recommended Route: ${pathway.recommendedRoute || 'N/A'}`, margin, y)
        y += 6
        doc.text(`Eligibility Level: ${pathway.eligibilityLevel || 'N/A'}`, margin, y)
        y += 10
      }
      
      // 标准评估
      if (assessmentData?.criteriaAssessment && Array.isArray(assessmentData.criteriaAssessment)) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        doc.text('Criteria Assessment', margin, y)
        y += 12
        
        const colWidth = contentWidth / 3
        const rowHeight = 8
        
        // 表头
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#ffffff')
        doc.setFillColor('#374151')
        doc.rect(margin, y, colWidth, rowHeight, 'F')
        doc.text('Criteria', margin + 2, y + 5)
        doc.rect(margin + colWidth, y, colWidth, rowHeight, 'F')
        doc.text('Status', margin + colWidth + 2, y + 5)
        doc.rect(margin + colWidth * 2, y, colWidth, rowHeight, 'F')
        doc.text('Score', margin + colWidth * 2 + 2, y + 5)
        y += rowHeight
        
        // 表格内容
        doc.setTextColor('#4b5563')
        doc.setFont('helvetica', 'normal')
        assessmentData.criteriaAssessment.forEach((criteria: any, index: number) => {
          const fillColor = index % 2 === 0 ? '#f9fafb' : '#ffffff'
          doc.setFillColor(fillColor)
          
          doc.rect(margin, y, colWidth, rowHeight, 'F')
          doc.text(translateToEnglish(criteria.name || 'N/A'), margin + 2, y + 5)
          doc.rect(margin + colWidth, y, colWidth, rowHeight, 'F')
          doc.text(criteria.status || 'N/A', margin + colWidth + 2, y + 5)
          doc.rect(margin + colWidth * 2, y, colWidth, rowHeight, 'F')
          doc.text(`${criteria.score || 0}/100`, margin + colWidth * 2 + 2, y + 5)
          y += rowHeight
        })
        y += 10
      }
      
      // 优势
      if (assessmentData?.strengths && Array.isArray(assessmentData.strengths)) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        doc.text('Strengths', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        assessmentData.strengths.forEach((strength: any) => {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor('#059669')
          doc.text(`• ${translateToEnglish(strength.area || 'N/A')}`, margin, y)
          y += 5
          doc.setFont('helvetica', 'normal')
          doc.setTextColor('#4b5563')
          if (strength.description) {
            const lines = doc.splitTextToSize(translateToEnglish(strength.description), contentWidth)
            lines.forEach((line: string) => {
              doc.text(line, margin + 5, y)
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
        doc.text('Professional Advice', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        assessmentData.professionalAdvice.forEach((advice: string) => {
          doc.text(`• ${translateToEnglish(advice)}`, margin, y)
          y += 5
        })
        y += 10
      }
      
      // 时间线和预算
      if (assessmentData?.timeline || assessmentData?.estimatedBudget) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        doc.text('Timeline & Budget', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        if (assessmentData.timeline) {
          doc.text(`Timeline: ${translateToEnglish(assessmentData.timeline)}`, margin, y)
          y += 6
        }
        if (assessmentData.estimatedBudget) {
          const budget = assessmentData.estimatedBudget
          doc.text(`Estimated Budget: ${budget.min || 0} - ${budget.max || 0} ${budget.currency || 'GBP'}`, margin, y)
          y += 6
        }
        y += 10
      }
      
      // 最终建议
      if (assessmentData?.recommendation) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#374151')
        doc.text('Final Recommendation', margin, y)
        y += 12
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#4b5563')
        const lines = doc.splitTextToSize(translateToEnglish(assessmentData.recommendation), contentWidth)
        lines.forEach((line: string) => {
          doc.text(line, margin, y)
          y += 5
        })
      }
      
      // 保存PDF
      const applicantName = assessmentData?.applicantInfo?.name || 'Applicant'
      const filename = `GTV-Assessment-${applicantName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      
      console.log('纯PDF生成成功:', filename)
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
