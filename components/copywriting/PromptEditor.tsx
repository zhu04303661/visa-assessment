"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Settings, Code, Play, Save, RefreshCw, Loader2, Edit3, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

// API 基础路径
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

interface PromptEditorProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 可选：筛选特定类型的提示词 */
  filterType?: string
  /** 可选：选中提示词后的回调 */
  onPromptSelect?: (prompt: Prompt) => void
  /** 可选：自定义标题 */
  title?: string
}

export function PromptEditor({
  projectId,
  open,
  onOpenChange,
  filterType,
  onPromptSelect,
  title = "提示词管理"
}: PromptEditorProps) {
  // 提示词列表
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [savingPrompt, setSavingPrompt] = useState(false)

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
      const response = await fetch(`${API_BASE}/api/agent-prompts`)
      const data = await response.json()
      if (data.success) {
        let promptList = data.data || []
        // 如果指定了筛选类型，过滤提示词
        if (filterType) {
          promptList = promptList.filter((p: Prompt) => 
            p.type?.includes(filterType) || p.name?.includes(filterType)
          )
        }
        setPrompts(promptList)
      }
    } catch (error) {
      console.error("获取提示词失败:", error)
    } finally {
      setLoadingPrompts(false)
    }
  }, [filterType])

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
    if (open) {
      fetchPrompts()
    }
  }, [open, fetchPrompts])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1200px] !w-[95vw] !h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              {title}
              {prompts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {prompts.length} 个提示词
                </Badge>
              )}
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={syncDefaultPrompts}
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
                点击"同步默认提示词"获取系统模板
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
                    {prompts.map((prompt) => {
                      const isSelected = editingPrompt?.id === prompt.id
                      
                      return (
                        <div
                          key={prompt.id}
                          onClick={() => {
                            setEditingPrompt({...prompt})
                            onPromptSelect?.(prompt)
                          }}
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
                    
                    {/* 内容区 */}
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
                                {/* 输入 */}
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
                                
                                {/* 输出 */}
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
  )
}
