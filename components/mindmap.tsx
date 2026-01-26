"use client"

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, FolderOpen, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MindmapNode {
  id: string
  label: string
  children?: MindmapNode[]
  status?: 'success' | 'warning' | 'error' | 'info'
  type?: 'root' | 'category' | 'criteria' | 'evidence' | 'file'
  details?: string
  fileCount?: number
}

interface MindmapProps {
  data: MindmapNode
  title?: string
  className?: string
}

// 获取状态图标
function getStatusIcon(status?: string) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return null
  }
}

// 获取节点颜色
function getNodeColor(type?: string, status?: string) {
  if (status === 'success') return 'border-green-500 bg-green-50 dark:bg-green-950/30'
  if (status === 'warning') return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
  if (status === 'error') return 'border-red-500 bg-red-50 dark:bg-red-950/30'
  
  switch (type) {
    case 'root':
      return 'border-primary bg-primary/10'
    case 'category':
      return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
    case 'criteria':
      return 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
    case 'evidence':
      return 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
    case 'file':
      return 'border-gray-300 bg-gray-50 dark:bg-gray-800/50'
    default:
      return 'border-gray-300 bg-white dark:bg-gray-900'
  }
}

// 单个节点组件
function MindmapNodeComponent({ 
  node, 
  depth = 0,
  isLast = false 
}: { 
  node: MindmapNode
  depth?: number
  isLast?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  
  return (
    <div className="relative">
      {/* 连接线 */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 h-6 border-l-2 border-gray-300 dark:border-gray-600"
          style={{ left: '-12px' }}
        />
      )}
      
      {/* 节点内容 */}
      <div 
        className={cn(
          "flex items-start gap-2 p-2 rounded-lg border-l-4 mb-2 cursor-pointer transition-all hover:shadow-md",
          getNodeColor(node.type, node.status)
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {/* 展开/折叠图标 */}
        {hasChildren ? (
          <button className="mt-0.5 text-gray-500 hover:text-gray-700">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center">
            {node.type === 'file' ? (
              <FileText className="h-3 w-3 text-gray-400" />
            ) : (
              <FolderOpen className="h-3 w-3 text-gray-400" />
            )}
          </span>
        )}
        
        {/* 状态图标 */}
        {getStatusIcon(node.status)}
        
        {/* 标签 */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "text-sm font-medium",
            depth === 0 && "text-lg font-bold"
          )}>
            {node.label}
          </div>
          {node.details && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {node.details}
            </div>
          )}
          {node.fileCount !== undefined && node.fileCount > 0 && (
            <div className="text-xs text-blue-600 mt-1">
              {node.fileCount} 个证据文件
            </div>
          )}
        </div>
      </div>
      
      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="ml-6 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
          {node.children!.map((child, index) => (
            <MindmapNodeComponent 
              key={child.id} 
              node={child} 
              depth={depth + 1}
              isLast={index === node.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 水平布局的思维导图
function HorizontalMindmap({ data }: { data: MindmapNode }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max p-4">
        {/* 根节点 */}
        <div className="flex items-start gap-8">
          {/* 中心节点 */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className={cn(
              "px-6 py-4 rounded-xl border-2 font-bold text-lg shadow-lg",
              getNodeColor('root')
            )}>
              {data.label}
            </div>
          </div>
          
          {/* 分支 */}
          {data.children && data.children.length > 0 && (
            <div className="flex flex-col gap-4">
              {data.children.map((branch, branchIndex) => (
                <div key={branch.id} className="flex items-start gap-4">
                  {/* 连接线 */}
                  <div className="flex items-center">
                    <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600" />
                  </div>
                  
                  {/* 一级分支 */}
                  <div className={cn(
                    "px-4 py-2 rounded-lg border-l-4 min-w-[200px]",
                    getNodeColor('category', branch.status)
                  )}>
                    <div className="font-semibold flex items-center gap-2">
                      {getStatusIcon(branch.status)}
                      {branch.label}
                    </div>
                    
                    {/* 二级分支 */}
                    {branch.children && branch.children.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {branch.children.map((child) => (
                          <div 
                            key={child.id}
                            className={cn(
                              "pl-3 py-1.5 rounded border-l-2 text-sm",
                              getNodeColor('criteria', child.status)
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(child.status)}
                              <span className="font-medium">{child.label}</span>
                            </div>
                            
                            {/* 三级：证据文件 */}
                            {child.children && child.children.length > 0 && (
                              <div className="mt-2 space-y-1 pl-2">
                                {child.children.slice(0, 3).map((file) => (
                                  <div 
                                    key={file.id}
                                    className="text-xs text-muted-foreground flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{file.label}</span>
                                  </div>
                                ))}
                                {child.children.length > 3 && (
                                  <div className="text-xs text-blue-500">
                                    +{child.children.length - 3} 更多文件
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 主组件
export function Mindmap({ data, title, className }: MindmapProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'horizontal'>('tree')
  
  return (
    <div className={cn("rounded-lg border bg-background", className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">{title || 'GTV递交框架'}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('tree')}
            className={cn(
              "px-3 py-1 text-sm rounded",
              viewMode === 'tree' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            树形视图
          </button>
          <button
            onClick={() => setViewMode('horizontal')}
            className={cn(
              "px-3 py-1 text-sm rounded",
              viewMode === 'horizontal' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            水平视图
          </button>
        </div>
      </div>
      
      {/* 内容 */}
      <div className="p-4 max-h-[600px] overflow-auto">
        {viewMode === 'tree' ? (
          <MindmapNodeComponent node={data} />
        ) : (
          <HorizontalMindmap data={data} />
        )}
      </div>
    </div>
  )
}

export default Mindmap
