import { generateText } from "ai"
import { getAIModel, getAIOptions, validateAIConfig } from "@/lib/ai-config"

const PYTHON_API_BASE_URL =
  process.env.RESUME_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5002"

export async function POST(request: Request) {
  const requestId = Date.now().toString()
  console.log(`[${requestId}] 开始处理简历分析请求`)
  
  try {
    // 检查请求类型
    const contentType = request.headers.get('content-type') || ''
    console.log(`[${requestId}] 请求内容类型: ${contentType}`)
    
    if (contentType.includes('multipart/form-data')) {
      // 处理文件上传 - 调用Python服务
      console.log(`[${requestId}] 处理文件上传请求`)
      
      const formData = await request.formData()
      const resumeFile = formData.get('resume') as File
      const name = formData.get('name') as string || "N/A"
      const email = formData.get('email') as string || "N/A"
      const field = formData.get('field') as string || "digital-technology"
      const additionalInfo = formData.get('additionalInfo') as string || ""

      console.log(`[${requestId}] 文件信息:`, {
        fileName: resumeFile?.name,
        fileSize: resumeFile?.size,
        fileType: resumeFile?.type,
        name,
        email,
        field,
        additionalInfoLength: additionalInfo.length
      })

      // 基础内容健康检查（防乱码/二进制误传）
      if (resumeFile && typeof resumeFile.arrayBuffer === 'function') {
        try {
          const buf = await resumeFile.arrayBuffer()
          const bytes = new Uint8Array(buf).slice(0, 64)
          const nonTextRatio = Array.from(bytes).filter(b => b === 0 || b > 127).length / Math.max(1, bytes.length)
          console.log(`[${requestId}] 文件内容前64字节非ASCII比例: ${nonTextRatio.toFixed(2)}`)
          if (nonTextRatio > 0.3) {
            console.warn(`[${requestId}] 警告: 上传文件可能为二进制/包含较多非文本字节，建议检查源文件或转为TXT/PDF`)
          }
        } catch (e) {
          console.warn(`[${requestId}] 无法读取文件字节用于健康检查`, e)
        }
      }
      
      if (!resumeFile) {
        console.error(`[${requestId}] 错误: 没有提供简历文件`)
        return Response.json(
          { error: "No resume file provided" },
          { status: 400 }
        )
      }
      
      // 转发到Python简历处理服务
      console.log(`[${requestId}] 转发请求到Python简历处理服务`)
      
      const pythonFormData = new FormData()
      pythonFormData.append('resume', resumeFile)
      pythonFormData.append('name', name)
      pythonFormData.append('email', email)
      pythonFormData.append('field', field)
      pythonFormData.append('additionalInfo', additionalInfo)
      
      try {
        const uploadUrl = `${PYTHON_API_BASE_URL.replace(/\/$/, '')}/api/resume/upload`
        console.log(`[${requestId}] 调用Python API: ${uploadUrl}`)
        
        const pythonResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: pythonFormData
        })
        
        console.log(`[${requestId}] Python API响应状态: ${pythonResponse.status}`)
        
        if (!pythonResponse.ok) {
          const errorText = await pythonResponse.text()
          console.error(`[${requestId}] Python服务错误: ${pythonResponse.status} - ${errorText}`)
          throw new Error(`Python服务错误: ${pythonResponse.status}`)
        }
        
        const pythonData = await pythonResponse.json()
        // 打印安全预览，避免控制台乱码
        const _preview = (obj: any) => {
          try {
            const s = JSON.stringify(obj)
            return s.replace(/[^\x20-\x7E\n\r\t]/g, '.').slice(0, 400)
          } catch {
            return '<unprintable>'
          }
        }
        console.log(`[${requestId}] Python服务响应(预览):`, _preview(pythonData))
        // 后端返回数据健康检查
        const fieldsToCheck = ['name','email','phone'] as const
        for (const key of fieldsToCheck) {
          const val = pythonData?.analysis?.[key]
          if (typeof val === 'string' && /PK\x01\x02|\x00\x00\xFF\xFF/.test(val)) {
            console.warn(`[${requestId}] 警告: 字段 ${key} 疑似包含二进制/乱码片段，原值截断预览:`, val.slice(0, 120))
          }
        }
        console.log(`[${requestId}] Python服务响应(完整对象已上方预览)`)
        
        if (!pythonData.success) {
          console.error(`[${requestId}] Python服务处理失败:`, pythonData.error)
          return Response.json(
            { error: pythonData.error || "简历处理失败" },
            { status: 500 }
          )
        }
        
        console.log(`[${requestId}] 文件上传处理成功`)
        
        // 转换Python服务的结果为前端期望的格式
        const extractedInfo = pythonData.analysis || {}

        // 调用Python服务的GTV评估API
        console.log("[v0] 开始调用GTV评估API...")
        const gtvUrl = `${PYTHON_API_BASE_URL.replace(/\/$/, '')}/api/resume/gtv-assessment`
        const gtvResponse = await fetch(gtvUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            extracted_info: extractedInfo,
            field: field,
            name: name,
            email: email
          })
        })

        if (!gtvResponse.ok) {
          console.error("[v0] GTV评估API调用失败:", gtvResponse.status, gtvResponse.statusText)
          throw new Error(`GTV评估失败: ${gtvResponse.statusText}`)
        }

        const gtvData = await gtvResponse.json()
        console.log("[v0] GTV评估结果:", gtvData)

        if (!gtvData.success) {
          console.error("[v0] GTV评估返回失败:", gtvData.error)
          throw new Error(`GTV评估失败: ${gtvData.error}`)
        }

        const gtvAnalysis = gtvData.gtvAnalysis
        
        // 返回转换后的结果
        return Response.json({
          success: true,
          analysis: {
            name: extractedInfo.name || name || "N/A",
            email: extractedInfo.email || email || "N/A",
            phone: extractedInfo.phone || "N/A",
            experience: extractedInfo.experience || "工作经验分析完成",
            education: extractedInfo.education || "教育背景分析完成",
            skills: extractedInfo.skills || [],
            achievements: extractedInfo.achievements || [],
            projects: extractedInfo.projects || [],
            languages: extractedInfo.languages || [],
            certifications: extractedInfo.certifications || [],
            summary: extractedInfo.summary || "简历分析完成"
          },
          gtvAnalysis: gtvAnalysis,
          personal_kb_path: pythonData.personal_kb_path,
          message: gtvData.message || pythonData.message,
          // 添加PDF文件信息
          pdf_file_path: gtvData.pdf_file_path,
          pdf_filename: gtvData.pdf_filename
        })
        
      } catch (pythonError) {
        console.error(`[${requestId}] Python服务调用失败:`, pythonError)
        return Response.json(
          { error: "简历处理服务暂时不可用" },
          { status: 503 }
        )
      }
    } else {
      // 处理JSON请求 - 保持原有逻辑
      console.log(`[${requestId}] 处理JSON文本输入请求`)
      
      const configValidation = validateAIConfig()
      if (!configValidation.isValid) {
        console.error(`[${requestId}] AI配置错误:`, configValidation.errors)
        return Response.json(
          {
            error: "AI configuration error",
            details: configValidation.errors
          },
          { status: 500 }
        )
      }

      const body = await request.json()
      const name = body.name
      const email = body.email
      const field = body.field
      const resumeText = body.resumeText
      const additionalInfo = body.additionalInfo

      console.log(`[${requestId}] JSON请求信息:`, {
        name,
        email,
        field,
        resumeTextLength: resumeText?.length || 0,
        additionalInfoLength: additionalInfo?.length || 0
      })

      if (!resumeText || resumeText.trim().length < 50) {
        return Response.json(
          {
            error: "Invalid resume",
            message: "Please provide a valid resume with at least 50 characters.",
          },
          { status: 400 },
        )
      }

      const maxResumeLength = 2500
      const truncatedResume = resumeText?.slice(0, maxResumeLength) || ""
      const resumeTruncated = resumeText?.length > maxResumeLength

      const fallbackResult = {
        applicantInfo: {
          name: name || "N/A",
          field:
            field === "digital-technology"
              ? "Digital Technology"
              : field === "arts-culture"
                ? "Arts & Culture"
                : "Research & Academia",
          currentPosition: "To be determined from resume",
          company: "To be determined from resume",
          yearsOfExperience: "To be determined from resume",
        },
        educationBackground: {
          degrees: [],
          institutions: [],
          analysis: "Education background analysis pending AI processing.",
        },
        industryBackground: {
          sector: "To be analyzed",
          yearsInIndustry: "To be determined",
          keyCompanies: [],
          industryImpact: 5,
          analysis: "Industry background analysis pending.",
        },
        workExperience: {
          positions: [],
          keyAchievements: [],
          leadershipRoles: [],
          projectImpact: [],
          analysis: "Work experience analysis pending.",
        },
        technicalExpertise: {
          coreSkills: [],
          specializations: [],
          innovations: [],
          industryRecognition: [],
          analysis: "Technical expertise analysis pending.",
        },
        gtvPathway: {
          recommendedRoute: "To be determined",
          eligibilityLevel: "To be assessed",
          yearsOfExperience: "To be determined",
          analysis: "GTV pathway analysis pending.",
        },
        strengths: [
          {
            area: "Professional Background",
            description:
              "Based on the field selected: " +
              (field === "digital-technology"
                ? "Digital Technology"
                : field === "arts-culture"
                  ? "Arts & Culture"
                  : "Research & Academia"),
            evidence: "Resume submitted for review",
          },
        ],
        weaknesses: [
          {
            area: "Documentation",
            description: "Complete documentation required for assessment",
            improvement: "Submit comprehensive supporting documents",
            priority: "High",
          },
        ],
        criteriaAssessment: [
          {
            name: "Exceptional Talent/Promise",
            status: "To be assessed",
            score: 0,
            evidence: "Pending AI analysis",
          },
        ],
        overallScore: 0,
        recommendation: "Complete AI analysis required for accurate assessment",
        professionalAdvice: [
          "Submit comprehensive supporting documents",
          "Provide detailed project descriptions",
          "Include evidence of recognition and impact",
        ],
        timeline: "To be determined",
        requiredDocuments: [
          "Resume/CV",
          "Supporting documents",
          "Evidence of achievements",
        ],
        estimatedBudget: {
          min: 5000,
          max: 15000,
          currency: "GBP",
        },
        debug: {
          prompt: "AI analysis not performed - using fallback data",
          rawResponse: "No AI response - fallback data returned",
          timestamp: new Date().toISOString(),
        },
      }

      try {
        const fieldName =
          field === "digital-technology"
            ? "Digital Technology"
            : field === "arts-culture"
              ? "Arts & Culture"
              : "Research & Academia"

        const systemPrompt = `You are a UK Global Talent Visa assessment consultant. Analyze resumes based on official GTV criteria.

CRITERIA:
- Exceptional Talent: 5+ years, established leader
- Exceptional Promise: <5 years, emerging leader
- Evidence: Innovation, recognition, leadership, contributions

SCORING: 90-100 (Strong), 75-89 (Good), 60-74 (Moderate), 50-59 (Weak), <50 (Not recommended)

Respond with valid JSON only (no markdown).`

        const userPrompt = `Analyze for UK GTV eligibility:

NAME: ${name}
FIELD: ${fieldName}
RESUME:
${truncatedResume}

${additionalInfo ? `NOTES: ${additionalInfo}` : ""}

Return JSON with:
{
  "applicantInfo": {"name", "field", "position", "company", "experienceYears"},
  "gtvPathway": {"recommendedRoute", "eligibilityLevel", "analysis"},
  "educationBackground": {"degrees": [], "institutions": [], "analysis"},
  "industryBackground": {"sector", "yearsInIndustry", "keyCompanies": [], "industryImpact", "analysis"},
  "workExperience": {"positions": [], "keyAchievements": [], "analysis"},
  "technicalExpertise": {"coreSkills": [], "innovations": [], "analysis"},
  "strengths": [{"area", "description", "evidence"}],
  "weaknesses": [{"area", "description", "improvement", "priority"}],
  "criteriaAssessment": [{"name", "status", "score", "evidence"}],
  "overallScore": 0-100,
  "recommendation": "string",
  "professionalAdvice": ["string"],
  "timeline": "string",
  "requiredDocuments": ["string"],
  "estimatedBudget": {"min", "max", "currency"}
}`

        const { text } = await generateText({
          model: getAIModel(),
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          ...getAIOptions(),
        })

        console.log("[v0] AI response received, attempting to parse JSON")

        let cleanedText = text.trim()
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
        }

        if (!cleanedText.endsWith("}")) {
          console.log("[v0] Detected incomplete JSON, attempting to fix...")
          // Try to find the last complete object and close it
          const lastCompleteObject = cleanedText.lastIndexOf("},")
          if (lastCompleteObject > 0) {
            cleanedText = cleanedText.substring(0, lastCompleteObject + 1) + "}"
          } else {
            // If we can't fix it, throw error to use fallback
            throw new Error("Incomplete JSON response from AI")
          }
        }

        let analysisResult
        try {
          analysisResult = JSON.parse(cleanedText)
        } catch (parseError) {
          console.error("[v0] JSON parse error, raw response:", cleanedText.substring(0, 500))
          console.error("[v0] Parse error details:", parseError)
          throw new Error("Invalid JSON response from AI")
        }

        console.log("[v0] Validating AI response structure...")

        analysisResult.applicantInfo = analysisResult.applicantInfo || {
          name: name || "N/A",
          field: fieldName,
          currentPosition: "To be determined",
          company: "To be determined",
          yearsOfExperience: "To be determined",
        }

        analysisResult.gtvPathway = analysisResult.gtvPathway || {
          recommendedRoute: "To be determined",
          eligibilityLevel: "To be assessed",
          yearsOfExperience: "To be determined",
          analysis: "GTV pathway analysis pending.",
        }

        analysisResult.educationBackground = analysisResult.educationBackground || {
          degrees: [],
          institutions: [],
          analysis: "Education background analysis pending.",
        }

        analysisResult.industryBackground = analysisResult.industryBackground || {
          sector: "To be analyzed",
          yearsInIndustry: "To be determined",
          keyCompanies: [],
          industryImpact: 5,
          analysis: "Industry background analysis pending.",
        }

        analysisResult.workExperience = analysisResult.workExperience || {
          positions: [],
          keyAchievements: [],
          leadershipRoles: [],
          projectImpact: [],
          analysis: "Work experience analysis pending.",
        }

        analysisResult.technicalExpertise = analysisResult.technicalExpertise || {
          coreSkills: [],
          specializations: [],
          innovations: [],
          industryRecognition: [],
          analysis: "Technical expertise analysis pending.",
        }

        analysisResult.strengths = analysisResult.strengths || []
        analysisResult.weaknesses = analysisResult.weaknesses || []
        analysisResult.criteriaAssessment = analysisResult.criteriaAssessment || []
        analysisResult.professionalAdvice = analysisResult.professionalAdvice || []

        analysisResult.overallScore = analysisResult.overallScore || 0
        analysisResult.recommendation = analysisResult.recommendation || "Assessment pending"
        analysisResult.timeline = analysisResult.timeline || "To be determined"

        analysisResult.requiredDocuments = analysisResult.requiredDocuments || []
        if (!Array.isArray(analysisResult.requiredDocuments)) {
          analysisResult.requiredDocuments = []
        }

        analysisResult.estimatedBudget = analysisResult.estimatedBudget || {
          min: 5000,
          max: 15000,
          currency: "GBP",
        }

        analysisResult.debug = {
          prompt: systemPrompt + "\n\n" + userPrompt,
          rawResponse: text,
          timestamp: new Date().toISOString(),
        }

        console.log("[v0] Successfully parsed and validated comprehensive GTV analysis")
        
        // 解析提取的信息（如果存在）
        let extractedInfo: any = {}
        try {
          if (additionalInfo.includes("提取的信息：")) {
            const extractedData = additionalInfo.replace("提取的信息：", "")
            extractedInfo = JSON.parse(extractedData)
          }
        } catch (e) {
          console.log("无法解析提取的信息，使用默认值")
        }

        // 转换为前端期望的格式
        const response = {
          success: true,
          analysis: {
            name: extractedInfo.name || analysisResult.applicantInfo?.name || name,
            email: extractedInfo.email || email,
            phone: extractedInfo.phone || "",
            experience: extractedInfo.experience || analysisResult.workExperience?.analysis || "工作经验待分析",
            education: extractedInfo.education || analysisResult.educationBackground?.analysis || "教育背景待分析",
            skills: extractedInfo.skills || analysisResult.technicalExpertise?.coreSkills || [],
            achievements: extractedInfo.achievements || analysisResult.workExperience?.keyAchievements || [],
            projects: extractedInfo.projects || [],
            languages: extractedInfo.languages || [],
            certifications: extractedInfo.certifications || [],
            summary: extractedInfo.summary || analysisResult.recommendation || "简历分析完成"
          },
          gtvAnalysis: analysisResult
        }
        
        return Response.json(response)
      } catch (aiError) {
        console.error("[v0] AI analysis failed, returning fallback data:", aiError)
        
        // 解析提取的信息（如果存在）
        let extractedInfo: any = {}
        try {
          if (additionalInfo.includes("提取的信息：")) {
            const extractedData = additionalInfo.replace("提取的信息：", "")
            extractedInfo = JSON.parse(extractedData)
          }
        } catch (e) {
          console.log("无法解析提取的信息，使用默认值")
        }

        // 转换为前端期望的格式
        const fallbackResponse = {
          success: true,
          analysis: {
            name: extractedInfo.name || fallbackResult.applicantInfo?.name || name,
            email: extractedInfo.email || email,
            phone: extractedInfo.phone || "",
            experience: extractedInfo.experience || fallbackResult.workExperience?.analysis || "工作经验待分析",
            education: extractedInfo.education || fallbackResult.educationBackground?.analysis || "教育背景待分析",
            skills: extractedInfo.skills || fallbackResult.technicalExpertise?.coreSkills || [],
            achievements: extractedInfo.achievements || fallbackResult.workExperience?.keyAchievements || [],
            projects: extractedInfo.projects || [],
            languages: extractedInfo.languages || [],
            certifications: extractedInfo.certifications || [],
            summary: extractedInfo.summary || fallbackResult.recommendation || "简历分析完成（使用备用数据）"
          },
          gtvAnalysis: fallbackResult
        }
        
        return Response.json(fallbackResponse)
      }
    }
  } catch (error) {
    console.error(`[${requestId}] 简历分析错误:`, error)
    return Response.json(
      {
        error: "Analysis failed",
        message: "Unable to process the request. Please try again.",
      },
      { status: 500 },
    )
  }
}