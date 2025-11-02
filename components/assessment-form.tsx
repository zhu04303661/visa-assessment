"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Loader2, FileText, Upload, AlertCircle, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ErrorDialog } from "@/components/error-dialog"
import { ConsultationBooking } from "@/components/consultation-booking"

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
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    field: "",
    resumeText: "",
    additionalInfo: "",
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)

    // Read file content
    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      setFormData({ ...formData, resumeText: text })
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("[v0] 表单提交开始...")
    console.log("[v0] 表单数据:", formData)
    console.log("[v0] 当前URL:", window.location.href)

    if (!formData.resumeText || formData.resumeText.trim().length < 50) {
      console.log("[v0] 简历文本长度不足")
      setErrorState({
        isOpen: true,
        title: "简历无效",
        message: t("form.upload.resume.error") || "请提供至少50个字符的有效简历",
      })
      return
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
    <form onSubmit={handleSubmit}>
      <div className="mb-6 flex items-center justify-end">
        <LanguageSwitcher />
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.q1.title")}</CardTitle>
            <CardDescription>{t("form.upload.basic.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">{t("form.q1.name")}</Label>
              <Input
                id="name"
                placeholder={t("form.q1.name.placeholder")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">{t("form.upload.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("form.upload.email.placeholder")}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("form.upload.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t("form.upload.phone.placeholder")}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Field Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.q2.title")}</CardTitle>
            <CardDescription>{t("form.q2.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>{t("form.q2.field")}</Label>
            <RadioGroup
              value={formData.field}
              onValueChange={(value) => setFormData({ ...formData, field: value })}
              required
              className="mt-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="digital-technology" id="digital-technology" />
                <Label htmlFor="digital-technology" className="cursor-pointer font-normal">
                  {t("form.q1.tech")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="arts-culture" id="arts-culture" />
                <Label htmlFor="arts-culture" className="cursor-pointer font-normal">
                  {t("form.q1.arts")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="research-academia" id="research-academia" />
                <Label htmlFor="research-academia" className="cursor-pointer font-normal">
                  {t("form.q1.research")}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("form.upload.resume.title")}</CardTitle>
            <CardDescription>{t("form.upload.resume.paste")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "paste" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="mr-2 h-4 w-4" />
                  {t("form.upload.file")}
                </TabsTrigger>
                <TabsTrigger value="paste">
                  <FileText className="mr-2 h-4 w-4" />
                  {t("form.upload.paste")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50">
                  <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-primary hover:underline">{t("form.upload.click")}</span>
                    <span className="text-sm text-muted-foreground"> {t("form.upload.or.drag")}</span>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">{t("form.upload.formats")}</p>
                </div>
                {uploadedFile && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedFile(null)
                        setFormData({ ...formData, resumeText: "" })
                      }}
                    >
                      {t("form.upload.remove")}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paste" className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{t("form.upload.resume.paste.hint")}</span>
                </div>
                <Textarea
                  id="resumeText"
                  placeholder={t("form.upload.resume.paste.placeholder")}
                  rows={12}
                  value={formData.resumeText}
                  onChange={(e) => setFormData({ ...formData, resumeText: e.target.value })}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.resumeText.length} {t("form.upload.resume.characters")}
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("form.upload.additional.title")}</CardTitle>
            <CardDescription>{t("form.upload.additional.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Information Completion Notice */}
            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    {t("form.upload.additional.notice.title")}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t("form.upload.additional.notice.desc")}
                  </p>
                  <div className="mt-3 text-sm text-blue-800 dark:text-blue-200 whitespace-pre-line font-mono text-xs">
                    {t("form.upload.additional.notice.items")}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information Textarea */}
            <div>
              <Label htmlFor="additionalInfo" className="mb-2">{t("form.upload.additional.title")}</Label>
              <Textarea
                id="additionalInfo"
                placeholder={t("form.upload.additional.placeholder")}
                rows={6}
                value={formData.additionalInfo}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
              />
            </div>

            {/* One-on-One Consultation Invitation */}
            <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
              <div className="flex gap-3">
                <MessageSquare className="h-5 w-5 flex-shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="space-y-3 flex-1">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                    {t("form.upload.additional.notice.consultation")}
                  </h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    {t("form.upload.additional.notice.consultation.desc")}
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 mt-2"
                    onClick={() => {
                      // TODO: Implement consultation booking functionality
                      console.log("Booking consultation...")
                      setIsConsultationModalOpen(true)
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t("form.upload.additional.notice.consultation.button")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 gap-4">
          <Button type="submit" disabled={isSubmitting} size="lg" className="group">
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
          
          {/* 测试跳转按钮 */}
          <Button 
            type="button" 
            variant="outline" 
            size="lg"
            onClick={() => {
              console.log("[v0] 测试跳转按钮被点击")
              console.log("[v0] 当前URL:", window.location.href)
              router.push("/results")
            }}
          >
            测试跳转
          </Button>
        </div>
      </div>
      <ErrorDialog
        isOpen={errorState.isOpen}
        onClose={() => setErrorState({ ...errorState, isOpen: false })}
        title={errorState.title}
        message={errorState.message}
        errorDetails={errorState.errorDetails}
      />
      <ConsultationBooking
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        userName={formData.name}
        userEmail={formData.email}
      />
    </form>
  )
}
