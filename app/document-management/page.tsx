"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Search,
  Sparkles,
  FileCheck,
  Clock,
  User,
  Briefcase,
  FolderOpen,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronRight,
  Filter,
  MoreVertical,
  ArrowUpDown,
  Copy,
  Archive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
  Send,
  Star,
  MessageSquare,
  Paperclip,
  Settings,
  BarChart3,
  Target,
  ExternalLink,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

interface Client {
  id: string
  name: string
  email: string
  phone: string
  nationality: string
  passport_number: string
  notes: string
  created_at: string
  updated_at: string
}

interface Case {
  id: string
  client_id: string
  case_type: string
  visa_type: string
  status: string
  priority: string
  description: string
  target_submission_date: string
  created_at: string
  updated_at: string
}

interface Document {
  id: string
  case_id: string
  document_type: string
  title: string
  content: string
  file_path: string
  file_type: string
  file_size: number
  status: string
  notes: string
  created_at: string
  updated_at: string
  version?: number
  tags?: string[]
}

interface ProgressItem {
  id: string
  case_id: string
  milestone: string
  status: string
  description: string
  completed_at: string
  created_at: string
  updated_at: string
}

interface Timeline {
  id: string
  case_id: string
  task_name: string
  task_type: string
  start_date: string
  due_date: string
  status: string
  assignee: string
  description: string
  created_at: string
  updated_at: string
  dependencies?: string[]
}

