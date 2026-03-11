"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Plus,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  FolderOpen,
  Upload,
  ChevronRight,
  Loader2,
  Save,
  Download,
  Trash2,
  FileCheck,
  Layers,
  CheckCircle2,
  Circle,
  X,
  File,
  Image,
  FileSpreadsheet,
  Link,
  Edit3,
  Eye,
  ChevronDown,
  Info,
  HelpCircle,
  FolderPlus,
  ClipboardList,
  ArrowLeft,
  FolderArchive,
  Filter,
  ExternalLink,
  Folder,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { UnifiedFilePreview } from "@/components/unified-file-preview"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// API 基础URL - 使用代理路由避免 CORS 问题
const API_BASE = '/api/copywriting'

// 类型定义
interface Project {
  project_id: string
  case_id: string
  client_name: string
  visa_type: string
  status: string
  created_at: string
}

interface MaterialItem {
  item_id: string
  name: string
  name_en: string
  description: string
  required: boolean
  file_types: string[]
  has_form: boolean
  form_type?: string
  multiple?: boolean
  generated?: boolean
  tips?: string
  status: string
  file_name?: string
  collected_at?: string
  notes?: string
  files: MaterialFile[]
}

interface RepeatableInstance {
  instance_id: string
  label: string
  items: MaterialItem[]
}

interface MaterialFile {
  id: number
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  description?: string
  uploaded_at: string
  source_path?: string
}

interface FileWithPath {
  file: File
  relativePath: string
}

interface TreeNode {
  name: string
  fullPath: string
  isFolder: boolean
  children: TreeNode[]
  file?: MaterialFile
}

interface MaterialCategory {
  name: string
  name_en: string
  description: string
  order: number
  items: MaterialItem[]
  is_repeatable?: boolean
  repeat_label?: string
  min_count?: number
  max_count?: number
  instances?: RepeatableInstance[]
}

interface CollectionProgress {
  total_items: number
  collected_items: number
  required_items: number
  required_collected: number
  overall_progress: number
  required_progress: number
}

interface FormField {
  name: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
}

interface FormTemplate {
  title: string
  description: string
  fields: FormField[]
}

// API 调用
async function apiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  return response.json()
}

