"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  Plus,
  Edit,
  RefreshCw,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Clock,
  User,
  FolderOpen,
  Upload,
  Eye,
  ChevronRight,
  Loader2,
  Save,
  Send,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Target,
  Wand2,
  FileCheck,
  Layers,
  ArrowRight,
  CheckCircle2,
  Circle,
  Zap,
  Brain,
  Search,
  Copy,
  Download,
  Settings,
  ExternalLink,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { UnifiedFilePreview } from "@/components/unified-file-preview"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Mindmap } from "@/components/mindmap"
import ReactMarkdown from 'react-markdown'

// API 基础 URL
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5004'

// 类型定义
interface Project {
  project_id: string
  case_id: string
  client_name: string
  visa_type: string
  folder_name: string
  status: string
  created_at: string
  updated_at: string
  material_packages: Record<string, MaterialPackage>
  workflow_history: WorkflowAction[]
  path?: string
}

interface MaterialPackage {
  name: string
  name_en: string
  description: string
  required: boolean
  status: string
  progress: number
  files: PackageFile[]
}

interface PackageFile {
  stage: string
  filename: string
  path: string
  created_at: string
}

interface WorkflowAction {
  action: string
  timestamp: string
  details?: string
}

interface WorkflowStage {
  name: string
  description: string
  status: 'completed' | 'in_progress' | 'pending'
}

interface SuccessCase {
  id: string
  industry: string
  experience_level: string
  pathway: string
  education: string
  achievements: string[]
  match_score?: number
  background_summary?: string
  success_factors?: string
  key_takeaways?: string
}

