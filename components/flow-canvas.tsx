"use client"

import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  Panel,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Trash2, 
  Download, 
  Save,
  FileText,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  XCircle,
  Target,
  Star
} from 'lucide-react'

// 数据结构接口
interface MindmapNode {
  id: string
  label: string
  children?: MindmapNode[]
  status?: 'success' | 'warning' | 'error' | 'info' | 'pending'
  type?: 'root' | 'category' | 'criteria' | 'evidence' | 'file' | 'info'
  details?: string
  fileCount?: number
  requirements?: string
  tips?: string
  evidenceFiles?: string[]
}

interface FlowCanvasProps {
  data?: MindmapNode
  className?: string
  onSave?: (nodes: Node[], edges: Edge[]) => void
}

// 自定义节点样式配置
const nodeStyles = {
  root: {
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    color: '#fff',
    border: '3px solid #4338CA',
    borderRadius: '16px',
    padding: '16px 24px',
    fontSize: '18px',
    fontWeight: 'bold',
    boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
  },
  category: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: '#fff',
    border: '2px solid #1D4ED8',
    borderRadius: '12px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: '600',
    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.25)',
  },
  criteria: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    color: '#fff',
    border: '2px solid #6D28D9',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)',
  },
  evidence: {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#fff',
    border: '2px solid #B45309',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
  },
  file: {
    background: '#F3F4F6',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '400',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  info: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    color: '#fff',
    border: '2px solid #1E40AF',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
  },
  default: {
    background: '#fff',
    color: '#1F2937',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
}

// 状态颜色覆盖
const statusColors = {
  success: { border: '2px solid #10B981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)' },
  warning: { border: '2px solid #F59E0B', boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.2)' },
  pending: { border: '2px solid #9CA3AF', boxShadow: '0 0 0 3px rgba(156, 163, 175, 0.2)' },
  error: { border: '2px solid #EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)' },
  info: { border: '2px solid #3B82F6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)' },
}

// 状态图标
function StatusIcon({ status }: { status?: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-400" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-400" />
    case 'error':
      return <XCircle className="h-4 w-4 text-red-400" />
    default:
      return null
  }
}

// 类型图标
function TypeIcon({ type }: { type?: string }) {
  switch (type) {
    case 'root':
      return <Target className="h-5 w-5" />
    case 'category':
      return <FolderOpen className="h-4 w-4" />
    case 'criteria':
      return <Star className="h-4 w-4" />
    case 'file':
      return <FileText className="h-3 w-3" />
    default:
      return null
  }
}

