"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Copy, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

type DebugRecord = {
  id: string
  timestamp: string
  applicantName: string
  field: string
  prompt: string
  rawResponse: string
}

export function DebugPanel() {
  const { language } = useLanguage()
  const [records, setRecords] = useState<DebugRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<DebugRecord | null>(null)

  useEffect(() => {
    // Load debug records from localStorage
    const stored = localStorage.getItem("debugRecords")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setRecords(parsed)
        if (parsed.length > 0) {
          setSelectedRecord(parsed[0])
        }
      } catch (error) {
        console.error("[v0] Failed to parse debug records:", error)
      }
    }
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearAllRecords = () => {
    if (confirm(language === "en" ? "Clear all debug records?" : "清除所有调试记录？")) {
      localStorage.removeItem("debugRecords")
      setRecords([])
      setSelectedRecord(null)
    }
  }

  const deleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id)
    setRecords(updated)
    localStorage.setItem("debugRecords", JSON.stringify(updated))
    if (selectedRecord?.id === id) {
      setSelectedRecord(updated[0] || null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {language === "en" ? "Back to Home" : "返回首页"}
            </Link>
          </Button>
          <LanguageSwitcher />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {language === "en" ? "Debug Console" : "调试控制台"}
            </h1>
            <p className="text-pretty text-lg text-muted-foreground">
              {language === "en"
                ? "View AI prompts and responses for assessment optimization"
                : "查看AI提示词和响应内容，用于评估优化"}
            </p>
          </div>
          {records.length > 0 && (
            <Button variant="destructive" onClick={clearAllRecords}>
              <Trash2 className="mr-2 h-4 w-4" />
              {language === "en" ? "Clear All" : "清除全部"}
            </Button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              {language === "en" ? "No debug records available" : "暂无调试记录"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {language === "en"
                ? "Complete an assessment to generate debug information"
                : "完成一次评估以生成调试信息"}
            </p>
            <Button asChild className="mt-6">
              <Link href="/assessment">{language === "en" ? "Start Assessment" : "开始评估"}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Records List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">{language === "en" ? "Assessment Records" : "评估记录"}</CardTitle>
              <CardDescription>
                {records.length} {language === "en" ? "records" : "条记录"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {records.map((record) => (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                    selectedRecord?.id === record.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-foreground">{record.applicantName}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteRecord(record.id)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{record.field}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(record.timestamp).toLocaleString()}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Debug Details */}
          {selectedRecord && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedRecord.applicantName}</CardTitle>
                    <CardDescription>{selectedRecord.field}</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {new Date(selectedRecord.timestamp).toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Prompt Section */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {language === "en" ? "Prompt Sent to GPT" : "发送给GPT的提示词"}
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedRecord.prompt)}>
                      <Copy className="mr-2 h-3 w-3" />
                      {language === "en" ? "Copy" : "复制"}
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap text-xs text-foreground">{selectedRecord.prompt}</pre>
                  </div>
                </div>

                {/* Response Section */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {language === "en" ? "Raw Response from GPT" : "GPT返回的原始内容"}
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedRecord.rawResponse)}>
                      <Copy className="mr-2 h-3 w-3" />
                      {language === "en" ? "Copy" : "复制"}
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap text-xs text-foreground">{selectedRecord.rawResponse}</pre>
                  </div>
                </div>

                {/* Info Box */}
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {language === "en"
                      ? "This debug information can be used to optimize AI assessment prompts and improve evaluation accuracy. Use the prompt and response data to identify areas for improvement in the assessment logic."
                      : "此调试信息可用于优化AI评估提示词和提高评估准确性。使用提示词和响应数据来识别评估逻辑中需要改进的地方。"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
