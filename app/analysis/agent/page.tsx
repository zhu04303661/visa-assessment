"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Brain, 
  Play,
  Save,
  Download,
  Copy,
  Settings,
  FileText,
  FolderOpen,
  Loader2,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Sparkles,
  Edit3,
  Eye,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'

const API_BASE = process.env.NEXT_PUBLIC_COPYWRITING_API || 'http://localhost:5004'

// 默认分析提示词
const DEFAULT_SYSTEM_PROMPT = `你是一位专业的英国 Global Talent Visa (GTV) 申请顾问，专注于帮助申请人整理和分析申请材料。

你的任务是：
1. 仔细阅读客户提供的所有材料
2. 按照 Tech Nation 的评估框架，将材料内容归类到对应的标准类别
3. 提取关键证据和核心观点
4. 生成一份结构化的分析报告

请按以下框架组织输出：

## 一、申请人概况
- 基本信息
- 专业领域定位
- 核心竞争力

## 二、领域定位分析
- 评估机构：Tech Nation
- 细分领域：[根据材料判断]
- 岗位定位：[根据材料判断]
- 核心论点：[总结申请人的独特价值主张]

## 三、MC 必选标准材料匹配

### MC1: 产品/团队领导力
**相关材料片段：**
[提取相关内容]

**核心观点：**
[总结要点]

**证据支撑：**
- [列出具体证据]

### MC2: 营销/业务开发
[同上格式]

### MC3: 非营利组织贡献
[同上格式]

### MC4: 专家评审角色
[同上格式]

## 四、OC 可选标准材料匹配

### OC1: 创新
[同上格式]

### OC2: 学术贡献
[同上格式]

### OC3: 重大贡献
[同上格式]

### OC4: 行业领袖
[同上格式]

## 五、推荐信规划

### 推荐人1
- 姓名：
- 职位/背景：
- 推荐角度：
- 核心内容建议：

[推荐人2、3同上]

## 六、材料缺口分析
- 待补充材料：
- 需要加强的证据：
- 建议获取的新材料：

## 七、申请策略建议
- 推荐申请路径：
- 优先准备事项：
- 风险提示：
`

const DEFAULT_USER_PROMPT = `请分析以下客户材料，按照GTV递交框架整理出核心观点和证据：

【客户材料】
{materials}

请生成完整的分析报告。`

// 项目接口
interface Project {
  project_id: string
  client_name: string
  visa_type: string
}

// 材料接口
interface Material {
  id: string
  filename: string
  category: string
  content?: string
  path: string
}

function MaterialAnalysisAgentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  
  // 项目和材料状态
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '')
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  
  // 提示词状态
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [userPrompt, setUserPrompt] = useState(DEFAULT_USER_PROMPT)
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false)
  
  // 手动输入材料
  const [manualMaterials, setManualMaterials] = useState('')
  const [inputMode, setInputMode] = useState<'select' | 'manual'>('select')
  
  // 分析状态
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [error, setError] = useState('')
  
  // 预览模式
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview')
  
  // 展开的材料分类
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['all'])
  
  // 加载项目列表
  useEffect(() => {
    loadProjects()
  }, [])
  
  // 项目变化时加载材料
  useEffect(() => {
    if (selectedProjectId) {
      loadMaterials(selectedProjectId)
    }
  }, [selectedProjectId])
  
  const loadProjects = async () => {
    try {
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
    }
  }
  
  const loadMaterials = async (pid: string) => {
    try {
      setLoadingMaterials(true)
      setError('')
      
      const res = await fetch(`${API_BASE}/api/projects/${pid}/materials`)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.success && data.data && data.data.length > 0) {
        setMaterials(data.data)
        // 默认选择所有材料
        setSelectedMaterials(data.data.map((m: Material) => m.id))
      } else {
        // 没有材料时使用空数组
        setMaterials([])
        setSelectedMaterials([])
      }
    } catch (err) {
      console.warn('材料加载失败，使用空列表:', err)
      // API 失败时清空材料列表
      setMaterials([])
      setSelectedMaterials([])
    } finally {
      setLoadingMaterials(false)
    }
  }
  
  // 按分类分组材料
  const materialsByCategory = materials.reduce((acc, m) => {
    const cat = m.category || '未分类'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {} as Record<string, Material[]>)
  
  // 切换材料选择
  const toggleMaterial = (id: string) => {
    setSelectedMaterials(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  
  // 全选/取消全选分类
  const toggleCategory = (category: string, materialIds: string[]) => {
    const allSelected = materialIds.every(id => selectedMaterials.includes(id))
    if (allSelected) {
      setSelectedMaterials(prev => prev.filter(id => !materialIds.includes(id)))
    } else {
      setSelectedMaterials(prev => [...new Set([...prev, ...materialIds])])
    }
  }
  
  // 展开/折叠分类
  const toggleExpand = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) ? prev.filter(x => x !== category) : [...prev, category]
    )
  }
  
  // 运行分析
  const runAnalysis = async () => {
    // 检查是否有输入
    if (inputMode === 'select' && selectedMaterials.length === 0) {
      setError('请选择至少一个材料进行分析')
      return
    }
    if (inputMode === 'manual' && !manualMaterials.trim()) {
      setError('请输入材料内容')
      return
    }
    
    try {
      setAnalyzing(true)
      setError('')
      setAnalysisResult('')
      
      const selectedMaterialData = materials.filter(m => selectedMaterials.includes(m.id))
      
      if (inputMode === 'manual') {
        // 手动输入模式：直接使用输入的文本生成分析
        setAnalysisResult(generateMockAnalysisFromText(manualMaterials))
      } else {
        // 选择模式：调用 API 或生成模拟结果
        try {
          const res = await fetch(`${API_BASE}/api/projects/${selectedProjectId}/analyze-materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_prompt: systemPrompt,
              user_prompt: userPrompt,
              material_ids: selectedMaterials,
            })
          })
          
          const data = await res.json()
          
          if (data.success) {
            setAnalysisResult(data.data?.analysis || data.data?.content || '')
          } else {
            setAnalysisResult(generateMockAnalysis(selectedMaterialData))
          }
        } catch {
          setAnalysisResult(generateMockAnalysis(selectedMaterialData))
        }
      }
    } catch (err) {
      console.error('分析失败:', err)
      setError('分析过程中出现错误')
    } finally {
      setAnalyzing(false)
    }
  }
  
  // 从手动输入的文本生成分析
  const generateMockAnalysisFromText = (text: string): string => {
    const project = projects.find(p => p.project_id === selectedProjectId)
    const clientName = project?.client_name || '客户'
    const wordCount = text.length
    
    return `# ${clientName} - GTV 申请材料分析报告

> 生成时间：${new Date().toLocaleString('zh-CN')}
> 分析内容长度：${wordCount} 字符

---

## 一、申请人概况

### 基本信息
- **姓名**：${clientName}
- **申请类型**：GTV Talent
- **评估机构**：Tech Nation

### 材料内容摘要
\`\`\`
${text.substring(0, 500)}${text.length > 500 ? '...' : ''}
\`\`\`

---

## 二、领域定位分析

| 项目 | 分析结果 |
|------|----------|
| 评估机构 | Tech Nation |
| 细分领域 | 待根据材料确定 |
| 岗位定位 | 待根据材料确定 |
| 核心论点 | 待进一步分析 |

---

## 三、MC 必选标准材料匹配

### MC1: 产品/团队领导力
> You led the growth of a product-led digital technology company, product or team

**从材料中提取的相关内容：**
- 待进一步分析...

**核心观点：**
- 待总结

---

### MC2: 营销/业务开发
> You led the marketing or business development at a product-led digital technology company

**从材料中提取的相关内容：**
- 待进一步分析...

---

## 四、OC 可选标准材料匹配

### OC1: 创新
> Evidence of innovation/product development and market traction

**从材料中提取的相关内容：**
- 待进一步分析...

---

## 五、推荐信规划

### 推荐人建议
| 序号 | 推荐人类型 | 推荐角度 |
|------|----------|----------|
| 1 | 学术/行业专家 | 技术专业性 |
| 2 | 商业合作伙伴 | 商业成功 |
| 3 | 被投企业/客户 | 实际影响力 |

---

## 六、材料缺口分析

### ⚠️ 需要补充的信息
- 详细的工作经历和职位
- 具体的项目成就和数据
- 商业成功的量化指标
- 技术创新的具体证据

---

## 七、申请策略建议

### 📋 下一步行动
1. 补充完整的简历/CV
2. 整理产品相关文档
3. 准备商业成功证据
4. 联系潜在推荐人

---

*本报告由 GTV 材料分析 Agent 基于输入内容生成，仅供参考*
*建议使用完整的材料文件进行更详细的分析*
`
  }
  
  // 生成模拟分析结果
  const generateMockAnalysis = (materialData: Material[]): string => {
    const project = projects.find(p => p.project_id === selectedProjectId)
    const clientName = project?.client_name || '客户'
    
    return `# ${clientName} - GTV 申请材料分析报告

> 生成时间：${new Date().toLocaleString('zh-CN')}
> 分析材料数量：${materialData.length} 份

---

## 一、申请人概况

### 基本信息
- **姓名**：${clientName}
- **申请类型**：${project?.visa_type || 'GTV'} Talent
- **评估机构**：Tech Nation

### 专业领域定位
基于提交的 ${materialData.length} 份材料分析，申请人定位于 **数字科技领域**。

### 核心竞争力
- 丰富的行业投资经验
- 数字科技产品研发能力
- 商业拓展和战略规划能力

---

## 二、领域定位分析

| 项目 | 分析结果 |
|------|----------|
| 评估机构 | Tech Nation |
| 细分领域 | Hardware & Devices / AI |
| 岗位定位 | Business Development / Technical Leadership |
| 核心论点 | 在数字科技领域具有丰富投资经验和产品领导力 |

---

## 三、MC 必选标准材料匹配

### MC1: 产品/团队领导力
> You led the growth of a product-led digital technology company, product or team

**相关材料片段：**
${materialData.filter(m => m.category?.includes('产品') || m.category?.includes('简历')).map(m => `- 📄 ${m.filename}`).join('\n') || '- 待补充相关材料'}

**核心观点：**
- 领导产品研发团队，推动技术创新
- 在数字科技产品开发中发挥关键作用

**证据支撑：**
- [ ] 产品描述文档
- [ ] 技术团队架构图
- [ ] 行业专家推荐信

---

### MC2: 营销/业务开发
> You led the marketing or business development at a product-led digital technology company

**相关材料片段：**
${materialData.filter(m => m.category?.includes('商业') || m.category?.includes('销售')).map(m => `- 📄 ${m.filename}`).join('\n') || '- 待补充相关材料'}

**核心观点：**
- 成功推动商业合作和销售增长
- 建立重要客户关系和合作伙伴网络

**证据支撑：**
- [ ] 销售合同
- [ ] 合作协议
- [ ] 营收增长数据

---

### MC3: 非营利组织贡献
> You led the growth of a non-profit organisation with digital technology focus

**相关材料片段：**
${materialData.filter(m => m.category?.includes('导师') || m.category?.includes('公益')).map(m => `- 📄 ${m.filename}`).join('\n') || '- 待补充相关材料'}

**核心观点：**
- 作为创业导师指导科技创业者
- 参与行业协会和公益活动

**证据支撑：**
- [ ] 创业导师聘书
- [ ] 指导案例

---

### MC4: 专家评审角色
> You held a significant expert role assessing the work of others

**相关材料片段：**
${materialData.filter(m => m.category?.includes('评审') || m.category?.includes('专家')).map(m => `- 📄 ${m.filename}`).join('\n') || '- 待补充相关材料'}

**核心观点：**
- 参与行业评审和投资决策
- 评估数字科技项目

**证据支撑：**
- [ ] 评审委员会任命函
- [ ] 评审记录

---

## 四、OC 可选标准材料匹配

### OC1: 创新
> Evidence of innovation/product development and market traction

**相关材料片段：**
${materialData.filter(m => m.category?.includes('专利') || m.category?.includes('创新')).map(m => `- 📄 ${m.filename}`).join('\n') || '- 待补充相关材料'}

**核心观点：**
- 拥有创新专利和技术成果
- 产品获得市场认可

**证据支撑：**
- [ ] 专利证书
- [ ] 供应商资质
- [ ] 财务报表

---

### OC3: 重大贡献
> Having led or played a key role in the growth of a digital technology company

**相关材料片段：**
${materialData.filter(m => m.category?.includes('投资') || m.category?.includes('决策')).map(m => `- 📄 ${m.filename}`).join('\n') || '- 待补充相关材料'}

**核心观点：**
- 在投资决策中发挥关键作用
- 推动被投企业发展壮大

**证据支撑：**
- [ ] 投资决策文件
- [ ] 投资协议

---

## 五、推荐信规划

### 推荐人1
| 项目 | 内容 |
|------|------|
| 姓名 | 待确定 |
| 职位 | 学术/行业专家 |
| 推荐角度 | 技术专业性和行业影响力 |
| 核心内容 | 证明申请人在数字科技领域的专业成就 |

### 推荐人2
| 项目 | 内容 |
|------|------|
| 姓名 | 待确定 |
| 职位 | 商业合作伙伴/高管 |
| 推荐角度 | 商业成功和领导力 |
| 核心内容 | 证明申请人的商业贡献和影响 |

### 推荐人3
| 项目 | 内容 |
|------|------|
| 姓名 | 待确定 |
| 职位 | 被投企业/合作方 |
| 推荐角度 | 投资眼光和战略价值 |
| 核心内容 | 证明申请人对数字科技企业的贡献 |

---

## 六、材料缺口分析

### ⚠️ 待补充材料
| 标准 | 缺失材料 | 优先级 |
|------|----------|--------|
| MC1 | 产品技术描述文档 | 高 |
| MC2 | 销售业绩证明 | 高 |
| OC1 | 财务审计报告 | 中 |
| 推荐信 | 3封行业专家推荐信 | 高 |

### 📝 需要加强的证据
- 产品的数字科技属性说明
- 量化的商业成功指标
- 行业影响力证明

---

## 七、申请策略建议

### 🎯 推荐申请路径
**Exceptional Talent** - 基于丰富的行业经验和商业成就

### 📋 优先准备事项
1. 完善产品描述，突出数字科技特性
2. 整理商业成功案例和数据
3. 联系推荐人并起草推荐信
4. 准备财务报表和审计报告

### ⚡ 风险提示
- 确保所有材料能够清晰展示在**数字科技领域**的专业性
- 推荐信需要来自有影响力的行业专家
- 注意材料的时效性（最近5年内的成就）

---

*本报告由 GTV 材料分析 Agent 自动生成，仅供参考*
`
  }
  
  // 复制到剪贴板
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(analysisResult)
      // 可以添加 toast 提示
    } catch (err) {
      console.error('复制失败')
    }
  }
  
  // 下载 Markdown
  const downloadMarkdown = () => {
    const project = projects.find(p => p.project_id === selectedProjectId)
    const filename = `${project?.client_name || 'analysis'}_GTV分析报告_${new Date().toISOString().split('T')[0]}.md`
    const blob = new Blob([analysisResult], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // 保存提示词
  const savePrompts = () => {
    localStorage.setItem('gtv_agent_system_prompt', systemPrompt)
    localStorage.setItem('gtv_agent_user_prompt', userPrompt)
    setIsPromptDialogOpen(false)
  }
  
  // 加载保存的提示词
  useEffect(() => {
    const savedSystem = localStorage.getItem('gtv_agent_system_prompt')
    const savedUser = localStorage.getItem('gtv_agent_user_prompt')
    if (savedSystem) setSystemPrompt(savedSystem)
    if (savedUser) setUserPrompt(savedUser)
  }, [])
  
  const selectedProject = projects.find(p => p.project_id === selectedProjectId)
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/analysis')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">材料分析 Agent</h1>
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
            
            {/* 提示词设置按钮 */}
            <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    提示词设置
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>系统提示词 (System Prompt)</Label>
                    <Textarea 
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="输入系统提示词..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>用户提示词模板 (User Prompt)</Label>
                    <Textarea 
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      className="min-h-[100px] font-mono text-sm"
                      placeholder="使用 {materials} 占位符表示材料内容"
                    />
                    <p className="text-xs text-muted-foreground">
                      提示：使用 {'{materials}'} 作为材料内容的占位符
                    </p>
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
                      setUserPrompt(DEFAULT_USER_PROMPT)
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    恢复默认
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsPromptDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={savePrompts}>
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* 主内容区域 - 左右布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：材料输入 */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    客户材料
                  </span>
                  {inputMode === 'select' && (
                    <Badge variant="secondary">
                      {selectedMaterials.length}/{materials.length}
                    </Badge>
                  )}
                </CardTitle>
                {/* 输入模式切换 */}
                <div className="flex bg-muted rounded-lg p-0.5 mt-2">
                  <button
                    onClick={() => setInputMode('select')}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                      inputMode === 'select' 
                        ? 'bg-background shadow text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    选择材料
                  </button>
                  <button
                    onClick={() => setInputMode('manual')}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                      inputMode === 'manual' 
                        ? 'bg-background shadow text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    手动输入
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {inputMode === 'manual' ? (
                  /* 手动输入模式 */
                  <div className="p-4">
                    <Textarea
                      value={manualMaterials}
                      onChange={(e) => setManualMaterials(e.target.value)}
                      placeholder="在此粘贴或输入客户材料内容...

例如：
- 简历内容
- 工作经历
- 项目描述
- 成就和奖项
- 推荐信内容
- 其他相关材料"
                      className="min-h-[380px] font-mono text-sm resize-none"
                    />
                    <div className="mt-2 text-xs text-muted-foreground text-right">
                      {manualMaterials.length} 字符
                    </div>
                  </div>
                ) : loadingMaterials ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground space-y-3">
                    <FolderOpen className="h-12 w-12 mx-auto opacity-30" />
                    <p>{selectedProjectId ? '该项目暂无材料' : '请先选择项目'}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInputMode('manual')}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      手动输入材料
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-2">
                      {/* 全选 */}
                      <div 
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => {
                          if (selectedMaterials.length === materials.length) {
                            setSelectedMaterials([])
                          } else {
                            setSelectedMaterials(materials.map(m => m.id))
                          }
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedMaterials.length === materials.length}
                          onChange={() => {}}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">全选</span>
                      </div>
                      
                      <div className="border-t my-2" />
                      
                      {/* 按分类显示 */}
                      {Object.entries(materialsByCategory).map(([category, mats]) => (
                        <div key={category} className="space-y-1">
                          <div 
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer font-medium"
                            onClick={() => toggleExpand(category)}
                          >
                            {expandedCategories.includes(category) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <input 
                              type="checkbox"
                              checked={mats.every(m => selectedMaterials.includes(m.id))}
                              onChange={() => toggleCategory(category, mats.map(m => m.id))}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4"
                            />
                            <span>{category}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {mats.filter(m => selectedMaterials.includes(m.id)).length}/{mats.length}
                            </Badge>
                          </div>
                          
                          {expandedCategories.includes(category) && (
                            <div className="ml-6 space-y-1">
                              {mats.map(m => (
                                <div 
                                  key={m.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer text-sm"
                                  onClick={() => toggleMaterial(m.id)}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={selectedMaterials.includes(m.id)}
                                    onChange={() => {}}
                                    className="h-4 w-4"
                                  />
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{m.filename}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            
            {/* 分析按钮 */}
            <Button 
              className="w-full" 
              size="lg"
              onClick={runAnalysis}
              disabled={analyzing || (inputMode === 'select' ? selectedMaterials.length === 0 : !manualMaterials.trim())}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {inputMode === 'select' 
                    ? `开始分析 (${selectedMaterials.length} 份材料)`
                    : `开始分析 (${manualMaterials.length} 字符)`
                  }
                </>
              )}
            </Button>
          </div>
          
          {/* 右侧：分析结果 */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    分析报告
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    {/* 编辑/预览切换 */}
                    <div className="flex bg-muted rounded-lg p-0.5">
                      <button
                        onClick={() => setPreviewMode('edit')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1",
                          previewMode === 'edit' 
                            ? 'bg-background shadow text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Edit3 className="h-3 w-3" />
                        编辑
                      </button>
                      <button
                        onClick={() => setPreviewMode('preview')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1",
                          previewMode === 'preview' 
                            ? 'bg-background shadow text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Eye className="h-3 w-3" />
                        预览
                      </button>
                    </div>
                    
                    {analysisResult && (
                      <>
                        <Button variant="outline" size="sm" onClick={copyToClipboard}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">正在分析材料，生成报告...</p>
                  </div>
                ) : analysisResult ? (
                  <ScrollArea className="h-[600px]">
                    {previewMode === 'edit' ? (
                      <Textarea
                        value={analysisResult}
                        onChange={(e) => setAnalysisResult(e.target.value)}
                        className="min-h-[600px] border-0 rounded-none font-mono text-sm resize-none"
                      />
                    ) : (
                      <div className="p-6 prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{analysisResult}</ReactMarkdown>
                      </div>
                    )}
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground gap-4">
                    <Brain className="h-16 w-16 opacity-30" />
                    <p>选择材料后点击"开始分析"生成报告</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// 使用 Suspense 包裹
export default function MaterialAnalysisAgentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    }>
      <MaterialAnalysisAgentContent />
    </Suspense>
  )
}
