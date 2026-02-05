"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const API_BASE = "/api/copywriting"

// 支持的文件类型
const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'text/markdown': '.md',
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md']

interface DocumentUploadProps {
  projectId: string
  packageType: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 上传成功后的回调 */
  onUploadSuccess?: (data: { content: string; version: number; word_count: number }) => void
  /** 自定义标题 */
  title?: string
}

interface UploadState {
  file: File | null
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  result?: {
    content: string
    version: number
    word_count: number
  }
}

export function DocumentUpload({
  projectId,
  packageType,
  open,
  onOpenChange,
  onUploadSuccess,
  title = "上传文档"
}: DocumentUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    status: 'idle',
    progress: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 验证文件类型
  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast.error(`不支持的文件类型: ${extension}`)
      return false
    }
    // 限制文件大小为 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过 10MB')
      return false
    }
    return true
  }

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) return
    setUploadState({
      file,
      status: 'idle',
      progress: 0
    })
  }

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [])

  // 上传文件
  const uploadFile = async () => {
    if (!uploadState.file) return

    try {
      setUploadState(prev => ({ ...prev, status: 'uploading', progress: 10 }))

      const formData = new FormData()
      formData.append('file', uploadState.file)

      // 模拟进度
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 200)

      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/packages/${packageType}/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      clearInterval(progressInterval)

      const data = await response.json()

      if (data.success) {
        setUploadState(prev => ({
          ...prev,
          status: 'success',
          progress: 100,
          result: {
            content: data.content,
            version: data.version,
            word_count: data.word_count
          }
        }))
        toast.success(`上传成功，已创建版本 v${data.version}`)
        onUploadSuccess?.({
          content: data.content,
          version: data.version,
          word_count: data.word_count
        })
      } else {
        throw new Error(data.error || '上传失败')
      }
    } catch (error: any) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }))
      toast.error(`上传失败: ${error.message}`)
    }
  }

  // 重置状态
  const resetUpload = () => {
    setUploadState({
      file: null,
      status: 'idle',
      progress: 0
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 关闭对话框时重置
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetUpload()
    }
    onOpenChange(newOpen)
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            上传本地文档，系统将解析内容并创建新版本。支持 PDF、Word、TXT、Markdown 格式。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 拖拽区域 */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : uploadState.file 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            
            {uploadState.file ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto text-green-600" />
                <p className="font-medium text-green-700">{uploadState.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(uploadState.file.size)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    resetUpload()
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  重新选择
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className={`h-12 w-12 mx-auto ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className="text-sm text-muted-foreground">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-xs text-muted-foreground">
                  支持 {ACCEPTED_EXTENSIONS.join(', ')} 格式，最大 10MB
                </p>
              </div>
            )}
          </div>

          {/* 上传状态 */}
          {uploadState.status === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm">正在上传并解析文档...</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadState.status === 'success' && uploadState.result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">上传成功</span>
              </div>
              <div className="text-sm text-green-600 space-y-1">
                <p>版本: v{uploadState.result.version}</p>
                <p>字数: {uploadState.result.word_count} 词</p>
              </div>
            </div>
          )}

          {uploadState.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">上传失败</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{uploadState.error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {uploadState.status === 'success' ? '完成' : '取消'}
          </Button>
          {uploadState.status !== 'success' && (
            <Button 
              onClick={uploadFile} 
              disabled={!uploadState.file || uploadState.status === 'uploading'}
            >
              {uploadState.status === 'uploading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  上传并解析
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