// 获取文件图标
function getFileIcon(fileType: string) {
  const type = fileType.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
    return <Image className="h-4 w-4" />
  }
  if (['xlsx', 'xls', 'csv'].includes(type)) {
    return <FileSpreadsheet className="h-4 w-4" />
  }
  return <File className="h-4 w-4" />
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function MaterialCollectionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project')
  
  // 状态
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<Record<string, MaterialCategory>>({})
  const [progress, setProgress] = useState<CollectionProgress | null>(null)
  const [formTemplates, setFormTemplates] = useState<Record<string, FormTemplate>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 对话框状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<{ categoryId: string; item: MaterialItem } | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 文件上传
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileDescription, setFileDescription] = useState('')
  
  // 批量上传
  const [batchUploadOpen, setBatchUploadOpen] = useState(false)
  const [batchFiles, setBatchFiles] = useState<FileWithPath[]>([])
  const [batchUploading, setBatchUploading] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [uploadResults, setUploadResults] = useState<{filename: string; status: string; category?: string; message?: string}[]>([])
  const [showResults, setShowResults] = useState(false)
  
  // 上传进度跟踪
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;           // 当前文件索引
    total: number;             // 总文件数
    currentFileName: string;   // 当前文件名
    completedFiles: string[];  // 已完成的文件
    failedFiles: string[];     // 失败的文件
  }>({ current: 0, total: 0, currentFileName: '', completedFiles: [], failedFiles: [] })
  
  // 已上传文件列表（用于手动打标签）
  const [uploadedFiles, setUploadedFiles] = useState<MaterialFile[]>([])
  const [showFileManager, setShowFileManager] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  // 支持多标签：每个文件可以有多个分类标签
  const [fileTagging, setFileTagging] = useState<{[fileId: number]: {categoryId: string; itemId: string}[]}>({})
  const [savingTagFileId, setSavingTagFileId] = useState<number | null>(null) // 正在保存哪个文件的标签
  const [deletingAll, setDeletingAll] = useState(false)
  // 标签过滤
  const [filterTag, setFilterTag] = useState<string>('__all__') // 格式: categoryId|itemId 或 __all__ 表示全部
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingFile, setDeletingFile] = useState<number | null>(null)
  
  // 创建项目对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  
  // 文件预览
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewingFile, setPreviewingFile] = useState<MaterialFile | null>(null)

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall('/api/projects')
      if (data.success) {
        setProjects(data.data || [])
      }
    } catch (err) {
      console.error('加载项目失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载表单模板
  const loadFormTemplates = useCallback(async () => {
    try {
      const data = await apiCall('/api/material-collection/forms')
      if (data.success) {
        setFormTemplates(data.data || {})
      }
    } catch (err) {
      console.error('加载表单模板失败:', err)
    }
  }, [])

  // 加载项目材料状态
  const loadMaterialStatus = useCallback(async (projectId: string) => {
    try {
      setLoading(true)
      const data = await apiCall(`/api/projects/${projectId}/material-collection`)
      if (data.success) {
        const cats = data.data.categories || {}
        setCategories(cats)
        setProgress(data.data.progress || null)
        
        // 从 categories 中提取文件列表，使用 Map 去重并支持多标签
        const fileMap = new Map<number, MaterialFile>()
        const tagging: {[fileId: number]: {categoryId: string; itemId: string}[]} = {}
        
        Object.entries(cats).forEach(([categoryId, category]: [string, any]) => {
          category.items?.forEach((item: any) => {
            if (item.files && item.files.length > 0) {
              item.files.forEach((file: MaterialFile) => {
                // 去重：只保留第一次出现的文件
                if (!fileMap.has(file.id)) {
                  fileMap.set(file.id, file)
                }
                // 多标签：每个文件可以有多个分类标签
                if (!tagging[file.id]) {
                  tagging[file.id] = []
                }
                // 检查是否已有相同的标签
                const exists = tagging[file.id].some(
                  t => t.categoryId === categoryId && t.itemId === item.item_id
                )
                if (!exists) {
                  tagging[file.id].push({ categoryId, itemId: item.item_id })
                }
              })
            }
          })
        })
        
        setUploadedFiles(Array.from(fileMap.values()))
        setFileTagging(tagging)
      }
    } catch (err) {
      console.error('加载材料状态失败:', err)
      setError('加载材料状态失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 选择项目
  const selectProject = async (project: Project) => {
    setSelectedProject(project)
    await loadMaterialStatus(project.project_id)
    // 不再调用 loadUploadedFiles，因为 loadMaterialStatus 已经正确提取了文件列表
  }

  // 从 categories 中提取所有已上传的文件（已移至 loadMaterialStatus 中）

  // 加载已上传的文件列表
  const loadUploadedFiles = useCallback(async (projectId: string) => {
    try {
      // 首先尝试从专用 API 获取
      const data = await apiCall(`/api/projects/${projectId}/materials`)
      if (data.success && data.data && data.data.length > 0) {
        setUploadedFiles(data.data)
        // 初始化文件标签状态（支持多标签）
        const tagging: {[fileId: number]: {categoryId: string; itemId: string}[]} = {}
        data.data.forEach((file: any) => {
          if (file.category_id && file.item_id) {
            tagging[file.id] = [{ categoryId: file.category_id, itemId: file.item_id }]
          }
        })
        setFileTagging(tagging)
      }
    } catch (err) {
      console.warn('专用 API 不可用，将从 categories 提取文件:', err)
    }
  }, [])

  // 添加文件分类标签（自动保存）
  const addFileTag = async (fileId: number, categoryId: string, itemId: string) => {
    if (!selectedProject) return
    
    // 先更新本地状态
    const existing = fileTagging[fileId] || []
    const exists = existing.some(t => t.categoryId === categoryId && t.itemId === itemId)
    if (exists) return
    
    const newTags = [...existing, { categoryId, itemId }]
    setFileTagging(prev => ({
      ...prev,
      [fileId]: newTags
    }))
    
    // 自动保存到服务器
    try {
      setSavingTagFileId(fileId)
      await apiCall(`/api/projects/${selectedProject.project_id}/materials/${fileId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({
          tags: newTags.map(tag => ({
            category_id: tag.categoryId,
            item_id: tag.itemId
          }))
        })
      })
      // 重新加载材料状态以更新分类显示
      await loadMaterialStatus(selectedProject.project_id)
    } catch (err) {
      console.error('保存标签失败:', err)
      // 回滚本地状态
      setFileTagging(prev => ({
        ...prev,
        [fileId]: existing
      }))
    } finally {
      setSavingTagFileId(null)
    }
  }
  
  // 移除文件分类标签（自动保存）- 删除后移回"其他文档"
  const removeFileTag = async (fileId: number, categoryId: string, itemId: string) => {
    if (!selectedProject) return
    
    const existing = fileTagging[fileId] || []
    // 删除标签后，将文件移回"其他文档"
    const newTags = [{ categoryId: 'folder_1', itemId: 'other_docs' }]
    
    // 先更新本地状态
    setFileTagging(prev => ({
      ...prev,
      [fileId]: newTags
    }))
    
    // 自动保存到服务器
    try {
      setSavingTagFileId(fileId)
      await apiCall(`/api/projects/${selectedProject.project_id}/materials/${fileId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({
          tags: newTags.map(tag => ({
            category_id: tag.categoryId,
            item_id: tag.itemId
          }))
        })
      })
      // 重新加载材料状态以更新分类显示
      await loadMaterialStatus(selectedProject.project_id)
    } catch (err) {
      console.error('移除标签失败:', err)
      // 回滚本地状态
      setFileTagging(prev => ({
        ...prev,
        [fileId]: existing
      }))
    } finally {
      setSavingTagFileId(null)
    }
  }
  
  // 更新文件分类标签（替换而非追加）
  const updateFileTag = async (fileId: number, categoryId: string, itemId: string) => {
    if (!selectedProject) return
    
    const existing = fileTagging[fileId] || []
    // 直接替换为新标签
    const newTags = [{ categoryId, itemId }]
    
    // 检查是否与现有标签相同
    if (existing.length === 1 && existing[0].categoryId === categoryId && existing[0].itemId === itemId) {
      return // 无变化
    }
    
    // 先更新本地状态
    setFileTagging(prev => ({
      ...prev,
      [fileId]: newTags
    }))
    
    // 自动保存到服务器
    try {
      setSavingTagFileId(fileId)
      await apiCall(`/api/projects/${selectedProject.project_id}/materials/${fileId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({
          tags: newTags.map(tag => ({
            category_id: tag.categoryId,
            item_id: tag.itemId
          }))
        })
      })
      // 重新加载材料状态以更新分类显示
      await loadMaterialStatus(selectedProject.project_id)
    } catch (err) {
      console.error('更新标签失败:', err)
      // 回滚本地状态
      setFileTagging(prev => ({
        ...prev,
        [fileId]: existing
      }))
    } finally {
      setSavingTagFileId(null)
    }
  }

  // 获取分类标签的颜色
  const getCategoryColor = (categoryId: string, itemId?: string): string => {
    // "其他文档" 标记为红色（视为未分类）
    if (itemId === 'other_docs') {
      return 'bg-red-100 text-red-700 border-red-300'
    }
    
    const colorMap: { [key: string]: string } = {
      'folder_1': 'bg-blue-100 text-blue-800 border-blue-300',      // 基础材料 - 蓝色
      'folder_2': 'bg-green-100 text-green-800 border-green-300',   // 工作证明 - 绿色
      'folder_3': 'bg-purple-100 text-purple-800 border-purple-300', // 推荐信 - 紫色
      'folder_4': 'bg-orange-100 text-orange-800 border-orange-300', // 贡献证明 - 橙色
      'folder_5': 'bg-cyan-100 text-cyan-800 border-cyan-300',      // 媒体报道 - 青色
      'folder_6': 'bg-pink-100 text-pink-800 border-pink-300',      // 学术成就 - 粉色
      'folder_7': 'bg-yellow-100 text-yellow-800 border-yellow-300', // 其他材料 - 黄色
    }
    return colorMap[categoryId] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  // 获取所有可用的分类选项
  const getCategoryOptions = () => {
    const options: {value: string; label: string; items: {value: string; label: string}[]}[] = []
    
    Object.entries(categories).forEach(([categoryId, category]) => {
      const categoryOption = {
        value: categoryId,
        label: category.name,
        items: category.items.map(item => ({
          value: item.item_id,
          label: item.name
        }))
      }
      options.push(categoryOption)
    })
    
    return options
  }

  // 删除单个文件
  const deleteFile = async (fileId: number) => {
    if (!selectedProject) return
    
    try {
      setDeletingFile(fileId)
      const data = await apiCall(`/api/projects/${selectedProject.project_id}/material-collection/files/${fileId}`, {
        method: 'DELETE'
      })
      
      if (data.success) {
        // 从本地列表移除
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
        // 移除标签
        setFileTagging(prev => {
          const newTagging = { ...prev }
          delete newTagging[fileId]
          return newTagging
        })
      }
    } catch (err) {
      console.error('删除文件失败:', err)
      setError('删除文件失败')
    } finally {
      setDeletingFile(null)
    }
  }

  // 删除全部文件
  const deleteAllFiles = async () => {
    if (!selectedProject) return
    
    try {
      setDeletingAll(true)
      
      // 逐个删除所有文件
      for (const file of uploadedFiles) {
        await apiCall(`/api/projects/${selectedProject.project_id}/material-collection/files/${file.id}`, {
          method: 'DELETE'
        })
      }
      
      // 清空本地状态
      setUploadedFiles([])
      setFileTagging({})
      setDeleteConfirmOpen(false)
      
      // 重新加载材料状态
      await loadMaterialStatus(selectedProject.project_id)
    } catch (err) {
      console.error('删除全部文件失败:', err)
      setError('删除全部文件失败')
    } finally {
      setDeletingAll(false)
    }
  }

  // 创建新项目
  const createProject = async () => {
    if (!newProjectName.trim()) return
    
    try {
      setCreating(true)
      const data = await apiCall('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          client_name: newProjectName,
          visa_type: 'GTV'
        })
      })
      
      if (data.success) {
        setCreateDialogOpen(false)
        setNewProjectName('')
        await loadProjects()
        // 自动选中新建的项目
        if (data.project_id) {
          const newProject = { project_id: data.project_id, client_name: newProjectName } as Project
          await selectProject(newProject)
        }
      } else {
        setError(data.error || '创建项目失败')
      }
    } catch (err) {
      console.error('创建项目失败:', err)
      setError('创建项目失败')
    } finally {
      setCreating(false)
    }
  }

  // 打开上传对话框
  const openUploadDialog = (categoryId: string, item: MaterialItem) => {
    setCurrentItem({ categoryId, item })
    setSelectedFiles([])
    setFileDescription('')
    setUploadDialogOpen(true)
  }

  // 打开表单对话框
  const openFormDialog = async (categoryId: string, item: MaterialItem) => {
    setCurrentItem({ categoryId, item })
    setFormData({})
    
    // 加载已有的表单数据
    if (selectedProject && item.form_type) {
      try {
        const data = await apiCall(`/api/projects/${selectedProject.project_id}/material-collection/forms/${item.form_type}`)
        if (data.success && data.data) {
          setFormData(data.data.form_data || {})
        }
      } catch (err) {
        console.error('加载表单数据失败:', err)
      }
    }
    
    setFormDialogOpen(true)
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  // 移除选中的文件
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 上传文件
  const uploadFiles = async () => {
    if (!selectedProject || !currentItem || selectedFiles.length === 0) return
    
    try {
      setUploading(true)
      
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category_id', currentItem.categoryId)
        formData.append('item_id', currentItem.item.item_id)
        formData.append('description', fileDescription)
        
        const response = await fetch(`${API_BASE}/api/projects/${selectedProject.project_id}/material-collection/upload`, {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || '上传失败')
        }
      }
      
      setUploadDialogOpen(false)
      await loadMaterialStatus(selectedProject.project_id)
    } catch (err) {
      console.error('上传失败:', err)
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  // 预览文件
  const handlePreviewFile = (file: MaterialFile) => {
    setPreviewingFile(file)
    setPreviewOpen(true)
  }
  
  // 获取预览URL
  const getPreviewUrl = (file: MaterialFile) => {
    return `${API_BASE}/api/files/preview/${file.id}`
  }

  // 保存表单
  const saveForm = async () => {
    if (!selectedProject || !currentItem?.item.form_type) return
    
    try {
      setSaving(true)
      const data = await apiCall(`/api/projects/${selectedProject.project_id}/material-collection/forms/${currentItem.item.form_type}`, {
        method: 'POST',
        body: JSON.stringify({
          form_data: formData,
          form_index: 0
        })
      })
      
      if (data.success) {
        setFormDialogOpen(false)
        await loadMaterialStatus(selectedProject.project_id)
      } else {
        setError(data.error || '保存失败')
      }
    } catch (err) {
      console.error('保存失败:', err)
      setError('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 导出清单（Markdown）
  const exportChecklist = async () => {
    if (!selectedProject) return
    
    try {
      const data = await apiCall(`/api/projects/${selectedProject.project_id}/material-collection/export`)
      if (data.success && data.data?.content) {
        // 下载为Markdown文件
        const blob = new Blob([data.data.content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `材料清单_${selectedProject.client_name}_${new Date().toISOString().slice(0,10)}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('导出失败:', err)
      setError('导出失败')
    }
  }

  // 下载可打印的Word清单（线下模式）
  const downloadWordChecklist = () => {
    if (!selectedProject) return
    window.open(`${API_BASE}/api/projects/${selectedProject.project_id}/material-collection/export-word`, '_blank')
  }

  // 下载单个采集表模板
  const downloadFormTemplate = (formType: string) => {
    window.open(`${API_BASE}/api/material-collection/templates/${formType}/download`, '_blank')
  }

  // 下载所有采集表模板
  const downloadAllTemplates = () => {
    window.open(`${API_BASE}/api/material-collection/templates/download-all`, '_blank')
  }

  // 下载完整材料包（清单+所有模板）
  const downloadFullPackage = () => {
    if (!selectedProject) return
    // 同时下载清单和模板
    downloadWordChecklist()
    setTimeout(() => downloadAllTemplates(), 500)
  }

  // 处理批量文件选择（普通文件）
  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const withPaths: FileWithPath[] = files.map(f => ({
      file: f,
      relativePath: f.name
    }))
    setBatchFiles(prev => [...prev, ...withPaths])
  }

  // 需要过滤的系统文件
  const isSystemFile = (name: string): boolean => {
    const lower = name.toLowerCase()
    const systemFiles = ['desktop.ini', 'thumbs.db', '.ds_store', '.gitkeep', '.gitignore']
    return lower.startsWith('.') || systemFiles.includes(lower)
  }

  // 处理文件夹选择（webkitdirectory）
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const withPaths: FileWithPath[] = files
      .filter(f => !isSystemFile(f.name))
      .map(f => ({
        file: f,
        relativePath: f.webkitRelativePath || f.name
      }))
    setBatchFiles(prev => [...prev, ...withPaths])
  }

  // 递归遍历 FileSystemEntry 获取所有文件
  const traverseFileSystemEntry = async (entry: FileSystemEntry, basePath: string = ''): Promise<FileWithPath[]> => {
    const results: FileWithPath[] = []
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      if (!isSystemFile(file.name)) {
        results.push({
          file,
          relativePath: basePath ? `${basePath}/${file.name}` : file.name
        })
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        const allEntries: FileSystemEntry[] = []
        const readBatch = () => {
          reader.readEntries((batch) => {
            if (batch.length === 0) {
              resolve(allEntries)
            } else {
              allEntries.push(...batch)
              readBatch()
            }
          }, reject)
        }
        readBatch()
      })
      const newBase = basePath ? `${basePath}/${entry.name}` : entry.name
      for (const child of entries) {
        const childFiles = await traverseFileSystemEntry(child, newBase)
        results.push(...childFiles)
      }
    }
    return results
  }

  // 处理拖放（支持文件夹）
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const items = e.dataTransfer.items
    if (!items) return

    const allFiles: FileWithPath[] = []
    const promises: Promise<void>[] = []

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.()
      if (entry) {
        promises.push(
          traverseFileSystemEntry(entry).then(files => {
            allFiles.push(...files)
          })
        )
      }
    }

    await Promise.all(promises)
    if (allFiles.length > 0) {
      setBatchFiles(prev => [...prev, ...allFiles])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // 移除批量文件
  const removeBatchFile = (index: number) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 智能识别文件类型（支持通过目录路径增强识别）
  const guessFileCategory = (filename: string, relativePath?: string): { categoryId: string; itemId: string } | null => {
    const lowerName = filename.toLowerCase()
    const lowerPath = (relativePath || '').toLowerCase()
    
    // 简历相关
    if (lowerName.includes('简历') || lowerName.includes('cv') || lowerName.includes('resume')) {
      return { categoryId: 'folder_1', itemId: 'resume' }
    }
    // 护照
    if (lowerName.includes('护照') || lowerName.includes('passport')) {
      return { categoryId: 'folder_1', itemId: 'passport' }
    }
    // 学历证书
    if (lowerName.includes('学历') || lowerName.includes('学位') || lowerName.includes('毕业') || lowerName.includes('diploma') || lowerName.includes('degree')) {
      return { categoryId: 'folder_1', itemId: 'education_cert' }
    }
    // 专利
    if (lowerName.includes('专利') || lowerName.includes('patent')) {
      return { categoryId: 'folder_4', itemId: 'patents' }
    }
    // 论文
    if (lowerName.includes('论文') || lowerName.includes('paper') || lowerName.includes('publication')) {
      return { categoryId: 'folder_4', itemId: 'publications' }
    }
    // 就职信息采集表
    if (lowerName.includes('就职信息') || lowerName.includes('employment')) {
      return { categoryId: 'folder_2', itemId: 'employment_info_form' }
    }
    // 家庭信息采集表 / 个人家庭信息
    if (lowerName.includes('家庭信息') || lowerName.includes('family')) {
      return { categoryId: 'folder_1', itemId: 'personal_statement' }
    }
    // 原创贡献
    if (lowerName.includes('原创') || lowerName.includes('贡献') || lowerName.includes('contribution')) {
      return { categoryId: 'folder_4', itemId: 'contribution_form' }
    }
    // 项目阐述
    if (lowerName.includes('项目') || lowerName.includes('project')) {
      return { categoryId: 'folder_5', itemId: 'project_form' }
    }
    // 推荐人相关
    if (lowerName.includes('推荐人') || lowerName.includes('recommender')) {
      if (lowerName.includes('1') || lowerName.includes('一')) {
        if (lowerName.includes('简历') || lowerName.includes('cv')) {
          return { categoryId: 'folder_6', itemId: 'recommender_1_resume' }
        }
        return { categoryId: 'folder_6', itemId: 'recommender_1_contribution_form' }
      }
      if (lowerName.includes('2') || lowerName.includes('二')) {
        if (lowerName.includes('简历') || lowerName.includes('cv')) {
          return { categoryId: 'folder_6', itemId: 'recommender_2_resume' }
        }
        return { categoryId: 'folder_6', itemId: 'recommender_2_contribution_form' }
      }
      if (lowerName.includes('3') || lowerName.includes('三')) {
        if (lowerName.includes('简历') || lowerName.includes('cv')) {
          return { categoryId: 'folder_6', itemId: 'recommender_3_resume' }
        }
        return { categoryId: 'folder_6', itemId: 'recommender_3_contribution_form' }
      }
    }
    // 收入证明
    if (lowerName.includes('收入') || lowerName.includes('工资') || lowerName.includes('income') || lowerName.includes('salary')) {
      return { categoryId: 'folder_2', itemId: 'income_proof' }
    }
    // 奖项
    if (lowerName.includes('奖') || lowerName.includes('award') || lowerName.includes('荣誉')) {
      return { categoryId: 'folder_4', itemId: 'achievement_awards' }
    }
    
    // 基于目录路径的推断
    if (lowerPath) {
      if (lowerPath.includes('基础材料') || lowerPath.includes('个人') || lowerPath.includes('basic')) {
        return { categoryId: 'folder_1', itemId: 'other_docs' }
      }
      if (lowerPath.includes('工作') || lowerPath.includes('employment') || lowerPath.includes('work')) {
        return { categoryId: 'folder_2', itemId: 'income_proof' }
      }
      if (lowerPath.includes('推荐') || lowerPath.includes('recommend')) {
        return { categoryId: 'folder_3', itemId: 'recommender_1_contribution_form' }
      }
      if (lowerPath.includes('贡献') || lowerPath.includes('contribution') || lowerPath.includes('成就')) {
        return { categoryId: 'folder_4', itemId: 'publications' }
      }
      if (lowerPath.includes('媒体') || lowerPath.includes('media') || lowerPath.includes('报道')) {
        return { categoryId: 'folder_5', itemId: 'project_form' }
      }
      if (lowerPath.includes('学术') || lowerPath.includes('academic')) {
        return { categoryId: 'folder_6', itemId: 'recommender_1_resume' }
      }
    }
    
    return null
  }

  // 上传单个文件的辅助函数
  const uploadSingleFile = async (
    fileWithPath: FileWithPath, 
    projectId: string
  ): Promise<{filename: string; status: string; category?: string; categoryName?: string; message?: string}[]> => {
    const results: {filename: string; status: string; category?: string; categoryName?: string; message?: string}[] = []
    const file = fileWithPath.file
    const sourcePath = fileWithPath.relativePath
    
    // 检查是否是zip文件
    if (file.name.toLowerCase().endsWith('.zip')) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 300000)
        const response = await fetch(`${API_BASE}/api/projects/${projectId}/material-collection/upload-zip`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })
        clearTimeout(timeout)
        
        const data = await response.json()
        if (data.success && data.data) {
          const zipData = data.data
          results.push({
            filename: `📦 ${file.name}`,
            status: 'success',
            category: `解压出 ${zipData.total_files} 个文件`,
            message: `成功: ${zipData.success_count}, 未识别: ${zipData.unrecognized_count}`
          })
          
          if (zipData.files) {
            for (const f of zipData.files) {
              results.push({
                filename: `  └ ${f.filename}`,
                status: f.status === 'success' ? 'success' : f.status === 'unrecognized' ? 'unrecognized' : 'error',
                category: f.category_id ? `${f.category_id}/${f.item_id}` : undefined,
                categoryName: f.category_name,
                message: f.message
              })
            }
          }
        } else {
          results.push({ filename: file.name, status: 'error', message: data.error || '解压失败' })
        }
      } catch (err) {
        results.push({ filename: file.name, status: 'error', message: err instanceof DOMException && err.name === 'AbortError' ? '上传超时' : '网络错误' })
      }
    } else {
      const guess = guessFileCategory(file.name, sourcePath)
      
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('source_path', sourcePath)
        
        if (guess) {
          formData.append('category_id', guess.categoryId)
          formData.append('item_id', guess.itemId)
          formData.append('description', '批量上传')
        } else {
          formData.append('category_id', 'folder_1')
          formData.append('item_id', 'other_docs')
          formData.append('description', '待手动分类 - 系统未能自动识别')
        }
        
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 120000)
        const response = await fetch(`${API_BASE}/api/projects/${projectId}/material-collection/upload`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })
        clearTimeout(timeout)
        
        const data = await response.json()
        if (data.success) {
          if (data.duplicate) {
            results.push({
              filename: sourcePath !== file.name ? sourcePath : file.name,
              status: 'duplicate',
              message: data.message || '文件已存在，跳过'
            })
          } else {
            results.push({ 
              filename: sourcePath !== file.name ? sourcePath : file.name, 
              status: guess ? 'success' : 'unrecognized', 
              category: guess ? `${guess.categoryId}/${guess.itemId}` : undefined,
              message: guess ? undefined : '已保存，请在文件列表中手动分类'
            })
          }
        } else {
          results.push({ filename: file.name, status: 'error', message: data.error })
        }
      } catch (err) {
        results.push({ filename: file.name, status: 'error', message: err instanceof DOMException && err.name === 'AbortError' ? '上传超时(120s)' : '上传失败' })
      }
    }
    
    return results
  }

  // 批量上传文件（并行上传，限制并发数为3）
  const handleBatchUpload = async () => {
    if (!selectedProject || batchFiles.length === 0) return
    
    setBatchUploading(true)
    const allResults: {filename: string; status: string; category?: string; categoryName?: string; message?: string}[] = []
    const totalFiles = batchFiles.length
    const CONCURRENT_LIMIT = 3 // 并发上传数
    
    // 初始化进度
    setUploadProgress({
      current: 0,
      total: totalFiles,
      currentFileName: batchFiles[0]?.file.name || '',
      completedFiles: [],
      failedFiles: []
    })
    
    // 使用信号量控制并发
    let completedCount = 0
    const uploadQueue = [...batchFiles]
    const activeUploads: Promise<void>[] = []
    
    const processFile = async (fwp: FileWithPath, index: number) => {
      setUploadProgress(prev => ({
        ...prev,
        currentFileName: fwp.relativePath,
      }))
      
      const results = await uploadSingleFile(fwp, selectedProject.project_id)
      
      allResults.push(...results)
      completedCount++
      
      const hasError = results.some(r => r.status === 'error')
      setUploadProgress(prev => ({
        ...prev,
        current: completedCount,
        completedFiles: hasError ? prev.completedFiles : [...prev.completedFiles, fwp.file.name],
        failedFiles: hasError && !results.some(r => r.status === 'duplicate') ? [...prev.failedFiles, fwp.file.name] : prev.failedFiles
      }))
      
      // 实时更新结果（让用户看到进度）
      setUploadResults([...allResults])
    }
    
    // 并行处理文件
    let fileIndex = 0
    while (fileIndex < uploadQueue.length || activeUploads.length > 0) {
      while (activeUploads.length < CONCURRENT_LIMIT && fileIndex < uploadQueue.length) {
        const fwp = uploadQueue[fileIndex]
        const currentIndex = fileIndex
        const uploadPromise = processFile(fwp, currentIndex).then(() => {
          // 从活动列表中移除
          const idx = activeUploads.indexOf(uploadPromise)
          if (idx > -1) activeUploads.splice(idx, 1)
        })
        activeUploads.push(uploadPromise)
        fileIndex++
      }
      
      // 等待任意一个上传完成
      if (activeUploads.length > 0) {
        await Promise.race(activeUploads)
      }
    }
    
    setUploadResults(allResults)
    setShowResults(true)
    setBatchUploading(false)
    
    // 刷新状态
    await loadMaterialStatus(selectedProject.project_id)
  }

  // 关闭批量上传
  const closeBatchUpload = () => {
    setBatchUploadOpen(false)
    setBatchFiles([])
    setUploadResults([])
    setShowResults(false)
    setUploadProgress({ current: 0, total: 0, currentFileName: '', completedFiles: [], failedFiles: [] })
  }

  // 初始化
  useEffect(() => {
    const initPage = async () => {
      await loadProjects()
      await loadFormTemplates()
    }
    initPage()
  }, [loadProjects, loadFormTemplates])
  
  // 当项目列表加载完成且URL中有项目ID时，自动选择该项目
  useEffect(() => {
    if (projectIdFromUrl && projects.length > 0 && !selectedProject) {
      const targetProject = projects.find(p => p.project_id === projectIdFromUrl)
      if (targetProject) {
        selectProject(targetProject)
      }
    }
  }, [projectIdFromUrl, projects, selectedProject])

  // 渲染项目选择视图
  const renderProjectSelection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">选择项目</h2>
          <p className="text-muted-foreground mt-1">选择一个项目开始收集材料</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          创建新项目
        </Button>
      </div>
      
      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无项目</h3>
          <p className="text-muted-foreground mb-4">创建一个新项目开始收集GTV签证申请材料</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建第一个项目
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Card 
              key={project.project_id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => selectProject(project)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {project.client_name}
                </CardTitle>
                <CardDescription>
                  {project.visa_type} · {formatDate(project.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                    {project.status === 'created' ? '进行中' : project.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  // 将扁平文件列表构建为树形结构
  const buildFileTree = useCallback((files: MaterialFile[]): TreeNode[] => {
    const root: TreeNode = { name: '', fullPath: '', isFolder: true, children: [] }
    
    for (const file of files) {
      const pathStr = file.source_path || file.file_name
      const parts = pathStr.split('/').filter(Boolean)
      let current = root
      
      for (let i = 0; i < parts.length; i++) {
        const isLast = i === parts.length - 1
        if (isLast) {
          current.children.push({
            name: parts[i],
            fullPath: pathStr,
            isFolder: false,
            children: [],
            file,
          })
        } else {
          const folderPath = parts.slice(0, i + 1).join('/')
          let folder = current.children.find(c => c.isFolder && c.name === parts[i])
          if (!folder) {
            folder = { name: parts[i], fullPath: folderPath, isFolder: true, children: [] }
            current.children.push(folder)
          }
          current = folder
        }
      }
    }
    
    // 排序：文件夹在前，文件在后，各自按名称排序
    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
        return a.name.localeCompare(b.name, 'zh-CN')
      })
      nodes.forEach(n => { if (n.isFolder) sortTree(n.children) })
    }
    sortTree(root.children)
    
    return root.children
  }, [])

  // 统计文件夹下的文件数量
  const countFiles = (node: TreeNode): number => {
    if (!node.isFolder) return 1
    return node.children.reduce((sum, child) => sum + countFiles(child), 0)
  }

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const expandAllFolders = useCallback((files: MaterialFile[]) => {
    const paths = new Set<string>()
    for (const file of files) {
      const parts = (file.source_path || file.file_name).split('/').filter(Boolean)
      for (let i = 1; i < parts.length; i++) {
        paths.add(parts.slice(0, i).join('/'))
      }
    }
    setExpandedFolders(paths)
  }, [])

  const collapseAllFolders = useCallback(() => {
    setExpandedFolders(new Set())
  }, [])

  // 渲染材料收集视图
  const renderMaterialCollection = () => {
    if (!selectedProject) return null
    
    // 如果 progress 为空，使用默认值
    const currentProgress = progress || {
      overall_progress: 0,
      collected_items: 0,
      total_items: 0,
      required_progress: 0,
      required_collected: 0,
      required_items: 0
    }
    
    const sortedCategories = Object.entries(categories).sort((a, b) => a[1].order - b[1].order)
    
    return (
      <div className="space-y-6">
        {/* 简化头部 */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="font-bold text-lg">{selectedProject.client_name}</span>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => loadMaterialStatus(selectedProject.project_id)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 两步工作流 */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* 步骤1：下载材料包 */}
          <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 font-bold text-lg">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">下载材料包发给客户</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    包含材料清单（Word格式）和所有采集表模板，发送给客户填写
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={downloadWordChecklist}>
                      <FileText className="h-4 w-4 mr-2" />
                      下载材料清单
                    </Button>
                    <Button variant="outline" onClick={downloadAllTemplates}>
                      <Download className="h-4 w-4 mr-2" />
                      下载采集表模板
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 步骤2：批量上传 */}
          <Card className="border-2 border-dashed border-green-300 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 text-green-600 font-bold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">客户材料打包上传</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    收到客户材料后，一次性批量上传，系统自动识别归类
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => setBatchUploadOpen(true)} className="bg-green-600 hover:bg-green-700">
                      <Upload className="h-4 w-4 mr-2" />
                      批量上传材料
                    </Button>
                    {uploadedFiles.length > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setShowFileManager(true)}
                        className="border-green-500 text-green-600 hover:bg-green-50"
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        管理已上传文件 ({uploadedFiles.length})
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 已上传文件列表 - 可展开 */}
        {/* 已上传文件管理面板 - 始终显示 */}
        <Card className="mb-6 border-2 border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-600" />
                已上传文件管理
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  {uploadedFiles.length} 个文件
                </Badge>
                {filterTag && filterTag !== '__all__' && (
                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                    已过滤: {uploadedFiles.filter((file) => {
                      const tags = fileTagging[file.id] || []
                      if (filterTag === '__untagged__') return tags.length === 0
                      const [catId, itemId] = filterTag.split('|')
                      return tags.some(t => t.categoryId === catId && t.itemId === itemId)
                    }).length} 个
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => selectedProject && loadMaterialStatus(selectedProject.project_id)}
                  title="刷新文件列表"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFileManager(!showFileManager)}
                >
                  {showFileManager ? (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      收起列表
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      查看文件
                    </>
                  )}
                </Button>
                {uploadedFiles.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    清空全部
                  </Button>
                )}
              </div>
            </div>
            {!showFileManager && uploadedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                点击"查看文件"可以查看所有已上传的文件，并为每个文件选择正确的分类标签
              </p>
            )}
            {uploadedFiles.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                暂无已上传的文件，请使用"批量上传材料"上传客户材料
              </p>
            )}
          </CardHeader>
          
          {showFileManager && (
            <CardContent className="pt-0">
              {uploadedFiles.length === 0 ? (
                <div className="border rounded-lg p-8 text-center bg-background">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无已上传的文件</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    请先使用"批量上传材料"上传客户材料
                  </p>
                </div>
              ) : (
              <>
              {/* 过滤器 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">按标签过滤:</span>
                </div>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="全部文件" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部文件</SelectItem>
                    <SelectItem value="__untagged__" className="text-red-600">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        未分类文件
                      </span>
                    </SelectItem>
                    {getCategoryOptions().map((cat) => (
                      <div key={cat.value}>
                        <div className={`px-2 py-1 text-xs font-semibold ${getCategoryColor(cat.value)}`}>
                          {cat.label}
                        </div>
                        {cat.items.map((item) => (
                          <SelectItem 
                            key={`${cat.value}|${item.value}`} 
                            value={`${cat.value}|${item.value}`}
                            className="pl-4"
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {filterTag && filterTag !== '__all__' && (
                  <Button variant="ghost" size="sm" onClick={() => setFilterTag('__all__')}>
                    <X className="h-4 w-4 mr-1" />
                    清除过滤
                  </Button>
                )}
              </div>

              {/* 展开/折叠全部 */}
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => expandAllFolders(uploadedFiles)}>
                  <ChevronDown className="h-3 w-3 mr-1" /> 全部展开
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={collapseAllFolders}>
                  <ChevronRight className="h-3 w-3 mr-1" /> 全部折叠
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden bg-background">
                {/* 表头 */}
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
                  <div className="col-span-4">文件名</div>
                  <div className="col-span-1">大小</div>
                  <div className="col-span-3">分类标签</div>
                  <div className="col-span-2">上传时间</div>
                  <div className="col-span-2">操作</div>
                </div>
                
                {/* 文件树 */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                  {(() => {
                    const filteredFiles = uploadedFiles.filter((file) => {
                      if (!filterTag || filterTag === '__all__') return true
                      const tags = fileTagging[file.id] || []
                      if (filterTag === '__untagged__') return tags.length === 0
                      const [catId, itemId] = filterTag.split('|')
                      return tags.some(t => t.categoryId === catId && t.itemId === itemId)
                    })
                    const tree = buildFileTree(filteredFiles)
                    const categoryOptions = getCategoryOptions()
                    
                    const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
                      const paddingLeft = depth * 20
                      
                      if (node.isFolder) {
                        const isExpanded = expandedFolders.has(node.fullPath)
                        const fileCount = countFiles(node)
                        return (
                          <div key={`folder-${node.fullPath}`}>
                            <div
                              className="flex items-center gap-2 p-2 border-b cursor-pointer hover:bg-muted/30 select-none"
                              style={{ paddingLeft: `${paddingLeft + 8}px` }}
                              onClick={() => toggleFolder(node.fullPath)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              {isExpanded ? (
                                <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                              ) : (
                                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                              )}
                              <span className="text-sm font-medium truncate">{node.name}</span>
                              <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                                {fileCount} 个文件
                              </Badge>
                            </div>
                            {isExpanded && node.children.map(child => renderTreeNode(child, depth + 1))}
                          </div>
                        )
                      }
                      
                      // 文件节点
                      const file = node.file!
                      const currentTags = fileTagging[file.id] || []
                      
                      return (
                        <div
                          key={`file-${file.id}`}
                          className="grid grid-cols-12 gap-2 p-2 border-b last:border-0 items-center hover:bg-muted/30"
                          style={{ paddingLeft: `${paddingLeft + 8}px` }}
                        >
                          {/* 文件名 */}
                          <div className="col-span-4 flex items-center gap-2 min-w-0">
                            <span className="w-4 shrink-0" />
                            {getFileIcon(file.file_type)}
                            <span className="truncate text-sm" title={file.file_name}>
                              {file.file_name}
                            </span>
                          </div>

                          {/* 大小 */}
                          <div className="col-span-1 text-sm text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </div>
                          
                          {/* 分类标签 */}
                          <div className="col-span-3">
                            <div className="flex flex-wrap gap-1 items-center">
                              {savingTagFileId === file.id && (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              )}
                              {currentTags && currentTags.length > 0 ? (() => {
                                const tag = currentTags[0]
                                const catInfo = categories[tag.categoryId]
                                const itemInfo = catInfo?.items?.find((i: any) => i.item_id === tag.itemId)
                                return (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs flex items-center gap-1 border ${getCategoryColor(tag.categoryId, tag.itemId)}`}
                                  >
                                    {itemInfo?.name || tag.itemId}
                                    <X 
                                      className={`h-3 w-3 cursor-pointer hover:text-red-500 ${savingTagFileId === file.id ? 'pointer-events-none opacity-50' : ''}`}
                                      onClick={() => removeFileTag(file.id, tag.categoryId, tag.itemId)}
                                    />
                                  </Badge>
                                )
                              })() : (
                                <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                                  未分类
                                </Badge>
                              )}
                              <Select
                                value={currentTags && currentTags.length > 0 ? `${currentTags[0].categoryId}|${currentTags[0].itemId}` : ''}
                                onValueChange={(value) => {
                                  const [catId, itemId] = value.split('|')
                                  updateFileTag(file.id, catId, itemId)
                                }}
                                disabled={savingTagFileId === file.id}
                              >
                                <SelectTrigger className="h-6 w-auto px-2 border-dashed text-xs">
                                  {currentTags && currentTags.length > 0 ? <Edit3 className="h-3 w-3" /> : <Plus className="h-3 w-3 mr-1" />}
                                  {(!currentTags || currentTags.length === 0) && <span>选择分类</span>}
                                </SelectTrigger>
                                <SelectContent>
                                  {categoryOptions.map((cat) => (
                                    <div key={cat.value}>
                                      <div className={`px-2 py-1 text-xs font-semibold ${getCategoryColor(cat.value)}`}>
                                        {cat.label}
                                      </div>
                                      {cat.items.map((item) => (
                                        <SelectItem 
                                          key={`${cat.value}|${item.value}`} 
                                          value={`${cat.value}|${item.value}`}
                                          className="text-xs pl-4"
                                        >
                                          {item.label}
                                        </SelectItem>
                                      ))}
                                    </div>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* 上传时间 */}
                          <div className="col-span-2 text-xs text-muted-foreground">
                            {formatDate(file.uploaded_at)}
                          </div>
                          
                          {/* 操作 */}
                          <div className="col-span-2 flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => { setPreviewingFile(file); setPreviewOpen(true) }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>预览</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" size="icon" 
                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => deleteFile(file.id)}
                                    disabled={deletingFile === file.id}
                                  >
                                    {deletingFile === file.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>删除</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      )
                    }
                    
                    return tree.map(node => renderTreeNode(node))
                  })()}
                </div>
              </div>
                
              {/* 提示信息 */}
              <div className="flex items-center mt-4 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mr-1" />
                选择分类后点击保存，文件将归类到对应的材料项
              </div>
              </>
              )}
            </CardContent>
          )}
        </Card>
        
        {/* 收集进度概览 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">总进度</span>
                <Progress value={currentProgress.overall_progress} className="w-32 h-2" />
                <span className="font-bold">{currentProgress.overall_progress}%</span>
                <span className="text-sm text-muted-foreground">({currentProgress.collected_items}/{currentProgress.total_items})</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">必填项</span>
                <Progress value={currentProgress.required_progress} className="w-32 h-2" />
                <Badge variant={currentProgress.required_progress === 100 ? "default" : "destructive"}>
                  {currentProgress.required_collected}/{currentProgress.required_items}
                </Badge>
                {currentProgress.required_progress < 100 && (
                  <span className="text-sm text-red-600">还差 {currentProgress.required_items - currentProgress.required_collected} 项</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 紧凑多宫格布局 */}
        <div className="space-y-4">
          {sortedCategories.map(([categoryId, category]) => {
            const collectedCount = category.items.filter(i => i.status === 'collected').length
            const requiredCount = category.items.filter(i => i.required).length
            const requiredCollected = category.items.filter(i => i.required && i.status === 'collected').length
            const categoryProgress = Math.round((collectedCount / category.items.length) * 100)
            const isRepeatable = category.is_repeatable
            
            return (
              <div key={categoryId} className="border rounded-lg overflow-hidden">
                {/* 分类标题栏 */}
                <div className="bg-muted/50 px-4 py-2 flex items-center gap-3 border-b">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{category.name}</span>
                      {isRepeatable && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          可添加多{category.repeat_label || '条'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={categoryProgress} className="w-16 h-1.5" />
                    <span className="text-xs text-muted-foreground">{collectedCount}/{category.items.length}</span>
                    {requiredCollected < requiredCount && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">
                        差{requiredCount - requiredCollected}
                      </Badge>
                    )}
                    {isRepeatable && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        添加{category.repeat_label || ''}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* 材料项网格 - 更紧凑 */}
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-px bg-border">
                  {category.items.map(item => (
                    <div 
                      key={item.item_id} 
                      className={`bg-background p-2 flex flex-col min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors relative group ${
                        item.status === 'collected' ? 'bg-green-50 dark:bg-green-950/20' : ''
                      }`}
                      onClick={() => {
                        setCurrentItem({ categoryId, item })
                      }}
                    >
                      {/* 状态指示器 */}
                      <div className="absolute top-1 right-1">
                        {item.status === 'collected' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : item.required ? (
                          <Circle className="h-4 w-4 text-red-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </div>
                      
                      {/* 材料名称 */}
                      <h4 className="text-xs font-medium leading-tight line-clamp-2 pr-5">{item.name}</h4>
                      
                      {/* 底部信息 */}
                      <div className="mt-auto pt-1">
                        {item.files && item.files.length > 0 ? (
                          <span className="text-[10px] text-green-600">{item.files.length}个文件</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {item.has_form ? '表单' : '上传'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 详情弹窗 - 点击格子时显示 */}
        <Dialog open={!!currentItem && !uploadDialogOpen && !formDialogOpen} onOpenChange={() => setCurrentItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {currentItem?.item.status === 'collected' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                {currentItem?.item.name}
              </DialogTitle>
              <DialogDescription>{currentItem?.item.description}</DialogDescription>
            </DialogHeader>
            
            {currentItem && (
              <div className="space-y-4">
                {/* 提示信息 */}
                {currentItem.item.tips && (
                  <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-3 rounded">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{currentItem.item.tips}</span>
                  </div>
                )}
                
                {/* 已上传文件 */}
                {currentItem.item.files && currentItem.item.files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">已上传文件（{currentItem.item.files.length}个）：</p>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {currentItem.item.files.map(file => (
                        <div key={file.id} className="flex items-center gap-2 text-sm bg-muted rounded p-2 hover:bg-muted/80">
                          {getFileIcon(file.file_type)}
                          <span className="flex-1 truncate" title={file.file_name}>{file.file_name}</span>
                          <span className="text-muted-foreground text-xs">{formatFileSize(file.file_size)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handlePreviewFile(file)}
                            title="预览"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteFile(file.id)}
                            title="删除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 操作按钮 */}
                <div className="flex gap-2 flex-wrap">
                  {currentItem.item.has_form && currentItem.item.form_type && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFormTemplate(currentItem.item.form_type!)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        下载模板
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openFormDialog(currentItem.categoryId, currentItem.item)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        在线填写
                      </Button>
                    </>
                  )}
                  
                  {currentItem.item.file_types && currentItem.item.file_types.length > 0 && (
                    <Button
                      variant={currentItem.item.has_form ? "outline" : "default"}
                      size="sm"
                      onClick={() => openUploadDialog(currentItem.categoryId, currentItem.item)}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      上传文件
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 获取当前表单模板
  const currentFormTemplate = currentItem?.item.form_type ? formTemplates[currentItem.item.form_type] : null

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            原始材料收集
          </h1>
          <p className="text-muted-foreground mt-2">
            系统性地收集和管理GTV签证申请所需的原始材料
          </p>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* 加载状态 */}
        {loading && !selectedProject ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : selectedProject ? (
          renderMaterialCollection()
        ) : (
          renderProjectSelection()
        )}
      </main>
      
      <Footer />
      
      {/* 创建项目对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
            <DialogDescription>输入客户姓名创建新的材料收集项目</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="clientName">客户姓名</Label>
            <Input
              id="clientName"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="请输入客户姓名"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button onClick={createProject} disabled={!newProjectName.trim() || creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 上传对话框 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>上传材料: {currentItem?.item.name}</DialogTitle>
            <DialogDescription>{currentItem?.item.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 文件选择 */}
            <div>
              <Label>选择文件</Label>
              <div 
                className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  点击或拖拽文件到此处上传
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  支持格式: {currentItem?.item.file_types?.join(', ')}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple={currentItem?.item.multiple}
                accept={currentItem?.item.file_types?.map(t => `.${t}`).join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* 已选择文件列表 */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>已选择 {selectedFiles.length} 个文件</Label>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-muted rounded p-2">
                    {getFileIcon(file.name.split('.').pop() || '')}
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeSelectedFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* 描述 */}
            <div>
              <Label htmlFor="description">备注说明（可选）</Label>
              <Input
                id="description"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="添加备注说明..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>取消</Button>
            <Button onClick={uploadFiles} disabled={selectedFiles.length === 0 || uploading}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              上传 {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 表单对话框 */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{currentFormTemplate?.title || currentItem?.item.name}</DialogTitle>
            <DialogDescription>{currentFormTemplate?.description}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {currentFormTemplate?.fields.map(field => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="mt-2"
                      rows={4}
                    />
                  ) : field.type === 'select' && field.options ? (
                    <Select
                      value={formData[field.name] || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type === 'url' ? 'url' : 'text'}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="mt-2"
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>取消</Button>
            <Button onClick={saveForm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存表单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 批量上传对话框 */}
      <Dialog open={batchUploadOpen} onOpenChange={(open) => !open && closeBatchUpload()}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[85vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              批量上传客户材料
            </DialogTitle>
            <DialogDescription>
              选择客户发来的所有文件，系统将自动识别并归类
            </DialogDescription>
          </DialogHeader>
          
          {!showResults ? (
            <>
              {/* 文件选择区域 - 可滚动 */}
              <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-0">
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">拖拽文件或文件夹到此处</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    支持拖入整个文件夹，自动保留目录结构信息
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                      <FolderPlus className="h-4 w-4 mr-1" />
                      选择文件夹
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => batchFileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      选择文件
                    </Button>
                  </div>
                </div>
                <input
                  ref={batchFileInputRef}
                  type="file"
                  multiple
                  onChange={handleBatchFileSelect}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  {...({ webkitdirectory: "true", directory: "" } as any)}
                  multiple
                  onChange={handleFolderSelect}
                  className="hidden"
                />
                
                {/* 文件列表 */}
                {batchFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>已选择 {batchFiles.length} 个文件</Label>
                      <Button variant="ghost" size="sm" onClick={() => setBatchFiles([])}>
                        清空
                      </Button>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto border rounded p-2">
                      {batchFiles.map((fwp, index) => {
                        const isZip = fwp.file.name.toLowerCase().endsWith('.zip')
                        const guess = !isZip ? guessFileCategory(fwp.file.name, fwp.relativePath) : null
                        const hasPath = fwp.relativePath !== fwp.file.name
                        return (
                          <div key={index} className={`flex items-center gap-2 text-sm py-1.5 border-b last:border-0 ${isZip ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                            {isZip ? (
                              <FolderArchive className="h-4 w-4 text-blue-600 shrink-0" />
                            ) : hasPath ? (
                              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              getFileIcon(fwp.file.name.split('.').pop() || '')
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="truncate block" title={fwp.relativePath}>
                                {hasPath ? fwp.relativePath : fwp.file.name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(fwp.file.size)}</span>
                            {isZip ? (
                              <Badge className="text-xs bg-blue-600 shrink-0">自动解压</Badge>
                            ) : guess ? (
                              <Badge variant="secondary" className="text-xs shrink-0">可识别</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs shrink-0">待确认</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => removeBatchFile(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* 识别说明 */}
                <div className="bg-muted/50 rounded p-2 text-sm space-y-2">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <FolderOpen className="h-4 w-4" />
                    <span className="font-medium text-xs">支持上传整个文件夹，自动保留目录结构信息用于智能分类</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <FolderArchive className="h-4 w-4" />
                    <span className="font-medium text-xs">支持上传zip压缩包，系统自动解压并分析每个文件</span>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-xs text-muted-foreground">文件命名建议（方便自动识别）：</p>
                    <div className="grid grid-cols-2 gap-1 text-muted-foreground text-xs">
                      <span>• 简历.pdf / CV.docx</span>
                      <span>• 护照.pdf / passport.jpg</span>
                      <span>• 学历证书.pdf / 毕业证.jpg</span>
                      <span>• 专利证书.pdf / patent.pdf</span>
                      <span>• 就职信息采集表.docx</span>
                      <span>• 推荐人1简历.pdf</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 上传进度显示 */}
              {batchUploading && uploadProgress.total > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      正在上传 ({uploadProgress.current}/{uploadProgress.total})
                    </span>
                    <span className="text-sm text-blue-600">
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                    </span>
                  </div>
                  
                  {/* 进度条 */}
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {/* 当前文件 */}
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-muted-foreground truncate">
                      {uploadProgress.currentFileName}
                    </span>
                  </div>
                  
                  {/* 实时结果摘要 */}
                  {uploadResults.length > 0 && (
                    <div className="flex items-center gap-4 text-xs pt-2 border-t border-blue-200">
                      <span className="text-green-600">
                        ✓ {uploadResults.filter(r => r.status === 'success').length} 成功
                      </span>
                      {uploadResults.filter(r => r.status === 'duplicate').length > 0 && (
                        <span className="text-blue-500">
                          ≡ {uploadResults.filter(r => r.status === 'duplicate').length} 重复跳过
                        </span>
                      )}
                      {uploadResults.filter(r => r.status === 'unrecognized').length > 0 && (
                        <span className="text-yellow-600">
                          ⚠ {uploadResults.filter(r => r.status === 'unrecognized').length} 待分类
                        </span>
                      )}
                      {uploadResults.filter(r => r.status === 'error').length > 0 && (
                        <span className="text-red-600">
                          ✗ {uploadResults.filter(r => r.status === 'error').length} 失败
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* 底部按钮 - 固定 */}
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button variant="outline" onClick={closeBatchUpload} disabled={batchUploading}>
                  取消
                </Button>
                <Button 
                  onClick={handleBatchUpload} 
                  disabled={batchFiles.length === 0 || batchUploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {batchUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {batchUploading ? '上传中...' : `开始上传 (${batchFiles.length} 个文件)`}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* 上传结果 - 可滚动 */}
              <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">
                      {uploadResults.filter(r => r.status === 'success').length} 个成功
                    </span>
                  </div>
                  {uploadResults.filter(r => r.status === 'duplicate').length > 0 && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">
                        {uploadResults.filter(r => r.status === 'duplicate').length} 个重复跳过
                      </span>
                    </div>
                  )}
                  {uploadResults.filter(r => r.status === 'unrecognized').length > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">
                        {uploadResults.filter(r => r.status === 'unrecognized').length} 个未识别
                      </span>
                    </div>
                  )}
                  {uploadResults.filter(r => r.status === 'error').length > 0 && (
                    <div className="flex items-center gap-2">
                      <X className="h-5 w-5 text-red-600" />
                      <span className="font-medium">
                        {uploadResults.filter(r => r.status === 'error').length} 个失败
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="max-h-[250px] overflow-y-auto border rounded p-2">
                  {uploadResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : result.status === 'duplicate' ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : result.status === 'unrecognized' ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span className="flex-1 truncate">{result.filename}</span>
                      {result.status === 'success' && result.category && (
                        <Badge variant="secondary" className="text-xs">{result.category}</Badge>
                      )}
                      {result.status === 'duplicate' && (
                        <span className="text-xs text-blue-500">{result.message || '文件已存在，跳过'}</span>
                      )}
                      {result.status === 'unrecognized' && (
                        <span className="text-xs text-orange-600">已保存，待分类</span>
                      )}
                      {result.status === 'error' && result.message && (
                        <span className="text-xs text-red-600">{result.message}</span>
                      )}
                    </div>
                  ))}
                </div>
                
                {uploadResults.filter(r => r.status === 'unrecognized').length > 0 && (
                  <Alert className="py-2 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm text-orange-800">
                      未识别的文件已保存！请在"已上传文件管理"列表中为这些文件手动添加分类标签
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* 底部按钮 - 固定 */}
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button onClick={closeBatchUpload}>完成</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 统一文件预览组件 */}
      <UnifiedFilePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewingFile}
      />
      
      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              确认删除全部文件
            </DialogTitle>
            <DialogDescription>
              此操作将删除该项目下的所有已上传文件（共 {uploadedFiles.length} 个），删除后无法恢复。确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <p className="text-sm text-red-800">
              <strong>警告：</strong>删除后，所有文件的分类信息也将丢失，需要重新上传和分类。
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deletingAll}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteAllFiles}
              disabled={deletingAll}
            >
              {deletingAll && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除全部
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 导出带 Suspense 包装的组件，以正确处理 useSearchParams
export default function MaterialCollectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <MaterialCollectionContent />
    </Suspense>
  )
}
