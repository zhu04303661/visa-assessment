import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PDFOptions {
  filename?: string
  quality?: number
  scale?: number
}

export class PDFGenerator {
  private doc: jsPDF
  private currentY: number = 20
  private pageHeight: number = 280
  private margin: number = 20
  private contentWidth: number = 170

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.setupFonts()
  }

  private setupFonts() {
    // 设置中文字体支持
    this.doc.setFont('helvetica')
  }

  // 添加标题
  addTitle(text: string, size: number = 18, color: string = '#1f2937') {
    this.checkPageBreak(15)
    this.doc.setFontSize(size)
    this.doc.setTextColor(color)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += 15
    this.addLine()
  }

  // 添加副标题
  addSubtitle(text: string, size: number = 14, color: string = '#374151') {
    this.checkPageBreak(12)
    this.doc.setFontSize(size)
    this.doc.setTextColor(color)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += 12
  }

  // 添加段落
  addParagraph(text: string, size: number = 10, color: string = '#4b5563') {
    this.checkPageBreak(8)
    this.doc.setFontSize(size)
    this.doc.setTextColor(color)
    this.doc.setFont('helvetica', 'normal')
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth)
    this.doc.text(lines, this.margin, this.currentY)
    this.currentY += lines.length * 5 + 3
  }

  // 添加列表项
  addListItem(text: string, size: number = 10, color: string = '#4b5563') {
    this.checkPageBreak(6)
    this.doc.setFontSize(size)
    this.doc.setTextColor(color)
    this.doc.setFont('helvetica', 'normal')
    
    const lines = this.doc.splitTextToSize(`• ${text}`, this.contentWidth)
    this.doc.text(lines, this.margin, this.currentY)
    this.currentY += lines.length * 5 + 2
  }

  // 添加评分条
  addScoreBar(label: string, score: number, maxScore: number = 100) {
    this.checkPageBreak(15)
    
    // 标签
    this.doc.setFontSize(10)
    this.doc.setTextColor('#374151')
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(label, this.margin, this.currentY)
    
    // 分数
    const scoreText = `${score}/${maxScore}`
    const scoreWidth = this.doc.getTextWidth(scoreText)
    this.doc.text(scoreText, this.margin + this.contentWidth - scoreWidth, this.currentY)
    
    this.currentY += 5
    
    // 进度条背景
    const barWidth = this.contentWidth - scoreWidth - 5
    const barHeight = 4
    this.doc.setFillColor('#e5e7eb')
    this.doc.rect(this.margin, this.currentY, barWidth, barHeight, 'F')
    
    // 进度条填充
    const fillWidth = (score / maxScore) * barWidth
    const fillColor = this.getScoreColor(score, maxScore)
    this.doc.setFillColor(fillColor)
    this.doc.rect(this.margin, this.currentY, fillWidth, barHeight, 'F')
    
    this.currentY += 10
  }

  // 添加表格
  addTable(headers: string[], rows: string[][]) {
    this.checkPageBreak(20)
    
    const colWidth = this.contentWidth / headers.length
    const rowHeight = 8
    
    // 表头
    this.doc.setFontSize(10)
    this.doc.setTextColor('#ffffff')
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFillColor('#374151')
    
    headers.forEach((header, index) => {
      const x = this.margin + index * colWidth
      this.doc.rect(x, this.currentY, colWidth, rowHeight, 'F')
      this.doc.text(header, x + 2, this.currentY + 5)
    })
    
    this.currentY += rowHeight
    
    // 表格内容
    this.doc.setTextColor('#4b5563')
    this.doc.setFont('helvetica', 'normal')
    
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight)
      
      const fillColor = rowIndex % 2 === 0 ? '#f9fafb' : '#ffffff'
      this.doc.setFillColor(fillColor)
      
      row.forEach((cell, colIndex) => {
        const x = this.margin + colIndex * colWidth
        this.doc.rect(x, this.currentY, colWidth, rowHeight, 'F')
        this.doc.text(cell, x + 2, this.currentY + 5)
      })
      
      this.currentY += rowHeight
    })
    
    this.currentY += 5
  }

  // 添加分隔线
  addLine() {
    this.doc.setDrawColor('#e5e7eb')
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 5
  }

  // 添加空间
  addSpace(height: number = 5) {
    this.currentY += height
  }

  // 检查是否需要换页
  private checkPageBreak(requiredHeight: number) {
    if (this.currentY + requiredHeight > this.pageHeight) {
      this.doc.addPage()
      this.currentY = 20
    }
  }

  // 获取评分颜色
  private getScoreColor(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return '#10b981' // 绿色
    if (percentage >= 60) return '#f59e0b' // 黄色
    return '#ef4444' // 红色
  }

  // 生成PDF
  generate(filename: string = 'gtv-assessment-report.pdf') {
    this.doc.save(filename)
  }

  // 获取PDF数据URL
  getDataURL(): string {
    return this.doc.output('dataurlstring')
  }
}

