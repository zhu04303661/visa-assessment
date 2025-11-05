/**
 * PDF生成服务
 * 调用后端API生成PDF报告，确保后台留下记录
 */

interface GeneratePDFRequest {
  assessmentData?: any
  assessment_id?: string
  markdown_filepath?: string
}

interface GeneratePDFResponse {
  success: boolean
  message: string
  file_name?: string
  file_path?: string
  assessment_id?: string
  error?: string
}

export class PDFService {
  private static readonly API_BASE = (
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'
      : 'http://localhost:5005'
  ).replace(/\/$/, '')

  /**
   * 调用后端API生成PDF报告
   * @param assessmentData - 评估数据
   * @param assessmentId - 评估ID（可选，用于从数据库加载）
   * @returns 生成的PDF文件名
   */
  static async generatePDFReport(
    assessmentData: any,
    assessmentId?: string
  ): Promise<string> {
    try {
      console.log('📄 开始调用后端API生成PDF报告...')
      console.log('📌 评估ID:', assessmentId)
      console.log('👤 申请人:', assessmentData?.applicantInfo?.name)

      const requestData: GeneratePDFRequest = {
        assessmentData,
      }

      if (assessmentId) {
        requestData.assessment_id = assessmentId
      }

      const response = await fetch(`${this.API_BASE}/api/resume/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || `HTTP ${response.status}`
        console.error('❌ PDF生成失败:', errorMessage)
        throw new Error(`PDF生成失败: ${errorMessage}`)
      }

      const result: GeneratePDFResponse = await response.json()

      if (!result.success) {
        console.error('❌ API返回错误:', result.error)
        throw new Error(result.error || 'PDF生成失败')
      }

      if (!result.file_name) {
        console.error('❌ 无法获取生成的文件名')
        throw new Error('无法获取生成的文件名')
      }

      console.log('✅ PDF生成成功:', result.file_name)
      console.log('📊 消息:', result.message)
      return result.file_name
    } catch (error) {
      console.error('❌ PDF生成服务出错:', error)
      throw error
    }
  }

  /**
   * 下载已生成的PDF文件
   * @param fileName - PDF文件名
   * @param downloadName - 下载时的文件名（可选）
   */
  static async downloadPDF(fileName: string, downloadName?: string): Promise<void> {
    try {
      console.log('📥 开始下载PDF:', fileName)

      const downloadUrl = `${this.API_BASE}/api/resume/download-pdf/${encodeURIComponent(fileName)}`

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = downloadName || fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('✅ PDF下载已启动')
    } catch (error) {
      console.error('❌ PDF下载失败:', error)
      throw error
    }
  }

  /**
   * 生成并下载PDF（一步操作）
   * @param assessmentData - 评估数据
   * @param downloadName - 下载时的文件名
   * @param assessmentId - 评估ID（可选）
   */
  static async generateAndDownloadPDF(
    assessmentData: any,
    downloadName?: string,
    assessmentId?: string
  ): Promise<void> {
    try {
      const fileName = await this.generatePDFReport(assessmentData, assessmentId)
      await this.downloadPDF(fileName, downloadName)
    } catch (error) {
      console.error('❌ 生成和下载PDF失败:', error)
      throw error
    }
  }
}
