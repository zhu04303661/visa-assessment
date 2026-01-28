"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, RefreshCw, Download, FileText, Target, Award, 
  Users, MessageSquare, CheckCircle, AlertCircle, ChevronDown, 
  ChevronRight, Edit2, Save, X, History, Settings, Code, Copy,
  Loader2, Clock, Edit3, Play, Trash2, Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { UnifiedFilePreview, PreviewFile } from "@/components/unified-file-preview"
import { Eye } from "lucide-react"

// 使用代理路由避免 CORS 问题
const API_BASE = "/api/copywriting"

// 辅助函数：安全地将任意值转换为可渲染的字符串
function safeRenderValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    // 尝试获取常见的字符串字段
    const obj = value as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text
    if (typeof obj.content === 'string') return obj.content
    if (typeof obj.value === 'string') return obj.value
    if (typeof obj.name === 'string') return obj.name
    // 回退到 JSON 字符串
    try {
      return JSON.stringify(value)
    } catch {
      return '[Object]'
    }
  }
  return String(value)
}

interface Evidence {
  title: string
  description: string
  source?: string
  source_file?: string
  source_file_id?: number
  strength?: string
}

interface CriteriaData {
  applicable?: boolean
  evidence_list: Evidence[]
  summary: string
  strength_score: number
}

interface Recommender {
  name: string
  title: string
  organization: string
  field?: string  // 推荐人专业领域
  relationship: string
  recommendation_angle?: string  // 推荐角度/论点
  focus_points: string[]
  supports_criteria?: string[]  // 支持的MC/OC标准
  status: string
  suggested_profile?: string
  source_file?: string
  source_file_id?: number
}

interface GTVFramework {
  领域定位: {
    评估机构: string
    细分领域: string
    岗位定位: string
    工作岗位选择?: string[]
    核心论点: string
    申请路径: string
    论证重点?: string
    背书论证要点?: string[]
    source_files?: string[]
  }
  MC_必选标准: {
    选择的MC?: string
    MC1_产品团队领导力: CriteriaData
    MC2_商业发展: CriteriaData
    MC3_非营利组织: CriteriaData
    MC4_专家评审: CriteriaData
  }
  OC_可选标准: {
    选择的OC?: string[]
    OC1_创新: CriteriaData
    OC2_行业认可: CriteriaData
    OC3_重大贡献: CriteriaData
    OC4_学术贡献: CriteriaData
  }
  推荐信: {
    推荐人1: Recommender
    推荐人2: Recommender
    推荐人3: Recommender
  }
  个人陈述要点: {
    opening_hook: string
    technical_journey: string
    key_achievements: Array<string | { achievement: string; evidence: string; source_file: string }>
    uk_vision: string
    conclusion: string
  }
  证据清单: any[]
  申请策略?: {
    overall_strength: string
    recommended_approach: string
    key_risks: string[]
    preparation_priorities: string[]
    evidence_todo?: string[]
    timeline?: {
      materials_completion: string
      endorsement_submission: string
      endorsement_result?: string
      visa_submission: string
      expected_result: string
      key_milestones?: string[]
    }
  }
  _metadata?: {
    project_id: string
    client_name: string
    generated_at: string
    version: number
  }
}

