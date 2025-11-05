"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Clock,
  DollarSign,
  ArrowLeft,
  Download,
  Award,
  Users,
  Briefcase,
  Target,
  AlertTriangle,
  Building2,
  BarChart3,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AssessmentPDFGenerator } from "@/components/assessment-pdf-generator"
import { ConsultationBooking } from "@/components/consultation-booking"
import { ScoringAnalysisButton } from "@/components/scoring-analysis-button"
import { ScoringDetailsCard } from "@/components/scoring-details-card"
import { OCAssessmentDisplay } from "@/components/oc-assessment-display"

type CriterionStatus = "met" | "partial" | "notmet"

type AnalysisResult = {
  applicantInfo: {
    name: string
    field: string
    currentPosition: string
    company: string
    yearsOfExperience: string
  }
  gtvPathway?: {
    recommendedRoute: string
    eligibilityLevel: string
    yearsOfExperience: string
    analysis: string
  }
  educationBackground?: {
    degrees: string[] | string
    institutions: string[]
    specializations: string[]
    analysis: string
  }
  industryBackground?: {
    sector: string
    yearsInIndustry: string
    keyCompanies: string[]
    industryImpact: number
    analysis: string
  }
  workExperience?: {
    positions: string[]
    keyAchievements: string[]
    leadershipRoles: string[]
    projectImpact: string[]
    analysis: string
  }
  technicalExpertise?: {
    coreSkills: string[]
    specializations: string[]
    innovations: string[]
    industryRecognition: string[]
    analysis: string
  }
  strengths: Array<{
    area: string
    description: string
    evidence: string
    gtvRelevance?: string
  }>
  weaknesses: Array<{
    area: string
    description: string
    improvement: string
    priority?: string
    timeframe?: string
  }>
  criteriaAssessment: Array<{
    name: string
    status: CriterionStatus
    score: number
    evidence: string
    recommendations: string
    officialRequirement?: string
  }>
  overallScore: number
  recommendation: string
  professionalAdvice?: Array<{ action?: string; description?: string; priority?: string }> | string[]
  timeline: string
  requiredDocuments: string[]
  estimatedBudget: {
    min: number
    max: number
    currency: string
    breakdown?: string | { [key: string]: string }
  }
  debug?: {
    prompt: string
    rawResponse: string
    timestamp: string
  }
  industryAnalysis?: {
    industryImpact: number
    sector: string
    marketPosition: string
    analysis: string
  }
  companyContribution?: {
    impact: number
    achievements: string[]
    innovations: string[]
    analysis: string
  }
  industryStatus?: {
    status: number
    awards: string[]
    analysis: string
  }
  ocResults?: {
    oc_results?: any[]
    summary?: any
  }
  ocAssessment?: {
    oc_results?: any[]
    summary?: any
  }
}

