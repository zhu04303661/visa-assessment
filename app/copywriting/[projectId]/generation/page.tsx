"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  FileText,
  User,
  Mail,
  Briefcase,
  Award,
  BookOpen,
  FileCheck,
  Building,
  Sparkles,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  RefreshCw,
  Eye,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

// 材料包类型定义
const PACKAGE_TYPES = [
  {
    type: "personal_statement",
    name: "个人陈述",
    name_en: "Personal Statement",
    description: "申请人的个人背景、职业发展和申请动机",
    icon: User,
    required: true,
  },
  {
    type: "cv_resume",
    name: "简历/CV",
    name_en: "CV/Resume",
    description: "详细的学术和职业经历",
    icon: FileText,
    required: true,
  },
  {
    type: "recommendation_letters",
    name: "推荐信",
    name_en: "Recommendation Letters",
    description: "专业推荐信（通常需要3封）",
    icon: Mail,
    required: true,
    subCount: 3,
  },
  {
    type: "evidence_portfolio",
    name: "证据材料集",
    name_en: "Evidence Portfolio",
    description: "支持申请的各类证据文件",
    icon: Award,
    required: true,
  },
  {
    type: "cover_letter",
    name: "申请信",
    name_en: "Cover Letter",
    description: "正式的签证申请信",
    icon: BookOpen,
    required: true,
  },
  {
    type: "endorsement_letter",
    name: "背书信",
    name_en: "Endorsement Letter",
    description: "Tech Nation或其他机构的背书申请材料",
    icon: FileCheck,
    required: true,
  },
  {
    type: "business_plan",
    name: "商业计划书",
    name_en: "Business Plan",
    description: "创业者路径所需的商业计划",
    icon: Building,
    required: false,
  },
  {
    type: "supplementary",
    name: "补充材料",
    name_en: "Supplementary Documents",
    description: "其他支持性材料",
    icon: Briefcase,
    required: false,
  },
]

interface PackageStatus {
  package_type: string
  current_version: number
  content: string
  status: string
  word_count: number
  last_edited_by: string
  updated_at: string
  ai_generated: boolean
}

interface Project {
  project_id: string
  client_name: string
  visa_type: string
  status: string
}