export default function DocumentManagementPage() {
  const router = useRouter()
  const [activeView, setActiveView] = useState<"overview" | "cases" | "documents" | "timeline">("overview")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")

  // 数据状态
  const [clients, setClients] = useState<Client[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [progress, setProgress] = useState<ProgressItem[]>([])
  const [timeline, setTimeline] = useState<Timeline[]>([])
  
  // 选中状态
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  
  // 对话框状态
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false)
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false)
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false)
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false)
  
  // 表单状态
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    nationality: "",
    passport_number: "",
    notes: "",
  })

  const [caseForm, setCaseForm] = useState({
    client_id: "",
    case_type: "GTV",
    visa_type: "",
    status: "draft",
    priority: "normal",
    description: "",
    target_submission_date: "",
  })

  const [documentForm, setDocumentForm] = useState({
    case_id: "",
    document_type: "raw",
    title: "",
    content: "",
    notes: "",
    tags: [] as string[],
  })

  const [timelineForm, setTimelineForm] = useState({
    case_id: "",
    task_name: "",
    task_type: "document",
    start_date: "",
    due_date: "",
    status: "pending",
    assignee: "",
    description: "",
  })

  // 加载数据
  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/document-management/api/clients")
      const data = await response.json()
      if (data.success) {
        setClients(data.data || [])
      }
    } catch (err) {
      setError("加载客户列表失败")
    } finally {
      setLoading(false)
    }
  }

  const loadCases = async (clientId?: string) => {
    try {
      const url = clientId
        ? `/api/document-management/api/cases?client_id=${clientId}`
        : "/api/document-management/api/cases"
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setCases(data.data || [])
      }
    } catch (err) {
      setError("加载案件列表失败")
    }
  }

  const loadDocuments = async (caseId?: string) => {
    try {
      const url = caseId
        ? `/api/document-management/api/documents?case_id=${caseId}`
        : "/api/document-management/api/documents"
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setDocuments(data.data || [])
      }
    } catch (err) {
      setError("加载文档列表失败")
    }
  }

  const loadProgress = async (caseId: string) => {
    try {
      const response = await fetch(`/api/document-management/api/progress/${caseId}`)
      const data = await response.json()
      if (data.success) {
        setProgress(data.data || [])
      }
    } catch (err) {
      setError("加载进度失败")
    }
  }

  const loadTimeline = async (caseId: string) => {
    try {
      const response = await fetch(`/api/document-management/api/timeline/${caseId}`)
      const data = await response.json()
      if (data.success) {
        setTimeline(data.data || [])
      }
    } catch (err) {
      setError("加载时间规划失败")
    }
  }

  useEffect(() => {
    loadClients()
    loadCases()
    loadDocuments()
  }, [])

  useEffect(() => {
    if (selectedCase) {
      loadDocuments(selectedCase.id)
      loadProgress(selectedCase.id)
      loadTimeline(selectedCase.id)
    }
  }, [selectedCase])

  // 客户操作
  const handleCreateClient = async () => {
    try {
      const response = await fetch("/api/document-management/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("客户创建成功")
        setClientForm({
          name: "",
          email: "",
          phone: "",
          nationality: "",
          passport_number: "",
          notes: "",
        })
        setIsClientDialogOpen(false)
        loadClients()
      } else {
        setError(data.error || "创建失败")
      }
    } catch (err) {
      setError("创建客户失败")
    }
  }

  // 案件操作
  const handleCreateCase = async () => {
    try {
      const response = await fetch("/api/document-management/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseForm),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("案件创建成功")
        setCaseForm({
          client_id: "",
          case_type: "GTV",
          visa_type: "",
          status: "draft",
          priority: "normal",
          description: "",
          target_submission_date: "",
        })
        setIsCaseDialogOpen(false)
        loadCases()
      } else {
        setError(data.error || "创建失败")
      }
    } catch (err) {
      setError("创建案件失败")
    }
  }

  // 文档操作
  const handleCreateDocument = async () => {
    try {
      const response = await fetch("/api/document-management/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...documentForm,
          case_id: selectedCase?.id || documentForm.case_id,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("文档创建成功")
        setDocumentForm({
          case_id: "",
          document_type: "raw",
          title: "",
          content: "",
          notes: "",
          tags: [],
        })
        setIsDocumentDialogOpen(false)
        loadDocuments(selectedCase?.id)
      } else {
        setError(data.error || "创建失败")
      }
    } catch (err) {
      setError("创建文档失败")
    }
  }

  // LLM辅助功能
  const handleProcessRawDocument = async (documentId: string, content: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/document-management/api/llm/process-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          document_type: "resume",
        }),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("文档处理成功")
        return data.data
      } else {
        setError(data.error || "处理失败")
      }
    } catch (err) {
      setError("LLM处理失败")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDocument = async (caseId: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/document-management/api/llm/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("文档生成成功")
        return data.content
      } else {
        setError(data.error || "生成失败")
      }
    } catch (err) {
      setError("LLM生成失败")
    } finally {
      setLoading(false)
    }
  }

  const handleOptimizeDocument = async (content: string, type: string = "grammar") => {
    try {
      setLoading(true)
      const response = await fetch("/api/document-management/api/llm/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("文档优化成功")
        return data.content
      } else {
        setError(data.error || "优化失败")
      }
    } catch (err) {
      setError("LLM优化失败")
    } finally {
      setLoading(false)
    }
  }

  const handleCheckCompleteness = async (caseId: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/document-management/api/llm/check-completeness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("完整性检查完成")
        return data.data
      } else {
        setError(data.error || "检查失败")
      }
    } catch (err) {
      setError("完整性检查失败")
    } finally {
      setLoading(false)
    }
  }

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

  // 状态徽章样式
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      draft: { variant: "secondary", icon: Edit },
      in_progress: { variant: "default", icon: Clock },
      review: { variant: "outline", icon: Eye },
      submitted: { variant: "default", icon: Send },
      completed: { variant: "default", icon: CheckCircle2 },
      pending: { variant: "secondary", icon: Clock },
    }
    const config = statusStyles[status] || statusStyles.draft
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status === "draft" && "草稿"}
        {status === "in_progress" && "进行中"}
        {status === "review" && "审核中"}
        {status === "submitted" && "已提交"}
        {status === "completed" && "已完成"}
        {status === "pending" && "待处理"}
      </Badge>
    )
  }

  // 优先级徽章样式
  const getPriorityBadge = (priority: string) => {
    const priorityStyles: Record<string, { className: string, icon: any }> = {
      low: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: ArrowUpDown },
      normal: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: ArrowUpDown },
      high: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: AlertTriangle },
      urgent: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: AlertTriangle },
    }
    const config = priorityStyles[priority] || priorityStyles.normal
    const Icon = config.icon
    
    return (
      <Badge className={config.className + " flex items-center gap-1"}>
        <Icon className="h-3 w-3" />
        {priority === "low" && "低"}
        {priority === "normal" && "普通"}
        {priority === "high" && "高"}
        {priority === "urgent" && "紧急"}
      </Badge>
    )
  }

  // 过滤案件
  const filteredCases = cases.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false
    if (filterPriority !== "all" && c.priority !== filterPriority) return false
    if (searchQuery && !c.case_type.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !c.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // 计算统计数据
  const stats = {
    totalCases: cases.length,
    activeCases: cases.filter(c => c.status === "in_progress").length,
    completedCases: cases.filter(c => c.status === "completed").length,
    totalDocuments: documents.length,
    rawDocuments: documents.filter(d => d.document_type === "raw").length,
    processedDocuments: documents.filter(d => d.document_type === "processed").length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Navbar />
      
      {/* 消息提示 - 固定在顶部 */}
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                    文案管理系统
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    英国GTV签证移民律师文案管理系统 - 全流程智能化管理
                  </p>
                </div>
              </div>
            </div>
            
            {/* 快速操作按钮 */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => {
                loadClients()
                loadCases()
                loadDocuments()
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新数据
              </Button>
              <Button variant="outline" onClick={() => setIsClientDialogOpen(true)}>
                <User className="h-4 w-4 mr-2" />
                新增客户
              </Button>
              <Button onClick={() => setIsCaseDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新建案件
              </Button>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">总案件数</p>
                    <p className="text-3xl font-bold">{stats.totalCases}</p>
                  </div>
                  <Briefcase className="h-10 w-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">进行中</p>
                    <p className="text-3xl font-bold">{stats.activeCases}</p>
                  </div>
                  <Clock className="h-10 w-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">已完成</p>
                    <p className="text-3xl font-bold">{stats.completedCases}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">总文档数</p>
                    <p className="text-3xl font-bold">{stats.totalDocuments}</p>
                  </div>
                  <FileText className="h-10 w-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-sm">原始材料</p>
                    <p className="text-3xl font-bold">{stats.rawDocuments}</p>
                  </div>
                  <Upload className="h-10 w-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm">加工材料</p>
                    <p className="text-3xl font-bold">{stats.processedDocuments}</p>
                  </div>
                  <Sparkles className="h-10 w-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 主内容区 - 视图切换 */}
        <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-white dark:bg-slate-900 shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden md:inline">概览</span>
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden md:inline">案件管理</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden md:inline">文档中心</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden md:inline">时间线</span>
            </TabsTrigger>
          </TabsList>

          {/* 概览视图 */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 最近案件 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    最近案件
                  </CardTitle>
                  <CardDescription>查看最新创建的案件</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {cases.slice(0, 5).map((caseItem) => (
                        <Card 
                          key={caseItem.id} 
                          className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                          onClick={() => {
                            setSelectedCase(caseItem)
                            setActiveView("cases")
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{caseItem.case_type}</h4>
                                {getStatusBadge(caseItem.status)}
                                {getPriorityBadge(caseItem.priority)}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {caseItem.description}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  目标: {caseItem.target_submission_date || "未设置"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  创建: {new Date(caseItem.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* 快速操作和客户列表 */}
              <div className="space-y-6">
                {/* 快速操作 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      快速操作
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full justify-start" variant="outline" onClick={() => setIsCaseDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      创建新案件
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setIsDocumentDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      上传文档
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setIsClientDialogOpen(true)}>
                      <User className="h-4 w-4 mr-2" />
                      添加客户
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveView("timeline")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      查看时间线
                    </Button>
                  </CardContent>
                </Card>

                {/* 客户列表 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      客户列表
                    </CardTitle>
                    <CardDescription>总共 {clients.length} 位客户</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {clients.slice(0, 8).map((client) => (
                          <div 
                            key={client.id} 
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors group"
                            onClick={() => router.push(`/document-management/clients/${client.id}`)}
                          >
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{client.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 案件管理视图 */}
          <TabsContent value="cases" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 案件列表 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>案件列表</CardTitle>
                      <CardDescription>管理所有案件信息</CardDescription>
                    </div>
                    <Button onClick={() => setIsCaseDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      新建案件
                    </Button>
                  </div>
                  
                  {/* 搜索和过滤 */}
                  <div className="flex items-center gap-3 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="搜索案件..." 
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="in_progress">进行中</SelectItem>
                        <SelectItem value="review">审核中</SelectItem>
                        <SelectItem value="submitted">已提交</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="优先级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部优先级</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="normal">普通</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">紧急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {filteredCases.map((caseItem) => (
                        <Card 
                          key={caseItem.id} 
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedCase?.id === caseItem.id ? "border-primary shadow-md" : ""
                          }`}
                          onClick={() => setSelectedCase(caseItem)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg">{caseItem.case_type}</h4>
                                {getStatusBadge(caseItem.status)}
                                {getPriorityBadge(caseItem.priority)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {caseItem.description || "暂无描述"}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  签证类型: {caseItem.visa_type || "未设置"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  目标: {caseItem.target_submission_date || "未设置"}
                                </span>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCase(caseItem)
                                  setActiveView("documents")
                                }}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  查看文档
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCase(caseItem)
                                  setActiveView("timeline")
                                }}>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  时间线
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* 案件详情 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    案件详情
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCase ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{selectedCase.case_type}</h3>
                        <div className="flex gap-2 mb-4">
                          {getStatusBadge(selectedCase.status)}
                          {getPriorityBadge(selectedCase.priority)}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">签证类型</p>
                          <p className="font-medium">{selectedCase.visa_type || "未设置"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">目标提交日期</p>
                          <p className="font-medium">{selectedCase.target_submission_date || "未设置"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">描述</p>
                          <p className="text-sm">{selectedCase.description || "暂无描述"}</p>
                        </div>
                      </div>

                      <Separator />

                      {/* 进度信息 */}
                      <div>
                        <p className="text-sm font-medium mb-3">案件进度</p>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {progress.map((p) => (
                              <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                                <div className="mt-0.5">
                                  {p.status === "completed" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{p.milestone}</p>
                                  <p className="text-xs text-muted-foreground">{p.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <Separator />

                      {/* 操作按钮 */}
                      <div className="space-y-2">
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => setActiveView("documents")}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          查看文档
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => setActiveView("timeline")}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          查看时间线
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={async () => {
                            const result = await handleCheckCompleteness(selectedCase.id)
                            if (result) {
                              alert(`完整性评分: ${result.completeness_score}/100`)
                            }
                          }}
                        >
                          <FileCheck className="h-4 w-4 mr-2" />
                          检查完整性
                        </Button>
                        <Button 
                          className="w-full"
                          onClick={async () => {
                            const content = await handleGenerateDocument(selectedCase.id)
                            if (content) {
                              setDocumentForm({
                                ...documentForm,
                                case_id: selectedCase.id,
                                document_type: "processed",
                                content,
                              })
                              setIsDocumentDialogOpen(true)
                            }
                          }}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI生成文档
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground">请选择一个案件查看详情</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 文档中心视图 */}
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>文档中心</CardTitle>
                    <CardDescription>
                      {selectedCase 
                        ? `${selectedCase.case_type} - 文档管理` 
                        : "管理所有文档"
                      }
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedCase && (
                      <Button variant="outline" onClick={() => setSelectedCase(null)}>
                        查看全部
                      </Button>
                    )}
                    <Button onClick={() => setIsDocumentDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      新增文档
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="raw" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="raw">
                      <Upload className="h-4 w-4 mr-2" />
                      原始材料 ({documents.filter(d => d.document_type === "raw").length})
                    </TabsTrigger>
                    <TabsTrigger value="processed">
                      <Sparkles className="h-4 w-4 mr-2" />
                      加工材料 ({documents.filter(d => d.document_type === "processed").length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="raw" className="mt-6">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents
                          .filter((d) => d.document_type === "raw")
                          .map((doc) => (
                            <Card key={doc.id} className="group hover:shadow-lg transition-all">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                                      <FileText className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedDocument(doc)
                                        setIsDocumentViewerOpen(true)
                                      }}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        查看
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Edit className="h-4 w-4 mr-2" />
                                        编辑
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async () => {
                                        const result = await handleProcessRawDocument(doc.id, doc.content)
                                        if (result) {
                                          setSuccess("文档处理完成")
                                        }
                                      }}>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        AI处理
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                  {doc.content.substring(0, 150)}...
                                </p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </span>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedDocument(doc)
                                      setIsDocumentViewerOpen(true)
                                    }}
                                  >
                                    查看详情
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="processed" className="mt-6">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents
                          .filter((d) => d.document_type === "processed")
                          .map((doc) => (
                            <Card key={doc.id} className="group hover:shadow-lg transition-all">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                                      <Sparkles className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedDocument(doc)
                                        setIsDocumentViewerOpen(true)
                                      }}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        查看
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Edit className="h-4 w-4 mr-2" />
                                        编辑
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async () => {
                                        const optimized = await handleOptimizeDocument(doc.content, "grammar")
                                        if (optimized) {
                                          setSuccess("文档优化完成")
                                        }
                                      }}>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        AI优化
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Download className="h-4 w-4 mr-2" />
                                        导出
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                  {doc.content.substring(0, 150)}...
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {doc.status && getStatusBadge(doc.status)}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 时间线视图 */}
          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      时间线规划
                    </CardTitle>
                    <CardDescription>
                      {selectedCase 
                        ? `${selectedCase.case_type} - 任务时间线` 
                        : "查看所有任务的时间规划"
                      }
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedCase && (
                      <Button variant="outline" onClick={() => setSelectedCase(null)}>
                        查看全部
                      </Button>
                    )}
                    <Button onClick={() => setIsTimelineDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加任务
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[700px] pr-4">
                  <div className="relative">
                    {/* 垂直时间线 */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400"></div>
                    
                    <div className="space-y-8 pl-16">
                      {timeline.map((item, index) => {
                        const isOverdue = item.status !== "completed" && new Date(item.due_date) < new Date()
                        const isUpcoming = new Date(item.start_date) > new Date()
                        
                        return (
                          <div key={item.id} className="relative">
                            {/* 时间线节点 */}
                            <div className={`absolute -left-16 top-6 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                              item.status === "completed" 
                                ? "bg-gradient-to-br from-green-400 to-green-600" 
                                : isOverdue
                                ? "bg-gradient-to-br from-red-400 to-red-600"
                                : isUpcoming
                                ? "bg-gradient-to-br from-blue-400 to-blue-600"
                                : "bg-gradient-to-br from-yellow-400 to-yellow-600"
                            }`}>
                              {item.status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-white" />
                              ) : isOverdue ? (
                                <AlertTriangle className="h-5 w-5 text-white" />
                              ) : isUpcoming ? (
                                <Clock className="h-5 w-5 text-white" />
                              ) : (
                                <Target className="h-5 w-5 text-white" />
                              )}
                            </div>

                            {/* 任务卡片 */}
                            <Card className={`hover:shadow-xl transition-all ${
                              item.status === "completed" ? "border-green-200 dark:border-green-800" :
                              isOverdue ? "border-red-200 dark:border-red-800" : ""
                            }`}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CardTitle className="text-lg">{item.task_name}</CardTitle>
                                      {getStatusBadge(item.status)}
                                    </div>
                                    <CardDescription className="flex items-center gap-4 text-xs">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        开始: {item.start_date}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        截止: {item.due_date}
                                      </span>
                                      {item.assignee && (
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {item.assignee}
                                        </span>
                                      )}
                                    </CardDescription>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Edit className="h-4 w-4 mr-2" />
                                        编辑任务
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        标记完成
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Copy className="h-4 w-4 mr-2" />
                                        复制任务
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除任务
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                  {item.description || "暂无描述"}
                                </p>
                                
                                {/* 任务类型标签 */}
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    {item.task_type === "document" && <FileText className="h-3 w-3" />}
                                    {item.task_type === "review" && <Eye className="h-3 w-3" />}
                                    {item.task_type === "meeting" && <Users className="h-3 w-3" />}
                                    {item.task_type}
                                  </Badge>
                                  
                                  {/* 进度指示器 */}
                                  {item.status !== "completed" && !isUpcoming && (
                                    <div className="flex-1 ml-4">
                                      <div className="flex items-center gap-2">
                                        <Progress value={50} className="h-2" />
                                        <span className="text-xs text-muted-foreground">50%</span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* 过期警告 */}
                                {isOverdue && (
                                  <Alert variant="destructive" className="mt-3">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                      任务已过期！请尽快处理
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )
                      })}
                      
                      {timeline.length === 0 && (
                        <div className="text-center py-12">
                          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                          <p className="text-muted-foreground mb-4">暂无任务规划</p>
                          <Button onClick={() => setIsTimelineDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            创建第一个任务
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 对话框 - 新增客户 */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增客户</DialogTitle>
            <DialogDescription>填写客户基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">姓名 *</label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="请输入客户姓名"
                />
              </div>
              <div>
                <label className="text-sm font-medium">邮箱 *</label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">电话</label>
                <Input
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  placeholder="+86 123 4567 8900"
                />
              </div>
              <div>
                <label className="text-sm font-medium">国籍</label>
                <Input
                  value={clientForm.nationality}
                  onChange={(e) => setClientForm({ ...clientForm, nationality: e.target.value })}
                  placeholder="例如: 中国"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">护照号</label>
                <Input
                  value={clientForm.passport_number}
                  onChange={(e) => setClientForm({ ...clientForm, passport_number: e.target.value })}
                  placeholder="请输入护照号码"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">备注</label>
              <Textarea
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                rows={3}
                placeholder="添加客户相关备注信息..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreateClient} disabled={!clientForm.name || !clientForm.email}>
              <Plus className="h-4 w-4 mr-2" />
              创建客户
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对话框 - 新增案件 */}
      <Dialog open={isCaseDialogOpen} onOpenChange={setIsCaseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建案件</DialogTitle>
            <DialogDescription>填写案件基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">选择客户 *</label>
              <Select
                value={caseForm.client_id}
                onValueChange={(value) => setCaseForm({ ...caseForm, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">案件类型 *</label>
                <Input
                  value={caseForm.case_type}
                  onChange={(e) => setCaseForm({ ...caseForm, case_type: e.target.value })}
                  placeholder="例如: GTV"
                />
              </div>
              <div>
                <label className="text-sm font-medium">签证类型</label>
                <Input
                  value={caseForm.visa_type}
                  onChange={(e) => setCaseForm({ ...caseForm, visa_type: e.target.value })}
                  placeholder="例如: Global Talent Visa"
                />
              </div>
              <div>
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={caseForm.status}
                  onValueChange={(value) => setCaseForm({ ...caseForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="review">审核中</SelectItem>
                    <SelectItem value="submitted">已提交</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">优先级</label>
                <Select
                  value={caseForm.priority}
                  onValueChange={(value) => setCaseForm({ ...caseForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">目标提交日期</label>
              <Input
                type="date"
                value={caseForm.target_submission_date}
                onChange={(e) =>
                  setCaseForm({ ...caseForm, target_submission_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={caseForm.description}
                onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                rows={4}
                placeholder="添加案件详细描述..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCaseDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreateCase} disabled={!caseForm.client_id || !caseForm.case_type}>
              <Plus className="h-4 w-4 mr-2" />
              创建案件
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对话框 - 新增文档 */}
      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>新增文档</DialogTitle>
            <DialogDescription>
              {selectedCase ? `为 ${selectedCase.case_type} 添加文档` : "添加原始材料或加工后材料"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <div className="space-y-4 pr-4">
              {!selectedCase && (
                <div>
                  <label className="text-sm font-medium">选择案件 *</label>
                  <Select
                    value={documentForm.case_id}
                    onValueChange={(value) => setDocumentForm({ ...documentForm, case_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择案件" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          {caseItem.case_type} - {caseItem.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">文档类型 *</label>
                  <Select
                    value={documentForm.document_type}
                    onValueChange={(value) =>
                      setDocumentForm({ ...documentForm, document_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">原始材料</SelectItem>
                      <SelectItem value="processed">加工后材料</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">文档标题 *</label>
                  <Input
                    value={documentForm.title}
                    onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                    placeholder="请输入文档标题"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">文档内容 *</label>
                <Textarea
                  value={documentForm.content}
                  onChange={(e) => setDocumentForm({ ...documentForm, content: e.target.value })}
                  rows={15}
                  placeholder="输入或粘贴文档内容..."
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">备注</label>
                <Textarea
                  value={documentForm.notes}
                  onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })}
                  rows={3}
                  placeholder="添加文档相关备注..."
                />
              </div>
              {documentForm.document_type === "raw" && documentForm.content && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      const result = await handleProcessRawDocument("temp", documentForm.content)
                      if (result) {
                        setDocumentForm({
                          ...documentForm,
                          content: result.processed_content || documentForm.content,
                          document_type: "processed",
                        })
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI智能处理
                  </Button>
                </div>
              )}
              {documentForm.document_type === "processed" && documentForm.content && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      const optimized = await handleOptimizeDocument(documentForm.content, "grammar")
                      if (optimized) {
                        setDocumentForm({ ...documentForm, content: optimized })
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI语法优化
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      const optimized = await handleOptimizeDocument(documentForm.content, "style")
                      if (optimized) {
                        setDocumentForm({ ...documentForm, content: optimized })
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI风格优化
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentDialogOpen(false)}>取消</Button>
            <Button 
              onClick={handleCreateDocument} 
              disabled={!documentForm.title || !documentForm.content || (!selectedCase && !documentForm.case_id)}
            >
              <Save className="h-4 w-4 mr-2" />
              保存文档
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对话框 - 文档查看器 */}
      <Dialog open={isDocumentViewerOpen} onOpenChange={setIsDocumentViewerOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
            <CardDescription>
              {selectedDocument?.document_type === "raw" ? "原始材料" : "加工后材料"}
              {" · "}
              创建于 {selectedDocument?.created_at && new Date(selectedDocument.created_at).toLocaleString()}
            </CardDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <div className="p-4 bg-muted/30 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {selectedDocument?.content}
              </pre>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentViewerOpen(false)}>关闭</Button>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
