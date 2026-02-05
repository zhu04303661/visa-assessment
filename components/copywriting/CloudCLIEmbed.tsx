"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@douyinfe/semi-ui"
import { 
  Loader2, 
  RefreshCw, 
  Power, 
  PowerOff, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink,
  Settings,
  MessageSquare,
  Bot,
  ClipboardList
} from "lucide-react"

// Cloud CLI 状态类型
type CloudCLIStatusType = 'stopped' | 'starting' | 'running' | 'error' | 'not_installed'

// 执行模式
type ExecutionMode = 'ask' | 'agent' | 'plan'

interface CloudCLIStatus {
  status: CloudCLIStatusType
  running: boolean
  url: string | null
  port: number
  host: string
  auto_start: boolean
  error: string | null
  pid: number | null
  cli_path: string | null
  use_npx: boolean
}

interface CloudCLIEmbedProps {
  projectId: string
  clientName: string
  onModeChange?: (mode: ExecutionMode) => void
}

// 模式配置
const EXECUTION_MODES = [
  {
    id: 'ask' as ExecutionMode,
    name: 'Ask',
    description: '快速问答，直接获取回答',
    icon: MessageSquare,
  },
  {
    id: 'agent' as ExecutionMode,
    name: 'Agent',
    description: '智能代理，执行复杂任务',
    icon: Bot,
  },
  {
    id: 'plan' as ExecutionMode,
    name: 'Plan',
    description: '规划模式，生成详细计划',
    icon: ClipboardList,
  }
]

