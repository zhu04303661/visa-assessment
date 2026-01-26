"use client"

import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
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

interface MermaidMindmapProps {
  data: MindmapNode
  className?: string
  zoom?: number
}

// 状态图标映射
const statusEmoji: Record<string, string> = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️'
}

// 清理标签中的特殊字符，适配 graph 语法
function sanitizeLabel(label: string): string {
  return label
    .replace(/["\[\]{}()<>]/g, '')
    .replace(/:/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\|/g, ' ')
    .trim()
}

// 生成唯一的节点 ID
function generateNodeId(prefix: string, index: number): string {
  return `${prefix}_${index}`.replace(/[^a-zA-Z0-9_]/g, '_')
}

// 递归生成 Mermaid graph 语法
function generateGraphSyntax(node: MindmapNode, parentId: string | null = null, nodeIndex: { current: number } = { current: 0 }): { definitions: string[], connections: string[] } {
  const definitions: string[] = []
  const connections: string[] = []
  
  const currentId = generateNodeId('node', nodeIndex.current++)
  const emoji = node.status ? statusEmoji[node.status] || '' : ''
  const label = sanitizeLabel(node.label)
  const displayLabel = emoji ? `${emoji} ${label}` : label
  
  // 根据节点类型和状态选择不同的形状
  let nodeShape: string
  if (node.type === 'root') {
    // 根节点 - 圆角矩形加粗
    nodeShape = `${currentId}(["🎯 ${label}"])`
  } else if (node.type === 'category') {
    // 分类节点 - 六边形
    nodeShape = `${currentId}{{${displayLabel}}}`
  } else if (node.type === 'criteria') {
    // 标准节点 - 圆角矩形
    nodeShape = `${currentId}("${displayLabel}")`
  } else if (node.type === 'evidence') {
    // 证据节点 - 菱形
    nodeShape = `${currentId}{"${displayLabel}"}`
  } else if (node.type === 'file') {
    // 文件节点 - 旗帜形
    nodeShape = `${currentId}>"${displayLabel}"]`
  } else {
    // 默认 - 矩形
    nodeShape = `${currentId}["${displayLabel}"]`
  }
  
  definitions.push(nodeShape)
  
  // 添加连接
  if (parentId) {
    connections.push(`${parentId} --> ${currentId}`)
  }
  
  // 限制层级深度
  const maxDepth = 3
  const depth = parentId ? parentId.split('_').length : 0
  
  if (depth < maxDepth && node.children && node.children.length > 0) {
    // 限制每层最多显示的子节点数
    const maxChildren = depth === 2 ? 6 : 8
    const childrenToShow = node.children.slice(0, maxChildren)
    
    for (const child of childrenToShow) {
      const childResult = generateGraphSyntax(child, currentId, nodeIndex)
      definitions.push(...childResult.definitions)
      connections.push(...childResult.connections)
    }
    
    // 显示更多节点提示
    if (node.children.length > maxChildren) {
      const moreId = generateNodeId('more', nodeIndex.current++)
      const moreCount = node.children.length - maxChildren
      definitions.push(`${moreId}(("...+${moreCount}"))`)
      connections.push(`${currentId} -.-> ${moreId}`)
    }
  }
  
  return { definitions, connections }
}

// 生成样式定义
function generateStyles(): string {
  return `
    classDef root fill:#4F46E5,stroke:#4338CA,color:#fff,stroke-width:3px,font-weight:bold
    classDef category fill:#3B82F6,stroke:#2563EB,color:#fff,stroke-width:2px
    classDef success fill:#10B981,stroke:#059669,color:#fff
    classDef warning fill:#F59E0B,stroke:#D97706,color:#fff
    classDef error fill:#EF4444,stroke:#DC2626,color:#fff
    classDef criteria fill:#8B5CF6,stroke:#7C3AED,color:#fff
    classDef file fill:#6B7280,stroke:#4B5563,color:#fff,font-size:12px
    classDef more fill:#E5E7EB,stroke:#9CA3AF,color:#6B7280,stroke-dasharray:5 5
  `
}

// 根据节点状态分配样式类
function generateClassAssignments(node: MindmapNode, nodeIndex: { current: number } = { current: 0 }): string[] {
  const assignments: string[] = []
  const currentId = generateNodeId('node', nodeIndex.current++)
  
  if (node.type === 'root') {
    assignments.push(`class ${currentId} root`)
  } else if (node.status === 'success') {
    assignments.push(`class ${currentId} success`)
  } else if (node.status === 'warning') {
    assignments.push(`class ${currentId} warning`)
  } else if (node.status === 'error') {
    assignments.push(`class ${currentId} error`)
  } else if (node.type === 'category') {
    assignments.push(`class ${currentId} category`)
  } else if (node.type === 'criteria') {
    assignments.push(`class ${currentId} criteria`)
  } else if (node.type === 'file') {
    assignments.push(`class ${currentId} file`)
  }
  
  if (node.children) {
    const maxChildren = node.type === 'criteria' ? 6 : 8
    for (const child of node.children.slice(0, maxChildren)) {
      assignments.push(...generateClassAssignments(child, nodeIndex))
    }
    if (node.children.length > maxChildren) {
      const moreId = generateNodeId('more', nodeIndex.current++)
      assignments.push(`class ${moreId} more`)
    }
  }
  
  return assignments
}

// 初始化 mermaid
let mermaidInitialized = false

export function MermaidMindmap({ data, className, zoom = 100 }: MermaidMindmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis',
          padding: 20,
          nodeSpacing: 50,
          rankSpacing: 80,
        },
        themeVariables: {
          primaryColor: '#4F46E5',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#4338CA',
          lineColor: '#94A3B8',
          secondaryColor: '#10B981',
          tertiaryColor: '#F59E0B',
          background: '#ffffff',
          mainBkg: '#4F46E5',
          nodeBorder: '#4338CA',
          clusterBkg: '#F1F5F9',
          clusterBorder: '#CBD5E1',
          titleColor: '#1E293B',
          edgeLabelBackground: '#ffffff',
        },
        securityLevel: 'loose',
      })
      mermaidInitialized = true
    }
  }, [])

  useEffect(() => {
    const renderGraph = async () => {
      if (!data) {
        setError('暂无数据')
        return
      }

      try {
        setError('')
        
        // 生成 mermaid graph 语法
        const nodeIndex = { current: 0 }
        const { definitions, connections } = generateGraphSyntax(data, null, nodeIndex)
        
        // 生成样式类分配
        const classNodeIndex = { current: 0 }
        const classAssignments = generateClassAssignments(data, classNodeIndex)
        
        // 组合完整的 graph 定义
        const graphCode = `graph LR
${definitions.join('\n')}
${connections.join('\n')}
${generateStyles()}
${classAssignments.join('\n')}`
        
        console.log('Mermaid graph code:', graphCode)
        
        // 渲染 mermaid
        const uniqueId = `mermaid-graph-${Date.now()}`
        const { svg } = await mermaid.render(uniqueId, graphCode)
        setSvgContent(svg)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError('脑图渲染失败，请刷新重试')
      }
    }

    renderGraph()
  }, [data, key])

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 gap-4", className)}>
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => setKey(k => k + 1)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn("overflow-auto p-6", className)}
    >
      {svgContent ? (
        <div 
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          className="mermaid-graph-container min-w-max"
        />
      ) : (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>正在生成流程图...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MermaidMindmap
