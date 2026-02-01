"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  ArrowLeft,
  Save,
  Sparkles,
  History,
  RotateCcw,
  FileText,
  Clock,
  User,
  Bot,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Download,
  Eye,
  Edit,
  Wand2,
  RefreshCw,
  Upload,
  Search,
  BookOpen,
  Database,
  FolderOpen,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  FileCode,
  Play,
  Layers,
  Settings2,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import ReactMarkdown from 'react-markdown'

// 材料包类型映射
const PACKAGE_TYPES: Record<string, { name: string; name_en: string; description: string }> = {
  personal_statement: { name: "个人陈述", name_en: "Personal Statement", description: "申请人的个人背景、职业发展和申请动机" },
  cv_resume: { name: "简历/CV", name_en: "CV/Resume", description: "详细的学术和职业经历" },
  recommendation_letters: { name: "推荐信", name_en: "Recommendation Letters", description: "专业推荐信（通常需要3封）" },
  evidence_portfolio: { name: "证据材料集", name_en: "Evidence Portfolio", description: "支持申请的各类证据文件" },
  cover_letter: { name: "申请信", name_en: "Cover Letter", description: "正式的签证申请信" },
  business_plan: { name: "商业计划书", name_en: "Business Plan", description: "创业者路径所需的商业计划" },
  endorsement_letter: { name: "背书信", name_en: "Endorsement Letter", description: "Tech Nation或其他机构的背书申请材料" },
  supplementary: { name: "补充材料", name_en: "Supplementary Documents", description: "其他支持性材料" },
}

interface VersionInfo {
  id: number
  version: number
  edit_type: string
  edit_summary: string
  editor: string
  word_count: number
  created_at: string
  content_preview?: string
}

interface PackageContent {
  project_id: string
  package_type: string
  current_version: number
  content: string
  status: string
  last_edited_by: string
  ai_generated: boolean
  updated_at: string
}

interface Project {
  project_id: string
  client_name: string
  visa_type: string
}

interface SuccessCase {
  id: string
  case_id: string
  client_name: string
  visa_type: string
  pathway: string
  industry: string
  status: string
}

interface ReferenceDocument {
  id: string
  project_id: string
  package_type: string
  client_name: string
  visa_type: string
  version: number
  preview: string
  word_count: number
  updated_at: string
  project_status: string
}

// 提取内容分类
interface ExtractedClassification {
  id: number
  category: string
  subcategory: string
  content: string
  source_file: string
  relevance_score: number
  key_points: string[]
  recommender_name?: string
  recommender_title?: string
  recommender_org?: string
}

// 原始材料文件
interface RawMaterialFile {
  id: number
  file_name: string
  file_type: string
  category: string
  file_size: number
  upload_time: string
  extracted: boolean
}

// GTV框架数据
interface GTVFramework {
  领域定位?: {
    评估机构?: string
    细分领域?: string
    岗位定位?: string
    核心论点?: string
    申请路径?: string
  }
  MC_必选标准?: {
    选择的MC?: string
    [key: string]: any
  }
  OC_可选标准?: {
    选择的OC?: string[]
    [key: string]: any
  }
  推荐信?: {
    推荐人1?: any
    推荐人2?: any
    推荐人3?: any
  }
  个人陈述要点?: any
  证据清单?: any[]
}

