"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { 
  Settings, Code, Play, Save, RefreshCw, Loader2, Edit3, ArrowLeft,
  Search, Filter, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { toast } from "sonner"

const API_BASE = "/api/copywriting"

interface Prompt {
  id: number
  name: string
  type: string
  description: string
  content: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// 提示词类型分类
const PROMPT_CATEGORIES = [
  { value: "all", label: "全部提示词" },
  { value: "framework", label: "框架构建" },
  { value: "rl_", label: "推荐信" },
  { value: "personal", label: "个人陈述" },
  { value: "cv", label: "简历" },
  { value: "extraction", label: "内容提取" },
  { value: "translation", label: "翻译" },
  { value: "enhancement", label: "内容增强" },
]

export default function PromptsManagementPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const typeParam = searchParams.get('type') || ''
  
  // 只有预定义的类别才用于筛选，其他情况显示全部
  const validCategories = ['framework', 'rl_', 'personal', 'cv', 'extraction', 'translation', 'enhancement']
  const initialType = validCategories.some(cat => typeParam.includes(cat)) ? typeParam : 'all'

  // 提示词列表
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [savingPrompt, setSavingPrompt] = useState(false)

  // 筛选
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(initialType)

  // 调试相关
  const [debugMode, setDebugMode] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugInput, setDebugInput] = useState<string>('')
  const [debugResult, setDebugResult] = useState<string>('')
  const [debugVariables, setDebugVariables] = useState<Record<string, string>>({})
  const [loadingVariables, setLoadingVariables] = useState(false)

  // 获取提示词列表
  const fetchPrompts = useCallback(async () => {
    try {
      setLoadingPrompts(true)
      console.log("正在获取提示词列表...")
      const response = await fetch(`${API_BASE}/api/agent-prompts`)
      console.log("API 响应状态:", response.status)
      const data = await response.json()
      console.log("API 返回数据:", data)
      if (data.success) {
        setPrompts(data.data || [])
        console.log("提示词数量:", (data.data || []).length)
      } else {
        console.error("API 返回失败:", data.error)
        toast.error(data.error || "获取提示词失败")
      }
    } catch (error) {
      console.error("获取提示词失败:", error)
      toast.error("获取提示词列表失败")
    } finally {
      setLoadingPrompts(false)
    }
  }, [])

  // 筛选提示词
  useEffect(() => {
    console.log("筛选逻辑执行:", { prompts: prompts.length, categoryFilter, searchQuery })
    let filtered = prompts

    // 类型筛选
    if (categoryFilter && categoryFilter !== 'all') {
      const categoryFiltered = prompts.filter(p => 
        p.type?.includes(categoryFilter) || p.name?.includes(categoryFilter)
      )
      console.log("类型筛选结果:", categoryFiltered.length, "条，筛选条件:", categoryFilter)
      // 如果筛选结果为空，显示全部
      filtered = categoryFiltered.length > 0 ? categoryFiltered : prompts
    }

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.type?.toLowerCase().includes(query)
      )
    }

    console.log("最终筛选结果:", filtered.length, "条")
    setFilteredPrompts(filtered)
  }, [prompts, categoryFilter, searchQuery])

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

  // 加载调试变量
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
      
      // 本地生成输入预览
      let inputPreview = editingPrompt.content
      for (const [key, value] of Object.entries(debugVariables)) {
        inputPreview = inputPreview.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value) || `[${key}为空]`)
      }
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

  // 同步默认提示词
  const syncDefaultPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/agent-prompts/sync`, { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || '同步成功')
        fetchPrompts()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast.error(`同步失败: ${error.message}`)
    }
  }

  // 初始加载
  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  // 类型图标映射
  const getTypeIcon = (type: string) => {
    if (type?.includes('extraction')) return '📥'
    if (type?.includes('translation')) return '🌐'
    if (type?.includes('enhancement')) return '✨'
    if (type?.includes('framework')) return '🎯'
    if (type?.includes('rl_') || type?.includes('recommendation')) return '📝'
    if (type?.includes('personal')) return '👤'
    if (type?.includes('cv')) return '📄'
    return '📝'
  }

  return (
    <AuthGuard requireAuth={true} allowedRoles={['admin', 'super_admin']} unauthorizedMessage="AI文案功能仅对管理员开放">
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/copywriting/${projectId}/generation`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回文案生成
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">提示词管理</span>
        </div>
        
        {/* 页面标题 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <Settings className="h-8 w-8" />
              提示词管理中心
            </h1>
            <p className="text-muted-foreground mt-1">
              管理和调试 AI 生成文案所使用的提示词模板
            </p>
          </div>
          
          <Button variant="outline" onClick={syncDefaultPrompts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            同步默认提示词
          </Button>
        </div>
        
        {/* 筛选工具栏 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索提示词名称或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="筛选类型" />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {filteredPrompts.length} 个提示词
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        {/* 主内容区 - 双栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：提示词列表 */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-320px)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">提示词列表</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-420px)]">
                  {loadingPrompts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredPrompts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>暂无提示词</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredPrompts.map((prompt) => {
                        const isSelected = editingPrompt?.id === prompt.id
                        
                        return (
                          <div
                            key={prompt.id}
                            onClick={() => {
                              setEditingPrompt({...prompt})
                              setDebugMode(false)
                              setDebugInput('')
                              setDebugResult('')
                            }}
                            className={`
                              p-3 rounded-lg cursor-pointer transition-all
                              ${isSelected 
                                ? 'bg-purple-100 border border-purple-300 dark:bg-purple-900/30 dark:border-purple-700' 
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'}
                            `}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-lg mt-0.5">{getTypeIcon(prompt.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                                    {prompt.name}
                                  </p>
                                  {prompt.version && (
                                    <span className="text-xs bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300 px-1 rounded shrink-0">
                                      v{prompt.version}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {prompt.description || prompt.type}
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-purple-600 shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* 右侧：编辑面板 */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-320px)]">
              {!editingPrompt ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Edit3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">点击左侧提示词进行编辑</p>
                    <p className="text-sm mt-2">选择一个提示词开始编辑和调试</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* 标题栏 */}
                  <CardHeader className="pb-3 border-b shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-2xl">{getTypeIcon(editingPrompt.type)}</span>
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
                          {debugMode ? '关闭调试' : '调试'}
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
                  </CardHeader>
                  
                  {/* 内容区 */}
                  <CardContent className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {/* 编辑区 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Code className="h-4 w-4 text-purple-600" />
                            提示词内容
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>可用变量:</span>
                            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{"{content}"}</code>
                            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{"{profile}"}</code>
                            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{"{context}"}</code>
                          </div>
                        </div>
                        <textarea 
                          value={editingPrompt.content || ''} 
                          onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
                          className="w-full font-mono text-sm resize-none border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-900"
                          style={{ minHeight: debugMode ? '180px' : '300px' }}
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
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">当前项目变量：</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(debugVariables).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-1">
                                  <code className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1 rounded shrink-0">{`{${key}}`}</code>
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
                              {/* 输入 */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  输入（变量已替换）：
                                </p>
                                <div className="bg-blue-950 text-blue-100 rounded-lg p-3 font-mono text-xs max-h-[200px] overflow-auto">
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
                              
                              {/* 输出 */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  输出（LLM 返回）：
                                </p>
                                <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs max-h-[200px] overflow-auto">
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
                  </CardContent>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
    </AuthGuard>
  )
}
