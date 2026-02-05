"use client"

import { useState, useEffect, useCallback, lazy, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  PanelLeftClose, 
  PanelLeftOpen,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Terminal as TerminalIcon
} from "lucide-react"
import { ClaudeChat } from "@/components/claude-chat"
import { AssistantChat } from "@/components/copywriting/AssistantChat"
import { DocumentWorkspace } from "@/components/copywriting/DocumentWorkspace"
import { AssistantProvider, useAssistant } from "@/components/copywriting/AssistantContext"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

// 懒加载 WebTerminal 组件（需要 xterm.js）
const WebTerminal = lazy(() => import("@/components/web-terminal/WebTerminal").then(m => ({ default: m.WebTerminal })))

// 材料包类型定义
const PACKAGE_TYPES = [
  { type: "personal_statement", name: "个人陈述", name_en: "Personal Statement" },
  { type: "cv_resume", name: "简历/CV", name_en: "CV/Resume" },
  { type: "recommendation_letters", name: "推荐信", name_en: "Recommendation Letters" },
  { type: "evidence_portfolio", name: "证据材料集", name_en: "Evidence Portfolio" },
  { type: "cover_letter", name: "申请信", name_en: "Cover Letter" },
  { type: "endorsement_letter", name: "背书信", name_en: "Endorsement Letter" },
  { type: "business_plan", name: "商业计划书", name_en: "Business Plan" },
  { type: "supplementary", name: "补充材料", name_en: "Supplementary Documents" },
]

interface Project {
  project_id: string
  client_name: string
  visa_type: string
  status: string
}