// 从HTML元素生成PDF
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const { filename = 'gtv-assessment-report.pdf', quality = 0.98, scale = 2 } = options

  try {
    // 使用html2canvas将HTML转换为canvas
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight
    })

    // 创建PDF
    const imgData = canvas.toDataURL('image/png', quality)
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
    pdf.save(filename)
  } catch (error) {
    console.error('PDF生成失败:', error)
    throw new Error('PDF生成失败，请重试')
  }
}

// 生成结构化PDF报告
export function generateStructuredPDFReport(assessmentData: any): void {
  console.log('PDF生成器开始工作，评估数据:', assessmentData)
  
  try {
    const generator = new PDFGenerator()
    
    // 标题页
    generator.addTitle('UK Global Talent Visa Assessment Report', 20, '#1f2937')
    generator.addSpace(10)
  
  // 申请人信息
  const applicantInfo = assessmentData.applicantInfo
  generator.addSubtitle('Applicant Information', 14, '#374151')
  generator.addParagraph(`Name: ${applicantInfo.name}`, 12, '#1f2937')
  generator.addParagraph(`Field: ${applicantInfo.field}`, 12, '#1f2937')
  generator.addParagraph(`Current Position: ${applicantInfo.currentPosition}`, 12, '#1f2937')
  generator.addParagraph(`Company: ${applicantInfo.company}`, 12, '#1f2937')
  generator.addParagraph(`Years of Experience: ${applicantInfo.yearsOfExperience}`, 12, '#1f2937')
  generator.addSpace(10)
  
  // 总体评分
  generator.addSubtitle('Overall Assessment', 14, '#374151')
  generator.addScoreBar('Overall Score', assessmentData.overallScore, 100)
  generator.addSpace(5)
  
  // GTV路径建议
  const gtvPathway = assessmentData.gtvPathway
  generator.addSubtitle('GTV Pathway Recommendation', 14, '#374151')
  generator.addParagraph(`Recommended Route: ${gtvPathway.recommendedRoute}`, 12, '#1f2937')
  generator.addParagraph(`Eligibility Level: ${gtvPathway.eligibilityLevel}`, 12, '#1f2937')
  generator.addParagraph(`Analysis: ${gtvPathway.analysis}`, 10, '#4b5563')
  generator.addSpace(10)
  
  // 标准评估
  generator.addSubtitle('Criteria Assessment', 14, '#374151')
  const criteriaTable = assessmentData.criteriaAssessment.map((criteria: any) => [
    criteria.name,
    criteria.status,
    `${criteria.score}/100`,
    criteria.evidence
  ])
  generator.addTable(['Criteria', 'Status', 'Score', 'Evidence'], criteriaTable)
  generator.addSpace(10)
  
  // 优势
  generator.addSubtitle('Strengths', 14, '#374151')
  assessmentData.strengths.forEach((strength: any) => {
    generator.addSubtitle(strength.area, 12, '#059669')
    generator.addParagraph(strength.description, 10, '#4b5563')
    generator.addParagraph(`Evidence: ${strength.evidence}`, 9, '#6b7280')
    generator.addSpace(5)
  })
  
  // 需要改进的领域
  generator.addSubtitle('Areas for Improvement', 14, '#374151')
  assessmentData.weaknesses.forEach((weakness: any) => {
    generator.addSubtitle(weakness.area, 12, '#dc2626')
    generator.addParagraph(weakness.description, 10, '#4b5563')
    generator.addParagraph(`Improvement: ${weakness.improvement}`, 9, '#6b7280')
    generator.addParagraph(`Priority: ${weakness.priority}`, 9, '#6b7280')
    generator.addSpace(5)
  })
  
  // 专业建议
  generator.addSubtitle('Professional Advice', 14, '#374151')
  assessmentData.professionalAdvice.forEach((advice: string) => {
    generator.addListItem(advice, 10, '#4b5563')
  })
  generator.addSpace(10)
  
  // 所需文档
  generator.addSubtitle('Required Documents', 14, '#374151')
  assessmentData.requiredDocuments.forEach((doc: string) => {
    generator.addListItem(doc, 10, '#4b5563')
  })
  generator.addSpace(10)
  
  // 时间线和预算
  generator.addSubtitle('Timeline & Budget', 14, '#374151')
  generator.addParagraph(`Timeline: ${assessmentData.timeline}`, 12, '#1f2937')
  const budget = assessmentData.estimatedBudget
  generator.addParagraph(`Estimated Budget: ${budget.min} - ${budget.max} ${budget.currency}`, 12, '#1f2937')
  generator.addSpace(10)
  
  // 最终建议
  generator.addSubtitle('Final Recommendation', 14, '#374151')
  generator.addParagraph(assessmentData.recommendation, 12, '#1f2937')
  
    // 生成PDF
    const filename = `GTV-Assessment-${applicantInfo.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
    console.log('准备生成PDF文件:', filename)
    generator.generate(filename)
    console.log('PDF文件生成完成')
  } catch (error) {
    console.error('PDF生成过程中出错:', error)
    throw error
  }
}
