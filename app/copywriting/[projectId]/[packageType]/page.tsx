"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
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

export default function PackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const packageType = params.packageType as string
  
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
  const [referenceDocuments, setReferenceDocuments] = useState<ReferenceDocument[]>([])
  const [selectedRefDocId, setSelectedRefDocId] = useState<string>("")
  const [caseSearchKeyword, setCaseSearchKeyword] = useState("")
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  
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
      
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          reference_doc_id: selectedRefDocId || undefined
        })
      })
      
      if (data.success) {
        setContent(data.content || "")
        setSuccess("AI生成完成，请查看并编辑")
        setCurrentVersion(data.version || currentVersion)
        loadVersions()
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
    }
  }, [projectId, packageType, loadProject, loadContent, loadVersions, loadCases])
  
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
          
          {/* 侧边栏 - 版本历史 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  版本历史
                </CardTitle>
                <CardDescription>
                  共 {versions.length} 个版本
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ScrollArea className="h-[450px]">
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
      
      <Footer />
    </div>
  )
}