function AssistantPageContent() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const { setProjectId, setProjectContext } = useAssistant()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [cuiCollapsed, setCuiCollapsed] = useState(false)
  const [useClaudeCode, setUseClaudeCode] = useState(true) // 默认使用新的 Claude Code 界面
  const [activeTab, setActiveTab] = useState<"chat" | "terminal">("chat") // Chat 或 Terminal 模式

  // API调用
  const apiCall = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/copywriting${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
      ...options
    })
    return response.json()
  }

  // 初始化工作空间
  const initWorkspace = useCallback(async () => {
    try {
      console.log(`[Workspace] 检查工作空间: ${projectId}`)
      
      // 先检查工作空间状态
      const checkResult = await apiCall(`/projects/${projectId}/workspace`)
      
      if (checkResult.success && checkResult.data?.ready) {
        console.log(`[Workspace] 工作空间已就绪`)
        setWorkspaceReady(true)
        return
      }
      
      // 工作空间不存在或未就绪，自动初始化
      console.log(`[Workspace] 初始化工作空间...`)
      const initResult = await apiCall(`/projects/${projectId}/workspace`, {
        method: 'POST',
        body: JSON.stringify({ copy_uploads: true })
      })
      
      if (initResult.success) {
        console.log(`[Workspace] 工作空间初始化完成:`, initResult.data)
        setWorkspaceReady(true)
      } else {
        console.error(`[Workspace] 工作空间初始化失败:`, initResult.error)
      }
    } catch (err) {
      console.error("[Workspace] 初始化工作空间出错:", err)
    }
  }, [projectId])

  // 加载项目信息
  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall(`/api/projects/${projectId}`)
      if (data.success) {
        setProject(data.data)
        setProjectId(projectId)
      }
    } catch (err) {
      console.error("加载项目失败:", err)
    } finally {
      setLoading(false)
    }
  }, [projectId, setProjectId])

  // 加载项目上下文
  const loadProjectContext = useCallback(async () => {
    try {
      const data = await apiCall(`/api/projects/${projectId}/prompt-context`)
      if (data.success) {
        setProjectContext(data.data)
      }
    } catch (err) {
      console.error("加载项目上下文失败:", err)
    }
  }, [projectId, setProjectContext])

  useEffect(() => {
    if (projectId) {
      loadProject()
      loadProjectContext()
      // 自动初始化工作空间
      initWorkspace()
    }
  }, [projectId, loadProject, loadProjectContext, initWorkspace])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navbar />
      
      {/* 顶部导航栏 - 精致设计 */}
      <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push(`/copywriting/${projectId}/generation`)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回文案生成
          </Button>
          
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow-md">
                {(project?.client_name || 'U')[0].toUpperCase()}
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {project?.client_name || projectId}
              </span>
            </div>
            
            <Badge className={`text-white border-0 shadow-sm px-3 py-1 ${useClaudeCode ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}>
              <Sparkles className="h-3 w-3 mr-1.5" />
              {useClaudeCode ? 'Claude Code' : 'AI 文案助手'}
            </Badge>
            
            {/* 工作空间状态指示器 */}
            {useClaudeCode && (
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-0.5 ${
                  workspaceReady 
                    ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400' 
                    : 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                }`}
              >
                {workspaceReady ? '工作空间就绪' : '准备中...'}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 切换助手模式 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseClaudeCode(!useClaudeCode)}
                  className={`border-slate-200 dark:border-slate-700 transition-all duration-200 ${
                    useClaudeCode 
                      ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40' 
                      : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                  }`}
                >
                  {useClaudeCode ? (
                    <ToggleRight className="h-4 w-4 mr-2 text-orange-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 mr-2 text-indigo-600" />
                  )}
                  {useClaudeCode ? 'Claude Code' : '经典模式'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{useClaudeCode ? '切换到经典 AI 助手' : '切换到 Claude Code（支持 CLI 执行）'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCuiCollapsed(!cuiCollapsed)}
            className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            {cuiCollapsed ? (
              <>
                <PanelLeftOpen className="h-4 w-4 mr-2" />
                显示助手
              </>
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2" />
                隐藏助手
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* 主体内容区 - 可拖拽分栏布局 */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {cuiCollapsed ? (
          // 折叠模式 - 只显示 GUI（文档工作区）
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DocumentWorkspace projectId={projectId} packageTypes={PACKAGE_TYPES} />
          </div>
        ) : (
          // 展开模式 - CUI + GUI 并排
          <PanelGroup direction="horizontal" className="h-full w-full">
            {/* 左侧 CUI 区域 - AI 聊天 */}
            <Panel
              defaultSize={45}
              minSize={30}
              maxSize={65}
              className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-900/50 border-r border-slate-200/80 dark:border-slate-700/50"
            >
              {useClaudeCode ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "terminal")} className="flex flex-col h-full">
                  <div className="flex-shrink-0 px-4 pt-3 border-b border-slate-200/80 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50">
                    <TabsList className="grid w-full max-w-[240px] grid-cols-2 h-9">
                      <TabsTrigger value="chat" className="text-xs gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="terminal" className="text-xs gap-1.5">
                        <TerminalIcon className="h-3.5 w-3.5" />
                        终端
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
                    <ClaudeChat
                      projectId={projectId}
                      apiEndpoint="/api/copywriting"
                      initialMode="ask"
                      title={`${project?.client_name || '项目'} - Claude 助手`}
                      showHeader={false}
                      height="100%"
                      onError={(error) => console.error('Chat error:', error)}
                    />
                  </TabsContent>
                  
                  <TabsContent value="terminal" className="flex-1 mt-0 p-4 overflow-hidden">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-500">加载终端组件...</span>
                      </div>
                    }>
                      {workspaceReady ? (
                        <WebTerminal 
                          projectId={projectId} 
                          className="h-full"
                          onStatusChange={(status) => console.log('[Terminal] Status:', status)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <Loader2 className="h-8 w-8 animate-spin mb-3" />
                          <p className="text-sm">正在准备工作空间...</p>
                          <p className="text-xs text-slate-400 mt-1">请稍候，终端即将就绪</p>
                        </div>
                      )}
                    </Suspense>
                  </TabsContent>
                </Tabs>
              ) : (
                <AssistantChat projectId={projectId} clientName={project?.client_name || ''} />
              )}
            </Panel>
            
            {/* 拖拽手柄 */}
            <PanelResizeHandle className="w-1.5 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 hover:from-indigo-400 hover:to-purple-400 transition-all duration-300 cursor-col-resize group">
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-0.5 h-8 bg-slate-400/50 dark:bg-slate-500/50 group-hover:bg-white/80 rounded-full transition-colors" />
              </div>
            </PanelResizeHandle>
            
            {/* 右侧 GUI 区域 - 文档树 + 文档编辑器 */}
            <Panel className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
              <DocumentWorkspace projectId={projectId} packageTypes={PACKAGE_TYPES} />
            </Panel>
          </PanelGroup>
        )}
      </main>
    </div>
  )
}

export default function AssistantPage() {
  return (
    <AuthGuard requireAuth={true} allowedRoles={['admin', 'super_admin']} unauthorizedMessage="AI文案助手仅对管理员开放">
      <AssistantProvider>
        <AssistantPageContent />
      </AssistantProvider>
    </AuthGuard>
  )
}
