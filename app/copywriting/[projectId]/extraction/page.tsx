"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, FileText, Search, RefreshCw, Download, Eye, Filter, Clock, File, 
  History, AlertCircle, CheckCircle, Loader2, Settings, Copy, ChevronDown, 
  ChevronRight, Target, Award, Users, Lightbulb, BookOpen, Tag, TrendingUp,
  ExternalLink, Layers, Star, Briefcase, GraduationCap, UserCheck, Trash2, 
  Edit, Plus, Save, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"
import { UnifiedFilePreview, PreviewFile } from "@/components/unified-file-preview"

// 使用代理路由避免 CORS 问题
const API_BASE = "/api/copywriting"

interface ContentBlock {
  id: number
  content: string
  content_preview: string
  source_file: string
  source_type: string
  source_page: number | null
  source_section: string | null
  content_type: string
  word_count: number
  extracted_at: string
  citation: string
}

interface ProjectContext {
  context: string
  total_files: number
  total_blocks: number
  last_updated: string
}

interface ContentOutline {
  applicant_profile?: {
    name?: string
    current_position?: string
    domain?: string
    experience_years?: string
  }
  file_summaries?: Array<{
    filename: string
    type?: string
    content_type?: string
    summary: string
    key_points?: string[]
    relevance?: string
  }>
  keywords?: string[]
  career_timeline?: Array<{
    period: string
    event: string
  }>
  achievement_categories?: {
    leadership?: string[]
    innovation?: string[]
    recognition?: string[]
    academic?: string[]
  }
  evidence_coverage?: {
    MC标准覆盖?: Record<string, string>
    OC标准覆盖?: Record<string, string>
  }
  material_gaps?: string[]
  overall_assessment?: string
  generated_at?: string
  total_files?: number
  ai_generated?: boolean
}

// 内容分类项
interface ClassificationItem {
  id?: number
  content: string
  source_file: string
  source_page: number | null
  relevance_score: number
  evidence_type: string
  key_points: string[]
  subject_person?: 'applicant' | 'recommender' | 'other'  // 信息主体
}

// 分类进度
interface ClassificationProgress {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  total_contents: number
  processed_contents: number
  current_batch: number
  total_batches: number
  total_classified: number
  progress_percent: number
  error?: string
}

// 子类别
interface SubcategoryData {
  name: string
  description: string
  items: ClassificationItem[]
}

// 分类数据
interface ClassificationData {
  name: string
  subcategories: Record<string, SubcategoryData>
}

// 分类统计
interface ClassificationSummary {
  name: string
  total: number
  subcategories: Record<string, { name: string; count: number; avg_score: number }>
}

