"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  CheckCircle
} from "lucide-react"
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
  
  // 添加/编辑表单状态
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    section: "defaults",
    content: "",
    bullet_id: ""
  })

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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ACE知识库管理</h1>
        <p className="text-gray-600">管理和维护GTV签证评估的AI知识库</p>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">知识条目</p>
                  <p className="text-2xl font-bold">{stats.bullets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">章节数</p>
                  <p className="text-2xl font-bold">{stats.sections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm text-gray-600">有用标记</p>
                  <p className="text-2xl font-bold">{stats.tags.helpful}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">有害标记</p>
                  <p className="text-2xl font-bold">{stats.tags.harmful}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 消息提示 */}
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4" variant="default">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Button 
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>添加知识条目</span>
          </Button>
          
          <Button 
            onClick={loadData}
            variant="outline"
            className="flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </Button>
        </div>
        
        <Button 
          onClick={handleReset}
          variant="destructive"
          className="flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>重置知识库</span>
        </Button>
      </div>

      {/* 添加/编辑表单 */}
      {(isAdding || editingId) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {isAdding ? "添加知识条目" : "编辑知识条目"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">章节</label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({...formData, section: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="defaults">默认</option>
                  <option value="guidelines">指导原则</option>
                  <option value="criteria">评估标准</option>
                  <option value="examples">示例</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">ID (可选)</label>
                <Input
                  value={formData.bullet_id}
                  onChange={(e) => setFormData({...formData, bullet_id: e.target.value})}
                  placeholder="留空自动生成"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">内容</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="输入知识条目内容..."
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelEdit}>
                取消
              </Button>
              <Button 
                onClick={() => isAdding ? handleAdd() : handleUpdate(editingId!)}
                disabled={!formData.content.trim()}
              >
                {isAdding ? "添加" : "更新"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 知识条目列表 */}
      <Card>
        <CardHeader>
          <CardTitle>知识条目列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>加载中...</p>
            </div>
          ) : bullets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无知识条目</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bullets.map((bullet) => (
                <div key={bullet.id} className="border rounded-lg p-4">
                  {editingId === bullet.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">章节</label>
                          <select
                            value={formData.section}
                            onChange={(e) => setFormData({...formData, section: e.target.value})}
                            className="w-full mt-1 p-2 border rounded-md"
                          >
                            <option value="defaults">默认</option>
                            <option value="guidelines">指导原则</option>
                            <option value="criteria">评估标准</option>
                            <option value="examples">示例</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">ID</label>
                          <Input
                            value={formData.bullet_id}
                            onChange={(e) => setFormData({...formData, bullet_id: e.target.value})}
                            disabled
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">内容</label>
                        <Textarea
                          value={formData.content}
                          onChange={(e) => setFormData({...formData, content: e.target.value})}
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
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
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{bullet.section}</Badge>
                          <span className="text-sm text-gray-500">#{bullet.id}</span>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(bullet)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(bullet.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-gray-800 mb-2">{bullet.content}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>有用: {bullet.helpful}</span>
                        <span>有害: {bullet.harmful}</span>
                        <span>中性: {bullet.neutral}</span>
                        <span>更新: {new Date(bullet.updated_at).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