export default function FrameworkPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [framework, setFramework] = useState<GTVFramework | null>(null)
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["domain", "mc", "oc"]))
  
  // 框架构建日志
  const [frameworkLogs, setFrameworkLogs] = useState<any[]>([])
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set())
  
  // 提示词管理
  const [promptsDialogOpen, setPromptsDialogOpen] = useState(false)
  const [prompts, setPrompts] = useState<any[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<any>(null)
  // 编辑器已集成到提示词管理对话框，此状态不再需要
  const [savingPrompt, setSavingPrompt] = useState(false)
  
  // 提示词调试
  const [debugMode, setDebugMode] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugInput, setDebugInput] = useState<string>('')  // 替换变量后的输入
  const [debugResult, setDebugResult] = useState<string>('')  // LLM 输出
  const [debugVariables, setDebugVariables] = useState<Record<string, string>>({})
  const [loadingVariables, setLoadingVariables] = useState(false)
  
  // 文件预览
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // 数据清理
  const [clearing, setClearing] = useState(false)

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
      console.log("加载项目文件:", files.length, "个")
    } catch (error) {
      console.error("获取项目文件失败:", error)
    }
  }, [projectId])

  // 根据文件名查找文件并预览
  const openFilePreview = useCallback((fileName: string) => {
    console.log("openFilePreview called with:", fileName)
    console.log("Available files:", projectFiles.length, projectFiles.map(f => f.file_name))
    
    if (!fileName) {
      toast.warning("未关联源文件")
      return
    }
    
    // 在项目文件中查找匹配的文件（支持模糊匹配）
    const file = projectFiles.find(f => {
      const fName = f.file_name || ''
      const match = fName === fileName || 
             fName.includes(fileName) ||
             fileName.includes(fName) ||
             // 忽略路径前缀匹配
             fName.split('/').pop() === fileName.split('/').pop()
      if (match) console.log("Matched:", fName)
      return match
    })
    
    if (file) {
      console.log("Opening preview for:", file)
      setPreviewFile({
        id: file.id,
        file_name: file.file_name,
        file_type: file.file_type || file.file_name?.split('.').pop() || '',
        file_size: file.file_size
      })
      setPreviewOpen(true)
    } else {
      console.log("File not found in projectFiles")
      toast.warning(`未找到文件: ${fileName}`)
    }
  }, [projectFiles])

  // 获取GTV框架
  const fetchFramework = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/framework`)
      const data = await response.json()
      
      if (data.success && data.data?.framework_data) {
        setFramework(data.data.framework_data)
      }
    } catch (error) {
      console.error("获取框架失败:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // 轮询日志的引用
  const logPollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastLogCountRef = useRef<number>(0)

  // 开始轮询日志
  const startLogPolling = useCallback(() => {
    // 清除之前的轮询
    if (logPollingRef.current) {
      clearInterval(logPollingRef.current)
    }
    
    lastLogCountRef.current = 0
    
    // 每2秒轮询一次日志
    logPollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/projects/${projectId}/framework-logs`)
        const data = await response.json()
        if (data.success && data.data) {
          const newLogs = data.data || []
          // 只有日志数量变化时才更新，避免闪烁
          if (newLogs.length !== lastLogCountRef.current) {
            setFrameworkLogs(newLogs)
            lastLogCountRef.current = newLogs.length
            // 自动展开最新的日志
            if (newLogs.length > 0) {
              setExpandedLogIds(prev => new Set([...prev, newLogs[0].id]))
            }
          }
        }
      } catch (error) {
        console.error("轮询日志失败:", error)
      }
    }, 2000)
  }, [projectId])

  // 停止轮询日志
  const stopLogPolling = useCallback(() => {
    if (logPollingRef.current) {
      clearInterval(logPollingRef.current)
      logPollingRef.current = null
    }
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopLogPolling()
    }
  }, [stopLogPolling])

  // 构建GTV框架
  const handleBuildFramework = async () => {
    try {
      setBuilding(true)
      setFrameworkLogs([]) // 清空之前的日志
      setLogsDialogOpen(true) // 自动打开日志对话框
      toast.info("正在构建GTV框架，实时日志已开启...")
      
      // 开始轮询日志
      startLogPolling()
      
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/build-framework`, {
        method: "POST"
      })
      const data = await response.json()
      
      // 停止轮询
      stopLogPolling()
      
      // 最后获取一次完整日志
      await fetchFrameworkLogs()
      
      if (data.success) {
        setFramework(data.data)
        toast.success("GTV框架构建完成！")
      } else {
        toast.error(data.error || "构建失败")
      }
    } catch (error) {
      console.error("构建框架失败:", error)
      toast.error("构建框架失败")
      stopLogPolling()
    } finally {
      setBuilding(false)
    }
  }

  // 一键清理所有框架数据
  const handleClearFrameworkData = async () => {
    if (!confirm("确定要清理所有框架数据吗？\n\n这将清除：\n• GTV申请框架\n• 框架构建日志\n• 客户画像\n\n可以使用收集的材料重新构建。")) {
      return
    }
    
    try {
      setClearing(true)
      toast.info("正在清理框架数据...")
      
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/framework/clear`, {
        method: "POST"
      })
      const data = await response.json()
      
      if (data.success) {
        const stats = data.data?.stats || {}
        toast.success(
          `清理完成！已删除 ${stats.deleted_frameworks || 0} 个框架、${stats.deleted_logs || 0} 条日志`
        )
        // 重置页面状态
        setFramework(null)
        setFrameworkLogs([])
        // 重新获取数据（确认为空）
        await fetchFramework()
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

  // 导出框架
  const handleExport = async (format: "markdown" | "xmind") => {
    try {
      setExporting(true)
      
      if (format === "markdown") {
        const response = await fetch(
          `${API_BASE}/api/projects/${projectId}/framework/export?format=markdown`
        )
        const data = await response.json()
        
        if (data.success && data.data?.content) {
          const blob = new Blob([data.data.content], { type: "text/markdown;charset=utf-8" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `GTV框架_${projectInfo?.client_name || projectId}.md`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success("Markdown导出成功")
        } else {
          toast.error("导出失败")
        }
      } else {
        // XMind导出
        const response = await fetch(
          `${API_BASE}/api/projects/${projectId}/framework/export?format=xmind`
        )
        
        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `GTV框架_${projectInfo?.client_name || projectId}.xmind`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success("XMind导出成功")
        } else {
          toast.error("XMind导出失败")
        }
      }
    } catch (error) {
      console.error("导出失败:", error)
      toast.error("导出失败")
    } finally {
      setExporting(false)
    }
  }

  // 获取框架构建日志
  const fetchFrameworkLogs = async () => {
    try {
      setLoadingLogs(true)
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/framework-logs`)
      const data = await response.json()
      if (data.success) {
        setFrameworkLogs(data.data || [])
      }
    } catch (error) {
      console.error("获取框架日志失败:", error)
    } finally {
      setLoadingLogs(false)
    }
  }

  // 获取提示词列表
  const fetchPrompts = async () => {
    try {
      setLoadingPrompts(true)
      const response = await fetch(`${API_BASE}/api/agent-prompts`)
      const data = await response.json()
      if (data.success) {
        setPrompts(data.data || [])
      }
    } catch (error) {
      console.error("获取提示词失败:", error)
    } finally {
      setLoadingPrompts(false)
    }
  }

  // 保存提示词
  const savePrompt = async () => {
    if (!editingPrompt) return
    
    try {
      setSavingPrompt(true)
      const response = await fetch(`${API_BASE}/api/agent-prompts/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPrompt)
      })
      const data = await response.json()
      
      if (data.success) {
        const versionInfo = data.version ? ` (版本 v${data.version})` : ""
        toast.success(`提示词保存成功${versionInfo}`)
        // 更新当前编辑的提示词版本
        if (data.version && editingPrompt) {
          setEditingPrompt({...editingPrompt, version: data.version})
        }
        fetchPrompts()
      } else {
        toast.error(data.error || "保存失败")
      }
    } catch (error) {
      toast.error("保存提示词失败")
    } finally {
      setSavingPrompt(false)
    }
  }

  // 加载提示词调试变量
  const loadDebugVariables = async () => {
    try {
      setLoadingVariables(true)
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/prompt-context`)
      const data = await response.json()
      
      if (data.success) {
        setDebugVariables(data.data || {})
        toast.success("上下文变量加载成功")
      } else {
        toast.error(data.error || "加载变量失败")
      }
    } catch (error) {
      toast.error("加载上下文变量失败")
    } finally {
      setLoadingVariables(false)
    }
  }

  // 调试提示词
  const debugPrompt = async () => {
    if (!editingPrompt?.content) {
      toast.error("提示词内容为空")
      return
    }
    
    try {
      setDebugLoading(true)
      setDebugResult('')
      
      // 先在本地生成输入预览
      let inputPreview = editingPrompt.content
      for (const [key, value] of Object.entries(debugVariables)) {
        inputPreview = inputPreview.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value) || `[${key}为空]`)
      }
      // 截断过长的输入预览
      const maxInputLength = 3000
      if (inputPreview.length > maxInputLength) {
        inputPreview = inputPreview.slice(0, maxInputLength) + `\n\n... (已截断，共 ${inputPreview.length} 字符)`
      }
      setDebugInput(inputPreview)
      
      const response = await fetch(`${API_BASE}/api/agent-prompts/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_content: editingPrompt.content,
          variables: debugVariables
        })
      })
      const data = await response.json()
      
      if (data.success) {
        setDebugResult(data.data?.output || '')
        toast.success(`调试完成，使用 ${data.data?.tokens_used || '?'} tokens`)
      } else {
        toast.error(data.error || "调试失败")
        setDebugResult(`错误: ${data.error}`)
      }
    } catch (error: any) {
      toast.error("调试提示词失败")
      setDebugResult(`错误: ${error.message}`)
    } finally {
      setDebugLoading(false)
    }
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("已复制到剪贴板")
  }

  // 切换日志展开状态
  const toggleLogExpand = (id: number) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 切换展开/折叠
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600 bg-green-100"
    if (score >= 3) return "text-yellow-600 bg-yellow-100"
    if (score >= 2) return "text-orange-600 bg-orange-100"
    return "text-red-600 bg-red-100"
  }

  // 获取状态图标
  const getStatusIcon = (applicable: boolean | undefined, score: number) => {
    if (applicable && score >= 3) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    if (applicable || score > 0) {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
    return <AlertCircle className="h-5 w-5 text-gray-400" />
  }

  useEffect(() => {
    fetchProjectInfo()
    fetchFramework()
    fetchProjectFiles()
  }, [fetchProjectInfo, fetchFramework, fetchProjectFiles])

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="border-b bg-card">
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
                  <Target className="h-5 w-5" />
                  GTV申请框架
                </h1>
                <p className="text-sm text-muted-foreground">
                  {projectInfo?.client_name || projectId} - 申请要点提炼
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Select 
                onValueChange={(value) => handleExport(value as "markdown" | "xmind")}
                disabled={!framework || exporting}
              >
                <SelectTrigger className="w-[100px]">
                  <Download className="h-4 w-4 mr-1" />
                  导出
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="xmind">XMind</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={handleBuildFramework}
                disabled={building || clearing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${building ? "animate-spin" : ""}`} />
                {building ? "构建中..." : framework ? "重新构建" : "构建框架"}
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearFrameworkData}
                disabled={clearing || building || !framework}
              >
                <Trash2 className={`h-4 w-4 mr-2 ${clearing ? "animate-spin" : ""}`} />
                {clearing ? "清理中..." : "清理数据"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchFrameworkLogs()
                  setLogsDialogOpen(true)
                }}
              >
                <History className="h-4 w-4 mr-2" />
                构建日志
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchPrompts()
                  setPromptsDialogOpen(true)
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                提示词管理
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : !framework ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">尚未构建GTV框架</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                基于已提取的材料内容和客户信息脉络图，AI将自动分析并生成GTV申请框架，包括MC/OC标准匹配、证据清单和申请策略。
              </p>
              <Button size="lg" onClick={handleBuildFramework} disabled={building}>
                <RefreshCw className={`h-5 w-5 mr-2 ${building ? "animate-spin" : ""}`} />
                {building ? "正在构建..." : "开始构建框架"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 元数据 */}
            {framework._metadata && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>客户：{framework._metadata.client_name}</span>
                <span>
                  生成时间：{new Date(framework._metadata.generated_at).toLocaleString("zh-CN")}
                  {framework._metadata.version > 1 && ` (v${framework._metadata.version})`}
                </span>
              </div>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">框架总览</TabsTrigger>
                <TabsTrigger value="mc">MC必选标准</TabsTrigger>
                <TabsTrigger value="oc">OC可选标准</TabsTrigger>
                <TabsTrigger value="refs">推荐信</TabsTrigger>
                <TabsTrigger value="ps">个人陈述</TabsTrigger>
                <TabsTrigger value="strategy">申请策略</TabsTrigger>
              </TabsList>

              {/* 框架总览 */}
              <TabsContent value="overview" className="space-y-4">
                {/* 领域定位 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      领域定位
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">评估机构</p>
                        <p className="font-medium">{framework.领域定位?.评估机构 || "Tech Nation"}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">细分领域</p>
                        <p className="font-medium">{framework.领域定位?.细分领域 || "待确定"}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">岗位定位</p>
                        <p className="font-medium">{framework.领域定位?.岗位定位 || "待确定"}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">申请路径</p>
                        <Badge variant={framework.领域定位?.申请路径?.includes("Talent") ? "default" : "secondary"}>
                          {framework.领域定位?.申请路径 || "待确定"}
                        </Badge>
                      </div>
                      
                      {/* 工作岗位选择 */}
                      {framework.领域定位?.工作岗位选择 && framework.领域定位.工作岗位选择.length > 0 && (
                        <div className="p-3 bg-muted rounded-lg md:col-span-2">
                          <p className="text-sm text-muted-foreground mb-1">工作岗位选择 (Tech Nation)</p>
                          <div className="flex flex-wrap gap-1">
                            {framework.领域定位.工作岗位选择.map((role, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {safeRenderValue(role)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 bg-muted rounded-lg md:col-span-3">
                        <p className="text-sm text-muted-foreground">核心论点</p>
                        <p className="font-medium">{framework.领域定位?.核心论点 || "待确定"}</p>
                      </div>
                      
                      {/* 论证重点 */}
                      {framework.领域定位?.论证重点 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg md:col-span-3">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">论证重点</p>
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">{framework.领域定位.论证重点}</p>
                        </div>
                      )}
                      
                      {/* 背书论证要点 */}
                      {framework.领域定位?.背书论证要点 && framework.领域定位.背书论证要点.length > 0 && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg md:col-span-3">
                          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">需向Tech Nation论证的核心要点</p>
                          <ul className="space-y-1">
                            {framework.领域定位.背书论证要点.map((point, i) => (
                              <li key={i} className="text-sm text-blue-600 dark:text-blue-400 flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                {safeRenderValue(point)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 标准概览 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MC概览 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          MC必选标准
                        </span>
                        {framework.MC_必选标准?.选择的MC && (
                          <Badge>{framework.MC_必选标准.选择的MC}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {["MC1_产品团队领导力", "MC2_商业发展", "MC3_非营利组织", "MC4_专家评审"].map((key) => {
                        const data = (framework.MC_必选标准 as any)[key] as CriteriaData
                        if (!data) return null
                        return (
                          <div key={key} className="flex items-center justify-between p-2 rounded border">
                            <span className="text-sm">{key.replace("_", ": ")}</span>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getScoreColor(data.strength_score || 0)}
                              >
                                {data.strength_score || 0}/5
                              </Badge>
                              {getStatusIcon(data.applicable, data.strength_score || 0)}
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>

                  {/* OC概览 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          OC可选标准
                        </span>
                        {framework.OC_可选标准?.选择的OC && (
                          <div className="flex gap-1">
                            {framework.OC_可选标准.选择的OC.map((oc) => (
                              <Badge key={oc} variant="secondary">{oc}</Badge>
                            ))}
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {["OC1_创新", "OC2_行业认可", "OC3_重大贡献", "OC4_学术贡献"].map((key) => {
                        const data = (framework.OC_可选标准 as any)[key] as CriteriaData
                        if (!data) return null
                        const isSelected = framework.OC_可选标准?.选择的OC?.includes(key.split("_")[0])
                        return (
                          <div 
                            key={key} 
                            className={`flex items-center justify-between p-2 rounded border ${isSelected ? "border-primary bg-primary/5" : ""}`}
                          >
                            <span className="text-sm">{key.replace("_", ": ")}</span>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getScoreColor(data.strength_score || 0)}
                              >
                                {data.strength_score || 0}/5
                              </Badge>
                              {getStatusIcon(data.applicable, data.strength_score || 0)}
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* 推荐信状态 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      推荐信状态
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {["推荐人1", "推荐人2", "推荐人3"].map((key) => {
                        const ref = (framework.推荐信 as any)[key] as Recommender
                        if (!ref) return null
                        return (
                          <div key={key} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{key}</span>
                              <Badge variant={ref.status === "已确定" ? "default" : "secondary"}>
                                {ref.status || "待确定"}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{ref.name || ref.suggested_profile || "待确定"}</p>
                            <p className="text-xs text-muted-foreground">
                              {ref.title} @ {ref.organization}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MC必选标准详情 */}
              <TabsContent value="mc" className="space-y-4">
                {["MC1_产品团队领导力", "MC2_商业发展", "MC3_非营利组织", "MC4_专家评审"].map((key) => {
                  const data = (framework.MC_必选标准 as any)[key] as CriteriaData
                  if (!data) return null
                  const isSelected = framework.MC_必选标准?.选择的MC === key.split("_")[0]
                  
                  return (
                    <Card key={key} className={isSelected ? "border-primary" : ""}>
                      <Collapsible
                        open={expandedSections.has(key)}
                        onOpenChange={() => toggleSection(key)}
                      >
                        <CardHeader className="pb-3">
                          <CollapsibleTrigger className="w-full">
                            <CardTitle className="text-base flex items-center justify-between cursor-pointer">
                              <span className="flex items-center gap-2">
                                {expandedSections.has(key) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                {key.replace("_", ": ")}
                                {isSelected && <Badge>推荐选择</Badge>}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={getScoreColor(data.strength_score || 0)}
                                >
                                  评分: {data.strength_score || 0}/5
                                </Badge>
                                <Badge variant="secondary">
                                  {data.evidence_list?.length || 0} 项证据
                                </Badge>
                              </div>
                            </CardTitle>
                          </CollapsibleTrigger>
                        </CardHeader>
                        
                        <CollapsibleContent>
                          <CardContent className="space-y-4">
                            {data.summary && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">概述</p>
                                <p className="text-sm text-muted-foreground">{data.summary}</p>
                              </div>
                            )}
                            
                            {data.evidence_list && data.evidence_list.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">证据列表</p>
                                <div className="space-y-2">
                                  {data.evidence_list.map((ev, i) => (
                                    <div key={i} className="p-3 border rounded-lg">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm">{ev.title}</p>
                                          <p className="text-sm text-muted-foreground">{ev.description}</p>
                                          {ev.source && (
                                            <p className="text-xs text-muted-foreground mt-1">{ev.source}</p>
                                          )}
                                          {(ev.source_file || ev.source) && (
                                            <div className="flex items-center gap-2 mt-2">
                                              <FileText className="h-3 w-3 text-amber-600" />
                                              <span className="text-xs text-amber-700">{ev.source_file || ev.source}</span>
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={() => openFilePreview(ev.source_file || ev.source || '')}
                                              >
                                                <Eye className="h-3 w-3 mr-1" />
                                                预览
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                        {ev.strength && (
                                          <Badge variant="outline" className="shrink-0">{ev.strength}</Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  )
                })}
              </TabsContent>

              {/* OC可选标准详情 */}
              <TabsContent value="oc" className="space-y-4">
                {["OC1_创新", "OC2_行业认可", "OC3_重大贡献", "OC4_学术贡献"].map((key) => {
                  const data = (framework.OC_可选标准 as any)[key] as CriteriaData
                  if (!data) return null
                  const isSelected = framework.OC_可选标准?.选择的OC?.includes(key.split("_")[0])
                  
                  return (
                    <Card key={key} className={isSelected ? "border-primary" : ""}>
                      <Collapsible
                        open={expandedSections.has(key)}
                        onOpenChange={() => toggleSection(key)}
                      >
                        <CardHeader className="pb-3">
                          <CollapsibleTrigger className="w-full">
                            <CardTitle className="text-base flex items-center justify-between cursor-pointer">
                              <span className="flex items-center gap-2">
                                {expandedSections.has(key) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                {key.replace("_", ": ")}
                                {isSelected && <Badge>推荐选择</Badge>}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={getScoreColor(data.strength_score || 0)}
                                >
                                  评分: {data.strength_score || 0}/5
                                </Badge>
                                <Badge variant="secondary">
                                  {data.evidence_list?.length || 0} 项证据
                                </Badge>
                              </div>
                            </CardTitle>
                          </CollapsibleTrigger>
                        </CardHeader>
                        
                        <CollapsibleContent>
                          <CardContent className="space-y-4">
                            {data.summary && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">概述</p>
                                <p className="text-sm text-muted-foreground">{data.summary}</p>
                              </div>
                            )}
                            
                            {data.evidence_list && data.evidence_list.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">证据列表</p>
                                <div className="space-y-2">
                                  {data.evidence_list.map((ev, i) => (
                                    <div key={i} className="p-3 border rounded-lg">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm">{ev.title}</p>
                                          <p className="text-sm text-muted-foreground">{ev.description}</p>
                                          {ev.source && (
                                            <p className="text-xs text-muted-foreground mt-1">{ev.source}</p>
                                          )}
                                          {(ev.source_file || ev.source) && (
                                            <div className="flex items-center gap-2 mt-2">
                                              <FileText className="h-3 w-3 text-amber-600" />
                                              <span className="text-xs text-amber-700">{ev.source_file || ev.source}</span>
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={() => openFilePreview(ev.source_file || ev.source || '')}
                                              >
                                                <Eye className="h-3 w-3 mr-1" />
                                                预览
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                        {ev.strength && (
                                          <Badge variant="outline" className="shrink-0">{ev.strength}</Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  )
                })}
              </TabsContent>

              {/* 推荐信 */}
              <TabsContent value="refs" className="space-y-4">
                {["推荐人1", "推荐人2", "推荐人3"].map((key) => {
                  const ref = (framework.推荐信 as any)[key] as Recommender
                  if (!ref) return null
                  
                  return (
                    <Card key={key}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {key}
                          </span>
                          <Badge variant={ref.status === "已确定" ? "default" : "secondary"}>
                            {ref.status || "待确定"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">姓名</p>
                            <p className="font-medium">{ref.name || "待确定"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">职位</p>
                            <p className="font-medium">{ref.title || "待确定"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">机构</p>
                            <p className="font-medium">{ref.organization || "待确定"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">关系</p>
                            <p className="font-medium">{ref.relationship || "待确定"}</p>
                          </div>
                        </div>
                        
                        {/* 推荐人专业领域 */}
                        {ref.field && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">专业领域</p>
                            <p className="font-medium">{ref.field}</p>
                          </div>
                        )}
                        
                        {/* 推荐角度 */}
                        {ref.recommendation_angle && (
                          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">推荐角度/论点</p>
                            <p className="text-sm text-indigo-600 dark:text-indigo-400">{ref.recommendation_angle}</p>
                          </div>
                        )}
                        
                        {ref.suggested_profile && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">建议推荐人类型</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">{ref.suggested_profile}</p>
                          </div>
                        )}
                        
                        {ref.focus_points && ref.focus_points.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">推荐信重点</p>
                            <ul className="space-y-1">
                              {ref.focus_points.map((point, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                  {safeRenderValue(point)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* 支持的标准 */}
                        {ref.supports_criteria && ref.supports_criteria.length > 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">支持的MC/OC标准</p>
                            <div className="flex flex-wrap gap-1">
                              {ref.supports_criteria.map((criteria, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                  {safeRenderValue(criteria)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 来源文件 */}
                        {ref.source_file && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                            <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-amber-700 dark:text-amber-300">来源文件</p>
                              <p className="text-sm text-amber-800 dark:text-amber-200 truncate">{ref.source_file}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="shrink-0"
                              onClick={() => openFilePreview(ref.source_file || '')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              预览
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>

              {/* 个人陈述 */}
              <TabsContent value="ps">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      个人陈述要点
                    </CardTitle>
                    <CardDescription>
                      用于撰写Personal Statement的核心要点
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">开篇吸引点</p>
                      <p className="text-sm">{framework.个人陈述要点?.opening_hook || "待填写"}</p>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">技术/职业发展历程</p>
                      <p className="text-sm">{framework.个人陈述要点?.technical_journey || "待填写"}</p>
                    </div>
                    
                    {framework.个人陈述要点?.key_achievements && framework.个人陈述要点.key_achievements.length > 0 && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">核心成就</p>
                        <ul className="space-y-2">
                          {framework.个人陈述要点.key_achievements.map((ach, i) => {
                            // 支持多种格式：字符串、对象、或其他
                            if (typeof ach === 'string') {
                              return (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Award className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                                  {ach}
                                </li>
                              )
                            } else if (ach && typeof ach === 'object') {
                              // 安全地获取字段值
                              const achievement = typeof ach.achievement === 'string' ? ach.achievement : JSON.stringify(ach.achievement || ach)
                              const evidence = typeof ach.evidence === 'string' ? ach.evidence : ''
                              const sourceFile = typeof ach.source_file === 'string' ? ach.source_file : ''
                              
                              return (
                                <li key={i} className="text-sm border-l-2 border-yellow-500 pl-3">
                                  <div className="flex items-start gap-2">
                                    <Award className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                                    <span className="font-medium">{achievement}</span>
                                  </div>
                                  {evidence && (
                                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                                      证据: {evidence}
                                    </p>
                                  )}
                                  {sourceFile && (
                                    <p className="text-xs text-blue-600 mt-0.5 ml-6">
                                      来源: {sourceFile}
                                    </p>
                                  )}
                                </li>
                              )
                            } else {
                              // 回退：将未知类型转换为字符串
                              return (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Award className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                                  {String(ach)}
                                </li>
                              )
                            }
                          })}
                        </ul>
                      </div>
                    )}
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">英国发展愿景</p>
                      <p className="text-sm">{framework.个人陈述要点?.uk_vision || "待填写"}</p>
                    </div>
                    
                    {framework.个人陈述要点?.conclusion && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">总结</p>
                        <p className="text-sm">{framework.个人陈述要点.conclusion}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 申请策略 */}
              <TabsContent value="strategy">
                {framework.申请策略 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          申请策略
                        </span>
                        <Badge 
                          variant={
                            framework.申请策略.overall_strength === "强" ? "default" :
                            framework.申请策略.overall_strength === "中" ? "secondary" : "destructive"
                          }
                        >
                          整体强度: {framework.申请策略.overall_strength}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">建议策略</p>
                        <p className="text-sm">{framework.申请策略.recommended_approach}</p>
                      </div>
                      
                      {framework.申请策略.key_risks && framework.申请策略.key_risks.length > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                          <p className="text-sm font-medium mb-2 text-red-700 dark:text-red-300">主要风险</p>
                          <ul className="space-y-1">
                            {framework.申请策略.key_risks.map((risk, i) => (
                              <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                {safeRenderValue(risk)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {framework.申请策略.preparation_priorities && framework.申请策略.preparation_priorities.length > 0 && (
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-sm font-medium mb-2 text-green-700 dark:text-green-300">准备优先级</p>
                          <ol className="space-y-1">
                            {framework.申请策略.preparation_priorities.map((priority, i) => (
                              <li key={i} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                                <span className="font-medium">{i + 1}.</span>
                                {safeRenderValue(priority)}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      
                      {/* 待补充证据 */}
                      {framework.申请策略.evidence_todo && framework.申请策略.evidence_todo.length > 0 && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                          <p className="text-sm font-medium mb-2 text-yellow-700 dark:text-yellow-300">待补充证据</p>
                          <ul className="space-y-1">
                            {framework.申请策略.evidence_todo.map((item, i) => (
                              <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                                <span className="text-yellow-500">•</span>
                                {safeRenderValue(item)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* 时间线规划 */}
                      {framework.申请策略.timeline && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm font-medium mb-3 text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            申请时间线
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                              <span className="text-muted-foreground">材料准备完成:</span>
                              <span className="text-blue-600 dark:text-blue-400">{framework.申请策略.timeline.materials_completion || "待定"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-muted-foreground">背书申请递交:</span>
                              <span className="text-blue-600 dark:text-blue-400">{framework.申请策略.timeline.endorsement_submission || "待定"}</span>
                            </div>
                            {framework.申请策略.timeline.endorsement_result && (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                <span className="text-muted-foreground">预计背书结果:</span>
                                <span className="text-blue-600 dark:text-blue-400">{framework.申请策略.timeline.endorsement_result}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-700"></div>
                              <span className="text-muted-foreground">签证递交:</span>
                              <span className="text-blue-600 dark:text-blue-400">{framework.申请策略.timeline.visa_submission || "待定"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-muted-foreground">预计结果:</span>
                              <span className="text-green-600 dark:text-green-400">{framework.申请策略.timeline.expected_result || "待定"}</span>
                            </div>
                          </div>
                          
                          {/* 关键里程碑 */}
                          {framework.申请策略.timeline.key_milestones && framework.申请策略.timeline.key_milestones.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">关键里程碑</p>
                              <ul className="space-y-1">
                                {framework.申请策略.timeline.key_milestones.map((milestone, i) => (
                                  <li key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                                    <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                    {safeRenderValue(milestone)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">暂无申请策略分析</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* 构建日志对话框 - 双栏设计 */}
      <Dialog open={logsDialogOpen} onOpenChange={(open) => {
        setLogsDialogOpen(open)
        // 关闭对话框时停止轮询
        if (!open && !building) {
          stopLogPolling()
        }
      }}>
        <DialogContent className="!max-w-[1200px] !w-[95vw] !h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              框架构建日志
              {building && (
                <Badge variant="default" className="ml-2 bg-indigo-600 animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  实时更新中
                </Badge>
              )}
              {!building && frameworkLogs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {frameworkLogs.filter(l => l.prompt && l.response).length} 个步骤
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {building ? (
                <span className="text-indigo-600">构建进行中，日志每2秒自动刷新...</span>
              ) : (
                "点击左侧步骤查看详细的提示词和AI响应"
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex min-h-0">
            {loadingLogs ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="mt-4 text-muted-foreground">加载日志中...</p>
              </div>
            ) : frameworkLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {building ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">正在构建框架...</h3>
                    <p className="text-muted-foreground max-w-sm">
                      AI正在分析材料，日志将实时显示在这里
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">暂无构建日志</h3>
                    <p className="text-muted-foreground max-w-sm">
                      点击"重新构建"按钮后，系统将记录每个步骤的提示词和AI响应
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* 左侧：步骤列表 */}
                <div className="w-72 border-r bg-slate-50/50 flex flex-col shrink-0">
                  <div className="p-3 border-b bg-white">
                    <p className="text-xs font-medium text-muted-foreground">构建步骤</p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {frameworkLogs
                        .filter(log => log.prompt && log.response)  // 只显示有完整prompt和response的日志
                        .map((log: any, index: number) => {
                          const isSelected = expandedLogIds.has(log.id)
                          const stepName = log.action?.replace('完成', '').replace('开始', '') || log.log_type
                          
                          // 步骤图标映射
                          const getStepIcon = (type: string) => {
                            if (type?.includes('domain')) return '🎯'
                            if (type?.includes('mc')) return '📋'
                            if (type?.includes('oc')) return '📊'
                            if (type?.includes('recommender')) return '👥'
                            if (type?.includes('ps')) return '✍️'
                            if (type?.includes('strategy')) return '🚀'
                            return '📝'
                          }
                          
                          return (
                            <div
                              key={log.id}
                              onClick={() => {
                                setExpandedLogIds(new Set([log.id]))
                              }}
                              className={`
                                p-3 rounded-lg cursor-pointer transition-all
                                ${isSelected 
                                  ? 'bg-indigo-100 border border-indigo-300' 
                                  : 'hover:bg-white border border-transparent hover:border-slate-200'}
                              `}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getStepIcon(log.log_type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : ''}`}>
                                      {stepName}
                                    </p>
                                    {log.prompt_version && (
                                      <span className="text-xs bg-indigo-100 text-indigo-600 px-1 rounded">
                                        v{log.prompt_version}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.created_at).toLocaleTimeString('zh-CN')}
                                  </p>
                                </div>
                                {log.status === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                ) : log.status === 'processing' || log.status === 'started' ? (
                                  <Loader2 className="h-4 w-4 text-blue-500 shrink-0 animate-spin" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* 右侧：详情面板 */}
                <div className="flex-1 flex flex-col min-w-0">
                  {Array.from(expandedLogIds).length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <ChevronRight className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>点击左侧步骤查看详情</p>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const selectedLog = frameworkLogs.find(l => expandedLogIds.has(l.id))
                      if (!selectedLog) return null
                      
                      return (
                        <div className="flex-1 flex flex-col min-h-0">
                          {/* 标题栏 */}
                          <div className="p-4 border-b bg-white shrink-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{selectedLog.action}</h3>
                                {selectedLog.prompt_version && (
                                  <Badge variant="outline" className="text-xs">
                                    提示词 v{selectedLog.prompt_version}
                                  </Badge>
                                )}
                              </div>
                              <Badge variant={selectedLog.status === 'success' ? 'default' : 'destructive'}>
                                {selectedLog.status === 'success' ? '成功' : '失败'}
                              </Badge>
                            </div>
                            {selectedLog.prompt_name && (
                              <p className="text-xs text-indigo-600 mt-1">
                                使用提示词：{selectedLog.prompt_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(selectedLog.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          
                          {/* 内容区 - 双栏并排显示提示词和响应 */}
                          <div className="flex-1 flex min-h-0 overflow-hidden">
                            {/* 左栏：提示词 */}
                            <div className="flex-1 flex flex-col border-r min-w-0 overflow-hidden">
                              <div className="p-3 border-b bg-slate-50 shrink-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-indigo-700 flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    发送给AI的提示词
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => copyToClipboard(selectedLog.prompt)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    复制
                                  </Button>
                                </div>
                              </div>
                              <div className="flex-1 overflow-auto">
                                <div className="p-3">
                                  {selectedLog.prompt ? (
                                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                                      {selectedLog.prompt}
                                    </pre>
                                  ) : (
                                    <p className="text-muted-foreground text-sm">无提示词</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* 右栏：AI响应 */}
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                              <div className="p-3 border-b bg-green-50 shrink-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    AI响应结果
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => copyToClipboard(selectedLog.response)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    复制
                                  </Button>
                                </div>
                              </div>
                              <div className="flex-1 overflow-auto bg-green-50/30">
                                <div className="p-3">
                                  {selectedLog.response ? (
                                    <pre className="text-xs text-green-900 whitespace-pre-wrap font-mono leading-relaxed">
                                      {selectedLog.response}
                                    </pre>
                                  ) : (
                                    <p className="text-muted-foreground text-sm">无响应</p>
                                  )}
                                  
                                  {/* 错误信息 */}
                                  {selectedLog.error_message && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <p className="text-sm font-medium text-red-700 mb-1">错误信息</p>
                                      <p className="text-sm text-red-600">{selectedLog.error_message}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 提示词管理对话框 - 双栏设计 */}
      <Dialog open={promptsDialogOpen} onOpenChange={setPromptsDialogOpen}>
        <DialogContent className="!max-w-[1200px] !w-[95vw] !h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                提示词管理
                {prompts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {prompts.length} 个提示词
                  </Badge>
                )}
              </DialogTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/agent-prompts/sync', { method: 'POST' })
                    const data = await response.json()
                    if (data.success) {
                      toast({ title: '同步成功', description: data.message })
                      loadPrompts()
                    } else {
                      throw new Error(data.error)
                    }
                  } catch (error: any) {
                    toast({ title: '同步失败', description: error.message, variant: 'destructive' })
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                同步默认提示词
              </Button>
            </div>
            <DialogDescription>
              点击左侧提示词进行编辑，修改后点击保存生效。点击"同步默认提示词"获取系统最新提示词模板。
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {loadingPrompts ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <p className="mt-4 text-muted-foreground">加载提示词...</p>
              </div>
            ) : prompts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Code className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">暂无提示词</h3>
                <p className="text-muted-foreground max-w-sm">
                  提示词在框架构建时由系统管理
                </p>
              </div>
            ) : (
              <>
                {/* 左侧：提示词列表 */}
                <div className="w-80 border-r bg-slate-50/50 flex flex-col shrink-0 h-full overflow-hidden">
                  <div className="p-3 border-b bg-white shrink-0">
                    <p className="text-xs font-medium text-muted-foreground">提示词列表</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {prompts.map((prompt: any) => {
                        const isSelected = editingPrompt?.id === prompt.id
                        
                        // 类型图标映射
                        const getTypeIcon = (type: string) => {
                          if (type?.includes('extraction')) return '📥'
                          if (type?.includes('translation')) return '🌐'
                          if (type?.includes('enhancement')) return '✨'
                          if (type?.includes('framework')) return '🎯'
                          return '📝'
                        }
                        
                        return (
                          <div
                            key={prompt.id}
                            onClick={() => setEditingPrompt({...prompt})}
                            className={`
                              p-3 rounded-lg cursor-pointer transition-all
                              ${isSelected 
                                ? 'bg-purple-100 border border-purple-300' 
                                : 'hover:bg-white border border-transparent hover:border-slate-200'}
                            `}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-lg mt-0.5">{getTypeIcon(prompt.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-700' : ''}`}>
                                    {prompt.name}
                                  </p>
                                  {prompt.version && (
                                    <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded shrink-0">
                                      v{prompt.version}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {prompt.description || prompt.type}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                
                {/* 右侧：编辑面板 */}
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                  {!editingPrompt ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Edit3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>点击左侧提示词进行编辑</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      {/* 标题栏 */}
                      <div className="p-4 border-b bg-white shrink-0 z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input 
                              value={editingPrompt.name || ''} 
                              onChange={(e) => setEditingPrompt({...editingPrompt, name: e.target.value})}
                              className="text-lg font-medium border-0 p-0 h-auto focus-visible:ring-0"
                              placeholder="提示词名称"
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline">{editingPrompt.type}</Badge>
                            <Button 
                              variant={debugMode ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => {
                                setDebugMode(!debugMode)
                                if (!debugMode && Object.keys(debugVariables).length === 0) {
                                  loadDebugVariables()
                                }
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              调试
                            </Button>
                            <Button onClick={savePrompt} disabled={savingPrompt}>
                              {savingPrompt ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  保存
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        <Input 
                          value={editingPrompt.description || ''} 
                          onChange={(e) => setEditingPrompt({...editingPrompt, description: e.target.value})}
                          className="text-sm text-muted-foreground border-0 p-0 h-auto mt-1 focus-visible:ring-0"
                          placeholder="描述这个提示词的用途"
                        />
                      </div>
                      
                      {/* 内容区 - 可滚动 */}
                      <div className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-4">
                          {/* 编辑区 */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium flex items-center gap-2">
                                <Code className="h-4 w-4 text-purple-600" />
                                提示词内容
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>可用变量:</span>
                                <code className="bg-slate-100 px-1.5 py-0.5 rounded">{"{content}"}</code>
                                <code className="bg-slate-100 px-1.5 py-0.5 rounded">{"{profile}"}</code>
                                <code className="bg-slate-100 px-1.5 py-0.5 rounded">{"{context}"}</code>
                              </div>
                            </div>
                            <textarea 
                              value={editingPrompt.content || ''} 
                              onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
                              className="w-full font-mono text-sm resize-none border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              style={{ minHeight: debugMode ? '200px' : '350px' }}
                              placeholder="输入提示词内容..."
                            />
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>
                                更新时间: {editingPrompt.updated_at ? new Date(editingPrompt.updated_at).toLocaleString('zh-CN') : '-'}
                              </span>
                              <span>{(editingPrompt.content || '').length} 字符</span>
                            </div>
                          </div>
                          
                          {/* 调试面板 */}
                          {debugMode && (
                            <div className="border-t pt-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium flex items-center gap-2">
                                  <Play className="h-4 w-4 text-green-600" />
                                  调试面板
                                </span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadDebugVariables}
                                    disabled={loadingVariables}
                                  >
                                    {loadingVariables ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                    <span className="ml-1">加载变量</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={debugPrompt}
                                    disabled={debugLoading}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {debugLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                    <span className="ml-1">执行调试</span>
                                  </Button>
                                </div>
                              </div>
                              
                              {/* 变量预览 */}
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">当前项目变量：</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(debugVariables).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-1">
                                      <code className="bg-purple-100 text-purple-700 px-1 rounded shrink-0">{`{${key}}`}</code>
                                      <span className="text-muted-foreground truncate" title={String(value)}>
                                        {value ? (String(value).length > 50 ? String(value).slice(0, 50) + '...' : value) : '(空)'}
                                      </span>
                                    </div>
                                  ))}
                                  {Object.keys(debugVariables).length === 0 && (
                                    <span className="text-muted-foreground col-span-2">点击"加载变量"获取项目上下文</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* 调试输入输出 */}
                              {(debugInput || debugResult || debugLoading) && (
                                <div className="grid grid-cols-2 gap-4">
                                  {/* 输入：替换变量后的提示词 */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                      输入（变量已替换）：
                                    </p>
                                    <div className="bg-blue-950 text-blue-100 rounded-lg p-3 font-mono text-xs max-h-[300px] overflow-auto">
                                      {debugLoading && !debugInput ? (
                                        <div className="flex items-center gap-2 text-blue-400">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          准备输入...
                                        </div>
                                      ) : (
                                        <pre className="whitespace-pre-wrap">{debugInput || '(点击"执行调试"生成)'}</pre>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* 输出：LLM 返回结果 */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                      输出（LLM 返回）：
                                    </p>
                                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs max-h-[300px] overflow-auto">
                                      {debugLoading ? (
                                        <div className="flex items-center gap-2 text-slate-400">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          正在执行提示词...
                                        </div>
                                      ) : (
                                        <pre className="whitespace-pre-wrap">{debugResult || '(等待执行)'}</pre>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 旧的提示词编辑器已集成到提示词管理对话框中 */}

      {/* 文件预览组件 */}
      <UnifiedFilePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
      />
    </div>
  )
}
