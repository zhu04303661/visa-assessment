"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, Download, Loader2, AlertCircle, FileText } from "lucide-react"

// API 基础 URL - 使用代理路由避免CORS问题
const API_BASE = '/api/copywriting'

export interface PreviewFile {
  id: number
  file_name: string
  file_type: string
  file_size?: number
  file_url?: string
}

interface UnifiedFilePreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: PreviewFile | null
}

// 获取预览 URL
const getPreviewUrl = (file: PreviewFile) => {
  if (file.file_url) return file.file_url
  return `${API_BASE}/api/files/preview/${file.id}`
}

export function UnifiedFilePreview({ open, onOpenChange, file }: UnifiedFilePreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Word/Excel 预览内容
  const [htmlContent, setHtmlContent] = useState<string>('')

  // 从文件名中提取文件类型（作为 fallback）
  const getFileTypeFromName = (fileName: string): string => {
    if (!fileName) return ''
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return ext
  }
  
  const fileType = file?.file_type?.toLowerCase() || getFileTypeFromName(file?.file_name || '')
  const previewUrl = file ? getPreviewUrl(file) : ''

  // 加载 Word 文档
  const loadWordDocument = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    
    try {
      console.log('正在加载 Word 文档:', previewUrl)
      const response = await fetch(previewUrl, {
        method: 'GET',
        credentials: 'omit',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      console.log('文件大小:', arrayBuffer.byteLength, 'bytes')
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('文件内容为空')
      }
      
      // 动态导入 mammoth
      const mammoth = await import('mammoth')
      const result = await mammoth.convertToHtml({ arrayBuffer })
      console.log('Word 转换完成，HTML 长度:', result.value.length)
      
      // 添加样式
      const styledHtml = `
        <style>
          .word-content { font-family: 'Microsoft YaHei', Arial, sans-serif; line-height: 1.8; padding: 24px; max-width: 800px; margin: 0 auto; }
          .word-content p { margin-bottom: 14px; text-align: justify; }
          .word-content table { border-collapse: collapse; width: 100%; margin: 16px 0; }
          .word-content td, .word-content th { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .word-content th { background-color: #f5f5f5; font-weight: 600; }
          .word-content img { max-width: 100%; height: auto; }
          .word-content ul, .word-content ol { margin-left: 24px; margin-bottom: 14px; }
          .word-content h1, .word-content h2, .word-content h3 { margin-top: 20px; margin-bottom: 12px; }
        </style>
        <div class="word-content">${result.value || '<p>文档内容为空</p>'}</div>
      `
      setHtmlContent(styledHtml)
      setLoading(false)
    } catch (err: any) {
      console.error('加载 Word 文档失败:', err)
      setError(`无法加载 Word 文档: ${err.message || '未知错误'}`)
      setLoading(false)
    }
  }, [file, previewUrl])

  // 加载 Excel 文件
  const loadExcelDocument = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    
    try {
      console.log('正在加载 Excel 文件:', previewUrl)
      const response = await fetch(previewUrl, {
        method: 'GET',
        credentials: 'omit',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      console.log('文件大小:', arrayBuffer.byteLength, 'bytes')
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('文件内容为空')
      }
      
      // 动态导入 xlsx
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // 生成 HTML 表格
      let html = `
        <style>
          .excel-content { font-family: Arial, sans-serif; padding: 16px; }
          .excel-sheet { margin-bottom: 32px; }
          .excel-sheet h3 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; margin: 0 0 0 0; border-radius: 8px 8px 0 0; font-size: 14px; }
          .excel-table { border-collapse: collapse; width: 100%; font-size: 13px; background: white; }
          .excel-table td, .excel-table th { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
          .excel-table th { background-color: #f8fafc; font-weight: 600; color: #475569; }
          .excel-table tr:nth-child(even) { background-color: #f8fafc; }
          .excel-table tr:hover { background-color: #e0f2fe; }
          .table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
        </style>
      `
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const sheetHtml = XLSX.utils.sheet_to_html(worksheet, { 
          header: '',
          footer: ''
        })
        
        // 提取表格内容并添加样式类
        const tableContent = sheetHtml
          .replace(/<table/, '<table class="excel-table"')
        
        html += `<div class="excel-sheet"><h3>📊 ${sheetName}</h3><div class="table-wrapper">${tableContent}</div></div>`
      })
      
      setHtmlContent(`<div class="excel-content">${html}</div>`)
      setLoading(false)
    } catch (err: any) {
      console.error('加载 Excel 文件失败:', err)
      setError(`无法加载 Excel 文件: ${err.message || '未知错误'}`)
      setLoading(false)
    }
  }, [file, previewUrl])

  // 根据文件类型加载内容
  useEffect(() => {
    if (!open || !file) return
    
    setLoading(true)
    setError(null)
    setHtmlContent('')
    
    if (['doc', 'docx'].includes(fileType)) {
      loadWordDocument()
    } else if (['xls', 'xlsx'].includes(fileType)) {
      loadExcelDocument()
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'pdf'].includes(fileType)) {
      // 图片和 PDF 由组件自行处理，不需要预加载
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [open, file, fileType, loadWordDocument, loadExcelDocument])

  const handleDownload = () => {
    if (file) window.open(previewUrl, '_blank')
  }

  if (!file) return null

  // 根据文件类型确定窗口大小
  const getDialogStyle = (): React.CSSProperties => {
    if (['xls', 'xlsx'].includes(fileType)) {
      return { width: '95vw', maxWidth: '95vw', height: '95vh', maxHeight: '95vh' }
    }
    if (['doc', 'docx'].includes(fileType)) {
      return { width: '900px', maxWidth: '90vw', height: '95vh', maxHeight: '95vh' }
    }
    if (fileType === 'pdf') {
      return { width: '1100px', maxWidth: '95vw', height: '95vh', maxHeight: '95vh' }
    }
    // 图片
    return { width: '900px', maxWidth: '90vw', height: '95vh', maxHeight: '95vh' }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none flex flex-col p-0" style={getDialogStyle()}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            文件预览
          </DialogTitle>
          <DialogDescription className="truncate">
            {file.file_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <AlertCircle className="h-16 w-16 mb-4 text-red-500" />
              <p className="text-lg font-medium mb-2">预览加载失败</p>
              <p className="text-sm mb-4">{error}</p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                下载文件
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* 图片预览 */}
              {['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif'].includes(fileType) && (
                <div className="flex items-center justify-center h-full p-4 bg-muted/20">
                  <img
                    src={previewUrl}
                    alt={file.file_name}
                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                  />
                </div>
              )}

              {/* PDF 预览 - 使用 iframe */}
              {fileType === 'pdf' && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={file.file_name}
                />
              )}

              {/* Word/Excel 预览 */}
              {['doc', 'docx', 'xls', 'xlsx'].includes(fileType) && htmlContent && (
                <ScrollArea className="h-full">
                  <div 
                    className="bg-white min-h-full"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </ScrollArea>
              )}

              {/* 不支持的文件类型 */}
              {!['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(fileType) && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium mb-2">{file.file_name}</p>
                  <p className="text-sm mb-4">此文件类型 (.{fileType}) 不支持在线预览</p>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    下载文件
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            下载
          </Button>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
