"use client"

import { useAssistant, Suggestion } from "./AssistantContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react"
import { useState } from "react"

interface SuggestionCardProps {
  suggestion: Suggestion
  compact?: boolean
}

export function SuggestionCard({ suggestion, compact = false }: SuggestionCardProps) {
  const { applySuggestion, dismissSuggestion, setActiveDocument, updateDocumentContent, documentContents } = useAssistant()
  const [expanded, setExpanded] = useState(false)

  // 获取操作类型图标
  const getTypeIcon = () => {
    switch (suggestion.type) {
      case "edit":
        return <Edit3 className="h-3.5 w-3.5" />
      case "add":
        return <Plus className="h-3.5 w-3.5" />
      case "delete":
        return <Trash2 className="h-3.5 w-3.5" />
      default:
        return <Edit3 className="h-3.5 w-3.5" />
    }
  }

  // 获取操作类型标签
  const getTypeLabel = () => {
    switch (suggestion.type) {
      case "edit":
        return "修改"
      case "add":
        return "添加"
      case "delete":
        return "删除"
      default:
        return "操作"
    }
  }

  // 获取操作类型颜色
  const getTypeColor = () => {
    switch (suggestion.type) {
      case "edit":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
      case "add":
        return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
      case "delete":
        return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  // 应用建议
  const handleApply = () => {
    // 获取当前文档内容
    const currentContent = documentContents[suggestion.targetDocument] || ""
    let newContent = currentContent
    
    if (suggestion.type === "edit" && suggestion.originalText) {
      newContent = currentContent.replace(suggestion.originalText, suggestion.suggestedText)
    } else if (suggestion.type === "add") {
      newContent = currentContent + "\n\n" + suggestion.suggestedText
    } else if (suggestion.type === "delete" && suggestion.originalText) {
      newContent = currentContent.replace(suggestion.originalText, "")
    }
    
    // 更新文档内容
    updateDocumentContent(suggestion.targetDocument, newContent)
    
    // 切换到目标文档
    setActiveDocument(suggestion.targetDocument)
    
    // 标记建议已应用
    applySuggestion(suggestion.id)
  }

  // 紧凑模式
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border text-sm">
        <Badge variant="outline" className={`text-xs ${getTypeColor()}`}>
          {getTypeIcon()}
          <span className="ml-1">{getTypeLabel()}</span>
        </Badge>
        <span className="flex-1 truncate text-muted-foreground">
          {suggestion.reason}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleApply}
          >
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => dismissSuggestion(suggestion.id)}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    )
  }

  // 完整模式
  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
      <CardContent className="p-3">
        {/* 头部 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${getTypeColor()}`}>
              {getTypeIcon()}
              <span className="ml-1">{getTypeLabel()}</span>
            </Badge>
            <Badge variant="secondary" className="text-xs font-normal">
              <FileText className="h-3 w-3 mr-1" />
              {suggestion.targetDocument}
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* 建议原因 */}
        <p className="text-sm text-muted-foreground mb-2">
          {suggestion.reason}
        </p>
        
        {/* 展开的详细内容 */}
        {expanded && (
          <div className="space-y-2 mb-3">
            {/* 原文（如果有） */}
            {suggestion.originalText && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">原文：</p>
                <p className="text-sm text-red-600 dark:text-red-400 line-clamp-3">
                  {suggestion.originalText}
                </p>
              </div>
            )}
            
            {/* 建议内容 */}
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                {suggestion.type === "delete" ? "将被删除" : "建议内容："}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 line-clamp-5">
                {suggestion.suggestedText}
              </p>
            </div>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 h-8"
            onClick={handleApply}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            应用建议
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => dismissSuggestion(suggestion.id)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            忽略
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
