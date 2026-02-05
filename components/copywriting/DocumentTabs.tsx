"use client"

import { useState, useEffect, useCallback } from "react"
import { useAssistant } from "./AssistantContext"
import { DocumentEditor } from "./DocumentEditor"
import { VersionManager, DiffViewer } from "@/components/copywriting"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  User,
  FileText,
  Mail,
  Award,
  BookOpen,
  FileCheck,
  Building,
  Briefcase,
  History,
  GitCompare,
  MoreVertical,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw
} from "lucide-react"

interface PackageType {
  type: string
  name: string
  name_en: string
}

interface PackageStatus {
  package_type: string
  current_version: number
  content: string
  status: string
  word_count: number
  updated_at: string
}

interface DocumentTabsProps {
  projectId: string
  packageTypes: PackageType[]
}

// 图标映射
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  personal_statement: User,
  cv_resume: FileText,
  recommendation_letters: Mail,
  evidence_portfolio: Award,
  cover_letter: BookOpen,
  endorsement_letter: FileCheck,
  business_plan: Building,
  supplementary: Briefcase,
}

export function DocumentTabs({ projectId, packageTypes }: DocumentTabsProps) {
  const { 
    activeDocument, 
    setActiveDocument,
    documentContents,
    updateDocumentContent
  } = useAssistant()

  const [packageStatuses, setPackageStatuses] = useState<Record<string, PackageStatus>>({})
  const [loading, setLoading] = useState(true)
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null) // 当前正在加载的文档
  const [loadedDocs, setLoadedDocs] = useState<Set<string>>(new Set()) // 已加载内容的文档
  const [versionManagerOpen, setVersionManagerOpen] = useState(false)
  const [diffViewerOpen, setDiffViewerOpen] = useState(false)

  // API调用
  const apiCall = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/copywriting${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
      ...options
    })
    return response.json()
  }

  // 加载单个材料包的完整内容
  const loadPackageContent = useCallback(async (packageType: string, force: boolean = false) => {
    // 如果已经加载过且不是强制刷新，跳过
    if (!force) {
      // 使用函数形式检查，避免依赖 loadedDocs
      let shouldSkip = false
      setLoadedDocs(prev => {
        shouldSkip = prev.has(packageType)
        return prev
      })
      if (shouldSkip) {
        return
      }
    }
    
    try {
      setLoadingDoc(packageType)
      const data = await apiCall(`/api/projects/${projectId}/packages/${packageType}`)
      
      if (data.success && data.data) {
        setPackageStatuses(prev => ({
          ...prev,
          [packageType]: {
            ...data.data,
            word_count: data.data.content ? data.data.content.split(/\s+/).filter(Boolean).length : 0
          }
        }))
        // 同步到上下文
        if (data.data.content) {
          updateDocumentContent(packageType, data.data.content)
        }
        // 标记为已加载
        setLoadedDocs(prev => new Set(prev).add(packageType))
      }
    } catch (err) {
      console.error(`加载 ${packageType} 失败:`, err)
    } finally {
      setLoadingDoc(null)
    }
  }, [projectId, updateDocumentContent])

  // 加载所有材料包的基本状态（不加载内容，只获取是否有内容）
  const loadPackageStatuses = useCallback(async () => {
    try {
      setLoading(true)
      const statuses: Record<string, PackageStatus> = {}
      
      // 获取材料包列表状态（不包含完整内容）
      const data = await apiCall(`/api/projects/${projectId}/packages`)
      
      if (data.success && Array.isArray(data.data)) {
        // 如果有批量获取状态的API
        data.data.forEach((pkg: { package_type: string; current_version?: number; status?: string; has_content?: boolean; updated_at?: string }) => {
          statuses[pkg.package_type] = {
            package_type: pkg.package_type,
            current_version: pkg.current_version || 0,
            content: '', // 初始不加载内容
            status: pkg.status || 'draft',
            word_count: 0,
            updated_at: pkg.updated_at || ''
          }
        })
      } else {
        // 如果没有批量API，初始化空状态（标签页仍显示，内容按需加载）
        packageTypes.forEach((pkg) => {
          statuses[pkg.type] = {
            package_type: pkg.type,
            current_version: 0,
            content: '',
            status: 'pending',
            word_count: 0,
            updated_at: ''
          }
        })
      }
      
      setPackageStatuses(statuses)
      
      // 默认选择第一个标签页
      if (!activeDocument) {
        setActiveDocument(packageTypes[0]?.type || null)
      }
    } catch (err) {
      console.error("加载材料包状态失败:", err)
      // 即使失败，也初始化空状态以显示标签页
      const statuses: Record<string, PackageStatus> = {}
      packageTypes.forEach((pkg) => {
        statuses[pkg.type] = {
          package_type: pkg.type,
          current_version: 0,
          content: '',
          status: 'pending',
          word_count: 0,
          updated_at: ''
        }
      })
      setPackageStatuses(statuses)
      if (!activeDocument) {
        setActiveDocument(packageTypes[0]?.type || null)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, packageTypes, activeDocument, setActiveDocument])

  // 初始加载状态列表
  useEffect(() => {
    loadPackageStatuses()
  }, [loadPackageStatuses])

  // 当活动文档变化时，按需加载内容
  useEffect(() => {
    if (activeDocument && !loadedDocs.has(activeDocument)) {
      loadPackageContent(activeDocument)
    }
  }, [activeDocument, loadedDocs, loadPackageContent])

  // 获取状态徽章 - 精致设计
  const getStatusBadge = (status: PackageStatus | undefined) => {
    if (!status || !status.content) {
      return (
        <Badge variant="outline" className="text-xs px-2.5 py-0.5 rounded-full border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-normal">
          <Clock className="h-3 w-3 mr-1.5 text-slate-400" />
          未开始
        </Badge>
      )
    }
    if (status.status === 'completed' || status.status === 'final') {
      return (
        <Badge className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-sm shadow-green-500/25 font-normal">
          <CheckCircle className="h-3 w-3 mr-1.5" />
          已完成
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 font-normal">
        草稿
      </Badge>
    )
  }

  // 保存文档
  const handleSaveDocument = async (docType: string, content: string) => {
    try {
      const response = await apiCall(`/api/projects/${projectId}/packages/${docType}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      })
      
      if (response.success) {
        setPackageStatuses(prev => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            content,
            word_count: content.split(/\s+/).filter(Boolean).length,
            current_version: (prev[docType]?.current_version || 0) + 1
          }
        }))
        // 确保标记为已加载
        setLoadedDocs(prev => new Set(prev).add(docType))
        return true
      }
      return false
    } catch (err) {
      console.error("保存失败:", err)
      return false
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">正在加载文档...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      <Tabs 
        value={activeDocument || packageTypes[0]?.type} 
        onValueChange={setActiveDocument}
        className="h-full flex flex-col overflow-hidden"
      >
        {/* 标签页头部 - 精致设计 */}
        <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-800/50 px-2">
          <div className="flex items-center justify-between">
            <ScrollArea className="flex-1">
              <TabsList className="h-14 bg-transparent p-0 gap-0.5">
                {packageTypes.map((pkg) => {
                  const Icon = ICON_MAP[pkg.type] || FileText
                  const status = packageStatuses[pkg.type]
                  const isLoaded = loadedDocs.has(pkg.type)
                  const hasContent = isLoaded && !!status?.content
                  const isCurrentlyLoading = loadingDoc === pkg.type
                  const isActive = activeDocument === pkg.type
                  
                  return (
                    <TabsTrigger
                      key={pkg.type}
                      value={pkg.type}
                      className={`
                        relative h-12 px-4 gap-2.5 rounded-t-lg border-b-2 transition-all duration-200
                        ${isActive 
                          ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-300' 
                          : 'border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }
                        data-[state=active]:shadow-[0_2px_8px_-2px_rgba(99,102,241,0.2)]
                      `}
                    >
                      <div className={`
                        p-1.5 rounded-md transition-colors
                        ${isActive 
                          ? 'bg-indigo-100 dark:bg-indigo-900/50' 
                          : 'bg-slate-100 dark:bg-slate-700/50'
                        }
                      `}>
                        <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                      </div>
                      <span className="hidden sm:inline font-medium text-sm">{pkg.name}</span>
                      {isCurrentlyLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                      ) : hasContent ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-sm shadow-green-500/30" />
                      ) : null}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              <ScrollBar orientation="horizontal" className="h-1.5" />
            </ScrollArea>
            
            {/* 工具栏 - 精致设计 */}
            <div className="flex items-center gap-1.5 ml-3 pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeDocument) {
                    loadPackageContent(activeDocument, true)
                  }
                }}
                disabled={loadingDoc !== null}
                className="h-9 w-9 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 text-slate-500 dark:text-slate-400 ${loadingDoc ? 'animate-spin' : ''}`} />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 w-9 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200/80 dark:border-slate-700/50">
                  <DropdownMenuItem onClick={() => setVersionManagerOpen(true)} className="gap-3 py-2.5 cursor-pointer">
                    <History className="h-4 w-4 text-slate-500" />
                    <span>版本历史</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDiffViewerOpen(true)} className="gap-3 py-2.5 cursor-pointer">
                    <GitCompare className="h-4 w-4 text-slate-500" />
                    <span>版本对比</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* 标签页内容 - 可滚动区域 */}
        {packageTypes.map((pkg) => {
          const status = packageStatuses[pkg.type]
          const isLoading = loadingDoc === pkg.type
          const isLoaded = loadedDocs.has(pkg.type)
          
          return (
            <TabsContent
              key={pkg.type}
              value={pkg.type}
              className="flex-1 m-0 min-h-0 overflow-hidden"
            >
              <div className="h-full flex flex-col overflow-hidden">
                {/* 文档信息栏 - 精致设计 */}
                <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 dark:from-slate-800/30 dark:via-slate-900/50 dark:to-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{pkg.name}</h3>
                      <span className="text-sm text-slate-400 dark:text-slate-500">|</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{pkg.name_en}</span>
                    </div>
                    {isLoaded && getStatusBadge(status)}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    {isLoaded && status?.content && (
                      <>
                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-normal">
                          v{status.current_version || 1}
                        </Badge>
                        <span className="text-slate-400 dark:text-slate-500">{status.word_count} 词</span>
                        {status.updated_at && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-slate-400 dark:text-slate-500">
                              更新于 {new Date(status.updated_at).toLocaleString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* 文档编辑器 - 可滚动 */}
                <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                          </div>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">正在加载 {pkg.name}...</span>
                      </div>
                    </div>
                  ) : (
                    <DocumentEditor
                      docType={pkg.type}
                      docName={pkg.name}
                      content={documentContents[pkg.type] || status?.content || ""}
                      onSave={(content) => handleSaveDocument(pkg.type, content)}
                      onChange={(content) => updateDocumentContent(pkg.type, content)}
                    />
                  )}
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
      
      {/* 版本管理对话框 */}
      {activeDocument && (
        <VersionManager
          projectId={projectId}
          packageType={activeDocument}
          currentVersion={packageStatuses[activeDocument]?.current_version}
          open={versionManagerOpen}
          onOpenChange={setVersionManagerOpen}
          onRollback={loadPackageStatuses}
          onCompare={() => {
            setVersionManagerOpen(false)
            setDiffViewerOpen(true)
          }}
        />
      )}
      
      {/* 版本对比对话框 */}
      {activeDocument && (
        <DiffViewer
          projectId={projectId}
          packageType={activeDocument}
          open={diffViewerOpen}
          onOpenChange={setDiffViewerOpen}
        />
      )}
    </div>
  )
}