// 自定义节点组件
function CustomNode({ data, selected }: { data: any; selected?: boolean }) {
  const nodeType = data.nodeType || 'default'
  const baseStyle = nodeStyles[nodeType as keyof typeof nodeStyles] || nodeStyles.default
  const statusStyle = data.status ? statusColors[data.status as keyof typeof statusColors] : {}
  
  const style = {
    ...baseStyle,
    ...statusStyle,
    ...(selected ? { 
      outline: '3px solid #6366F1',
      outlineOffset: '2px',
    } : {}),
  }

  return (
    <div style={style} className="transition-all duration-200 hover:scale-105 cursor-pointer min-w-[120px]">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3! h-3! bg-gray-400! border-2! border-white!"
      />
      
      <div className="flex items-center gap-2">
        <TypeIcon type={nodeType} />
        <StatusIcon status={data.status} />
        <span className="truncate max-w-[200px]">{data.label}</span>
      </div>
      
      {data.details && (
        <div className="text-xs opacity-80 mt-1 truncate max-w-[200px]">
          {data.details}
        </div>
      )}
      
      {data.fileCount !== undefined && data.fileCount > 0 && (
        <div className="text-xs mt-1 opacity-80 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {data.fileCount} 个文件
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Right}
        className="w-3! h-3! bg-gray-400! border-2! border-white!"
      />
    </div>
  )
}

// 节点类型注册
const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

// 布局配置
const LAYOUT_CONFIG = {
  xSpacing: 320,      // 水平间距
  ySpacing: 80,       // 基础垂直间距
  nodeHeight: 60,     // 节点高度估算
  maxDepth: 4,        // 最大深度
  maxChildren: [10, 8, 6, 4],  // 每层最大子节点数
}

// 计算子树高度（叶子节点数量）
function calculateSubtreeHeight(node: MindmapNode, depth: number = 0): number {
  if (depth >= LAYOUT_CONFIG.maxDepth) return 1
  
  const maxChildren = LAYOUT_CONFIG.maxChildren[depth] || 4
  const children = node.children?.slice(0, maxChildren) || []
  
  if (children.length === 0) return 1
  
  return children.reduce((sum, child) => sum + calculateSubtreeHeight(child, depth + 1), 0)
}

// 将树形数据转换为 React Flow 节点和边
function convertToFlowData(data: MindmapNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  
  // 递归处理节点
  function processNode(
    node: MindmapNode,
    parentId: string | null,
    depth: number,
    startY: number,
    availableHeight: number
  ): { centerY: number } {
    const x = depth * LAYOUT_CONFIG.xSpacing
    
    // 计算当前节点的 Y 位置（在可用高度的中心）
    const centerY = startY + availableHeight / 2
    
    // 创建节点
    const flowNode: Node = {
      id: node.id,
      type: 'custom',
      position: { x, y: centerY - LAYOUT_CONFIG.nodeHeight / 2 },
      data: {
        label: node.label,
        nodeType: node.type || 'default',
        status: node.status,
        details: node.details,
        fileCount: node.fileCount,
      },
    }
    nodes.push(flowNode)
    
    // 创建连接边
    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#94A3B8', 
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94A3B8',
          width: 16,
          height: 16,
        },
      })
    }
    
    // 处理子节点
    if (depth < LAYOUT_CONFIG.maxDepth && node.children && node.children.length > 0) {
      const maxChildren = LAYOUT_CONFIG.maxChildren[depth] || 4
      const childrenToProcess = node.children.slice(0, maxChildren)
      
      // 计算所有子树的总高度
      const subtreeHeights = childrenToProcess.map(child => calculateSubtreeHeight(child, depth + 1))
      const totalHeight = subtreeHeights.reduce((sum, h) => sum + h, 0)
      
      // 根据子树高度比例分配垂直空间
      let currentY = startY
      childrenToProcess.forEach((child, index) => {
        const childHeight = (subtreeHeights[index] / totalHeight) * availableHeight
        processNode(child, node.id, depth + 1, currentY, childHeight)
        currentY += childHeight
      })
      
      // 添加"更多"节点
      if (node.children.length > maxChildren) {
        const moreId = `${node.id}-more`
        const moreY = currentY
        
        nodes.push({
          id: moreId,
          type: 'custom',
          position: { 
            x: (depth + 1) * LAYOUT_CONFIG.xSpacing, 
            y: moreY 
          },
          data: {
            label: `+${node.children.length - maxChildren} 更多`,
            nodeType: 'file',
          },
        })
        
        edges.push({
          id: `edge-${node.id}-${moreId}`,
          source: node.id,
          target: moreId,
          type: 'smoothstep',
          style: { stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '5 5' },
        })
      }
    }
    
    return { centerY }
  }
  
  // 计算整棵树需要的总高度
  const totalLeaves = calculateSubtreeHeight(data, 0)
  const totalHeight = Math.max(totalLeaves * LAYOUT_CONFIG.ySpacing, 600)
  
  // 从根节点开始处理
  processNode(data, null, 0, 0, totalHeight)
  
  return { nodes, edges }
}

// 创建新节点
function createNewNode(type: string, position: { x: number; y: number }): Node {
  const id = `node-${Date.now()}`
  return {
    id,
    type: 'custom',
    position,
    data: {
      label: type === 'root' ? 'GTV申请框架' : 
             type === 'category' ? '新分类' : 
             type === 'criteria' ? '新标准' : '新节点',
      nodeType: type,
    },
  }
}

