"use client"

import { useState, useCallback } from "react"
import { useAssistant } from "./AssistantContext"
import { DocumentTree, type DocumentFile } from "./DocumentTree"
import { DocumentEditor } from "./DocumentEditor"
import { VersionManager, DiffViewer } from "@/components/copywriting"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  History,
  GitCompare,
  MoreVertical,
  Loader2,
  FileText,
  X,
  ChevronRight,
  Copy,
  Download,
  Maximize2
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

interface DocumentWorkspaceProps {
  projectId: string
  packageTypes: PackageType[]
}

// 打开的标签页
interface OpenTab {
  id: string
  file: DocumentFile
}

export function DocumentWorkspace({ projectId, packageTypes }: DocumentWorkspaceProps) {
  const { 
    activeDocument, 
    setActiveDocument,
    documentContents,
    updateDocumentContent
  } = useAssistant()

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [packageStatuses, setPackageStatuses] = useState<Record<string, PackageStatus>>({})
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)
  const [loadedDocs, setLoadedDocs] = useState<Set<string>>(new Set())
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
    if (!force) {
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
        if (data.data.content) {
          updateDocumentContent(packageType, data.data.content)
        }
        setLoadedDocs(prev => new Set(prev).add(packageType))
      }
    } catch (err) {
      console.error(`加载 ${packageType} 失败:`, err)
    } finally {
      setLoadingDoc(null)
    }
  }, [projectId, updateDocumentContent])

  // 处理文件选择 - 打开新标签页或切换到已打开的标签页
  const handleSelectFile = useCallback((file: DocumentFile) => {
    if (file.type === 'folder') return
    
    // 检查是否已经打开
    const existingTab = openTabs.find(tab => tab.id === file.id)
    if (existingTab) {
      setActiveTabId(file.id)
    } else {
      // 打开新标签页
      setOpenTabs(prev => [...prev, { id: file.id, file }])
      setActiveTabId(file.id)
    }
    
    if (file.packageType) {
      setActiveDocument(file.packageType)
      if (!loadedDocs.has(file.packageType)) {
        loadPackageContent(file.packageType)
      }
    }
  }, [openTabs, setActiveDocument, loadedDocs, loadPackageContent])

  // 关闭标签页
  const handleCloseTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId)
      // 如果关闭的是当前激活的标签页，切换到最后一个
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id)
        const lastTab = newTabs[newTabs.length - 1]
        if (lastTab.file.packageType) {
          setActiveDocument(lastTab.file.packageType)
        }
      } else if (newTabs.length === 0) {
        setActiveTabId(null)
        setActiveDocument(null)
      }
      return newTabs
    })
  }, [activeTabId, setActiveDocument])

  // 获取当前激活的标签页
  const activeTab = openTabs.find(tab => tab.id === activeTabId)
  const currentFile = activeTab?.file

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
        setLoadedDocs(prev => new Set(prev).add(docType))
        return true
      }
      return false
    } catch (err) {
      console.error("保存失败:", err)
      return false
    }
  }

  const currentPackageType = currentFile?.packageType || activeDocument
  const currentStatus = currentPackageType ? packageStatuses[currentPackageType] : null
  const isLoading = loadingDoc === currentPackageType
  const isLoaded = currentPackageType ? loadedDocs.has(currentPackageType) : false

  // 生成面包屑路径
  const getBreadcrumb = (file: DocumentFile | undefined) => {
    if (!file) return []
    // 简单的路径生成
    const parts = ['文档']
    if (file.packageType) {
      const folderMap: Record<string, string> = {
        'personal_statement': '核心文档',
        'cv_resume': '核心文档',
        'cover_letter': '核心文档',
        'recommendation_letter_1': '推荐信',
        'recommendation_letter_2': '推荐信',
        'recommendation_letter_3': '推荐信',
        'endorsement_letter': '推荐信',
        'evidence_portfolio': '证据材料',
        'business_plan': '商业计划',
        'supplementary': '补充材料'
      }
      parts.push(folderMap[file.packageType] || '文档')
    }
    parts.push(file.name)
    return parts
  }

  const breadcrumb = getBreadcrumb(currentFile)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-[#1e1e1e]">
      <PanelGroup direction="horizontal" className="h-full">
        {/* 左侧文档树 */}
        <Panel
          defaultSize={22}
          minSize={15}
          maxSize={35}
          className="h-full overflow-hidden"
        >
          <DocumentTree
            projectId={projectId}
            onSelectFile={handleSelectFile}
            selectedFileId={activeTabId}
          />
        </Panel>
        
        <PanelResizeHandle className="w-px bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />
        
        {/* 右侧编辑器区域 */}
        <Panel className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#1e1e1e]">
          {/* 标签栏 */}
          <div className="shrink-0 h-9 flex items-center bg-[#f3f3f3] dark:bg-[#252526] border-b border-slate-200 dark:border-slate-700">
            {openTabs.length > 0 ? (
              <div className="flex items-center h-full overflow-x-auto">
                {openTabs.map(tab => (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveTabId(tab.id)
                      if (tab.file.packageType) {
                        setActiveDocument(tab.file.packageType)
                      }
                    }}
                    className={`
                      group h-full flex items-center gap-2 px-3 cursor-pointer border-r border-slate-200 dark:border-slate-700
                      ${tab.id === activeTabId 
                        ? 'bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-slate-100' 
                        : 'bg-[#ececec] dark:bg-[#2d2d2d] text-slate-600 dark:text-slate-400 hover:bg-[#e4e4e4] dark:hover:bg-[#333]'
                      }
                    `}
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="text-[13px] font-medium">{tab.file.name}</span>
                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="ml-1 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 text-[13px] text-slate-500">暂无打开的文档</div>
            )}
            
            {/* 右侧工具按钮 */}
            <div className="ml-auto flex items-center gap-1 px-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={!currentFile}>
                    <MoreVertical className="h-4 w-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setVersionManagerOpen(true)} className="gap-2 text-[13px]">
                    <History className="h-4 w-4" />
                    Version History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDiffViewerOpen(true)} className="gap-2 text-[13px]">
                    <GitCompare className="h-4 w-4" />
                    Compare Versions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* 面包屑导航 */}
          {currentFile && (
            <div className="shrink-0 h-6 flex items-center gap-1 px-3 bg-[#f8f8f8] dark:bg-[#252526] border-b border-slate-100 dark:border-slate-800 text-[12px] text-slate-500 dark:text-slate-400">
              {breadcrumb.map((part, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <ChevronRight className="h-3 w-3 mx-1 text-slate-400" />}
                  <span className={i === breadcrumb.length - 1 ? 'text-slate-700 dark:text-slate-200' : ''}>
                    {part}
                  </span>
                </span>
              ))}
            </div>
          )}
          
          {/* 编辑器内容 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {!currentFile ? (
              <div className="h-full flex items-center justify-center bg-[#fafafa] dark:bg-[#1e1e1e]">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">从左侧文档树中选择一个文件打开</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="h-full flex items-center justify-center bg-[#fafafa] dark:bg-[#1e1e1e]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="text-sm text-slate-500">正在加载 {currentFile.name}...</span>
                </div>
              </div>
            ) : currentPackageType ? (
              <DocumentEditor
                docType={currentPackageType}
                docName={currentFile.name}
                content={documentContents[currentPackageType] || currentStatus?.content || ""}
                onSave={(content) => handleSaveDocument(currentPackageType, content)}
                onChange={(content) => updateDocumentContent(currentPackageType, content)}
              />
            ) : null}
          </div>
        </Panel>
      </PanelGroup>
      
      {/* 版本管理对话框 */}
      {currentPackageType && (
        <VersionManager
          projectId={projectId}
          packageType={currentPackageType}
          currentVersion={currentStatus?.current_version}
          open={versionManagerOpen}
          onOpenChange={setVersionManagerOpen}
          onRollback={() => currentPackageType && loadPackageContent(currentPackageType, true)}
          onCompare={() => {
            setVersionManagerOpen(false)
            setDiffViewerOpen(true)
          }}
        />
      )}
      
      {/* 版本对比对话框 */}
      {currentPackageType && (
        <DiffViewer
          projectId={projectId}
          packageType={currentPackageType}
          open={diffViewerOpen}
          onOpenChange={setDiffViewerOpen}
        />
      )}
    </div>
  )
}
