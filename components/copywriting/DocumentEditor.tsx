"use client"

import { useState, useEffect, useCallback } from "react"
import { useAssistant } from "./AssistantContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import Highlight from "@tiptap/extension-highlight"
import Link from "@tiptap/extension-link"
import {
  Save,
  Loader2,
  CheckCircle,
  Sparkles,
  Copy,
  Download,
  FileSearch,
  ExternalLink,
  FileText,
  Award,
  RefreshCw,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link as LinkIcon,
  Undo,
  Redo,
  Minus
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Separator
} from "@/components/ui/separator"

interface DocumentEditorProps {
  docType: string
  docName: string
  content: string
  onSave: (content: string) => Promise<boolean>
  onChange: (content: string) => void
}

// 工具栏按钮组件
function ToolbarButton({ 
  onClick, 
  isActive = false, 
  disabled = false,
  tooltip,
  children 
}: { 
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  tooltip: string
  children: React.ReactNode 
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
              p-1.5 rounded transition-colors
              ${isActive 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' 
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function DocumentEditor({
  docType,
  docName,
  content,
  onSave,
  onChange
}: DocumentEditorProps) {
  const { pendingSuggestions, applySuggestion, dismissSuggestion } = useAssistant()
  
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false)
  const [evidenceTab, setEvidenceTab] = useState<"selected" | "all">("selected")
  const [allEvidence, setAllEvidence] = useState<Evidence[]>([])
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<Set<string>>(new Set())
  const [loadingEvidence, setLoadingEvidence] = useState(false)

  // 证据类型定义
  interface Evidence {
    id: string
    title: string
    description: string
    category: string
    source?: string
    source_file?: string
    strength?: string
  }

  // 初始化 TipTap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({
        placeholder: `在此编辑${docName}...`
      }),
      Highlight.configure({
        multicolor: false
      }),
      Link.configure({
        openOnClick: false
      })
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6 prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-3 prose-li:my-1'
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setHasUnsavedChanges(true)
      onChange(html)
    }
  })

  // 同步外部内容
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !hasUnsavedChanges) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor, hasUnsavedChanges])

  // 从 URL 获取 projectId
  const getProjectId = () => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/copywriting\/([^/]+)/)
      return match ? match[1] : null
    }
    return null
  }

  // 加载 framework 中的证据
  const loadEvidenceFromFramework = useCallback(async () => {
    const projectId = getProjectId()
    if (!projectId) {
      console.error("无法获取 projectId")
      return
    }

    try {
      setLoadingEvidence(true)
      console.log("正在加载 Framework 数据, projectId:", projectId)
      
      const response = await fetch(`/api/copywriting/api/projects/${projectId}/framework`)
      const data = await response.json()
      
      console.log("Framework API 响应:", data)
      
      if (data.success && data.data) {
        const framework = data.data.framework_data || data.data
        console.log("Framework 数据结构:", framework)
        const evidenceList: Evidence[] = []
        let idCounter = 0

        // 提取 MC 标准中的证据
        const mcKeyMap: Record<string, string> = {
          'MC1_产品团队领导力': 'MC1 产品/团队领导力',
          'MC2_商业发展': 'MC2 商业发展',
          'MC3_非营利组织': 'MC3 非营利组织',
          'MC4_专家评审': 'MC4 专家评审'
        }
        if (framework.MC_必选标准) {
          Object.entries(mcKeyMap).forEach(([key, label]) => {
            const criteria = framework.MC_必选标准[key]
            if (criteria && criteria.applicable !== false && criteria.evidence_list && Array.isArray(criteria.evidence_list)) {
              criteria.evidence_list.forEach((ev: { title?: string; description?: string; source?: string; source_file?: string; strength?: string }) => {
                if (ev.title) {
                  evidenceList.push({
                    id: `mc-${idCounter++}`,
                    title: ev.title,
                    description: ev.description || '',
                    category: label,
                    source: ev.source,
                    source_file: ev.source_file,
                    strength: ev.strength
                  })
                }
              })
            }
          })
        }

        // 提取 OC 标准中的证据
        const ocKeyMap: Record<string, string> = {
          'OC1_创新': 'OC1 创新',
          'OC2_行业认可': 'OC2 行业认可',
          'OC3_重大贡献': 'OC3 重大贡献',
          'OC4_学术贡献': 'OC4 学术贡献'
        }
        if (framework.OC_可选标准) {
          Object.entries(ocKeyMap).forEach(([key, label]) => {
            const criteria = framework.OC_可选标准[key]
            if (criteria && criteria.applicable !== false && criteria.evidence_list && Array.isArray(criteria.evidence_list)) {
              criteria.evidence_list.forEach((ev: { title?: string; description?: string; source?: string; source_file?: string; strength?: string }) => {
                if (ev.title) {
                  evidenceList.push({
                    id: `oc-${idCounter++}`,
                    title: ev.title,
                    description: ev.description || '',
                    category: label,
                    source: ev.source,
                    source_file: ev.source_file,
                    strength: ev.strength
                  })
                }
              })
            }
          })
        }

        // 提取推荐人信息
        if (framework.推荐信) {
          ['推荐人1', '推荐人2', '推荐人3'].forEach((key, idx) => {
            const recommender = framework.推荐信[key]
            if (recommender && recommender.name) {
              evidenceList.push({
                id: `rec-${idCounter++}`,
                title: `推荐人 ${idx + 1}: ${recommender.name}`,
                description: `${recommender.title || ''} @ ${recommender.organization || ''}\n推荐角度: ${recommender.recommendation_angle || recommender.relationship || ''}`,
                category: '推荐信',
                source: recommender.source_file
              })
            }
          })
        }

        // 提取通用证据清单
        if (framework.证据清单 && Array.isArray(framework.证据清单)) {
          framework.证据清单.forEach((ev: { title?: string; description?: string; source?: string; category?: string }) => {
            if (ev.title) {
              evidenceList.push({
                id: `gen-${idCounter++}`,
                title: ev.title,
                description: ev.description || '',
                category: ev.category || '通用证据',
                source: ev.source
              })
            }
          })
        }

        // 如果个人陈述要点中有成就，也提取
        if (framework.个人陈述要点?.key_achievements && Array.isArray(framework.个人陈述要点.key_achievements)) {
          framework.个人陈述要点.key_achievements.forEach((item: string | { achievement?: string; evidence?: string }) => {
            const achievement = typeof item === 'string' ? item : item.achievement
            if (achievement) {
              evidenceList.push({
                id: `ach-${idCounter++}`,
                title: achievement,
                description: typeof item === 'object' && item.evidence ? item.evidence : '',
                category: '关键成就'
              })
            }
          })
        }

        // 提取领域定位作为背景信息
        if (framework.领域定位) {
          const pos = framework.领域定位
          if (pos.核心论点) {
            evidenceList.push({
              id: `pos-${idCounter++}`,
              title: '核心论点',
              description: pos.核心论点,
              category: '领域定位'
            })
          }
          if (pos.细分领域) {
            evidenceList.push({
              id: `pos-${idCounter++}`,
              title: '细分领域',
              description: `${pos.细分领域} - ${pos.岗位定位 || ''}`,
              category: '领域定位'
            })
          }
        }

        console.log("解析到的证据数量:", evidenceList.length)
        setAllEvidence(evidenceList)
      } else {
        console.error("Framework API 返回失败:", data)
      }
    } catch (err) {
      console.error("加载证据失败:", err)
    } finally {
      setLoadingEvidence(false)
    }
  }, [])

  // 打开证据对话框时加载数据
  useEffect(() => {
    if (evidenceDialogOpen && allEvidence.length === 0) {
      loadEvidenceFromFramework()
    }
  }, [evidenceDialogOpen, allEvidence.length, loadEvidenceFromFramework])

  // 切换证据选择
  const toggleEvidence = (evidenceId: string) => {
    setSelectedEvidenceIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(evidenceId)) {
        newSet.delete(evidenceId)
      } else {
        newSet.add(evidenceId)
      }
      return newSet
    })
  }

  // 获取已选择的证据
  const selectedEvidence = allEvidence.filter(ev => selectedEvidenceIds.has(ev.id))

  // 按类别分组证据
  const groupEvidenceByCategory = (evidenceList: Evidence[]) => {
    const groups: Record<string, Evidence[]> = {}
    evidenceList.forEach(ev => {
      if (!groups[ev.category]) {
        groups[ev.category] = []
      }
      groups[ev.category].push(ev)
    })
    return groups
  }

  // 获取当前文档的待处理建议
  const documentSuggestions = pendingSuggestions.filter(
    s => s.targetDocument === docType && !s.applied
  )

  // 保存文档（产生新版本）
  const handleSave = async () => {
    if (!editor) return
    const html = editor.getHTML()
    if (!html.trim() || html === '<p></p>') return
    
    try {
      setSaving(true)
      const success = await onSave(html)
      
      if (success) {
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
        toast.success("保存成功，已创建新版本")
      } else {
        toast.error("保存失败")
      }
    } catch (error) {
      console.error("保存失败:", error)
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  // 应用建议
  const handleApplySuggestion = (suggestion: typeof documentSuggestions[0]) => {
    if (!editor) return
    
    if (suggestion.type === "add") {
      editor.commands.insertContent('<p>' + suggestion.suggestedText + '</p>')
    }
    
    setHasUnsavedChanges(true)
    applySuggestion(suggestion.id)
    toast.success("已应用建议")
  }

  // 复制内容
  const handleCopy = () => {
    if (!editor) return
    const text = editor.getText()
    navigator.clipboard.writeText(text)
    toast.success("已复制到剪贴板")
  }

  // 下载文档
  const handleDownload = () => {
    if (!editor) return
    const html = editor.getHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docName}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("下载成功")
  }

  // 添加链接
  const addLink = () => {
    if (!editor) return
    const url = window.prompt('输入链接地址:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {/* 工具栏 - Word 风格 */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        {/* 第一行：格式化工具 */}
        <div className="px-3 py-1.5 flex items-center gap-0.5 flex-wrap border-b border-slate-100 dark:border-slate-700/50">
          {/* 撤销/重做 */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip="撤销 (⌘Z)">
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip="重做 (⌘⇧Z)">
            <Redo className="h-4 w-4" />
          </ToolbarButton>
          
          <Separator orientation="vertical" className="mx-1.5 h-6" />
          
          {/* 标题 */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} tooltip="标题 1">
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} tooltip="标题 2">
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} tooltip="标题 3">
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          
          <Separator orientation="vertical" className="mx-1.5 h-6" />
          
          {/* 文本格式 */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tooltip="加粗 (⌘B)">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tooltip="斜体 (⌘I)">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tooltip="下划线 (⌘U)">
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tooltip="删除线">
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} tooltip="高亮">
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          
          <Separator orientation="vertical" className="mx-1.5 h-6" />
          
          {/* 列表 */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} tooltip="无序列表">
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} tooltip="有序列表">
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          
          <Separator orientation="vertical" className="mx-1.5 h-6" />
          
          {/* 对齐 */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} tooltip="左对齐">
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} tooltip="居中">
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} tooltip="右对齐">
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} tooltip="两端对齐">
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>
          
          <Separator orientation="vertical" className="mx-1.5 h-6" />
          
          {/* 插入 */}
          <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} tooltip="插入链接">
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} tooltip="分割线">
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </div>
        
        {/* 第二行：功能按钮 */}
        <div className="px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEvidenceDialogOpen(true)}
              className="h-7 px-2.5 text-xs"
            >
              <FileSearch className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
              相关证据
            </Button>
            
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-orange-300 text-orange-600 bg-orange-50">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 animate-pulse" />
                未保存
              </Badge>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                {lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 w-7 p-0">
              <Copy className="h-3.5 w-3.5 text-slate-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 w-7 p-0">
              <Download className="h-3.5 w-3.5 text-slate-500" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="h-7 px-3 text-xs bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              保存
            </Button>
          </div>
        </div>
      </div>
      
      {/* AI 建议栏 */}
      {documentSuggestions.length > 0 && (
        <div className="shrink-0 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI 建议</span>
            <Badge className="bg-purple-100 text-purple-700 text-xs">{documentSuggestions.length}</Badge>
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {documentSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-purple-800/30">
                <p className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate">{suggestion.reason}</p>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-purple-600" onClick={() => handleApplySuggestion(suggestion)}>
                  应用
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-500" onClick={() => dismissSuggestion(suggestion.id)}>
                  忽略
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 编辑区域 - 所见即所得 */}
      <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <EditorContent editor={editor} className="min-h-full" />
        </div>
      </div>
      
      {/* 底部状态栏 */}
      <div className="shrink-0 px-4 py-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
        <span>{editor.storage.characterCount?.characters?.() || editor.getText().length} 字符</span>
        <span>⌘S 保存</span>
      </div>

      {/* 相关证据对话框 */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 pb-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500">
                <FileSearch className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold">证据管理</div>
                <div className="text-sm font-normal text-slate-500">
                  管理「{docName}」使用的证据材料
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={evidenceTab} onValueChange={(v) => setEvidenceTab(v as "selected" | "all")} className="flex-1 flex flex-col min-h-0">
            <TabsList className="shrink-0 grid w-full grid-cols-2 h-10">
              <TabsTrigger value="selected" className="text-sm">
                当前使用的证据
                {selectedEvidenceIds.size > 0 && (
                  <Badge className="ml-2 bg-indigo-100 text-indigo-700">{selectedEvidenceIds.size}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-sm">
                全部可用证据
                {allEvidence.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{allEvidence.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="selected" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[400px]">
                {selectedEvidence.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 mb-2">尚未选择任何证据</p>
                    <p className="text-xs text-slate-400">切换到「全部可用证据」标签页选择</p>
                  </div>
                ) : (
                  <div className="space-y-4 pr-4">
                    {Object.entries(groupEvidenceByCategory(selectedEvidence)).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-900 py-1">
                          <Award className="h-4 w-4 text-indigo-500" />
                          <span className="font-medium text-sm">{category}</span>
                          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                        </div>
                        {items.map((ev) => (
                          <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                            <CheckCircle className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{ev.title}</div>
                              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => toggleEvidence(ev.id)} className="h-7 px-2 text-xs text-red-600 hover:bg-red-50">
                              移除
                            </Button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="all" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[400px]">
                {loadingEvidence ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="ml-2 text-sm text-slate-500">加载中...</span>
                  </div>
                ) : allEvidence.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 mb-2">暂无可用证据</p>
                    <p className="text-xs text-slate-400 mb-4">请先在 Framework 页面构建证据框架</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={loadEvidenceFromFramework}>
                        <RefreshCw className="h-4 w-4 mr-2" />重新加载
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        const projectId = getProjectId()
                        if (projectId) window.open(`/copywriting/${projectId}/framework`, '_blank')
                      }}>
                        <ExternalLink className="h-4 w-4 mr-2" />前往 Framework
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pr-4">
                    {Object.entries(groupEvidenceByCategory(allEvidence)).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-900 py-1 z-10">
                          <Award className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-sm">{category}</span>
                          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                        </div>
                        {items.map((ev) => {
                          const isSelected = selectedEvidenceIds.has(ev.id)
                          return (
                            <div 
                              key={ev.id}
                              onClick={() => toggleEvidence(ev.id)}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-indigo-50 border-indigo-200' 
                                  : 'bg-slate-50 border-slate-100 hover:border-indigo-200'
                              }`}
                            >
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'
                              }`}>
                                {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{ev.title}</div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</div>
                                {ev.strength && <Badge variant="outline" className="text-xs mt-2">强度: {ev.strength}</Badge>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          <div className="shrink-0 pt-4 border-t flex items-center justify-between">
            <span className="text-xs text-slate-500">已选择 {selectedEvidenceIds.size} / {allEvidence.length} 项</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadEvidenceFromFramework} disabled={loadingEvidence}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loadingEvidence ? 'animate-spin' : ''}`} />刷新
              </Button>
              <Button size="sm" onClick={() => setEvidenceDialogOpen(false)}>确定</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