// 内部组件，可以使用 useReactFlow
function FlowCanvasInner({ data, className, onSave }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const { fitView } = useReactFlow()

  // 当数据变化时更新节点和边
  useEffect(() => {
    if (data) {
      const { nodes: newNodes, edges: newEdges } = convertToFlowData(data)
      console.log('FlowCanvas: 加载数据', { 
        nodeCount: newNodes.length, 
        edgeCount: newEdges.length,
      })
      setNodes(newNodes)
      setEdges(newEdges)
      
      // 延迟执行 fitView 确保节点已渲染
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 })
      }, 100)
    }
  }, [data, setNodes, setEdges, fitView])

  // 连接处理
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({
          ...params,
          type: 'smoothstep',
          style: { stroke: '#94A3B8', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94A3B8',
          },
        }, eds)
      )
    },
    [setEdges]
  )

  // 选择变化处理
  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    setSelectedNodes(selectedNodes.map((n) => n.id))
  }, [])

  // 添加节点
  const addNode = useCallback((type: string) => {
    const newNode = createNewNode(type, {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    })
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  // 删除选中的节点
  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)))
    setEdges((eds) => eds.filter((e) => 
      !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target)
    ))
    setSelectedNodes([])
  }, [selectedNodes, setNodes, setEdges])

  // 保存画布
  const handleSave = useCallback(() => {
    onSave?.(nodes, edges)
  }, [nodes, edges, onSave])

  // 导出为 JSON
  const exportToJson = useCallback(() => {
    const data = { nodes, edges }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gtv-framework.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  // MiniMap 节点颜色
  const nodeColor = useCallback((node: Node) => {
    const type = node.data?.nodeType as string
    switch (type) {
      case 'root': return '#4F46E5'
      case 'category': return '#3B82F6'
      case 'criteria': return '#8B5CF6'
      case 'evidence': return '#F59E0B'
      case 'file': return '#6B7280'
      default: return '#9CA3AF'
    }
  }, [])

  return (
    <div className={cn("w-full h-full", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#94A3B8', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: '#6366F1', strokeWidth: 2 }}
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
      >
        {/* 工具面板 */}
        <Panel position="top-left" className="flex gap-2 bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode('category')}
            title="添加分类节点"
          >
            <Plus className="h-4 w-4 mr-1" />
            分类
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode('criteria')}
            title="添加标准节点"
          >
            <Plus className="h-4 w-4 mr-1" />
            标准
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode('evidence')}
            title="添加证据节点"
          >
            <Plus className="h-4 w-4 mr-1" />
            证据
          </Button>
          <div className="w-px bg-gray-200 mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelected}
            disabled={selectedNodes.length === 0}
            title="删除选中节点"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="w-px bg-gray-200 mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJson}
            title="导出 JSON"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onSave && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              title="保存"
            >
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          )}
        </Panel>

        {/* 提示信息 */}
        <Panel position="bottom-left" className="text-xs text-gray-500 bg-white/80 backdrop-blur px-3 py-2 rounded-lg shadow">
          <div className="flex gap-4">
            <span>🖱️ 拖拽移动节点</span>
            <span>🔗 从节点边缘拖拽创建连接</span>
            <span>⌫ Delete 删除选中</span>
            <span>⇧ Shift 多选</span>
          </div>
        </Panel>

        {/* 控制器 */}
        <Controls 
          className="bg-white/90! backdrop-blur! shadow-lg! border! rounded-lg!"
          showZoom
          showFitView
          showInteractive
        />

        {/* 小地图 */}
        <MiniMap 
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white/90! backdrop-blur! shadow-lg! border! rounded-lg!"
        />

        {/* 背景网格 */}
        <Background 
          gap={20} 
          size={1} 
          color="#E5E7EB"
        />
      </ReactFlow>
    </div>
  )
}

// 外部组件，提供 ReactFlowProvider
export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

export default FlowCanvas
