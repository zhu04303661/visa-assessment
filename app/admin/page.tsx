"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Database, 
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Search,
  BookOpen,
  Target,
  Lightbulb,
  Code
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/i18n"

interface Bullet {
  id: string
  section: string
  content: string
  helpful: number
  harmful: number
  neutral: number
  created_at: string
  updated_at: string
}

interface PlaybookStats {
  bullets: number
  sections: number
  tags: {
    helpful: number
    harmful: number
    neutral: number
  }
}

export default function AdminPage() {
  const { t } = useLanguage()
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [stats, setStats] = useState<PlaybookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSection, setFilterSection] = useState("all")
  const [sortBy, setSortBy] = useState<"updated" | "helpful" | "id">("updated")
  
  // 添加/编辑表单状态
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    section: "defaults",
    content: "",
    bullet_id: ""
  })
  const [activeTab, setActiveTab] = useState("all")

  const sectionOptions = [
    { value: "defaults", label: "默认知识", icon: "📋" },
    { value: "expert_guidelines", label: "专家指南", icon: "🎯" },
    { value: "expert_case_studies", label: "案例研究", icon: "📚" },
    { value: "guidelines", label: "指导原则", icon: "📖" },
    { value: "criteria", label: "评估标准", icon: "✓" },
    { value: "examples", label: "示例", icon: "💡" },
  ]

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true)
      setError("")
      
      // 加载知识条目
      const bulletsResponse = await fetch('/api/ace-chat?action=bullets')
      const bulletsData = await bulletsResponse.json()
      
      if (bulletsData.success) {
        setBullets(bulletsData.bullets || [])
      } else {
        setError(bulletsData.error || "加载知识条目失败")
      }
      
      // 加载统计信息
      const statsResponse = await fetch('/api/ace-chat?action=playbook')
      const statsData = await statsResponse.json()
      
      if (statsData.success) {
        setStats(statsData.playbook.stats)
      }
      
    } catch (err) {
      setError(`加载数据失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 清空提示消息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // 添加知识条目
  const handleAdd = async () => {
    if (!formData.content.trim()) {
      setError("内容不能为空")
      return
    }

    try {
      const response = await fetch('/api/ace-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_bullet',
          section: formData.section,
          content: formData.content,
          bullet_id: formData.bullet_id || undefined
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess("知识条目添加成功")
        setFormData({ section: "defaults", content: "", bullet_id: "" })
        setIsAdding(false)
        loadData()
      } else {
        setError(result.error || "添加失败")
      }
    } catch (err) {
      setError(`添加失败: ${err}`)
    }
  }

  // 更新知识条目
  const handleUpdate = async (bulletId: string) => {
    if (!formData.content.trim()) {
      setError("内容不能为空")
      return
    }

    try {
      const response = await fetch('/api/ace-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_bullet',
          bullet_id: bulletId,
          content: formData.content,
          section: formData.section
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess("知识条目更新成功")
        setEditingId(null)
        setFormData({ section: "defaults", content: "", bullet_id: "" })
        loadData()
      } else {
        setError(result.error || "更新失败")
      }
    } catch (err) {
      setError(`更新失败: ${err}`)
    }
  }

  // 删除知识条目
  const handleDelete = async (bulletId: string) => {
    if (!confirm("确定要删除这个知识条目吗？")) return

    try {
      const response = await fetch('/api/ace-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_bullet',
          bullet_id: bulletId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess("知识条目删除成功")
        loadData()
      } else {
        setError(result.error || "删除失败")
      }
    } catch (err) {
      setError(`删除失败: ${err}`)
    }
  }

  // 重置知识库
  const handleReset = async () => {
    if (!confirm("确定要重置整个知识库吗？这将删除所有自定义内容！")) return

    try {
      const response = await fetch('/api/ace-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_playbook'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess("知识库已重置")
        loadData()
      } else {
        setError(result.error || "重置失败")
      }
    } catch (err) {
      setError(`重置失败: ${err}`)
    }
  }

  // 开始编辑
  const startEdit = (bullet: Bullet) => {
    setEditingId(bullet.id)
    setFormData({
      section: bullet.section,
      content: bullet.content,
      bullet_id: bullet.id
    })
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ section: "defaults", content: "", bullet_id: "" })
  }

  // 过滤和排序
  const filteredBullets = bullets
    .filter((b) => {
      const matchesSearch = 
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.content.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterSection === "all" || b.section === filterSection
      const matchesTab = activeTab === "all" || 
        (activeTab === "expert" && b.section.startsWith("expert_")) ||
        (activeTab === "standard" && !b.section.startsWith("expert_"))
      
      return matchesSearch && matchesFilter && matchesTab
    })
    .sort((a, b) => {
      if (sortBy === "helpful") return b.helpful - a.helpful
      if (sortBy === "id") return a.id.localeCompare(b.id)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  const expertCount = bullets.filter(b => b.section.startsWith("expert_")).length
  const standardCount = bullets.length - expertCount

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">知识库管理系统</h1>
          </div>
          <p className="text-muted-foreground text-lg">管理和维护GTV签证评估所使用的专家知识库</p>
        </div>

        {/* 统计信息卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">总知识点</p>
                    <p className="text-3xl font-bold">{stats.bullets}</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">专家知识</p>
                    <p className="text-3xl font-bold">{expertCount}</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">标准知识</p>
                    <p className="text-3xl font-bold">{standardCount}</p>
                  </div>
                  <Code className="h-8 w-8 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">有用评分</p>
                    <p className="text-3xl font-bold">{stats.tags.helpful}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">需改进</p>
                    <p className="text-3xl font-bold">{stats.tags.harmful}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 消息提示 */}
        {error && (
          <Alert className="mb-4 animate-in" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 animate-in">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 操作栏 */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsAdding(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              新增知识点
            </Button>
            
            <Button 
              onClick={loadData}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <Button 
            onClick={handleReset}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            重置知识库
          </Button>
        </div>

        {/* 添加/编辑表单 */}
        {(isAdding || editingId) && (
          <Card className="mb-6 border-2 border-primary/30">
            <CardHeader className="bg-primary/5">
              <CardTitle>
                {editingId ? "编辑知识点" : "新增知识点"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">ID (唯一标识)</label>
                  <Input
                    value={formData.bullet_id}
                    onChange={(e) => setFormData({...formData, bullet_id: e.target.value})}
                    placeholder="e.g., expert_positioning_rule"
                    disabled={!!editingId}
                  />
                  {!editingId && (
                    <p className="text-xs text-muted-foreground mt-1">为空则自动生成UUID</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">分类</label>
                  <Select
                    value={formData.section}
                    onValueChange={(value) => setFormData({...formData, section: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">知识内容</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="输入详细的知识内容。支持Markdown格式。"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  字数: {formData.content.length} | 建议: 50-1000字
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cancelEdit}>
                  取消
                </Button>
                <Button 
                  onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                  disabled={!formData.content.trim()}
                >
                  {editingId ? "更新" : "添加"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 知识点列表 */}
        <Card>
          <CardHeader className="border-b bg-muted/50">
            <div className="space-y-4">
              <CardTitle>知识点库</CardTitle>
              
              {/* 搜索和过滤 */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索ID或内容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有分类</SelectItem>
                    {sectionOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">最近更新</SelectItem>
                    <SelectItem value="helpful">有用程度</SelectItem>
                    <SelectItem value="id">字母顺序</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Tabs for Expert vs Standard */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">全部 ({bullets.length})</TabsTrigger>
                <TabsTrigger value="expert">专家知识 ({expertCount})</TabsTrigger>
                <TabsTrigger value="standard">标准知识 ({standardCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : filteredBullets.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">暂无知识点</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBullets.map((bullet) => (
                  <div 
                    key={bullet.id} 
                    className="border rounded-lg p-4 hover:shadow-md transition-all hover:border-primary/50"
                  >
                    {editingId === bullet.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">分类</label>
                            <Select
                              value={formData.section}
                              onValueChange={(value) => setFormData({...formData, section: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {sectionOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.icon} {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">ID</label>
                            <Input
                              value={formData.bullet_id}
                              disabled
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">内容</label>
                          <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            rows={5}
                            className="font-mono text-sm"
                          />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={cancelEdit}>
                            取消
                          </Button>
                          <Button onClick={() => handleUpdate(bullet.id)}>
                            保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant={bullet.section.startsWith("expert_") ? "default" : "secondary"}
                              >
                                {sectionOptions.find(s => s.value === bullet.section)?.icon}
                                {" "}
                                {sectionOptions.find(s => s.value === bullet.section)?.label}
                              </Badge>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {bullet.id}
                              </code>
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(bullet)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(bullet.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-foreground whitespace-pre-wrap mb-3 leading-relaxed">
                          {bullet.content}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1">
                              👍 有用: <strong>{bullet.helpful}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              👎 无用: <strong>{bullet.harmful}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              ➖ 中立: <strong>{bullet.neutral}</strong>
                            </span>
                          </div>
                          <span>
                            更新: {new Date(bullet.updated_at).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 知识库统计底部 */}
        {!loading && filteredBullets.length > 0 && (
          <Card className="mt-6 bg-muted/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{filteredBullets.length}</p>
                  <p className="text-sm text-muted-foreground">筛选结果</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredBullets.filter(b => b.section.startsWith("expert_")).length}</p>
                  <p className="text-sm text-muted-foreground">专家知识</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{filteredBullets.reduce((sum, b) => sum + b.helpful, 0)}</p>
                  <p className="text-sm text-muted-foreground">总有用评分</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(filteredBullets.reduce((sum, b) => sum + b.helpful, 0) / Math.max(filteredBullets.length, 1))}</p>
                  <p className="text-sm text-muted-foreground">平均评分</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
