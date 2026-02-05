"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { 
  GitCompare, ChevronLeft, ChevronRight, Loader2, FileText,
  Plus, Minus, Equal
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const API_BASE = "/api/copywriting"

interface DiffLine {
  type: 'equal' | 'insert' | 'delete' | 'replace'
  content: string
  oldLineNum?: number
  newLineNum?: number
}

interface VersionInfo {
  version: number
  created_at: string
  source_type: string
  word_count: number
}

interface DiffViewerProps {
  projectId: string
  packageType: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 初始对比的两个版本 */
  initialVersions?: [number, number]
}

export function DiffViewer({
  projectId,
  packageType,
  open,
  onOpenChange,
  initialVersions
}: DiffViewerProps) {
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [v1, setV1] = useState<number | null>(initialVersions?.[0] ?? null)
  const [v2, setV2] = useState<number | null>(initialVersions?.[1] ?? null)
  const [diffData, setDiffData] = useState<DiffLine[]>([])
  const [v1Info, setV1Info] = useState<VersionInfo | null>(null)
  const [v2Info, setV2Info] = useState<VersionInfo | null>(null)
  const [v1Content, setV1Content] = useState<string>('')
  const [v2Content, setV2Content] = useState<string>('')

  // 获取版本列表
  const fetchVersions = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/packages/${packageType}/versions`
      )
      const data = await response.json()
      if (data.success && data.data) {
        setVersions(data.data)
        // 如果没有初始版本，默认选择最新两个版本
        if (!v1 && !v2 && data.data.length >= 2) {
          setV1(data.data[1].version)
          setV2(data.data[0].version)
        } else if (!v1 && !v2 && data.data.length === 1) {
          setV2(data.data[0].version)
        }
      }
    } catch (error) {
      console.error("获取版本列表失败:", error)
    }
  }, [projectId, packageType, v1, v2])

  // 获取差异数据
  const fetchDiff = useCallback(async () => {
    if (!v1 || !v2) return

    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/packages/${packageType}/diff?v1=${v1}&v2=${v2}`
      )
      const data = await response.json()
      
      if (data.success) {
        setDiffData(data.diff || [])
        setV1Info(data.v1_info)
        setV2Info(data.v2_info)
        setV1Content(data.v1_content || '')
        setV2Content(data.v2_content || '')
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast.error(`获取差异失败: ${error.message}`)
      // 如果后端API还没实现，使用前端简单对比
      await fetchSimpleDiff()
    } finally {
      setLoading(false)
    }
  }, [projectId, packageType, v1, v2])

  // 简单的前端差异对比（备用方案）
  const fetchSimpleDiff = async () => {
    if (!v1 || !v2) return

    try {
      // 获取两个版本的内容
      const [res1, res2] = await Promise.all([
        fetch(`${API_BASE}/api/projects/${projectId}/packages/${packageType}/versions/${v1}`),
        fetch(`${API_BASE}/api/projects/${projectId}/packages/${packageType}/versions/${v2}`)
      ])
      
      const [data1, data2] = await Promise.all([res1.json(), res2.json()])
      
      if (data1.success && data2.success) {
        const content1 = data1.data?.content || ''
        const content2 = data2.data?.content || ''
        
        setV1Content(content1)
        setV2Content(content2)
        setV1Info(data1.data)
        setV2Info(data2.data)
        
        // 简单的行级对比
        const lines1 = content1.split('\n')
        const lines2 = content2.split('\n')
        const diff: DiffLine[] = []
        
        const maxLen = Math.max(lines1.length, lines2.length)
        for (let i = 0; i < maxLen; i++) {
          const line1 = lines1[i]
          const line2 = lines2[i]
          
          if (line1 === line2) {
            diff.push({ type: 'equal', content: line1 || '', oldLineNum: i + 1, newLineNum: i + 1 })
          } else if (line1 === undefined) {
            diff.push({ type: 'insert', content: line2, newLineNum: i + 1 })
          } else if (line2 === undefined) {
            diff.push({ type: 'delete', content: line1, oldLineNum: i + 1 })
          } else {
            diff.push({ type: 'delete', content: line1, oldLineNum: i + 1 })
            diff.push({ type: 'insert', content: line2, newLineNum: i + 1 })
          }
        }
        
        setDiffData(diff)
      }
    } catch (error) {
      console.error("获取版本内容失败:", error)
    }
  }

  // 初始化加载
  useEffect(() => {
    if (open) {
      fetchVersions()
    }
  }, [open, fetchVersions])

  // 版本变化时获取差异
  useEffect(() => {
    if (open && v1 && v2) {
      fetchDiff()
    }
  }, [open, v1, v2, fetchDiff])

  // 统计变化
  const stats = useMemo(() => {
    const insertions = diffData.filter(d => d.type === 'insert').length
    const deletions = diffData.filter(d => d.type === 'delete').length
    const unchanged = diffData.filter(d => d.type === 'equal').length
    return { insertions, deletions, unchanged }
  }, [diffData])

  // 获取来源标签
  const getSourceLabel = (sourceType: string) => {
    if (sourceType === 'ai_generated' || sourceType === 'ai') return 'AI 生成'
    if (sourceType === 'uploaded' || sourceType === 'upload') return '上传'
    return '手动编辑'
  }

  // 交换版本
  const swapVersions = () => {
    setV1(v2)
    setV2(v1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1000px] !w-[95vw] !h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-blue-600" />
            版本对比
          </DialogTitle>
          <DialogDescription>
            对比两个版本之间的差异，绿色表示新增，红色表示删除。
          </DialogDescription>
        </DialogHeader>

        {/* 版本选择器 */}
        <div className="px-6 py-3 border-b bg-slate-50 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">旧版本:</span>
            <Select 
              value={v1?.toString() || ''} 
              onValueChange={(val) => setV1(parseInt(val))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="选择版本" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.version} value={v.version.toString()}>
                    v{v.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={swapVersions}>
            <ChevronLeft className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">新版本:</span>
            <Select 
              value={v2?.toString() || ''} 
              onValueChange={(val) => setV2(parseInt(val))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="选择版本" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.version} value={v.version.toString()}>
                    v{v.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 统计信息 */}
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <Plus className="h-4 w-4" />
              {stats.insertions} 新增
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <Minus className="h-4 w-4" />
              {stats.deletions} 删除
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Equal className="h-4 w-4" />
              {stats.unchanged} 相同
            </span>
          </div>
        </div>

        {/* 版本信息 */}
        {(v1Info || v2Info) && (
          <div className="px-6 py-2 border-b flex items-center gap-8 text-xs text-muted-foreground">
            {v1Info && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">v{v1Info.version}</Badge>
                <span>{getSourceLabel(v1Info.source_type)}</span>
                <span>{v1Info.word_count} 词</span>
              </div>
            )}
            <span>→</span>
            {v2Info && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">v{v2Info.version}</Badge>
                <span>{getSourceLabel(v2Info.source_type)}</span>
                <span>{v2Info.word_count} 词</span>
              </div>
            )}
          </div>
        )}

        {/* 差异内容 */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : !v1 || !v2 ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <p>请选择要对比的两个版本</p>
            </div>
          ) : diffData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground">
              <Equal className="h-16 w-16 mb-4 opacity-20" />
              <p>两个版本内容完全相同</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="font-mono text-sm">
                {diffData.map((line, index) => (
                  <div
                    key={index}
                    className={`
                      px-6 py-0.5 flex items-start
                      ${line.type === 'insert' ? 'bg-green-100 text-green-800' : ''}
                      ${line.type === 'delete' ? 'bg-red-100 text-red-800' : ''}
                      ${line.type === 'equal' ? 'bg-white text-slate-700' : ''}
                    `}
                  >
                    {/* 行号 */}
                    <div className="w-16 shrink-0 text-right pr-4 text-muted-foreground select-none">
                      {line.oldLineNum && (
                        <span className={line.type === 'delete' ? 'text-red-500' : ''}>
                          {line.oldLineNum}
                        </span>
                      )}
                    </div>
                    <div className="w-16 shrink-0 text-right pr-4 text-muted-foreground select-none">
                      {line.newLineNum && (
                        <span className={line.type === 'insert' ? 'text-green-500' : ''}>
                          {line.newLineNum}
                        </span>
                      )}
                    </div>
                    
                    {/* 变化标记 */}
                    <div className="w-6 shrink-0 text-center">
                      {line.type === 'insert' && <span className="text-green-600">+</span>}
                      {line.type === 'delete' && <span className="text-red-600">-</span>}
                      {line.type === 'equal' && <span className="text-slate-300">&nbsp;</span>}
                    </div>
                    
                    {/* 内容 */}
                    <div className="flex-1 whitespace-pre-wrap break-all">
                      {line.content || '\u00A0'}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