export default function CopywritingPage() {
  const router = useRouter()
  
  // 状态
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [workflowStatus, setWorkflowStatus] = useState<Record<string, WorkflowStage>>({})
  const [documents, setDocuments] = useState<Record<string, any>>({})
  const [rawMaterials, setRawMaterials] = useState<Record<string, any[]>>({})  // 原始材料
  const [selectedDocument, setSelectedDocument] = useState<{path: string, content: string} | null>(null)
  const [matchedCases, setMatchedCases] = useState<SuccessCase[]>([])
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const [activeTab, setActiveTab] = useState("overview")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false)
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false)
  
  // 文件预览
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewingFile, setPreviewingFile] = useState<any>(null)
  
  // 表单状态
  const [newProjectForm, setNewProjectForm] = useState({
    client_name: "",
    case_id: "",
    visa_type: "GTV"
  })
  
  const [uploadForm, setUploadForm] = useState({
    category: "",  // 空表示自动推断
    filename: "",
    content: "",
    url: ""
  })
  const [uploadMode, setUploadMode] = useState<"file" | "url" | "text">("file")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{filename: string, status: string}[]>([])
  
  const [agentForm, setAgentForm] = useState({
    action: "generate",
    document_type: "personal_statement",
    content: "",
    optimization_type: "comprehensive"
  })
  
  const [agentResult, setAgentResult] = useState("")
  
  // API调用
  const apiCall = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/copywriting${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
      ...options
    })
    return response.json()
  }
  
  // 加载项目列表
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall('/api/projects')
      if (data.success) {
        setProjects(data.data || [])
      }
    } catch (err) {
      setError("加载项目列表失败")
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 选择项目（加载完整数据）
  const selectProject = async (project: Project) => {
    try {
      // 先设置基本数据
      setSelectedProject(project)
      
      // 然后加载完整的项目数据（包含material_packages）
      const data = await apiCall(`/api/projects/${project.project_id}`)
      if (data.success && data.data) {
        setSelectedProject(data.data)
      }
    } catch (err) {
      console.error("加载项目详情失败")
    }
  }
  
  // 加载工作流状态
  const loadWorkflowStatus = async (projectId: string) => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/workflow`)
      if (data.success) {
        setWorkflowStatus(data.data?.stages || {})
      }
    } catch (err) {
      console.error("加载工作流状态失败")
    }
  }
  
  // 加载文档列表
  const loadDocuments = async (projectId: string) => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/documents`)
      if (data.success) {
        setDocuments(data.data || {})
      }
    } catch (err) {
      console.error("加载文档列表失败")
    }
  }
  
  // 加载原始材料（从材料收集页面的已上传文件列表）
  const loadRawMaterials = async (projectId: string) => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/material-collection`)
      if (data.success && data.data?.categories) {
        // 按分类整理文件
        const categorizedFiles: Record<string, any[]> = {}
        const cats = data.data.categories
        
        Object.entries(cats).forEach(([categoryId, category]: [string, any]) => {
          category.items?.forEach((item: any) => {
            if (item.files && item.files.length > 0) {
              const categoryName = item.name || category.name
              if (!categorizedFiles[categoryName]) {
                categorizedFiles[categoryName] = []
              }
              item.files.forEach((file: any) => {
                // 避免重复添加
                const exists = categorizedFiles[categoryName].some((f: any) => f.id === file.id)
                if (!exists) {
                  categorizedFiles[categoryName].push(file)
                }
              })
            }
          })
        })
        
        setRawMaterials(categorizedFiles)
      }
    } catch (err) {
      console.error("加载原始材料失败")
    }
  }
  
  // 获取预览URL
  const getPreviewUrl = (file: any) => {
    if (file.file_url) return file.file_url
    return `${API_BASE}/api/files/preview/${file.id}`
  }
  
  // 预览文件
  const handlePreviewFile = (file: any) => {
    const fileName = file.file_name || file.name
    const fileType = (file.file_type || fileName?.split('.').pop() || '').toLowerCase()
    
    setPreviewingFile({ 
      id: file.id,
      file_name: fileName,
      file_type: fileType,
      file_size: file.file_size || file.size,
      file_url: file.file_url
    })
    setPreviewOpen(true)
  }
  
  // 加载文档内容
  const loadDocumentContent = async (projectId: string, docPath: string) => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/documents/${docPath}`)
      if (data.success) {
        setSelectedDocument({ path: docPath, content: data.data.content })
        setIsDocumentViewerOpen(true)
      }
    } catch (err) {
      setError("加载文档内容失败")
    }
  }
  
  // 创建项目
  const handleCreateProject = async () => {
    try {
      setLoading(true)
      const data = await apiCall('/api/projects', {
        method: 'POST',
        body: JSON.stringify(newProjectForm)
      })
      
      if (data.success) {
        setSuccess("项目创建成功")
        setIsCreateDialogOpen(false)
        setNewProjectForm({ client_name: "", case_id: "", visa_type: "GTV" })
        loadProjects()
      } else {
        setError(data.error || "创建失败")
      }
    } catch (err) {
      setError("创建项目失败")
    } finally {
      setLoading(false)
    }
  }
  
  // 上传材料（支持多种模式）
  const handleUploadMaterial = async () => {
    if (!selectedProject) return
    
    try {
      setLoading(true)
      
      if (uploadMode === "file" && selectedFiles.length > 0) {
        // 文件上传模式
        setUploadProgress([])
        
        for (const file of selectedFiles) {
          setUploadProgress(prev => [...prev, { filename: file.name, status: "uploading" }])
          
          const formData = new FormData()
          formData.append('file', file)
          if (uploadForm.category && uploadForm.category !== "auto") {
            formData.append('category', uploadForm.category)
          }
          
          const response = await fetch(`/api/copywriting/api/projects/${selectedProject.project_id}/materials`, {
            method: 'POST',
            body: formData
          })
          const result = await response.json()
          
          setUploadProgress(prev => 
            prev.map(p => p.filename === file.name 
              ? { ...p, status: result.success ? "success" : "error" } 
              : p
            )
          )
        }
        
        setSuccess(`成功上传 ${selectedFiles.length} 个文件`)
        
      } else if (uploadMode === "url" && uploadForm.url) {
        // URL模式
        const data = await apiCall(`/api/projects/${selectedProject.project_id}/materials/url`, {
          method: 'POST',
          body: JSON.stringify({ 
            url: uploadForm.url,
            category: (uploadForm.category && uploadForm.category !== "auto") ? uploadForm.category : undefined
          })
        })
        
        if (data.success) {
          setSuccess(`URL内容提取成功 (${data.category})`)
        }
        
      } else if (uploadMode === "text" && uploadForm.content) {
        // 文本模式
        const data = await apiCall(`/api/projects/${selectedProject.project_id}/materials`, {
          method: 'POST',
          body: JSON.stringify({
            filename: uploadForm.filename || "text_content.txt",
            content: uploadForm.content,
            category: (uploadForm.category && uploadForm.category !== "auto") ? uploadForm.category : undefined
          })
        })
        
        if (data.success) {
          setSuccess("文本内容上传成功")
        }
      }
      
      setIsUploadDialogOpen(false)
      setUploadForm({ category: "", filename: "", content: "", url: "" })
      setSelectedFiles([])
      setUploadProgress([])
      
      // 刷新项目和原始材料
      const projectData = await apiCall(`/api/projects/${selectedProject.project_id}`)
      if (projectData.success) {
        setSelectedProject(projectData.data)
      }
      loadRawMaterials(selectedProject.project_id)
    } catch (err) {
      setError("上传材料失败")
    } finally {
      setLoading(false)
    }
  }
  
  // 运行工作流步骤
  const runWorkflowStep = async (step: string) => {
    if (!selectedProject) return
    
    try {
      setProcessing(true)
      setSuccess(`正在执行: ${step}...`)
      
      let endpoint = ''
      switch (step) {
        case 'analyze':
          endpoint = `/api/projects/${selectedProject.project_id}/analyze`
          break
        case 'match':
          endpoint = `/api/projects/${selectedProject.project_id}/match-cases`
          break
        case 'generate':
          endpoint = `/api/projects/${selectedProject.project_id}/generate-drafts`
          break
        case 'optimize':
          endpoint = `/api/projects/${selectedProject.project_id}/optimize`
          break
        case 'review':
          endpoint = `/api/projects/${selectedProject.project_id}/review`
          break
        case 'full':
          endpoint = `/api/projects/${selectedProject.project_id}/run-workflow`
          break
        default:
          return
      }
      
      const data = await apiCall(endpoint, { method: 'POST' })
      
      if (data.success) {
        setSuccess(`${step} 执行完成`)
        loadWorkflowStatus(selectedProject.project_id)
        loadDocuments(selectedProject.project_id)
        loadRawMaterials(selectedProject.project_id)
        
        // 如果是材料分析，保存结果并显示弹窗
        if (step === 'analyze' && data.data) {
          setAnalysisResult(data.data)
          setIsAnalysisDialogOpen(true)
        }
        
        // 如果是案例匹配，保存匹配结果
        if (step === 'match' && data.matched_cases) {
          setMatchedCases(data.matched_cases)
        }
        
        // 刷新项目
        const projectData = await apiCall(`/api/projects/${selectedProject.project_id}`)
        if (projectData.success) {
          setSelectedProject(projectData.data)
        }
      } else {
        setError(data.error || `${step} 执行失败`)
      }
    } catch (err) {
      setError(`执行 ${step} 失败`)
    } finally {
      setProcessing(false)
    }
  }
  
  // 打包下载所有材料
  const handleDownloadAllMaterials = async () => {
    if (!selectedProject) return
    
    try {
      setDownloading(true)
      setSuccess("正在打包材料，请稍候...")
      
      // 直接请求下载API
      const response = await fetch(`/api/copywriting/api/projects/${selectedProject.project_id}/material-collection/download-all`)
      
      // 检查响应类型
      const contentType = response.headers.get('content-type') || ''
      
      if (!response.ok) {
        // 尝试解析错误信息
        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `下载失败 (${response.status})`)
        } else {
          throw new Error(`下载失败 (${response.status})`)
        }
      }
      
      // 确保是ZIP文件
      if (!contentType.includes('application/zip')) {
        // 可能是JSON错误响应
        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "服务器返回了非文件响应")
        }
        throw new Error("服务器返回了非文件响应")
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${selectedProject.client_name}_材料.zip`
      if (contentDisposition) {
        // 优先解析 filename*=UTF-8'' 格式（RFC 5987）
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/i)
        if (utf8Match) {
          filename = decodeURIComponent(utf8Match[1])
        } else {
          // 回退到普通 filename 格式
          const filenameMatch = contentDisposition.match(/filename=['"]?([^;\n"']+)['"]?/i)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }
      }
      
      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccess("材料打包下载成功")
    } catch (err: any) {
      console.error("打包下载失败:", err)
      setError(err.message || "打包下载失败，请检查后端服务是否运行")
    } finally {
      setDownloading(false)
    }
  }
  
  // Agent功能
  const runAgentAction = async () => {
    try {
      setProcessing(true)
      
      let endpoint = ''
      let body: any = {}
      
      switch (agentForm.action) {
        case 'generate':
          endpoint = '/api/agent/generate'
          body = {
            document_type: agentForm.document_type,
            context: { applicant_info: agentForm.content }
          }
          break
        case 'optimize':
          endpoint = '/api/agent/optimize'
          body = {
            content: agentForm.content,
            type: agentForm.optimization_type
          }
          break
        case 'review':
          endpoint = '/api/agent/review'
          body = {
            content: agentForm.content,
            document_type: agentForm.document_type
          }
          break
        case 'translate':
          endpoint = '/api/agent/translate'
          body = {
            content: agentForm.content,
            source_lang: 'zh',
            target_lang: 'en'
          }
          break
        default:
          return
      }
      
      const data = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      })
      
      if (data.success) {
        setAgentResult(data.content || data.optimized_content || data.translated_content || JSON.stringify(data.data, null, 2))
      } else {
        setError(data.error || "Agent执行失败")
      }
    } catch (err) {
      setError("Agent执行失败")
    } finally {
      setProcessing(false)
    }
  }
  
  // 初始化
  useEffect(() => {
    loadProjects()
  }, [loadProjects])
  
  // 选择项目时加载详情
  useEffect(() => {
    if (selectedProject) {
      loadWorkflowStatus(selectedProject.project_id)
      loadDocuments(selectedProject.project_id)
      loadRawMaterials(selectedProject.project_id)
    }
  }, [selectedProject])
  
  // 清除消息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])
  
  // 工作流阶段图标
  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Circle className="h-5 w-5 text-gray-300" />
    }
  }
  
  // 计算项目进度
  const calculateProgress = (project: Project) => {
    if (!project.material_packages) return 0
    const packages = Object.values(project.material_packages).filter(p => p.required)
    if (packages.length === 0) return 0
    const totalProgress = packages.reduce((sum, p) => sum + (p.progress || 0), 0)
    return Math.round(totalProgress / packages.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Navbar />
      
      {/* 消息提示 */}
      {(error || success) && (
        <div className="fixed top-20 right-4 z-50 w-96 animate-in slide-in-from-top">
          {error && (
            <Alert variant="destructive" className="mb-2 shadow-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-2 shadow-lg border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="container mx-auto max-w-[1800px] p-6 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                  <Wand2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    AI文案工作台
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    智能GTV签证申请文案制作系统
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadProjects} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button variant="outline" onClick={() => setIsAgentDialogOpen(true)}>
                <Brain className="h-4 w-4 mr-2" />
                AI助手
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新建项目
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 项目列表 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                项目列表
              </CardTitle>
              <CardDescription>共 {projects.length} 个项目</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-2">
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Card
                      key={project.project_id}
                      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                        selectedProject?.project_id === project.project_id 
                          ? 'border-primary shadow-md bg-primary/5' 
                          : ''
                      }`}
                      onClick={() => selectProject(project)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{project.client_name}</h4>
                          <p className="text-xs text-muted-foreground">{project.visa_type}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress value={calculateProgress(project)} className="h-1 flex-1" />
                            <span className="text-xs text-muted-foreground">{calculateProgress(project)}%</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
                      </div>
                    </Card>
                  ))}
                  
                  {projects.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>暂无项目</p>
                      <Button variant="link" onClick={() => setIsCreateDialogOpen(true)}>
                        创建第一个项目
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 主内容区 */}
          <div className="lg:col-span-3 space-y-6">
            {selectedProject ? (
              <>
                {/* 项目概览 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">{selectedProject.client_name}</CardTitle>
                        <CardDescription>
                          项目ID: {selectedProject.project_id} | 
                          案件ID: {selectedProject.case_id} | 
                          签证类型: {selectedProject.visa_type}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsUploadDialogOpen(true)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          上传材料
                        </Button>
                        <Button 
                          onClick={() => runWorkflowStep('full')}
                          disabled={processing}
                        >
                          {processing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4 mr-2" />
                          )}
                          一键生成
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">整体进度</span>
                          <span className="text-sm text-muted-foreground">{calculateProgress(selectedProject)}%</span>
                        </div>
                        <Progress value={calculateProgress(selectedProject)} className="h-2" />
                      </div>
                      <Badge variant={selectedProject.status === '7_completed' ? 'default' : 'secondary'}>
                        {selectedProject.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* 工作流程 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      工作流程
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {Object.entries(workflowStatus).map(([key, stage], index, arr) => (
                        <div key={key} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              stage.status === 'completed' ? 'bg-green-100 dark:bg-green-900' :
                              stage.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900' :
                              'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              {getStageIcon(stage.status)}
                            </div>
                            <span className="text-xs mt-2 text-center max-w-[80px]">{stage.name}</span>
                          </div>
                          {index < arr.length - 1 && (
                            <div className={`w-12 h-0.5 mx-2 ${
                              stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* 工作流操作按钮 */}
                    <div className="grid grid-cols-5 gap-2 mt-6">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => runWorkflowStep('analyze')}
                        disabled={processing || !selectedProject}
                      >
                        {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
                        分析材料
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => runWorkflowStep('match')}
                        disabled={processing}
                      >
                        <Target className="h-4 w-4 mr-1" />
                        匹配
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => runWorkflowStep('generate')}
                        disabled={processing}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        生成
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => runWorkflowStep('optimize')}
                        disabled={processing}
                      >
                        <Wand2 className="h-4 w-4 mr-1" />
                        优化
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => runWorkflowStep('review')}
                        disabled={processing}
                      >
                        <FileCheck className="h-4 w-4 mr-1" />
                        审核
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 详细内容Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="packages">材料包</TabsTrigger>
                    <TabsTrigger value="documents">文档</TabsTrigger>
                    <TabsTrigger value="cases">参考案例</TabsTrigger>
                    <TabsTrigger value="history">操作历史</TabsTrigger>
                  </TabsList>

                  {/* 材料包 */}
                  <TabsContent value="packages" className="mt-4 space-y-6">
                    {/* 原始材料列表 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            原始材料
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {Object.values(rawMaterials).flat().length} 个文件
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={handleDownloadAllMaterials}
                              disabled={downloading || Object.values(rawMaterials).flat().length === 0}
                            >
                              {downloading ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-1" />
                              )}
                              打包下载
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => runWorkflowStep('analyze')}
                              disabled={processing || Object.values(rawMaterials).flat().length === 0}
                              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                            >
                              {processing ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Brain className="h-4 w-4 mr-1" />
                              )}
                              分析材料
                            </Button>
                            {analysisResult && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setIsAnalysisDialogOpen(true)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看结果
                              </Button>
                            )}
                          </div>
                        </div>
                        <CardDescription>已上传的申请人原始材料，点击"分析材料"按钮提取关键信息</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {Object.keys(rawMaterials).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>暂无原始材料</p>
                            <p className="text-sm mt-1">点击"上传材料"按钮上传PDF、Word、图片或链接</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(rawMaterials).map(([category, files]) => (
                              <div key={category}>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4" />
                                  {category}
                                  <Badge variant="outline" className="text-xs">{files.length}</Badge>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {files.map((file: any, idx: number) => {
                                    const fileName = file.file_name || file.name
                                    const fileSize = file.file_size || file.size
                                    const uploadedAt = file.uploaded_at || file.modified
                                    
                                    return (
                                    <div 
                                      key={file.id || idx}
                                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                      onClick={() => handlePreviewFile(file)}
                                    >
                                      <div className="shrink-0">
                                        {fileName?.endsWith('.pdf') ? (
                                          <FileText className="h-8 w-8 text-red-500" />
                                        ) : fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                          <FileText className="h-8 w-8 text-green-500" />
                                        ) : fileName?.match(/\.(doc|docx)$/i) ? (
                                          <FileText className="h-8 w-8 text-blue-500" />
                                        ) : fileName?.match(/\.(xls|xlsx)$/i) ? (
                                          <FileText className="h-8 w-8 text-emerald-500" />
                                        ) : (
                                          <FileText className="h-8 w-8 text-gray-500" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{fileName}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          {fileSize && <span>{(fileSize / 1024).toFixed(1)} KB</span>}
                                          {uploadedAt && (
                                            <span>{new Date(uploadedAt).toLocaleDateString()}</span>
                                          )}
                                        </div>
                                      </div>
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )})}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 材料包状态 */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">材料包状态（点击进入编辑）</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(selectedProject.material_packages || {}).map(([key, pkg]) => (
                          <Card 
                            key={key} 
                            className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary"
                            onClick={() => router.push(`/copywriting/${selectedProject.project_id}/${key}`)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                                  <CardDescription className="text-xs">{pkg.name_en}</CardDescription>
                                </div>
                                {pkg.required && (
                                  <Badge variant="outline" className="text-xs">必需</Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                              <div className="flex items-center gap-2">
                                <Progress value={pkg.progress || 0} className="h-1 flex-1" />
                                <span className="text-xs">{pkg.progress || 0}%</span>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <Badge variant={
                                  pkg.status === 'completed' ? 'default' :
                                  pkg.status === 'optimized' ? 'secondary' :
                                  pkg.status === 'draft' ? 'outline' :
                                  'secondary'
                                }>
                                  {pkg.status || 'pending'}
                                </Badge>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/copywriting/${selectedProject.project_id}/${key}`)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  编辑
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* 文档 */}
                  <TabsContent value="documents" className="mt-4">
                    <div className="space-y-4">
                      {Object.entries(documents).map(([stageName, stageContent]) => (
                        <Card key={stageName}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-lg">{stageName}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(stageContent as Record<string, any[]>).map(([docType, files]) => (
                                files.map((file: any) => (
                                  <Card 
                                    key={file.path} 
                                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => loadDocumentContent(selectedProject.project_id, `${stageName}/${docType}/${file.name}`)}
                                  >
                                    <div className="flex items-start gap-2">
                                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{docType}</p>
                                      </div>
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </Card>
                                ))
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {Object.keys(documents).length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p>暂无文档</p>
                          <p className="text-sm">运行工作流生成文档</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* 参考案例 */}
                  <TabsContent value="cases" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchedCases.map((case_, index) => (
                        <Card key={case_.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base">案例 {index + 1}</CardTitle>
                              {case_.match_score && (
                                <Badge variant="default">{case_.match_score}% 匹配</Badge>
                              )}
                            </div>
                            <CardDescription>{case_.industry}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">申请路径</span>
                                <span>{case_.pathway}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">经验水平</span>
                                <span>{case_.experience_level}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">教育背景</span>
                                <span>{case_.education}</span>
                              </div>
                              <Separator className="my-2" />
                              <div>
                                <p className="text-muted-foreground mb-1">成就类型</p>
                                <div className="flex flex-wrap gap-1">
                                  {case_.achievements?.slice(0, 3).map((a, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {matchedCases.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p>暂无匹配案例</p>
                          <Button 
                            variant="link" 
                            onClick={() => runWorkflowStep('match')}
                            disabled={processing}
                          >
                            运行案例匹配
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* 操作历史 */}
                  <TabsContent value="history" className="mt-4">
                    <Card>
                      <CardContent className="pt-6">
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4">
                            {(selectedProject.workflow_history || []).slice().reverse().map((action, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{action.action}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(action.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  {action.details && (
                                    <p className="text-sm text-muted-foreground">{action.details}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">选择一个项目开始</p>
                  <p className="text-sm">或创建新项目</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 创建项目对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
            <DialogDescription>填写客户信息创建文案项目</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">客户姓名 *</label>
              <Input
                value={newProjectForm.client_name}
                onChange={(e) => setNewProjectForm({...newProjectForm, client_name: e.target.value})}
                placeholder="请输入客户姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium">案件ID</label>
              <Input
                value={newProjectForm.case_id}
                onChange={(e) => setNewProjectForm({...newProjectForm, case_id: e.target.value})}
                placeholder="可选，自动生成"
              />
            </div>
            <div>
              <label className="text-sm font-medium">签证类型</label>
              <Select
                value={newProjectForm.visa_type}
                onValueChange={(v) => setNewProjectForm({...newProjectForm, visa_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GTV">Global Talent Visa (GTV)</SelectItem>
                  <SelectItem value="Startup">Startup Visa</SelectItem>
                  <SelectItem value="Innovator">Innovator Founder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectForm.client_name || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              创建项目
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上传材料对话框 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>上传原始材料</DialogTitle>
            <DialogDescription>
              支持多种格式：PDF、Word、图片、网页链接等，系统会自动提取和整理内容
            </DialogDescription>
          </DialogHeader>
          
          {/* 上传模式选择 */}
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "url" | "text")}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                文件上传
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                网页链接
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                文本粘贴
              </TabsTrigger>
            </TabsList>
            
            {/* 文件上传模式 */}
            <TabsContent value="file" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.csv,.xlsx,.xls,.json"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">点击选择文件或拖拽到此处</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    支持：PDF、Word、图片(JPG/PNG)、Excel、文本文件
                  </p>
                </label>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">已选择 {selectedFiles.length} 个文件：</p>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    {selectedFiles.map((file, idx) => {
                      const progress = uploadProgress.find(p => p.filename === file.name)
                      return (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </div>
                          {progress && (
                            <Badge variant={progress.status === "success" ? "default" : progress.status === "error" ? "destructive" : "secondary"}>
                              {progress.status === "uploading" ? "上传中..." : progress.status === "success" ? "成功" : "失败"}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
            
            {/* URL模式 */}
            <TabsContent value="url" className="space-y-4">
              <div>
                <label className="text-sm font-medium">网页链接</label>
                <Input
                  value={uploadForm.url}
                  onChange={(e) => setUploadForm({...uploadForm, url: e.target.value})}
                  placeholder="https://example.com/article"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  输入网页URL，系统会自动提取页面内容（如新闻报道、个人主页、项目介绍等）
                </p>
              </div>
            </TabsContent>
            
            {/* 文本模式 */}
            <TabsContent value="text" className="space-y-4">
              <div>
                <label className="text-sm font-medium">文件名（可选）</label>
                <Input
                  value={uploadForm.filename}
                  onChange={(e) => setUploadForm({...uploadForm, filename: e.target.value})}
                  placeholder="例如: 个人经历.txt"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">材料内容</label>
                <Textarea
                  value={uploadForm.content}
                  onChange={(e) => setUploadForm({...uploadForm, content: e.target.value})}
                  placeholder="粘贴材料内容..."
                  rows={10}
                  className="font-mono text-sm mt-1"
                />
              </div>
            </TabsContent>
          </Tabs>
          
          {/* 分类选择（可选） */}
          <div>
            <label className="text-sm font-medium">材料类别（可选，留空自动识别）</label>
            <Select
              value={uploadForm.category}
              onValueChange={(v) => setUploadForm({...uploadForm, category: v})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="自动识别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动识别</SelectItem>
                <SelectItem value="简历">简历</SelectItem>
                <SelectItem value="推荐信">推荐信</SelectItem>
                <SelectItem value="证书">证书</SelectItem>
                <SelectItem value="论文">论文</SelectItem>
                <SelectItem value="专利">专利</SelectItem>
                <SelectItem value="奖项">奖项</SelectItem>
                <SelectItem value="媒体报道">媒体报道</SelectItem>
                <SelectItem value="作品集">作品集</SelectItem>
                <SelectItem value="个人陈述">个人陈述</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsUploadDialogOpen(false)
              setSelectedFiles([])
              setUploadProgress([])
            }}>
              取消
            </Button>
            <Button 
              onClick={handleUploadMaterial} 
              disabled={
                loading || 
                (uploadMode === "file" && selectedFiles.length === 0) ||
                (uploadMode === "url" && !uploadForm.url) ||
                (uploadMode === "text" && !uploadForm.content)
              }
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploadMode === "file" ? `上传 ${selectedFiles.length} 个文件` : uploadMode === "url" ? "提取内容" : "上传文本"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 文档查看器 */}
      <Dialog open={isDocumentViewerOpen} onOpenChange={setIsDocumentViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.path}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="prose dark:prose-invert max-w-none p-4 bg-muted/30 rounded-lg">
              <ReactMarkdown>{selectedDocument?.content || ''}</ReactMarkdown>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentViewerOpen(false)}>关闭</Button>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(selectedDocument?.content || '')
              setSuccess("已复制到剪贴板")
            }}>
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI助手对话框 */}
      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI文案助手
            </DialogTitle>
            <DialogDescription>使用AI生成、优化、翻译和审核文档</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">操作类型</label>
                <Select
                  value={agentForm.action}
                  onValueChange={(v) => setAgentForm({...agentForm, action: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generate">生成文档</SelectItem>
                    <SelectItem value="optimize">优化内容</SelectItem>
                    <SelectItem value="review">审核文档</SelectItem>
                    <SelectItem value="translate">中英翻译</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {agentForm.action === 'generate' && (
                <div>
                  <label className="text-sm font-medium">文档类型</label>
                  <Select
                    value={agentForm.document_type}
                    onValueChange={(v) => setAgentForm({...agentForm, document_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal_statement">个人陈述</SelectItem>
                      <SelectItem value="cv_resume">简历/CV</SelectItem>
                      <SelectItem value="recommendation_letter">推荐信</SelectItem>
                      <SelectItem value="cover_letter">申请信</SelectItem>
                      <SelectItem value="evidence_summary">证据摘要</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {agentForm.action === 'optimize' && (
                <div>
                  <label className="text-sm font-medium">优化类型</label>
                  <Select
                    value={agentForm.optimization_type}
                    onValueChange={(v) => setAgentForm({...agentForm, optimization_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">全面优化</SelectItem>
                      <SelectItem value="grammar">语法检查</SelectItem>
                      <SelectItem value="clarity">清晰度</SelectItem>
                      <SelectItem value="professional">专业性</SelectItem>
                      <SelectItem value="persuasive">说服力</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">输入内容</label>
                <Textarea
                  value={agentForm.content}
                  onChange={(e) => setAgentForm({...agentForm, content: e.target.value})}
                  placeholder="输入需要处理的内容..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={runAgentAction}
                disabled={processing || !agentForm.content}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                执行
              </Button>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">AI输出结果</label>
              <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30">
                {agentResult ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>{agentResult}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>执行操作后结果将显示在这里</p>
                  </div>
                )}
              </ScrollArea>
              
              {agentResult && (
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(agentResult)
                      setSuccess("已复制到剪贴板")
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setAgentForm({...agentForm, content: agentResult})}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    作为输入
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAgentDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 材料分析结果弹窗 - 完整脑图 */}
      <Dialog open={isAnalysisDialogOpen} onOpenChange={setIsAnalysisDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              GTV递交框架 - 材料分析脑图
            </DialogTitle>
            <DialogDescription>
              基于已收集的材料自动生成的完整GTV申请框架，参考Tech Nation评估标准
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-0">
            {analysisResult ? (
              <div className="space-y-4 py-2">
                {/* 统计概览 - 更紧凑 */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-blue-600">{analysisResult.statistics?.total_files || 0}</div>
                    <div className="text-xs text-muted-foreground">已收集文件</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-green-600">{analysisResult.statistics?.mc_coverage || 0}%</div>
                    <div className="text-xs text-muted-foreground">MC覆盖率</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-purple-600">{analysisResult.statistics?.oc_coverage || 0}%</div>
                    <div className="text-xs text-muted-foreground">OC覆盖率</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-orange-600">{analysisResult.statistics?.reference_count || 0}/3</div>
                    <div className="text-xs text-muted-foreground">推荐信</div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${
                    analysisResult.statistics?.oc_coverage >= 100 && analysisResult.statistics?.mc_coverage >= 50
                      ? 'bg-green-100 dark:bg-green-950/50'
                      : 'bg-yellow-100 dark:bg-yellow-950/50'
                  }`}>
                    <div className="text-xl font-bold">
                      {analysisResult.statistics?.oc_coverage >= 100 && analysisResult.statistics?.mc_coverage >= 50 ? '✅' : '⚠️'}
                    </div>
                    <div className="text-xs text-muted-foreground">评估状态</div>
                  </div>
                </div>

                {/* 待补充提醒 */}
                {analysisResult.report?.missing_items?.length > 0 && (
                  <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-sm">
                      <span className="font-medium">待补充：</span>
                      {analysisResult.report.missing_items.join(' | ')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* 完整思维导图 */}
                {analysisResult.mindmap && (
                  <Mindmap 
                    data={analysisResult.mindmap} 
                    title={`${selectedProject?.client_name || '客户'} - GTV递交框架`}
                    className="min-h-[400px]"
                  />
                )}

                {/* MC/OC状态摘要 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      必选标准 (MC) - 需满足1项
                    </h4>
                    <div className="space-y-1">
                      {analysisResult.report?.mc_status && Object.entries(analysisResult.report.mc_status).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="truncate">{key.replace(/_/g, ' ').replace('MC', '')}</span>
                          <Badge variant={value.status === '充足' ? 'default' : value.status === '基本' ? 'secondary' : 'destructive'} className="text-[10px] px-1.5">
                            {value.count}个
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      可选标准 (OC) - 需满足2项
                    </h4>
                    <div className="space-y-1">
                      {analysisResult.report?.oc_status && Object.entries(analysisResult.report.oc_status).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="truncate">{key.replace(/_/g, ' ').replace('OC', '')}</span>
                          <Badge variant={value.status === '充足' ? 'default' : value.status === '基本' ? 'secondary' : 'destructive'} className="text-[10px] px-1.5">
                            {value.count}个
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">正在分析材料，生成GTV框架...</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="shrink-0 border-t pt-3 flex justify-between">
            <div className="text-xs text-muted-foreground">
              分析时间: {analysisResult?.analyzed_at ? new Date(analysisResult.analyzed_at).toLocaleString('zh-CN') : '-'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAnalysisDialogOpen(false)}>关闭</Button>
              <Button variant="outline" onClick={() => runWorkflowStep('analyze')}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重新分析
              </Button>
              <Button onClick={() => {
                setSuccess("导出功能开发中...")
              }}>
                <Download className="h-4 w-4 mr-2" />
                导出XMind
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 统一文件预览组件 */}
      <UnifiedFilePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewingFile}
      />

      <Footer />
    </div>
  )
}