export default function PackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const packageType = params.packageType as string
  
  // 验证 packageType 是否有效（必须在 PACKAGE_TYPES 中定义）
  // extraction 和 framework 应该由专门的静态路由处理，不应被此动态路由捕获
  if (!PACKAGE_TYPES[packageType]) {
    notFound()
  }
  
  // 状态
  const [project, setProject] = useState<Project | null>(null)
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [currentVersion, setCurrentVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("edit")
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null)
  const [versionContent, setVersionContent] = useState("")
  const [uploading, setUploading] = useState(false)
  
  // 案例选择相关
  const [cases, setCases] = useState<SuccessCase[]>([])
  
  // 输入材料相关
  const [extractedClassifications, setExtractedClassifications] = useState<ExtractedClassification[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterialFile[]>([])
  const [gtvFramework, setGtvFramework] = useState<GTVFramework | null>(null)
  const [selectedClassifications, setSelectedClassifications] = useState<Set<number>>(new Set())
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set())
  const [includeFramework, setIncludeFramework] = useState(true)
  const [sidebarTab, setSidebarTab] = useState("input") // input | prompts | history
  const [referenceDocuments, setReferenceDocuments] = useState<ReferenceDocument[]>([])
  const [selectedRefDocId, setSelectedRefDocId] = useState<string>("")
  const [caseSearchKeyword, setCaseSearchKeyword] = useState("")
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  
  // Agent配置相关
  const [isAgentConfigOpen, setIsAgentConfigOpen] = useState(false)
  const [agentConfig, setAgentConfig] = useState<{
    system_prompt: string
    user_prompt_template: string
    custom_instructions: string
    reference_doc_id: string | null
  }>({
    system_prompt: "",
    user_prompt_template: "",
    custom_instructions: "",
    reference_doc_id: null
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [customInstructions, setCustomInstructions] = useState("")
  
  // 提示词调试相关
  const [debugTab, setDebugTab] = useState<"edit" | "preview" | "test">("edit")
  const [debugOutput, setDebugOutput] = useState("")
  const [debugLoading, setDebugLoading] = useState(false)
  const [promptTemplates, setPromptTemplates] = useState<Array<{id: string; name: string; type: string; content: string}>>([])
  const [instructionHistory, setInstructionHistory] = useState<string[]>([])
  
  const packageInfo = PACKAGE_TYPES[packageType] || { 
    name: packageType, 
    name_en: packageType, 
    description: "" 
  }
  
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
  
  // 加载材料包内容
  const loadContent = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}`)
      if (data.success && data.data) {
        setContent(data.data.content || "")
        setOriginalContent(data.data.content || "")
        setCurrentVersion(data.data.current_version || 0)
      }
    } catch (err) {
      console.error("加载内容失败")
    } finally {
      setLoading(false)
    }
  }, [projectId, packageType])
  
  // 加载版本历史
  const loadVersions = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/versions`)
      if (data.success) {
        setVersions(data.data || [])
      }
    } catch (err) {
      console.error("加载版本历史失败")
    }
  }, [projectId, packageType])
  
  // 加载案例列表
  const loadCases = useCallback(async () => {
    try {
      const data = await apiCall(`/api/cases`)
      if (data.success) {
        setCases(data.data || [])
      }
    } catch (err) {
      console.error("加载案例列表失败")
    }
  }, [])
  
  // 加载同类型参考文档
  const loadReferenceDocuments = useCallback(async () => {
    try {
      const data = await apiCall(`/api/reference-documents/${packageType}`)
      if (data.success) {
        // 排除当前项目的文档
        const filteredDocs = (data.data || []).filter(
          (doc: ReferenceDocument) => doc.project_id !== projectId
        )
        setReferenceDocuments(filteredDocs)
      }
    } catch (err) {
      console.error("加载参考文档失败")
    }
  }, [packageType, projectId])
  
  // 加载Agent配置
  const loadAgentConfig = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/agent-config`)
      if (data.success && data.data) {
        setAgentConfig({
          system_prompt: data.data.system_prompt || "",
          user_prompt_template: data.data.user_prompt_template || "",
          custom_instructions: data.data.custom_instructions || "",
          reference_doc_id: data.data.reference_doc_id || null
        })
      }
    } catch (err) {
      console.error("加载Agent配置失败")
    }
  }, [projectId, packageType])
  
  // 加载提取的分类内容
  const loadExtractedClassifications = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/extraction/classifications`)
      if (data.success && data.data) {
        setExtractedClassifications(data.data)
        // 默认全选
        setSelectedClassifications(new Set(data.data.map((c: ExtractedClassification) => c.id)))
      }
    } catch (err) {
      console.error("加载提取内容失败")
    }
  }, [projectId])
  
  // 加载原始材料列表
  const loadRawMaterials = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/material-collection/files`)
      if (data.success && data.data) {
        setRawMaterials(data.data)
        // 默认全选
        setSelectedMaterials(new Set(data.data.map((m: RawMaterialFile) => m.id)))
      }
    } catch (err) {
      console.error("加载原始材料失败")
    }
  }, [projectId])
  
  // 加载GTV框架
  const loadGTVFramework = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/framework`)
      if (data.success && data.data) {
        setGtvFramework(data.data.framework_data || data.data)
      }
    } catch (err) {
      console.error("加载GTV框架失败")
    }
  }, [projectId])
  
  // 切换分类选择
  const toggleClassification = (id: number) => {
    const newSet = new Set(selectedClassifications)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedClassifications(newSet)
  }
  
  // 切换材料选择
  const toggleMaterial = (id: number) => {
    const newSet = new Set(selectedMaterials)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedMaterials(newSet)
  }
  
  // 全选/取消全选分类
  const toggleAllClassifications = () => {
    if (selectedClassifications.size === extractedClassifications.length) {
      setSelectedClassifications(new Set())
    } else {
      setSelectedClassifications(new Set(extractedClassifications.map(c => c.id)))
    }
  }
  
  // 全选/取消全选材料
  const toggleAllMaterials = () => {
    if (selectedMaterials.size === rawMaterials.length) {
      setSelectedMaterials(new Set())
    } else {
      setSelectedMaterials(new Set(rawMaterials.map(m => m.id)))
    }
  }
  
  // 获取分类的中文名称
  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'MC': 'MC必选标准',
      'OC': 'OC可选标准',
      'RECOMMENDER': '推荐人信息',
      'APPLICANT': '申请人信息',
    }
    return names[category] || category
  }
  
  // 加载提示词模板
  const loadPromptTemplates = useCallback(async () => {
    try {
      const data = await apiCall(`/api/agent-prompts`)
      if (data.success && data.data) {
        setPromptTemplates(data.data)
      }
    } catch (err) {
      console.error("加载提示词模板失败")
    }
  }, [])
  
  // 测试运行提示词
  const handleDebugPrompt = async () => {
    try {
      setDebugLoading(true)
      setDebugOutput("")
      
      // 构建测试上下文
      const testContext = `申请人: ${project?.client_name || '测试申请人'}
签证类型: ${project?.visa_type || 'GTV'}
材料包类型: ${packageInfo.name}

[此处将包含从选定的输入材料中提取的内容]`
      
      const promptContent = agentConfig.system_prompt || `默认${packageInfo.name}系统提示词`
      
      const data = await apiCall(`/api/agent-prompts/debug`, {
        method: 'POST',
        body: JSON.stringify({
          prompt_content: promptContent,
          variables: {
            context: testContext,
            custom_instructions: agentConfig.custom_instructions || '',
            package_type: packageType
          }
        })
      })
      
      if (data.success) {
        setDebugOutput(data.data?.output || "测试完成，无输出")
        // 保存到指令历史
        if (agentConfig.custom_instructions && !instructionHistory.includes(agentConfig.custom_instructions)) {
          setInstructionHistory(prev => [agentConfig.custom_instructions, ...prev.slice(0, 9)])
        }
      } else {
        setDebugOutput(`错误: ${data.error || '测试失败'}`)
      }
    } catch (err) {
      setDebugOutput("测试运行失败，请检查网络连接")
    } finally {
      setDebugLoading(false)
    }
  }
  
  // 预览变量替换结果
  const getPreviewPrompt = () => {
    const template = agentConfig.user_prompt_template || `请基于以下申请人信息，撰写${packageInfo.name}：

{context}

{custom_instructions}`
    
    const context = `申请人: ${project?.client_name || '申请人'}
签证类型: ${project?.visa_type || 'GTV'}

[已选择 ${selectedClassifications.size} 项提取内容]
[已选择 ${selectedMaterials.size} 个原始材料]
${includeFramework ? '[包含GTV框架数据]' : ''}`
    
    return template
      .replace('{context}', context)
      .replace('{custom_instructions}', agentConfig.custom_instructions || '[无自定义指令]')
      .replace('{package_type}', packageInfo.name)
  }
  
  // 应用提示词模板
  const applyPromptTemplate = (template: {content: string; type: string}) => {
    if (template.type === 'system') {
      setAgentConfig({...agentConfig, system_prompt: template.content})
    } else if (template.type === 'user') {
      setAgentConfig({...agentConfig, user_prompt_template: template.content})
    }
  }
  
  // 从历史中选择指令
  const selectFromHistory = (instruction: string) => {
    setAgentConfig({...agentConfig, custom_instructions: instruction})
  }
  
  // 保存Agent配置
  const saveAgentConfig = async () => {
    try {
      setSavingConfig(true)
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/agent-config`, {
        method: 'PUT',
        body: JSON.stringify(agentConfig)
      })
      
      if (data.success) {
        setSuccess("Agent配置已保存")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "保存配置失败")
      }
    } catch (err) {
      setError("保存配置失败")
    } finally {
      setSavingConfig(false)
    }
  }
  
  // 保存内容
  const handleSave = async () => {
    if (!content.trim()) {
      setError("内容不能为空")
      return
    }
    
    try {
      setSaving(true)
      setError("")
      
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          edit_type: "manual",
          edit_summary: "手动编辑保存"
        })
      })
      
      if (data.success) {
        setSuccess(`已保存为版本 ${data.version}`)
        setCurrentVersion(data.version)
        setOriginalContent(content)
        loadVersions()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "保存失败")
      }
    } catch (err) {
      setError("保存失败")
    } finally {
      setSaving(false)
    }
  }
  
  // 打开AI生成对话框
  const openAIDialog = () => {
    loadReferenceDocuments()
    setIsAIDialogOpen(true)
  }
  
  // AI生成内容
  const handleAIGenerate = async () => {
    try {
      setGenerating(true)
      setError("")
      setIsAIDialogOpen(false)
      
      // 合并自定义指令
      const combinedInstructions = [
        agentConfig.custom_instructions,
        customInstructions
      ].filter(Boolean).join("\n\n")
      
      // 构建选定的输入材料
      const selectedInputs = {
        include_framework: includeFramework,
        classification_ids: Array.from(selectedClassifications),
        material_ids: Array.from(selectedMaterials)
      }
      
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          reference_doc_id: selectedRefDocId && selectedRefDocId !== "none" ? selectedRefDocId : undefined,
          custom_instructions: combinedInstructions || undefined,
          selected_inputs: selectedInputs
        })
      })
      
      if (data.success) {
        setContent(data.content || "")
        setSuccess("AI生成完成，请查看并编辑")
        setCurrentVersion(data.version || currentVersion)
        loadVersions()
        setCustomInstructions("") // 清空临时指令
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "AI生成失败")
      }
    } catch (err) {
      setError("AI生成失败")
    } finally {
      setGenerating(false)
    }
  }
  
  // 查看版本详情
  const handleViewVersion = async (version: VersionInfo) => {
    try {
      setSelectedVersion(version)
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/versions/${version.version}`)
      if (data.success) {
        setVersionContent(data.data.content || "")
      }
      setIsVersionDialogOpen(true)
    } catch (err) {
      setError("加载版本内容失败")
    }
  }
  
  // 回滚到版本
  const handleRollback = async (version: number) => {
    try {
      setSaving(true)
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ version })
      })
      
      if (data.success) {
        setSuccess(`已回滚到版本 ${version}，保存为新版本 ${data.version}`)
        loadContent()
        loadVersions()
        setIsVersionDialogOpen(false)
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "回滚失败")
      }
    } catch (err) {
      setError("回滚失败")
    } finally {
      setSaving(false)
    }
  }
  
  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setSuccess("已复制到剪贴板")
    setTimeout(() => setSuccess(""), 2000)
  }
  
  // 下载内容
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${packageInfo.name}_v${currentVersion}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // 上传文件
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // 检查文件类型
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      setError("请上传 PDF、Word 或文本文件")
      return
    }
    
    try {
      setUploading(true)
      setError("")
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`/api/copywriting/api/projects/${projectId}/packages/${packageType}/upload`, {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.success) {
        setContent(data.content || "")
        setCurrentVersion(data.version)
        setSuccess(`文件已上传，保存为版本 ${data.version}`)
        loadVersions()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "上传失败")
      }
    } catch (err) {
      setError("上传失败")
    } finally {
      setUploading(false)
      // 清空文件输入
      event.target.value = ""
    }
  }
  
  // 初始化加载
  useEffect(() => {
    if (projectId && packageType) {
      loadProject()
      loadContent()
      loadVersions()
      loadCases()
      loadAgentConfig()
      loadExtractedClassifications()
      loadRawMaterials()
      loadGTVFramework()
      loadPromptTemplates()
    }
  }, [projectId, packageType, loadProject, loadContent, loadVersions, loadCases, loadAgentConfig, loadExtractedClassifications, loadRawMaterials, loadGTVFramework, loadPromptTemplates])
  
  // 检查是否有未保存的更改
  const hasChanges = content !== originalContent
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/copywriting')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工作台
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{project?.client_name || projectId}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{packageInfo.name}</span>
        </div>
        
        {/* 页面标题 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <FileText className="h-8 w-8" />
              {packageInfo.name}
            </h1>
            <p className="text-muted-foreground mt-1">{packageInfo.name_en} - {packageInfo.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">版本 {currentVersion || 0}</Badge>
              {hasChanges && <Badge variant="secondary">有未保存的更改</Badge>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!content}>
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!content}>
              <Download className="h-4 w-4 mr-2" />
              下载
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
        
        {/* 主要内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 编辑区 */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="edit" className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        编辑
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        预览
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <div className="flex items-center gap-2">
                    {/* 上传文件按钮 */}
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <Button 
                        variant="outline"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        上传文件
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={openAIDialog}
                      disabled={generating || loading}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      AI生成
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      保存
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {activeTab === "edit" ? (
                      <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={`开始编写${packageInfo.name}...\n\n您可以：\n1. 直接在此编辑内容\n2. 点击"AI生成"使用AI帮助生成初稿\n3. 修改后点击"保存"保存新版本`}
                        className="min-h-[500px] font-mono text-sm"
                      />
                    ) : (
                      <ScrollArea className="h-[500px] border rounded-md p-4">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {content ? (
                            <ReactMarkdown>{content}</ReactMarkdown>
                          ) : (
                            <p className="text-muted-foreground text-center py-10">暂无内容</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </>
                )}
              </CardContent>
              
              <CardFooter className="border-t pt-4">
                <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                  <span>字数：{content.split(/\s+/).filter(Boolean).length} 词 / {content.length} 字符</span>
                  <span>最后保存：{currentVersion > 0 ? `版本 ${currentVersion}` : "未保存"}</span>
                </div>
              </CardFooter>
            </Card>
          </div>
          
          {/* 侧边栏 - 工具面板 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <Tabs value={sidebarTab} onValueChange={setSidebarTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="input" className="text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      输入
                    </TabsTrigger>
                    <TabsTrigger value="prompts" className="text-xs">
                      <Settings2 className="h-3 w-3 mr-1" />
                      提示词
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">
                      <History className="h-3 w-3 mr-1" />
                      历史
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent className="pt-2">
                {/* 输入材料面板 */}
                {sidebarTab === "input" && (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* GTV框架 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            GTV框架
                          </Label>
                          <Checkbox 
                            checked={includeFramework}
                            onCheckedChange={(checked) => setIncludeFramework(checked as boolean)}
                          />
                        </div>
                        {gtvFramework && includeFramework && (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
                            {gtvFramework.领域定位 && (
                              <div>领域: {gtvFramework.领域定位.细分领域 || '未设置'}</div>
                            )}
                            {gtvFramework.MC_必选标准?.选择的MC && (
                              <div>MC: {gtvFramework.MC_必选标准.选择的MC}</div>
                            )}
                            {gtvFramework.OC_可选标准?.选择的OC && (
                              <div>OC: {gtvFramework.OC_可选标准.选择的OC.join(', ')}</div>
                            )}
                          </div>
                        )}
                        {!gtvFramework && (
                          <p className="text-xs text-muted-foreground">尚未构建GTV框架</p>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* 提取内容 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            提取内容
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleAllClassifications}
                            className="text-xs h-6 px-2"
                          >
                            {selectedClassifications.size === extractedClassifications.length ? '取消全选' : '全选'}
                          </Button>
                        </div>
                        
                        {extractedClassifications.length === 0 ? (
                          <p className="text-xs text-muted-foreground">暂无提取内容</p>
                        ) : (
                          <Accordion type="multiple" className="w-full">
                            {/* 按分类分组 */}
                            {['MC', 'OC', 'RECOMMENDER', 'APPLICANT'].map(category => {
                              const items = extractedClassifications.filter(c => c.category === category)
                              if (items.length === 0) return null
                              
                              return (
                                <AccordionItem key={category} value={category} className="border-b-0">
                                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {items.filter(i => selectedClassifications.has(i.id)).length}/{items.length}
                                      </Badge>
                                      {getCategoryName(category)}
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-2 pl-2">
                                      {items.map(item => (
                                        <div 
                                          key={item.id} 
                                          className="flex items-start gap-2 p-2 rounded border hover:bg-muted/50"
                                        >
                                          <Checkbox 
                                            checked={selectedClassifications.has(item.id)}
                                            onCheckedChange={() => toggleClassification(item.id)}
                                            className="mt-0.5"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium truncate">
                                              {item.subcategory || item.category}
                                            </div>
                                            <div className="text-xs text-muted-foreground line-clamp-2">
                                              {item.content?.substring(0, 100)}...
                                            </div>
                                            {item.recommender_name && (
                                              <div className="text-xs text-blue-600 mt-1">
                                                推荐人: {item.recommender_name}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              )
                            })}
                          </Accordion>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* 原始材料 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            原始材料
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleAllMaterials}
                            className="text-xs h-6 px-2"
                          >
                            {selectedMaterials.size === rawMaterials.length ? '取消全选' : '全选'}
                          </Button>
                        </div>
                        
                        {rawMaterials.length === 0 ? (
                          <p className="text-xs text-muted-foreground">暂无原始材料</p>
                        ) : (
                          <div className="space-y-2">
                            {rawMaterials.map(material => (
                              <div 
                                key={material.id}
                                className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50"
                              >
                                <Checkbox 
                                  checked={selectedMaterials.has(material.id)}
                                  onCheckedChange={() => toggleMaterial(material.id)}
                                />
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">
                                    {material.file_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {material.category || material.file_type}
                                  </div>
                                </div>
                                {material.extracted && (
                                  <Badge variant="secondary" className="text-xs">已提取</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* 选择统计 */}
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs">
                        <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">已选择的输入</div>
                        <div className="text-blue-600 dark:text-blue-400 space-y-0.5">
                          <div>框架: {includeFramework ? '包含' : '不包含'}</div>
                          <div>提取内容: {selectedClassifications.size} 项</div>
                          <div>原始材料: {selectedMaterials.size} 个文件</div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                )}
                
                {/* 提示词面板 */}
                {sidebarTab === "prompts" && (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* 自定义指令 */}
                      <div className="space-y-2">
                        <Label className="text-sm">自定义指令</Label>
                        <Textarea
                          value={agentConfig.custom_instructions}
                          onChange={(e) => setAgentConfig({
                            ...agentConfig,
                            custom_instructions: e.target.value
                          })}
                          placeholder="添加特殊要求，如语气、风格、重点等..."
                          className="h-20 text-sm"
                        />
                      </div>
                      
                      {/* 系统提示词预览 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">系统提示词</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAgentConfigOpen(true)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            编辑
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/50 rounded p-2">
                          {agentConfig.system_prompt || "使用默认提示词"}
                        </p>
                      </div>
                      
                      {/* 用户提示词模板预览 */}
                      <div className="space-y-2">
                        <Label className="text-sm">用户提示词模板</Label>
                        <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/50 rounded p-2">
                          {agentConfig.user_prompt_template || "使用默认模板"}
                        </p>
                      </div>
                      
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={saveAgentConfig}
                        disabled={savingConfig}
                      >
                        {savingConfig ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        保存配置
                      </Button>
                      
                      <Separator />
                      
                      {/* 提示词调试 */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          提示词调试
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          点击下方按钮打开完整的提示词调试面板
                        </p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full"
                          onClick={() => setIsAgentConfigOpen(true)}
                        >
                          <FileCode className="h-4 w-4 mr-2" />
                          打开调试面板
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                )}
                
                {/* 版本历史面板 */}
                {sidebarTab === "history" && (
                  <ScrollArea className="h-[500px]">
                    <div className="mb-2 text-xs text-muted-foreground">
                      共 {versions.length} 个版本
                    </div>
                    {versions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        暂无版本记录
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {versions.map((version) => (
                          <div
                            key={version.id}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                              version.version === currentVersion ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => handleViewVersion(version)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant={version.version === currentVersion ? "default" : "outline"}>
                                v{version.version}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(version.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <p className="text-sm font-medium truncate">{version.edit_summary}</p>
                            
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {version.edit_type === 'ai' ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              <span>{version.editor}</span>
                              <span>·</span>
                              <span>{version.word_count} 词</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* 版本详情对话框 */}
      <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>版本 {selectedVersion?.version} 详情</DialogTitle>
            <DialogDescription>
              {selectedVersion?.edit_summary} · {selectedVersion?.created_at && new Date(selectedVersion.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] border rounded-md p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{versionContent}</ReactMarkdown>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVersionDialogOpen(false)}>
              关闭
            </Button>
            {selectedVersion && selectedVersion.version !== currentVersion && (
              <Button onClick={() => handleRollback(selectedVersion.version)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                回滚到此版本
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* AI生成对话框 */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              AI 智能生成
            </DialogTitle>
            <DialogDescription>
              选择参考案例，AI 将根据案例格式和结构，结合您的原始材料生成内容
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 参考文档选择 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                选择参考文档（可选）
              </Label>
              <Select value={selectedRefDocId} onValueChange={setSelectedRefDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个同类型文档作为参考..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不使用参考文档</SelectItem>
                  {referenceDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.client_name} - {packageInfo.name} (v{doc.version}, {doc.word_count}词)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {referenceDocuments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  暂无可用的{packageInfo.name}参考文档
                </p>
              )}
              {referenceDocuments.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  共找到 {referenceDocuments.length} 个{packageInfo.name}参考文档
                </p>
              )}
            </div>
            
            {/* 自定义指令 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                自定义指令（可选）
              </Label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="添加特殊要求，如语气、风格、重点关注内容等..."
                className="h-24"
              />
              <p className="text-xs text-muted-foreground">
                这些指令将与已保存的Agent配置合并使用
              </p>
            </div>
            
            {/* 生成说明 */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">生成说明</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• AI 会提取项目中的原始材料相关内容</li>
                <li>• 根据{packageInfo.name}的标准格式进行组织</li>
                <li>• 如选择参考案例，会参考其结构和写作风格</li>
                <li>• 生成后可继续手动编辑和优化</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAIGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              开始生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Agent配置编辑对话框 - 增强版 */}
      <Dialog open={isAgentConfigOpen} onOpenChange={setIsAgentConfigOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              提示词调试与配置
            </DialogTitle>
            <DialogDescription>
              编辑、预览和测试{packageInfo.name}的AI生成提示词
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={debugTab} onValueChange={(v) => setDebugTab(v as "edit" | "preview" | "test")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="edit">
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                预览
              </TabsTrigger>
              <TabsTrigger value="test">
                <Play className="h-4 w-4 mr-2" />
                测试
              </TabsTrigger>
            </TabsList>
            
            {/* 编辑面板 */}
            <TabsContent value="edit" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* 提示词模板库 */}
                  {promptTemplates.length > 0 && (
                    <div className="space-y-2">
                      <Label className="font-medium flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        模板库
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {promptTemplates.slice(0, 5).map((template) => (
                          <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            onClick={() => applyPromptTemplate(template)}
                          >
                            {template.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 系统提示词 */}
                  <div className="space-y-2">
                    <Label className="font-medium">系统提示词 (System Prompt)</Label>
                    <p className="text-xs text-muted-foreground">
                      定义AI的角色和行为准则，留空使用默认提示词
                    </p>
                    <Textarea
                      value={agentConfig.system_prompt}
                      onChange={(e) => setAgentConfig({
                        ...agentConfig,
                        system_prompt: e.target.value
                      })}
                      placeholder={`你是一位专业的GTV签证${packageInfo.name}撰写专家...`}
                      className="min-h-[150px] font-mono text-sm"
                    />
                  </div>
                  
                  {/* 用户提示词模板 */}
                  <div className="space-y-2">
                    <Label className="font-medium">用户提示词模板 (User Prompt Template)</Label>
                    <p className="text-xs text-muted-foreground">
                      可使用变量: {'{context}'} - 客户信息, {'{custom_instructions}'} - 自定义指令
                    </p>
                    <Textarea
                      value={agentConfig.user_prompt_template}
                      onChange={(e) => setAgentConfig({
                        ...agentConfig,
                        user_prompt_template: e.target.value
                      })}
                      placeholder={`请基于以下申请人信息，撰写${packageInfo.name}：\n\n{context}\n\n{custom_instructions}`}
                      className="min-h-[120px] font-mono text-sm"
                    />
                  </div>
                  
                  {/* 默认自定义指令 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">默认自定义指令</Label>
                      {instructionHistory.length > 0 && (
                        <Select onValueChange={selectFromHistory}>
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue placeholder="从历史选择..." />
                          </SelectTrigger>
                          <SelectContent>
                            {instructionHistory.map((inst, idx) => (
                              <SelectItem key={idx} value={inst}>
                                {inst.substring(0, 30)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Textarea
                      value={agentConfig.custom_instructions}
                      onChange={(e) => setAgentConfig({
                        ...agentConfig,
                        custom_instructions: e.target.value
                      })}
                      placeholder="请用英文撰写，确保内容专业、有说服力..."
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* 预览面板 */}
            <TabsContent value="preview" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-medium">系统提示词预览</Label>
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                      {agentConfig.system_prompt || `[使用默认${packageInfo.name}系统提示词]`}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label className="font-medium">用户提示词预览 (变量已替换)</Label>
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                      {getPreviewPrompt()}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">
                      变量说明
                    </h4>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{context}'}</code> - 包含申请人信息和选定的输入材料</li>
                      <li>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{custom_instructions}'}</code> - 您添加的自定义指令</li>
                      <li>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{package_type}'}</code> - 当前材料包类型</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* 测试面板 */}
            <TabsContent value="test" className="mt-4">
              <div className="grid grid-cols-2 gap-4 h-[400px]">
                <div className="space-y-2">
                  <Label className="font-medium">输入提示词</Label>
                  <Textarea
                    value={agentConfig.system_prompt || `[使用默认${packageInfo.name}提示词]`}
                    readOnly
                    className="h-[280px] font-mono text-xs bg-muted/30"
                  />
                  <Button 
                    onClick={handleDebugPrompt} 
                    disabled={debugLoading}
                    className="w-full"
                  >
                    {debugLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    运行测试
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">测试输出</Label>
                  <ScrollArea className="h-[320px] border rounded-lg p-3">
                    {debugLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : debugOutput ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{debugOutput}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-10">
                        点击"运行测试"查看输出结果
                      </p>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAgentConfigOpen(false)}>
              取消
            </Button>
            <Button onClick={() => {
              saveAgentConfig()
              setIsAgentConfigOpen(false)
            }} disabled={savingConfig}>
              {savingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  )
}
