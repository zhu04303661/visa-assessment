"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, FileText, Trash2, Edit2, Download, Zap, AlertCircle, Clock, Tag } from "lucide-react"
import Link from "next/link"
import { knowledgeBaseManager, type KnowledgeRule } from "@/lib/knowledge-base-manager"

export default function KnowledgeBasePage() {
  const { language } = useLanguage()
  const [entries, setEntries] = useState<KnowledgeRule[]>([])
  const [filteredEntries, setFilteredEntries] = useState<KnowledgeRule[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("browse")
  const [editingEntry, setEditingEntry] = useState<KnowledgeRule | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [validationError, setValidationError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")

  const [formData, setFormData] = useState({
    title: "",
    category: "评估标准",
    dimension: "",
    content: "",
    scoringRules: "",
    tags: "",
  })

  // 初始化并加载规则
  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = () => {
    const rules = knowledgeBaseManager.loadRules()
    setEntries(rules)
    setFilteredEntries(rules)
    updateStats()
    setIsInitialized(true)
  }

  const updateStats = () => {
    const statistics = knowledgeBaseManager.getStatistics()
    setStats(statistics)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (!term) {
      setFilteredEntries(entries)
      return
    }
    const filtered = knowledgeBaseManager.searchRules(term)
    setFilteredEntries(filtered)
  }

  const handleSaveEntry = () => {
    setValidationError("")
    setSuccessMessage("")

    if (!formData.title || !formData.content || !formData.category) {
      setValidationError("请填写所有必填项")
      return
    }

    let result

    if (editingEntry) {
      result = knowledgeBaseManager.updateRule(editingEntry.id, {
        title: formData.title,
        category: formData.category,
        dimension: formData.dimension,
        content: formData.content,
        scoringRules: formData.scoringRules
          ? formData.scoringRules.split("\n").filter((r) => r.trim())
          : [],
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
      })
    } else {
      result = knowledgeBaseManager.addRule({
        title: formData.title,
        category: formData.category,
        dimension: formData.dimension,
        content: formData.content,
        scoringRules: formData.scoringRules
          ? formData.scoringRules.split("\n").filter((r) => r.trim())
          : [],
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        source: "manual",
      })
    }

    if (result.success) {
      setSuccessMessage(editingEntry ? "规则已更新" : "规则已添加")
      setTimeout(() => {
        loadRules()
        setFormData({
          title: "",
          category: "评估标准",
          dimension: "",
          content: "",
          scoringRules: "",
          tags: "",
        })
        setEditingEntry(null)
        setActiveTab("browse")
      }, 1500)
    } else {
      setValidationError(result.error || "保存失败")
    }
  }

  const handleEditEntry = (entry: KnowledgeRule) => {
    setEditingEntry(entry)
    setFormData({
      title: entry.title,
      category: entry.category,
      dimension: entry.dimension || "",
      content: entry.content,
      scoringRules: (entry.scoringRules || []).join("\n"),
      tags: (entry.tags || []).join(", "),
    })
    setActiveTab("add")
  }

  const handleDeleteEntry = (id: string) => {
    if (!confirm("确定删除此规则?")) return
    const result = knowledgeBaseManager.deleteRule(id)
    if (result.success) {
      loadRules()
      setSuccessMessage("规则已删除")
      setTimeout(() => setSuccessMessage(""), 2000)
    }
  }

  const handleExport = () => {
    const json = knowledgeBaseManager.exportRules()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `knowledge-base-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const result = knowledgeBaseManager.importRules(content, true)

        if (result.success) {
          setSuccessMessage(`成功导入 ${result.count} 个规则`)
          loadRules()
          setTimeout(() => setSuccessMessage(""), 2000)
        } else {
          setValidationError(result.error || "导入失败")
        }
      } catch (error) {
        setValidationError("无效的JSON文件")
      }
    }
    reader.readAsText(file)
  }

  const handleInitializeWithDefaults = async () => {
    try {
      const response = await fetch("/kb-actual-scoring-items.json")
      if (response.ok) {
        const data = await response.json()
        const result = knowledgeBaseManager.importRules(JSON.stringify(data), false)
        if (result.success) {
          setSuccessMessage(`已加载 ${result.count} 个评分规则`)
          loadRules()
          setTimeout(() => setSuccessMessage(""), 2000)
          return
        }
      }
    } catch (e) {
      console.warn("Failed to load kb-actual-scoring-items.json")
    }

    // Fallback to init rules
    try {
      const response = await fetch("/kb-init-rules.json")
      if (response.ok) {
        const data = await response.json()
        const result = knowledgeBaseManager.importRules(JSON.stringify(data), false)
        if (result.success) {
          setSuccessMessage(`已加载 ${result.count} 个GTV评分规则`)
          loadRules()
          setTimeout(() => setSuccessMessage(""), 2000)
        }
      }
    } catch (e) {
      setValidationError("初始化失败")
    }
  }

  // 加载 GTV 评估表中提取的规则
  const handleLoadGTVAssessmentRules = async () => {
    try {
      const response = await fetch("/kb-gtv-assessment-rules.json")
      if (response.ok) {
        const data = await response.json()
        const result = knowledgeBaseManager.importRules(JSON.stringify(data), true)
        if (result.success) {
          setSuccessMessage(`成功导入 ${result.count} 条GTV评估规则`)
          loadRules()
          setTimeout(() => setSuccessMessage(""), 3000)
        } else {
          setValidationError(result.error || "导入GTV规则失败")
        }
      } else {
        setValidationError("无法找到GTV评估规则文件")
      }
    } catch (e) {
      setValidationError("加载GTV评估规则失败：" + String(e))
    }
  }

  // 加载 Checklist 中提取的规则
  const handleLoadChecklistRules = async () => {
    try {
      const response = await fetch("/kb-checklist-rules.json")
      if (response.ok) {
        const data = await response.json()
        const result = knowledgeBaseManager.importRules(JSON.stringify(data), true)
        if (result.success) {
          setSuccessMessage(`成功导入 ${result.count} 条Checklist评估规则`)
          loadRules()
          setTimeout(() => setSuccessMessage(""), 3000)
        } else {
          setValidationError(result.error || "导入Checklist规则失败")
        }
      } else {
        setValidationError("无法找到Checklist规则文件")
      }
    } catch (e) {
      setValidationError("加载Checklist规则失败：" + String(e))
    }
  }

  // 加载详细的 Checklist 规则
  const handleLoadChecklistDetailedRules = async () => {
    try {
      const response = await fetch("/kb-checklist-detailed-rules.json")
      if (response.ok) {
        const data = await response.json()
        const result = knowledgeBaseManager.importRules(JSON.stringify(data), true)
        if (result.success) {
          setSuccessMessage(`成功导入 ${result.count} 条详细Checklist评估规则`)
          loadRules()
          setTimeout(() => setSuccessMessage(""), 3000)
        } else {
          setValidationError(result.error || "导入详细Checklist规则失败")
        }
      } else {
        setValidationError("无法找到详细Checklist规则文件")
      }
    } catch (e) {
      setValidationError("加载详细Checklist规则失败：" + String(e))
    }
  }

  // 空状态
  if (entries.length === 0 && isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link href="/assessment" className="inline-flex items-center gap-2 text-blue-600 mb-4 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4" />
              {language === "en" ? "Back" : "返回"}
            </Link>
            <h1 className="text-4xl font-bold text-gray-900">
              {language === "en" ? "Knowledge Base" : "知识库管理"}
            </h1>
            <p className="text-gray-600 mt-2">
              {language === "en" ? "Manage GTV assessment rules" : "管理GTV评估规则和打分条款"}
            </p>
          </div>

          <div className="max-w-2xl">
            <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  {language === "en" ? "Quick Start" : "快速开始"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleInitializeWithDefaults}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {language === "en"
                    ? "Load Pre-defined Scoring Rules"
                    : "加载预定义的评分规则"}
                </Button>

                <Button
                  onClick={handleLoadGTVAssessmentRules}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-base"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {language === "en"
                    ? "Import GTV Assessment Rules"
                    : "导入GTV评估表规则"}
                </Button>

                <Button
                  onClick={handleLoadChecklistRules}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-base"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {language === "en"
                    ? "Import Checklist Rules"
                    : "导入Checklist规则"}
                </Button>

                <Button
                  onClick={handleLoadChecklistDetailedRules}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-base"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {language === "en"
                    ? "Import Detailed Checklist Rules"
                    : "导入详细Checklist规则"}
                </Button>

                <label>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-2 border-gray-300 py-6 text-base"
                  >
                    <div className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {language === "en" ? "Import JSON File" : "导入 JSON 文件"}
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                    </div>
                  </Button>
                </label>

                <Button
                  onClick={() => setActiveTab("add")}
                  variant="outline"
                  className="w-full border-2 border-gray-300 py-6 text-base"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {language === "en" ? "Create First Entry" : "创建第一个条目"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Link href="/assessment" className="inline-flex items-center gap-2 text-blue-600 mb-4 hover:text-blue-800">
            <ArrowLeft className="h-4 w-4" />
            {language === "en" ? "Back" : "返回"}
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                {language === "en" ? "Knowledge Base" : "知识库管理"}
              </h1>
              <p className="text-gray-600 mt-2">
                {language === "en" ? "Manage GTV assessment rules" : "管理GTV评估规则和打分条款"}
              </p>
            </div>
            {stats && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm">
                <div className="text-gray-600">
                  <p>📊 总规则数: <strong>{stats.total}</strong></p>
                  <p>✅ 活跃规则: <strong>{stats.active}</strong></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 错误和成功消息 */}
        {validationError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{validationError}</p>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Zap className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {/* 标签页 */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          {["browse", "add", "upload", "stats"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "browse"
                ? language === "en"
                  ? "Browse"
                  : "浏览"
                : tab === "add"
                  ? language === "en"
                    ? "Add/Edit"
                    : "添加/编辑"
                  : tab === "upload"
                    ? language === "en"
                      ? "Import"
                      : "导入"
                    : language === "en"
                      ? "Statistics"
                      : "统计"}
            </button>
          ))}
          <div className="ml-auto">
            <Button onClick={handleExport} disabled={entries.length === 0} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {language === "en" ? "Export" : "导出"}
            </Button>
          </div>
        </div>

        {/* 浏览标签页 */}
        {activeTab === "browse" && (
          <div className="space-y-6">
            <Input
              placeholder={language === "en" ? "Search..." : "搜索..."}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-md"
            />
            {filteredEntries.length === 0 ? (
              <Card className="border-dashed text-center p-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {language === "en" ? "No entries yet" : "还没有知识条目"}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle>{entry.title}</CardTitle>
                            {!entry.isActive && (
                              <Badge variant="secondary">
                                {language === "en" ? "Inactive" : "已禁用"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline">{entry.category}</Badge>
                            {entry.dimension && <Badge variant="secondary">{entry.dimension}</Badge>}
                            {entry.source && (
                              <Badge variant="outline" className="text-xs">
                                {language === "en" ? "Source" : "来源"}: {entry.source}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {language === "en" ? "Created" : "创建"}:{" "}
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {language === "en" ? "Updated" : "更新"}:{" "}
                              {new Date(entry.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mb-3">
                            ID: <code className="bg-gray-100 px-2 py-1 rounded">{entry.id}</code>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditEntry(entry)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-3">{entry.content}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">标签:</p>
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.scoringRules && entry.scoringRules.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <p className="font-medium text-sm mb-2">
                            {language === "en" ? "Rules" : "评分规则"}
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {entry.scoringRules.map((rule, i) => (
                              <li key={i}>• {rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 添加/编辑标签页 */}
        {activeTab === "add" && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>
                {editingEntry ? (language === "en" ? "Edit" : "编辑") : language === "en" ? "Add New" : "添加新规则"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{language === "en" ? "Title" : "标题"}</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {language === "en" ? "Category" : "分类"}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option>评估标准</option>
                    <option>评分规则</option>
                    <option>教育背景</option>
                    <option>工作经验</option>
                    <option>技术专长</option>
                    <option>领导力</option>
                    <option>行业影响力</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {language === "en" ? "Dimension" : "维度"}
                  </label>
                  <select
                    value={formData.dimension}
                    onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- 选择维度 --</option>
                    <option value="education">education (教育)</option>
                    <option value="experience">experience (经验)</option>
                    <option value="technical">technical (技术)</option>
                    <option value="leadership">leadership (领导力)</option>
                    <option value="impact">impact (影响力)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{language === "en" ? "Content" : "内容"}</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "en" ? "Scoring Rules" : "评分规则"}
                </label>
                <Textarea
                  value={formData.scoringRules}
                  onChange={(e) => setFormData({ ...formData, scoringRules: e.target.value })}
                  rows={4}
                  placeholder={language === "en" ? "Rule 1\nRule 2" : "规则1\n规则2"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "en" ? "Tags" : "标签"}
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder={language === "en" ? "tag1, tag2, tag3" : "标签1, 标签2, 标签3"}
                />
                <p className="text-xs text-gray-500 mt-1">{language === "en" ? "Separated by comma" : "用逗号分隔"}</p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      title: "",
                      category: "评估标准",
                      dimension: "",
                      content: "",
                      scoringRules: "",
                      tags: "",
                    })
                    setEditingEntry(null)
                    setActiveTab("browse")
                  }}
                >
                  {language === "en" ? "Cancel" : "取消"}
                </Button>
                <Button onClick={handleSaveEntry}>{language === "en" ? "Save" : "保存"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 导入标签页 */}
        {activeTab === "upload" && (
          <Card className="border-dashed border-2 max-w-2xl">
            <CardHeader>
              <CardTitle>{language === "en" ? "Import" : "导入知识"}</CardTitle>
            </CardHeader>
            <CardContent className="py-12 text-center space-y-6">
              <label className="cursor-pointer">
                <div className="text-blue-600 font-medium hover:text-blue-800">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  {language === "en" ? "Click to select JSON file" : "点击选择 JSON 文件"}
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>
        )}

        {/* 统计标签页 */}
        {activeTab === "stats" && stats && (
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{language === "en" ? "Statistics" : "统计信息"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">{language === "en" ? "Total Rules" : "总规则数"}</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">{language === "en" ? "Active Rules" : "活跃规则"}</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-medium mb-3">{language === "en" ? "By Category" : "按分类统计"}</p>
                  <div className="space-y-2">
                    {Object.entries(stats.byCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{category}</span>
                        <Badge variant="outline">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-medium mb-3">{language === "en" ? "By Dimension" : "按维度统计"}</p>
                  <div className="space-y-2">
                    {Object.entries(stats.byDimension).map(([dimension, count]) => (
                      <div key={dimension} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{dimension}</span>
                        <Badge variant="outline">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-medium mb-3">{language === "en" ? "By Source" : "按来源统计"}</p>
                  <div className="space-y-2">
                    {Object.entries(stats.bySource).map(([source, count]) => (
                      <div key={source} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{source}</span>
                        <Badge variant="outline">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
