/**
 * GTV OC (Optional Criteria) 评估系统
 * 充分利用知识库中的OC规则进行详细评估
 */

interface OCRule {
  id: string
  title: string
  category: string
  dimension: string
  content: string
  scoring_rules: string[]
  source: string
  isActive: boolean
}

interface OCAssessmentResult {
  ocId: string
  title: string
  category: string
  status: "满足" | "部分满足" | "不满足" | "未评估"
  score: number
  maxScore: number
  percentage: number
  evidence: string[]
  reasoning: string
  improvement_suggestions: string[]
  matched_keywords: string[]
}

interface ApplicantEvidence {
  education?: string[]
  experience?: string[]
  certifications?: string[]
  awards?: string[]
  publications?: string[]
  media_mentions?: string[]
  projects?: string[]
  skills?: string[]
}

/**
 * OC评估管理器
 */
export class OCAssessmentManager {
  private ocRules: OCRule[] = []
  private assessmentCache: Map<string, OCAssessmentResult> = new Map()

  /**
   * 初始化 - 加载知识库中的OC规则
   */
  async initialize() {
    try {
      const response = await fetch("/kb-gtv-assessment-rules.json")
      const allRules = await response.json()
      
      // 筛选出category包含"OC"或为可选要求的规则
      this.ocRules = allRules.filter((rule: OCRule) => {
        return (
          rule.category?.includes("OC") ||
          rule.category?.includes("可选") ||
          rule.category?.includes("选项") ||
          rule.category?.includes("成就") ||
          rule.category?.includes("认证") ||
          rule.category?.includes("媒体") ||
          rule.dimension?.includes("optional")
        )
      })
      
      console.log(`✅ 加载了 ${this.ocRules.length} 条OC规则`)
      return this.ocRules
    } catch (error) {
      console.error("❌ 加载OC规则失败:", error)
      return []
    }
  }

  /**
   * 获取所有OC规则
   */
  getOCRules(): OCRule[] {
    return this.ocRules
  }

  /**
   * 为申请人评估所有OC
   */
  assessAllOCs(
    applicantEvidence: ApplicantEvidence,
    applicantInfo?: Record<string, any>
  ): OCAssessmentResult[] {
    const results: OCAssessmentResult[] = []

    for (const rule of this.ocRules) {
      const result = this.assessSingleOC(rule, applicantEvidence, applicantInfo)
      results.push(result)
      this.assessmentCache.set(rule.id, result)
    }

    return results
  }