export default function ExtractionPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null)
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [projectInfo, setProjectInfo] = useState<any>(null)
  
  // 内容大纲
  const [outline, setOutline] = useState<ContentOutline | null>(null)
  const [loadingOutline, setLoadingOutline] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["profile", "files", "keywords", "coverage"])
  )

  // 内容分类
  const [classifications, setClassifications] = useState<Record<string, ClassificationData>>({})
  const [classificationSummary, setClassificationSummary] = useState<Record<string, ClassificationSummary>>({})
  const [loadingClassifications, setLoadingClassifications] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["MC", "OC", "RECOMMENDER"]))
  const [selectedClassification, setSelectedClassification] = useState<ClassificationItem | null>(null)
  
  // 分类进度
  const [classificationProgress, setClassificationProgress] = useState<ClassificationProgress | null>(null)
  const classifyPollingRef = useRef<NodeJS.Timeout | null>(null)
  
  // 编辑分类
  const [editingItem, setEditingItem] = useState<ClassificationItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newClassification, setNewClassification] = useState({
    category: 'MC',
    subcategory: 'mc1_product_leadership',
    content: '',
    source_file: '',
    evidence_type: '',
    key_points: ''
  })

  // 提取日志轮询
  const [extractionLogs, setExtractionLogs] = useState<any[]>([])
  const logPollingRef = useRef<NodeJS.Timeout | null>(null)

  // 文件预览
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // 数据清理
  const [clearing, setClearing] = useState(false)

  // 获取项目文件列表（从多个API端点获取）
  const fetchProjectFiles = useCallback(async () => {
    try {
      let allFiles: any[] = []
      
      // 1. 从 materials API 获取
      try {
        const response1 = await fetch(`${API_BASE}/api/projects/${projectId}/materials`)
        const data1 = await response1.json()
        if (data1.success && data1.data) {
          if (Array.isArray(data1.data)) {
            allFiles.push(...data1.data)
          } else {
            Object.values(data1.data).forEach((categoryFiles: any) => {
              if (Array.isArray(categoryFiles)) {
                allFiles.push(...categoryFiles)
              }
            })
          }
        }
      } catch (e) {
        console.warn("从materials获取文件失败:", e)
      }
      
      // 2. 从 material-collection API 获取
      try {
        const response2 = await fetch(`${API_BASE}/api/projects/${projectId}/material-collection`)
        const data2 = await response2.json()
        if (data2.success && data2.data?.categories) {
          const categories = data2.data.categories
          Object.values(categories).forEach((category: any) => {
            if (category.items) {
              category.items.forEach((item: any) => {
                if (item.files && Array.isArray(item.files)) {
                  allFiles.push(...item.files)
                }
              })
            }
          })
        }
      } catch (e) {
        console.warn("从material-collection获取文件失败:", e)
      }
      
      // 去重并统一格式
      const seenIds = new Set<number>()
      const files = allFiles
        .filter((f: any) => {
          if (!f.id || seenIds.has(f.id)) return false
          seenIds.add(f.id)
          return true
        })
        .map((f: any) => {
          const fileName = f.file_name || f.name || f.filename || ''
          const fileType = f.file_type || fileName.split('.').pop()?.toLowerCase() || ''
          return {
            id: f.id,
            file_name: fileName,
            file_type: fileType,
            file_size: f.file_size || f.size,
            file_path: f.file_path || f.path
          }
        })
      
      setProjectFiles(files)
    } catch (error) {
      console.error("获取项目文件失败:", error)
    }
  }, [projectId])

  // 打开文件预览
  // 打开文件预览（使用 useCallback 确保引用最新的 projectFiles）
  const openFilePreview = useCallback((fileName: string) => {
    console.log("openFilePreview called with:", fileName, "files:", projectFiles.length)
    
    if (!fileName) {
      toast.warning("未关联源文件")
      return
    }
    
    const file = projectFiles.find(f => {
      const fName = f.file_name || ''
      return fName === fileName || 
             fName.includes(fileName) ||
             fileName.includes(fName) ||
             fName.split('/').pop() === fileName.split('/').pop()
    })
    
    if (file) {
      setPreviewFile({
        id: file.id,
        file_name: file.file_name,
        file_type: file.file_type || file.file_name?.split('.').pop() || '',
        file_size: file.file_size
      })
      setPreviewOpen(true)
    } else {
      toast.warning(`未找到文件: ${fileName}`)
    }
  }, [projectFiles])

  // 获取项目信息
  const fetchProjectInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}`)
      const data = await response.json()
      if (data.success) {
        setProjectInfo(data.data)
      }
    } catch (error) {
      console.error("获取项目信息失败:", error)
    }
  }, [projectId])

  // 获取内容块列表
  const fetchContentBlocks = useCallback(async () => {
    try {
      setLoading(true)
      const url = filterType === "all" 
        ? `${API_BASE}/api/projects/${projectId}/content-blocks`
        : `${API_BASE}/api/projects/${projectId}/content-blocks?content_type=${filterType}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setContentBlocks(data.data || [])
      }
    } catch (error) {
      console.error("获取内容块失败:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, filterType])

  // 获取项目上下文
  const fetchProjectContext = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/context?with_sources=true`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setProjectContext(data.data)
      }
    } catch (error) {
      console.error("获取上下文失败:", error)
    }
  }, [projectId])

  // 获取内容大纲
  const fetchOutline = useCallback(async () => {
    try {
      setLoadingOutline(true)
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/outline`)
      const data = await response.json()
      
      if (data.success && data.data?.outline) {
        setOutline(data.data.outline)
      }
    } catch (error) {
      console.error("获取大纲失败:", error)
    } finally {
      setLoadingOutline(false)
    }
  }, [projectId])

  // 获取分类结果
  const fetchClassifications = useCallback(async () => {
    try {
      setLoadingClassifications(true)
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/classifications`)
      const data = await response.json()
      
      if (data.success && data.data?.classifications) {
        setClassifications(data.data.classifications)
      }
    } catch (error) {
      console.error("获取分类失败:", error)
    } finally {
      setLoadingClassifications(false)
    }
  }, [projectId])

  // 获取分类统计
  const fetchClassificationSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/classification-summary`)
      const data = await response.json()
      
      if (data.success && data.data?.summary) {
        setClassificationSummary(data.data.summary)
      }
    } catch (error) {
      console.error("获取分类统计失败:", error)
    }
  }, [projectId])

  // 分类进度轮询
  const startClassifyPolling = useCallback(() => {
    if (classifyPollingRef.current) {
      clearInterval(classifyPollingRef.current)
    }
    
    classifyPollingRef.current = setInterval(async () => {
      try {
        // 获取进度
        const progressRes = await fetch(`${API_BASE}/api/projects/${projectId}/classification-progress`)
        const progressData = await progressRes.json()
        if (progressData.success) {
          setClassificationProgress(progressData.data)
          
          // 如果完成或失败，停止轮询
          if (progressData.data.status === 'completed' || progressData.data.status === 'failed') {
            stopClassifyPolling()
            setClassifying(false)
            
            if (progressData.data.status === 'completed') {
              toast.success(`分类完成！共分类 ${progressData.data.total_classified} 条内容`)
            } else {
              toast.error(progressData.data.error || "分类失败")
            }
          }
        }
        
        // 实时刷新分类数据
        await fetchClassifications()
        await fetchClassificationSummary()
        
      } catch (error) {
        console.error("轮询分类进度失败:", error)
      }
    }, 2000)
  }, [projectId, fetchClassifications, fetchClassificationSummary])

  const stopClassifyPolling = useCallback(() => {
    if (classifyPollingRef.current) {
      clearInterval(classifyPollingRef.current)
      classifyPollingRef.current = null
    }
  }, [])

  // 检查并恢复分类进度（页面加载时使用）
  const checkAndResumeClassification = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/classification-progress`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setClassificationProgress(data.data)
        
        // 如果正在处理中，恢复轮询
        if (data.data.status === 'processing') {
          setClassifying(true)
          startClassifyPolling()
          toast.info("检测到分类任务正在进行中，已恢复监控...")
        }
      }
    } catch (error) {
      console.error("检查分类进度失败:", error)
    }
  }, [projectId, startClassifyPolling])

  // 执行内容分类
  const handleClassify = async () => {
    try {
      setClassifying(true)
      setClassificationProgress({
        status: 'processing',
        total_contents: 0,
        processed_contents: 0,
        current_batch: 0,
        total_batches: 0,
        total_classified: 0,
        progress_percent: 0
      })
      toast.info("正在对内容进行智能分类...")
      
      // 开始轮询进度
      startClassifyPolling()
      
      // 发起分类请求（不等待完成）
      fetch(`${API_BASE}/api/projects/${projectId}/classify`, {
        method: 'POST'
      }).catch(console.error)
      
    } catch (error) {
      console.error("分类失败:", error)
      toast.error("分类失败，请重试")
      setClassifying(false)
    }
  }

  // 删除分类
  const handleDeleteClassification = async (id: number) => {
    if (!confirm("确定要删除这条分类吗？")) return
    
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/classifications/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success("删除成功")
        await fetchClassifications()
        await fetchClassificationSummary()
      } else {
        toast.error(data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除失败:", error)
      toast.error("删除失败")
    }
  }

  // 更新分类
  const handleUpdateClassification = async () => {
    if (!editingItem?.id) return
    
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/classifications/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingItem.content,
          evidence_type: editingItem.evidence_type,
          key_points: editingItem.key_points
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success("更新成功")
        setEditDialogOpen(false)
        setEditingItem(null)
        await fetchClassifications()
      } else {
        toast.error(data.error || "更新失败")
      }
    } catch (error) {
      console.error("更新失败:", error)
      toast.error("更新失败")
    }
  }

  // 添加分类
  const handleAddClassification = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/classifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClassification,
          key_points: newClassification.key_points.split(',').map(s => s.trim()).filter(Boolean)
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success("添加成功")
        setAddDialogOpen(false)
        setNewClassification({
          category: 'MC',
          subcategory: 'mc1_product_leadership',
          content: '',
          source_file: '',
          evidence_type: '',
          key_points: ''
        })
        await fetchClassifications()
        await fetchClassificationSummary()
      } else {
        toast.error(data.error || "添加失败")
      }
    } catch (error) {
      console.error("添加失败:", error)
      toast.error("添加失败")
    }
  }

  // 轮询提取日志
  const startLogPolling = useCallback(() => {
    if (logPollingRef.current) {
      clearInterval(logPollingRef.current)
    }
    
    logPollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/projects/${projectId}/extraction-logs`)
        const data = await response.json()
        if (data.success) {
          setExtractionLogs(data.data || [])
        }
      } catch (error) {
        console.error("轮询日志失败:", error)
      }
    }, 2000)
  }, [projectId])

  const stopLogPolling = useCallback(() => {
    if (logPollingRef.current) {
      clearInterval(logPollingRef.current)
      logPollingRef.current = null
    }
  }, [])

  // 触发提取
  const handleExtract = async () => {
    try {
      setExtracting(true)
      setExtractionLogs([])
      toast.info("正在提取内容，请稍候...")
      
      // 开始轮询日志
      startLogPolling()
      
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/extract`, {
        method: "POST"
      })
      const data = await response.json()
      
      // 停止轮询
      stopLogPolling()
      
      if (data.success) {
        const { processed_files, total_content_blocks, duplicates_removed, outline_generated } = data.data || {}
        toast.success(
          `提取完成！处理 ${processed_files || 0} 个文件，${total_content_blocks || 0} 个内容块` +
          (duplicates_removed ? `，去除 ${duplicates_removed} 个重复` : '') +
          (outline_generated ? '，已生成大纲' : '')
        )
        await fetchContentBlocks()
        await fetchProjectContext()
        await fetchOutline()
      } else {
        toast.error(data.error || "提取失败")
      }
    } catch (error) {
      console.error("提取失败:", error)
      toast.error("提取失败")
      stopLogPolling()
    } finally {
      setExtracting(false)
    }
  }

  // 一键清理所有提取数据
  const handleClearExtractionData = async () => {
    if (!confirm("确定要清理所有提取数据吗？\n\n这将清除：\n• 提取的内容块\n• 内容大纲\n• 证据分类\n• 提取日志\n\n收集的原始材料不会被删除，可以重新提取。")) {
      return
    }
    
    try {
      setClearing(true)
      toast.info("正在清理提取数据...")
      
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/extraction/clear`, {
        method: "POST"
      })
      const data = await response.json()
      
      if (data.success) {
        const stats = data.data?.stats || {}
        toast.success(
          `清理完成！已删除 ${stats.deleted_contents || 0} 个内容块、${stats.deleted_classifications || 0} 个分类`
        )
        // 重置页面状态
        setContentBlocks([])
        setProjectContext(null)
        setOutline(null)
        setClassifications({})
        setClassificationSummary({})
        setSearchResults([])
        // 重新获取数据（确认为空）
        await fetchContentBlocks()
        await fetchOutline()
        await fetchClassifications()
        await fetchClassificationSummary()
      } else {
        toast.error(data.error || "清理失败")
      }
    } catch (error) {
      console.error("清理失败:", error)
      toast.error("清理失败")
    } finally {
      setClearing(false)
    }
  }

  // 重新生成大纲
  const handleRegenerateOutline = async () => {
    try {
      setLoadingOutline(true)
      toast.info("正在重新生成大纲...")
      
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/outline/generate`, {
        method: "POST"
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        setOutline(data.data)
        toast.success("大纲生成完成")
      } else {
        toast.error(data.error || "生成失败")
      }
    } catch (error) {
      console.error("生成大纲失败:", error)
      toast.error("生成大纲失败")
    } finally {
      setLoadingOutline(false)
    }
  }

  // 搜索内容
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      toast.warning("请输入搜索关键词")
      return
    }
    
    try {
      setSearching(true)
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/content/search?keyword=${encodeURIComponent(searchKeyword)}`
      )
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.data || [])
        if (data.data?.length === 0) {
          toast.info("未找到匹配内容")
        }
      }
    } catch (error) {
      console.error("搜索失败:", error)
      toast.error("搜索失败")
    } finally {
      setSearching(false)
    }
  }

  // 导出上下文
  const handleExportContext = () => {
    if (!projectContext?.context) {
      toast.warning("暂无上下文内容可导出")
      return
    }
    
    const blob = new Blob([projectContext.context], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${projectInfo?.client_name || projectId}_上下文.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success("导出成功")
  }

  // 切换大纲区块展开
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  useEffect(() => {
    fetchProjectInfo()
    fetchContentBlocks()
    fetchProjectContext()
    fetchOutline()
    fetchClassifications()
    fetchClassificationSummary()
    fetchProjectFiles()
    checkAndResumeClassification()  // 检查是否有正在进行的分类任务
    
    return () => {
      stopLogPolling()
      stopClassifyPolling()
    }
  }, [fetchProjectInfo, fetchContentBlocks, fetchProjectContext, fetchOutline, fetchClassifications, fetchClassificationSummary, fetchProjectFiles, stopLogPolling, stopClassifyPolling, checkAndResumeClassification])

  // 按文件分组内容块
  const groupedBlocks = contentBlocks.reduce((acc, block) => {
    const file = block.source_file
    if (!acc[file]) {
      acc[file] = []
    }
    acc[file].push(block)
    return acc
  }, {} as Record<string, ContentBlock[]>)

  // 获取内容类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "table": return "📊"
      case "heading": return "📌"
      case "list": return "📝"
      default: return "📄"
    }
  }

  // 获取相关度颜色
  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case "高": return "bg-green-100 text-green-700 border-green-200"
      case "中": return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "低": return "bg-gray-100 text-gray-700 border-gray-200"
      default: return "bg-blue-100 text-blue-700 border-blue-200"
    }
  }

  // 获取覆盖度颜色
  const getCoverageColor = (coverage: string) => {
    switch (coverage) {
      case "有": return "text-green-600"
      case "部分": return "text-yellow-600"
      case "无": return "text-gray-400"
      default: return "text-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push(`/copywriting?project=${projectId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回项目
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  内容提取
                </h1>
                <p className="text-sm text-muted-foreground">
                  {projectInfo?.client_name || projectId}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportContext}
                disabled={!projectContext?.context}
              >
                <Download className="h-4 w-4 mr-2" />
                导出上下文
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearExtractionData}
                disabled={clearing || extracting}
              >
                <Trash2 className={`h-4 w-4 mr-2 ${clearing ? "animate-spin" : ""}`} />
                {clearing ? "清理中..." : "一键清理"}
              </Button>
              <Button
                size="sm"
                onClick={handleExtract}
                disabled={extracting || clearing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${extracting ? "animate-spin" : ""}`} />
                {extracting ? "提取中..." : "重新提取"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/copywriting/${projectId}/framework`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                查看框架
              </Button>
            </div>
          </div>
          
          {/* 提取进度提示 */}
          {extracting && extractionLogs.length > 0 && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在提取... 已完成 {extractionLogs.length} 个步骤</span>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总文件数</p>
                  <p className="text-2xl font-bold">{projectContext?.total_files || outline?.total_files || 0}</p>
                </div>
                <File className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">内容块数</p>
                  <p className="text-2xl font-bold">{projectContext?.total_blocks || contentBlocks.length}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总字数</p>
                  <p className="text-2xl font-bold">
                    {contentBlocks.reduce((sum, b) => sum + b.word_count, 0).toLocaleString()}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">关键词数</p>
                  <p className="text-2xl font-bold">{outline?.keywords?.length || 0}</p>
                </div>
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">大纲状态</p>
                  <p className="text-sm font-medium">
                    {outline?.ai_generated ? (
                      <Badge variant="default" className="bg-green-600">AI生成</Badge>
                    ) : outline ? (
                      <Badge variant="secondary">规则生成</Badge>
                    ) : (
                      <Badge variant="outline">未生成</Badge>
                    )}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="classifications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="classifications" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              证据分类
              {Object.keys(classificationSummary).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {Object.values(classificationSummary).reduce((sum, cat) => sum + (cat.total || 0), 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outline" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              内容大纲
            </TabsTrigger>
            <TabsTrigger value="blocks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              内容块列表
            </TabsTrigger>
            <TabsTrigger value="context" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              完整上下文
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              搜索内容
            </TabsTrigger>
          </TabsList>

          {/* 证据分类 */}
          <TabsContent value="classifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                根据提取内容自动分类到MC/OC标准和推荐信息类别，保留原始内容和材料出处
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  手动添加
                </Button>
                <Button 
                  onClick={handleClassify}
                  disabled={classifying || extracting}
                >
                  {classifying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4 mr-2" />
                  )}
                  {classifying ? "分类中..." : "智能分类"}
                </Button>
              </div>
            </div>

            {/* 分类进度条 */}
            {classifying && classificationProgress && (
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-700">
                      正在使用AI进行智能分类...
                    </span>
                    <span className="text-sm text-indigo-600">
                      批次 {classificationProgress.current_batch}/{classificationProgress.total_batches}
                    </span>
                  </div>
                  <Progress value={classificationProgress.progress_percent} className="h-2 mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      已处理 {classificationProgress.processed_contents}/{classificationProgress.total_contents} 条内容
                    </span>
                    <span className="text-indigo-600 font-medium">
                      已分类 {classificationProgress.total_classified} 条证据
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingClassifications ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : Object.keys(classifications).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无分类结果</h3>
                  <p className="text-muted-foreground mb-4">
                    点击"智能分类"按钮，系统将使用AI自动将内容分类到对应标准
                  </p>
                  <Button onClick={handleClassify} disabled={classifying}>
                    <Layers className="h-4 w-4 mr-2" />
                    开始分类
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* MC标准 */}
                {classifications.MC && (
                  <Card>
                    <Collapsible 
                      open={expandedCategories.has("MC")}
                      onOpenChange={(open) => {
                        const newSet = new Set(expandedCategories)
                        if (open) newSet.add("MC")
                        else newSet.delete("MC")
                        setExpandedCategories(newSet)
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-100">
                                <Briefcase className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">MC必选标准</CardTitle>
                                <CardDescription>产品团队领导力、商业发展、非营利组织、专家评审</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {classificationSummary.MC?.total || 0} 条证据
                              </Badge>
                              {expandedCategories.has("MC") ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {Object.entries(classifications.MC.subcategories).map(([subKey, subData]) => (
                            <div key={subKey} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{subData.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {subData.items.length} 条
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{subData.description}</span>
                              </div>
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {subData.items.map((item, idx) => (
                                  <div 
                                    key={idx} 
                                    className="p-3 bg-slate-50 rounded-lg text-sm hover:bg-slate-100 transition-colors group"
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => setSelectedClassification(item)}
                                      >
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <File className="h-3 w-3" />
                                          <span 
                                            className="truncate max-w-[200px] hover:text-primary hover:underline cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openFilePreview(item.source_file)
                                            }}
                                          >
                                            {item.source_file}
                                          </span>
                                          {item.source_page && <span>第{item.source_page}页</span>}
                                          {item.subject_person && item.subject_person !== 'applicant' && (
                                            <Badge 
                                              variant="outline" 
                                              className={`text-xs ${item.subject_person === 'recommender' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50'}`}
                                            >
                                              {item.subject_person === 'recommender' ? '推荐人' : '其他'}
                                            </Badge>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 p-0 hover:bg-slate-200"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openFilePreview(item.source_file)
                                            }}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge 
                                          variant={item.relevance_score >= 0.8 ? "default" : item.relevance_score >= 0.6 ? "secondary" : "outline"}
                                          className="text-xs shrink-0"
                                        >
                                          {Math.round(item.relevance_score * 100)}%
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingItem(item)
                                            setEditDialogOpen(true)
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (item.id) handleDeleteClassification(item.id)
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <p 
                                      className="text-slate-700 line-clamp-3 cursor-pointer"
                                      onClick={() => setSelectedClassification(item)}
                                    >
                                      {item.content}
                                    </p>
                                    {item.key_points && item.key_points.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {item.key_points.slice(0, 3).map((point, i) => (
                                          <Badge key={i} variant="outline" className="text-xs bg-white">
                                            {point}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* OC标准 */}
                {classifications.OC && (
                  <Card>
                    <Collapsible 
                      open={expandedCategories.has("OC")}
                      onOpenChange={(open) => {
                        const newSet = new Set(expandedCategories)
                        if (open) newSet.add("OC")
                        else newSet.delete("OC")
                        setExpandedCategories(newSet)
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-100">
                                <Star className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">OC可选标准</CardTitle>
                                <CardDescription>创新、行业认可、重大贡献、学术贡献</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {classificationSummary.OC?.total || 0} 条证据
                              </Badge>
                              {expandedCategories.has("OC") ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {Object.entries(classifications.OC.subcategories).map(([subKey, subData]) => (
                            <div key={subKey} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{subData.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {subData.items.length} 条
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{subData.description}</span>
                              </div>
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {subData.items.map((item, idx) => (
                                  <div 
                                    key={idx} 
                                    className="p-3 bg-slate-50 rounded-lg text-sm hover:bg-slate-100 transition-colors group"
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => setSelectedClassification(item)}
                                      >
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <File className="h-3 w-3" />
                                          <span 
                                            className="truncate max-w-[200px] hover:text-primary hover:underline"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openFilePreview(item.source_file)
                                            }}
                                          >
                                            {item.source_file}
                                          </span>
                                          {item.source_page && <span>第{item.source_page}页</span>}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 p-0 hover:bg-slate-200"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openFilePreview(item.source_file)
                                            }}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge 
                                          variant={item.relevance_score >= 0.8 ? "default" : item.relevance_score >= 0.6 ? "secondary" : "outline"}
                                          className="text-xs shrink-0"
                                        >
                                          {Math.round(item.relevance_score * 100)}%
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingItem(item)
                                            setEditDialogOpen(true)
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (item.id) handleDeleteClassification(item.id)
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <p 
                                      className="text-slate-700 line-clamp-3 cursor-pointer"
                                      onClick={() => setSelectedClassification(item)}
                                    >
                                      {item.content}
                                    </p>
                                    {item.key_points && item.key_points.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {item.key_points.slice(0, 3).map((point, i) => (
                                          <Badge key={i} variant="outline" className="text-xs bg-white">
                                            {point}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* 推荐信息 */}
                {classifications.RECOMMENDER && (
                  <Card>
                    <Collapsible 
                      open={expandedCategories.has("RECOMMENDER")}
                      onOpenChange={(open) => {
                        const newSet = new Set(expandedCategories)
                        if (open) newSet.add("RECOMMENDER")
                        else newSet.delete("RECOMMENDER")
                        setExpandedCategories(newSet)
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-purple-100">
                                <UserCheck className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">推荐信息</CardTitle>
                                <CardDescription>推荐人背景、资质及与申请人关系</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {classificationSummary.RECOMMENDER?.total || 0} 条证据
                              </Badge>
                              {expandedCategories.has("RECOMMENDER") ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {Object.entries(classifications.RECOMMENDER.subcategories).map(([subKey, subData]) => (
                            <div key={subKey} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{subData.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {subData.items.length} 条
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{subData.description}</span>
                              </div>
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {subData.items.map((item, idx) => (
                                  <div 
                                    key={idx} 
                                    className="p-3 bg-slate-50 rounded-lg text-sm hover:bg-slate-100 transition-colors group"
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => setSelectedClassification(item)}
                                      >
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <File className="h-3 w-3" />
                                          <span 
                                            className="truncate max-w-[200px] hover:text-primary hover:underline"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openFilePreview(item.source_file)
                                            }}
                                          >
                                            {item.source_file}
                                          </span>
                                          {item.source_page && <span>第{item.source_page}页</span>}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 p-0 hover:bg-slate-200"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openFilePreview(item.source_file)
                                            }}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge 
                                          variant={item.relevance_score >= 0.8 ? "default" : item.relevance_score >= 0.6 ? "secondary" : "outline"}
                                          className="text-xs shrink-0"
                                        >
                                          {Math.round(item.relevance_score * 100)}%
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingItem(item)
                                            setEditDialogOpen(true)
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (item.id) handleDeleteClassification(item.id)
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <p 
                                      className="text-slate-700 line-clamp-3 cursor-pointer"
                                      onClick={() => setSelectedClassification(item)}
                                    >
                                      {item.content}
                                    </p>
                                    {item.key_points && item.key_points.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {item.key_points.slice(0, 3).map((point, i) => (
                                          <Badge key={i} variant="outline" className="text-xs bg-white">
                                            {point}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* 内容大纲 */}
          <TabsContent value="outline" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                材料信息的结构化大纲，一目了然收集到的材料情况
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRegenerateOutline}
                disabled={loadingOutline}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingOutline ? 'animate-spin' : ''}`} />
                重新生成大纲
              </Button>
            </div>

            {loadingOutline ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : !outline ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无内容大纲</h3>
                  <p className="text-muted-foreground mb-4">
                    请先提取材料内容，系统将自动生成大纲
                  </p>
                  <Button onClick={handleExtract} disabled={extracting}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${extracting ? "animate-spin" : ""}`} />
                    开始提取
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 申请人概况 */}
                {outline.applicant_profile && Object.keys(outline.applicant_profile).length > 0 && (
                  <Card>
                    <Collapsible open={expandedSections.has("profile")} onOpenChange={() => toggleSection("profile")}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-indigo-600" />
                              申请人概况
                            </span>
                            {expandedSections.has("profile") ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-2 gap-3">
                            {outline.applicant_profile.name && (
                              <div>
                                <p className="text-xs text-muted-foreground">姓名</p>
                                <p className="font-medium">{outline.applicant_profile.name}</p>
                              </div>
                            )}
                            {outline.applicant_profile.current_position && (
                              <div>
                                <p className="text-xs text-muted-foreground">职位</p>
                                <p className="font-medium">{outline.applicant_profile.current_position}</p>
                              </div>
                            )}
                            {outline.applicant_profile.domain && (
                              <div>
                                <p className="text-xs text-muted-foreground">领域</p>
                                <p className="font-medium">{outline.applicant_profile.domain}</p>
                              </div>
                            )}
                            {outline.applicant_profile.experience_years && (
                              <div>
                                <p className="text-xs text-muted-foreground">经验</p>
                                <p className="font-medium">{outline.applicant_profile.experience_years}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* 关键词云 */}
                {outline.keywords && outline.keywords.length > 0 && (
                  <Card>
                    <Collapsible open={expandedSections.has("keywords")} onOpenChange={() => toggleSection("keywords")}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-purple-600" />
                              关键词
                              <Badge variant="secondary" className="ml-1">{outline.keywords.length}</Badge>
                            </span>
                            {expandedSections.has("keywords") ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-2">
                            {outline.keywords.map((keyword, i) => (
                              <Badge key={i} variant="outline" className="text-sm">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* 证据覆盖评估 */}
                {outline.evidence_coverage && (
                  <Card className="lg:col-span-2">
                    <Collapsible open={expandedSections.has("coverage")} onOpenChange={() => toggleSection("coverage")}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-amber-600" />
                              证据覆盖评估
                            </span>
                            {expandedSections.has("coverage") ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* MC标准 */}
                            {outline.evidence_coverage.MC标准覆盖 && (
                              <div>
                                <h4 className="font-medium text-sm mb-3 text-blue-700">MC 必选标准</h4>
                                <div className="space-y-2">
                                  {Object.entries(outline.evidence_coverage.MC标准覆盖).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">{key.replace('MC', 'MC')}</span>
                                      <span className={`font-medium ${getCoverageColor(value)}`}>
                                        {value === "有" ? "✓ 有" : value === "部分" ? "◐ 部分" : "✗ 无"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* OC标准 */}
                            {outline.evidence_coverage.OC标准覆盖 && (
                              <div>
                                <h4 className="font-medium text-sm mb-3 text-green-700">OC 可选标准</h4>
                                <div className="space-y-2">
                                  {Object.entries(outline.evidence_coverage.OC标准覆盖).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">{key.replace('OC', 'OC')}</span>
                                      <span className={`font-medium ${getCoverageColor(value)}`}>
                                        {value === "有" ? "✓ 有" : value === "部分" ? "◐ 部分" : "✗ 无"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* 文件摘要列表 */}
                {outline.file_summaries && outline.file_summaries.length > 0 && (
                  <Card className="lg:col-span-2">
                    <Collapsible open={expandedSections.has("files")} onOpenChange={() => toggleSection("files")}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <File className="h-4 w-4 text-blue-600" />
                              文件摘要
                              <Badge variant="secondary" className="ml-1">{outline.file_summaries.length} 个文件</Badge>
                            </span>
                            {expandedSections.has("files") ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {outline.file_summaries.map((file, i) => (
                              <div key={i} className="p-3 border rounded-lg hover:bg-accent/30 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-lg">📄</span>
                                    <span className="font-medium text-sm truncate">{file.filename}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {file.type || file.content_type ? (
                                      <Badge variant="outline" className="text-xs">
                                        {file.type || file.content_type}
                                      </Badge>
                                    ) : null}
                                    {file.relevance && (
                                      <Badge className={`text-xs ${getRelevanceColor(file.relevance)}`}>
                                        {file.relevance}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{file.summary}</p>
                                {file.key_points && file.key_points.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {file.key_points.slice(0, 3).map((point, j) => (
                                      <Badge key={j} variant="secondary" className="text-xs font-normal">
                                        {point}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* 职业时间线 */}
                {outline.career_timeline && outline.career_timeline.length > 0 && (
                  <Card>
                    <Collapsible open={expandedSections.has("timeline")} onOpenChange={() => toggleSection("timeline")}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-teal-600" />
                              职业经历
                            </span>
                            {expandedSections.has("timeline") ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {outline.career_timeline.map((item, i) => (
                              <div key={i} className="flex gap-3 text-sm">
                                <span className="text-muted-foreground shrink-0 w-24">{item.period}</span>
                                <span>{item.event}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* 成就分类 */}
                {outline.achievement_categories && Object.keys(outline.achievement_categories).length > 0 && (
                  <Card>
                    <Collapsible open={expandedSections.has("achievements")} onOpenChange={() => toggleSection("achievements")}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-orange-600" />
                              成就分类
                            </span>
                            {expandedSections.has("achievements") ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          {outline.achievement_categories.leadership && outline.achievement_categories.leadership.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-600 mb-1">领导力</p>
                              <ul className="text-sm space-y-1">
                                {outline.achievement_categories.leadership.map((item, i) => (
                                  <li key={i} className="text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {outline.achievement_categories.innovation && outline.achievement_categories.innovation.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">创新</p>
                              <ul className="text-sm space-y-1">
                                {outline.achievement_categories.innovation.map((item, i) => (
                                  <li key={i} className="text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {outline.achievement_categories.recognition && outline.achievement_categories.recognition.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-600 mb-1">行业认可</p>
                              <ul className="text-sm space-y-1">
                                {outline.achievement_categories.recognition.map((item, i) => (
                                  <li key={i} className="text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {outline.achievement_categories.academic && outline.achievement_categories.academic.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-purple-600 mb-1">学术</p>
                              <ul className="text-sm space-y-1">
                                {outline.achievement_categories.academic.map((item, i) => (
                                  <li key={i} className="text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* 材料缺口 */}
                {outline.material_gaps && outline.material_gaps.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        材料缺口
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1">
                        {outline.material_gaps.map((gap, i) => (
                          <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                            <span>⚠️</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* 整体评估 */}
                {outline.overall_assessment && (
                  <Card className="lg:col-span-2 border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                        <CheckCircle className="h-4 w-4" />
                        整体评估
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-blue-700">{outline.overall_assessment}</p>
                      {outline.generated_at && (
                        <p className="text-xs text-blue-500 mt-2">
                          生成时间：{new Date(outline.generated_at).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* 内容块列表 */}
          <TabsContent value="blocks" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="筛选类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="text">文本</SelectItem>
                  <SelectItem value="table">表格</SelectItem>
                  <SelectItem value="heading">标题</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-sm text-muted-foreground">
                共 {contentBlocks.length} 个内容块，来自 {Object.keys(groupedBlocks).length} 个文件
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : contentBlocks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无提取内容</h3>
                  <p className="text-muted-foreground mb-4">
                    请先上传材料文件，然后点击"重新提取"按钮
                  </p>
                  <Button onClick={handleExtract} disabled={extracting}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${extracting ? "animate-spin" : ""}`} />
                    开始提取
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {Object.entries(groupedBlocks).map(([fileName, blocks]) => (
                    <Card key={fileName}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <File className="h-4 w-4" />
                          {fileName}
                          <Badge variant="secondary" className="ml-2">
                            {blocks.length} 块
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {blocks.map((block) => (
                          <div
                            key={block.id}
                            className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedBlock(block)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span>{getTypeIcon(block.content_type)}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {block.content_type}
                                  </Badge>
                                  {block.source_page && (
                                    <Badge variant="secondary" className="text-xs">
                                      第{block.source_page}页
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                  {block.content_preview}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {block.word_count} 字
                                </span>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* 完整上下文 */}
          <TabsContent value="context">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>完整上下文（带出处标注）</span>
                  <Button variant="outline" size="sm" onClick={handleExportContext}>
                    <Download className="h-4 w-4 mr-2" />
                    导出
                  </Button>
                </CardTitle>
                <CardDescription>
                  所有提取内容的合并视图，每个内容块都标注了来源
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectContext?.context ? (
                  <ScrollArea className="h-[600px]">
                    <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                      {projectContext.context}
                    </pre>
                  </ScrollArea>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    暂无上下文内容，请先提取材料
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 搜索内容 */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>搜索内容</CardTitle>
                <CardDescription>
                  在所有提取的内容中搜索关键词
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入搜索关键词..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    <Search className={`h-4 w-4 mr-2 ${searching ? "animate-pulse" : ""}`} />
                    搜索
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      找到 {searchResults.length} 条结果
                    </p>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {searchResults.map((result: any) => (
                          <div
                            key={result.id}
                            className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
                            onClick={() => {
                              const block = contentBlocks.find(b => b.id === result.id)
                              if (block) setSelectedBlock(block)
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{result.source_file}</Badge>
                              {result.source_page && (
                                <Badge variant="secondary">第{result.source_page}页</Badge>
                              )}
                            </div>
                            <p className="text-sm">{result.snippet || result.content_preview}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 内容块详情对话框 */}
      <Dialog open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTypeIcon(selectedBlock?.content_type || "")}
              内容详情
            </DialogTitle>
            <DialogDescription>
              {selectedBlock?.source_file}
              {selectedBlock?.source_page && ` - 第${selectedBlock.source_page}页`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{selectedBlock?.source_file}</Badge>
              <Badge variant="secondary">{selectedBlock?.content_type}</Badge>
              {selectedBlock?.source_page && (
                <Badge variant="secondary">第{selectedBlock.source_page}页</Badge>
              )}
              <Badge variant="outline">{selectedBlock?.word_count} 字</Badge>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {selectedBlock?.content}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* 分类详情对话框 */}
      <Dialog open={!!selectedClassification} onOpenChange={() => setSelectedClassification(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              证据内容详情
            </DialogTitle>
            <DialogDescription>
              {selectedClassification?.source_file}
              {selectedClassification?.source_page && ` - 第${selectedClassification.source_page}页`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <File className="h-3 w-3" />
                {selectedClassification?.source_file}
              </Badge>
              {selectedClassification?.source_page && (
                <Badge variant="secondary">第{selectedClassification.source_page}页</Badge>
              )}
              <Badge 
                variant={
                  (selectedClassification?.relevance_score || 0) >= 0.8 
                    ? "default" 
                    : (selectedClassification?.relevance_score || 0) >= 0.6 
                      ? "secondary" 
                      : "outline"
                }
              >
                相关度: {Math.round((selectedClassification?.relevance_score || 0) * 100)}%
              </Badge>
              {selectedClassification?.evidence_type && (
                <Badge variant="outline">{selectedClassification.evidence_type}</Badge>
              )}
            </div>
            
            {selectedClassification?.key_points && selectedClassification.key_points.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">关键要点</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClassification.key_points.map((point, i) => (
                    <Badge key={i} variant="outline" className="bg-indigo-50">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="overflow-auto max-h-[400px]">
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {selectedClassification?.content}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedClassification?.content) {
                    navigator.clipboard.writeText(selectedClassification.content)
                    toast.success("已复制到剪贴板")
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                复制内容
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑分类对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-600" />
              编辑分类内容
            </DialogTitle>
            <DialogDescription>
              修改证据内容、类型或关键要点
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label>证据内容</Label>
                <Textarea
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({...editingItem, content: e.target.value})}
                  className="min-h-[200px] mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>证据类型</Label>
                  <Input
                    value={editingItem.evidence_type}
                    onChange={(e) => setEditingItem({...editingItem, evidence_type: e.target.value})}
                    placeholder="如：工作经历、成就描述..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>关键要点（用逗号分隔）</Label>
                  <Input
                    value={Array.isArray(editingItem.key_points) ? editingItem.key_points.join(', ') : ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem, 
                      key_points: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="关键词1, 关键词2..."
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleUpdateClassification}>
                  <Save className="h-4 w-4 mr-2" />
                  保存修改
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 添加分类对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              手动添加证据
            </DialogTitle>
            <DialogDescription>
              添加自定义的证据内容到分类中
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>主类别</Label>
                <Select
                  value={newClassification.category}
                  onValueChange={(value) => {
                    const subcats: Record<string, string> = {
                      'MC': 'mc1_product_leadership',
                      'OC': 'oc1_innovation',
                      'RECOMMENDER': 'recommender_info'
                    }
                    setNewClassification({
                      ...newClassification, 
                      category: value,
                      subcategory: subcats[value] || ''
                    })
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MC">MC必选标准</SelectItem>
                    <SelectItem value="OC">OC可选标准</SelectItem>
                    <SelectItem value="RECOMMENDER">推荐信息</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>子类别</Label>
                <Select
                  value={newClassification.subcategory}
                  onValueChange={(value) => setNewClassification({...newClassification, subcategory: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {newClassification.category === 'MC' && (
                      <>
                        <SelectItem value="mc1_product_leadership">产品团队领导力</SelectItem>
                        <SelectItem value="mc2_business_development">商业发展</SelectItem>
                        <SelectItem value="mc3_nonprofit">非营利组织</SelectItem>
                        <SelectItem value="mc4_expert_review">专家评审</SelectItem>
                      </>
                    )}
                    {newClassification.category === 'OC' && (
                      <>
                        <SelectItem value="oc1_innovation">创新</SelectItem>
                        <SelectItem value="oc2_industry_recognition">行业认可</SelectItem>
                        <SelectItem value="oc3_significant_contribution">重大贡献</SelectItem>
                        <SelectItem value="oc4_academic">学术贡献</SelectItem>
                      </>
                    )}
                    {newClassification.category === 'RECOMMENDER' && (
                      <>
                        <SelectItem value="recommender_info">推荐人信息</SelectItem>
                        <SelectItem value="recommender_relationship">推荐人关系</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>证据内容 *</Label>
              <Textarea
                value={newClassification.content}
                onChange={(e) => setNewClassification({...newClassification, content: e.target.value})}
                placeholder="输入证据的详细内容..."
                className="min-h-[150px] mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>来源说明</Label>
                <Input
                  value={newClassification.source_file}
                  onChange={(e) => setNewClassification({...newClassification, source_file: e.target.value})}
                  placeholder="如：用户补充、面试记录..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>证据类型</Label>
                <Input
                  value={newClassification.evidence_type}
                  onChange={(e) => setNewClassification({...newClassification, evidence_type: e.target.value})}
                  placeholder="如：工作经历、成就描述..."
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label>关键要点（用逗号分隔）</Label>
              <Input
                value={newClassification.key_points}
                onChange={(e) => setNewClassification({...newClassification, key_points: e.target.value})}
                placeholder="关键词1, 关键词2, 关键词3..."
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleAddClassification}
                disabled={!newClassification.content.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加证据
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 文件预览组件 */}
      <UnifiedFilePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
      />
    </div>
  )
}
