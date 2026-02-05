"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  History, Clock, Bot, User, Upload, RotateCcw, GitCompare,
  Loader2, ChevronRight, FileText, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"

const API_BASE = "/api/copywriting"

interface Version {
  id: number
  version: number
  content: string
  edit_type: string  // 'ai' | 'manual' | 'upload'
  edit_summary?: string
  editor: string
  word_count: number
  created_at: string
  source_type?: string  // 'ai_generated' | 'manual' | 'uploaded'
  source_file?: string
}

interface VersionManagerProps {
  projectId: string
  packageType: string
  currentVersion?: number
  /** 版本选择回调 */
  onVersionSelect?: (version: Version) => void
  /** 回滚成功回调 */
  onRollback?: (version: Version) => void
  /** 打开版本对比 */
  onCompare?: (v1: number, v2: number) => void
  /** 是否以面板形式展示（而非对话框） */
  asPanel?: boolean
  /** 对话框模式时使用 */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VersionManager({
  projectId,
  packageType,
  currentVersion,
  onVersionSelect,
  onRollback,
  onCompare,
  asPanel = false,
  open,
  onOpenChange
}: VersionManagerProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [rolling, setRolling] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareVersions, setCompareVersions] = useState<[number | null, number | null]>([null, null])

  // 获取版本列表
  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/packages/${packageType}/versions`
      )
      const data = await response.json()
      if (data.success) {
        setVersions(data.data || [])
      }
    } catch (error) {
      console.error("获取版本列表失败:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, packageType])

  // 回滚到指定版本
  const rollbackToVersion = async (version: Version) => {
    try {
      setRolling(true)
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/packages/${packageType}/rollback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: version.version })
        }
      )
      const data = await response.json()
      if (data.success) {
        toast.success(`已回滚到版本 v${version.version}`)
        onRollback?.(version)
        fetchVersions()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast.error(`回滚失败: ${error.message}`)
    } finally {
      setRolling(false)
    }
  }

  // 处理对比模式下的版本选择
  const handleVersionClick = (version: Version) => {
    if (compareMode) {
      if (compareVersions[0] === null) {
        setCompareVersions([version.version, null])
      } else if (compareVersions[1] === null) {
        setCompareVersions([compareVersions[0], version.version])
        // 触发对比
        if (compareVersions[0] !== null) {
          onCompare?.(compareVersions[0], version.version)
        }
        setCompareMode(false)
        setCompareVersions([null, null])
      }
    } else {
      setSelectedVersion(version)
      onVersionSelect?.(version)
    }
  }

  // 初始加载
  useEffect(() => {
    if (asPanel || open) {
      fetchVersions()
    }
  }, [asPanel, open, fetchVersions])

  // 获取来源图标
  const getSourceIcon = (version: Version) => {
    const sourceType = version.source_type || version.edit_type
    if (sourceType === 'ai_generated' || sourceType === 'ai') {
      return <Bot className="h-4 w-4 text-purple-600" />
    }
    if (sourceType === 'uploaded' || sourceType === 'upload') {
      return <Upload className="h-4 w-4 text-blue-600" />
    }
    return <User className="h-4 w-4 text-green-600" />
  }

  // 获取来源标签
  const getSourceLabel = (version: Version) => {
    const sourceType = version.source_type || version.edit_type
    if (sourceType === 'ai_generated' || sourceType === 'ai') return 'AI 生成'
    if (sourceType === 'uploaded' || sourceType === 'upload') return '上传'
    return '手动编辑'
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60 * 1000) return '刚刚'
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60 / 1000)} 分钟前`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 60 / 60 / 1000)} 小时前`
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 24 / 60 / 60 / 1000)} 天前`
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const content = (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            共 {versions.length} 个版本
          </Badge>
          {currentVersion && (
            <Badge variant="secondary" className="text-xs">
              当前 v{currentVersion}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={compareMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCompareMode(!compareMode)
                    setCompareVersions([null, null])
                  }}
                  disabled={versions.length < 2}
                >
                  <GitCompare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {compareMode ? '取消对比' : '版本对比'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchVersions}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <History className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 对比模式提示 */}
      {compareMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <p className="font-medium">版本对比模式</p>
          <p className="text-xs mt-1">
            {compareVersions[0] === null 
              ? '请选择第一个版本' 
              : compareVersions[1] === null 
                ? `已选择 v${compareVersions[0]}，请选择第二个版本` 
                : ''}
          </p>
        </div>
      )}

      {/* 版本列表 */}
      <ScrollArea className={asPanel ? "h-[300px]" : "h-[400px]"}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>暂无版本记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version, index) => {
              const isCurrent = version.version === currentVersion
              const isSelected = selectedVersion?.version === version.version
              const isCompareSelected = compareVersions.includes(version.version)
              
              return (
                <div
                  key={version.id}
                  onClick={() => handleVersionClick(version)}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all
                    ${isCurrent ? 'border-green-300 bg-green-50' : 'border-slate-200'}
                    ${isSelected && !compareMode ? 'ring-2 ring-purple-500' : ''}
                    ${isCompareSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                    hover:border-slate-300 hover:bg-slate-50
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {/* 版本号和图标 */}
                      <div className="flex flex-col items-center">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${isCurrent ? 'bg-green-100' : 'bg-slate-100'}
                        `}>
                          {getSourceIcon(version)}
                        </div>
                        {index < versions.length - 1 && (
                          <div className="w-0.5 h-4 bg-slate-200 mt-1" />
                        )}
                      </div>
                      
                      {/* 版本信息 */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{version.version}</span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">当前</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getSourceLabel(version)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(version.created_at)}
                          </span>
                          <span>{version.word_count} 词</span>
                        </div>
                        {version.edit_summary && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {version.edit_summary}
                          </p>
                        )}
                        {version.source_file && (
                          <p className="text-xs text-blue-600 truncate max-w-[200px]">
                            📎 {version.source_file}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    {!compareMode && (
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onVersionSelect?.(version)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看内容</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {!isCurrent && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    rollbackToVersion(version)
                                  }}
                                  disabled={rolling}
                                >
                                  {rolling ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>回滚到此版本</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // 面板模式
  if (asPanel) {
    return (
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-slate-600" />
          版本历史
        </h3>
        {content}
      </div>
    )
  }

  // 对话框模式
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-600" />
            版本历史
          </DialogTitle>
          <DialogDescription>
            查看和管理文档的历史版本，支持版本对比和回滚。
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
