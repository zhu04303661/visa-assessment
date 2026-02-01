"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  Mail,
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
  Building,
  Briefcase,
  UserCheck,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import ReactMarkdown from 'react-markdown'

// 推荐信类型定义
const LETTER_TYPES = [
  {
    key: "rl_1",
    name: "推荐信 1",
    subtitle: "行业专家推荐",
    description: "来自行业知名人士的推荐，展示申请人在领域内的影响力",
    icon: UserCheck,
  },
  {
    key: "rl_2",
    name: "推荐信 2",
    subtitle: "技术/学术推荐",
    description: "来自技术或学术领域专家的推荐，突出技术能力和创新贡献",
    icon: Bot,
  },
  {
    key: "rl_3",
    name: "推荐信 3",
    subtitle: "商业/合作推荐",
    description: "来自商业合作伙伴、客户或投资人的推荐，展示商业影响力",
    icon: Briefcase,
  },
]

interface LetterContent {
  content: string
  current_version: number
  status: string
  last_edited_by: string
  updated_at: string
  ai_generated: boolean
}

interface RecommenderInfo {
  name: string
  title: string
  organization: string
  email: string
  relationship: string
  expertise: string
}

interface Project {
  project_id: string
  client_name: string
  visa_type: string
}

interface GTVFramework {
  推荐信?: {
    推荐人1?: RecommenderInfo
    推荐人2?: RecommenderInfo
    推荐人3?: RecommenderInfo
  }
}

