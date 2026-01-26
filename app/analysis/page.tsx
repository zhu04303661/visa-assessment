"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Brain, 
  Download, 
  RefreshCw, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronDown,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  FolderOpen,
  User,
  Building,
  Target,
  Award,
  BookOpen,
  FileCheck,
  ClipboardList,
  TrendingUp,
  Users,
  Briefcase,
  GraduationCap,
  Star,
  Clock,
  MapPin,
  Sparkles
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import dynamic from 'next/dynamic'
import { GTV_FRAMEWORK_TEMPLATE, type GTVFrameworkNode } from '@/lib/gtv-framework-template'

// 动态导入组件
const FlowCanvas = dynamic(() => import('@/components/flow-canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      <span className="animate-pulse">正在加载画布组件...</span>
    </div>
  )
})

const API_BASE = process.env.NEXT_PUBLIC_COPYWRITING_API || 'http://localhost:5004'

// 项目接口
interface Project {
  project_id: string
  client_name: string
  visa_type: string
  created_at?: string
}

// 分析结果接口
interface AnalysisResult {
  mindmap: GTVFrameworkNode
  statistics: {
    total_files: number
    mc_coverage: number
    oc_coverage: number
    reference_count: number
  }
  report?: {
    mc_status: Record<string, any>
    oc_status: Record<string, any>
    missing_items: string[]
  }
  client_profile?: ClientProfile
  evidence_chain?: EvidenceChain[]
}

// 客户画像
interface ClientProfile {
  name: string
  field: string
  subField: string
  position: string
  assessmentBody: string
  coreThesis: string
  experience: string
  education: string
  achievements: string[]
  strengths: string[]
  gaps: string[]
}

// 证据链
interface EvidenceChain {
  criteriaId: string
  criteriaName: string
  status: 'complete' | 'partial' | 'missing'
  evidences: {
    id: string
    name: string
    type: string
    files: string[]
    description: string
    status: 'uploaded' | 'pending' | 'missing'
  }[]
}