export default function GenerationOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [packageStatuses, setPackageStatuses] = useState<Record<string, PackageStatus>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingPackage, setGeneratingPackage] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // API调用
  const apiCall = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/copywriting${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
      ...options
    })
    return response.json()
  }

  // 加载项目信息
  const loadProject = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}`)
      if (data.success) {
        setProject(data.data)
      }
    } catch (err) {
      console.error("加载项目失败")
    }
  }, [projectId])

  // 加载所有材料包状态
  const loadPackageStatuses = useCallback(async () => {
    try {
      setLoading(true)
      const statuses: Record<string, PackageStatus> = {}
      
      // 并行加载所有材料包状态
      const promises = PACKAGE_TYPES.map(async (pkg) => {
        try {
          const data = await apiCall(`/api/projects/${projectId}/packages/${pkg.type}`)
          if (data.success && data.data) {
            statuses[pkg.type] = {
              ...data.data,
              word_count: data.data.content ? data.data.content.split(/\s+/).filter(Boolean).length : 0
            }
          }
        } catch (err) {
          console.error(`加载 ${pkg.type} 失败`)
        }
      })
      
      await Promise.all(promises)
      setPackageStatuses(statuses)
    } catch (err) {
      setError("加载材料包状态失败")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // 生成单个材料包
  const handleGenerate = async (packageType: string) => {
    try {
      setGeneratingPackage(packageType)
      setError("")
      
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/generate`, {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      if (data.success) {
        setSuccess(`${PACKAGE_TYPES.find(p => p.type === packageType)?.name} 生成成功`)
        loadPackageStatuses()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "生成失败")
      }
    } catch (err) {
      setError("生成失败")
    } finally {
      setGeneratingPackage(null)
    }
  }

  // 一键生成所有初稿
  const handleGenerateAll = async () => {
    try {
      setGenerating(true)
      setError("")
      
      const requiredPackages = PACKAGE_TYPES.filter(p => p.required && !packageStatuses[p.type]?.content)
      
      for (const pkg of requiredPackages) {
        setGeneratingPackage(pkg.type)
        try {
          await apiCall(`/api/projects/${projectId}/packages/${pkg.type}/generate`, {
            method: 'POST',
            body: JSON.stringify({})
          })
        } catch (err) {
          console.error(`生成 ${pkg.type} 失败`)
        }
      }
      
      setSuccess("批量生成完成")
      loadPackageStatuses()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError("批量生成失败")
    } finally {
      setGenerating(false)
      setGeneratingPackage(null)
    }
  }

  // 批量导出
  const handleExportAll = async () => {
    try {
      // 创建一个包含所有内容的文档
      const contents: string[] = []
      
      for (const pkg of PACKAGE_TYPES) {
        const status = packageStatuses[pkg.type]
        if (status?.content) {
          contents.push(`# ${pkg.name} (${pkg.name_en})\n\n${status.content}\n\n---\n`)
        }
      }
      
      const blob = new Blob([contents.join('\n')], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.client_name || projectId}_全部材料.md`
      a.click()
      URL.revokeObjectURL(url)
      
      setSuccess("导出成功")
      setTimeout(() => setSuccess(""), 2000)
    } catch (err) {
      setError("导出失败")
    }
  }

  // 获取状态徽章
  const getStatusBadge = (status: PackageStatus | undefined) => {
    if (!status || !status.content) {
      return <Badge variant="outline" className="text-gray-500">未开始</Badge>
    }
    if (status.status === 'completed' || status.status === 'final') {
      return <Badge className="bg-green-500">已完成</Badge>
    }
    if (status.status === 'draft') {
      return <Badge variant="secondary">草稿</Badge>
    }
    return <Badge variant="outline">进行中</Badge>
  }

  // 计算进度
  const calculateProgress = () => {
    const required = PACKAGE_TYPES.filter(p => p.required)
    const completed = required.filter(p => packageStatuses[p.type]?.content).length
    return { completed, total: required.length, percentage: Math.round((completed / required.length) * 100) }
  }

  useEffect(() => {
    if (projectId) {
      loadProject()
      loadPackageStatuses()
    }
  }, [projectId, loadProject, loadPackageStatuses])

  const progress = calculateProgress()

  return (
    <AuthGuard requireAuth={true} allowedRoles={['admin', 'super_admin']} unauthorizedMessage="AI文案功能仅对管理员开放">
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/copywriting')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工作台
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{project?.client_name || projectId}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">文案生成</span>
        </div>
        
        {/* 页面标题 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <Sparkles className="h-8 w-8" />
              文案生成
            </h1>
            <p className="text-muted-foreground mt-1">
              为 {project?.client_name || '申请人'} 生成 GTV 签证申请所需的全部材料
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadPackageStatuses} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="h-4 w-4 mr-2" />
              批量导出
            </Button>
            <Button onClick={handleGenerateAll} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              一键生成所有
            </Button>
          </div>
        </div>
        
        {/* 提示信息 */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}
        
        {/* 进度概览 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">{progress.percentage}%</div>
                <div>
                  <div className="font-medium">材料完成度</div>
                  <div className="text-sm text-muted-foreground">
                    {progress.completed}/{progress.total} 个必需材料
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">项目状态</div>
                <Badge variant="outline" className="mt-1">{project?.status || '进行中'}</Badge>
              </div>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </CardContent>
        </Card>
        
        <Separator className="my-6" />
        
        {/* 材料包网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PACKAGE_TYPES.map((pkg) => {
            const status = packageStatuses[pkg.type]
            const Icon = pkg.icon
            const isGenerating = generatingPackage === pkg.type
            
            return (
              <Card 
                key={pkg.type} 
                className={`cursor-pointer hover:shadow-lg transition-all ${
                  status?.content ? 'border-green-200 dark:border-green-800' : ''
                }`}
                onClick={() => router.push(`/copywriting/${projectId}/${pkg.type}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${
                      status?.content 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {!pkg.required && (
                        <Badge variant="outline" className="text-xs">可选</Badge>
                      )}
                      {getStatusBadge(status)}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-3">{pkg.name}</CardTitle>
                  <CardDescription className="text-xs">{pkg.name_en}</CardDescription>
                </CardHeader>
                
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
                  
                  {pkg.subCount && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      需要 {pkg.subCount} 封独立信件
                    </div>
                  )}
                  
                  {status?.content && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>v{status.current_version}</span>
                      <span>{status.word_count} 词</span>
                      {status.ai_generated && (
                        <Badge variant="outline" className="text-xs">AI生成</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-2 flex justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleGenerate(pkg.type)
                    }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    {status?.content ? '重新生成' : '生成'}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    查看
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
        
        {/* 底部说明 */}
        <Card className="mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>• 点击材料卡片进入编辑页面，可以查看、编辑和优化生成的内容</li>
              <li>• 每个材料包都可以单独生成，也可以使用"一键生成所有"批量处理</li>
              <li>• 推荐信需要3封，点击进入后可以分别编辑每封信的内容</li>
              <li>• 生成的内容会自动保存版本，可以随时回滚到之前的版本</li>
              <li>• 可选材料（商业计划书、补充材料）根据申请路径选择是否需要</li>
            </ul>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
    </AuthGuard>
  )
}