export default function RecommendationLettersPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [activeLetterKey, setActiveLetterKey] = useState("rl_1")
  const [letterContents, setLetterContents] = useState<Record<string, LetterContent>>({})
  const [recommenderInfos, setRecommenderInfos] = useState<Record<string, RecommenderInfo>>({
    rl_1: { name: "", title: "", organization: "", email: "", relationship: "", expertise: "" },
    rl_2: { name: "", title: "", organization: "", email: "", relationship: "", expertise: "" },
    rl_3: { name: "", title: "", organization: "", email: "", relationship: "", expertise: "" },
  })
  const [editingContent, setEditingContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("edit")
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)

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

  // 加载GTV框架获取推荐人信息
  const loadRecommenderFromFramework = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/framework`)
      if (data.success && data.data) {
        const framework = data.data.framework_data || data.data
        if (framework.推荐信) {
          const newInfos = { ...recommenderInfos }
          if (framework.推荐信.推荐人1) {
            newInfos.rl_1 = { ...newInfos.rl_1, ...framework.推荐信.推荐人1 }
          }
          if (framework.推荐信.推荐人2) {
            newInfos.rl_2 = { ...newInfos.rl_2, ...framework.推荐信.推荐人2 }
          }
          if (framework.推荐信.推荐人3) {
            newInfos.rl_3 = { ...newInfos.rl_3, ...framework.推荐信.推荐人3 }
          }
          setRecommenderInfos(newInfos)
        }
      }
    } catch (err) {
      console.error("加载框架失败")
    }
  }, [projectId])

  // 加载所有推荐信内容
  const loadAllLetters = useCallback(async () => {
    try {
      setLoading(true)
      const contents: Record<string, LetterContent> = {}
      
      for (const letter of LETTER_TYPES) {
        try {
          const data = await apiCall(`/api/projects/${projectId}/packages/${letter.key}`)
          if (data.success && data.data) {
            contents[letter.key] = data.data
          }
        } catch (err) {
          console.error(`加载 ${letter.key} 失败`)
        }
      }
      
      setLetterContents(contents)
      
      // 设置当前编辑内容
      if (contents[activeLetterKey]) {
        setEditingContent(contents[activeLetterKey].content || "")
      }
    } catch (err) {
      setError("加载推荐信失败")
    } finally {
      setLoading(false)
    }
  }, [projectId, activeLetterKey])

  // 切换推荐信时更新编辑内容
  useEffect(() => {
    const content = letterContents[activeLetterKey]
    setEditingContent(content?.content || "")
  }, [activeLetterKey, letterContents])

  // 保存推荐信
  const handleSave = async () => {
    if (!editingContent.trim()) {
      setError("内容不能为空")
      return
    }
    
    try {
      setSaving(true)
      setError("")
      
      const data = await apiCall(`/api/projects/${projectId}/packages/${activeLetterKey}`, {
        method: 'POST',
        body: JSON.stringify({
          content: editingContent,
          edit_type: "manual",
          edit_summary: "手动编辑保存"
        })
      })
      
      if (data.success) {
        setSuccess(`推荐信已保存为版本 ${data.version}`)
        loadAllLetters()
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

  // AI生成推荐信
  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setError("")
      
      const recommender = recommenderInfos[activeLetterKey]
      
      const data = await apiCall(`/api/projects/${projectId}/packages/${activeLetterKey}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          recommender_info: recommender,
          custom_instructions: `推荐人信息：
姓名：${recommender.name || '待填写'}
职位：${recommender.title || '待填写'}
机构：${recommender.organization || '待填写'}
与申请人关系：${recommender.relationship || '待填写'}
专业领域：${recommender.expertise || '待填写'}`
        })
      })
      
      if (data.success) {
        setEditingContent(data.content || "")
        setSuccess("AI生成完成，请查看并编辑")
        loadAllLetters()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "生成失败")
      }
    } catch (err) {
      setError("生成失败")
    } finally {
      setGenerating(false)
    }
  }

  // 更新推荐人信息
  const updateRecommenderInfo = (field: keyof RecommenderInfo, value: string) => {
    setRecommenderInfos({
      ...recommenderInfos,
      [activeLetterKey]: {
        ...recommenderInfos[activeLetterKey],
        [field]: value
      }
    })
  }

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(editingContent)
    setSuccess("已复制到剪贴板")
    setTimeout(() => setSuccess(""), 2000)
  }

  // 下载内容
  const handleDownload = () => {
    const letterInfo = LETTER_TYPES.find(l => l.key === activeLetterKey)
    const blob = new Blob([editingContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${letterInfo?.name || activeLetterKey}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 初始化加载
  useEffect(() => {
    if (projectId) {
      loadProject()
      loadAllLetters()
      loadRecommenderFromFramework()
    }
  }, [projectId, loadProject, loadAllLetters, loadRecommenderFromFramework])

  // 获取当前推荐信信息
  const currentLetter = LETTER_TYPES.find(l => l.key === activeLetterKey)
  const currentContent = letterContents[activeLetterKey]
  const currentRecommender = recommenderInfos[activeLetterKey]

  // 获取状态徽章
  const getStatusBadge = (key: string) => {
    const content = letterContents[key]
    if (!content || !content.content) {
      return <Badge variant="outline" className="text-gray-500">未开始</Badge>
    }
    if (content.status === 'completed' || content.status === 'final') {
      return <Badge className="bg-green-500">已完成</Badge>
    }
    return <Badge variant="secondary">草稿</Badge>
  }

  // 检查是否有未保存的更改
  const hasChanges = editingContent !== (currentContent?.content || "")

  return (
    <AuthGuard requireAuth={true} allowedRoles={['admin', 'super_admin']} unauthorizedMessage="AI文案功能仅对管理员开放">
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/copywriting/${projectId}/generation`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回文案生成
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{project?.client_name || projectId}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">推荐信</span>
        </div>
        
        {/* 页面标题 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <Mail className="h-8 w-8" />
              推荐信管理
            </h1>
            <p className="text-muted-foreground mt-1">
              为 {project?.client_name || '申请人'} 生成和编辑 3 封 GTV 签证推荐信
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!editingContent}>
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!editingContent}>
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
        
        {/* 推荐信选择标签 */}
        <Tabs value={activeLetterKey} onValueChange={setActiveLetterKey} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            {LETTER_TYPES.map((letter) => {
              const Icon = letter.icon
              return (
                <TabsTrigger key={letter.key} value={letter.key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{letter.name}</span>
                  <span className="sm:hidden">{letter.key.toUpperCase()}</span>
                  {getStatusBadge(letter.key)}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        
        {/* 主要内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 编辑区 */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {currentLetter && <currentLetter.icon className="h-5 w-5" />}
                      {currentLetter?.name} - {currentLetter?.subtitle}
                    </CardTitle>
                    <CardDescription>{currentLetter?.description}</CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList>
                        <TabsTrigger value="edit">
                          <Edit className="h-4 w-4 mr-1" />
                          编辑
                        </TabsTrigger>
                        <TabsTrigger value="preview">
                          <Eye className="h-4 w-4 mr-1" />
                          预览
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
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
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        placeholder={`开始编写${currentLetter?.name}...\n\n推荐信应包含：\n1. 推荐人自我介绍\n2. 与申请人的关系\n3. 申请人的核心能力和成就\n4. 具体案例和证据\n5. 为什么申请人符合GTV标准\n6. 强烈推荐的结论`}
                        className="min-h-[450px] font-mono text-sm"
                      />
                    ) : (
                      <ScrollArea className="h-[450px] border rounded-md p-4">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {editingContent ? (
                            <ReactMarkdown>{editingContent}</ReactMarkdown>
                          ) : (
                            <p className="text-muted-foreground text-center py-10">暂无内容</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </>
                )}
              </CardContent>
              
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  字数：{editingContent.split(/\s+/).filter(Boolean).length} 词 / {editingContent.length} 字符
                  {hasChanges && <Badge variant="secondary" className="ml-2">有未保存的更改</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleGenerate}
                    disabled={generating}
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
              </CardFooter>
            </Card>
          </div>
          
          {/* 侧边栏 - 推荐人信息 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  推荐人信息
                </CardTitle>
                <CardDescription>
                  用于AI生成推荐信
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">姓名</Label>
                  <Input
                    value={currentRecommender.name}
                    onChange={(e) => updateRecommenderInfo('name', e.target.value)}
                    placeholder="推荐人姓名"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">职位</Label>
                  <Input
                    value={currentRecommender.title}
                    onChange={(e) => updateRecommenderInfo('title', e.target.value)}
                    placeholder="如: CTO, 教授, CEO"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">机构/公司</Label>
                  <Input
                    value={currentRecommender.organization}
                    onChange={(e) => updateRecommenderInfo('organization', e.target.value)}
                    placeholder="所在机构或公司名称"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">与申请人关系</Label>
                  <Input
                    value={currentRecommender.relationship}
                    onChange={(e) => updateRecommenderInfo('relationship', e.target.value)}
                    placeholder="如: 前同事, 客户, 导师"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">专业领域</Label>
                  <Input
                    value={currentRecommender.expertise}
                    onChange={(e) => updateRecommenderInfo('expertise', e.target.value)}
                    placeholder="推荐人的专业领域"
                  />
                </div>
                
                <Separator />
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsInfoDialogOpen(true)}
                >
                  <Building className="h-4 w-4 mr-2" />
                  更多详细信息
                </Button>
              </CardContent>
            </Card>
            
            {/* 推荐信概览 */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">推荐信概览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {LETTER_TYPES.map((letter) => {
                    const content = letterContents[letter.key]
                    const Icon = letter.icon
                    const isActive = letter.key === activeLetterKey
                    
                    return (
                      <div
                        key={letter.key}
                        className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                          isActive ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setActiveLetterKey(letter.key)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{letter.name}</span>
                          </div>
                          {getStatusBadge(letter.key)}
                        </div>
                        {content?.content && (
                          <div className="text-xs text-muted-foreground mt-1">
                            v{content.current_version} · {content.content.split(/\s+/).filter(Boolean).length} 词
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* 详细信息对话框 */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              推荐人详细信息
            </DialogTitle>
            <DialogDescription>
              {currentLetter?.name} - {currentLetter?.subtitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input
                  value={currentRecommender.name}
                  onChange={(e) => updateRecommenderInfo('name', e.target.value)}
                  placeholder="推荐人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  value={currentRecommender.email}
                  onChange={(e) => updateRecommenderInfo('email', e.target.value)}
                  placeholder="推荐人邮箱"
                  type="email"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>职位</Label>
                <Input
                  value={currentRecommender.title}
                  onChange={(e) => updateRecommenderInfo('title', e.target.value)}
                  placeholder="职位头衔"
                />
              </div>
              <div className="space-y-2">
                <Label>机构/公司</Label>
                <Input
                  value={currentRecommender.organization}
                  onChange={(e) => updateRecommenderInfo('organization', e.target.value)}
                  placeholder="所在机构"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>与申请人关系</Label>
              <Input
                value={currentRecommender.relationship}
                onChange={(e) => updateRecommenderInfo('relationship', e.target.value)}
                placeholder="详细描述与申请人的关系"
              />
            </div>
            
            <div className="space-y-2">
              <Label>专业领域/专长</Label>
              <Textarea
                value={currentRecommender.expertise}
                onChange={(e) => updateRecommenderInfo('expertise', e.target.value)}
                placeholder="推荐人的专业领域和专长，用于生成更精准的推荐信"
                className="h-20"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInfoDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
    </AuthGuard>
  )
}
