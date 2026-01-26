"use client"

import { use, useState, useEffect } from "react"
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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Edit,
  Save,
  Trash2,
  Plus,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Clock,
  Briefcase,
  FolderOpen,
  Mail,
  Phone,
  Globe,
  CreditCard,
  User,
  MoreVertical,
  Download,
  Eye,
  Target,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  MessageSquare,
  Send,
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
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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
}

interface Activity {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
}

interface ProgressPlan {
  id: string
  case_id: string
  milestone: string
  category: string // 'preparation' | 'document' | 'review' | 'submission' | 'followup'
  assignee: string
  start_date: string
  due_date: string
  status: string // 'pending' | 'in_progress' | 'completed' | 'delayed' | 'blocked'
  priority: string // 'low' | 'normal' | 'high' | 'urgent'
  description: string
  dependencies?: string[]
  actual_completion_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: clientId } = use(params)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  
  // 数据状态
  const [client, setClient] = useState<Client | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [progressPlans, setProgressPlans] = useState<ProgressPlan[]>([])
  
  // 对话框状态
  const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false)
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false)
  const [isProgressPlanDialogOpen, setIsProgressPlanDialogOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [editingPlan, setEditingPlan] = useState<ProgressPlan | null>(null)
  const [selectedProgressCaseId, setSelectedProgressCaseId] = useState<string>("")
  
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
    client_id: clientId,
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
  })

  const [progressPlanForm, setProgressPlanForm] = useState({
    case_id: "",
    milestone: "",
    category: "preparation",
    assignee: "",
    start_date: "",
    due_date: "",
    status: "pending",
    priority: "normal",
    description: "",
    notes: "",
  })

  // 加载客户数据
  const loadClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/document-management/api/clients/${clientId}`)
      const data = await response.json()
      if (data.success && data.data) {
        setClient(data.data)
        setClientForm({
          name: data.data.name,
          email: data.data.email,
          phone: data.data.phone,
          nationality: data.data.nationality,
          passport_number: data.data.passport_number,
          notes: data.data.notes,
        })
      } else {
        setError("客户不存在")
      }
    } catch (err) {
      setError("加载客户信息失败")
    } finally {
      setLoading(false)
    }
  }

  // 加载案件列表
  const loadCases = async () => {
    try {
      const response = await fetch(`/api/document-management/api/cases?client_id=${clientId}`)
      const data = await response.json()
      if (data.success) {
        setCases(data.data || [])
      }
    } catch (err) {
      console.error("加载案件失败:", err)
    }
  }

  // 加载文档列表
  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/document-management/api/documents?client_id=${clientId}`)
      const data = await response.json()
      if (data.success) {
        setDocuments(data.data || [])
      }
    } catch (err) {
      console.error("加载文档失败:", err)
    }
  }

  // 加载进度计划
  const loadProgressPlans = async () => {
    try {
      // 暂时使用模拟数据，实际应该从API获取
      const mockPlans: ProgressPlan[] = cases.flatMap(c => [
        {
          id: `plan-${c.id}-1`,
          case_id: c.id,
          milestone: "初步沟通与资料收集",
          category: "preparation",
          assignee: "文案专员",
          start_date: c.created_at.split('T')[0],
          due_date: new Date(new Date(c.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "completed",
          priority: "high",
          description: "与客户初步沟通，了解背景和需求，收集基础材料",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
        {
          id: `plan-${c.id}-2`,
          case_id: c.id,
          milestone: "简历和推荐信准备",
          category: "document",
          assignee: "高级文案",
          start_date: new Date(new Date(c.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(new Date(c.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: c.status === "completed" ? "completed" : "in_progress",
          priority: "high",
          description: "准备专业简历、整理推荐信材料",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
        {
          id: `plan-${c.id}-3`,
          case_id: c.id,
          milestone: "个人陈述撰写",
          category: "document",
          assignee: "资深文案",
          start_date: new Date(new Date(c.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(new Date(c.created_at).getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: c.status === "completed" ? "completed" : c.status === "in_progress" ? "in_progress" : "pending",
          priority: "urgent",
          description: "撰写个人陈述，突出申请人的专业成就和贡献",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
        {
          id: `plan-${c.id}-4`,
          case_id: c.id,
          milestone: "证明材料整理",
          category: "document",
          assignee: "文案助理",
          start_date: new Date(new Date(c.created_at).getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(new Date(c.created_at).getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: c.status === "completed" ? "completed" : "pending",
          priority: "normal",
          description: "整理学历、工作证明、奖项、出版物等支持材料",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
        {
          id: `plan-${c.id}-5`,
          case_id: c.id,
          milestone: "内部审核",
          category: "review",
          assignee: "律师团队",
          start_date: new Date(new Date(c.created_at).getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(new Date(c.created_at).getTime() + 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "pending",
          priority: "high",
          description: "律师团队全面审核材料完整性和合规性",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
        {
          id: `plan-${c.id}-6`,
          case_id: c.id,
          milestone: "客户确认与修改",
          category: "review",
          assignee: "文案专员",
          start_date: new Date(new Date(c.created_at).getTime() + 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(new Date(c.created_at).getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "pending",
          priority: "normal",
          description: "发送材料给客户确认，根据反馈进行调整",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
        {
          id: `plan-${c.id}-7`,
          case_id: c.id,
          milestone: "正式提交申请",
          category: "submission",
          assignee: "律师",
          start_date: new Date(new Date(c.created_at).getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: c.target_submission_date || new Date(new Date(c.created_at).getTime() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "pending",
          priority: "urgent",
          description: "向Home Office正式提交GTV申请",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
        {
          id: `plan-${c.id}-8`,
          case_id: c.id,
          milestone: "跟进申请进度",
          category: "followup",
          assignee: "客户经理",
          start_date: new Date(new Date(c.created_at).getTime() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(new Date(c.created_at).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "pending",
          priority: "normal",
          description: "定期跟进申请状态，及时响应补充材料要求",
          created_at: c.created_at,
          updated_at: c.updated_at,
        },
      ])
      setProgressPlans(mockPlans)
    } catch (err) {
      console.error("加载进度计划失败:", err)
    }
  }

  // 模拟活动记录
  const generateActivities = () => {
    const acts: Activity[] = []
    cases.forEach(c => {
      acts.push({
        id: `act-case-${c.id}`,
        type: "case",
        title: "创建案件",
        description: `案件 "${c.case_type}" 已创建`,
        timestamp: c.created_at,
      })
    })
    documents.forEach(d => {
      acts.push({
        id: `act-doc-${d.id}`,
        type: "document",
        title: "上传文档",
        description: `文档 "${d.title}" 已上传`,
        timestamp: d.created_at,
      })
    })
    acts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setActivities(acts.slice(0, 10))
  }

  useEffect(() => {
    loadClient()
    loadCases()
    loadDocuments()
  }, [clientId])

  useEffect(() => {
    generateActivities()
    loadProgressPlans()
    // 默认选择第一个案件
    if (cases.length > 0 && !selectedProgressCaseId) {
      setSelectedProgressCaseId(cases[0].id)
    }
  }, [cases, documents])

  // 更新客户信息
  const handleUpdateClient = async () => {
    try {
      const response = await fetch(`/api/document-management/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess("客户信息更新成功")
        setIsEditing(false)
        loadClient()
      } else {
        setError(data.error || "更新失败")
      }
    } catch (err) {
      setError("更新客户信息失败")
    }
  }

  // 创建案件
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
          client_id: clientId,
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

  // 状态徽章
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      draft: { variant: "secondary", label: "草稿" },
      in_progress: { variant: "default", label: "进行中" },
      review: { variant: "outline", label: "审核中" },
      submitted: { variant: "default", label: "已提交" },
      completed: { variant: "default", label: "已完成" },
    }
    const config = styles[status] || styles.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 优先级徽章
  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { className: string, label: string }> = {
      low: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "低" },
      normal: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "普通" },
      high: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", label: "高" },
      urgent: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "紧急" },
    }
    const config = styles[priority] || styles.normal
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // 统计数据
  const stats = {
    totalCases: cases.length,
    activeCases: cases.filter(c => c.status === "in_progress").length,
    completedCases: cases.filter(c => c.status === "completed").length,
    totalDocuments: documents.length,
    rawDocuments: documents.filter(d => d.document_type === "raw").length,
    processedDocuments: documents.filter(d => d.document_type === "processed").length,
  }

  if (loading && !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <Navbar />
        <div className="container mx-auto max-w-7xl p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载客户信息...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <Navbar />
        <div className="container mx-auto max-w-7xl p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-lg font-semibold mb-2">客户不存在</p>
              <p className="text-muted-foreground mb-4">未找到该客户的信息</p>
              <Button onClick={() => router.push("/document-management")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回主页
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => router.push("/document-management")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回文案管理
        </Button>

        {/* 客户头部信息 */}
        <Card className="mb-6 border-2">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                {/* 头像 */}
                <Avatar className="h-20 w-20 bg-gradient-to-br from-blue-500 to-purple-600">
                  <AvatarFallback className="text-2xl font-bold text-white">
                    {client.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* 客户基本信息 */}
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        value={clientForm.name}
                        onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                        className="text-2xl font-bold h-12"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={clientForm.email}
                          onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                          placeholder="邮箱"
                        />
                        <Input
                          value={clientForm.phone}
                          onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                          placeholder="电话"
                        />
                        <Input
                          value={clientForm.nationality}
                          onChange={(e) => setClientForm({ ...clientForm, nationality: e.target.value })}
                          placeholder="国籍"
                        />
                        <Input
                          value={clientForm.passport_number}
                          onChange={(e) => setClientForm({ ...clientForm, passport_number: e.target.value })}
                          placeholder="护照号"
                        />
                      </div>
                      <Textarea
                        value={clientForm.notes}
                        onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                        placeholder="备注"
                        rows={3}
                      />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold mb-3">{client.name}</h1>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{client.phone || "未填写"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>{client.nationality || "未填写"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          <span>{client.passport_number || "未填写"}</span>
                        </div>
                      </div>
                      {client.notes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">{client.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false)
                      setClientForm({
                        name: client.name,
                        email: client.email,
                        phone: client.phone,
                        nationality: client.nationality,
                        passport_number: client.passport_number,
                        notes: client.notes,
                      })
                    }}>
                      取消
                    </Button>
                    <Button onClick={handleUpdateClient}>
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          导出客户信息
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          发送消息
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除客户
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">总案件</p>
                  <p className="text-2xl font-bold">{stats.totalCases}</p>
                </div>
                <Briefcase className="h-8 w-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs">进行中</p>
                  <p className="text-2xl font-bold">{stats.activeCases}</p>
                </div>
                <Activity className="h-8 w-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs">已完成</p>
                  <p className="text-2xl font-bold">{stats.completedCases}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs">总文档</p>
                  <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                </div>
                <FileText className="h-8 w-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-xs">原始材料</p>
                  <p className="text-2xl font-bold">{stats.rawDocuments}</p>
                </div>
                <FolderOpen className="h-8 w-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-xs">加工材料</p>
                  <p className="text-2xl font-bold">{stats.processedDocuments}</p>
                </div>
                <Sparkles className="h-8 w-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-white dark:bg-slate-900 shadow-sm">
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              进度计划
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              案件列表
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              文档管理
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              活动记录
            </TabsTrigger>
          </TabsList>

          {/* 进度计划时间轴 */}
          <TabsContent value="progress" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-6 w-6 text-primary" />
                      进度计划时间轴
                    </CardTitle>
                    <CardDescription>客户案件的详细进度跟踪和计划管理</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {cases.length > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">选择案件:</label>
                        <Select value={selectedProgressCaseId} onValueChange={setSelectedProgressCaseId}>
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="选择案件" />
                          </SelectTrigger>
                          <SelectContent>
                            {cases.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.case_type} - {c.description?.substring(0, 20) || "无描述"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={() => setIsProgressPlanDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加任务
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {progressPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground mb-4">暂无进度计划</p>
                    <p className="text-sm text-muted-foreground mb-4">创建案件后将自动生成标准进度计划</p>
                  </div>
                ) : (
                  <div>
                    {/* 显示选中的案件 */}
                    {(() => {
                      const caseItem = cases.find(c => c.id === selectedProgressCaseId)
                      if (!caseItem) return null
                      
                      const casePlans = progressPlans.filter(p => p.case_id === caseItem.id)
                      if (casePlans.length === 0) return null
                      
                      // 计算进度
                      const completedCount = casePlans.filter(p => p.status === "completed").length
                      const progressPercentage = Math.round((completedCount / casePlans.length) * 100)
                      
                      return (
                        <div key={caseItem.id} className="mb-8 last:mb-0">
                          {/* 案件标题和进度 */}
                          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                  <Briefcase className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{caseItem.case_type}</h3>
                                  <p className="text-sm text-muted-foreground">{caseItem.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusBadge(caseItem.status)}
                                  {getPriorityBadge(caseItem.priority)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  目标日期: {caseItem.target_submission_date || "未设置"}
                                </p>
                              </div>
                            </div>
                            
                            {/* 总体进度条 */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">总体进度</span>
                                <span className="text-primary font-bold">{progressPercentage}%</span>
                              </div>
                              <Progress value={progressPercentage} className="h-3" />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>已完成 {completedCount}/{casePlans.length} 项任务</span>
                                <span>{casePlans.filter(p => p.status === "in_progress").length} 项进行中</span>
                              </div>
                            </div>
                          </div>

                          {/* 时间轴 */}
                          <ScrollArea className="h-[600px] pr-4">
                            <div className="relative">
                              {/* 垂直时间线 */}
                              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400"></div>
                              
                              <div className="space-y-6 pl-16">
                                {casePlans.map((plan, index) => {
                                  const isOverdue = plan.status !== "completed" && new Date(plan.due_date) < new Date()
                                  const isUpcoming = new Date(plan.start_date) > new Date()
                                  const isCurrent = plan.status === "in_progress"
                                  
                                  // 分类颜色
                                  const categoryColors: Record<string, { from: string, to: string, icon: any }> = {
                                    preparation: { from: "from-blue-400", to: "to-blue-600", icon: Target },
                                    document: { from: "from-purple-400", to: "to-purple-600", icon: FileText },
                                    review: { from: "from-orange-400", to: "to-orange-600", icon: Eye },
                                    submission: { from: "from-green-400", to: "to-green-600", icon: Send },
                                    followup: { from: "from-pink-400", to: "to-pink-600", icon: MessageSquare },
                                  }
                                  
                                  const categoryConfig = categoryColors[plan.category] || categoryColors.preparation
                                  const CategoryIcon = categoryConfig.icon
                                  
                                  return (
                                    <div key={plan.id} className="relative">
                                      {/* 时间线节点 */}
                                      <div className={`absolute -left-16 top-6 w-12 h-12 rounded-full flex items-center justify-center shadow-xl border-4 border-white dark:border-slate-900 ${
                                        plan.status === "completed" 
                                          ? "bg-gradient-to-br from-green-400 to-green-600" 
                                          : isOverdue
                                          ? "bg-gradient-to-br from-red-400 to-red-600"
                                          : isCurrent
                                          ? `bg-gradient-to-br ${categoryConfig.from} ${categoryConfig.to} animate-pulse`
                                          : isUpcoming
                                          ? "bg-gradient-to-br from-gray-300 to-gray-400"
                                          : `bg-gradient-to-br ${categoryConfig.from} ${categoryConfig.to}`
                                      }`}>
                                        {plan.status === "completed" ? (
                                          <CheckCircle2 className="h-6 w-6 text-white" />
                                        ) : isOverdue ? (
                                          <AlertTriangle className="h-6 w-6 text-white" />
                                        ) : (
                                          <CategoryIcon className="h-6 w-6 text-white" />
                                        )}
                                      </div>

                                      {/* 任务卡片 */}
                                      <Card className={`hover:shadow-2xl transition-all ${
                                        plan.status === "completed" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50" :
                                        isOverdue ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50" :
                                        isCurrent ? "border-primary shadow-lg" : ""
                                      }`}>
                                        <CardHeader className="pb-3">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              {/* 日期标签 - 移到顶部并突出显示 */}
                                              <div className="flex items-center gap-2 mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <div className="flex items-center gap-2 flex-1">
                                                  <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded shadow-sm">
                                                    <Clock className="h-4 w-4 text-blue-600" />
                                                    <span className="text-sm font-bold text-blue-600">{plan.start_date}</span>
                                                  </div>
                                                  <span className="text-muted-foreground">→</span>
                                                  <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded shadow-sm">
                                                    <Calendar className="h-4 w-4 text-purple-600" />
                                                    <span className="text-sm font-bold text-purple-600">{plan.due_date}</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded shadow-sm">
                                                  <User className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-xs font-medium">{plan.assignee}</span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {plan.category === "preparation" && "准备阶段"}
                                                  {plan.category === "document" && "文档准备"}
                                                  {plan.category === "review" && "审核阶段"}
                                                  {plan.category === "submission" && "提交阶段"}
                                                  {plan.category === "followup" && "跟进阶段"}
                                                </Badge>
                                                {plan.status === "completed" && (
                                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    已完成
                                                  </Badge>
                                                )}
                                                {plan.status === "in_progress" && (
                                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    进行中
                                                  </Badge>
                                                )}
                                                {plan.status === "pending" && (
                                                  <Badge variant="secondary">
                                                    待开始
                                                  </Badge>
                                                )}
                                                {isOverdue && (
                                                  <Badge variant="destructive">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    已逾期
                                                  </Badge>
                                                )}
                                                {plan.priority === "urgent" && (
                                                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    紧急
                                                  </Badge>
                                                )}
                                                {plan.priority === "high" && (
                                                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                                    高优先级
                                                  </Badge>
                                                )}
                                              </div>
                                              <CardTitle className="text-lg mb-2">{plan.milestone}</CardTitle>
                                              <CardDescription className="text-sm mb-3">
                                                {plan.description}
                                              </CardDescription>

                                              {/* 备注 */}
                                              {plan.notes && (
                                                <div className="p-2 bg-muted/50 rounded text-xs">
                                                  <p><span className="font-medium">备注：</span>{plan.notes}</p>
                                                </div>
                                              )}
                                            </div>
                                            
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                  <MoreVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                  setEditingPlan(plan)
                                                  setProgressPlanForm({
                                                    case_id: plan.case_id,
                                                    milestone: plan.milestone,
                                                    category: plan.category,
                                                    assignee: plan.assignee,
                                                    start_date: plan.start_date,
                                                    due_date: plan.due_date,
                                                    status: plan.status,
                                                    priority: plan.priority,
                                                    description: plan.description,
                                                    notes: plan.notes || "",
                                                  })
                                                  setIsProgressPlanDialogOpen(true)
                                                }}>
                                                  <Edit className="h-4 w-4 mr-2" />
                                                  编辑
                                                </DropdownMenuItem>
                                                {plan.status !== "completed" && (
                                                  <DropdownMenuItem>
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    标记完成
                                                  </DropdownMenuItem>
                                                )}
                                                {plan.status === "pending" && (
                                                  <DropdownMenuItem>
                                                    <Clock className="h-4 w-4 mr-2" />
                                                    开始任务
                                                  </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600">
                                                  <Trash2 className="h-4 w-4 mr-2" />
                                                  删除
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </CardHeader>
                                      </Card>

                                      {/* 连接线（如果有依赖关系） */}
                                      {index < casePlans.length - 1 && (
                                        <div className="absolute left-8 -bottom-3 w-px h-6 bg-gradient-to-b from-transparent via-muted to-transparent"></div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </ScrollArea>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 案件列表 */}
          <TabsContent value="cases" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>案件列表</CardTitle>
                    <CardDescription>该客户的所有案件</CardDescription>
                  </div>
                  <Button onClick={() => setIsCaseDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    新建案件
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground mb-4">暂无案件</p>
                    <Button onClick={() => setIsCaseDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      创建第一个案件
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cases.map((caseItem) => (
                      <Card 
                        key={caseItem.id} 
                        className="p-4 cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => router.push(`/document-management?case=${caseItem.id}`)}
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
                                <Calendar className="h-3 w-3" />
                                目标: {caseItem.target_submission_date || "未设置"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                创建: {new Date(caseItem.created_at).toLocaleDateString()}
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
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/document-management?case=${caseItem.id}`)
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 文档管理 */}
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>文档管理</CardTitle>
                    <CardDescription>该客户的所有文档材料</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="raw">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="raw">
                      原始材料 ({stats.rawDocuments})
                    </TabsTrigger>
                    <TabsTrigger value="processed">
                      加工材料 ({stats.processedDocuments})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="raw" className="mt-4">
                    {documents.filter(d => d.document_type === "raw").length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-muted-foreground">暂无原始材料</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents
                          .filter(d => d.document_type === "raw")
                          .map((doc) => (
                            <Card key={doc.id} className="group hover:shadow-lg transition-all">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Eye className="h-4 w-4 mr-2" />
                                        查看
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Edit className="h-4 w-4 mr-2" />
                                        编辑
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
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
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                                  {doc.content.substring(0, 100)}...
                                </p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="processed" className="mt-4">
                    {documents.filter(d => d.document_type === "processed").length === 0 ? (
                      <div className="text-center py-12">
                        <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-muted-foreground">暂无加工材料</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents
                          .filter(d => d.document_type === "processed")
                          .map((doc) => (
                            <Card key={doc.id} className="group hover:shadow-lg transition-all">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Eye className="h-4 w-4 mr-2" />
                                        查看
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Edit className="h-4 w-4 mr-2" />
                                        编辑
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
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                                  {doc.content.substring(0, 100)}...
                                </p>
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{doc.status || "待审核"}</Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 活动记录 */}
          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  活动记录
                </CardTitle>
                <CardDescription>客户的所有活动历史</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground">暂无活动记录</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400"></div>
                      
                      <div className="space-y-6 pl-12">
                        {activities.map((activity) => (
                          <div key={activity.id} className="relative">
                            <div className={`absolute -left-12 top-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                              activity.type === "case" 
                                ? "bg-gradient-to-br from-blue-400 to-blue-600" 
                                : "bg-gradient-to-br from-purple-400 to-purple-600"
                            }`}>
                              {activity.type === "case" ? (
                                <Briefcase className="h-4 w-4 text-white" />
                              ) : (
                                <FileText className="h-4 w-4 text-white" />
                              )}
                            </div>

                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium mb-1">{activity.title}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {activity.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 对话框 - 进度计划 */}
      <Dialog open={isProgressPlanDialogOpen} onOpenChange={setIsProgressPlanDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "编辑任务" : "添加任务"}</DialogTitle>
            <DialogDescription>管理案件进度计划和任务</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div>
                <label className="text-sm font-medium">选择案件 *</label>
                <Select
                  value={progressPlanForm.case_id}
                  onValueChange={(value) => setProgressPlanForm({ ...progressPlanForm, case_id: value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">里程碑名称 *</label>
                  <Input
                    value={progressPlanForm.milestone}
                    onChange={(e) => setProgressPlanForm({ ...progressPlanForm, milestone: e.target.value })}
                    placeholder="例如: 简历准备"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">任务类别 *</label>
                  <Select
                    value={progressPlanForm.category}
                    onValueChange={(value) => setProgressPlanForm({ ...progressPlanForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preparation">准备阶段</SelectItem>
                      <SelectItem value="document">文档准备</SelectItem>
                      <SelectItem value="review">审核阶段</SelectItem>
                      <SelectItem value="submission">提交阶段</SelectItem>
                      <SelectItem value="followup">跟进阶段</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">开始日期 *</label>
                  <Input
                    type="date"
                    value={progressPlanForm.start_date}
                    onChange={(e) => setProgressPlanForm({ ...progressPlanForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">截止日期 *</label>
                  <Input
                    type="date"
                    value={progressPlanForm.due_date}
                    onChange={(e) => setProgressPlanForm({ ...progressPlanForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">负责人 *</label>
                  <Input
                    value={progressPlanForm.assignee}
                    onChange={(e) => setProgressPlanForm({ ...progressPlanForm, assignee: e.target.value })}
                    placeholder="例如: 文案专员"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">状态</label>
                  <Select
                    value={progressPlanForm.status}
                    onValueChange={(value) => setProgressPlanForm({ ...progressPlanForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待开始</SelectItem>
                      <SelectItem value="in_progress">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="delayed">已延期</SelectItem>
                      <SelectItem value="blocked">被阻塞</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">优先级</label>
                <Select
                  value={progressPlanForm.priority}
                  onValueChange={(value) => setProgressPlanForm({ ...progressPlanForm, priority: value })}
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

              <div>
                <label className="text-sm font-medium">任务描述 *</label>
                <Textarea
                  value={progressPlanForm.description}
                  onChange={(e) => setProgressPlanForm({ ...progressPlanForm, description: e.target.value })}
                  rows={3}
                  placeholder="详细描述任务内容和要求..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">备注</label>
                <Textarea
                  value={progressPlanForm.notes}
                  onChange={(e) => setProgressPlanForm({ ...progressPlanForm, notes: e.target.value })}
                  rows={2}
                  placeholder="添加额外的备注信息..."
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsProgressPlanDialogOpen(false)
              setEditingPlan(null)
              setProgressPlanForm({
                case_id: "",
                milestone: "",
                category: "preparation",
                assignee: "",
                start_date: "",
                due_date: "",
                status: "pending",
                priority: "normal",
                description: "",
                notes: "",
              })
            }}>
              取消
            </Button>
            <Button onClick={() => {
              // TODO: 实现保存功能
              setSuccess(editingPlan ? "任务更新成功" : "任务创建成功")
              setIsProgressPlanDialogOpen(false)
              setEditingPlan(null)
            }} disabled={!progressPlanForm.case_id || !progressPlanForm.milestone || !progressPlanForm.start_date || !progressPlanForm.due_date}>
              <Save className="h-4 w-4 mr-2" />
              {editingPlan ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对话框 - 新建案件 */}
      <Dialog open={isCaseDialogOpen} onOpenChange={setIsCaseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建案件</DialogTitle>
            <DialogDescription>为 {client.name} 创建新案件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button onClick={handleCreateCase} disabled={!caseForm.case_type}>
              <Plus className="h-4 w-4 mr-2" />
              创建案件
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}