  /**
   * 评估单个OC
   */
  private assessSingleOC(
    rule: OCRule,
    applicantEvidence: ApplicantEvidence,
    applicantInfo?: Record<string, any>
  ): OCAssessmentResult {
    let status: "满足" | "部分满足" | "不满足" | "未评估" = "未评估"
    let score = 0
    let evidence: string[] = []
    let reasoning = ""
    let improvement_suggestions: string[] = []
    let matched_keywords: string[] = []

    // 根据OC规则的category和content进行评估
    const category = rule.category.toLowerCase()
    const content = rule.content.toLowerCase()

    // 专业认证评估
    if (category.includes("认证") || category.includes("证书")) {
      if (applicantEvidence.certifications && applicantEvidence.certifications.length > 0) {
        status = "满足"
        score = 85
        evidence = applicantEvidence.certifications
        reasoning = "申请人拥有相关专业认证证书"
        matched_keywords = this.extractKeywords(content, applicantEvidence.certifications)
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未提供专业认证证书"
        improvement_suggestions = ["获取行业认可的专业认证（如PMP、AWS、CISSP等）"]
      }
    }

    // 奖项和荣誉评估
    else if (category.includes("奖项") || category.includes("成就")) {
      if (applicantEvidence.awards && applicantEvidence.awards.length > 0) {
        status = "满足"
        score = 90
        evidence = applicantEvidence.awards
        reasoning = "申请人获得了行业奖项和荣誉"
        matched_keywords = this.extractKeywords(content, applicantEvidence.awards)
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未获得知名行业奖项"
        improvement_suggestions = [
          "参加行业竞赛并争取获奖",
          "争取行业认可的奖项",
          "申报年度最佳等荣誉"
        ]
      }
    }

    // 出版物和学术论文评估
    else if (category.includes("出版") || category.includes("论文") || category.includes("学术")) {
      if (applicantEvidence.publications && applicantEvidence.publications.length > 0) {
        status = "满足"
        score = 88
        evidence = applicantEvidence.publications
        reasoning = "申请人有发表的学术出版物和论文"
        matched_keywords = this.extractKeywords(content, applicantEvidence.publications)
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未发表学术出版物"
        improvement_suggestions = [
          "在国际期刊发表论文",
          "出版学术著作",
          "撰写行业白皮书"
        ]
      }
    }

    // 媒体认可评估
    else if (category.includes("媒体") || category.includes("报道")) {
      if (applicantEvidence.media_mentions && applicantEvidence.media_mentions.length > 0) {
        status = "满足"
        score = 85
        evidence = applicantEvidence.media_mentions
        reasoning = "申请人获得了媒体报道和认可"
        matched_keywords = this.extractKeywords(content, applicantEvidence.media_mentions)
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未获得媒体报道"
        improvement_suggestions = [
          "接受行业媒体采访和报道",
          "发布行业观点和评论",
          "参加知名行业论坛和会议发言"
        ]
      }
    }

    // 艺术作品评估
    else if (category.includes("艺术") || category.includes("作品") || category.includes("演出")) {
      if (applicantEvidence.projects && applicantEvidence.projects.length > 0) {
        status = "满足"
        score = 87
        evidence = applicantEvidence.projects
        reasoning = "申请人有艺术作品或项目展出"
        matched_keywords = this.extractKeywords(content, applicantEvidence.projects)
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未提供艺术作品"
        improvement_suggestions = [
          "完成艺术作品创作和展出",
          "参加艺术展览和演出",
          "建立作品集展示专业能力"
        ]
      }
    }

    // 工作经验和项目评估
    else if (category.includes("工作") || category.includes("经验") || category.includes("项目")) {
      const experience = applicantEvidence.experience || []
      const projects = applicantEvidence.projects || []
      const combinedEvidence = [...experience, ...projects]

      if (combinedEvidence.length > 0) {
        status = applicantInfo?.yearsOfExperience >= 10 ? "满足" : "部分满足"
        score = applicantInfo?.yearsOfExperience ? Math.min(90, applicantInfo.yearsOfExperience * 8) : 75
        evidence = combinedEvidence
        reasoning = "申请人拥有相关的工作经验和项目经历"
        matched_keywords = this.extractKeywords(content, combinedEvidence)

        if (status === "部分满足") {
          improvement_suggestions = [
            "继续积累行业经验",
            "参与更多有影响力的项目",
            "寻求职位晋升机会"
          ]
        }
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未提供足够的工作经验证明"
        improvement_suggestions = ["积累行业工作经验", "参与重大项目"]
      }
    }

    // 技能和专业知识评估
    else if (category.includes("技能") || category.includes("专业") || category.includes("能力")) {
      if (applicantEvidence.skills && applicantEvidence.skills.length > 0) {
        status = "满足"
        score = 82
        evidence = applicantEvidence.skills
        reasoning = "申请人展示了专业的技能和知识"
        matched_keywords = this.extractKeywords(content, applicantEvidence.skills)
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未充分展示专业技能"
        improvement_suggestions = ["完善技能评估", "获取行业认可的技能证书"]
      }
    }

    // 教育背景评估
    else if (category.includes("教育") || category.includes("学历")) {
      if (applicantEvidence.education && applicantEvidence.education.length > 0) {
        const hasAdvancedDegree = applicantEvidence.education.some(edu => 
          edu.toLowerCase().includes("博士") || 
          edu.toLowerCase().includes("硕士") ||
          edu.toLowerCase().includes("phd") ||
          edu.toLowerCase().includes("master")
        )
        status = hasAdvancedDegree ? "满足" : "部分满足"
        score = hasAdvancedDegree ? 88 : 70
        evidence = applicantEvidence.education
        reasoning = hasAdvancedDegree 
          ? "申请人拥有高等学位"
          : "申请人学历背景基础良好但可进一步提升"
        matched_keywords = this.extractKeywords(content, applicantEvidence.education)
      } else {
        status = "不满足"
        score = 0
        reasoning = "申请人未提供教育背景信息"
        improvement_suggestions = ["补充教育背景信息"]
      }
    }

    return {
      ocId: rule.id,
      title: rule.title,
      category: rule.category,
      status,
      score,
      maxScore: 100,
      percentage: score / 100,
      evidence,
      reasoning,
      improvement_suggestions,
      matched_keywords,
    }
  }

  /**
   * 从文本中提取关键词匹配
   */
  private extractKeywords(ruleContent: string, evidence: string[]): string[] {
    const keywords = new Set<string>()
    
    // 提取规则中的关键词
    const ruleKeywords = ruleContent
      .split(/[，,;；\n]+/)
      .map(k => k.trim())
      .filter(k => k.length > 2)
    
    // 匹配证据中的关键词
    for (const keyword of ruleKeywords) {
      for (const ev of evidence) {
        if (ev.toLowerCase().includes(keyword)) {
          keywords.add(keyword)
        }
      }
    }
    
    return Array.from(keywords).slice(0, 5) // 返回前5个关键词
  }

  /**
   * 获取OC评估汇总
   */
  getSummary(results: OCAssessmentResult[]) {
    const satisfiedCount = results.filter(r => r.status === "满足").length
    const partiallySatisfiedCount = results.filter(r => r.status === "部分满足").length
    const unsatisfiedCount = results.filter(r => r.status === "不满足").length
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length

    return {
      total: results.length,
      satisfied: satisfiedCount,
      partially_satisfied: partiallySatisfiedCount,
      unsatisfied: unsatisfiedCount,
      average_score: Math.round(averageScore),
      fulfillment_rate: `${Math.round((satisfiedCount / results.length) * 100)}%`,
      recommendation: this.getRecommendation(satisfiedCount, results.length),
    }
  }

  /**
   * 获取评估建议
   */
  private getRecommendation(satisfiedCount: number, total: number): string {
    const rate = satisfiedCount / total
    
    if (rate >= 0.7) {
      return "申请人符合大部分OC要求，具有较强的竞争力。建议重点突出最具竞争力的OC。"
    } else if (rate >= 0.5) {
      return "申请人符合部分OC要求，具有一定的竞争力。建议着重改进未满足的关键OC。"
    } else if (rate >= 0.3) {
      return "申请人符合少数OC要求，竞争力需要提升。建议系统地改进多个OC评分。"
    } else {
      return "申请人满足的OC较少，建议制定详细的改进计划，逐步完善申请资料。"
    }
  }
}

/**
 * 导出全局OC评估管理器实例
 */
export const ocAssessmentManager = new OCAssessmentManager()
