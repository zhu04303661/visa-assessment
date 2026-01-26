'use client'

import { useState, useEffect, useCallback } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from '@/components/ui/switch'
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  FolderOpen,
  FileText,
  AlertCircle,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Download,
  Upload as UploadIcon
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_COPYWRITING_API_URL || 'http://localhost:5004'

// 材料项类型
interface MaterialItem {
  item_id: string
  name: string
  name_en: string
  description: string
  required: boolean
  file_types: string[]
  has_form: boolean
  form_type?: string
  multiple?: boolean
  generated?: boolean
  tips?: string
}

// 分类类型
interface Category {
  name: string
  name_en: string
  description: string
  order: number
  items: MaterialItem[]
}

// 分类字典
interface Categories {
  [key: string]: Category
}

async function apiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  return response.json()
}

export default function MaterialTagsPage() {
  const [categories, setCategories] = useState<Categories>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // 编辑分类对话框
  const [editCategoryOpen, setEditCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{id: string; data: Category} | null>(null)
  
  // 编辑材料项对话框
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<{categoryId: string; item: MaterialItem; isNew: boolean} | null>(null)
  
  // 新建分类对话框
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    name_en: '',
    description: '',
    order: 0,
    items: []
  })

  // 加载分类数据
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall('/api/material-collection/categories')
      if (data.success && data.data) {
        setCategories(data.data)
      } else {
        setError('加载分类失败')
      }
    } catch (err) {
      console.error('加载分类失败:', err)
      setError('加载分类失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // 保存所有分类
  const saveCategories = async () => {
    try {
      setSaving(true)
      const data = await apiCall('/api/material-collection/categories', {
        method: 'PUT',
        body: JSON.stringify({ categories })
      })
      
      if (data.success) {
        setSuccess('分类保存成功')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || '保存失败')
      }
    } catch (err) {
      console.error('保存分类失败:', err)
      setError('保存分类失败')
    } finally {
      setSaving(false)
    }
  }

  // 添加新分类
  const addCategory = () => {
    const newId = `folder_${Object.keys(categories).length + 1}`
    const newCat: Category = {
      name: newCategory.name || '新分类',
      name_en: newCategory.name_en || 'New Category',
      description: newCategory.description || '',
      order: Object.keys(categories).length + 1,
      items: []
    }
    
    setCategories(prev => ({
      ...prev,
      [newId]: newCat
    }))
    
    setNewCategoryOpen(false)
    setNewCategory({ name: '', name_en: '', description: '', order: 0, items: [] })
  }

  // 更新分类
  const updateCategory = () => {
    if (!editingCategory) return
    
    setCategories(prev => ({
      ...prev,
      [editingCategory.id]: editingCategory.data
    }))
    
    setEditCategoryOpen(false)
    setEditingCategory(null)
  }

  // 删除分类
  const deleteCategory = (categoryId: string) => {
    if (!confirm('确定要删除这个分类吗？分类下的所有材料项也会被删除。')) return
    
    setCategories(prev => {
      const newCats = { ...prev }
      delete newCats[categoryId]
      return newCats
    })
  }

  // 添加材料项
  const addItem = (categoryId: string) => {
    const newItem: MaterialItem = {
      item_id: `item_${Date.now()}`,
      name: '新材料项',
      name_en: 'New Item',
      description: '',
      required: false,
      file_types: ['pdf', 'docx'],
      has_form: false,
      multiple: true
    }
    
    setEditingItem({ categoryId, item: newItem, isNew: true })
    setEditItemOpen(true)
  }

  // 更新材料项
  const updateItem = () => {
    if (!editingItem) return
    
    // 先关闭对话框，防止重复提交
    setEditItemOpen(false)
    
    setCategories(prev => {
      const newCats = { ...prev }
      const category = newCats[editingItem.categoryId]
      
      if (editingItem.isNew) {
        // 检查是否已存在相同 ID 的项，避免重复添加
        const exists = category.items.some(i => i.item_id === editingItem.item.item_id)
        if (!exists) {
          category.items.push(editingItem.item)
        }
      } else {
        const index = category.items.findIndex(i => i.item_id === editingItem.item.item_id)
        if (index >= 0) {
          category.items[index] = editingItem.item
        }
      }
      
      return newCats
    })
    
    setEditingItem(null)
  }

  // 删除材料项
  const deleteItem = (categoryId: string, itemId: string) => {
    if (!confirm('确定要删除这个材料项吗？')) return
    
    setCategories(prev => {
      const newCats = { ...prev }
      newCats[categoryId].items = newCats[categoryId].items.filter(i => i.item_id !== itemId)
      return newCats
    })
  }

  // 移动材料项
  const moveItem = (categoryId: string, itemIndex: number, direction: 'up' | 'down') => {
    setCategories(prev => {
      const newCats = { ...prev }
      const items = [...newCats[categoryId].items]
      const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1
      
      if (newIndex < 0 || newIndex >= items.length) return prev
      
      ;[items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]]
      newCats[categoryId].items = items
      
      return newCats
    })
  }

  // 导出分类配置
  const exportCategories = () => {
    const dataStr = JSON.stringify(categories, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `material-categories-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 导入分类配置
  const importCategories = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        setCategories(data)
        setSuccess('分类配置导入成功，请点击保存按钮保存到服务器')
      } catch (err) {
        setError('导入失败：文件格式错误')
      }
    }
    input.click()
  }

  const sortedCategories = Object.entries(categories).sort((a, b) => a[1].order - b[1].order)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Tags className="h-8 w-8 text-primary" />
              材料标签管理
            </h1>
            <p className="text-muted-foreground mt-2">
              管理材料分类和标签，自定义收集框架
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadCategories} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline" onClick={exportCategories}>
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
            <Button variant="outline" onClick={importCategories}>
              <UploadIcon className="h-4 w-4 mr-2" />
              导入
            </Button>
            <Button onClick={saveCategories} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              保存更改
            </Button>
          </div>
        </div>
        
        {/* 提示信息 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        
        {/* 加载状态 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 添加分类按钮 */}
            <div className="flex justify-end">
              <Button onClick={() => setNewCategoryOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加分类
              </Button>
            </div>
            
            {/* 分类列表 */}
            <Accordion type="multiple" className="space-y-4">
              {sortedCategories.map(([categoryId, category]) => (
                <AccordionItem 
                  key={categoryId} 
                  value={categoryId}
                  className="border rounded-lg bg-card"
                >
                  <div className="flex items-center px-4 py-2 border-b">
                    <AccordionTrigger className="flex-1 hover:no-underline py-2">
                      <div className="flex items-center gap-4 flex-1">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">{category.name_en}</div>
                        </div>
                        <Badge variant="secondary">{category.items.length} 项</Badge>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCategory({ id: categoryId, data: { ...category } })
                          setEditCategoryOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => deleteCategory(categoryId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="px-4 pb-4">
                    <div className="text-sm text-muted-foreground mb-4">{category.description}</div>
                    
                    {/* 材料项列表 */}
                    <div className="space-y-2">
                      {category.items.map((item, index) => (
                        <div 
                          key={item.item_id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.name_en}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.required && (
                              <Badge variant="destructive" className="text-xs">必填</Badge>
                            )}
                            {item.has_form && (
                              <Badge variant="outline" className="text-xs">有表单</Badge>
                            )}
                            {item.multiple && (
                              <Badge variant="secondary" className="text-xs">多文件</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveItem(categoryId, index, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveItem(categoryId, index, 'down')}
                              disabled={index === category.items.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingItem({ categoryId, item: { ...item }, isNew: false })
                                setEditItemOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => deleteItem(categoryId, item.item_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* 添加材料项按钮 */}
                    <Button 
                      variant="outline" 
                      className="mt-4 w-full border-dashed"
                      onClick={() => addItem(categoryId)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      添加材料项
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            {sortedCategories.length === 0 && (
              <Card className="p-12 text-center">
                <Tags className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无分类</h3>
                <p className="text-muted-foreground mb-4">点击"添加分类"创建第一个材料分类</p>
                <Button onClick={() => setNewCategoryOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加分类
                </Button>
              </Card>
            )}
          </div>
        )}
      </main>
      
      <Footer />
      
      {/* 新建分类对话框 */}
      <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
            <DialogDescription>创建一个新的材料分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>分类名称（中文）</Label>
              <Input
                value={newCategory.name || ''}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：申请人个人资料"
                className="mt-2"
              />
            </div>
            <div>
              <Label>分类名称（英文）</Label>
              <Input
                value={newCategory.name_en || ''}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name_en: e.target.value }))}
                placeholder="例如：Applicant Profile"
                className="mt-2"
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={newCategory.description || ''}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述这个分类包含哪些类型的材料"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>取消</Button>
            <Button onClick={addCategory}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 编辑分类对话框 */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
            <DialogDescription>修改分类信息</DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4 py-4">
              <div>
                <Label>分类名称（中文）</Label>
                <Input
                  value={editingCategory.data.name}
                  onChange={(e) => setEditingCategory(prev => prev ? {
                    ...prev,
                    data: { ...prev.data, name: e.target.value }
                  } : null)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>分类名称（英文）</Label>
                <Input
                  value={editingCategory.data.name_en}
                  onChange={(e) => setEditingCategory(prev => prev ? {
                    ...prev,
                    data: { ...prev.data, name_en: e.target.value }
                  } : null)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea
                  value={editingCategory.data.description}
                  onChange={(e) => setEditingCategory(prev => prev ? {
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  } : null)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>排序（数字越小越靠前）</Label>
                <Input
                  type="number"
                  value={editingCategory.data.order}
                  onChange={(e) => setEditingCategory(prev => prev ? {
                    ...prev,
                    data: { ...prev.data, order: parseInt(e.target.value) || 0 }
                  } : null)}
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryOpen(false)}>取消</Button>
            <Button onClick={updateCategory}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 编辑材料项对话框 */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem?.isNew ? '添加材料项' : '编辑材料项'}</DialogTitle>
            <DialogDescription>配置材料项的属性</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 py-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>材料项ID</Label>
                    <Input
                      value={editingItem.item.item_id}
                      onChange={(e) => setEditingItem(prev => prev ? {
                        ...prev,
                        item: { ...prev.item, item_id: e.target.value }
                      } : null)}
                      placeholder="唯一标识符，如：resume"
                      className="mt-2"
                      disabled={!editingItem.isNew}
                    />
                  </div>
                  <div>
                    <Label>名称（中文）</Label>
                    <Input
                      value={editingItem.item.name}
                      onChange={(e) => setEditingItem(prev => prev ? {
                        ...prev,
                        item: { ...prev.item, name: e.target.value }
                      } : null)}
                      placeholder="例如：个人简历"
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>名称（英文）</Label>
                  <Input
                    value={editingItem.item.name_en}
                    onChange={(e) => setEditingItem(prev => prev ? {
                      ...prev,
                      item: { ...prev.item, name_en: e.target.value }
                    } : null)}
                    placeholder="例如：Resume/CV"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>描述</Label>
                  <Textarea
                    value={editingItem.item.description}
                    onChange={(e) => setEditingItem(prev => prev ? {
                      ...prev,
                      item: { ...prev.item, description: e.target.value }
                    } : null)}
                    placeholder="描述这个材料项需要收集什么内容"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>提示信息</Label>
                  <Textarea
                    value={editingItem.item.tips || ''}
                    onChange={(e) => setEditingItem(prev => prev ? {
                      ...prev,
                      item: { ...prev.item, tips: e.target.value }
                    } : null)}
                    placeholder="给用户的填写提示"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>支持的文件类型（逗号分隔）</Label>
                  <Input
                    value={editingItem.item.file_types.join(', ')}
                    onChange={(e) => setEditingItem(prev => prev ? {
                      ...prev,
                      item: { ...prev.item, file_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                    } : null)}
                    placeholder="pdf, docx, jpg, png"
                    className="mt-2"
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>必填项</Label>
                      <p className="text-sm text-muted-foreground">这个材料项是否为必须提供</p>
                    </div>
                    <Switch
                      checked={editingItem.item.required}
                      onCheckedChange={(checked) => setEditingItem(prev => prev ? {
                        ...prev,
                        item: { ...prev.item, required: checked }
                      } : null)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>支持多文件</Label>
                      <p className="text-sm text-muted-foreground">是否可以上传多个文件</p>
                    </div>
                    <Switch
                      checked={editingItem.item.multiple || false}
                      onCheckedChange={(checked) => setEditingItem(prev => prev ? {
                        ...prev,
                        item: { ...prev.item, multiple: checked }
                      } : null)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>有采集表单</Label>
                      <p className="text-sm text-muted-foreground">是否有配套的信息采集表单</p>
                    </div>
                    <Switch
                      checked={editingItem.item.has_form}
                      onCheckedChange={(checked) => setEditingItem(prev => prev ? {
                        ...prev,
                        item: { ...prev.item, has_form: checked }
                      } : null)}
                    />
                  </div>
                  
                  {editingItem.item.has_form && (
                    <div>
                      <Label>表单类型</Label>
                      <Select
                        value={editingItem.item.form_type || ''}
                        onValueChange={(value) => setEditingItem(prev => prev ? {
                          ...prev,
                          item: { ...prev.item, form_type: value }
                        } : null)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="选择表单类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employment_info">就职信息采集表</SelectItem>
                          <SelectItem value="contribution_form">贡献信息采集表</SelectItem>
                          <SelectItem value="project_form">项目信息采集表</SelectItem>
                          <SelectItem value="recommender_form">推荐人信息采集表</SelectItem>
                          <SelectItem value="custom">自定义表单</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>系统生成</Label>
                      <p className="text-sm text-muted-foreground">这个材料是否由系统自动生成</p>
                    </div>
                    <Switch
                      checked={editingItem.item.generated || false}
                      onCheckedChange={(checked) => setEditingItem(prev => prev ? {
                        ...prev,
                        item: { ...prev.item, generated: checked }
                      } : null)}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>取消</Button>
            <Button onClick={updateItem}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