export function CloudCLIEmbed({ projectId, clientName, onModeChange }: CloudCLIEmbedProps) {
  const [status, setStatus] = useState<CloudCLIStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('agent')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cloud CLI API 调用辅助函数
  // 后端 API 路径是 /api/cloudcli/...，通过 Next.js 代理访问
  const cloudcliApiCall = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/copywriting/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
    return response.json()
  }, [])

  // 获取 Cloud CLI 状态
  const fetchStatus = useCallback(async () => {
    try {
      const data = await cloudcliApiCall('/cloudcli/status')
      if (data.success) {
        setStatus(data.data)
        setError(null)
      } else {
        setError(data.error || '获取状态失败')
      }
    } catch (err) {
      setError('无法连接到后端服务')
      console.error('获取 Cloud CLI 状态失败:', err)
    } finally {
      setLoading(false)
    }
  }, [cloudcliApiCall])

  // 启动 Cloud CLI
  const startCloudCLI = useCallback(async (force = false) => {
    setStarting(true)
    setError(null)
    
    try {
      const data = await cloudcliApiCall('/cloudcli/start', {
        method: 'POST',
        body: JSON.stringify({ force })
      })
      
      if (data.success) {
        // 启动成功，开始轮询状态
        await fetchStatus()
      } else {
        setError(data.error || '启动失败')
      }
    } catch (err) {
      setError('启动 Cloud CLI 失败')
      console.error('启动 Cloud CLI 失败:', err)
    } finally {
      setStarting(false)
    }
  }, [cloudcliApiCall, fetchStatus])

  // 停止 Cloud CLI
  const stopCloudCLI = useCallback(async () => {
    try {
      const data = await cloudcliApiCall('/cloudcli/stop', {
        method: 'POST'
      })
      
      if (data.success) {
        await fetchStatus()
      } else {
        setError(data.error || '停止失败')
      }
    } catch (err) {
      setError('停止 Cloud CLI 失败')
      console.error('停止 Cloud CLI 失败:', err)
    }
  }, [cloudcliApiCall, fetchStatus])

  // 确保服务运行
  const ensureRunning = useCallback(async () => {
    try {
      const data = await cloudcliApiCall('/cloudcli/ensure', {
        method: 'POST'
      })
      
      if (data.success) {
        setStatus(prev => ({ ...prev, ...data.data } as CloudCLIStatus))
      }
    } catch (err) {
      console.error('确保 Cloud CLI 运行失败:', err)
    }
  }, [cloudcliApiCall])

  // 初始化和状态轮询
  useEffect(() => {
    fetchStatus()
    
    // 设置轮询（每 5 秒检查一次状态）
    pollIntervalRef.current = setInterval(fetchStatus, 5000)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchStatus])

  // 自动启动（如果配置了）
  useEffect(() => {
    if (status && !status.running && status.auto_start && status.status !== 'not_installed') {
      ensureRunning()
    }
  }, [status, ensureRunning])

  // 模式切换处理
  const handleModeChange = useCallback((mode: ExecutionMode) => {
    setExecutionMode(mode)
    onModeChange?.(mode)
    
    // 通过 postMessage 通知 iframe 切换模式（如果 Cloud CLI 支持）
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'MODE_CHANGE',
        mode: mode
      }, '*')
    }
  }, [onModeChange])

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    if (!status) return null
    
    const statusConfig: Record<CloudCLIStatusType, { color: string; icon: React.ReactNode; text: string }> = {
      running: { color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3" />, text: '运行中' },
      starting: { color: 'bg-yellow-500', icon: <Loader2 className="h-3 w-3 animate-spin" />, text: '启动中' },
      stopped: { color: 'bg-gray-400', icon: <PowerOff className="h-3 w-3" />, text: '已停止' },
      error: { color: 'bg-red-500', icon: <AlertCircle className="h-3 w-3" />, text: '错误' },
      not_installed: { color: 'bg-orange-500', icon: <AlertCircle className="h-3 w-3" />, text: '未安装' }
    }
    
    const config = statusConfig[status.status]
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-xs text-slate-500 flex items-center gap-1">
          {config.icon}
          {config.text}
        </span>
      </div>
    )
  }

  // 渲染模式选择器
  const renderModeSelector = () => (
    <div className="flex items-center gap-1">
      {EXECUTION_MODES.map((mode) => {
        const Icon = mode.icon
        const isActive = executionMode === mode.id
        
        return (
          <Tooltip key={mode.id} content={mode.description}>
            <button
              onClick={() => handleModeChange(mode.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              {mode.name}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )

  // 渲染加载状态
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm text-slate-500">正在连接 Cloud CLI 服务...</p>
      </div>
    )
  }

  // 渲染未安装状态
  if (status?.status === 'not_installed') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 p-8">
        <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Cloud CLI 未安装</h3>
        <p className="text-sm text-slate-500 text-center mb-6 max-w-md">
          请先安装 Cloud CLI (lanyuncodingui) 才能使用完整的 AI 助手功能。
        </p>
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <code className="text-sm text-green-400">npm install -g lanyuncodingui</code>
        </div>
        <Button variant="outline" onClick={fetchStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重新检测
        </Button>
      </div>
    )
  }

  // 渲染已停止状态
  if (!status?.running && status?.status !== 'starting') {
    return (
      <div className="h-full flex flex-col">
        {/* 顶部工具栏 */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-800">AI 文案助手</h2>
            {renderStatusIndicator()}
          </div>
          {renderModeSelector()}
        </div>
        
        {/* 启动提示 */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8">
          <Power className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Cloud CLI 服务未运行</h3>
          <p className="text-sm text-slate-500 text-center mb-6">
            点击下方按钮启动 AI 助手服务
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          
          <Button 
            onClick={() => startCloudCLI()} 
            disabled={starting}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-2" />
                启动 Cloud CLI
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // 渲染运行中状态（iframe 嵌入）
  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="shrink-0 px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-slate-800">AI 文案助手</h2>
          {renderStatusIndicator()}
          {status?.pid && (
            <Badge variant="outline" className="text-xs">
              PID: {status.pid}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {renderModeSelector()}
          
          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <Tooltip content="在新窗口打开">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => window.open(status?.url || '', '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Tooltip>
            
            <Tooltip content="刷新">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => iframeRef.current?.contentWindow?.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </Tooltip>
            
            <Tooltip content="停止服务">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={stopCloudCLI}
              >
                <PowerOff className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* iframe 容器 */}
      <div className="flex-1 min-h-0">
        {status?.url ? (
          <iframe
            ref={iframeRef}
            src={status.url}
            className="w-full h-full border-0"
            title="Cloud CLI"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        )}
      </div>
    </div>
  )
}
