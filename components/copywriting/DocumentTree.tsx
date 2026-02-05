"use client"

import { useState, useEffect, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderClosed,
  FolderOpen,
  Search,
  RefreshCw,
  Plus,
  File,
  Loader2
} from "lucide-react"

export interface DocumentFile {
  id: string
  name: string
  name_en: string
  type: 'file' | 'folder'
  packageType?: string
  hasContent?: boolean
  children?: DocumentFile[]
}

interface DocumentTreeProps {
  projectId: string
  onSelectFile: (file: DocumentFile) => void
  selectedFileId?: string | null
}

// 默认文档树结构 - 中文名称
const DEFAULT_TREE: DocumentFile[] = [
  {
    id: 'core',
    name: '核心文档',
    name_en: 'Core Documents',
    type: 'folder',
    children: [
      { id: 'personal_statement', name: '个人陈述', name_en: 'Personal Statement', type: 'file', packageType: 'personal_statement' },
      { id: 'cv_resume', name: '简历/CV', name_en: 'CV/Resume', type: 'file', packageType: 'cv_resume' },
      { id: 'cover_letter', name: '申请信', name_en: 'Cover Letter', type: 'file', packageType: 'cover_letter' },
    ]
  },
  {
    id: 'recommendations',
    name: '推荐信',
    name_en: 'Recommendations',
    type: 'folder',
    children: [
      { id: 'recommendation_letter_1', name: '推荐信 1', name_en: 'Recommendation Letter 1', type: 'file', packageType: 'recommendation_letter_1' },
      { id: 'recommendation_letter_2', name: '推荐信 2', name_en: 'Recommendation Letter 2', type: 'file', packageType: 'recommendation_letter_2' },
      { id: 'recommendation_letter_3', name: '推荐信 3', name_en: 'Recommendation Letter 3', type: 'file', packageType: 'recommendation_letter_3' },
      { id: 'endorsement_letter', name: '背书信', name_en: 'Endorsement Letter', type: 'file', packageType: 'endorsement_letter' },
    ]
  },
  {
    id: 'evidence',
    name: '证据材料',
    name_en: 'Evidence',
    type: 'folder',
    children: [
      { id: 'evidence_portfolio', name: '证据材料集', name_en: 'Evidence Portfolio', type: 'file', packageType: 'evidence_portfolio' },
    ]
  },
  {
    id: 'business',
    name: '商业计划',
    name_en: 'Business',
    type: 'folder',
    children: [
      { id: 'business_plan', name: '商业计划书', name_en: 'Business Plan', type: 'file', packageType: 'business_plan' },
    ]
  },
  {
    id: 'supplementary',
    name: '补充材料',
    name_en: 'Supplementary',
    type: 'folder',
    children: [
      { id: 'supplementary_docs', name: '其他补充材料', name_en: 'Supplementary Documents', type: 'file', packageType: 'supplementary' },
    ]
  }
]

export function DocumentTree({ projectId, onSelectFile, selectedFileId }: DocumentTreeProps) {
  const [tree] = useState<DocumentFile[]>(DEFAULT_TREE)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['core', 'recommendations']))
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [fileStatuses, setFileStatuses] = useState<Record<string, { hasContent: boolean }>>({})

  // API调用
  const apiCall = async (path: string) => {
    const response = await fetch(`/api/copywriting${path}`, {
      headers: { 'Content-Type': 'application/json' }
    })
    return response.json()
  }

  // 加载文件状态
  const loadFileStatuses = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall(`/api/projects/${projectId}/packages`)
      
      if (data.success && Array.isArray(data.data)) {
        const statuses: Record<string, { hasContent: boolean }> = {}
        data.data.forEach((pkg: { package_type: string; content?: string; has_content?: boolean }) => {
          statuses[pkg.package_type] = {
            hasContent: !!pkg.content || !!pkg.has_content
          }
        })
        setFileStatuses(statuses)
      }
    } catch (err) {
      console.error("加载文件状态失败:", err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadFileStatuses()
  }, [loadFileStatuses])

  // 切换文件夹展开状态
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // 过滤文件
  const filterTree = (nodes: DocumentFile[], query: string): DocumentFile[] => {
    if (!query.trim()) return nodes
    
    return nodes.map(node => {
      if (node.type === 'folder' && node.children) {
        const filteredChildren = filterTree(node.children, query)
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren }
        }
      }
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        return node
      }
      return null
    }).filter(Boolean) as DocumentFile[]
  }

  const displayTree = filterTree(tree, searchQuery)

  // 渲染文件节点 - 简洁IDE风格
  const renderFileNode = (file: DocumentFile, depth: number = 0) => {
    const isSelected = selectedFileId === file.id
    const status = file.packageType ? fileStatuses[file.packageType] : null
    
    return (
      <button
        key={file.id}
        onClick={() => onSelectFile(file)}
        className={`
          w-full flex items-center gap-2 py-1 px-2 text-left text-[13px] font-mono
          rounded transition-colors duration-100
          ${isSelected 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <FileText className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
        <span className="truncate">{file.name}</span>
        {status?.hasContent && (
          <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">+</span>
        )}
      </button>
    )
  }

  // 渲染文件夹节点 - 简洁IDE风格
  const renderFolderNode = (folder: DocumentFile, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    
    return (
      <div key={folder.id}>
        <button
          onClick={() => toggleFolder(folder.id)}
          className="w-full flex items-center gap-2 py-1 px-2 text-left text-[13px] font-mono rounded transition-colors duration-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
          ) : (
            <FolderClosed className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          <span className="truncate">{folder.name}</span>
        </button>
        
        {isExpanded && folder.children && (
          <div className="mt-0.5">
            {folder.children.map(child => 
              child.type === 'folder' 
                ? renderFolderNode(child, depth + 1)
                : renderFileNode(child, depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#fafafa] dark:bg-[#1a1a1a] border-r border-slate-200 dark:border-slate-800">
      {/* 工具栏 - 简洁风格 */}
      <div className="shrink-0 h-10 px-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 px-2">
          文档目录
        </span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {}}>
            <Plus className="h-4 w-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadFileStatuses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSearchQuery(searchQuery ? '' : ' ')}>
            <Search className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      </div>
      
      {/* 搜索框 - 可选显示 */}
      {searchQuery !== '' && (
        <div className="shrink-0 px-2 py-2 border-b border-slate-200 dark:border-slate-800">
          <Input
            placeholder="搜索文档..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            autoFocus
          />
        </div>
      )}
      
      {/* 文件树 */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : displayTree.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              未找到文件
            </div>
          ) : (
            displayTree.map(node => 
              node.type === 'folder' 
                ? renderFolderNode(node)
                : renderFileNode(node)
            )
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