// 状态图标组件
function StatusIcon({ status, size = 'sm' }: { status?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  switch (status) {
    case 'success':
    case 'complete':
    case 'uploaded':
      return <CheckCircle className={cn(sizeClass, "text-green-500")} />
    case 'warning':
    case 'partial':
      return <AlertCircle className={cn(sizeClass, "text-yellow-500")} />
    case 'error':
    case 'missing':
      return <XCircle className={cn(sizeClass, "text-red-500")} />
    case 'pending':
      return <Clock className={cn(sizeClass, "text-gray-400")} />
    default:
      return null
  }
}

// 客户概览卡片
function ClientOverviewCard({ profile, project }: { profile?: ClientProfile; project?: Project }) {
  if (!profile && !project) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          <p>请选择项目查看客户资料</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{profile?.name || project?.client_name || '未知客户'}</CardTitle>
              <CardDescription>{profile?.position || '数字科技领域'}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            {project?.visa_type || 'GTV'} Talent
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">评估机构:</span>
            <span className="font-medium">{profile?.assessmentBody || 'Tech Nation'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">细分领域:</span>
            <span className="font-medium">{profile?.subField || '待确定'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">工作经验:</span>
            <span className="font-medium">{profile?.experience || '待分析'}</span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">教育背景:</span>
            <span className="font-medium">{profile?.education || '待分析'}</span>
          </div>
        </div>
        
        {profile?.coreThesis && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-sm">核心论点</span>
            </div>
            <p className="text-sm text-muted-foreground">{profile.coreThesis}</p>
          </div>
        )}
        
        {profile?.strengths && profile.strengths.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">优势</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.strengths.map((s, i) => (
                <Badge key={i} variant="secondary" className="bg-green-50 text-green-700">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {profile?.gaps && profile.gaps.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-sm">待补充</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.gaps.map((g, i) => (
                <Badge key={i} variant="secondary" className="bg-yellow-50 text-yellow-700">
                  {g}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 材料完成度卡片
function CompletionCard({ statistics }: { statistics?: AnalysisResult['statistics'] }) {
  const mcPercent = statistics?.mc_coverage || 0
  const ocPercent = statistics?.oc_coverage || 0
  const refCount = statistics?.reference_count || 0
  const totalFiles = statistics?.total_files || 0
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          材料完成度
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>MC标准覆盖</span>
            <span className="font-medium">{mcPercent}%</span>
          </div>
          <Progress value={mcPercent} className="h-2" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>OC标准覆盖</span>
            <span className="font-medium">{ocPercent}%</span>
          </div>
          <Progress value={ocPercent} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totalFiles}</div>
            <div className="text-xs text-muted-foreground">证据文件</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{refCount}/3</div>
            <div className="text-xs text-muted-foreground">推荐信</div>
          </div>
        </div>
        
        <div className="pt-2">
          {mcPercent >= 50 && ocPercent >= 50 && refCount >= 3 ? (
            <Badge className="w-full justify-center bg-green-500">✅ 材料基本完整</Badge>
          ) : (
            <Badge variant="outline" className="w-full justify-center text-yellow-600 border-yellow-500">
              ⚠️ 材料待补充
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 证据链分析组件
function EvidenceChainPanel({ evidenceChain, report }: { evidenceChain?: EvidenceChain[]; report?: AnalysisResult['report'] }) {
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([])
  
  const toggleExpand = (id: string) => {
    setExpandedCriteria(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  
  // 构建默认的证据链数据
  const defaultChain: EvidenceChain[] = [
    {
      criteriaId: 'mc1',
      criteriaName: 'MC1: 产品/团队领导力',
      status: report?.mc_status?.mc1?.status || 'pending',
      evidences: [
        { id: 'mc1-1', name: '产品描述文档', type: 'document', files: [], description: '介绍产品技术革新', status: 'pending' },
        { id: 'mc1-2', name: '行业专家推荐信', type: 'reference', files: [], description: '证明行业专业性', status: 'pending' },
      ]
    },
    {
      criteriaId: 'mc2',
      criteriaName: 'MC2: 营销/业务开发',
      status: report?.mc_status?.mc2?.status || 'pending',
      evidences: [
        { id: 'mc2-1', name: '销售合同', type: 'contract', files: [], description: '证明商业成功', status: 'pending' },
        { id: 'mc2-2', name: '投资协议', type: 'agreement', files: [], description: '投资数字科技企业经历', status: 'pending' },
      ]
    },
    {
      criteriaId: 'mc3',
      criteriaName: 'MC3: 非营利组织贡献',
      status: report?.mc_status?.mc3?.status || 'pending',
      evidences: [
        { id: 'mc3-1', name: '创业导师聘书', type: 'certificate', files: [], description: '科技创业领域贡献', status: 'pending' },
      ]
    },
    {
      criteriaId: 'oc1',
      criteriaName: 'OC1: 创新',
      status: report?.oc_status?.oc1?.status || 'pending',
      evidences: [
        { id: 'oc1-1', name: '供应商资质', type: 'certificate', files: [], description: '成为知名企业供应商', status: 'pending' },
        { id: 'oc1-2', name: '专利报告', type: 'patent', files: [], description: '产品专利和技术描述', status: 'pending' },
        { id: 'oc1-3', name: '财务报表', type: 'financial', files: [], description: '审计账目', status: 'pending' },
      ]
    },
    {
      criteriaId: 'oc3',
      criteriaName: 'OC3: 重大贡献',
      status: report?.oc_status?.oc3?.status || 'pending',
      evidences: [
        { id: 'oc3-1', name: '投资决策文件', type: 'document', files: [], description: '投委会议事规则', status: 'pending' },
        { id: 'oc3-2', name: '商业成功证明', type: 'document', files: [], description: '销售渠道、增长数据', status: 'pending' },
      ]
    },
    {
      criteriaId: 'ref',
      criteriaName: '推荐信 (3封)',
      status: report?.oc_status?.ref?.status || 'pending',
      evidences: [
        { id: 'ref-1', name: '推荐人1', type: 'reference', files: [], description: '', status: 'pending' },
        { id: 'ref-2', name: '推荐人2', type: 'reference', files: [], description: '', status: 'pending' },
        { id: 'ref-3', name: '推荐人3', type: 'reference', files: [], description: '', status: 'pending' },
      ]
    },
  ]
  
  const chain = evidenceChain || defaultChain
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          证据链分析
        </CardTitle>
        <CardDescription>各标准所需证据材料及完成状态</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-2">
            {chain.map((criteria) => (
              <div key={criteria.criteriaId} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(criteria.criteriaId)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={criteria.status} />
                    <span className="font-medium text-sm">{criteria.criteriaName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {criteria.evidences.filter(e => e.status === 'uploaded').length}/{criteria.evidences.length}
                    </Badge>
                    {expandedCriteria.includes(criteria.criteriaId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </button>
                
                {expandedCriteria.includes(criteria.criteriaId) && (
                  <div className="border-t bg-muted/20 p-3 space-y-2">
                    {criteria.evidences.map((evidence) => (
                      <div 
                        key={evidence.id}
                        className="flex items-center justify-between p-2 bg-background rounded border"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon status={evidence.status} size="sm" />
                          <div>
                            <div className="text-sm font-medium">{evidence.name}</div>
                            {evidence.description && (
                              <div className="text-xs text-muted-foreground">{evidence.description}</div>
                            )}
                          </div>
                        </div>
                        {evidence.files.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {evidence.files.length} 文件
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            待上传
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// 缺失项提醒组件
function MissingItemsAlert({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null
  
  return (
    <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 text-yellow-800">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>待补充材料:</strong> {items.join(' | ')}
      </AlertDescription>
    </Alert>
  )
}

// 主页面内容组件
function AnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  
  const [activeTab, setActiveTab] = useState('overview')
  const [viewMode, setViewMode] = useState<'canvas' | 'tree'>('canvas')
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 加载项目列表
  useEffect(() => {
    loadProjects()
  }, [])
  
  // 项目变化时加载分析结果
  useEffect(() => {
    if (selectedProjectId) {
      loadAnalysisResult(selectedProjectId)
    }
  }, [selectedProjectId])
  
  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  const loadProjects = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/projects`)
      const data = await res.json()
      if (data.success) {
        setProjects(data.data || [])
        if (projectId && !selectedProjectId) {
          setSelectedProjectId(projectId)
        }
      }
    } catch (err) {
      console.error('加载项目失败')
    } finally {
      setLoading(false)
    }
  }
  
  const loadAnalysisResult = async (pid: string) => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/projects/${pid}/analysis`)
      const data = await res.json()
      if (data.success && data.data) {
        setAnalysisResult(data.data)
        setError('')
      } else {
        // 如果没有分析结果，使用默认模板
        const selectedProject = projects.find(p => p.project_id === pid)
        setAnalysisResult({
          mindmap: {
            ...GTV_FRAMEWORK_TEMPLATE,
            label: `${selectedProject?.client_name || '客户'} - GTV申请框架`
          },
          statistics: {
            total_files: 0,
            mc_coverage: 0,
            oc_coverage: 0,
            reference_count: 0
          }
        })
      }
    } catch (err) {
      console.error('加载分析结果失败')
      // 使用默认模板
      const selectedProject = projects.find(p => p.project_id === pid)
      setAnalysisResult({
        mindmap: {
          ...GTV_FRAMEWORK_TEMPLATE,
          label: `${selectedProject?.client_name || '客户'} - GTV申请框架`
        },
        statistics: {
          total_files: 0,
          mc_coverage: 0,
          oc_coverage: 0,
          reference_count: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }
  
  const runAnalysis = async () => {
    if (!selectedProjectId) return
    
    try {
      setAnalyzing(true)
      setError('')
      const res = await fetch(`${API_BASE}/api/projects/${selectedProjectId}/analyze`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success && data.data) {
        setAnalysisResult(data.data)
      } else {
        setError(data.error || '分析失败')
      }
    } catch (err) {
      setError('分析请求失败')
    } finally {
      setAnalyzing(false)
    }
  }
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
  
  const selectedProject = projects.find(p => p.project_id === selectedProjectId)
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/copywriting')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">GTV递交框架分析</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="选择项目" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.project_id} value={p.project_id}>
                    {p.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={runAnalysis} 
              disabled={!selectedProjectId || analyzing}
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {analyzing ? '分析中...' : '开始分析'}
            </Button>
            
            <Button 
              variant="secondary"
              onClick={() => router.push(`/analysis/agent${selectedProjectId ? `?project=${selectedProjectId}` : ''}`)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI分析Agent
            </Button>
            
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* 缺失项提醒 */}
        <div className="mb-4">
          <MissingItemsAlert items={analysisResult?.report?.missing_items} />
        </div>
        
        {/* 主内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <User className="h-4 w-4" />
              客户概览
            </TabsTrigger>
            <TabsTrigger value="framework" className="gap-2">
              <Brain className="h-4 w-4" />
              递交框架
            </TabsTrigger>
            <TabsTrigger value="evidence" className="gap-2">
              <FileCheck className="h-4 w-4" />
              证据链
            </TabsTrigger>
          </TabsList>
          
          {/* 客户概览 Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <ClientOverviewCard 
                  profile={analysisResult?.client_profile} 
                  project={selectedProject}
                />
              </div>
              <div>
                <CompletionCard statistics={analysisResult?.statistics} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EvidenceChainPanel 
                evidenceChain={analysisResult?.evidence_chain}
                report={analysisResult?.report}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    申请策略建议
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="font-medium text-blue-800 mb-1">推荐路径</div>
                    <p className="text-sm text-blue-600">
                      基于现有材料分析，建议走 Exceptional Talent 路径，重点突出产品领导力和商业成功经验。
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="font-medium text-green-800 mb-1">优先补充</div>
                    <ul className="text-sm text-green-600 list-disc list-inside space-y-1">
                      <li>完善产品描述文档，突出数字科技特性</li>
                      <li>获取行业专家推荐信</li>
                      <li>准备财务报表和商业成功证据</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="font-medium text-yellow-800 mb-1">注意事项</div>
                    <p className="text-sm text-yellow-600">
                      确保所有材料能够清晰展示在数字科技领域的专业性和影响力。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* 递交框架 Tab */}
          <TabsContent value="framework">
            <div 
              ref={containerRef}
              className={cn(
                "rounded-xl border bg-background flex flex-col",
                isFullscreen && "fixed inset-0 z-50 rounded-none"
              )}
            >
              {/* 工具栏 */}
              <div className="flex items-center justify-between p-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold text-lg">
                    {selectedProject?.client_name || '请选择项目'} - GTV递交框架
                  </h2>
                  
                  {analysisResult?.statistics && (
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="outline" className="gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {analysisResult.statistics.total_files} 文件
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        MC {analysisResult.statistics.mc_coverage}%
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        OC {analysisResult.statistics.oc_coverage}%
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        推荐信 {analysisResult.statistics.reference_count}/3
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* 缩放控制 */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <button 
                      onClick={() => setZoom(Math.max(50, zoom - 10))}
                      className="p-1.5 hover:bg-background rounded"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-xs w-12 text-center">{zoom}%</span>
                    <button 
                      onClick={() => setZoom(Math.min(150, zoom + 10))}
                      className="p-1.5 hover:bg-background rounded"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* 内容区域 */}
              <div className={cn(
                "flex-1 overflow-auto",
                isFullscreen ? "h-[calc(100vh-80px)]" : "h-[calc(100vh-380px)]"
              )}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !selectedProjectId ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Brain className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg">请选择一个项目</p>
                    <p className="text-sm mt-1">选择项目后查看GTV递交框架</p>
                  </div>
                ) : analysisResult?.mindmap ? (
                  <FlowCanvas 
                    data={analysisResult.mindmap}
                    className="h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Brain className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg">暂无分析结果</p>
                    <Button className="mt-4" onClick={runAnalysis} disabled={analyzing}>
                      {analyzing ? '分析中...' : '开始分析'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* 证据链 Tab */}
          <TabsContent value="evidence">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EvidenceChainPanel 
                evidenceChain={analysisResult?.evidence_chain}
                report={analysisResult?.report}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Tech Nation 评估标准说明
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-primary mb-1">MC 必选标准</div>
                      <p className="text-sm text-muted-foreground">
                        Mandatory Criteria - 申请人必须满足至少2项MC标准，证明在数字科技领域的领导力和影响力。
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-purple-600 mb-1">OC 可选标准</div>
                      <p className="text-sm text-muted-foreground">
                        Optional Criteria - 申请人需满足至少2项OC标准，证明创新能力、学术贡献或行业影响力。
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-orange-600 mb-1">推荐信要求</div>
                      <p className="text-sm text-muted-foreground">
                        需要3封来自不同推荐人的推荐信，推荐人应为行业知名专家或高管。
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-green-600 mb-1">证据材料要求</div>
                      <p className="text-sm text-muted-foreground">
                        所有材料应为最近5年内的成就，需提供原件扫描或官方文件，如为非英文需提供认证翻译。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// 使用 Suspense 包裹，因为 useSearchParams 需要 Suspense 边界
export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    }>
      <AnalysisPageContent />
    </Suspense>
  )
}
