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
import { ArrowRight, Loader2, FileText, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

type FormData = {
  name: string
  email: string
  phone: string
  field: string
  resumeText: string
  additionalInfo: string
}

export function AssessmentForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<"paste" | "upload">("upload")

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

    if (!formData.resumeText || formData.resumeText.trim().length < 50) {
      alert(t("form.upload.resume.error") || "Please provide a valid resume with at least 50 characters.")
      return
    }

    setIsSubmitting(true)
    setIsAnalyzing(true)

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

      const analysisResult = await response.json()

      console.log("[v0] Analysis result received:", analysisResult)

      // 存储正确的数据结构到sessionStorage
      if (analysisResult.gtvAnalysis) {
        sessionStorage.setItem("assessmentData", JSON.stringify(analysisResult.gtvAnalysis))
      } else {
        sessionStorage.setItem("assessmentData", JSON.stringify(analysisResult))
      }
      router.push("/results")
    } catch (error) {
      console.error("[v0] Error analyzing resume:", error)
      alert("分析失败，请重试 / Analysis failed, please try again")
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
          <CardContent>
            <Textarea
              id="additionalInfo"
              placeholder={t("form.upload.additional.placeholder")}
              rows={6}
              value={formData.additionalInfo}
              onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
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
        </div>
      </div>
    </form>
  )
}
