"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Loader2, FileText, Upload, AlertCircle, CheckCircle2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ErrorDialog } from "@/components/error-dialog"
import { AssessmentLoading } from "@/components/assessment-loading"

type FormData = {
  name: string
  email: string
  phone: string
  field: string
  resumeText: string
  additionalInfo: string
}

type ErrorState = {
  isOpen: boolean
  title: string
  message: string
  errorDetails?: string
}

export function AssessmentForm() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<"paste" | "upload">("upload")
  const [errorState, setErrorState] = useState<ErrorState>({
    isOpen: false,
    title: "",
    message: "",
    errorDetails: undefined,
  })

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    field: "digital-technology", // 默认值，后端会自动分析实际领域
    resumeText: "",
    additionalInfo: "",
  })

  // 计算表单完成度
  const formProgress = () => {
    let completed = 0
    let total = 3
    if (formData.name.trim()) completed++
    if (formData.email.trim()) completed++
    if (formData.resumeText.trim() || uploadedFile) completed++
    return { completed, total, percentage: (completed / total) * 100 }
  }

  const progress = formProgress()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)

    // Read file content
    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      setFormData((prevData) => ({ ...prevData, resumeText: text }))
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("[v0] 表单提交开始...")
    console.log("[v0] 表单数据:", formData)
    console.log("[v0] 当前URL:", window.location.href)

    // 验证简历：如果是文件上传模式，检查是否有文件；如果是粘贴模式，检查文本长度
    if (uploadMethod === "upload") {
      if (!uploadedFile) {
        console.log("[v0] 文件上传模式但未选择文件")
        setErrorState({
          isOpen: true,
          title: language === "en" ? "No File Selected" : "未选择文件",
          message: language === "en" ? "Please select a resume file to upload" : "请选择要上传的简历文件",
        })
        return
      }
    } else {
      if (!formData.resumeText || formData.resumeText.trim().length < 50) {
        console.log("[v0] 简历文本长度不足")
        setErrorState({
          isOpen: true,
          title: language === "en" ? "Invalid Resume" : "简历无效",
          message: t("form.upload.resume.error") || (language === "en" ? "Please provide at least 50 characters" : "请提供至少50个字符的有效简历"),
        })
        return
      }
    }

    console.log("[v0] 开始设置状态...")
    setIsSubmitting(true)
    setIsAnalyzing(true)
    console.log("[v0] 状态已设置，开始API调用...")

    try {
      console.log("[v0] Submitting resume for analysis...")

      let response: Response
      
      if (uploadedFile && uploadMethod === "upload") {
        // 使用文件上传方式，调用后台Python API服务
        console.log("[v0] Using file upload method, calling Python API service...")
        
        const formDataToSend = new FormData()
        formDataToSend.append('resume', uploadedFile)
        formDataToSend.append('name', formData.name)
        formDataToSend.append('email', formData.email)
        formDataToSend.append('field', formData.field)
        formDataToSend.append('additionalInfo', formData.additionalInfo)

        response = await fetch("/api/analyze-resume", {
          method: "POST",
          body: formDataToSend,
        })
      } else {
        // 使用文本输入方式，保持原有逻辑
        console.log("[v0] Using text input method...")
        
        response = await fetch("/api/analyze-resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            field: formData.field,
            resumeText: formData.resumeText,
            additionalInfo: formData.additionalInfo,
          }),
        })
      }

      // 检查HTTP响应状态
      if (!response.ok) {
        console.error(`[v0] 后端服务返回错误: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        
        setErrorState({
          isOpen: true,
          title: "分析失败",
          message: "后端服务调用失败，请稍后重试",
          errorDetails: `HTTP ${response.status}: ${response.statusText}\n${errorText.substring(0, 500)}`,
        })
        setIsSubmitting(false)
        setIsAnalyzing(false)
        return
      }

      const analysisResult = await response.json()

      console.log("[v0] Analysis result received:", analysisResult)

      // 检查响应数据中的错误
      if (analysisResult.error) {
        console.error("[v0] 分析结果包含错误:", analysisResult.error)
        setErrorState({
          isOpen: true,
          title: "分析处理失败",
          message: analysisResult.error || "分析过程中出现错误，请稍后重试",
          errorDetails: analysisResult.details || undefined,
        })
        setIsSubmitting(false)
        setIsAnalyzing(false)
        return
      }

      // 存储正确的数据结构到sessionStorage
      if (analysisResult.gtvAnalysis) {
        sessionStorage.setItem("assessmentData", JSON.stringify(analysisResult.gtvAnalysis))
        // 同时存储完整的响应数据，包括PDF文件信息
        sessionStorage.setItem("fullAssessmentData", JSON.stringify(analysisResult))
      } else {
        sessionStorage.setItem("assessmentData", JSON.stringify(analysisResult))
        sessionStorage.setItem("fullAssessmentData", JSON.stringify(analysisResult))
      }
      
      // 重置状态
      setIsSubmitting(false)
      setIsAnalyzing(false)
      
      console.log("[v0] 准备跳转到结果页面...")
      console.log("[v0] 当前URL:", window.location.href)
      
      // 立即尝试跳转，不等待
      console.log("[v0] 立即执行页面跳转...")
      console.log("[v0] 跳转前URL:", window.location.href)
      
      // 方法1: 使用router.push
      try {
        console.log("[v0] 尝试使用router.push...")
        router.push("/results")
        console.log("[v0] router.push调用成功")
      } catch (error) {
        console.error("[v0] router.push失败:", error)
      }
      
      // 方法2: 使用window.location.href作为备用
      setTimeout(() => {
        console.log("[v0] 检查当前URL是否已跳转...")
        console.log("[v0] 当前URL:", window.location.href)
        console.log("[v0] 当前路径:", window.location.pathname)
        
        if (window.location.pathname !== "/results") {
          console.log("[v0] 页面未跳转，使用window.location.href强制跳转")
          window.location.href = "/results"
        } else {
          console.log("[v0] 页面已成功跳转到结果页面")
        }
      }, 500)
      
      // 方法3: 添加一个测试按钮来手动跳转
      console.log("[v0] 如果页面没有跳转，请检查浏览器控制台错误信息")
    } catch (error) {
      console.error("[v0] Error analyzing resume:", error)
      
      // 提取详细的错误信息
      let errorMessage = "分析简历时发生错误，请稍后重试"
      let errorDetails = ""
      
      if (error instanceof TypeError) {
        errorMessage = "网络连接失败，请检查您的网络连接"
        errorDetails = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage
        errorDetails = error.stack?.substring(0, 500) || ""
      } else {
        errorDetails = String(error)
      }
      
      setErrorState({
        isOpen: true,
        title: "分析失败",
        message: errorMessage,
        errorDetails: errorDetails || undefined,
      })
      
      setIsSubmitting(false)
      setIsAnalyzing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 语言切换器 */}
      <div className="flex items-center justify-end">
        <LanguageSwitcher />
      </div>

      {/* 进度指示器 */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {language === "en" ? "Form Progress" : "表单完成度"}
          </span>
          <span className="text-sm font-semibold text-primary">
            {progress.completed}/{progress.total}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* 主要表单区域 - 合并为一个流畅的卡片 */}
      <Card className="shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">{t("form.title")}</CardTitle>
          </div>
          <CardDescription className="text-base mt-2">
            {t("form.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 基本信息 - 使用网格布局 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {t("form.q1.title")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t("form.q1.name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={t("form.q1.name.placeholder")}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prevData) => ({ ...prevData, name: e.target.value }))
                  }}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t("form.upload.email")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("form.upload.email.placeholder")}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prevData) => ({ ...prevData, email: e.target.value }))
                  }}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {t("form.upload.phone")}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t("form.upload.phone.placeholder")}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((prevData) => ({ ...prevData, phone: e.target.value }))
                  }}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t" />

          {/* 简历上传/粘贴 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("form.upload.resume.title")}
            </h3>
            <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "paste" | "upload")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  {t("form.upload.file")}
                </TabsTrigger>
                <TabsTrigger value="paste" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {t("form.upload.paste")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="relative">
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-muted/30 p-12 text-center transition-all hover:border-primary/50 hover:bg-muted/50">
                    <div className="rounded-full bg-primary/10 p-4 mb-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-base font-semibold text-primary hover:underline">
                        {t("form.upload.click")}
                      </span>
                      <span className="text-sm text-muted-foreground"> {t("form.upload.or.drag")}</span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <p className="mt-3 text-xs text-muted-foreground">{t("form.upload.formats")}</p>
                  </div>
                </div>
                {uploadedFile && (
                  <div className="flex items-center gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedFile(null)
                        setFormData((prevData) => ({ ...prevData, resumeText: "" }))
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      {t("form.upload.remove")}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paste" className="space-y-3">
                <Textarea
                  id="resumeText"
                  placeholder={t("form.upload.resume.paste.placeholder")}
                  rows={10}
                  value={formData.resumeText}
                  onChange={(e) => {
                    setFormData((prevData) => ({ ...prevData, resumeText: e.target.value }))
                  }}
                  required
                  className="font-mono text-sm min-h-[200px]"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formData.resumeText.length} {t("form.upload.resume.characters")}</span>
                  {formData.resumeText.length < 50 && (
                    <span className="text-destructive">
                      {language === "en" ? "At least 50 characters required" : "至少需要50个字符"}
                    </span>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 分隔线 */}
          <div className="border-t" />

          {/* 补充信息 - 简化设计 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              {t("form.upload.additional.title")}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({language === "en" ? "Optional" : "可选"})
              </span>
            </h3>
            <Textarea
              id="additionalInfo"
              placeholder={t("form.upload.additional.placeholder")}
              rows={4}
              value={formData.additionalInfo}
              onChange={(e) => {
                setFormData((prevData) => ({ ...prevData, additionalInfo: e.target.value }))
              }}
              className="resize-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {language === "en" 
                ? "Add any additional achievements, awards, or information not mentioned in your resume"
                : "补充简历中未提及的成就、奖项或其他相关信息"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 提交按钮区域 */}
      <div className="flex justify-center pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting || progress.completed < progress.total} 
          size="lg" 
          className="w-full sm:w-auto min-w-[200px] group"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {isAnalyzing ? t("form.upload.analyzing") : t("form.submitting")}
            </>
          ) : (
            <>
              {t("form.upload.submit")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </div>

      {/* 提示信息 */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">
              {language === "en" ? "AI-Powered Analysis" : "AI智能分析"}
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              {language === "en"
                ? "Our AI will automatically analyze your resume, identify your professional field, and provide a comprehensive GTV eligibility assessment."
                : "我们的AI将自动分析您的简历，识别您的专业领域，并提供全面的GTV资格评估。"}
            </p>
          </div>
        </div>
      </div>

      <ErrorDialog
        isOpen={errorState.isOpen}
        onClose={() => setErrorState({ ...errorState, isOpen: false })}
        title={errorState.title}
        message={errorState.message}
        errorDetails={errorState.errorDetails}
      />
      <AssessmentLoading isOpen={isSubmitting && isAnalyzing} />
    </form>
  )
}