export function AssessmentResults() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [data, setData] = useState<AnalysisResult | null>(null)
  const [fullData, setFullData] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [showScoringDetails, setShowScoringDetails] = useState(false)
  const [scoringResults, setScoringResults] = useState<any>(null)
  const [isLoadingScoring, setIsLoadingScoring] = useState(false)

  useEffect(() => {
    // 首先尝试获取完整的评估数据（包含PDF信息）
    const fullStoredData = sessionStorage.getItem("fullAssessmentData")
    const storedData = sessionStorage.getItem("assessmentData")
    
    // 优先使用完整数据，回退到基础数据
    const dataToUse = fullStoredData || storedData
    if (!dataToUse) {
      router.push("/assessment")
      return
    }
    
    const parsedData = JSON.parse(dataToUse)
    
    console.log("🔍 Assessment Data Loaded:", { 
      hasFullStoredData: !!fullStoredData, 
      hasStoredData: !!storedData, 
      hasGtvAnalysis: !!parsedData.gtvAnalysis,
      hasOcAssessment: !!parsedData.ocAssessment 
    })
    
    // 如果是从fullAssessmentData获取的，需要提取gtvAnalysis部分，但保留ocAssessment
    if (fullStoredData && parsedData.gtvAnalysis) {
      // 合并gtvAnalysis和ocAssessment到data中
      const mergedData = {
        ...parsedData.gtvAnalysis,
        ocAssessment: parsedData.ocAssessment  // 保留ocAssessment字段
      }
      console.log("✅ Merged data with ocAssessment:", {
        hasOcAssessment: !!mergedData.ocAssessment,
        ocAssessmentType: typeof mergedData.ocAssessment,
        ocAssessmentValue: mergedData.ocAssessment,
        ocAssessmentKeys: mergedData.ocAssessment ? Object.keys(mergedData.ocAssessment) : [],
        ocResultsCount: mergedData.ocAssessment?.oc_results?.length || 0,
        ocAssessmentSuccess: mergedData.ocAssessment?.success,
        fullOcAssessment: JSON.stringify(mergedData.ocAssessment, null, 2)
      })
      setData(mergedData)
      setFullData(parsedData) // 保存完整数据用于PDF下载
    } else {
      console.log("⚠️ Using parsedData directly:", {
        hasOcAssessment: !!parsedData.ocAssessment,
        hasGtvAnalysis: !!parsedData.gtvAnalysis,
        ocAssessmentValue: parsedData.ocAssessment
      })
      setData(parsedData)
      setFullData(parsedData)
    }
    
    // 调试日志
    setTimeout(() => {
      console.log("📊 Data State after load:", { 
        data: parsedData, 
        ocAssessment: parsedData.ocAssessment,
        ocAssessmentStructure: parsedData.ocAssessment ? {
          hasOcResults: !!parsedData.ocAssessment.oc_results,
          hasSummary: !!parsedData.ocAssessment.summary,
          ocResultsLength: parsedData.ocAssessment.oc_results?.length || 0,
          success: parsedData.ocAssessment.success
        } : null
      })
    }, 0)

    if (parsedData.debug) {
      const debugRecords = JSON.parse(localStorage.getItem("debugRecords") || "[]")
      const newRecord = {
        id: Date.now().toString(),
        timestamp: parsedData.debug.timestamp,
        applicantName: parsedData.applicantInfo?.name || "Unknown",
        field: parsedData.applicantInfo?.field || "Unknown",
        prompt: parsedData.debug.prompt,
        rawResponse: parsedData.debug.rawResponse,
      }
      debugRecords.unshift(newRecord)
      // Keep only last 20 records
      if (debugRecords.length > 20) {
        debugRecords.pop()
      }
      localStorage.setItem("debugRecords", JSON.stringify(debugRecords))
    }
  }, [router])

  if (!data) return null

  const criteriaAssessment = data.criteriaAssessment || []
  const strengths = data.strengths || []
  const weaknesses = data.weaknesses || []
  const requiredDocuments = data.requiredDocuments || []
  const achievements = data.companyContribution?.achievements || []
  const innovations = data.companyContribution?.innovations || []
  const awards = data.industryStatus?.awards || []

  const parseList = (value: string) =>
    value
      .split(";")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

  const servicePackages = [
    {
      key: "coaching",
      icon: Users,
      title: t("results.budget.solution.coaching.title"),
      subtitle: t("results.budget.solution.coaching.subtitle"),
      items: parseList(t("results.budget.solution.coaching.items")),
      fit: t("results.budget.solution.coaching.fit"),
    },
    {
      key: "full",
      icon: Briefcase,
      title: t("results.budget.solution.full.title"),
      subtitle: t("results.budget.solution.full.subtitle"),
      items: parseList(t("results.budget.solution.full.items")),
      fit: t("results.budget.solution.full.fit"),
    },
  ]

  const getScoreLevel = (score: number) => {
    if (score >= 75)
      return {
        level: t("results.score.high"),
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: t("results.summary.qualified"),
      }
    if (score >= 50)
      return {
        level: t("results.score.moderate"),
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        description: t("results.summary.developing"),
      }
    return {
      level: t("results.score.low"),
      color: "text-red-600",
      bgColor: "bg-red-100",
      description: t("results.summary.early"),
    }
  }

  const scoreLevel = getScoreLevel(data.overallScore)
  const metCriteria = criteriaAssessment.filter((c) => c.status === "met").length

  const getStatusIcon = (status: CriterionStatus) => {
    switch (status) {
      case "met":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "notmet":
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusBadge = (status: CriterionStatus) => {
    switch (status) {
      case "met":
        return <Badge className="bg-green-100 text-green-700 border-0">{t("results.criteria.met")}</Badge>
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-700 border-0">{t("results.criteria.partial")}</Badge>
      case "notmet":
        return <Badge className="bg-red-100 text-red-700 border-0">{t("results.criteria.notmet")}</Badge>
    }
  }

  const handleDownload = () => {
    if (!data) return

    // Format the assessment data as text
    let content = `UK GLOBAL TALENT VISA ASSESSMENT REPORT\n`
    content += `${"=".repeat(50)}\n\n`

    // Applicant Info
    content += `APPLICANT INFORMATION\n`
    content += `-`.repeat(50) + `\n`
    content += `Name: ${data.applicantInfo?.name || "N/A"}\n`
    content += `Field: ${data.applicantInfo?.field || "N/A"}\n`
    content += `Position: ${data.applicantInfo?.currentPosition || "N/A"}\n`
    content += `Company: ${data.applicantInfo?.company || "N/A"}\n`
    content += `Experience: ${data.applicantInfo?.yearsOfExperience || "N/A"}\n\n`

    // Overall Score
    content += `OVERALL ASSESSMENT\n`
    content += `-`.repeat(50) + `\n`
    content += `Score: ${data.overallScore || 0}%\n`
    content += `Level: ${scoreLevel.level}\n`
    content += `Criteria Met: ${metCriteria} / ${criteriaAssessment.length}\n`
    content += `Recommendation: ${data.recommendation || ""}\n\n`

    // GTV Pathway
    if (data.gtvPathway) {
      content += `GTV PATHWAY RECOMMENDATION\n`
      content += `-`.repeat(50) + `\n`
      content += `Recommended Route: ${data.gtvPathway.recommendedRoute}\n`
      content += `Eligibility Level: ${data.gtvPathway.eligibilityLevel}\n`
      content += `Analysis: ${data.gtvPathway.analysis}\n\n`
    }

    // Strengths
    if (strengths.length > 0) {
      content += `STRENGTHS\n`
      content += `-`.repeat(50) + `\n`
      strengths.forEach((strength, i) => {
        content += `${i + 1}. ${strength.area}\n`
        content += `   ${strength.description}\n`
        content += `   Evidence: ${strength.evidence}\n\n`
      })
    }

    // Weaknesses
    if (weaknesses.length > 0) {
      content += `AREAS FOR IMPROVEMENT\n`
      content += `-`.repeat(50) + `\n`
      weaknesses.forEach((weakness, i) => {
        content += `${i + 1}. ${weakness.area}\n`
        content += `   ${weakness.description}\n`
        content += `   Recommendation: ${weakness.improvement}\n\n`
      })
    }

    // Criteria Assessment
    if (criteriaAssessment.length > 0) {
      content += `CRITERIA ASSESSMENT\n`
      content += `-`.repeat(50) + `\n`
      criteriaAssessment.forEach((criterion, i) => {
        content += `${i + 1}. ${criterion.name}\n`
        content += `   Status: ${criterion.status.toUpperCase()}\n`
        content += `   Score: ${criterion.score} pts\n`
        content += `   Evidence: ${criterion.evidence}\n`
        content += `   Recommendations: ${criterion.recommendations}\n\n`
      })
    }

    // Professional Advice
    if (data.professionalAdvice && data.professionalAdvice.length > 0) {
      content += `PROFESSIONAL ADVICE\n`
      content += `-`.repeat(50) + `\n`
      data.professionalAdvice.forEach((advice, i) => {
        const isObject = typeof advice === "object" && advice !== null
        const adviceText = isObject ? (advice as any).action || (advice as any).description || "" : advice
        content += `${i + 1}. ${adviceText}\n`
      })
      content += `\n`
    }

    // Required Documents
    if (requiredDocuments.length > 0) {
      content += `REQUIRED DOCUMENTS\n`
      content += `-`.repeat(50) + `\n`
      requiredDocuments.forEach((doc, i) => {
        content += `${i + 1}. ${doc}\n`
      })
      content += `\n`
    }

    // Timeline
    if (data.timeline) {
      content += `TIMELINE\n`
      content += `-`.repeat(50) + `\n`
      content += `${data.timeline}\n\n`
    }

    // Service Packages
    if (servicePackages.length > 0) {
      content += `SERVICE PACKAGE RECOMMENDATIONS\n`
      content += `-`.repeat(50) + `\n`
      servicePackages.forEach((pkg, index) => {
        content += `${index + 1}. ${pkg.title}\n`
        content += `   ${pkg.subtitle}\n`
        pkg.items.forEach((item: string) => {
          content += `   - ${item}\n`
        })
        content += `   Fit: ${pkg.fit}\n\n`
      })
    }

    content += `\n${"=".repeat(50)}\n`
    content += `Report generated on: ${new Date().toLocaleString()}\n`
    content += `\nDISCLAIMER: This assessment is for informational purposes only and does not constitute legal advice.\n`

    // Create blob and download
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `GTV-Assessment-${data.applicantInfo?.name || "Report"}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div id="assessment-results" className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="ghost" asChild>
                <Link href="/assessment">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("results.back")}
                </Link>
              </Button>
              <div className="flex items-center gap-4">
                {data && (
                  <>
                    <AssessmentPDFGenerator
                      pageElementId="assessment-results-content"
                      fileName="GTV-Assessment-完整报告"
                      openInBrowser={true}
                    />
                    <ScoringAnalysisButton
                      data={data}
                      onOpen={() => setShowScoringDetails(true)}
                      onClose={() => setShowScoringDetails(false)}
                      isOpen={showScoringDetails}
                      setScoringDetails={setScoringResults}
                      isLoading={isLoadingScoring}
                      setIsLoading={setIsLoadingScoring}
                    />
                  </>
                )}
                <LanguageSwitcher />
              </div>
            </div>
            <h1 className="mb-2 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("results.title")}
            </h1>
            <p className="text-pretty text-lg text-muted-foreground">{data.applicantInfo?.name || "N/A"}</p>
          </div>

          <div id="assessment-results-content" className="space-y-8">
            {/* Overall Score */}
            <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="text-2xl">{t("results.score.title")}</CardTitle>
                <CardDescription>{t("results.score.desc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl font-bold text-primary">{data.overallScore || 0}%</div>
                      <Badge className={`${scoreLevel.bgColor} ${scoreLevel.color} border-0`}>{scoreLevel.level}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t("results.criteria.met")}</p>
                      <p className="text-2xl font-bold text-foreground">
                        {metCriteria} / {criteriaAssessment.length}
                      </p>
                    </div>
                  </div>
                  <Progress value={data.overallScore || 0} className="h-3" />
                  <p className="text-sm font-medium text-foreground">{data.recommendation || ""}</p>
                </div>
              </CardContent>
            </Card>

            {data.gtvPathway && (
              <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    {language === "en" ? "GTV Pathway Recommendation" : "GTV申请路径建议"}
                  </CardTitle>
                  <CardDescription>
                    {language === "en"
                      ? "Based on official UK Global Talent Visa criteria"
                      : "基于英国全球人才签证官方标准"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Recommended Route" : "推荐路径"}
                        </p>
                        <Badge className="mt-1 bg-primary/10 text-primary border-primary/20">
                          {data.gtvPathway.recommendedRoute}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Eligibility Level" : "资格等级"}
                        </p>
                        <Badge
                          className={`mt-1 ${
                            data.gtvPathway.eligibilityLevel && data.gtvPathway.eligibilityLevel.includes("Strong")
                              ? "bg-green-100 text-green-700 border-green-200"
                              : data.gtvPathway.eligibilityLevel && data.gtvPathway.eligibilityLevel.includes("Moderate")
                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                : "bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {data.gtvPathway.eligibilityLevel || "N/A"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Relevant Experience" : "相关经验"}
                        </p>
                        <p className="mt-1 text-base font-semibold text-foreground">
                          {data.gtvPathway.yearsOfExperience || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm font-medium text-foreground mb-2">
                        {language === "en" ? "Detailed Analysis" : "详细分析"}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{data.gtvPathway.analysis}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Applicant Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {t("results.summary.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("results.details.field")}</p>
                    <p className="text-base font-semibold text-foreground">{data.applicantInfo?.field || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("form.q1.position")}</p>
                    <p className="text-base font-semibold text-foreground">
                      {data.applicantInfo?.currentPosition || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("form.q1.company")}</p>
                    <p className="text-base font-semibold text-foreground">{data.applicantInfo?.company || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === "en" ? "Experience" : "工作经验"}
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {data.applicantInfo?.yearsOfExperience || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Education Background */}
            {data.educationBackground && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    {language === "en" ? "Education Background" : "教育背景"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.educationBackground.degrees &&
                      Array.isArray(data.educationBackground.degrees) &&
                      data.educationBackground.degrees.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Degrees" : "学历"}
                          </p>
                          <ul className="space-y-1">
                            {data.educationBackground.degrees.map((degree, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                {degree}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {data.educationBackground.degrees &&
                      typeof data.educationBackground.degrees === "string" &&
                      data.educationBackground.degrees.trim() !== "" && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Degrees" : "学历"}
                          </p>
                          <p className="text-sm text-foreground">{data.educationBackground.degrees}</p>
                        </div>
                      )}
                    {data.educationBackground.specializations &&
                      Array.isArray(data.educationBackground.specializations) &&
                      data.educationBackground.specializations.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Specializations" : "专业方向"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {data.educationBackground.specializations.map((spec, i) => (
                              <Badge key={i} variant="outline">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {data.educationBackground.analysis && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm font-medium text-foreground mb-2">
                          {language === "en" ? "Analysis" : "分析"}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{data.educationBackground.analysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Industry Background */}
            {data.industryBackground && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {language === "en" ? "Industry Background" : "行业背景"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Sector" : "行业领域"}
                        </p>
                        <p className="text-base text-foreground">{data.industryBackground.sector || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Years in Industry" : "行业经验"}
                        </p>
                        <p className="text-base text-foreground">{data.industryBackground.yearsInIndustry || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Industry Impact Score" : "行业影响力评分"}
                        </p>
                        <Badge variant="outline">{data.industryBackground.industryImpact || 0}/10</Badge>
                      </div>
                      <Progress value={(data.industryBackground.industryImpact || 0) * 10} className="h-2" />
                    </div>
                    {data.industryBackground.keyCompanies &&
                      Array.isArray(data.industryBackground.keyCompanies) &&
                      data.industryBackground.keyCompanies.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Key Companies" : "重要公司"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {data.industryBackground.keyCompanies.map((company, i) => (
                              <Badge key={i} variant="secondary">
                                {company}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {data.industryBackground.analysis && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm font-medium text-foreground mb-2">
                          {language === "en" ? "Analysis" : "分析"}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{data.industryBackground.analysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work Experience */}
            {data.workExperience && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    {language === "en" ? "Work Experience" : "从业经历"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.workExperience.positions &&
                      Array.isArray(data.workExperience.positions) &&
                      data.workExperience.positions.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Key Positions" : "主要职位"}
                          </p>
                          <ul className="space-y-2">
                            {data.workExperience.positions.map((position, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                <Briefcase className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                {position}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {data.workExperience.keyAchievements &&
                      Array.isArray(data.workExperience.keyAchievements) &&
                      data.workExperience.keyAchievements.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Key Achievements" : "关键成就"}
                          </p>
                          <ul className="space-y-2">
                            {data.workExperience.keyAchievements.map((achievement, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                                {achievement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {data.workExperience.analysis && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm font-medium text-foreground mb-2">
                          {language === "en" ? "Analysis" : "分析"}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{data.workExperience.analysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technical Expertise */}
            {data.technicalExpertise && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {language === "en" ? "Technical Expertise" : "技术特长"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.technicalExpertise.coreSkills &&
                      Array.isArray(data.technicalExpertise.coreSkills) &&
                      data.technicalExpertise.coreSkills.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Core Skills" : "核心技能"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {data.technicalExpertise.coreSkills.map((skill, i) => (
                              <Badge key={i} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {data.technicalExpertise.innovations &&
                      Array.isArray(data.technicalExpertise.innovations) &&
                      data.technicalExpertise.innovations.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Innovations" : "创新贡献"}
                          </p>
                          <ul className="space-y-2">
                            {data.technicalExpertise.innovations.map((innovation, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                <Award className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                {innovation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {data.technicalExpertise.analysis && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm font-medium text-foreground mb-2">
                          {language === "en" ? "Analysis" : "分析"}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{data.technicalExpertise.analysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Industry Analysis */}
            {data.industryAnalysis && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {language === "en" ? "Industry Analysis" : "行业分析"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Industry Impact Score" : "行业影响力评分"}
                        </p>
                        <Badge variant="outline">{data.industryAnalysis.industryImpact || 0}/10</Badge>
                      </div>
                      <Progress value={(data.industryAnalysis.industryImpact || 0) * 10} className="h-2" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Sector" : "行业领域"}
                      </p>
                      <p className="text-base text-foreground">{data.industryAnalysis.sector || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Market Position" : "市场地位"}
                      </p>
                      <p className="text-base text-foreground">{data.industryAnalysis.marketPosition || "N/A"}</p>
                    </div>
                    {data.industryAnalysis.analysis && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm leading-relaxed text-foreground">{data.industryAnalysis.analysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Contribution */}
            {data.companyContribution && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    {language === "en" ? "Company Contribution" : "企业贡献"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Contribution Score" : "贡献评分"}
                        </p>
                        <Badge variant="outline">{data.companyContribution.impact || 0}/10</Badge>
                      </div>
                      <Progress value={(data.companyContribution.impact || 0) * 10} className="h-2" />
                    </div>
                    {achievements.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Key Achievements" : "主要成就"}
                        </p>
                        <ul className="space-y-1">
                          {achievements.map((achievement, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {innovations.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Innovations" : "创新贡献"}
                        </p>
                        <ul className="space-y-1">
                          {innovations.map((innovation, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <Award className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                              {innovation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.companyContribution.analysis && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm leading-relaxed text-foreground">{data.companyContribution.analysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Industry Status */}
            {data.industryStatus && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {language === "en" ? "Industry Status" : "行业地位"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Status Score" : "地位评分"}
                        </p>
                        <Badge variant="outline">{data.industryStatus.status || 0}/10</Badge>
                      </div>
                      <Progress value={(data.industryStatus.status || 0) * 10} className="h-2" />
                    </div>
                    {awards.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          {language === "en" ? "Awards & Recognition" : "奖项与认可"}
                        </p>
                        <ul className="space-y-1">
                          {awards.map((award, i) => (
                            <li key={i} className="text-sm text-foreground">
                              • {award}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.industryStatus.analysis && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm leading-relaxed text-foreground">{data.industryStatus.analysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strengths & Weaknesses */}
            <div className="mb-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-green-600" />
                    {language === "en" ? "Strengths" : "优势分析"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {strengths.length > 0 ? (
                    <div className="space-y-4">
                      {strengths.map((strength, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-950/20"
                        >
                          <p className="mb-1 font-semibold text-green-900 dark:text-green-100">{strength.area}</p>
                          <p className="mb-2 text-sm text-green-800 dark:text-green-200">{strength.description}</p>
                          <p className="text-xs text-green-700 dark:text-green-300 mb-1">
                            <strong>{language === "en" ? "Evidence:" : "证据："}</strong> {strength.evidence}
                          </p>
                          {strength.gtvRelevance && (
                            <p className="text-xs text-green-700 dark:text-green-300">
                              <strong>{language === "en" ? "GTV Relevance:" : "GTV相关性："}</strong>{" "}
                              {strength.gtvRelevance}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{language === "en" ? "No data available" : "暂无数据"}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    {language === "en" ? "Areas for Improvement" : "不足分析"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {weaknesses.length > 0 ? (
                    <div className="space-y-4">
                      {weaknesses.map((weakness, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-3 dark:border-yellow-900/50 dark:bg-yellow-950/20"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <p className="font-semibold text-yellow-900 dark:text-yellow-100">{weakness.area}</p>
                            {weakness.priority && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  weakness.priority === "high"
                                    ? "border-red-300 text-red-700"
                                    : weakness.priority === "medium"
                                      ? "border-yellow-300 text-yellow-700"
                                      : "border-blue-300 text-blue-700"
                                }`}
                              >
                                {weakness.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="mb-2 text-sm text-yellow-800 dark:text-yellow-200">{weakness.description}</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">
                            <strong>{language === "en" ? "Recommendation:" : "建议："}</strong> {weakness.improvement}
                          </p>
                          {weakness.timeframe && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              <strong>{language === "en" ? "Timeframe:" : "时间框架："}</strong> {weakness.timeframe}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{language === "en" ? "No data available" : "暂无数据"}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Criteria Assessment */}
            {criteriaAssessment.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("results.criteria.title")}
                  </CardTitle>
                  <CardDescription>
                    {language === "en"
                      ? "Assessment against official UK Global Talent Visa criteria"
                      : "对照英国全球人才签证官方标准评估"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {criteriaAssessment.map((criterion, index) => (
                      <div key={index} className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(criterion.status)}
                            <span className="font-medium text-foreground">{criterion.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{criterion.score} pts</span>
                            {getStatusBadge(criterion.status)}
                          </div>
                        </div>
                        {criterion.officialRequirement && (
                          <div className="rounded bg-primary/5 p-2">
                            <p className="text-xs text-primary">
                              <strong>{language === "en" ? "Official Requirement:" : "官方要求："}</strong>{" "}
                              {criterion.officialRequirement}
                            </p>
                          </div>
                        )}
                        {criterion.evidence && (
                          <p className="text-sm text-muted-foreground">
                            <strong>{language === "en" ? "Evidence:" : "证据："}</strong> {criterion.evidence}
                          </p>
                        )}
                        {criterion.recommendations && (
                          <p className="text-sm text-muted-foreground">
                            <strong>{language === "en" ? "Recommendations:" : "建议："}</strong> {criterion.recommendations}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Advice */}
            {data.professionalAdvice && data.professionalAdvice.length > 0 && (
              <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {language === "en" ? "Professional Advice" : "专业建议"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {data.professionalAdvice.map((advice, i) => {
                      const isObject = typeof advice === "object" && advice !== null
                      const adviceText = isObject ? (advice as any).action || (advice as any).description || "" : advice
                      const priority = isObject ? (advice as any).priority : null

                      return (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <span className="leading-relaxed text-foreground">{adviceText}</span>
                            {priority && (
                              <Badge
                                variant="outline"
                                className={`ml-2 text-xs ${
                                  priority === "high"
                                    ? "border-red-300 text-red-700"
                                    : priority === "medium"
                                      ? "border-yellow-300 text-yellow-700"
                                      : "border-blue-300 text-blue-700"
                                }`}
                              >
                                {priority}
                              </Badge>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Required Documents */}
            {requiredDocuments.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("results.materials.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {requiredDocuments.map((doc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* OC Assessment Display */}
            {(() => {
              const ocData = data.ocAssessment
              console.log("🔍 Checking OC Assessment display condition:", {
                hasOcAssessment: !!ocData,
                ocDataType: typeof ocData,
                ocData: ocData,
                ocDataStringified: ocData ? JSON.stringify(ocData).substring(0, 200) : "null/undefined",
                hasOcResults: !!ocData?.oc_results,
                ocResultsLength: ocData?.oc_results?.length || 0,
                hasSuccess: ocData?.success !== undefined,
                ocDataKeys: ocData ? Object.keys(ocData) : []
              })
              
              // 如果ocAssessment存在（即使是null也要检查结构）
              if (ocData !== null && ocData !== undefined) {
                // 检查是否有oc_results字段（可能是直接的对象或者包含success的对象）
                let ocResults = null
                let summary = null
                
                // 处理不同的数据结构
                if (ocData.oc_results && Array.isArray(ocData.oc_results)) {
                  // 结构1: {oc_results: [...], summary: {...}}
                  ocResults = ocData.oc_results
                  summary = ocData.summary
                } else if (ocData.success !== undefined && ocData.oc_results) {
                  // 结构2: {success: true, oc_results: [...], summary: {...}}
                  ocResults = ocData.oc_results
                  summary = ocData.summary
                } else if (Array.isArray(ocData)) {
                  // 结构3: 直接是数组
                  ocResults = ocData
                }
                
                console.log("📊 Extracted OC data:", {
                  ocResultsLength: ocResults?.length || 0,
                  hasSummary: !!summary,
                  willDisplay: ocResults && ocResults.length > 0
                })
                
                if (ocResults && ocResults.length > 0) {
                  return (
                    <OCAssessmentDisplay
                      ocAssessment={{
                        oc_results: ocResults,
                        summary: summary || ocData.summary
                      }}
                      language={language}
                    />
                  )
                } else if (ocData && Object.keys(ocData).length > 0) {
                  // 如果ocAssessment存在但结构可能不同，尝试直接传递
                  console.log("⚠️ OC数据存在但结构异常，尝试直接传递:", ocData)
                  return (
                    <OCAssessmentDisplay
                      ocAssessment={ocData}
                      language={language}
                    />
                  )
                } else {
                  console.warn("⚠️ OC数据存在但无法提取oc_results")
                }
              } else {
                console.warn("⚠️ ocAssessment is null or undefined")
              }
              return null
            })()}

            {/* Timeline & Budget */}
            <div className="mb-6 grid gap-6 md:grid-cols-2">
              {data.timeline && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      {t("results.timeline.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{data.timeline}</p>
                  </CardContent>
                </Card>
              )}

              {data.estimatedBudget && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5 text-primary" />
                      {t("results.budget.title")}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {t("results.budget.desc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {servicePackages.map((pkg) => {
                        const Icon = pkg.icon
                        return (
                          <div key={pkg.key} className="rounded-lg border border-muted/40 bg-muted/30 p-3">
                            <div className="flex gap-3">
                              <Icon className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-sm font-semibold text-foreground">{pkg.title}</h4>
                                  <p className="text-xs text-muted-foreground">{pkg.subtitle}</p>
                                </div>
                                <ul className="space-y-2 text-sm">
                                  {pkg.items.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                      <span className="text-foreground">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                                <div className="rounded-md bg-background/80 px-3 py-2 text-xs text-muted-foreground shadow-inner">
                                  {pkg.fit}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs text-muted-foreground">{t("results.budget.next")}</span>
                      <Button size="sm" variant="outline" onClick={() => setIsConsultationModalOpen(true)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {t("results.budget.cta")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/assessment">{t("results.action.retake")}</Link>
              </Button>
              <Button variant="outline" size="lg" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                {t("results.action.download")}
              </Button>
            </div>

            {/* Disclaimer */}
            <Card className="mt-8 border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/20">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-foreground">
                  <strong>{t("results.disclaimer")}</strong> {t("results.disclaimer.text")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Scoring Details - Displayed outside the PDF export area */}
          {showScoringDetails && scoringResults && (
            <div className="mt-8 space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{language === "en" ? "Detailed Scoring Analysis" : "详细评分分析"}</h2>
                <p className="text-muted-foreground mt-2">
                  {language === "en" 
                    ? "Comprehensive breakdown of your assessment across all dimensions"
                    : "跨所有维度的全面评估评分分析"}
                </p>
              </div>
              
              {scoringResults?.dimensions && Object.entries(scoringResults.dimensions).map(([key, dimension]: [string, any]) => (
                <ScoringDetailsCard
                  key={key}
                  dimension={dimension}
                  dimensionKey={key}
                />
              ))}
              
              {!scoringResults?.dimensions && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                      {language === "en" ? "No scoring details available" : "没有评分详情可用"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    <ConsultationBooking
      isOpen={isConsultationModalOpen}
      onClose={() => setIsConsultationModalOpen(false)}
      userName={data.applicantInfo?.name || ""}
    />
  </>
  )
}
